import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MARQUE } from "@/lib/marque";
import type { RapportControle } from "./modele";
import { rendreRapportPdf, type RapportPdf } from "./pdf";

/**
 * Mise en page du rapport côté serveur : ajoute le logo lu sur disque et
 * calcule l'empreinte SHA-256 du PDF, qui identifie le document déposé.
 */

let logo: Promise<Uint8Array | undefined> | null = null;

function lireLogo(): Promise<Uint8Array | undefined> {
  logo ??= readFile(path.join(process.cwd(), "public", MARQUE.logo.replace(/^\//, "")))
    .then((b) => new Uint8Array(b))
    .catch(() => undefined);
  return logo;
}

export async function rapportPdfServeur(rapport: RapportControle): Promise<RapportPdf & { empreinte: string }> {
  const pdf = await rendreRapportPdf(rapport, { logoPng: await lireLogo() });
  const empreinte = createHash("sha256").update(pdf.octets).digest("hex");
  return { ...pdf, empreinte };
}
