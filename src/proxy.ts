import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCES, jetonValide, protectionActive } from "@/lib/session";

/**
 * Porte d'entrée de la démonstration (ancien « middleware », renommé Proxy
 * dans Next.js 16, exécuté sur le runtime Node.js).
 *
 * Sans mot de passe configuré, laisse tout passer : c'est le cas en
 * développement local. Avec un mot de passe, redirige vers la page de
 * connexion toute requête dépourvue d'un jeton valide. Les routes d'API
 * vérifient en plus le jeton de leur côté (src/lib/garde-api.ts).
 */
export function proxy(request: NextRequest) {
  if (!protectionActive()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  // La page de connexion et son API doivent rester joignables.
  if (pathname === "/connexion" || pathname === "/api/connexion") return NextResponse.next();

  if (jetonValide(request.cookies.get(COOKIE_ACCES)?.value)) return NextResponse.next();

  // Une requête d'API non authentifiée reçoit un refus net, pas une redirection.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Accès refusé : session expirée ou absente." }, { status: 401 });
  }

  const connexion = new URL("/connexion", request.url);
  if (pathname !== "/") connexion.searchParams.set("suite", `${pathname}${search}`);
  return NextResponse.redirect(connexion);
}

export const config = {
  /*
   * Tout est protégé, y compris les PDF de public/ged, sauf les ressources
   * techniques servies par Next.js et le favicon.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
