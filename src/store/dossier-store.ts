"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CandidatSolis } from "@/data/solis";
import type { TypeCourrier } from "@/lib/courriers";
import type { PageClassee, Piece, TypePiece } from "@/lib/decoupage";
import type { ResultatConformite } from "@/lib/regles/conformite";
import type { Orientation, ResultatDecision } from "@/lib/regles/decision";
import type { StatutDossier } from "@/lib/statuts";

/**
 * État de travail des dossiers en cours de pré-instruction, conservé dans le
 * navigateur (localStorage). Un dossier importé depuis la GED progresse
 * d'étape en étape ; chaque action de l'agent est journalisée.
 */

export type Etape = "decoupage" | "extraction" | "conformite" | "decision" | "export" | "termine";

export const ETAPES: Array<{ id: Etape; libelle: string; numero: number }> = [
  { id: "decoupage", libelle: "Typage des pièces", numero: 1 },
  { id: "extraction", libelle: "Contrôle des données", numero: 2 },
  { id: "conformite", libelle: "Complétude et recevabilité", numero: 3 },
  { id: "decision", libelle: "Pré-instruction", numero: 4 },
  { id: "export", libelle: "Enregistrement et transmission", numero: 5 },
];

export type PageOcr = { index: number; markdown: string };

export type ExtractionPiece = {
  pieceId: string;
  type: TypePiece;
  modele?: string;
  champs?: Record<string, unknown>;
  /** Corrections de l'agent, par chemin de champ. */
  corrections: Record<string, string | null>;
  /** Champs critiques vérifiés par l'agent (horodatage), par chemin. */
  confirmations: Record<string, string>;
  erreur?: string;
  valide: boolean;
};

export type Rapprochement = {
  criteres: { nir: string | null; nomNaissance: string | null; nomUsage: string | null; dateNaissance: string | null };
  candidats: CandidatSolis[];
  rechercheLe: string;
  decision?: { type: "existant"; numeroUsager: string; numeroDemandeEnCours: string | null } | { type: "nouveau" };
  confirmeLe?: string;
};

export type Courrier = { type: TypeCourrier; libelle: string; genereLe: string; texte: string };

export type EvenementJournal = {
  horodatage: string;
  contexte: string;
  action: string;
  detail?: string;
  avant?: string | null;
  apres?: string | null;
};

export type DecisionAgent = {
  resultat: ResultatDecision;
  orientationRetenue?: Orientation;
  commentaire?: string;
  valideLe?: string;
};

export type DocumentRetourGed = { pieceId: string; type: TypePiece; pages: number[]; confidentiel: boolean };

export type ExportSolis = {
  action: "cree" | "rattache" | "mis_a_jour";
  numeroUsager: string;
  numeroDossier: string;
  statut: StatutDossier;
  horodatage: string;
  metadonnees: Record<string, unknown>;
  retourGed: DocumentRetourGed[];
};

export type EtatDossier = {
  id: string;
  lotId: string;
  libelle: string;
  dateReception: string;
  cheminPdf: string;
  nbPages: number;
  importeLe: string;
  numeroEnregistrement: string;
  statut: StatutDossier;
  etape: Etape;
  ocr?: { pages: PageOcr[]; modele: string; dureeMs: number };
  pagesClassees?: PageClassee[];
  pieces?: Piece[];
  decoupageValideLe?: string;
  extractions: Record<string, ExtractionPiece>;
  extractionValideeLe?: string;
  rapprochement?: Rapprochement;
  conformite?: ResultatConformite;
  conformiteValideeLe?: string;
  /** JJ/MM/AAAA, date à laquelle toutes les pièces sont réunies. */
  dateCompletude?: string;
  courriers: Courrier[];
  decision?: DecisionAgent;
  export?: ExportSolis;
  journal: EvenementJournal[];
};

type Actions = {
  importerDossier: (dossier: Omit<EtatDossier, "importeLe" | "etape" | "extractions" | "courriers" | "journal" | "statut" | "numeroEnregistrement">) => void;
  supprimerDossier: (id: string) => void;
  journaliser: (id: string, evenement: Omit<EvenementJournal, "horodatage">) => void;
  definirOcr: (id: string, ocr: EtatDossier["ocr"]) => void;
  /** Remplace le texte des pages (rédaction du secret médical), sans journal. */
  redigerPagesOcr: (id: string, pages: PageOcr[]) => void;
  definirDecoupage: (id: string, pagesClassees: PageClassee[], pieces: Piece[], motif?: string) => void;
  validerDecoupage: (id: string) => void;
  definirExtraction: (id: string, extraction: ExtractionPiece) => void;
  corrigerChamp: (id: string, pieceId: string, chemin: string, libelle: string, avant: string | null, valeur: string | null) => void;
  confirmerChamp: (id: string, pieceId: string, chemin: string, confirme: boolean) => void;
  validerExtraction: (id: string) => void;
  definirRapprochement: (id: string, rapprochement: Rapprochement) => void;
  confirmerRapprochement: (id: string, decision: NonNullable<Rapprochement["decision"]>) => void;
  definirConformite: (id: string, conformite: ResultatConformite) => void;
  validerConformite: (id: string) => void;
  ajouterCourrier: (id: string, courrier: Omit<Courrier, "genereLe">) => void;
  definirDecision: (id: string, decision: DecisionAgent, statut?: StatutDossier) => void;
  definirExport: (id: string, exportSolis: ExportSolis) => void;
  revenirA: (id: string, etape: Etape) => void;
};

type Store = { dossiers: Record<string, EtatDossier> } & Actions;

const maintenant = () => new Date().toISOString();

function numeroEnregistrement(): string {
  const annee = new Date().getUTCFullYear();
  const sequence = String(Date.now() % 1_000_000).padStart(6, "0");
  return `REC-${annee}-${sequence}`;
}

function evenement(contexte: string, action: string, detail?: string, avant?: string | null, apres?: string | null): EvenementJournal {
  return { horodatage: maintenant(), contexte, action, detail, avant, apres };
}

export const useDossierStore = create<Store>()(
  persist(
    (set) => {
      const modifier = (id: string, fn: (d: EtatDossier) => EtatDossier) =>
        set((s) => (s.dossiers[id] ? { dossiers: { ...s.dossiers, [id]: fn(s.dossiers[id]) } } : s));
      const avecJournal = (d: EtatDossier, e: EvenementJournal): EtatDossier => ({ ...d, journal: [...d.journal, e] });

      return {
        dossiers: {},
        importerDossier: (dossier) =>
          set((s) => ({
            dossiers: {
              ...s.dossiers,
              [dossier.id]: {
                ...dossier,
                importeLe: maintenant(),
                numeroEnregistrement: numeroEnregistrement(),
                statut: "recu",
                etape: "decoupage",
                extractions: {},
                courriers: [],
                journal: [evenement("import", "Dossier importé depuis la GED", `${dossier.nbPages} pages, reçu le ${dossier.dateReception}`)],
              },
            },
          })),
        supprimerDossier: (id) =>
          set((s) => {
            const copie = { ...s.dossiers };
            delete copie[id];
            return { dossiers: copie };
          }),
        journaliser: (id, e) => modifier(id, (d) => avecJournal(d, { ...e, horodatage: maintenant() })),
        definirOcr: (id, ocr) =>
          modifier(id, (d) => avecJournal({ ...d, ocr }, evenement("import", "OCR terminé", ocr ? `${ocr.pages.length} pages, ${ocr.modele}, ${(ocr.dureeMs / 1000).toFixed(1)} s` : undefined))),
        redigerPagesOcr: (id, pages) => modifier(id, (d) => (d.ocr ? { ...d, ocr: { ...d.ocr, pages } } : d)),
        definirDecoupage: (id, pagesClassees, pieces, motif) =>
          modifier(id, (d) => {
            const suivant = { ...d, pagesClassees, pieces };
            return motif ? avecJournal(suivant, evenement("typage", motif)) : suivant;
          }),
        validerDecoupage: (id) =>
          modifier(id, (d) =>
            avecJournal(
              { ...d, decoupageValideLe: maintenant(), etape: "extraction", statut: d.statut === "recu" ? "en_cours" : d.statut },
              evenement("typage", "Typage des pièces validé", (d.pieces ?? []).map((p) => `${p.type} p.${p.pages.join(",")}`).join(" ; ")),
            ),
          ),
        definirExtraction: (id, extraction) =>
          modifier(id, (d) =>
            avecJournal(
              { ...d, extractions: { ...d.extractions, [extraction.pieceId]: extraction } },
              extraction.erreur
                ? evenement("controle", `Extraction en erreur (${extraction.type})`, extraction.erreur)
                : evenement("controle", `Champs extraits (${extraction.type})`, extraction.modele),
            ),
          ),
        corrigerChamp: (id, pieceId, chemin, libelle, avant, valeur) =>
          modifier(id, (d) => {
            const extraction = d.extractions[pieceId];
            if (!extraction) return d;
            return avecJournal(
              {
                ...d,
                extractions: {
                  ...d.extractions,
                  [pieceId]: { ...extraction, corrections: { ...extraction.corrections, [chemin]: valeur } },
                },
              },
              evenement("controle", `Champ corrigé : ${libelle}`, extraction.type, avant, valeur),
            );
          }),
        confirmerChamp: (id, pieceId, chemin, confirme) =>
          modifier(id, (d) => {
            const extraction = d.extractions[pieceId];
            if (!extraction) return d;
            const confirmations = { ...extraction.confirmations };
            if (confirme) confirmations[chemin] = maintenant();
            else delete confirmations[chemin];
            return { ...d, extractions: { ...d.extractions, [pieceId]: { ...extraction, confirmations } } };
          }),
        validerExtraction: (id) =>
          modifier(id, (d) => {
            const nbConfirmes = Object.values(d.extractions).reduce((n, e) => n + Object.keys(e.confirmations).length, 0);
            const nbCorriges = Object.values(d.extractions).reduce((n, e) => n + Object.keys(e.corrections).length, 0);
            return avecJournal(
              {
                ...d,
                extractions: Object.fromEntries(Object.entries(d.extractions).map(([k, e]) => [k, { ...e, valide: true }])),
                extractionValideeLe: maintenant(),
                etape: "conformite",
              },
              evenement("controle", "Contrôle des données validé", `${nbConfirmes} champ(s) critique(s) vérifié(s), ${nbCorriges} correction(s)`),
            );
          }),
        definirRapprochement: (id, rapprochement) => modifier(id, (d) => ({ ...d, rapprochement })),
        confirmerRapprochement: (id, decision) =>
          modifier(id, (d) => {
            if (!d.rapprochement) return d;
            return avecJournal(
              { ...d, rapprochement: { ...d.rapprochement, decision, confirmeLe: maintenant() } },
              evenement(
                "usager",
                decision.type === "existant" ? `Usager rattaché : ${decision.numeroUsager}` : "Nouvel usager : aucune correspondance dans Solis",
                decision.type === "existant" && decision.numeroDemandeEnCours ? `Demande déjà en cours ${decision.numeroDemandeEnCours}` : undefined,
              ),
            );
          }),
        definirConformite: (id, conformite) => modifier(id, (d) => ({ ...d, conformite })),
        validerConformite: (id) =>
          modifier(id, (d) => {
            const recevable = d.conformite?.recevabilite !== "non_recevable";
            return avecJournal(
              {
                ...d,
                conformiteValideeLe: maintenant(),
                etape: "decision",
                dateCompletude: recevable ? (d.dateCompletude ?? d.dateReception) : d.dateCompletude,
                statut: recevable ? "en_cours" : "en_attente_pieces",
              },
              evenement("recevabilite", `Recevabilité : ${d.conformite?.recevabilite ?? "non évaluée"}`, d.conformite?.synthese),
            );
          }),
        ajouterCourrier: (id, courrier) =>
          modifier(id, (d) =>
            avecJournal(
              { ...d, courriers: [...d.courriers.filter((c) => c.type !== courrier.type), { ...courrier, genereLe: maintenant() }] },
              evenement("courrier", `Courrier généré : ${courrier.libelle}`),
            ),
          ),
        definirDecision: (id, decision, statut) =>
          modifier(id, (d) => {
            const suivant = { ...d, decision, etape: decision.valideLe ? ("export" as Etape) : d.etape, statut: statut ?? d.statut };
            return decision.valideLe
              ? avecJournal(suivant, evenement("pre-instruction", `Orientation retenue : ${decision.orientationRetenue ?? decision.resultat.orientation}`, decision.commentaire))
              : suivant;
          }),
        definirExport: (id, exportSolis) =>
          modifier(id, (d) =>
            avecJournal(
              { ...d, export: exportSolis, etape: "termine", statut: exportSolis.statut },
              evenement("transmission", `Enregistré dans Solis (${exportSolis.action})`, `Usager ${exportSolis.numeroUsager}, demande ${exportSolis.numeroDossier}, ${exportSolis.retourGed.length} pièce(s) déposée(s) dans la GED`),
            ),
          ),
        revenirA: (id, etape) => modifier(id, (d) => avecJournal({ ...d, etape }, evenement("navigation", `Retour à l'étape « ${ETAPES.find((e) => e.id === etape)?.libelle ?? etape} »`))),
      };
    },
    {
      name: "instructocr-dossiers",
      version: 2,
      migrate: (etat) => {
        // Complète les dossiers enregistrés par une version antérieure.
        const s = etat as { dossiers?: Record<string, Partial<EtatDossier>> };
        const dossiers: Record<string, EtatDossier> = {};
        for (const [id, d] of Object.entries(s.dossiers ?? {})) {
          dossiers[id] = {
            ...(d as EtatDossier),
            numeroEnregistrement: d.numeroEnregistrement ?? numeroEnregistrement(),
            statut: d.statut ?? (d.etape === "termine" ? "clos" : d.etape === "decoupage" ? "recu" : "en_cours"),
            courriers: d.courriers ?? [],
            journal: d.journal ?? [],
            extractions: Object.fromEntries(
              Object.entries(d.extractions ?? {}).map(([k, e]) => [k, { ...e, confirmations: e.confirmations ?? {} }]),
            ),
          };
        }
        return { dossiers };
      },
    },
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
