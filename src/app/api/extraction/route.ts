import { NextResponse } from "next/server";
import { refuserSiNonAutorise } from "@/lib/garde-api";
import type { TypePiece } from "@/lib/decoupage";
import {
  extractionPrevuePour,
  extraireChamps,
  MistralExtractionError,
  MODELES_EXTRACTION,
  type ModeleExtraction,
} from "@/lib/extraction/mistral-extraction";

/**
 * POST /api/extraction
 * Corps : { type: TypePiece, markdown: string, modele?: string }.
 * Réponse : { type, modele, champs, usage }.
 */

export const runtime = "nodejs";
/** Les appels au service de lecture peuvent durer : 60 s de marge. */
export const maxDuration = 60;

const MAX_CARACTERES = 60_000;

export async function POST(request: Request) {
  const refus = refuserSiNonAutorise(request);
  if (refus) return refus;

  let corps: { type?: string; markdown?: string; modele?: string };
  try {
    corps = (await request.json()) as typeof corps;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }
  if (corps.modele !== undefined && !MODELES_EXTRACTION.includes(corps.modele as ModeleExtraction)) {
    return NextResponse.json({ error: `Modèle non autorisé : ${corps.modele}.` }, { status: 400 });
  }

  const type = corps.type as TypePiece | undefined;
  if (!type || !extractionPrevuePour(type)) {
    return NextResponse.json({ error: `Type de pièce non pris en charge : ${corps.type ?? "absent"}.` }, { status: 400 });
  }
  if (typeof corps.markdown !== "string" || corps.markdown.trim().length === 0) {
    return NextResponse.json({ error: "Texte OCR (markdown) manquant." }, { status: 400 });
  }
  if (corps.markdown.length > MAX_CARACTERES) {
    return NextResponse.json({ error: `Texte trop long (${corps.markdown.length} caractères, maximum ${MAX_CARACTERES}).` }, { status: 413 });
  }

  try {
    const resultat = await extraireChamps(type, corps.markdown, corps.modele as ModeleExtraction | undefined);
    return NextResponse.json(resultat);
  } catch (error) {
    if (error instanceof MistralExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status >= 500 || error.status === 429 ? 502 : error.status });
    }
    console.error("[api/extraction] erreur inattendue", error);
    return NextResponse.json({ error: "Erreur interne lors de l'extraction." }, { status: 500 });
  }
}
