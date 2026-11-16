"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CandidatSolis } from "@/data/solis";
import type { PageClassee, Piece, TypePiece } from "@/lib/decoupage";
import { ETAPES as DESCRIPTION_ETAPES } from "@/lib/etapes";
import type { RapportControle } from "@/lib/rapport/modele";
import { LIBELLES_VERDICT, type ResultatConformite, type Verdict } from "@/lib/regles/conformite";
import type { StatutDossier } from "@/lib/statuts";

/**
 * État de travail des dossiers en cours de traitement, conservé dans le
 * navigateur (localStorage). Un dossier pris en charge depuis la GED
 * progresse d'étape en étape ; chaque action de l'agent est journalisée.
 */

/** Étape courante d'un dossier pris en charge (la GED est derrière lui). */
export type Etape = "decoupage" | "extraction" | "conformite" | "export" | "termine";

/** Les cinq étapes, décrites dans src/lib/etapes.ts. */
export const ETAPES = DESCRIPTION_ETAPES;

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

export type EvenementJournal = {
  horodatage: string;
  contexte: string;
  action: string;
  detail?: string;
  avant?: string | null;
  apres?: string | null;
};

/** Rapport de contrôle figé à la validation de la complétude. */
export type RapportStocke = {
  donnees: RapportControle;
  /** Révision du dossier au moment de la génération : un écart signale un rapport périmé. */
  revision: number;
  /** Empreinte SHA-256 du PDF, renvoyée par le serveur à la mise en page. */
  empreinte?: string;
  tailleOctets?: number;
  nbPages?: number;
};

export type DocumentRetourGed = { pieceId: string; type: TypePiece; pages: number[] };

/** Document déposé dans Solis avec la demande. */
export type DocumentSolis = {
  reference: string;
  type: "rapport_controle";
  nom: string;
  empreinte: string;
  tailleOctets: number;
  nbPages: number;
};

export type ExportSolis = {
  action: "cree" | "rattache" | "mis_a_jour";
  numeroUsager: string;
  numeroDossier: string;
  statut: StatutDossier;
  horodatage: string;
  metadonnees: Record<string, unknown>;
  retourGed: DocumentRetourGed[];
  documents: DocumentSolis[];
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
  /** Incrémentée à chaque modification des données du dossier. */
  revision: number;
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
  /** Observations de l'agent à l'attention de l'instruction, reprises dans le rapport. */
  observations?: string;
  rapport?: RapportStocke;
  export?: ExportSolis;
  journal: EvenementJournal[];
};

type Actions = {
  importerDossier: (dossier: Omit<EtatDossier, "importeLe" | "etape" | "extractions" | "journal" | "statut" | "numeroEnregistrement" | "revision">) => void;
  supprimerDossier: (id: string) => void;
  journaliser: (id: string, evenement: Omit<EvenementJournal, "horodatage">) => void;
  definirOcr: (id: string, ocr: EtatDossier["ocr"]) => void;
  definirDecoupage: (id: string, pagesClassees: PageClassee[], pieces: Piece[], motif?: string) => void;
  validerDecoupage: (id: string) => void;
  definirExtraction: (id: string, extraction: ExtractionPiece) => void;
  corrigerChamp: (id: string, pieceId: string, chemin: string, libelle: string, avant: string | null, valeur: string | null) => void;
  confirmerChamp: (id: string, pieceId: string, chemin: string, confirme: boolean) => void;
  validerExtraction: (id: string) => void;
  definirRapprochement: (id: string, rapprochement: Rapprochement) => void;
  confirmerRapprochement: (id: string, decision: NonNullable<Rapprochement["decision"]>) => void;
  definirConformite: (id: string, conformite: ResultatConformite) => void;
  definirObservations: (id: string, observations: string) => void;
  validerConformite: (id: string, validation: { conformite: ResultatConformite; dateCompletude: string | null; rapport: RapportControle }) => void;
  definirMiseEnPageRapport: (id: string, miseEnPage: { empreinte: string; tailleOctets: number; nbPages: number }) => void;
  definirExport: (id: string, exportSolis: ExportSolis) => void;
  revenirA: (id: string, etape: Etape) => void;
};

type Store = { dossiers: Record<string, EtatDossier> } & Actions;

const CLE_STOCKAGE = "solidia-dossiers";
const CLE_ANCIENNE = "instructocr-dossiers";

/**
 * Stockage navigateur qui reprend les dossiers enregistrés sous l'ancien nom de
 * l'outil, pour ne pas perdre le travail en cours lors du renommage.
 */
const stockageAvecReprise = {
  getItem: (nom: string) => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(nom) ?? localStorage.getItem(CLE_ANCIENNE);
  },
  setItem: (nom: string, valeur: string) => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(nom, valeur);
    localStorage.removeItem(CLE_ANCIENNE);
  },
  removeItem: (nom: string) => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(nom);
  },
};

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
      /** Modification des données du dossier : incrémente la révision. */
      const modifierDonnees = (id: string, fn: (d: EtatDossier) => EtatDossier) =>
        modifier(id, (d) => {
          const suivant = fn(d);
          return suivant === d ? d : { ...suivant, revision: (d.revision ?? 0) + 1 };
        });
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
                revision: 0,
                extractions: {},
                journal: [evenement("import", "Dossier pris en charge depuis la GED", `${dossier.nbPages} pages, reçu le ${dossier.dateReception}`)],
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
        definirDecoupage: (id, pagesClassees, pieces, motif) =>
          modifierDonnees(id, (d) => {
            const suivant = { ...d, pagesClassees, pieces };
            return motif ? avecJournal(suivant, evenement("deliassage", motif)) : suivant;
          }),
        validerDecoupage: (id) =>
          modifier(id, (d) =>
            avecJournal(
              { ...d, decoupageValideLe: maintenant(), etape: "extraction", statut: d.statut === "recu" ? "en_cours" : d.statut },
              evenement("deliassage", "Déliassage validé", (d.pieces ?? []).map((p) => `${p.type} p.${p.pages.join(",")}`).join(" ; ")),
            ),
          ),
        definirExtraction: (id, extraction) =>
          modifierDonnees(id, (d) =>
            avecJournal(
              { ...d, extractions: { ...d.extractions, [extraction.pieceId]: extraction } },
              extraction.erreur
                ? evenement("controle", `Extraction en erreur (${extraction.type})`, extraction.erreur)
                : evenement("controle", `Champs extraits (${extraction.type})`, extraction.modele),
            ),
          ),
        corrigerChamp: (id, pieceId, chemin, libelle, avant, valeur) =>
          modifierDonnees(id, (d) => {
            const extraction = d.extractions[pieceId];
            if (!extraction) return d;
            // Une saisie au clavier produit une modification par touche : les
            // modifications successives d'un même champ forment un seul événement,
            // qui garde la valeur d'origine et la dernière valeur.
            const action = `Champ corrigé : ${libelle}`;
            const dernier = d.journal[d.journal.length - 1];
            const memeChamp = dernier !== undefined && dernier.contexte === "controle" && dernier.action === action && dernier.detail === extraction.type;
            const e = evenement("controle", action, extraction.type, memeChamp ? (dernier.avant ?? null) : avant, valeur);
            return {
              ...d,
              extractions: {
                ...d.extractions,
                [pieceId]: { ...extraction, corrections: { ...extraction.corrections, [chemin]: valeur } },
              },
              journal: memeChamp ? [...d.journal.slice(0, -1), e] : [...d.journal, e],
            };
          }),
        confirmerChamp: (id, pieceId, chemin, confirme) =>
          modifierDonnees(id, (d) => {
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
        definirRapprochement: (id, rapprochement) => modifierDonnees(id, (d) => ({ ...d, rapprochement })),
        confirmerRapprochement: (id, decision) =>
          modifierDonnees(id, (d) => {
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
        definirObservations: (id, observations) => modifierDonnees(id, (d) => ({ ...d, observations })),
        validerConformite: (id, { conformite, dateCompletude, rapport }) =>
          modifier(id, (d) => {
            let suivant = avecJournal(
              {
                ...d,
                conformite,
                conformiteValideeLe: maintenant(),
                dateCompletude: dateCompletude ?? undefined,
                etape: "export",
                statut: "en_cours",
                rapport: { donnees: rapport, revision: d.revision ?? 0 },
              },
              evenement("completude", `Complétude et conformité validées : ${LIBELLES_VERDICT[conformite.verdict].toLowerCase()}`, conformite.synthese),
            );
            if (d.observations?.trim()) suivant = avecJournal(suivant, evenement("completude", "Observations pour l'instruction", d.observations.trim()));
            return avecJournal(suivant, evenement("rapport", "Rapport de contrôle généré", `Indice de robustesse OCR ${rapport.ocr.global.indice ?? "—"} / 100`));
          }),
        definirMiseEnPageRapport: (id, miseEnPage) =>
          modifier(id, (d) => (d.rapport ? { ...d, rapport: { ...d.rapport, ...miseEnPage } } : d)),
        definirExport: (id, exportSolis) =>
          modifier(id, (d) =>
            avecJournal(
              { ...d, export: exportSolis, etape: "termine", statut: exportSolis.statut },
              evenement(
                "transmission",
                `Enregistré dans Solis (${exportSolis.action})`,
                `Usager ${exportSolis.numeroUsager}, demande ${exportSolis.numeroDossier}, ${exportSolis.documents.length} rapport(s) et ${exportSolis.retourGed.length} pièce(s) déposés`,
              ),
            ),
          ),
        revenirA: (id, etape) => modifier(id, (d) => avecJournal({ ...d, etape }, evenement("navigation", `Retour à l'étape « ${ETAPES.find((e) => e.id === etape)?.libelle ?? etape} »`))),
      };
    },
    {
      name: CLE_STOCKAGE,
      version: 3,
      storage: createJSONStorage(() => stockageAvecReprise),
      migrate: (etat) => migrerDossiers(etat),
    },
  ),
);

/**
 * Complète ou convertit les dossiers enregistrés par une version antérieure.
 * Version 3 : la pré-instruction et les courriers ont disparu ; le verdict de
 * complétude remplace la recevabilité ; un rapport de contrôle est requis
 * avant la transmission.
 */
function migrerDossiers(etat: unknown): { dossiers: Record<string, EtatDossier> } {
  type Ancien = Omit<Partial<EtatDossier>, "etape" | "statut" | "conformite"> & {
    etape?: string;
    statut?: string;
    conformite?: Partial<ResultatConformite> & { recevabilite?: string };
    decision?: unknown;
    courriers?: unknown;
  };
  const VERDICTS: Record<string, Verdict> = { recevable: "conforme", recevable_sous_reserve: "conforme_sous_reserve", non_recevable: "non_conforme" };
  const s = etat as { dossiers?: Record<string, Ancien> };
  const dossiers: Record<string, EtatDossier> = {};
  for (const [id, ancien] of Object.entries(s.dossiers ?? {})) {
    const { decision: _decision, courriers: _courriers, ...d } = ancien;
    void _decision;
    void _courriers;
    const verdict: Verdict | undefined = d.conformite?.verdict ?? (d.conformite?.recevabilite ? VERDICTS[d.conformite.recevabilite] : undefined);
    const conformite = d.conformite && verdict ? ({ ...d.conformite, verdict } as ResultatConformite) : undefined;
    if (conformite) delete (conformite as { recevabilite?: string }).recevabilite;

    const transmis = Boolean(d.export);
    const statut: StatutDossier = transmis
      ? verdict === "non_conforme"
        ? "transmis_incomplet"
        : "transmis_complet"
      : d.statut === "recu"
        ? "recu"
        : "en_cours";
    // L'ancienne étape « décision » n'existe plus ; une transmission exige désormais un rapport.
    const etape: Etape =
      d.etape === "decision" || (d.etape === "export" && !transmis && !d.rapport) ? "conformite" : ((d.etape as Etape | undefined) ?? "decoupage");

    dossiers[id] = {
      ...(d as EtatDossier),
      numeroEnregistrement: d.numeroEnregistrement ?? numeroEnregistrement(),
      statut,
      etape,
      revision: d.revision ?? 0,
      conformite,
      journal: d.journal ?? [],
      export: d.export ? { ...d.export, statut, documents: d.export.documents ?? [] } : undefined,
      extractions: Object.fromEntries(Object.entries(d.extractions ?? {}).map(([k, e]) => [k, { ...e, confirmations: e.confirmations ?? {} }])),
    };
  }
  return { dossiers };
}

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
