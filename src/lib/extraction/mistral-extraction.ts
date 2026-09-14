import "server-only";

import type { TypePiece } from "@/lib/decoupage";
import { chiffres, ibanValide, nirValide } from "@/lib/identifiants";
import { SCHEMAS_PAR_TYPE, type ChampExtrait } from "./schemas";

/**
 * Extraction structurée des champs d'une pièce à partir de son texte OCR,
 * par un modèle de chat Mistral en sortie JSON contrainte par schéma.
 * Côté serveur uniquement.
 */

const MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";
const MODELE_PAR_DEFAUT = "mistral-small-latest";

/** Modèles autorisés pour l'extraction (surcharge possible par requête). */
export const MODELES_EXTRACTION = ["mistral-small-latest", "mistral-medium-latest", "mistral-large-latest"] as const;
export type ModeleExtraction = (typeof MODELES_EXTRACTION)[number];

export class MistralExtractionError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MistralExtractionError";
    this.status = status;
  }
}

export type ResultatExtraction = {
  type: TypePiece;
  modele: string;
  champs: Record<string, unknown>;
  usage: { promptTokens: number; completionTokens: number };
};

const CONSIGNE_GENERALE = `Tu es un agent d'instruction de dossiers d'aide à l'autonomie. Tu extrais les champs d'une pièce administrative à partir de son texte OCR en Markdown, et tu renvoies un JSON conforme au schéma.

Règles impératives :
- N'utilise que ce qui est écrit dans le texte. N'invente jamais une valeur plausible.
- Une case cochée apparaît comme ☒, ☑, ✕, ✗, ■ ou un X isolé devant l'option ; une case vide comme ☐ ou □.
- Cas particulier fréquent sur les documents numérisés : la case cochée disparaît de la lecture alors que les cases vides restent visibles (□). Si, dans un groupe d'options, exactement une option n'a aucun symbole de case devant elle alors que toutes les autres ont □, considère cette option comme cochée avec une confiance de 0,6 et recopie la ligne dans extrait sans y ajouter de symbole.
- Si, pour une question, aucune option n'a de symbole de case (ni cochée ni vide) ou si rien ne permet de distinguer l'option cochée, renvoie null avec une confiance de 0,2 au plus. N'écris jamais dans extrait un symbole de case qui n'est pas dans le texte.
- Un champ vide (« ... » ou rien après le libellé) vaut null.
- Recolle les chiffres séparés par des espaces (dates, NIR, téléphone, code postal). NIR sur 15 chiffres.
- Une date écrite en cases se lit dans l'ordre jour, mois, année : « 2 0 0 7 2 0 2 6 » vaut 20/07/2026 et « 0 8 0 9 1 9 3 9 » vaut 08/09/1939. Dates toujours au format JJ/MM/AAAA.
- Les longues suites de chiffres (IBAN, NIR, numéro fiscal) doivent être recopiées chiffre par chiffre sans en omettre.
- confiance : 1 si la valeur est lisible sans ambiguïté, 0,7 si elle est partiellement lisible ou reconstituée, 0,4 ou moins si elle est douteuse. Pour null, indique la confiance que tu as dans l'absence de la valeur.
- extrait : recopie le court passage du texte (80 caractères au plus) d'où vient la valeur, ou null.
- Réponds en français pour les textes libres, sans commentaire hors du JSON.`;

function cleApi(): string {
  const cle = process.env.MISTRAL_API_KEY;
  if (!cle) throw new MistralExtractionError(500, "MISTRAL_API_KEY est absente de l'environnement.");
  return cle;
}

export function extractionPrevuePour(type: TypePiece): boolean {
  return type in SCHEMAS_PAR_TYPE;
}

function lireChampBrut(champs: Record<string, unknown>, chemin: string): ChampExtrait | null {
  let courant: unknown = champs;
  for (const segment of chemin.split(".")) {
    if (typeof courant !== "object" || courant === null) return null;
    courant = (courant as Record<string, unknown>)[segment];
  }
  return typeof courant === "object" && courant !== null && "valeur" in courant ? (courant as ChampExtrait) : null;
}

const SYMBOLES_COCHES = /[☒☑■✕✗]/;
const SYMBOLES_VIDES = /[☐□]/;

/** Parcourt tous les champs feuilles d'un résultat d'extraction. */
function pourChaqueChamp(objet: unknown, visiteur: (champ: ChampExtrait) => void): void {
  if (typeof objet !== "object" || objet === null) return;
  for (const valeur of Object.values(objet as Record<string, unknown>)) {
    if (typeof valeur === "object" && valeur !== null && "valeur" in valeur && "confiance" in valeur) {
      visiteur(valeur as ChampExtrait);
    } else {
      pourChaqueChamp(valeur, visiteur);
    }
  }
}

/**
 * Groupes d'options du CERFA dont la case cochée disparaît souvent de la
 * lecture OCR alors que les cases vides restent visibles. Pour chacun, le
 * libellé imprimé de chaque option permet de retrouver la ligne dans le texte.
 */
const GROUPES_CASES_CERFA: Array<{ chemin: string; options: Record<string, string> }> = [
  {
    chemin: "residence_principale.statut",
    options: { proprietaire: "Propriétaire de sa résidence principale", locataire: "Locataire de sa résidence principale" },
  },
  {
    chemin: "residence_principale.occupation",
    options: { occupee: "Occupée par le demandeur", louee: "Louée à un tiers", non_louee: "Non louée" },
  },
];

function normaliserLigne(l: string): string {
  return l.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Applique l'heuristique « une seule option sans symbole de case parmi des
 * cases vides » de façon déterministe, et renvoie l'option retenue ou null.
 */
function optionSansCase(markdown: string, options: Record<string, string>): string | null {
  const lignes = markdown.split("\n").map((l) => l.trim());
  const etat: Record<string, "cochee" | "vide" | "sans" | "absente"> = {};
  for (const [valeur, libelle] of Object.entries(options)) {
    const ligne = lignes.find((l) => normaliserLigne(l).includes(normaliserLigne(libelle)));
    if (!ligne) {
      etat[valeur] = "absente";
      continue;
    }
    const avant = ligne.slice(0, Math.max(0, normaliserLigne(ligne).indexOf(normaliserLigne(libelle))));
    etat[valeur] = SYMBOLES_COCHES.test(avant) ? "cochee" : SYMBOLES_VIDES.test(avant) ? "vide" : "sans";
  }
  const valeurs = Object.values(etat);
  if (valeurs.includes("absente") || valeurs.includes("cochee")) return null;
  const sans = Object.entries(etat).filter(([, e]) => e === "sans");
  return sans.length === 1 && valeurs.filter((e) => e === "vide").length === valeurs.length - 1 ? sans[0][0] : null;
}

/**
 * Vérifications déterministes après extraction :
 * - un symbole de case cochée cité dans un extrait mais absent du texte OCR
 *   trahit une valeur inventée : la confiance est abaissée ;
 * - l'heuristique de la case cochée disparue est appliquée aux groupes connus ;
 * - les identifiants à clé de contrôle (IBAN, NIR) sont relus dans le texte.
 */
export function postTraitement(type: TypePiece, champs: Record<string, unknown>, markdown: string): void {
  const texteACoches = SYMBOLES_COCHES.test(markdown);
  pourChaqueChamp(champs, (champ) => {
    if (champ.extrait && SYMBOLES_COCHES.test(champ.extrait)) {
      const extraitSansSymbole = champ.extrait.replace(/[☒☑■✕✗☐□]/g, "").trim();
      const ligne = markdown.split("\n").find((l) => extraitSansSymbole && normaliserLigne(l).includes(normaliserLigne(extraitSansSymbole).slice(0, 30)));
      const symboleReel = ligne ? SYMBOLES_COCHES.test(ligne) : texteACoches;
      if (!symboleReel) {
        champ.confiance = Math.min(champ.confiance, 0.3);
        champ.extrait = `${extraitSansSymbole} (case cochée non visible dans le texte OCR)`;
      }
    }
  });

  if (type === "cerfa_formulaire") {
    for (const groupe of GROUPES_CASES_CERFA) {
      const champ = lireChampBrut(champs, groupe.chemin);
      if (!champ) continue;
      const deduite = optionSansCase(markdown, groupe.options);
      if (deduite && (champ.valeur !== deduite || champ.confiance < 0.6)) {
        champ.valeur = deduite;
        champ.confiance = 0.6;
        champ.extrait = `${groupe.options[deduite]} (seule option sans case visible, les autres sont vides)`;
      } else if (!deduite && champ.valeur && champ.confiance <= 0.3) {
        champ.valeur = null;
        champ.confiance = 0.2;
      }
    }
  }

  if (type === "rib") {
    const champ = lireChampBrut(champs, "iban");
    if (champ && !(champ.valeur && ibanValide(champ.valeur))) {
      const candidats = markdown.match(/\b[A-Z]{2}\d{2}(?:\s?[0-9A-Z]{2,4}){5,8}\b/g) ?? [];
      const valide = candidats.map((c) => c.replace(/\s+/g, "")).find((c) => ibanValide(c));
      if (valide) {
        champ.valeur = valide;
        champ.confiance = 0.95;
        champ.extrait = `IBAN relu dans le texte OCR (clé vérifiée)`;
      }
    }
  }
  if (type === "cerfa_formulaire" || type === "certificat_medical") {
    for (const chemin of ["demandeur.nir", "conjoint.nir"]) {
      const champ = lireChampBrut(champs, chemin);
      if (!champ || (champ.valeur && nirValide(champ.valeur))) continue;
      const candidats = markdown.match(/[12](?:\s?\d){14}/g) ?? [];
      const valides = candidats.map((c) => chiffres(c)).filter((c) => nirValide(c));
      const index = chemin.startsWith("conjoint") ? 1 : 0;
      if (valides[index]) {
        champ.valeur = valides[index];
        champ.confiance = 0.95;
        champ.extrait = "NIR relu dans le texte OCR (clé vérifiée)";
      }
    }
  }
}

export async function extraireChamps(type: TypePiece, markdown: string, modeleDemande?: ModeleExtraction): Promise<ResultatExtraction> {
  const definition = SCHEMAS_PAR_TYPE[type];
  if (!definition) throw new MistralExtractionError(400, `Aucune extraction prévue pour le type « ${type} ».`);

  const modele = modeleDemande ?? process.env.MISTRAL_CHAT_MODEL ?? MODELE_PAR_DEFAUT;
  const reponse = await fetch(MISTRAL_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${cleApi()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modele,
      temperature: 0,
      messages: [
        { role: "system", content: `${CONSIGNE_GENERALE}\n\n${definition.consigne}` },
        { role: "user", content: markdown },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: definition.nom, schema: definition.schema, strict: true },
      },
    }),
  });

  if (!reponse.ok) {
    const detail = (await reponse.text()).slice(0, 500);
    throw new MistralExtractionError(reponse.status, `Mistral a répondu ${reponse.status} : ${detail || reponse.statusText}`);
  }

  const data = (await reponse.json()) as {
    model: string;
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };
  const contenu = data.choices[0]?.message?.content;
  if (!contenu) throw new MistralExtractionError(502, "Réponse vide du modèle.");

  let champs: Record<string, unknown>;
  try {
    champs = JSON.parse(contenu) as Record<string, unknown>;
  } catch {
    throw new MistralExtractionError(502, "Le modèle n'a pas renvoyé un JSON valide.");
  }
  postTraitement(type, champs, markdown);

  return {
    type,
    modele: data.model,
    champs,
    usage: { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens },
  };
}
