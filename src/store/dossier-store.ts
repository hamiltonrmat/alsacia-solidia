"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PageClassee, Piece, TypePiece } from "@/lib/decoupage";
import type { ResultatConformite } from "@/lib/regles/conformite";
import type { Orientation, ResultatDecision } from "@/lib/regles/decision";

/**
 * État de travail des dossiers en cours d'instruction, conservé dans le
 * navigateur (localStorage). Un dossier importé depuis la GED progresse
 * d'étape en étape ; chaque étape enregistre ses résultats et sa validation.
 */

export type Etape = "decoupage" | "extraction" | "conformite" | "decision" | "export" | "termine";

export const ETAPES: Array<{ id: Etape; libelle: string; numero: number }> = [
  { id: "decoupage", libelle: "Découpage", numero: 1 },
  { id: "extraction", libelle: "Pré-contrôle", numero: 2 },
  { id: "conformite", libelle: "Conformité", numero: 3 },
  { id: "decision", libelle: "Aide à la décision", numero: 4 },
  { id: "export", libelle: "Export Solis", numero: 5 },
];

export type PageOcr = { index: number; markdown: string };

export type ExtractionPiece = {
  pieceId: string;
  type: TypePiece;
  modele?: string;
  champs?: Record<string, unknown>;
  /** Corrections de l'agent, par chemin de champ. */
  corrections: Record<string, string | null>;
  erreur?: string;
  valide: boolean;
};

export type DecisionAgent = {
  resultat: ResultatDecision;
  orientationRetenue?: Orientation;
  commentaire?: string;
  valideLe?: string;
};

export type ExportSolis = {
  action: "cree" | "rattache";
  numeroUsager: string;
  numeroDossier: string;
  horodatage: string;
  metadonnees: Record<string, unknown>;
};

export type EtatDossier = {
  id: string;
  lotId: string;
  libelle: string;
  dateReception: string;
  cheminPdf: string;
  nbPages: number;
  importeLe: string;
  etape: Etape;
  ocr?: { pages: PageOcr[]; modele: string; dureeMs: number };
  pagesClassees?: PageClassee[];
  pieces?: Piece[];
  decoupageValideLe?: string;
  extractions: Record<string, ExtractionPiece>;
  extractionValideeLe?: string;
  conformite?: ResultatConformite;
  conformiteValideeLe?: string;
  decision?: DecisionAgent;
  export?: ExportSolis;
};

type Actions = {
  importerDossier: (dossier: Omit<EtatDossier, "importeLe" | "etape" | "extractions">) => void;
  supprimerDossier: (id: string) => void;
  definirOcr: (id: string, ocr: EtatDossier["ocr"]) => void;
  definirDecoupage: (id: string, pagesClassees: PageClassee[], pieces: Piece[]) => void;
  validerDecoupage: (id: string) => void;
  definirExtraction: (id: string, extraction: ExtractionPiece) => void;
  corrigerChamp: (id: string, pieceId: string, chemin: string, valeur: string | null) => void;
  validerExtraction: (id: string) => void;
  definirConformite: (id: string, conformite: ResultatConformite) => void;
  validerConformite: (id: string) => void;
  definirDecision: (id: string, decision: DecisionAgent) => void;
  definirExport: (id: string, exportSolis: ExportSolis) => void;
  revenirA: (id: string, etape: Etape) => void;
};

type Store = { dossiers: Record<string, EtatDossier> } & Actions;

const maintenant = () => new Date().toISOString();

export const useDossierStore = create<Store>()(
  persist(
    (set) => {
      const modifier = (id: string, fn: (d: EtatDossier) => EtatDossier) =>
        set((s) => (s.dossiers[id] ? { dossiers: { ...s.dossiers, [id]: fn(s.dossiers[id]) } } : s));

      return {
        dossiers: {},
        importerDossier: (dossier) =>
          set((s) => ({
            dossiers: {
              ...s.dossiers,
              [dossier.id]: { ...dossier, importeLe: maintenant(), etape: "decoupage", extractions: {} },
            },
          })),
        supprimerDossier: (id) =>
          set((s) => {
            const copie = { ...s.dossiers };
            delete copie[id];
            return { dossiers: copie };
          }),
        definirOcr: (id, ocr) => modifier(id, (d) => ({ ...d, ocr })),
        definirDecoupage: (id, pagesClassees, pieces) => modifier(id, (d) => ({ ...d, pagesClassees, pieces })),
        validerDecoupage: (id) =>
          modifier(id, (d) => ({ ...d, decoupageValideLe: maintenant(), etape: "extraction" })),
        definirExtraction: (id, extraction) =>
          modifier(id, (d) => ({ ...d, extractions: { ...d.extractions, [extraction.pieceId]: extraction } })),
        corrigerChamp: (id, pieceId, chemin, valeur) =>
          modifier(id, (d) => {
            const extraction = d.extractions[pieceId];
            if (!extraction) return d;
            return {
              ...d,
              extractions: {
                ...d.extractions,
                [pieceId]: { ...extraction, corrections: { ...extraction.corrections, [chemin]: valeur } },
              },
            };
          }),
        validerExtraction: (id) =>
          modifier(id, (d) => ({
            ...d,
            extractions: Object.fromEntries(Object.entries(d.extractions).map(([k, e]) => [k, { ...e, valide: true }])),
            extractionValideeLe: maintenant(),
            etape: "conformite",
          })),
        definirConformite: (id, conformite) => modifier(id, (d) => ({ ...d, conformite })),
        validerConformite: (id) => modifier(id, (d) => ({ ...d, conformiteValideeLe: maintenant(), etape: "decision" })),
        definirDecision: (id, decision) =>
          modifier(id, (d) => ({ ...d, decision, etape: decision.valideLe ? "export" : d.etape })),
        definirExport: (id, exportSolis) => modifier(id, (d) => ({ ...d, export: exportSolis, etape: "termine" })),
        revenirA: (id, etape) => modifier(id, (d) => ({ ...d, etape })),
      };
    },
    { name: "instructocr-dossiers", version: 1 },
  ),
);

/** Valeur effective d'un champ : correction de l'agent, sinon valeur extraite. */
export function valeurEffective(extraction: ExtractionPiece | undefined, chemin: string): string | null {
  if (!extraction) return null;
  if (chemin in extraction.corrections) return extraction.corrections[chemin];
  let courant: unknown = extraction.champs;
  for (const segment of chemin.split(".")) {
    if (typeof courant !== "object" || courant === null) return null;
    courant = (courant as Record<string, unknown>)[segment];
  }
  if (typeof courant === "object" && courant !== null && "valeur" in courant) {
    const v = (courant as { valeur: unknown }).valeur;
    return typeof v === "string" ? v : null;
  }
  return null;
}

/** Première extraction d'un type de pièce donné. */
export function extractionParType(dossier: EtatDossier, type: TypePiece): ExtractionPiece | undefined {
  return Object.values(dossier.extractions).find((e) => e.type === type);
}
