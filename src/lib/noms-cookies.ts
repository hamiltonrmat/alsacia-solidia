/**
 * Noms de cookies partagés entre le serveur et le navigateur.
 *
 * Isolés de src/lib/session.ts, qui importe node:crypto et ne doit donc pas
 * être embarqué dans le bundle du navigateur.
 */
export const COOKIE_ACCES = "solidia_acces";
export const COOKIE_SESSION_OUVERTE = "solidia_session_ouverte";
