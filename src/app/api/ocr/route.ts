import { NextResponse } from "next/server";
import { MistralOcrError, ocrDocument } from "@/lib/mistral-ocr";

/**
 * POST /api/ocr
 * Corps : formulaire multipart avec un champ « file » (PDF ou image).
 * Réponse : { fileName, model, pages: [{ index, markdown }], usage }.
 */

export const runtime = "nodejs";

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
]);

/** Limite locale. Sur Vercel, le corps d'une requête est plafonné à 4,5 Mo. */
const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide : envoyer un formulaire multipart avec un champ « file »." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Champ « file » manquant." }, { status: 400 });
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Type de fichier non pris en charge : ${file.type || "inconnu"}. Attendu : PDF, PNG, JPEG, WebP ou AVIF.` },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Le fichier est vide." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo, maximum ${MAX_BYTES / 1024 / 1024} Mo).` },
      { status: 413 },
    );
  }

  try {
    const result = await ocrDocument({
      bytes: await file.arrayBuffer(),
      mimeType: file.type,
    });
    return NextResponse.json({ fileName: file.name, ...result });
  } catch (error) {
    if (error instanceof MistralOcrError) {
      // Une erreur de l'API tierce est remontée en 502, quel que soit son code d'origine.
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[api/ocr] erreur inattendue", error);
    return NextResponse.json({ error: "Erreur interne lors de l'OCR." }, { status: 500 });
  }
}
