import "server-only";

import { appelerMistral, ErreurAppelMistral, messageErreurMistral } from "./mistral-http";

/**
 * Client minimal pour l'API OCR de Mistral (endpoint /v1/ocr).
 *
 * Ce module ne doit être importé que côté serveur (route handlers, server
 * actions) : il lit MISTRAL_API_KEY dans l'environnement et ne doit jamais
 * être embarqué dans le bundle navigateur.
 */

const MISTRAL_OCR_URL = "https://api.mistral.ai/v1/ocr";

/**
 * Modèle épinglé sur une version précise plutôt que sur l'alias
 * « mistral-ocr-latest ». Le 16/11/2026, cet alias pointait vers OCR 4.1
 * (mistral-ocr-4-1), qui ne répondait pas (plus de 200 s pour une seule page),
 * alors que mistral-ocr-2512 (OCR 3) lisait un dossier de 16 pages en 10 s.
 * Un changement d'alias chez Mistral ne doit pas casser l'outil : tester une
 * nouvelle version avec MISTRAL_OCR_MODEL avant de changer cette valeur.
 */
const DEFAULT_MODEL = "mistral-ocr-2512";

/**
 * Délai d'attente de Mistral, inférieur à la durée maximale des fonctions
 * (60 s) : au-delà, le serveur renvoie une erreur lisible au lieu d'être
 * interrompu par la plateforme.
 */
const DELAI_MS = 50_000;

export type OcrPage = {
  /** Index de page, à partir de 0. */
  index: number;
  /** Contenu de la page converti en Markdown par Mistral. */
  markdown: string;
  dimensions?: { dpi: number; height: number; width: number } | null;
};

export type OcrResult = {
  model: string;
  pages: OcrPage[];
  usage: {
    pagesProcessed: number;
    docSizeBytes: number;
  };
};

export type OcrInput = {
  /** Octets du document (PDF ou image). */
  bytes: ArrayBuffer | Uint8Array;
  /** Type MIME, ex. "application/pdf" ou "image/png". */
  mimeType: string;
  /** Sous-ensemble de pages à traiter (index à partir de 0). Toutes par défaut. */
  pages?: number[];
};

export class MistralOcrError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MistralOcrError";
    this.status = status;
  }
}

type MistralOcrResponse = {
  model: string;
  pages: Array<{
    index: number;
    markdown: string;
    dimensions?: { dpi: number; height: number; width: number } | null;
  }>;
  usage_info: { pages_processed: number; doc_size_bytes: number };
};

function getApiKey(): string {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) {
    throw new MistralOcrError(
      500,
      "MISTRAL_API_KEY est absente de l'environnement. Copier .env.example en .env.local et renseigner la clé.",
    );
  }
  return key;
}

function toDataUrl(bytes: ArrayBuffer | Uint8Array, mimeType: string): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const base64 = Buffer.from(view).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Envoie un document à Mistral OCR et renvoie le Markdown page par page.
 * Les images sont transmises en `image_url`, tout le reste (PDF) en
 * `document_url`, sous forme de data URL base64.
 */
export async function ocrDocument(input: OcrInput): Promise<OcrResult> {
  const apiKey = getApiKey();
  const dataUrl = toDataUrl(input.bytes, input.mimeType);
  const isImage = input.mimeType.startsWith("image/");

  const model = process.env.MISTRAL_OCR_MODEL || DEFAULT_MODEL;
  const body = {
    model,
    document: isImage
      ? { type: "image_url", image_url: dataUrl }
      : { type: "document_url", document_url: dataUrl },
    ...(input.pages ? { pages: input.pages } : {}),
    include_image_base64: false,
  };

  let response: Response;
  try {
    // Nouvelles tentatives sur erreur passagère (503, 502…), dans le délai imparti.
    ({ reponse: response } = await appelerMistral(
      MISTRAL_OCR_URL,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      { service: "de lecture", modele: model, echeance: Date.now() + DELAI_MS },
    ));
  } catch (error) {
    if (error instanceof ErreurAppelMistral) throw new MistralOcrError(error.status, error.message);
    throw error;
  }

  if (!response.ok) {
    throw new MistralOcrError(response.status, `Mistral OCR a refusé la demande (erreur ${response.status}) : ${await messageErreurMistral(response)}`);
  }

  const data = (await response.json()) as MistralOcrResponse;

  return {
    model: data.model,
    pages: data.pages.map((page) => ({
      index: page.index,
      markdown: page.markdown,
      dimensions: page.dimensions ?? null,
    })),
    usage: {
      pagesProcessed: data.usage_info.pages_processed,
      docSizeBytes: data.usage_info.doc_size_bytes,
    },
  };
}
