import type { DossierSolis, UsagerSolis } from "@/data/solis";
import { LIBELLES_PIECES, type Piece, type TypePiece } from "@/lib/decoupage";
import { ajouterAnnees, formaterDateFr, moisEntre, parserDateFr } from "@/lib/dates";
import { ibanValide, nirValide } from "@/lib/identifiants";
import { PARAMETRES } from "./parametres";

/**
 * Moteur de règles métier : complétude et conformité du dossier.
 *
 * Chaque règle est déclarée dans le catalogue ci-dessous (famille, ce qui est
 * vérifié, issues possibles), puis appliquée par evaluerConformite. Le mode
 * d'emploi et le rapport de contrôle lisent ce même catalogue : la
 * documentation ne peut pas diverger du code.
 *
 * Ces règles disent si le dossier est complet et cohérent. Elles n'apprécient
 * pas le droit à la prestation (âge, organisme compétent, non-cumul…) : cette
 * appréciation relève de l'instruction dans Solis, et tout dossier contrôlé y
 * est transmis.
 */

export type StatutControle = "ok" | "info" | "alerte" | "bloquant" | "non_applicable";

export const LIBELLES_STATUT_CONTROLE: Record<StatutControle, string> = {
  bloquant: "Bloquant",
  alerte: "Alerte",
  info: "Information",
  ok: "Conforme",
  non_applicable: "Sans objet",
};

export type FamilleRegle = "pieces" | "formulaire" | "identite" | "usager" | "cni" | "rib" | "avis" | "certificat";

export const LIBELLES_FAMILLE: Record<FamilleRegle, string> = {
  pieces: "Pièces obligatoires et conditionnelles",
  formulaire: "Formulaire de demande",
  identite: "Identité du demandeur",
  usager: "Rapprochement avec Solis",
  cni: "Pièce d'identité",
  rib: "Relevé d'identité bancaire",
  avis: "Avis d'imposition",
  certificat: "Certificat médical",
};

export const ORDRE_FAMILLES: FamilleRegle[] = ["pieces", "formulaire", "identite", "usager", "cni", "rib", "avis", "certificat"];

export type DefinitionRegle = {
  famille: FamilleRegle;
  libelle: string;
  piece?: TypePiece;
  /** Ce que la règle vérifie, en une phrase. */
  verifie: string;
  /** Issue possible pour chaque statut que la règle peut produire. */
  issues: Partial<Record<Exclude<StatutControle, "non_applicable">, string>>;
};

export const CATALOGUE_REGLES = {
  // --- Pièces ---------------------------------------------------------------
  "presence-formulaire": {
    famille: "pieces",
    libelle: "Formulaire de demande (CERFA 16301*01)",
    piece: "cerfa_formulaire",
    verifie: "Le formulaire de demande figure parmi les pièces du dossier.",
    issues: { ok: "Pièce présente.", bloquant: "Pièce absente : dossier incomplet." },
  },
  "presence-cni": {
    famille: "pieces",
    libelle: "Justificatif d'identité",
    piece: "cni",
    verifie: "Une pièce d'identité figure parmi les pièces du dossier.",
    issues: { ok: "Pièce présente.", bloquant: "Pièce absente : dossier incomplet." },
  },
  "presence-rib": {
    famille: "pieces",
    libelle: "Relevé d'identité bancaire",
    piece: "rib",
    verifie: "Un relevé d'identité bancaire figure parmi les pièces du dossier.",
    issues: { ok: "Pièce présente.", bloquant: "Pièce absente : dossier incomplet." },
  },
  "presence-avis": {
    famille: "pieces",
    libelle: "Dernier avis d'imposition ou de non-imposition",
    piece: "avis_imposition",
    verifie: "Un avis d'imposition ou de non-imposition figure parmi les pièces du dossier.",
    issues: { ok: "Pièce présente.", bloquant: "Pièce absente : dossier incomplet." },
  },
  jugement: {
    famille: "pieces",
    libelle: "Décision de justice (mesure de protection)",
    piece: "jugement_protection",
    verifie: "Si une mesure de protection est déclarée prononcée, ou si le formulaire est signé par un représentant légal, la décision de justice est jointe.",
    issues: {
      ok: "Jugement joint.",
      info: "Demande de protection en cours : jugement à réclamer lorsqu'il sera rendu.",
      bloquant: "Mesure déclarée sans jugement joint : dossier incomplet.",
    },
  },
  "taxe-fonciere": {
    famille: "pieces",
    libelle: "Avis de taxe foncière",
    piece: "taxe_fonciere",
    verifie: "Si la résidence principale est déclarée non louée, ou si d'autres biens immobiliers sont déclarés, l'avis de taxe foncière est joint.",
    issues: { ok: "Avis joint.", alerte: "Avis attendu mais absent." },
  },
  "presence-cm": {
    famille: "pieces",
    libelle: "Certificat médical",
    piece: "certificat_medical",
    verifie: "Pièce facultative. Une annexe jointe mais vierge (ni patient, ni date, ni médecin lus) est considérée comme absente.",
    issues: { ok: "Certificat joint et renseigné, transmis avec le dossier.", info: "Absent ou vierge : sans effet sur la complétude." },
  },

  // --- Formulaire -------------------------------------------------------------
  "formulaire-complet": {
    famille: "formulaire",
    libelle: "Formulaire complet (pages 5 à 9)",
    piece: "cerfa_formulaire",
    verifie: "Les cinq pages du formulaire, reconnues au numéro officiel de leur pied de page, sont toutes présentes.",
    issues: { ok: "Les cinq pages sont présentes.", bloquant: "Page(s) manquante(s), en particulier la page 9 de signature : dossier incomplet." },
  },
  "formulaire-doublons": {
    famille: "formulaire",
    libelle: "Pages en double",
    piece: "cerfa_formulaire",
    verifie: "Aucune page du formulaire n'apparaît deux fois.",
    issues: { alerte: "Page numérisée deux fois, ou second formulaire : à vérifier au déliassage." },
  },
  "formulaire-multiple": {
    famille: "formulaire",
    libelle: "Un seul formulaire par envoi",
    piece: "cerfa_formulaire",
    verifie: "Le dossier ne contient qu'un formulaire ; pour un couple, chaque demandeur a son dossier.",
    issues: { alerte: "Plusieurs formulaires dans le même envoi : ouvrir un dossier par demandeur." },
  },
  "signature-presence": {
    famille: "formulaire",
    libelle: "Formulaire signé et daté",
    piece: "cerfa_formulaire",
    verifie: "Le nom du signataire et la date de signature sont lus en page 9, et la date n'est pas postérieure à la réception.",
    issues: { ok: "Signé et daté.", alerte: "Signature ou date non lue, ou date postérieure à la réception." },
  },
  "signature-qualite": {
    famille: "formulaire",
    libelle: "Qualité du signataire",
    piece: "cerfa_formulaire",
    verifie: "La qualité du signataire (en son nom ou représentant légal) est cohérente avec la mesure de protection déclarée.",
    issues: {
      ok: "Qualité cohérente.",
      info: "Mesure autre qu'une tutelle et signature en son nom : étendue de la mesure à vérifier.",
      alerte: "Représentant légal sans mesure déclarée, personne sous tutelle signant en son nom, ou qualité non lue.",
    },
  },
  questionnaire: {
    famille: "formulaire",
    libelle: "Questionnaire d'autonomie renseigné (partie 4)",
    piece: "cerfa_formulaire",
    verifie: "Les quatre réponses oui / non de la partie 4 sont lues. L'outil ne les interprète pas : elles sont transmises à Solis pour l'instruction.",
    issues: { ok: "Les quatre réponses sont lues.", alerte: "Réponse(s) non lue(s) : à compléter, document à l'appui." },
  },

  // --- Identité -------------------------------------------------------------
  "identite-complete": {
    famille: "identite",
    libelle: "Identité du demandeur renseignée",
    piece: "cerfa_formulaire",
    verifie: "Nom de naissance, prénom(s), date de naissance et numéro de sécurité sociale sont lus sur le formulaire.",
    issues: { ok: "Identité complète.", alerte: "Champ(s) d'identité non lu(s)." },
  },
  nir: {
    famille: "identite",
    libelle: "Clé du numéro de sécurité sociale",
    piece: "cerfa_formulaire",
    verifie: "La clé de contrôle du NIR (97 moins le reste de la division par 97 des 13 premiers chiffres) est correcte.",
    issues: { ok: "Clé correcte.", alerte: "Clé incorrecte : NIR mal lu ou mal saisi." },
  },

  // --- Rapprochement avec Solis ------------------------------------------------
  rapprochement: {
    famille: "usager",
    libelle: "Rapprochement avec l'usager Solis",
    verifie: "L'agent a confirmé le rattachement à un usager existant ou la création d'un usager ; l'état civil de l'usager rattaché concorde avec le formulaire.",
    issues: { ok: "Usager confirmé, identité concordante.", alerte: "Rapprochement non confirmé, ou écart de nom ou de date de naissance avec Solis." },
  },
  "rapprochement-adresse": {
    famille: "usager",
    libelle: "Adresse connue de Solis",
    verifie: "L'adresse du formulaire correspond à celle que Solis connaît pour l'usager rattaché.",
    issues: { info: "Adresse différente : à mettre à jour lors de l'enregistrement." },
  },
  "demande-double": {
    famille: "usager",
    libelle: "Demande déjà en cours",
    verifie: "Aucune demande de même nature n'est déjà en cours dans Solis pour l'usager rattaché.",
    issues: { alerte: "Demande en cours : l'envoi y est rattaché au lieu de créer un doublon." },
  },

  // --- Pièce d'identité ---------------------------------------------------------
  "cni-nom": {
    famille: "cni",
    libelle: "Nom sur la pièce d'identité",
    piece: "cni",
    verifie: "Le nom imprimé sur la pièce d'identité correspond au nom de naissance ou d'usage du formulaire.",
    issues: { ok: "Noms concordants.", alerte: "Nom non lu sur la pièce ou sur le formulaire.", bloquant: "Nom différent : la pièce ne justifie pas l'identité du demandeur." },
  },
  "cni-prenom": {
    famille: "cni",
    libelle: "Prénom sur la pièce d'identité",
    piece: "cni",
    verifie: "Le premier prénom de la pièce d'identité est celui du formulaire.",
    issues: { ok: "Prénoms concordants.", alerte: "Prénom différent." },
  },
  "cni-ddn": {
    famille: "cni",
    libelle: "Date de naissance sur la pièce d'identité",
    piece: "cni",
    verifie: "La date de naissance de la pièce d'identité est celle du formulaire.",
    issues: { ok: "Dates concordantes.", alerte: "Dates différentes : à vérifier avec l'usager." },
  },
  "cni-validite": {
    famille: "cni",
    libelle: "Validité de la pièce d'identité",
    piece: "cni",
    verifie: `La pièce est valide à la date de réception, prolongation légale de ${PARAMETRES.anneesProlongationCni} ans comprise pour les cartes délivrées à des majeurs entre 2004 et 2013.`,
    issues: { ok: "Pièce valide.", alerte: "Pièce expirée ou date d'expiration non lue : une pièce périmée reste un justificatif d'identité, à apprécier." },
  },

  // --- RIB ------------------------------------------------------------------------
  "rib-titulaire": {
    famille: "rib",
    libelle: "RIB au nom du demandeur",
    piece: "rib",
    verifie: "Le nom de naissance ou d'usage du demandeur figure dans l'intitulé du titulaire du compte.",
    issues: { ok: "Titulaire concordant.", alerte: "Le nom du demandeur n'apparaît pas dans le titulaire." },
  },
  "rib-iban": {
    famille: "rib",
    libelle: "Clé de l'IBAN",
    piece: "rib",
    verifie: "La clé de contrôle de l'IBAN (norme ISO 13616, modulo 97) est correcte.",
    issues: { ok: "Clé correcte.", alerte: "Clé incorrecte : IBAN mal lu ou erroné." },
  },

  // --- Avis d'imposition ------------------------------------------------------
  "avis-annee": {
    famille: "avis",
    libelle: "Année de l'avis d'imposition",
    piece: "avis_imposition",
    verifie: `Les revenus déclarés datent de ${PARAMETRES.anneesAvisImposition} ans au plus avant l'année de réception.`,
    issues: { ok: "Dernier avis disponible.", alerte: "Avis trop ancien ou année non lue : le dernier avis est attendu." },
  },
  "avis-nom": {
    famille: "avis",
    libelle: "Avis au nom du demandeur",
    piece: "avis_imposition",
    verifie: "Le nom de naissance ou d'usage du demandeur figure parmi les déclarants.",
    issues: { ok: "Demandeur parmi les déclarants.", alerte: "Le nom du demandeur n'apparaît pas parmi les déclarants." },
  },
  "avis-conjoint": {
    famille: "avis",
    libelle: "Ressources du conjoint",
    piece: "avis_imposition",
    verifie: "Pour un demandeur marié, pacsé ou en concubinage, l'avis est commun (second déclarant, ou 2 parts au moins).",
    issues: { ok: "Avis commun.", alerte: "Avis individuel : l'avis du conjoint est attendu." },
  },

  // --- Certificat médical -----------------------------------------------------
  "cm-patient": {
    famille: "certificat",
    libelle: "Certificat établi pour le demandeur",
    piece: "certificat_medical",
    verifie: "Le nom du patient correspond au demandeur et sa date de naissance, si elle est lue, à celle du formulaire.",
    issues: { ok: "Patient identifié comme le demandeur.", alerte: "Identité du patient à vérifier." },
  },
  "cm-date": {
    famille: "certificat",
    libelle: "Date du certificat médical",
    piece: "certificat_medical",
    verifie: `Le certificat date de ${PARAMETRES.moisValiditeCertificat} mois au plus avant la réception.`,
    issues: { ok: "Certificat récent.", alerte: "Certificat ancien ou date non lue." },
  },
  "cm-medecin": {
    famille: "certificat",
    libelle: "Médecin identifié",
    piece: "certificat_medical",
    verifie: "Le nom ou le numéro RPPS du médecin est lu.",
    issues: { ok: "Médecin identifié.", alerte: "Ni nom ni RPPS lus : cachet et signature à vérifier." },
  },
} satisfies Record<string, DefinitionRegle>;

export type IdRegle = keyof typeof CATALOGUE_REGLES;

/** Ancre d'une règle sur la page des règles métier. */
export function ancreRegle(id: IdRegle): string {
  return `regle-${id}`;
}

/**
 * Ce que le moteur ne vérifie pas : l'appréciation du droit relève de
 * l'instruction dans Solis (décision du 16/11/2026). Les données utiles y sont
 * transmises telles que contrôlées.
 */
export const HORS_PERIMETRE: Array<{ sujet: string; explication: string }> = [
  { sujet: "Condition d'âge", explication: "La date de naissance est contrôlée (lecture, cohérence avec la pièce d'identité) mais l'âge n'est pas comparé au seuil de l'APA." },
  { sujet: "Organisme compétent", explication: "Les réponses au questionnaire d'autonomie (partie 4) sont vérifiées et transmises ; l'orientation vers la caisse de retraite est décidée à l'instruction." },
  { sujet: "Département financeur", explication: "L'ancienne adresse et la date d'arrivée sont transmises ; le domicile de secours est apprécié à l'instruction." },
  { sujet: "Non-cumul des prestations", explication: "Les prestations déclarées (ACTP, MTP, PCH, PCRTP, aide sociale) sont transmises telles quelles." },
  { sujet: "Perte d'autonomie", explication: "Le certificat médical est lu et transmis ; l'outil ne note rien et ne calcule aucun GIR." },
  { sujet: "Courriers à l'usager", explication: "Accusé de réception et demande de pièces sont émis depuis Solis ; l'outil affiche seulement la date limite et la liste des pièces manquantes." },
];

export type Controle = {
  id: IdRegle;
  famille: FamilleRegle;
  libelle: string;
  statut: StatutControle;
  detail: string;
  piece?: TypePiece;
};

export type Verdict = "conforme" | "conforme_sous_reserve" | "non_conforme";

export const LIBELLES_VERDICT: Record<Verdict, string> = {
  conforme: "Dossier complet et conforme",
  conforme_sous_reserve: "Dossier complet, points d'attention",
  non_conforme: "Dossier incomplet ou non conforme",
};

export const DESCRIPTIONS_VERDICT: Record<Verdict, string> = {
  conforme: "Aucun bloquant ni alerte. La date de dossier complet est fixée.",
  conforme_sous_reserve: "Aucun bloquant, au moins une alerte. La date de dossier complet est fixée ; les alertes sont signalées à l'instruction dans le rapport.",
  non_conforme: "Au moins un bloquant (pièce obligatoire absente, formulaire incomplet, identité différente). Le dossier est transmis à Solis sans date de dossier complet.",
};

export type ResultatConformite = {
  controles: Controle[];
  verdict: Verdict;
  piecesManquantes: string[];
  synthese: string;
  calculeLe: string;
};

export type Lecteur = (type: TypePiece, chemin: string) => string | null;

export type EntreeConformite = {
  pieces: Piece[];
  lire: Lecteur;
  dateReception: string;
  /** Numéros officiels (5 à 9) des pages du formulaire présentes, doublons compris. */
  pagesCerfa?: number[];
  /** Résultat du rapprochement d'identité avec le logiciel métier. */
  rapprochement?: {
    confirme: boolean;
    usager: UsagerSolis | null;
    demandeEnCours: DossierSolis | null;
  };
};

const PAGES_FORMULAIRE = [5, 6, 7, 8, 9];

function normaliser(v: string | null): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/** Adresse réduite aux lettres et chiffres, pour comparaison. */
function normaliserAdresse(v: string | null): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function premierPrenom(v: string | null): string {
  return normaliser((v ?? "").split(/[\s,-]+/)[0] ?? "");
}

function contientNom(texte: string | null, ...noms: Array<string | null>): boolean {
  const t = normaliser(texte);
  return noms.some((n) => n && normaliser(n).length >= 3 && t.includes(normaliser(n)));
}

export function evaluerConformite(entree: EntreeConformite): ResultatConformite {
  const { pieces, lire, dateReception, pagesCerfa, rapprochement } = entree;
  const controles: Controle[] = [];
  const piecesManquantes: string[] = [];
  const reception = parserDateFr(dateReception) ?? new Date();
  const present = (type: TypePiece) => pieces.some((p) => p.type === type);
  const ajouter = (id: IdRegle, statut: StatutControle, detail: string) => {
    const regle: DefinitionRegle = CATALOGUE_REGLES[id];
    controles.push({ id, famille: regle.famille, libelle: regle.libelle, piece: regle.piece, statut, detail });
  };

  // --- Présence des pièces obligatoires ---------------------------------
  const obligatoires: Array<{ id: IdRegle; type: TypePiece; manquante: string }> = [
    { id: "presence-formulaire", type: "cerfa_formulaire", manquante: "Formulaire de demande (CERFA 16301*01)" },
    { id: "presence-cni", type: "cni", manquante: "Justificatif d'identité" },
    { id: "presence-rib", type: "rib", manquante: "Relevé d'identité bancaire au nom du demandeur" },
    { id: "presence-avis", type: "avis_imposition", manquante: "Dernier avis d'imposition ou de non-imposition" },
  ];
  for (const o of obligatoires) {
    if (present(o.type)) {
      ajouter(o.id, "ok", "Pièce présente.");
    } else {
      piecesManquantes.push(o.manquante);
      ajouter(o.id, "bloquant", "Pièce obligatoire absente du dossier.");
    }
  }

  // --- Formulaire complet, sans doublon, un seul demandeur ----------------
  if (present("cerfa_formulaire") && pagesCerfa) {
    const manquantes = PAGES_FORMULAIRE.filter((n) => !pagesCerfa.includes(n));
    const doublons = PAGES_FORMULAIRE.filter((n) => pagesCerfa.filter((p) => p === n).length > 1);
    if (manquantes.length) {
      piecesManquantes.push(`Page(s) ${manquantes.join(", ")} du formulaire de demande`);
      ajouter("formulaire-complet", "bloquant", `Page(s) manquante(s) : ${manquantes.join(", ")}. Le formulaire doit être fourni en entier${manquantes.includes(9) ? ", y compris la page de signature" : ""}.`);
    } else {
      ajouter("formulaire-complet", "ok", "Les cinq pages du formulaire sont présentes.");
    }
    if (doublons.length) {
      ajouter("formulaire-doublons", "alerte", `Page(s) ${doublons.join(", ")} présente(s) plusieurs fois : page numérisée deux fois, ou second formulaire (un dossier par demandeur pour un couple). Vérifier au déliassage.`);
    }
  }
  const nbFormulaires = pieces.filter((p) => p.type === "cerfa_formulaire").length;
  if (nbFormulaires > 1) {
    ajouter("formulaire-multiple", "alerte", `${nbFormulaires} formulaires distincts dans le même envoi. Si les deux membres d'un couple font une demande, ouvrir un dossier par demandeur.`);
  }

  // --- Signature -----------------------------------------------------------
  const statutProtection = lire("cerfa_formulaire", "protection.statut");
  const qualiteSignature = lire("cerfa_formulaire", "signature.qualite");
  const signataire = lire("cerfa_formulaire", "signature.nom") ?? lire("cerfa_formulaire", "signature.prenoms");
  const dateSignature = parserDateFr(lire("cerfa_formulaire", "signature.date"));
  if (present("cerfa_formulaire") && (!pagesCerfa || pagesCerfa.includes(9))) {
    if (!signataire && !dateSignature) {
      ajouter("signature-presence", "alerte", "Ni nom du signataire ni date de signature lus : vérifier que la page 9 est signée.");
    } else if (!dateSignature) {
      ajouter("signature-presence", "alerte", `Signataire : ${signataire}. Date de signature non lue.`);
    } else if (dateSignature.getTime() > reception.getTime()) {
      ajouter("signature-presence", "alerte", `Date de signature (${formaterDateFr(dateSignature)}) postérieure à la réception : probable erreur de lecture.`);
    } else {
      ajouter("signature-presence", "ok", `Signé par ${signataire ?? "le demandeur"} le ${formaterDateFr(dateSignature)}.`);
    }
  }

  if (qualiteSignature === "representant_legal" && statutProtection !== "prononcee") {
    ajouter("signature-qualite", "alerte", "Signé par un représentant légal alors qu'aucune mesure de protection prononcée n'est déclarée.");
  } else if (qualiteSignature === "en_mon_nom" && statutProtection === "prononcee") {
    const mesure = lire("cerfa_formulaire", "protection.mesure");
    if (mesure === "tutelle") ajouter("signature-qualite", "alerte", "Le demandeur est sous tutelle mais a signé en son nom : la signature du tuteur est attendue.");
    else ajouter("signature-qualite", "info", "Mesure de protection déclarée, signature en son nom : vérifier l'étendue de la mesure.");
  } else if (qualiteSignature === null) {
    ajouter("signature-qualite", "alerte", "La qualité du signataire (en son nom, représentant légal) n'a pas été lue.");
  } else {
    ajouter("signature-qualite", "ok", "Qualité du signataire cohérente avec la situation déclarée.");
  }

  // --- Pièces conditionnelles -------------------------------------------
  if (statutProtection === "prononcee" || qualiteSignature === "representant_legal") {
    if (present("jugement_protection")) {
      ajouter("jugement", "ok", "Jugement joint.");
    } else {
      piecesManquantes.push("Photocopie de la décision de justice relative à la mesure de protection");
      ajouter(
        "jugement",
        "bloquant",
        statutProtection === "prononcee"
          ? "Une mesure de protection est déclarée prononcée : la décision de justice doit être jointe."
          : "Le formulaire est signé par un représentant légal : la décision de justice doit être jointe.",
      );
    }
  } else if (statutProtection === "en_cours") {
    ajouter("jugement", "info", "Demande de protection en cours : jugement à réclamer lorsqu'il sera rendu.");
  }

  const occupation = lire("cerfa_formulaire", "residence_principale.occupation");
  const autresBiens = Number(lire("cerfa_formulaire", "autres_biens_immobiliers") ?? "0") || 0;
  if (occupation === "non_louee" || autresBiens > 0) {
    if (present("taxe_fonciere")) {
      ajouter("taxe-fonciere", "ok", "Avis joint.");
    } else {
      ajouter(
        "taxe-fonciere",
        "alerte",
        occupation === "non_louee"
          ? "Résidence principale déclarée non louée : l'avis de taxe foncière est attendu."
          : `${autresBiens} autre(s) bien(s) immobilier(s) déclaré(s) : avis de taxe foncière attendu pour chaque bien non loué.`,
      );
    }
  }

  // --- Identité du demandeur ---------------------------------------------
  const nomNaissance = lire("cerfa_formulaire", "demandeur.nom_naissance");
  const nomUsage = lire("cerfa_formulaire", "demandeur.nom_usage");
  const prenoms = lire("cerfa_formulaire", "demandeur.prenoms");
  const dateNaissance = lire("cerfa_formulaire", "demandeur.date_naissance");
  const nir = lire("cerfa_formulaire", "demandeur.nir");

  const essentiels: Array<[string, string | null]> = [
    ["Nom de naissance", nomNaissance],
    ["Prénom(s)", prenoms],
    ["Date de naissance", dateNaissance],
    ["Numéro de sécurité sociale", nir],
  ];
  const manquants = essentiels.filter(([, v]) => !v).map(([l]) => l);
  if (manquants.length === 0) ajouter("identite-complete", "ok", "Nom, prénom, date de naissance et NIR lus.");
  else ajouter("identite-complete", "alerte", `Champ(s) non lu(s) : ${manquants.join(", ")}. À compléter avant transmission.`);

  if (nir) {
    if (nirValide(nir)) ajouter("nir", "ok", "Clé de contrôle correcte.");
    else ajouter("nir", "alerte", "La clé de contrôle ne correspond pas : NIR probablement mal lu ou mal saisi.");
  }

  const questionnaire = ["se_lever", "s_habiller", "faire_sa_toilette", "manger"].map((q) => lire("cerfa_formulaire", `questionnaire.${q}`));
  const reponsesManquantes = questionnaire.filter((r) => r !== "oui" && r !== "non").length;
  if (reponsesManquantes === 0) ajouter("questionnaire", "ok", "Les 4 réponses sont lues et transmises telles quelles.");
  else ajouter("questionnaire", "alerte", `${reponsesManquantes} réponse(s) non lue(s) : partie 4 à compléter, document à l'appui.`);

  // --- Rapprochement avec le logiciel métier --------------------------------
  if (rapprochement) {
    if (!rapprochement.confirme) {
      ajouter("rapprochement", "alerte", "L'identité n'a pas été rapprochée des usagers connus : à confirmer au contrôle des données.");
    } else if (rapprochement.usager) {
      const u = rapprochement.usager;
      const ecarts: string[] = [];
      if (nomNaissance && normaliser(u.nomNaissance) !== normaliser(nomNaissance)) ecarts.push(`nom de naissance (Solis : ${u.nomNaissance})`);
      const ddnSolis = parserDateFr(u.dateNaissance);
      const ddnCerfa = parserDateFr(dateNaissance);
      if (ddnSolis && ddnCerfa && ddnSolis.getTime() !== ddnCerfa.getTime()) ecarts.push(`date de naissance (Solis : ${u.dateNaissance})`);
      if (ecarts.length) {
        ajouter("rapprochement", "alerte", `Usager ${u.numeroUsager} rattaché, mais écart(s) avec le formulaire : ${ecarts.join(", ")}. Vérifier qu'il s'agit bien de la même personne et mettre Solis à jour.`);
      } else {
        ajouter("rapprochement", "ok", `Usager connu ${u.numeroUsager}, identité concordante.`);
      }
      const voieCerfa = lire("cerfa_formulaire", "adresse.voie") ?? "";
      const adresseCerfa = `${voieCerfa} ${lire("cerfa_formulaire", "adresse.code_postal") ?? ""}`.trim();
      const cleVoie = normaliserAdresse(voieCerfa).slice(0, 12);
      if (cleVoie.length >= 6 && !normaliserAdresse(u.adresse).includes(cleVoie)) {
        ajouter("rapprochement-adresse", "info", `Solis : ${u.adresse}. Formulaire : ${adresseCerfa}, ${lire("cerfa_formulaire", "adresse.commune") ?? ""}. Adresse à mettre à jour lors de l'enregistrement.`);
      }
      if (rapprochement.demandeEnCours) {
        const d = rapprochement.demandeEnCours;
        ajouter("demande-double", "alerte", `Une demande ${d.numero} (${d.type}) est en cours depuis le ${d.dateDemande}${d.commentaire ? ` : ${d.commentaire}` : "."} Le présent envoi y est rattaché plutôt que de créer une nouvelle demande.`);
      }
    } else {
      ajouter("rapprochement", "ok", "Aucun usager correspondant : première demande, un usager sera créé à l'enregistrement.");
    }
  }

  // --- Pièce d'identité ----------------------------------------------------
  if (present("cni")) {
    const nomCni = lire("cni", "nom");
    const nomUsageCni = lire("cni", "nom_usage");
    const prenomsCni = lire("cni", "prenoms");
    const ddnCni = lire("cni", "date_naissance");

    if (nomCni && nomNaissance) {
      const memeNom =
        normaliser(nomCni) === normaliser(nomNaissance) ||
        (nomUsage !== null && normaliser(nomCni) === normaliser(nomUsage)) ||
        (nomUsageCni !== null && normaliser(nomUsageCni) === normaliser(nomNaissance));
      if (memeNom) ajouter("cni-nom", "ok", `CNI : ${nomCni} — CERFA : ${nomNaissance}.`);
      else ajouter("cni-nom", "bloquant", `Le nom de la CNI (${nomCni}) ne correspond pas à celui du CERFA (${nomNaissance}).`);
    } else {
      ajouter("cni-nom", "alerte", "Nom non lu sur la CNI ou le CERFA.");
    }

    if (prenomsCni && prenoms) {
      if (premierPrenom(prenomsCni) === premierPrenom(prenoms)) ajouter("cni-prenom", "ok", `CNI : ${prenomsCni} — CERFA : ${prenoms}.`);
      else ajouter("cni-prenom", "alerte", `Prénom CNI (${prenomsCni}) différent du CERFA (${prenoms}).`);
    }

    if (ddnCni && dateNaissance) {
      const a = parserDateFr(ddnCni);
      const b = parserDateFr(dateNaissance);
      if (a && b && a.getTime() === b.getTime()) ajouter("cni-ddn", "ok", `${ddnCni} sur les deux documents.`);
      else ajouter("cni-ddn", "alerte", `CNI : ${ddnCni} — CERFA : ${dateNaissance}. Incohérence à vérifier avec l'usager.`);
    }

    const expiration = parserDateFr(lire("cni", "date_expiration"));
    const delivrance = parserDateFr(lire("cni", "date_delivrance"));
    if (!expiration) {
      ajouter("cni-validite", "alerte", "Date d'expiration non lue.");
    } else {
      // Les CNI délivrées à des majeurs entre 2004 et 2013 sont prolongées de 5 ans.
      const prolongee = delivrance !== null && delivrance.getUTCFullYear() >= 2004 && delivrance.getUTCFullYear() <= 2013;
      const expirationEffective = prolongee ? ajouterAnnees(expiration, PARAMETRES.anneesProlongationCni) : expiration;
      if (expirationEffective.getTime() >= reception.getTime()) {
        ajouter(
          "cni-validite",
          "ok",
          prolongee
            ? `Valide jusqu'au ${formaterDateFr(expirationEffective)} (prolongation légale de ${PARAMETRES.anneesProlongationCni} ans).`
            : `Valide jusqu'au ${formaterDateFr(expiration)}.`,
        );
      } else {
        ajouter(
          "cni-validite",
          "alerte",
          `Pièce expirée le ${formaterDateFr(expirationEffective)}${prolongee ? ` (prolongation de ${PARAMETRES.anneesProlongationCni} ans incluse)` : ""}. Une pièce périmée reste un justificatif d'identité : à apprécier par l'agent.`,
        );
      }
    }
  }

  // --- RIB ----------------------------------------------------------------
  if (present("rib")) {
    const titulaire = lire("rib", "titulaire");
    if (contientNom(titulaire, nomNaissance, nomUsage)) ajouter("rib-titulaire", "ok", `Titulaire : ${titulaire}.`);
    else ajouter("rib-titulaire", "alerte", `Titulaire lu : ${titulaire ?? "non lu"}. Le nom du demandeur n'y figure pas.`);
    const iban = lire("rib", "iban");
    if (iban) {
      if (ibanValide(iban)) ajouter("rib-iban", "ok", "Clé IBAN correcte.");
      else ajouter("rib-iban", "alerte", "Clé IBAN incorrecte : IBAN mal lu ou erroné.");
    }
  }

  // --- Avis d'imposition ------------------------------------------------
  if (present("avis_imposition")) {
    const anneeRevenus = Number(lire("avis_imposition", "annee_revenus"));
    const anneeReception = reception.getUTCFullYear();
    if (!anneeRevenus) {
      ajouter("avis-annee", "alerte", "Année des revenus non lue.");
    } else if (anneeReception - anneeRevenus <= PARAMETRES.anneesAvisImposition) {
      ajouter("avis-annee", "ok", `Revenus ${anneeRevenus} : dernier avis disponible.`);
    } else {
      ajouter("avis-annee", "alerte", `Revenus ${anneeRevenus} : avis trop ancien, le dernier avis est attendu.`);
    }
    const declarants = `${lire("avis_imposition", "declarant_1") ?? ""} ${lire("avis_imposition", "declarant_2") ?? ""}`;
    if (contientNom(declarants, nomNaissance, nomUsage)) ajouter("avis-nom", "ok", `Déclarant(s) : ${declarants.trim()}.`);
    else ajouter("avis-nom", "alerte", `Déclarant(s) lu(s) : ${declarants.trim() || "non lu"}. Le nom du demandeur n'y figure pas.`);
    const situation = lire("cerfa_formulaire", "situation_familiale");
    if (situation === "marie" || situation === "pacse" || situation === "concubinage") {
      const parts = Number((lire("avis_imposition", "nombre_parts") ?? "").replace(",", "."));
      const conjointMentionne = Boolean(lire("avis_imposition", "declarant_2")) || parts >= 2;
      if (conjointMentionne) ajouter("avis-conjoint", "ok", "Avis commun : les ressources du conjoint y figurent.");
      else ajouter("avis-conjoint", "alerte", "Demandeur en couple mais avis d'imposition individuel : l'avis du conjoint est attendu.");
    }
  }

  // --- Certificat médical -------------------------------------------------
  const nomPatient = lire("certificat_medical", "patient.nom_naissance");
  const dateCmBrute = lire("certificat_medical", "date");
  const medecin = lire("certificat_medical", "medecin_nom");
  const rpps = lire("certificat_medical", "medecin_rpps");
  const cmVierge = present("certificat_medical") && !nomPatient && !dateCmBrute && !medecin && !rpps;
  if (cmVierge) {
    ajouter("presence-cm", "info", "L'annexe « certificat médical » est jointe mais vierge : elle est considérée comme absente (pièce facultative).");
  } else if (present("certificat_medical")) {
    ajouter("presence-cm", "ok", "Certificat médical joint : il est transmis à Solis avec le dossier.");
    const ddnPatient = parserDateFr(lire("certificat_medical", "patient.date_naissance"));
    const ddnCerfa = parserDateFr(dateNaissance);
    const memePersonne = contientNom(nomPatient, nomNaissance, nomUsage) && (!ddnPatient || !ddnCerfa || ddnPatient.getTime() === ddnCerfa.getTime());
    if (memePersonne) ajouter("cm-patient", "ok", `Patient : ${nomPatient}.`);
    else ajouter("cm-patient", "alerte", `Patient lu : ${nomPatient ?? "non lu"}${ddnPatient ? `, né(e) le ${formaterDateFr(ddnPatient)}` : ""}. Identité à vérifier.`);
    const dateCm = parserDateFr(dateCmBrute);
    if (!dateCm) {
      ajouter("cm-date", "alerte", "Date non lue.");
    } else {
      const mois = moisEntre(dateCm, reception);
      if (mois <= PARAMETRES.moisValiditeCertificat) ajouter("cm-date", "ok", `Établi le ${formaterDateFr(dateCm)}, moins de ${PARAMETRES.moisValiditeCertificat} mois avant la réception.`);
      else ajouter("cm-date", "alerte", `Établi le ${formaterDateFr(dateCm)}, il y a ${mois} mois : certificat ancien.`);
    }
    if (medecin || rpps) ajouter("cm-medecin", "ok", `${medecin ?? ""}${rpps ? ` (RPPS ${rpps})` : ""}`.trim());
    else ajouter("cm-medecin", "alerte", "Ni nom ni RPPS lus : vérifier le cachet et la signature.");
  } else {
    ajouter("presence-cm", "info", "Pièce facultative, absente.");
  }

  // --- Synthèse -----------------------------------------------------------
  const nbBloquants = controles.filter((c) => c.statut === "bloquant").length;
  const nbAlertes = controles.filter((c) => c.statut === "alerte").length;
  const verdict: Verdict = nbBloquants > 0 ? "non_conforme" : nbAlertes > 0 ? "conforme_sous_reserve" : "conforme";
  const synthese =
    verdict === "non_conforme"
      ? `${nbBloquants} point(s) bloquant(s)${piecesManquantes.length ? `, dont ${piecesManquantes.length} pièce(s) manquante(s)` : ""}. Le dossier sera transmis à Solis comme incomplet, sans date de dossier complet.`
      : verdict === "conforme_sous_reserve"
        ? `Dossier complet. ${nbAlertes} point(s) d'attention, signalé(s) à l'instruction dans le rapport de contrôle.`
        : "Dossier complet : toutes les pièces sont présentes et cohérentes.";

  return { controles, verdict, piecesManquantes, synthese, calculeLe: new Date().toISOString() };
}

/** Date limite pour accuser réception du dossier ou réclamer les pièces (JJ/MM/AAAA). */
export function dateLimiteAccuseReception(dateReception: string): string | null {
  const d = parserDateFr(dateReception);
  return d ? formaterDateFr(new Date(d.getTime() + PARAMETRES.joursAccuseReception * 86_400_000)) : null;
}

export function libellePiece(type: TypePiece): string {
  return LIBELLES_PIECES[type];
}
