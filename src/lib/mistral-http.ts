import "server-only";

/**
 * Appel à l'API Mistral avec nouvelles tentatives sur les erreurs passagères.
 *
 * Mistral connaît des indisponibilités brèves (503 « Service unavailable »,
 * 502, 500, 429 en cas de pic) : une nouvelle tentative quelques secondes plus
 * tard réussit le plus souvent. Les tentatives s'arrêtent dans un budget de
 * temps global, inférieur à la durée maximale des fonctions (60 s), pour que
 * le serveur renvoie toujours une erreur lisible plutôt que d'être interrompu.
 */

/** Statuts considérés comme passagers : une nouvelle tentative a des chances d'aboutir. */
export const STATUTS_PASSAGERS = new Set([429, 500, 502, 503, 504]);

/** Attentes avant la 2e, la 3e et la 4e tentative. */
const ATTENTES_MS = [1_500, 4_000, 8_000];

/** Marge gardée pour le traitement de la réponse après la dernière tentative. */
const MARGE_MS = 3_000;

export class ErreurAppelMistral extends Error {
  readonly status: number;
  readonly passagere: boolean;

  constructor(status: number, message: string, passagere: boolean) {
    super(message);
    this.name = "ErreurAppelMistral";
    this.status = status;
    this.passagere = passagere;
  }
}

/** Message d'erreur renvoyé par Mistral, extrait de son corps JSON. */
export async function messageErreurMistral(reponse: Response): Promise<string> {
  const texte = (await reponse.text()).slice(0, 500);
  try {
    const corps = JSON.parse(texte) as { message?: unknown; detail?: unknown };
    const message = typeof corps.message === "string" ? corps.message : typeof corps.detail === "string" ? corps.detail : null;
    return message ?? texte;
  } catch {
    return texte || reponse.statusText;
  }
}

function libelleStatut(status: number): string {
  if (status === 429) return "trop de demandes simultanées (limite de débit du compte Mistral)";
  if (status === 503) return "service momentanément indisponible";
  if (status === 504) return "délai dépassé côté Mistral";
  return "erreur interne de Mistral";
}

export type ContexteAppel = {
  /** Nom du service pour les messages : « de lecture », « d'extraction ». */
  service: string;
  modele: string;
  /** Instant (Date.now()) au-delà duquel on n'attend plus Mistral. */
  echeance: number;
};

/**
 * Envoie la requête et la renouvelle sur erreur passagère tant que le budget
 * le permet. Renvoie la réponse finale si elle est réussie ou en erreur non
 * passagère (400, 401, 422… : à traiter par l'appelant). Lève
 * ErreurAppelMistral si le délai est dépassé ou si l'erreur passagère persiste.
 */
export async function appelerMistral(url: string, init: RequestInit, contexte: ContexteAppel): Promise<{ reponse: Response; tentatives: number }> {
  const { service, modele, echeance } = contexte;
  for (let tentative = 1; ; tentative += 1) {
    const reste = echeance - Date.now();
    let reponse: Response | null = null;
    let detail = "";
    try {
      reponse = await fetch(url, { ...init, signal: AbortSignal.timeout(Math.max(1_000, reste)) });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new ErreurAppelMistral(
          504,
          `Le service ${service} (Mistral, modèle ${modele}) n'a pas répondu dans le délai imparti${tentative > 1 ? ` (${tentative} tentatives)` : ""}. Réessayez dans quelques instants.`,
          true,
        );
      }
      detail = error instanceof Error ? error.message : "erreur réseau";
    }

    if (reponse && (reponse.ok || !STATUTS_PASSAGERS.has(reponse.status))) return { reponse, tentatives: tentative };

    const status = reponse?.status ?? 502;
    if (reponse) detail = await messageErreurMistral(reponse);
    const retryAfter = Number(reponse?.headers.get("retry-after"));
    const attente = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1_000, 10_000) : ATTENTES_MS[tentative - 1];
    if (attente === undefined || Date.now() + attente + MARGE_MS >= echeance) {
      throw new ErreurAppelMistral(
        status,
        `Le service ${service} de Mistral (modèle ${modele}) ne répond pas : ${reponse ? `${libelleStatut(status)}, erreur ${status}` : `réseau (${detail})`}, malgré ${tentative} tentative${tentative > 1 ? "s" : ""}. Réessayez dans quelques instants.`,
        true,
      );
    }
    console.warn(`[mistral] ${service} ${modele} : erreur ${status} (${detail.slice(0, 120)}), nouvelle tentative dans ${attente} ms`);
    await new Promise((r) => setTimeout(r, attente));
  }
}
