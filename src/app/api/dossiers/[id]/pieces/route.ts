import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { cheminPdfDossier, trouverDossierFictif } from "@/data/dossiers-fictifs";

/**
 * GET /api/dossiers/[id]/pieces?pages=1,2,3&nom=cerfa
 * Extrait les pages demandées du PDF du dossier et renvoie un PDF de la pièce
 * seule : c'est le « découpage physique » déposé dans la GED sous l'usager.
 */

export const runtime = "nodejs";

export async function GET(request: Request, ctx: RouteContext<"/api/dossiers/[id]/pieces">) {
  const { id } = await ctx.params;
  const dossier = trouverDossierFictif(id);
  if (!dossier) return NextResponse.json({ error: `Dossier ${id} inconnu.` }, { status: 404 });

  const url = new URL(request.url);
  const pages = (url.searchParams.get("pages") ?? "")
    .split(",")
    .map((p) => Number(p.trim()))
    .filter((p) => Number.isInteger(p) && p >= 1);
  if (pages.length === 0) return NextResponse.json({ error: "Paramètre pages manquant." }, { status: 400 });
  const nom = (url.searchParams.get("nom") ?? "piece").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "piece";

  let source: PDFDocument;
  try {
    source = await PDFDocument.load(await readFile(path.join(process.cwd(), "public", cheminPdfDossier(dossier))));
  } catch {
    return NextResponse.json({ error: "PDF du dossier introuvable." }, { status: 404 });
  }
  const nbPages = source.getPageCount();
  const indices = pages.filter((p) => p <= nbPages).map((p) => p - 1);
  if (indices.length === 0) return NextResponse.json({ error: "Pages hors du document." }, { status: 400 });

  const sortie = await PDFDocument.create();
  sortie.setTitle(`${id} — ${nom}`);
  const copies = await sortie.copyPages(source, indices);
  copies.forEach((p) => sortie.addPage(p));
  const octets = await sortie.save();

  return new NextResponse(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${id}-${nom}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
