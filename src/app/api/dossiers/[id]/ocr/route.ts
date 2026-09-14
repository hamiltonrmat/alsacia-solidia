import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { cheminPdfDossier, trouverDossierFictif } from "@/data/dossiers-fictifs";
import { MistralOcrError, ocrDocument } from "@/lib/mistral-ocr";

/**
 * POST /api/dossiers/[id]/ocr
 * Lit le PDF du dossier dans la GED simulée (public/ged) et l'envoie à
 * Mistral OCR. Réponse : { pages: [{ index, markdown }], modele, dureeMs }.
 */

export const runtime = "nodejs";

export async function POST(_request: Request, ctx: RouteContext<"/api/dossiers/[id]/ocr">) {
  const { id } = await ctx.params;
  const dossier = trouverDossierFictif(id);
  if (!dossier) {
    return NextResponse.json({ error: `Dossier ${id} inconnu de la GED.` }, { status: 404 });
  }

  const chemin = path.join(process.cwd(), "public", cheminPdfDossier(dossier));
  let octets: Buffer;
  try {
    octets = await readFile(chemin);
  } catch {
    return NextResponse.json(
      { error: `PDF du dossier introuvable. Lancer « npm run generer:dossiers » pour produire les dossiers fictifs.` },
      { status: 404 },
    );
  }

  const debut = Date.now();
  try {
    const resultat = await ocrDocument({ bytes: octets, mimeType: "application/pdf" });
    return NextResponse.json({
      pages: resultat.pages.map((p) => ({ index: p.index, markdown: p.markdown })),
      modele: resultat.model,
      dureeMs: Date.now() - debut,
    });
  } catch (error) {
    if (error instanceof MistralOcrError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[api/dossiers/ocr] erreur inattendue", error);
    return NextResponse.json({ error: "Erreur interne lors de l'OCR." }, { status: 500 });
  }
}
