import { NextResponse } from "next/server";
import { COOKIE_ACCES, COOKIE_SESSION_OUVERTE, creerJeton, motDePasseCorrect, optionsCookie, optionsDrapeau, protectionActive } from "@/lib/session";

/**
 * POST /api/connexion   { motDePasse } : ouvre la session de démonstration.
 * DELETE /api/connexion : la referme.
 */

export const runtime = "nodejs";

/** Petit délai pour décourager les essais en rafale. */
const DELAI_ECHEC_MS = 600;

export async function POST(request: Request) {
  if (!protectionActive()) {
    return NextResponse.json({ ouvert: true, message: "Aucun mot de passe n'est configuré : l'accès est libre." });
  }

  let corps: { motDePasse?: unknown };
  try {
    corps = (await request.json()) as typeof corps;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const saisi = typeof corps.motDePasse === "string" ? corps.motDePasse : "";
  if (!saisi) {
    return NextResponse.json({ error: "Saisissez le mot de passe." }, { status: 400 });
  }

  if (!motDePasseCorrect(saisi)) {
    await new Promise((r) => setTimeout(r, DELAI_ECHEC_MS));
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const reponse = NextResponse.json({ ouvert: true });
  reponse.cookies.set(COOKIE_ACCES, creerJeton(), optionsCookie());
  reponse.cookies.set(COOKIE_SESSION_OUVERTE, "1", optionsDrapeau());
  return reponse;
}

export async function DELETE() {
  const reponse = NextResponse.json({ ouvert: false });
  reponse.cookies.set(COOKIE_ACCES, "", optionsCookie(0));
  reponse.cookies.set(COOKIE_SESSION_OUVERTE, "", optionsDrapeau(0));
  return reponse;
}
