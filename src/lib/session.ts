import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Protection de la démonstration par un mot de passe unique.
 *
 * La protection n'est active que si la variable d'environnement
 * SOLIDIA_MOT_DE_PASSE est définie : en développement local, l'accès reste
 * libre. Sur Vercel, la variable est renseignée dans les réglages du projet.
 *
 * Le mot de passe n'est jamais stocké dans le navigateur : un jeton signé
 * (HMAC-SHA256) portant sa date d'expiration est déposé dans un cookie
 * httpOnly. Ce module ne doit être importé que côté serveur (proxy, routes).
 */

export { COOKIE_ACCES, COOKIE_SESSION_OUVERTE } from "@/lib/noms-cookies";

/** Durée de validité d'une session, en secondes (7 jours). */
export const DUREE_SESSION = 7 * 24 * 3600;

export function motDePasseAttendu(): string | null {
  const valeur = process.env.SOLIDIA_MOT_DE_PASSE?.trim();
  return valeur ? valeur : null;
}

/** Vrai si une protection par mot de passe est configurée. */
export function protectionActive(): boolean {
  return motDePasseAttendu() !== null;
}

/** Secret de signature : propre s'il est fourni, dérivé du mot de passe sinon. */
function secretSignature(): string {
  const explicite = process.env.SOLIDIA_SECRET_SESSION?.trim();
  if (explicite) return explicite;
  return `derive:${motDePasseAttendu() ?? ""}`;
}

function signer(donnees: string): string {
  return createHmac("sha256", secretSignature()).update(donnees).digest("hex");
}

/** Comparaison à durée constante, pour ne rien révéler par le temps de réponse. */
function egalitePrudente(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Vrai si le mot de passe saisi est le bon. */
export function motDePasseCorrect(saisi: string): boolean {
  const attendu = motDePasseAttendu();
  if (!attendu) return true;
  return egalitePrudente(saisi, attendu);
}

/** Jeton signé à déposer dans le cookie, valable DUREE_SESSION secondes. */
export function creerJeton(maintenant = Date.now()): string {
  const expiration = Math.floor(maintenant / 1000) + DUREE_SESSION;
  return `${expiration}.${signer(String(expiration))}`;
}

/** Vrai si le jeton est bien signé et non expiré. */
export function jetonValide(jeton: string | undefined | null, maintenant = Date.now()): boolean {
  if (!jeton) return false;
  const separateur = jeton.indexOf(".");
  if (separateur <= 0) return false;
  const expiration = jeton.slice(0, separateur);
  const signature = jeton.slice(separateur + 1);
  if (!/^\d+$/.test(expiration)) return false;
  if (Number(expiration) * 1000 < maintenant) return false;
  return egalitePrudente(signature, signer(expiration));
}

/** Options du cookie d'accès (inaccessible au navigateur). */
export function optionsCookie(dureeSecondes = DUREE_SESSION) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: dureeSecondes,
  };
}

/** Options du drapeau de session, lisible par le navigateur. */
export function optionsDrapeau(dureeSecondes = DUREE_SESSION) {
  return { ...optionsCookie(dureeSecondes), httpOnly: false };
}
