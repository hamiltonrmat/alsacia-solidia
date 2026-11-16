import type { TypePiece } from "@/lib/decoupage";
import { PARAMETRES } from "@/lib/regles/parametres";
import type { FamilleRegle, IdRegle, StatutControle, Verdict } from "@/lib/regles/conformite";

/**
 * Modèle de données du rapport de contrôle d'un dossier.
 *
 * Le rapport est d'abord une donnée structurée, versionnée, que le logiciel
 * métier peut lire telle quelle ; le PDF n'en est que la mise en page (le JSON
 * y est d'ailleurs joint en pièce attachée). Toute évolution incompatible du
 * format incrémente VERSION_RAPPORT.
 *
 * Module isomorphe : utilisable par le navigateur (construction), le serveur
 * (mise en page PDF, réception par Solis) et les scripts.
 */

export const SCHEMA_RAPPORT = "solidia.rapport-controle";
export const VERSION_RAPPORT = 1;

export type NiveauRobustesse = "bonne" | "moyenne" | "faible" | "non_evaluee";

export const LIBELLES_NIVEAU: Record<NiveauRobustesse, string> = {
  bonne: "Bonne",
  moyenne: "Moyenne",
  faible: "Faible",
  non_evaluee: "Non évaluée",
};

/** État d'un champ extrait au moment du rapport. */
export type StatutChamp = "confirme" | "corrige" | "lu" | "vide" | "douteux" | "non_lu";

export const LIBELLES_STATUT_CHAMP: Record<StatutChamp, string> = {
  confirme: "Vérifié",
  corrige: "Corrigé",
  lu: "Lu",
  vide: "Vide",
  douteux: "Douteux",
  non_lu: "Non lu",
};

export const DESCRIPTIONS_STATUT_CHAMP: Record<StatutChamp, string> = {
  confirme: "valeur lue, vérifiée par l'agent en regard du document",
  corrige: "valeur saisie ou corrigée par l'agent, elle remplace la lecture",
  lu: "valeur lue avec une confiance suffisante, non vérifiée une à une",
  vide: "champ lu comme vide sur le document",
  douteux: "valeur lue avec une confiance faible, non vérifiée",
  non_lu: "valeur non lue (illisible, case non visible), non complétée",
};

export type IndicateursLecture = {
  /** Indice de robustesse de 0 à 100, ou null s'il n'y a aucun champ à évaluer. */
  indice: number | null;
  niveau: NiveauRobustesse;
  champs: number;
  lus: number;
  vides: number;
  douteux: number;
  nonLus: number;
  corriges: number;
  confirmes: number;
};

export type RapportControle = {
  schema: typeof SCHEMA_RAPPORT;
  version: typeof VERSION_RAPPORT;
  /** ISO 8601, horodatage de génération (fige aussi les dates du PDF). */
  genereLe: string;
  outil: { nom: string; version: string; collectivite: string };

  dossier: {
    id: string;
    numeroEnregistrement: string;
    lot: string;
    libelleGed: string;
    dateReception: string;
    prisEnChargeLe: string;
    nbPages: number;
    /** JJ/MM/AAAA, null si le dossier est incomplet. */
    dateCompletude: string | null;
    /** Statut que prendra la demande dans Solis. */
    statutTransmission: "transmis_complet" | "transmis_incomplet";
  };

  usager: {
    civilite: string | null;
    nomNaissance: string | null;
    nomUsage: string | null;
    prenoms: string | null;
    dateNaissance: string | null;
    nir: string | null;
    rapprochement: {
      decision: "existant" | "nouveau" | "non_confirme";
      numeroUsager: string | null;
      critere: string | null;
      demandeEnCours: string | null;
      confirmeLe: string | null;
    };
  };

  synthese: {
    verdict: Verdict;
    libelleVerdict: string;
    texte: string;
    nbBloquants: number;
    nbAlertes: number;
    nbInformations: number;
    nbConformes: number;
    piecesManquantes: string[];
    /** Observations de l'agent à l'attention de l'instruction. */
    observations: string | null;
  };

  ocr: {
    moteur: string;
    dureeSecondes: number;
    nbPages: number;
    /** Moyenne de la confiance du typage des pages, de 0 à 100. */
    confianceTypage: number;
    pagesEcartees: number;
    pagesVides: number;
    global: IndicateursLecture;
    pages: Array<
      IndicateursLecture & {
        numero: number;
        type: TypePiece;
        libelleType: string;
        /** Numéro du document (pièce) issu du déliassage. */
        document: number | null;
        pageCerfa: number | null;
        ecartee: boolean;
        caracteres: number;
        confianceTypage: number;
        justification: string;
        apercu: string;
      }
    >;
  };

  deliassage: {
    valideLe: string | null;
    pieces: Array<{
      document: number;
      id: string;
      type: TypePiece;
      libelle: string;
      pages: number[];
      confiance: number;
      origine: "automatique" | "agent";
      traitement: "extraite" | "sans_extraction" | "ecartee";
    }>;
    interventions: Array<{ horodatage: string; action: string }>;
  };

  controleDonnees: {
    valideLe: string | null;
    pieces: Array<{
      document: number;
      pieceId: string;
      type: TypePiece;
      libelle: string;
      pages: number[];
      modele: string | null;
      erreur: string | null;
      indicateurs: IndicateursLecture;
      champs: Array<{
        chemin: string;
        libelle: string;
        page: number;
        critique: boolean;
        /** Valeur telle que lue (code pour les champs à cases). */
        valeurLue: string | null;
        /** Valeur transmise : correction de l'agent, sinon valeur lue. */
        valeurRetenue: string | null;
        confiance: number;
        statut: StatutChamp;
        extrait: string | null;
      }>;
    }>;
  };

  completude: {
    valideLe: string;
    verdict: Verdict;
    libelleVerdict: string;
    synthese: string;
    piecesManquantes: string[];
    controles: Array<{
      id: IdRegle;
      famille: FamilleRegle;
      libelleFamille: string;
      libelle: string;
      statut: StatutControle;
      libelleStatut: string;
      piece: string | null;
      detail: string;
    }>;
    delais: {
      dateReception: string;
      accuseReceptionAvant: string | null;
      dateCompletude: string | null;
    };
  };

  journal: Array<{ horodatage: string; contexte: string; action: string; detail: string | null; avant: string | null; apres: string | null }>;
};

/** Score de lecture d'un champ (0 à 1) servant à l'indice de robustesse. */
export function scoreChamp(statut: StatutChamp, confiance: number): number {
  if (statut === "corrige") return 0;
  if (statut === "confirme") return 1;
  return Math.max(0, Math.min(1, confiance));
}

export function niveauPourIndice(indice: number | null): NiveauRobustesse {
  if (indice === null) return "non_evaluee";
  if (indice >= PARAMETRES.seuilConfianceSure * 100) return "bonne";
  if (indice >= PARAMETRES.seuilConfianceDouteuse * 100) return "moyenne";
  return "faible";
}

/** Agrège les indicateurs de lecture d'une liste de champs. */
export function indicateursDe(champs: Array<{ statut: StatutChamp; confiance: number }>): IndicateursLecture {
  const compter = (s: StatutChamp) => champs.filter((c) => c.statut === s).length;
  const indice = champs.length ? Math.round((champs.reduce((n, c) => n + scoreChamp(c.statut, c.confiance), 0) / champs.length) * 100) : null;
  return {
    indice,
    niveau: niveauPourIndice(indice),
    champs: champs.length,
    lus: compter("lu"),
    vides: compter("vide"),
    douteux: compter("douteux"),
    nonLus: compter("non_lu"),
    corriges: compter("corrige"),
    confirmes: compter("confirme"),
  };
}

/** Explication de l'indice de robustesse, reprise dans le rapport et le mode d'emploi. */
export const METHODE_ROBUSTESSE = [
  "Le moteur de lecture ne fournit pas de score de confiance par caractère. L'indice de robustesse est donc calculé à partir de ce qui est observable : la confiance de chaque champ extrait et le contrôle de l'agent.",
  "Chaque champ reçoit un score : 1 s'il a été vérifié par l'agent sans correction (la lecture était exacte), 0 s'il a été corrigé (la lecture était fausse ou absente), sinon la confiance de l'extraction, de 0 à 1.",
  `L'indice d'une page est la moyenne des scores des champs portés par cette page, ramenée sur 100 ; l'indice global est la moyenne sur tous les champs du dossier. Lecture : ${Math.round(PARAMETRES.seuilConfianceSure * 100)} et plus, bonne ; de ${Math.round(PARAMETRES.seuilConfianceDouteuse * 100)} à ${Math.round(PARAMETRES.seuilConfianceSure * 100) - 1}, moyenne ; en deçà, faible.`,
  "Une page sans champ extrait (notice, mentions RGPD, pièce non extraite) n'a pas d'indice : sa confiance de typage et le nombre de caractères lus renseignent sur la qualité de la numérisation.",
];

export function nomFichierRapport(rapport: Pick<RapportControle, "dossier">): string {
  return `rapport-controle-${rapport.dossier.numeroEnregistrement}.pdf`;
}

/** Contrôle de forme d'un rapport reçu par une route d'API. */
export function estRapportControle(valeur: unknown): valeur is RapportControle {
  if (typeof valeur !== "object" || valeur === null) return false;
  const r = valeur as Partial<RapportControle>;
  return (
    r.schema === SCHEMA_RAPPORT &&
    r.version === VERSION_RAPPORT &&
    typeof r.genereLe === "string" &&
    typeof r.dossier?.numeroEnregistrement === "string" &&
    Array.isArray(r.ocr?.pages) &&
    Array.isArray(r.deliassage?.pieces) &&
    Array.isArray(r.controleDonnees?.pieces) &&
    Array.isArray(r.completude?.controles) &&
    Array.isArray(r.journal)
  );
}
