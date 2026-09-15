import type { TypePiece } from "@/lib/decoupage";

/**
 * Schémas d'extraction structurée par type de pièce.
 *
 * Chaque champ extrait est un objet { valeur, confiance, extrait } : la valeur
 * normalisée (ou null), un score de confiance de 0 à 1 et l'extrait brut du
 * texte OCR d'où la valeur a été lue. Les schémas sont au format JSON Schema,
 * en mode strict (toutes les propriétés requises, pas de propriété inconnue),
 * tel qu'attendu par l'API Mistral.
 */

export type ChampExtrait = {
  valeur: string | null;
  confiance: number;
  extrait: string | null;
};

export type JsonSchema = Record<string, unknown>;

function champ(description: string, valeurs?: readonly string[]): JsonSchema {
  const valeur: JsonSchema = valeurs
    ? { type: ["string", "null"], enum: [...valeurs, null], description }
    : { type: ["string", "null"], description };
  return {
    type: "object",
    properties: {
      valeur,
      confiance: { type: "number", description: "Confiance de 0 à 1" },
      extrait: { type: ["string", "null"], description: "Extrait brut du texte OCR (80 caractères max)" },
    },
    required: ["valeur", "confiance", "extrait"],
    additionalProperties: false,
  };
}

function objet(proprietes: Record<string, JsonSchema>): JsonSchema {
  return {
    type: "object",
    properties: proprietes,
    required: Object.keys(proprietes),
    additionalProperties: false,
  };
}

const OUI_NON = ["oui", "non"] as const;
const CIVILITE = ["Madame", "Monsieur"] as const;
const NIVEAU = ["seul", "avec_aide", "non_realise", "nsp"] as const;
const MESURES = [
  "sauvegarde_justice",
  "curatelle_simple",
  "curatelle_renforcee",
  "tutelle",
  "habilitation_familiale",
  "mandat_protection_future",
] as const;

const DATE = "Date au format JJ/MM/AAAA";

const identite = (prefixe: string) => ({
  civilite: champ(`Civilité ${prefixe}`, CIVILITE),
  nom_naissance: champ(`Nom de naissance ${prefixe}`),
  nom_usage: champ(`Nom d'usage ${prefixe}, si différent`),
  prenoms: champ(`Prénom(s) ${prefixe}`),
  date_naissance: champ(`Date de naissance ${prefixe}, ${DATE}`),
  commune_naissance: champ(`Commune de naissance ${prefixe}`),
  departement_naissance: champ(`Département de naissance ${prefixe}`),
  pays_naissance: champ(`Pays de naissance ${prefixe}`),
  nir: champ(`Numéro de sécurité sociale ${prefixe}, 15 chiffres sans espaces`),
});

export const SCHEMA_CERFA_FORMULAIRE = objet({
  demandeur: objet(identite("du demandeur")),
  caisse_retraite: champ("Caisse de retraite principale cochée", ["assurance_retraite", "fonction_publique", "msa", "autre"]),
  telephone: champ("Numéro de téléphone du demandeur, 10 chiffres sans espaces"),
  email: champ("Adresse e-mail du demandeur"),
  type_domicile: champ("Domicile au moment de la demande (case cochée)", [
    "domicile",
    "domicile_famille",
    "accueillant_familial",
    "residence_autonomie",
    "autre",
  ]),
  adresse: objet({
    voie: champ("Adresse (numéro et voie)"),
    code_postal: champ("Code postal, 5 chiffres"),
    commune: champ("Commune"),
  }),
  ancienne_residence: objet({
    voie: champ("Ancienne adresse (numéro et voie)"),
    code_postal: champ("Ancien code postal, 5 chiffres"),
    commune: champ("Ancienne commune"),
    date_arrivee: champ(`Date d'arrivée à l'adresse actuelle, ${DATE}`),
  }),
  situation_familiale: champ("Situation familiale cochée", [
    "celibataire",
    "marie",
    "pacse",
    "concubinage",
    "divorce",
    "veuf",
  ]),
  conjoint: objet({
    civilite: champ("Civilité du conjoint", CIVILITE),
    nom_naissance: champ("Nom de naissance du conjoint"),
    prenoms: champ("Prénom(s) du conjoint"),
    date_naissance: champ(`Date de naissance du conjoint, ${DATE}`),
    nir: champ("Numéro de sécurité sociale du conjoint, 15 chiffres"),
    domicile: champ("Domicile du conjoint (case cochée)", ["identique", "accueillant_familial", "ehpad", "autre"]),
  }),
  protection: objet({
    statut: champ("Le demandeur fait-il l'objet d'une mesure de protection ?", ["prononcee", "en_cours", "aucune"]),
    mesure: champ("Mesure de protection cochée", MESURES),
    organisme_nom: champ("Nom de l'organisme de protection ou du mandataire"),
    representant_nom: champ("Nom du représentant (organisme de protection)"),
    representant_prenoms: champ("Prénom(s) du représentant"),
  }),
  proche: objet({
    civilite: champ("Civilité de la personne proche", CIVILITE),
    nom: champ("Nom de la personne proche"),
    prenoms: champ("Prénom(s) de la personne proche"),
    telephone: champ("Téléphone de la personne proche, 10 chiffres"),
    lien: champ("Lien avec le demandeur (case cochée)", ["conjoint", "enfant", "ami", "voisin", "autre"]),
  }),
  questionnaire: objet({
    se_lever: champ("Le demandeur peut-il se lever seul ?", OUI_NON),
    s_habiller: champ("Le demandeur peut-il s'habiller seul ?", OUI_NON),
    faire_sa_toilette: champ("Le demandeur peut-il faire sa toilette seul ?", OUI_NON),
    manger: champ("Le demandeur peut-il manger seul ?", OUI_NON),
  }),
  prestations: objet({
    actp: champ("Perçoit l'ACTP ?", OUI_NON),
    aide_sociale_departementale: champ("Perçoit l'aide à domicile au titre de l'aide sociale départementale ?", OUI_NON),
    mtp: champ("Perçoit la MTP ?", OUI_NON),
    pch: champ("Perçoit la PCH ?", OUI_NON),
    pcrtp: champ("Perçoit la PCRTP ?", OUI_NON),
  }),
  residence_principale: objet({
    voie: champ("Adresse de la résidence principale (partie 6)"),
    commune: champ("Commune de la résidence principale (partie 6)"),
    statut: champ("Propriétaire ou locataire de sa résidence principale", ["proprietaire", "locataire"]),
    occupation: champ("Si propriétaire : occupée, louée à un tiers ou non louée", ["occupee", "louee", "non_louee"]),
  }),
  autres_biens_immobiliers: champ("Nombre d'autres biens immobiliers déclarés (adresses renseignées), en chiffres"),
  cmi: objet({
    stationnement: champ("Souhaite une CMI mention Stationnement ?", OUI_NON),
    priorite_ou_invalidite: champ("Souhaite une CMI mention Priorité ou Invalidité ?", OUI_NON),
    renouvellement: champ("Souhaite renouveler sa carte ?", OUI_NON),
  }),
  signature: objet({
    civilite: champ("Civilité du signataire", CIVILITE),
    nom: champ("Nom du signataire"),
    prenoms: champ("Prénom(s) du signataire"),
    qualite: champ("Agissant en son nom ou en qualité de représentant légal", ["en_mon_nom", "representant_legal"]),
    represente_de: champ("Personne représentée, si représentant légal"),
    lieu: champ("Fait à (lieu de signature)"),
    date: champ(`Date de signature, ${DATE}`),
  }),
});

/**
 * Certificat médical, volet administratif seulement : le contenu médical est
 * sous pli cacheté (voir src/lib/secret-medical.ts) et n'est jamais extrait
 * pour l'agent d'accueil.
 */
export const SCHEMA_CERTIFICAT_MEDICAL = objet({
  patient: objet({
    nom_naissance: champ("Nom de naissance du patient"),
    nom_usage: champ("Nom d'usage du patient"),
    prenoms: champ("Prénom(s) du patient"),
    date_naissance: champ(`Date de naissance du patient, ${DATE}`),
    code_postal: champ("Code postal du patient"),
    commune: champ("Commune du patient"),
  }),
  lieu: champ("Fait à (lieu)"),
  date: champ(`Date du certificat, ${DATE}`),
  medecin_nom: champ("Nom du médecin (cachet ou signature)"),
  medecin_rpps: champ("Numéro RPPS du médecin, 11 chiffres"),
});

/**
 * Certificat médical, volet complet. Réservé à un futur rôle « équipe
 * médico-sociale » : il n'est pas exposé dans l'application de pré-instruction.
 */
export const SCHEMA_CERTIFICAT_MEDICAL_EMS = objet({
  patient: objet({
    nom_naissance: champ("Nom de naissance du patient"),
    nom_usage: champ("Nom d'usage du patient"),
    prenoms: champ("Prénom(s) du patient"),
    date_naissance: champ(`Date de naissance du patient, ${DATE}`),
    code_postal: champ("Code postal du patient"),
    commune: champ("Commune du patient"),
  }),
  pathologies: champ("Pathologies et signes cliniques (texte libre résumé)"),
  prises_en_charge: champ("Prises en charge thérapeutiques (texte libre résumé)"),
  perspective: champ("Perspective d'évolution cochée", [
    "amelioration",
    "stabilite",
    "aggravation",
    "evolutivite_majeure",
    "non_definie",
  ]),
  perimetre_marche: champ("Périmètre de marche coché", ["moins_200m", "plus_200m"]),
  station_debout_penible: champ("Station debout pénible ?", OUI_NON),
  prothese_membres_inferieurs: champ("Prothèse externe des membres inférieurs ?", OUI_NON),
  oxygenotherapie: champ("Oxygénothérapie pour tous ses déplacements ?", OUI_NON),
  aide_humaine: champ("Besoin systématique d'une aide humaine pour ses déplacements ?", OUI_NON),
  canne: champ("Besoin d'une canne ?", OUI_NON),
  deambulateur: champ("Besoin d'un déambulateur ?", OUI_NON),
  fauteuil_roulant: champ("Besoin d'un fauteuil roulant ?", OUI_NON),
  autre_aide_technique: champ("Autre aide technique ?", OUI_NON),
  evaluation: objet({
    transferts: champ("Assurer ses transferts", NIVEAU),
    deplacement_interieur: champ("Se déplacer à l'intérieur du domicile", NIVEAU),
    deplacement_exterieur: champ("Se déplacer à l'extérieur du domicile", NIVEAU),
    prehension: champ("Avoir la préhension manuelle", NIVEAU),
    motricite_fine: champ("Avoir des activités de motricité fine", NIVEAU),
    toilette: champ("Faire sa toilette", NIVEAU),
    habillage: champ("S'habiller, se déshabiller", NIVEAU),
    alimentation: champ("Manger et boire des aliments préparés", NIVEAU),
    elimination_urinaire: champ("Assurer l'hygiène de l'élimination urinaire", NIVEAU),
    elimination_fecale: champ("Assurer l'hygiène de l'élimination fécale", NIVEAU),
    orientation_temps: champ("S'orienter dans le temps", NIVEAU),
    orientation_espace: champ("S'orienter dans l'espace", NIVEAU),
    securite: champ("Gérer sa sécurité personnelle", NIVEAU),
    comportement: champ("Maîtriser son comportement", NIVEAU),
  }),
  coherence_reponses: champ("Cohérence des réponses aux questions ?", OUI_NON),
  score_mms: champ("Score MMS, tel qu'écrit (ex. 26/30)"),
  lieu: champ("Fait à (lieu)"),
  date: champ(`Date du certificat, ${DATE}`),
  medecin_nom: champ("Nom du médecin (cachet ou signature)"),
  medecin_rpps: champ("Numéro RPPS du médecin, 11 chiffres"),
});

export const SCHEMA_CNI = objet({
  nom: champ("Nom (surname) imprimé sur la carte"),
  nom_usage: champ("Nom d'usage (alternate name), si présent"),
  prenoms: champ("Prénom(s) (given names)"),
  sexe: champ("Sexe", ["F", "M"]),
  date_naissance: champ(`Date de naissance, ${DATE}`),
  lieu_naissance: champ("Lieu de naissance"),
  numero: champ("Numéro de la carte"),
  date_delivrance: champ(`Date de délivrance, ${DATE}`),
  date_expiration: champ(`Date d'expiration, ${DATE}`),
  autorite: champ("Autorité de délivrance"),
});

export const SCHEMA_RIB = objet({
  titulaire: champ("Titulaire du compte"),
  banque: champ("Nom de la banque"),
  iban: champ("IBAN sans espaces"),
  bic: champ("BIC"),
});

export const SCHEMA_AVIS_IMPOSITION = objet({
  annee_avis: champ("Année de l'avis d'impôt (AAAA)"),
  annee_revenus: champ("Année des revenus (AAAA)"),
  declarant_1: champ("Déclarant 1"),
  declarant_2: champ("Déclarant 2, si présent"),
  adresse: champ("Adresse complète"),
  numero_fiscal: champ("Numéro fiscal, 13 chiffres"),
  revenu_fiscal_reference: champ("Revenu fiscal de référence en euros, nombre entier sans espaces"),
  nombre_parts: champ("Nombre de parts"),
  impot_net: champ("Montant net de l'impôt en euros, nombre entier"),
});

export const SCHEMA_JUGEMENT = objet({
  tribunal: champ("Tribunal"),
  date: champ(`Date du jugement, ${DATE}`),
  numero_rg: champ("Numéro RG"),
  mesure: champ("Mesure de protection ordonnée", MESURES),
  personne_protegee_nom: champ("Nom de la personne protégée"),
  personne_protegee_prenoms: champ("Prénom(s) de la personne protégée"),
  personne_protegee_date_naissance: champ(`Date de naissance de la personne protégée, ${DATE}`),
  representant_nom: champ("Nom du représentant légal désigné"),
  representant_prenoms: champ("Prénom(s) du représentant légal"),
  representant_organisme: champ("Organisme du représentant légal"),
});

export const SCHEMAS_PAR_TYPE: Partial<Record<TypePiece, { nom: string; schema: JsonSchema; consigne: string }>> = {
  cerfa_formulaire: {
    nom: "cerfa_16301_formulaire",
    schema: SCHEMA_CERFA_FORMULAIRE,
    consigne:
      "Le texte est le formulaire CERFA 16301*01 de demande d'aides à l'autonomie (pages 5 à 9). Les chiffres des dates, du NIR, du téléphone et du code postal sont souvent séparés par des espaces : recolle-les.",
  },
  certificat_medical: {
    nom: "cerfa_16301_certificat_medical",
    schema: SCHEMA_CERTIFICAT_MEDICAL,
    consigne:
      "Le texte est l'annexe « certificat médical » du CERFA 16301*01 dont le contenu médical a été retiré (pli cacheté). N'extrais que l'identité du patient, le lieu, la date et le médecin (cachet ou signature).",
  },
  cni: { nom: "carte_identite", schema: SCHEMA_CNI, consigne: "Le texte est la photocopie d'une carte nationale d'identité française." },
  rib: { nom: "rib", schema: SCHEMA_RIB, consigne: "Le texte est un relevé d'identité bancaire." },
  avis_imposition: { nom: "avis_imposition", schema: SCHEMA_AVIS_IMPOSITION, consigne: "Le texte est un avis d'impôt sur le revenu." },
  jugement_protection: {
    nom: "jugement_protection",
    schema: SCHEMA_JUGEMENT,
    consigne: "Le texte est une décision de justice relative à une mesure de protection juridique.",
  },
};

/**
 * Libellés français des champs, indexés par chemin (« demandeur.nom_naissance »).
 * Les chemins absents sont affichés à partir de la clé.
 */
export const LIBELLES_CHAMPS: Record<string, string> = {
  "demandeur.civilite": "Civilité",
  "demandeur.nom_naissance": "Nom de naissance",
  "demandeur.nom_usage": "Nom d'usage",
  "demandeur.prenoms": "Prénom(s)",
  "demandeur.date_naissance": "Date de naissance",
  "demandeur.commune_naissance": "Commune de naissance",
  "demandeur.departement_naissance": "Département de naissance",
  "demandeur.pays_naissance": "Pays de naissance",
  "demandeur.nir": "Numéro de sécurité sociale",
  caisse_retraite: "Caisse de retraite principale",
  telephone: "Téléphone",
  email: "Adresse e-mail",
  type_domicile: "Type de domicile",
  "adresse.voie": "Adresse",
  "adresse.code_postal": "Code postal",
  "adresse.commune": "Commune",
  "ancienne_residence.voie": "Ancienne adresse",
  "ancienne_residence.code_postal": "Ancien code postal",
  "ancienne_residence.commune": "Ancienne commune",
  "ancienne_residence.date_arrivee": "Date d'arrivée à l'adresse actuelle",
  situation_familiale: "Situation familiale",
  "conjoint.civilite": "Civilité du conjoint",
  "conjoint.nom_naissance": "Nom de naissance du conjoint",
  "conjoint.prenoms": "Prénom(s) du conjoint",
  "conjoint.date_naissance": "Date de naissance du conjoint",
  "conjoint.nir": "NIR du conjoint",
  "conjoint.domicile": "Domicile du conjoint",
  "protection.statut": "Mesure de protection",
  "protection.mesure": "Type de mesure",
  "protection.organisme_nom": "Organisme de protection",
  "protection.representant_nom": "Nom du représentant",
  "protection.representant_prenoms": "Prénom(s) du représentant",
  "proche.civilite": "Civilité du proche",
  "proche.nom": "Nom du proche",
  "proche.prenoms": "Prénom(s) du proche",
  "proche.telephone": "Téléphone du proche",
  "proche.lien": "Lien avec le demandeur",
  "questionnaire.se_lever": "Peut se lever seul",
  "questionnaire.s_habiller": "Peut s'habiller seul",
  "questionnaire.faire_sa_toilette": "Peut faire sa toilette seul",
  "questionnaire.manger": "Peut manger seul",
  "prestations.actp": "Perçoit l'ACTP",
  "prestations.aide_sociale_departementale": "Perçoit l'aide sociale départementale",
  "prestations.mtp": "Perçoit la MTP",
  "prestations.pch": "Perçoit la PCH",
  "prestations.pcrtp": "Perçoit la PCRTP",
  "residence_principale.voie": "Résidence principale (adresse)",
  "residence_principale.commune": "Résidence principale (commune)",
  "residence_principale.statut": "Propriétaire ou locataire",
  "residence_principale.occupation": "Occupation de la résidence",
  autres_biens_immobiliers: "Autres biens immobiliers",
  "cmi.stationnement": "CMI stationnement",
  "cmi.priorite_ou_invalidite": "CMI priorité ou invalidité",
  "cmi.renouvellement": "Renouvellement de carte",
  "signature.civilite": "Civilité du signataire",
  "signature.nom": "Nom du signataire",
  "signature.prenoms": "Prénom(s) du signataire",
  "signature.qualite": "Qualité du signataire",
  "signature.represente_de": "Personne représentée",
  "signature.lieu": "Lieu de signature",
  "signature.date": "Date de signature",
  "patient.nom_naissance": "Nom de naissance du patient",
  "patient.nom_usage": "Nom d'usage du patient",
  "patient.prenoms": "Prénom(s) du patient",
  "patient.date_naissance": "Date de naissance du patient",
  "patient.code_postal": "Code postal du patient",
  "patient.commune": "Commune du patient",
  pathologies: "Pathologies",
  prises_en_charge: "Prises en charge",
  perspective: "Perspective d'évolution",
  perimetre_marche: "Périmètre de marche",
  station_debout_penible: "Station debout pénible",
  prothese_membres_inferieurs: "Prothèse des membres inférieurs",
  oxygenotherapie: "Oxygénothérapie",
  aide_humaine: "Aide humaine pour les déplacements",
  canne: "Canne",
  deambulateur: "Déambulateur",
  fauteuil_roulant: "Fauteuil roulant",
  autre_aide_technique: "Autre aide technique",
  "evaluation.transferts": "Transferts",
  "evaluation.deplacement_interieur": "Déplacements intérieurs",
  "evaluation.deplacement_exterieur": "Déplacements extérieurs",
  "evaluation.prehension": "Préhension manuelle",
  "evaluation.motricite_fine": "Motricité fine",
  "evaluation.toilette": "Toilette",
  "evaluation.habillage": "Habillage",
  "evaluation.alimentation": "Alimentation",
  "evaluation.elimination_urinaire": "Élimination urinaire",
  "evaluation.elimination_fecale": "Élimination fécale",
  "evaluation.orientation_temps": "Orientation dans le temps",
  "evaluation.orientation_espace": "Orientation dans l'espace",
  "evaluation.securite": "Sécurité personnelle",
  "evaluation.comportement": "Comportement",
  coherence_reponses: "Cohérence des réponses",
  score_mms: "Score MMS",
  lieu: "Lieu",
  date: "Date",
  medecin_nom: "Médecin",
  medecin_rpps: "RPPS du médecin",
  nom: "Nom",
  nom_usage: "Nom d'usage",
  prenoms: "Prénom(s)",
  sexe: "Sexe",
  date_naissance: "Date de naissance",
  lieu_naissance: "Lieu de naissance",
  numero: "Numéro de la carte",
  date_delivrance: "Date de délivrance",
  date_expiration: "Date d'expiration",
  autorite: "Autorité",
  titulaire: "Titulaire",
  banque: "Banque",
  iban: "IBAN",
  bic: "BIC",
  annee_avis: "Année de l'avis",
  annee_revenus: "Année des revenus",
  declarant_1: "Déclarant 1",
  declarant_2: "Déclarant 2",
  adresse: "Adresse",
  numero_fiscal: "Numéro fiscal",
  revenu_fiscal_reference: "Revenu fiscal de référence",
  nombre_parts: "Nombre de parts",
  impot_net: "Impôt net",
  tribunal: "Tribunal",
  numero_rg: "Numéro RG",
  mesure: "Mesure ordonnée",
  personne_protegee_nom: "Nom de la personne protégée",
  personne_protegee_prenoms: "Prénom(s) de la personne protégée",
  personne_protegee_date_naissance: "Date de naissance de la personne protégée",
  representant_nom: "Nom du représentant",
  representant_prenoms: "Prénom(s) du représentant",
  representant_organisme: "Organisme du représentant",
};

/** Libellés lisibles des valeurs codées. */
export const LIBELLES_VALEURS: Record<string, string> = {
  oui: "Oui",
  non: "Non",
  assurance_retraite: "Assurance retraite",
  fonction_publique: "Fonction publique d'État",
  msa: "MSA",
  autre: "Autre",
  domicile: "Domicile du demandeur",
  domicile_famille: "Domicile d'un membre de la famille",
  accueillant_familial: "Accueillant familial",
  residence_autonomie: "Résidence autonomie",
  celibataire: "Célibataire",
  marie: "Marié(e)",
  pacse: "Pacsé(e)",
  concubinage: "En concubinage",
  divorce: "Divorcé(e) ou séparé(e)",
  veuf: "Veuf / veuve",
  identique: "Identique à celui du demandeur",
  ehpad: "Ehpad",
  prononcee: "Oui, mesure prononcée",
  en_cours: "Non, demande en cours",
  aucune: "Non",
  sauvegarde_justice: "Sauvegarde de justice",
  curatelle_simple: "Curatelle simple",
  curatelle_renforcee: "Curatelle renforcée",
  tutelle: "Tutelle",
  habilitation_familiale: "Habilitation familiale",
  mandat_protection_future: "Mandat de protection future",
  conjoint: "Conjoint",
  enfant: "Enfant",
  ami: "Ami",
  voisin: "Voisin",
  proprietaire: "Propriétaire",
  locataire: "Locataire",
  occupee: "Occupée par le demandeur",
  louee: "Louée à un tiers",
  non_louee: "Non louée",
  en_mon_nom: "En son nom",
  representant_legal: "Représentant légal",
  amelioration: "Amélioration",
  stabilite: "Stabilité",
  aggravation: "Aggravation",
  evolutivite_majeure: "Évolutivité majeure",
  non_definie: "Non définie",
  moins_200m: "Moins de 200 m",
  plus_200m: "Plus de 200 m",
  seul: "Réalisé seul",
  avec_aide: "Avec l'aide d'un tiers",
  non_realise: "Non réalisé",
  nsp: "Ne se prononce pas",
};

export type ChampAPlat = {
  chemin: string;
  libelle: string;
  valeur: string | null;
  confiance: number;
  extrait: string | null;
};

function estChamp(v: unknown): v is ChampExtrait {
  return typeof v === "object" && v !== null && "valeur" in v && "confiance" in v;
}

/** Aplatit un résultat d'extraction en liste de champs (ordre du schéma). */
export function aplatirChamps(objet: unknown, prefixe = ""): ChampAPlat[] {
  if (typeof objet !== "object" || objet === null) return [];
  const resultat: ChampAPlat[] = [];
  for (const [cle, valeur] of Object.entries(objet as Record<string, unknown>)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle;
    if (estChamp(valeur)) {
      resultat.push({
        chemin,
        libelle: LIBELLES_CHAMPS[chemin] ?? LIBELLES_CHAMPS[cle] ?? cle.replace(/_/g, " "),
        valeur: valeur.valeur,
        confiance: typeof valeur.confiance === "number" ? Math.max(0, Math.min(1, valeur.confiance)) : 0,
        extrait: valeur.extrait ?? null,
      });
    } else {
      resultat.push(...aplatirChamps(valeur, chemin));
    }
  }
  return resultat;
}

/** Lit un champ par son chemin dans un résultat d'extraction. */
export function lireChamp(objet: unknown, chemin: string): ChampExtrait | null {
  let courant: unknown = objet;
  for (const segment of chemin.split(".")) {
    if (typeof courant !== "object" || courant === null) return null;
    courant = (courant as Record<string, unknown>)[segment];
  }
  return estChamp(courant) ? courant : null;
}

/** Valeur d'un champ par son chemin, ou null. */
export function valeurChamp(objet: unknown, chemin: string): string | null {
  return lireChamp(objet, chemin)?.valeur ?? null;
}

export function libelleValeur(valeur: string | null): string {
  if (valeur === null || valeur === "") return "—";
  return LIBELLES_VALEURS[valeur] ?? valeur;
}

/** Valeurs possibles d'un champ à choix (case cochée), d'après le schéma. */
export function optionsChamp(type: TypePiece, chemin: string): string[] | null {
  const definition = SCHEMAS_PAR_TYPE[type];
  if (!definition) return null;
  let courant: JsonSchema | undefined = definition.schema;
  for (const segment of chemin.split(".")) {
    const proprietes = courant?.properties as Record<string, JsonSchema> | undefined;
    courant = proprietes?.[segment];
    if (!courant) return null;
  }
  const valeur = (courant.properties as Record<string, JsonSchema> | undefined)?.valeur;
  const options = valeur?.enum as Array<string | null> | undefined;
  return options ? options.filter((o): o is string => typeof o === "string") : null;
}

/**
 * Champs critiques : ils commandent la recevabilité ou l'orientation et
 * doivent être vérifiés explicitement par l'agent, même lus avec une bonne
 * confiance (pratique du vidéocodage).
 */
export const CHAMPS_CRITIQUES: Partial<Record<TypePiece, string[]>> = {
  cerfa_formulaire: [
    "demandeur.nom_naissance",
    "demandeur.prenoms",
    "demandeur.date_naissance",
    "demandeur.nir",
    "questionnaire.se_lever",
    "questionnaire.s_habiller",
    "questionnaire.faire_sa_toilette",
    "questionnaire.manger",
    "protection.statut",
    "signature.qualite",
    "signature.date",
  ],
  certificat_medical: ["patient.nom_naissance", "patient.date_naissance", "date"],
  cni: ["nom", "prenoms", "date_naissance", "date_expiration"],
  rib: ["titulaire", "iban"],
  avis_imposition: ["declarant_1", "annee_revenus", "revenu_fiscal_reference"],
  jugement_protection: ["mesure", "personne_protegee_nom", "date"],
};

export function estChampCritique(type: TypePiece, chemin: string): boolean {
  return CHAMPS_CRITIQUES[type]?.includes(chemin) ?? false;
}

/** Page officielle du CERFA (5 à 9) où se trouve chaque groupe de champs. */
const PAGE_CERFA_PAR_GROUPE: Record<string, number> = {
  demandeur: 5,
  caisse_retraite: 5,
  telephone: 5,
  email: 5,
  type_domicile: 5,
  adresse: 5,
  ancienne_residence: 5,
  situation_familiale: 6,
  conjoint: 6,
  protection: 6,
  proche: 7,
  questionnaire: 7,
  prestations: 7,
  residence_principale: 8,
  autres_biens_immobiliers: 8,
  cmi: 9,
  signature: 9,
};

export function pageCerfaPourChemin(chemin: string): number {
  return PAGE_CERFA_PAR_GROUPE[chemin.split(".")[0]] ?? 5;
}
