/**
 * Modèle de données des dossiers fictifs.
 *
 * Ces types décrivent un usager fictif et les pièces de son dossier. Ils
 * servent à la fois au générateur de PDF (scripts/generer-dossiers.ts), à la
 * GED simulée et, comme vérité terrain, à la démonstration.
 *
 * Toutes les données sont synthétiques.
 */

export type Civilite = "Madame" | "Monsieur";

export type CaisseRetraite = "assurance_retraite" | "fonction_publique" | "msa" | "autre";

export type TypeDomicile =
  | "domicile"
  | "domicile_famille"
  | "accueillant_familial"
  | "residence_autonomie"
  | "autre";

export type SituationFamiliale =
  | "celibataire"
  | "marie"
  | "pacse"
  | "concubinage"
  | "divorce"
  | "veuf";

export type MesureProtection =
  | "sauvegarde_justice"
  | "curatelle_simple"
  | "curatelle_renforcee"
  | "tutelle"
  | "habilitation_familiale"
  | "mandat_protection_future";

export type LienProche = "conjoint" | "enfant" | "ami" | "voisin" | "autre";

export type OuiNon = "oui" | "non";

export type Adresse = {
  voie: string;
  codePostal: string;
  commune: string;
  batiment?: string;
  etage?: string;
  digicode?: string;
};

export type Personne = {
  civilite: Civilite;
  nomNaissance: string;
  nomUsage?: string;
  prenoms: string;
  /** Format JJ/MM/AAAA. */
  dateNaissance: string;
  communeNaissance: string;
  departementNaissance: string;
  paysNaissance: string;
  /** 15 chiffres, sans espaces. */
  nir: string;
};

export type Conjoint = Personne & {
  domicile: "identique" | "accueillant_familial" | "ehpad" | "autre";
  /** Si domicile = ehpad, date d'entrée JJ/MM/AAAA. */
  dateEntreeEhpad?: string;
  domicileAutre?: string;
};

export type Protection = {
  statut: "prononcee" | "en_cours" | "aucune";
  mesure?: MesureProtection;
  organisme?: {
    nom: string;
    civilite: Civilite;
    nom_contact: string;
    prenoms: string;
    adresse: Adresse;
    telephone: string;
    email?: string;
  };
};

export type Proche = {
  civilite: Civilite;
  nom: string;
  prenoms: string;
  adresse: Adresse;
  telephone: string;
  email?: string;
  lien: LienProche;
  lienAutre?: string;
};

/** Partie 4 du CERFA : le demandeur peut-il ... seul ? */
export type QuestionnaireAutonomie = {
  seLever: OuiNon;
  sHabiller: OuiNon;
  faireSaToilette: OuiNon;
  manger: OuiNon;
};

/** Partie 5 du CERFA : prestations déjà perçues. */
export type PrestationsPercues = {
  actp: OuiNon;
  aideSocialeDepartementale: OuiNon;
  mtp: OuiNon;
  pch: OuiNon;
  pcrtp: OuiNon;
};

export type Ressources = {
  residencePrincipale: {
    adresse: Adresse;
    statut: "proprietaire" | "locataire";
    /** Si propriétaire. */
    occupation?: "occupee" | "louee" | "non_louee";
  };
  autresBiens: Adresse[];
  biensMobiliers: Array<{ nature: string; valeur: string }>;
};

export type DemandeCmi = {
  stationnement: OuiNon;
  prioriteOuInvalidite: OuiNon;
  renouvellement: OuiNon;
};

export type Signature = {
  civilite: Civilite;
  nom: string;
  prenoms: string;
  qualite: "en_mon_nom" | "representant_legal";
  representeDe?: string;
  lieu: string;
  /** JJ/MM/AAAA. */
  date: string;
};

/** Contenu du formulaire CERFA 16301*01 (pages 5 à 9). */
export type FormulaireCerfa = {
  demandeur: Personne;
  caisseRetraite: CaisseRetraite;
  caisseRetraiteAutre?: string;
  telephone: string;
  email?: string;
  typeDomicile: TypeDomicile;
  typeDomicileAutre?: string;
  adresse: Adresse;
  ancienneResidence?: {
    adresse: Adresse;
    /** JJ/MM/AAAA. */
    dateArrivee: string;
  };
  situationFamiliale: SituationFamiliale;
  conjoint?: Conjoint;
  protection: Protection;
  proche?: Proche;
  questionnaire: QuestionnaireAutonomie;
  prestations: PrestationsPercues;
  ressources: Ressources;
  cmi: DemandeCmi;
  signature: Signature;
};

export type NiveauRealisation = "seul" | "avec_aide" | "non_realise" | "nsp";

/** Annexe du CERFA : certificat médical (pages 11 à 13). */
export type CertificatMedical = {
  patient: {
    nomNaissance: string;
    nomUsage?: string;
    prenoms: string;
    dateNaissance: string;
    adresse: Adresse;
  };
  pathologies: string;
  prisesEnCharge: string;
  perspective: "amelioration" | "stabilite" | "aggravation" | "evolutivite_majeure" | "non_definie";
  dureeLimitationsSiAmelioration?: "moins_1_an" | "plus_1_an";
  perimetreMarche: "moins_200m" | "plus_200m";
  stationDeboutPenible: OuiNon;
  protheseMembresInferieurs: OuiNon;
  oxygenotherapie: OuiNon;
  aideHumaine: OuiNon;
  canne: OuiNon;
  deambulateur: OuiNon;
  fauteuilRoulant: OuiNon;
  autreAideTechnique: OuiNon;
  autreAideTechniquePrecision?: string;
  evaluation: {
    transferts: NiveauRealisation;
    deplacementInterieur: NiveauRealisation;
    deplacementExterieur: NiveauRealisation;
    prehension: NiveauRealisation;
    motriciteFine: NiveauRealisation;
    toilette: NiveauRealisation;
    habillage: NiveauRealisation;
    alimentation: NiveauRealisation;
    eliminationUrinaire: NiveauRealisation;
    eliminationFecale: NiveauRealisation;
    orientationTemps: NiveauRealisation;
    orientationEspace: NiveauRealisation;
    securite: NiveauRealisation;
    comportement: NiveauRealisation;
  };
  precisionsMobilite?: string;
  precisionsActes?: string;
  precisionsCognition?: string;
  coherenceReponses: OuiNon;
  scoreMms?: string;
  precisionsCognitionSuite?: string;
  lieu: string;
  /** JJ/MM/AAAA. */
  date: string;
  medecin: {
    nom: string;
    rpps: string;
    ville: string;
  };
};

export type PieceCni = {
  /** Nom tel qu'imprimé sur la carte. */
  nom: string;
  nomUsage?: string;
  prenoms: string;
  sexe: "F" | "M";
  dateNaissance: string;
  lieuNaissance: string;
  taille: string;
  numero: string;
  dateDelivrance: string;
  dateExpiration: string;
  autorite: string;
};

export type PieceRib = {
  banque: string;
  titulaire: string;
  iban: string;
  bic: string;
  domiciliation: string;
};

export type PieceAvisImposition = {
  anneeAvis: number;
  anneeRevenus: number;
  nom: string;
  adresse: Adresse;
  numeroFiscal: string;
  revenuFiscalReference: number;
  nombreParts: number;
  impotNet: number;
  /** Second déclarant éventuel (conjoint). */
  declarant2?: string;
};

export type PieceJugement = {
  tribunal: string;
  date: string;
  mesure: MesureProtection;
  personneProtegee: { nom: string; prenoms: string; dateNaissance: string };
  representant: { nom: string; prenoms: string; organisme: string };
  numeroRg: string;
};

/**
 * Élément composant le PDF du dossier, dans l'ordre de numérisation.
 * "cerfa" copie les pages indiquées (numérotation officielle 1 à 13).
 */
export type ElementDossier =
  | { type: "cerfa"; pages: number[] }
  | { type: "cni" }
  | { type: "rib" }
  | { type: "avis_imposition" }
  | { type: "jugement" };

export type DossierFictif = {
  id: string;
  lotId: string;
  /** JJ/MM/AAAA, date de réception par la collectivité. */
  dateReception: string;
  /** Libellé affiché dans la GED, volontairement approximatif. */
  libelleGed: string;
  formulaire: FormulaireCerfa;
  certificatMedical?: CertificatMedical;
  cni?: PieceCni;
  rib?: PieceRib;
  avisImposition?: PieceAvisImposition;
  jugement?: PieceJugement;
  composition: ElementDossier[];
  /** Ce que la démonstration doit faire ressortir (vérité terrain). */
  scenario: {
    titre: string;
    attendu: string[];
  };
};

export type LotGed = {
  id: string;
  libelle: string;
  /** JJ/MM/AAAA. */
  date: string;
  source: string;
};
