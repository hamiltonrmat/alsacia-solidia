import { statSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { cheminPdfDossier, DOSSIERS_FICTIFS, LOTS_GED } from "@/data/dossiers-fictifs";

/**
 * GET /api/ged/lots
 * Simule l'interrogation de la GED : lots de numérisation et dossiers à traiter.
 */

export const runtime = "nodejs";

export type DossierGed = {
  id: string;
  libelle: string;
  dateReception: string;
  nbPages: number;
  tailleKo: number;
  cheminPdf: string;
  scenario: { titre: string; attendu: string[] };
};

export type LotGedAvecDossiers = {
  id: string;
  libelle: string;
  date: string;
  source: string;
  dossiers: DossierGed[];
};

function tailleKo(cheminPublic: string): number {
  try {
    return Math.round(statSync(path.join(process.cwd(), "public", cheminPublic)).size / 1024);
  } catch {
    return 0;
  }
}

export async function GET() {
  // Petit délai pour rendre perceptible la « connexion » à la GED dans l'interface.
  await new Promise((r) => setTimeout(r, 500));

  const lots: LotGedAvecDossiers[] = LOTS_GED.map((lot) => ({
    ...lot,
    dossiers: DOSSIERS_FICTIFS.filter((d) => d.lotId === lot.id).map((d) => {
      const cheminPdf = cheminPdfDossier(d);
      return {
        id: d.id,
        libelle: d.libelleGed,
        dateReception: d.dateReception,
        nbPages: d.composition.reduce((n, e) => n + (e.type === "cerfa" ? e.pages.length : 1), 0),
        tailleKo: tailleKo(cheminPdf),
        cheminPdf,
        scenario: d.scenario,
      };
    }),
  }));

  return NextResponse.json({ ged: "GED départementale (simulation)", lots });
}
