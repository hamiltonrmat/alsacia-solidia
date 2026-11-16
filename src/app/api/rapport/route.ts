import { NextResponse } from "next/server";
import { refuserSiNonAutorise } from "@/lib/garde-api";
import { estRapportControle } from "@/lib/rapport/modele";
import { rapportPdfServeur } from "@/lib/rapport/serveur";

/**
 * POST /api/rapport { rapport: RapportControle }
 *   → application/pdf, avec les en-têtes X-Empreinte-Sha256 et X-Nombre-Pages.
 *
 * Met en page le rapport de contrôle d'un dossier. Le rapport est construit
 * dans le navigateur à partir de l'état du dossier ; le serveur en fait un PDF
 * déterministe, structuré, qui embarque sa version JSON.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const refus = refuserSiNonAutorise(request);
  if (refus) return refus;

  let corps: { rapport?: unknown };
  try {
    corps = (await request.json()) as { rapport?: unknown };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }
  if (!estRapportControle(corps.rapport)) {
    return NextResponse.json({ error: "Rapport de contrôle absent ou d'un format inconnu." }, { status: 400 });
  }

  try {
    const pdf = await rapportPdfServeur(corps.rapport);
    return new NextResponse(Buffer.from(pdf.octets), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdf.nomFichier}"`,
        "Cache-Control": "no-store",
        "X-Empreinte-Sha256": pdf.empreinte,
        "X-Nombre-Pages": String(pdf.nbPages),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: `Mise en page du rapport impossible : ${e instanceof Error ? e.message : "erreur inconnue"}` }, { status: 500 });
  }
}
