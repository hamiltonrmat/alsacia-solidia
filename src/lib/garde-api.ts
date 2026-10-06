import { NextResponse } from "next/server";
import { COOKIE_ACCES, jetonValide, protectionActive } from "@/lib/session";

/**
 * Garde des routes d'API : seconde vérification du jeton de session, pour que
 * les appels coûteux (lecture de documents, extraction) ne soient pas
 * joignables sans mot de passe, même si le proxy ne s'appliquait pas.
 *
 * Renvoie une réponse 401 à retourner telle quelle, ou null si l'accès est
 * autorisé.
 */
export function refuserSiNonAutorise(request: Request): NextResponse | null {
  if (!protectionActive()) return null;

  const entete = request.headers.get("cookie") ?? "";
  const jeton = entete
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_ACCES}=`))
    ?.slice(COOKIE_ACCES.length + 1);

  if (jetonValide(jeton ? decodeURIComponent(jeton) : undefined)) return null;
  return NextResponse.json({ error: "Accès refusé : session expirée ou absente. Rechargez la page pour vous reconnecter." }, { status: 401 });
}
