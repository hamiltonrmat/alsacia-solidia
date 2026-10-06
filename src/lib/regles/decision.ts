import type { Piece } from "@/lib/decoupage";
import { ageA, formaterDateFr, moisEntre, parserDateFr } from "@/lib/dates";
import type { StatutDossier } from "@/lib/statuts";
import type { Lecteur, Recevabilite } from "./conformite";
import { PARAMETRES } from "./parametres";

export { PARAMETRES };

/**
 * Phase 3 : pré-instruction. Applique les règles administratives au dossier
 * et propose une orientation, que l'agent confirme. L'agent d'accueil ne
 * décide pas de l'attribution de l'APA : il enregistre, vérifie la
 * recevabilité et oriente vers le bon service ou organisme.
 */

export type StatutRegle = "verifiee" | "non_verifiee" | "attention" | "indeterminee";

export type Regle = {
  id: string;
  libelle: string;
  statut: StatutRegle;
  detail: string;
};

export type Orientation = "instruction_apa" | "caisse_retraite" | "mdph" | "pieces_manquantes" | "indeterminee";

export const LIBELLES_ORIENTATION: Record<Orientation, string> = {
  instruction_apa: "Transmettre à l'équipe médico-sociale (instruction APA)",
  caisse_retraite: "Transmettre à la caisse de retraite",
  mdph: "Orienter vers la MDPH (PCH)",
  pieces_manquantes: "Mettre en attente de pièces",
  indeterminee: "Compléter le dossier avant d'orienter",
};

export const ORIENTATIONS: Orientation[] = ["instruction_apa", "caisse_retraite", "mdph", "pieces_manquantes", "indeterminee"];

/** Statut du dossier une fois l'orientation validée. */
export function statutPourOrientation(orientation: Orientation): StatutDossier {
  switch (orientation) {
    case "instruction_apa":
      return "transmis_ems";
    case "caisse_retraite":
      return "transmis_caisse";
    case "mdph":
      return "oriente_mdph";
    case "pieces_manquantes":
      return "en_attente_pieces";
    default:
      return "en_cours";
  }
}

export type GirEstime = {
  gir: number;
  libelle: string;
  score: number;
  itemsRenseignes: number;
};

export type ResultatDecision = {
  regles: Regle[];
  orientation: Orientation;
  recommandation: string;
  girEstime?: GirEstime;
  calculeLe: string;
};

export type EntreeDecision = {
  pieces: Piece[];
  lire: Lecteur;
  dateReception: string;
  recevabilite: Recevabilite;
};

export const LIBELLES_CAISSE: Record<string, string> = {
  assurance_retraite: "l'Assurance retraite",
  fonction_publique: "la caisse de retraite de la Fonction publique d'État",
  msa: "la MSA",
  autre: "sa caisse de retraite",
};

const ITEMS_EVALUATION = [
  "transferts",
  "deplacement_interieur",
  "deplacement_exterieur",
  "prehension",
  "motricite_fine",
  "toilette",
  "habillage",
  "alimentation",
  "elimination_urinaire",
  "elimination_fecale",
  "orientation_temps",
  "orientation_espace",
  "securite",
  "comportement",
];

/**
 * Estimation indicative du GIR à partir de la grille du certificat médical.
 * Ce n'est pas la grille AGGIR : l'évaluation à domicile par l'équipe
 * médico-sociale fait foi. Sert à situer le dossier dans la file d'attente.
 */
export function estimerGir(lire: Lecteur): GirEstime | undefined {
  let score = 0;
  let renseignes = 0;
  for (const item of ITEMS_EVALUATION) {
    const v = lire("certificat_medical", `evaluation.${item}`);
    if (v === "non_realise") {
      score += 2;
      renseignes += 1;
    } else if (v === "avec_aide") {
      score += 1;
      renseignes += 1;
    } else if (v === "seul") {
      renseignes += 1;
    }
  }
  if (renseignes < 8) return undefined;
  const normalise = (score / (renseignes * 2)) * 28;
  const gir = normalise >= 20 ? 2 : normalise >= 12 ? 3 : normalise >= 6 ? 4 : normalise >= 3 ? 5 : 6;
  const libelles: Record<number, string> = {
    2: "Dépendance forte (GIR 1-2)",
    3: "Dépendance moyenne (GIR 3)",
    4: "Dépendance partielle (GIR 4)",
    5: "Dépendance légère (GIR 5)",
    6: "Autonomie conservée (GIR 6)",
  };
  return { gir, libelle: libelles[gir], score: Math.round(normalise), itemsRenseignes: renseignes };
}

export function evaluerDecision(entree: EntreeDecision): ResultatDecision {
  const { lire, dateReception, recevabilite } = entree;
  const reception = parserDateFr(dateReception) ?? new Date();
  const regles: Regle[] = [];

  // --- Condition d'âge ------------------------------------------------------
  const ddn = parserDateFr(lire("cerfa_formulaire", "demandeur.date_naissance"));
  let ageOk: boolean | undefined;
  if (!ddn) {
    regles.push({ id: "age", libelle: `Condition d'âge (${PARAMETRES.ageMinimumApa} ans et plus)`, statut: "indeterminee", detail: "Date de naissance non lue." });
  } else {
    const age = ageA(ddn, reception);
    ageOk = age >= PARAMETRES.ageMinimumApa;
    regles.push({
      id: "age",
      libelle: `Condition d'âge (${PARAMETRES.ageMinimumApa} ans et plus)`,
      statut: ageOk ? "verifiee" : "non_verifiee",
      detail: `Né(e) le ${formaterDateFr(ddn)} : ${age} ans à la date de réception (${formaterDateFr(reception)}).${ageOk ? "" : ` L'APA est réservée aux ${PARAMETRES.ageMinimumApa} ans et plus ; en deçà, la PCH relève de la MDPH.`}`,
    });
  }

  // --- Organisme compétent (questionnaire partie 4) ------------------------
  const reponses = ["se_lever", "s_habiller", "faire_sa_toilette", "manger"].map((q) => lire("cerfa_formulaire", `questionnaire.${q}`));
  const nbNon = reponses.filter((r) => r === "non").length;
  const nbManquantes = reponses.filter((r) => r !== "oui" && r !== "non").length;
  const caisse = lire("cerfa_formulaire", "caisse_retraite");
  let departementCompetent: boolean | undefined;
  if (nbNon >= PARAMETRES.seuilNonQuestionnaire) {
    departementCompetent = true;
    regles.push({ id: "organisme", libelle: "Organisme compétent (questionnaire partie 4)", statut: "verifiee", detail: `${nbNon} réponse(s) « non » sur 4 : le département est compétent (APA).` });
  } else if (nbManquantes === 0) {
    departementCompetent = false;
    regles.push({
      id: "organisme",
      libelle: "Organisme compétent (questionnaire partie 4)",
      statut: "non_verifiee",
      detail: `${nbNon} réponse(s) « non » sur 4 : la demande relève de ${LIBELLES_CAISSE[caisse ?? "autre"] ?? "sa caisse de retraite"} (Accompagnement à domicile), pas de l'APA.`,
    });
  } else {
    regles.push({ id: "organisme", libelle: "Organisme compétent (questionnaire partie 4)", statut: "indeterminee", detail: `${nbManquantes} réponse(s) manquante(s) : impossible de déterminer l'organisme compétent.` });
  }

  // --- Lieu de résidence ------------------------------------------------------
  const domicile = lire("cerfa_formulaire", "type_domicile");
  if (domicile === "accueillant_familial") {
    regles.push({ id: "residence", libelle: "Lieu de résidence", statut: "verifiee", detail: "Accueil familial : compatible avec l'APA à domicile, incompatible avec la prestation des caisses de retraite." });
  } else if (domicile === "autre" || domicile === null) {
    regles.push({ id: "residence", libelle: "Lieu de résidence", statut: "attention", detail: "Type de domicile non déterminé : vérifier que le demandeur vit à domicile, chez un proche, en accueil familial ou en résidence autonomie." });
  } else {
    regles.push({ id: "residence", libelle: "Lieu de résidence", statut: "verifiee", detail: "Résidence à domicile compatible avec l'APA à domicile." });
  }

  // --- Domicile de secours ------------------------------------------------------
  const arrivee = parserDateFr(lire("cerfa_formulaire", "ancienne_residence.date_arrivee"));
  const ancienCp = lire("cerfa_formulaire", "ancienne_residence.code_postal");
  if (arrivee && moisEntre(arrivee, reception) < PARAMETRES.moisDomicileDeSecours) {
    regles.push({
      id: "domicile-secours",
      libelle: "Département financeur",
      statut: "attention",
      detail: `Arrivée à l'adresse actuelle le ${formaterDateFr(arrivee)} (moins de ${PARAMETRES.moisDomicileDeSecours} mois)${ancienCp ? `, ancienne résidence dans le ${ancienCp.slice(0, 2)}` : ""} : le domicile de secours détermine le département financeur.`,
    });
  } else {
    regles.push({ id: "domicile-secours", libelle: "Département financeur", statut: "verifiee", detail: "Résidence stable : le département de résidence est financeur." });
  }

  // --- Non-cumul ------------------------------------------------------------
  const prestations: Array<[string, string]> = [
    ["actp", "ACTP"],
    ["aide_sociale_departementale", "aide à domicile au titre de l'aide sociale"],
    ["mtp", "MTP"],
    ["pch", "PCH"],
    ["pcrtp", "PCRTP"],
  ];
  const percues = prestations.filter(([cle]) => lire("cerfa_formulaire", `prestations.${cle}`) === "oui").map(([, l]) => l);
  regles.push(
    percues.length > 0
      ? { id: "cumul", libelle: "Règle de non-cumul", statut: "attention", detail: `Prestation(s) déjà perçue(s) : ${percues.join(", ")}. Non cumulable(s) avec l'APA : l'usager devra choisir en cas d'accord.` }
      : { id: "cumul", libelle: "Règle de non-cumul", statut: "verifiee", detail: "Aucune prestation non cumulable déclarée." },
  );

  // --- Perte d'autonomie, à titre indicatif ---------------------------------
  const girEstime = estimerGir(lire);
  const cmJoint = entree.pieces.some((p) => p.type === "certificat_medical");
  if (girEstime) {
    const pathologies = lire("certificat_medical", "pathologies");
    regles.push({
      id: "gir",
      libelle: "Perte d'autonomie (indicatif)",
      statut: girEstime.gir <= 4 ? "verifiee" : "attention",
      detail: `${girEstime.libelle} d'après la grille du certificat médical (${girEstime.itemsRenseignes} items renseignés). ${girEstime.gir <= 4 ? "Compatible avec l'APA (GIR 1 à 4)." : "Les GIR 5 et 6 n'ouvrent pas droit à l'APA."} L'évaluation AGGIR à domicile fait foi.${pathologies ? ` Pathologies déclarées : ${pathologies.slice(0, 160)}` : ""}`,
    });
  } else {
    regles.push({
      id: "gir",
      libelle: "Perte d'autonomie (indicatif)",
      statut: "indeterminee",
      detail: cmJoint
        ? "La grille d'évaluation du certificat médical n'a pas pu être lue suffisamment pour estimer un GIR. L'évaluation à domicile le déterminera."
        : "Aucun certificat médical joint (pièce facultative) : l'équipe médico-sociale évaluera la perte d'autonomie à domicile.",
    });
  }

  // --- Orientation ------------------------------------------------------------
  let orientation: Orientation;
  let recommandation: string;
  if (ageOk === false) {
    orientation = "mdph";
    recommandation = "Le demandeur n'a pas l'âge requis pour l'APA. Informer l'usager et l'orienter vers la MDPH pour une prestation de compensation du handicap.";
  } else if (departementCompetent === false) {
    orientation = "caisse_retraite";
    recommandation = `Le questionnaire d'autonomie oriente vers ${LIBELLES_CAISSE[caisse ?? "autre"] ?? "la caisse de retraite"}. Transmettre le dossier à cet organisme et en informer l'usager.`;
  } else if (recevabilite === "non_recevable") {
    orientation = "pieces_manquantes";
    recommandation = "Le dossier est incomplet. Enregistrer la demande en attente de pièces et adresser à l'usager la demande de pièces.";
  } else if (ageOk === undefined || departementCompetent === undefined) {
    orientation = "indeterminee";
    recommandation = "Des informations essentielles n'ont pas pu être lues. Compléter le dossier avant d'orienter.";
  } else {
    orientation = "instruction_apa";
    recommandation = `Conditions d'âge et de compétence remplies${recevabilite === "recevable_sous_reserve" ? ", sous réserve des points d'attention relevés" : ""}. Accuser réception et transmettre à l'équipe médico-sociale pour évaluation à domicile.`;
  }

  return { regles, orientation, recommandation, girEstime, calculeLe: new Date().toISOString() };
}

/** Destinataire de la transmission selon l'orientation retenue. */
export function destinataireOrientation(orientation: Orientation, caisse: string | null): string {
  switch (orientation) {
    case "instruction_apa":
      return "Équipe médico-sociale APA du Département";
    case "caisse_retraite":
      return `Caisse de retraite (${LIBELLES_CAISSE[caisse ?? "autre"] ?? "caisse de retraite"})`;
    case "mdph":
      return "Usager, orienté vers la MDPH";
    case "pieces_manquantes":
      return "Usager (demande de pièces)";
    default:
      return "Aucune transmission";
  }
}
