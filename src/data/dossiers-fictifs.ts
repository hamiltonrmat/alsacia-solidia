import { ibanFr, nirAvecCle } from "@/lib/identifiants";
import type { Adresse, DossierFictif, LotGed } from "./types";

/**
 * Jeu de dossiers fictifs de démonstration.
 *
 * Chaque dossier décrit un usager inventé, le contenu de son CERFA, ses
 * pièces jointes et ce que la démonstration doit faire ressortir. Le script
 * scripts/generer-dossiers.ts produit les PDF correspondants dans public/ged/.
 *
 * Aucune de ces personnes n'existe. Les NIR et IBAN sont construits pour avoir
 * une clé de contrôle valide, mais ne correspondent à personne.
 */

export const LOTS_GED: LotGed[] = [
  {
    id: "lot-2345",
    libelle: "Lot #2345",
    date: "28/08/2026",
    source: "Scanner — Hôtel du Département",
  },
  {
    id: "lot-2347",
    libelle: "Lot #2347",
    date: "01/09/2026",
    source: "Scanner — Espace Autonomie Strasbourg",
  },
  {
    id: "lot-2351",
    libelle: "Lot #2351",
    date: "03/09/2026",
    source: "Courrier entrant — Antenne de Sélestat",
  },
];

const BANQUE = {
  nom: "Banque Rhénane Mutuelle",
  bic: "BRMUFR2S",
  code: "16789",
};

const adresse = (voie: string, codePostal: string, commune: string, extra: Partial<Adresse> = {}): Adresse => ({
  voie,
  codePostal,
  commune,
  ...extra,
});

const PATHOLOGIES_PARKINSON =
  "Maladie de Parkinson évoluée (diagnostic 2015) avec troubles de l'équilibre et chutes répétées (3 chutes en 6 mois). Gonarthrose bilatérale. Ralentissement psychomoteur, fatigabilité importante. Troubles de la marche avec freezing.";

const PATHOLOGIES_SEP =
  "Sclérose en plaques de forme secondairement progressive (diagnostic 2001). Paraparésie spastique, troubles vésico-sphinctériens, fatigue chronique. Périmètre de marche très réduit.";

const PATHOLOGIES_ALZHEIMER =
  "Maladie d'Alzheimer à un stade sévère (diagnostic 2019). Désorientation temporo-spatiale permanente, troubles du comportement avec déambulation nocturne, dénutrition (perte de 6 kg en un an). Incontinence urinaire. Antécédent d'AVC ischémique en 2021 avec hémiparésie droite séquellaire.";

const PATHOLOGIES_CARDIO =
  "Insuffisance cardiaque chronique (FEVG 35 %), BPCO stade III sous oxygénothérapie de déambulation, coxarthrose gauche invalidante. Dyspnée au moindre effort.";

const nirDupont = nirAvecCle("1480767482123");
const nirLeroy = nirAvecCle("2430268066045");
const nirLeroyConjoint = nirAvecCle("1400968224112");
const nirMartin = nirAvecCle("1671168224233");
const nirBernard = nirAvecCle("2510567462078");
const nirMoreau = nirAvecCle("1390967348019");
const nirGarnier = nirAvecCle("2460367180301");
const nirPetitConjoint = nirAvecCle("1441267180088");

export const DOSSIERS_FICTIFS: DossierFictif[] = [
  // ---------------------------------------------------------------------------
  // 1. Dossier complet et conforme, usager déjà connu de Solis
  // ---------------------------------------------------------------------------
  {
    id: "D-2026-0301",
    lotId: "lot-2347",
    dateReception: "01/09/2026",
    libelleGed: "Demande APA — usager présumé « DUPONT »",
    formulaire: {
      demandeur: {
        civilite: "Monsieur",
        nomNaissance: "DUPONT",
        prenoms: "Jean",
        dateNaissance: "12/07/1948",
        communeNaissance: "Strasbourg",
        departementNaissance: "67",
        paysNaissance: "France",
        nir: nirDupont,
      },
      caisseRetraite: "assurance_retraite",
      telephone: "0388123456",
      email: "jean.dupont@exemple.fr",
      typeDomicile: "domicile",
      adresse: adresse("12 rue de la Paix", "67000", "Strasbourg", { etage: "2e" }),
      situationFamiliale: "veuf",
      protection: { statut: "aucune" },
      proche: {
        civilite: "Madame",
        nom: "DUPONT",
        prenoms: "Claire",
        adresse: adresse("8 avenue des Vosges", "67000", "Strasbourg"),
        telephone: "0612345678",
        email: "claire.dupont@exemple.fr",
        lien: "enfant",
      },
      questionnaire: { seLever: "oui", sHabiller: "non", faireSaToilette: "non", manger: "non" },
      prestations: { actp: "non", aideSocialeDepartementale: "non", mtp: "non", pch: "non", pcrtp: "non" },
      ressources: {
        residencePrincipale: {
          adresse: adresse("12 rue de la Paix", "67000", "Strasbourg"),
          statut: "proprietaire",
          occupation: "occupee",
        },
        autresBiens: [],
        biensMobiliers: [],
      },
      cmi: { stationnement: "oui", prioriteOuInvalidite: "non", renouvellement: "non" },
      signature: {
        civilite: "Monsieur",
        nom: "DUPONT",
        prenoms: "Jean",
        qualite: "en_mon_nom",
        lieu: "Strasbourg",
        date: "28/08/2026",
      },
    },
    certificatMedical: {
      patient: {
        nomNaissance: "DUPONT",
        prenoms: "Jean",
        dateNaissance: "12/07/1948",
        adresse: adresse("12 rue de la Paix", "67000", "Strasbourg"),
      },
      pathologies: PATHOLOGIES_PARKINSON,
      prisesEnCharge:
        "Traitement dopaminergique (lévodopa) en 5 prises quotidiennes. Kinésithérapie 3 fois par semaine à domicile. Suivi neurologique semestriel au CHU.",
      perspective: "aggravation",
      perimetreMarche: "moins_200m",
      stationDeboutPenible: "oui",
      protheseMembresInferieurs: "non",
      oxygenotherapie: "non",
      aideHumaine: "oui",
      canne: "oui",
      deambulateur: "oui",
      fauteuilRoulant: "non",
      autreAideTechnique: "non",
      evaluation: {
        transferts: "avec_aide",
        deplacementInterieur: "avec_aide",
        deplacementExterieur: "non_realise",
        prehension: "seul",
        motriciteFine: "avec_aide",
        toilette: "avec_aide",
        habillage: "avec_aide",
        alimentation: "seul",
        eliminationUrinaire: "seul",
        eliminationFecale: "seul",
        orientationTemps: "seul",
        orientationEspace: "seul",
        securite: "avec_aide",
        comportement: "seul",
      },
      precisionsMobilite: "Transferts possibles avec aide d'une personne. Ne sort plus seul depuis les chutes.",
      precisionsActes: "Aide quotidienne pour la toilette et l'habillage du haut et du bas.",
      coherenceReponses: "oui",
      scoreMms: "26/30",
      lieu: "Strasbourg",
      date: "20/08/2026",
      medecin: { nom: "Dr Anne KELLER", rpps: "10001234567", ville: "Strasbourg" },
    },
    cni: {
      nom: "DUPONT",
      prenoms: "Jean",
      sexe: "M",
      dateNaissance: "12/07/1948",
      lieuNaissance: "STRASBOURG (67)",
      taille: "1,74 m",
      numero: "670319004512",
      dateDelivrance: "15/03/2019",
      dateExpiration: "14/03/2034",
      autorite: "Préfecture du Bas-Rhin",
    },
    rib: {
      banque: BANQUE.nom,
      titulaire: "M. JEAN DUPONT",
      iban: ibanFr(BANQUE.code, "67001", "00012345678"),
      bic: BANQUE.bic,
      domiciliation: "Agence Strasbourg Cathédrale",
    },
    avisImposition: {
      anneeAvis: 2025,
      anneeRevenus: 2024,
      nom: "DUPONT JEAN",
      adresse: adresse("12 rue de la Paix", "67000", "Strasbourg"),
      numeroFiscal: "1234567890123",
      revenuFiscalReference: 18450,
      nombreParts: 1,
      impotNet: 0,
    },
    composition: [
      { type: "cerfa", pages: [5, 6, 7, 8, 9, 11, 12, 13] },
      { type: "cni" },
      { type: "rib" },
      { type: "avis_imposition" },
    ],
    scenario: {
      titre: "Dossier complet et conforme, usager déjà connu",
      attendu: [
        "Découpage : CERFA (5 pages), certificat médical (3 pages), CNI, RIB, avis d'imposition.",
        "Conformité : toutes les pièces obligatoires présentes et cohérentes entre elles.",
        "Décision : 78 ans, 3 réponses « non » au questionnaire → APA relevant du département, instruction.",
        "Rapprochement : usager connu de Solis par son NIR (APA 2019) ; un homonyme Jean-Pierre DUPONT apparaît et ne doit pas être confondu.",
        "Enregistrement : la nouvelle demande est rattachée à l'usager existant.",
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 2. RIB manquant, demande d'une personne mariée
  // ---------------------------------------------------------------------------
  {
    id: "D-2026-0302",
    lotId: "lot-2347",
    dateReception: "01/09/2026",
    libelleGed: "Demande APA — usager présumé « LEROY »",
    formulaire: {
      demandeur: {
        civilite: "Madame",
        nomNaissance: "MEYER",
        nomUsage: "LEROY",
        prenoms: "Marie",
        dateNaissance: "03/02/1943",
        communeNaissance: "Colmar",
        departementNaissance: "68",
        paysNaissance: "France",
        nir: nirLeroy,
      },
      caisseRetraite: "msa",
      telephone: "0389456789",
      typeDomicile: "domicile",
      adresse: adresse("5 rue des Vignes", "68000", "Colmar"),
      situationFamiliale: "marie",
      conjoint: {
        civilite: "Monsieur",
        nomNaissance: "LEROY",
        prenoms: "Robert",
        dateNaissance: "22/09/1940",
        communeNaissance: "Mulhouse",
        departementNaissance: "68",
        paysNaissance: "France",
        nir: nirLeroyConjoint,
        domicile: "identique",
      },
      protection: { statut: "aucune" },
      proche: {
        civilite: "Monsieur",
        nom: "LEROY",
        prenoms: "Robert",
        adresse: adresse("5 rue des Vignes", "68000", "Colmar"),
        telephone: "0389456789",
        lien: "conjoint",
      },
      questionnaire: { seLever: "non", sHabiller: "non", faireSaToilette: "non", manger: "oui" },
      prestations: { actp: "non", aideSocialeDepartementale: "non", mtp: "non", pch: "non", pcrtp: "non" },
      ressources: {
        residencePrincipale: {
          adresse: adresse("5 rue des Vignes", "68000", "Colmar"),
          statut: "proprietaire",
          occupation: "occupee",
        },
        autresBiens: [],
        biensMobiliers: [],
      },
      cmi: { stationnement: "non", prioriteOuInvalidite: "non", renouvellement: "non" },
      signature: {
        civilite: "Madame",
        nom: "LEROY",
        prenoms: "Marie",
        qualite: "en_mon_nom",
        lieu: "Colmar",
        date: "02/09/2026",
      },
    },
    cni: {
      nom: "MEYER",
      nomUsage: "LEROY",
      prenoms: "Marie",
      sexe: "F",
      dateNaissance: "03/02/1943",
      lieuNaissance: "COLMAR (68)",
      taille: "1,60 m",
      numero: "680621007731",
      dateDelivrance: "10/06/2021",
      dateExpiration: "09/06/2031",
      autorite: "Préfecture du Haut-Rhin",
    },
    avisImposition: {
      anneeAvis: 2025,
      anneeRevenus: 2024,
      nom: "LEROY ROBERT",
      declarant2: "LEROY MARIE née MEYER",
      adresse: adresse("5 rue des Vignes", "68000", "Colmar"),
      numeroFiscal: "2345678901234",
      revenuFiscalReference: 24300,
      nombreParts: 2,
      impotNet: 0,
    },
    composition: [{ type: "cerfa", pages: [5, 6, 7, 8, 9] }, { type: "cni" }, { type: "avis_imposition" }],
    scenario: {
      titre: "RIB manquant, demande d'une personne mariée",
      attendu: [
        "Conformité : RIB absent → dossier non recevable, courrier de demande de pièce.",
        "Certificat médical absent : facultatif, simple information.",
        "Ressources du conjoint à prendre en compte (avis d'imposition commun, 2 parts).",
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Demandeur de 58 ans, PCH déjà perçue
  // ---------------------------------------------------------------------------
  {
    id: "D-2026-0303",
    lotId: "lot-2347",
    dateReception: "02/09/2026",
    libelleGed: "Demande APA — usager présumé « MARTIN »",
    formulaire: {
      demandeur: {
        civilite: "Monsieur",
        nomNaissance: "MARTIN",
        prenoms: "Paul",
        dateNaissance: "21/11/1967",
        communeNaissance: "Mulhouse",
        departementNaissance: "68",
        paysNaissance: "France",
        nir: nirMartin,
      },
      caisseRetraite: "assurance_retraite",
      telephone: "0389112233",
      email: "p.martin@exemple.fr",
      typeDomicile: "domicile",
      adresse: adresse("27 rue de Bâle", "68100", "Mulhouse", { batiment: "B", etage: "RDC" }),
      situationFamiliale: "celibataire",
      protection: { statut: "aucune" },
      proche: {
        civilite: "Monsieur",
        nom: "BENALI",
        prenoms: "Karim",
        adresse: adresse("3 rue du Sauvage", "68100", "Mulhouse"),
        telephone: "0698765432",
        lien: "ami",
      },
      questionnaire: { seLever: "oui", sHabiller: "non", faireSaToilette: "non", manger: "oui" },
      prestations: { actp: "non", aideSocialeDepartementale: "non", mtp: "non", pch: "oui", pcrtp: "non" },
      ressources: {
        residencePrincipale: {
          adresse: adresse("27 rue de Bâle", "68100", "Mulhouse"),
          statut: "locataire",
        },
        autresBiens: [],
        biensMobiliers: [],
      },
      cmi: { stationnement: "oui", prioriteOuInvalidite: "non", renouvellement: "non" },
      signature: {
        civilite: "Monsieur",
        nom: "MARTIN",
        prenoms: "Paul",
        qualite: "en_mon_nom",
        lieu: "Mulhouse",
        date: "30/08/2026",
      },
    },
    certificatMedical: {
      patient: {
        nomNaissance: "MARTIN",
        prenoms: "Paul",
        dateNaissance: "21/11/1967",
        adresse: adresse("27 rue de Bâle", "68100", "Mulhouse"),
      },
      pathologies: PATHOLOGIES_SEP,
      prisesEnCharge: "Traitement de fond immunomodulateur mensuel en hôpital de jour. Kinésithérapie bihebdomadaire. Autosondages.",
      perspective: "aggravation",
      perimetreMarche: "moins_200m",
      stationDeboutPenible: "oui",
      protheseMembresInferieurs: "non",
      oxygenotherapie: "non",
      aideHumaine: "non",
      canne: "non",
      deambulateur: "non",
      fauteuilRoulant: "oui",
      autreAideTechnique: "non",
      evaluation: {
        transferts: "avec_aide",
        deplacementInterieur: "seul",
        deplacementExterieur: "avec_aide",
        prehension: "seul",
        motriciteFine: "seul",
        toilette: "avec_aide",
        habillage: "avec_aide",
        alimentation: "seul",
        eliminationUrinaire: "avec_aide",
        eliminationFecale: "seul",
        orientationTemps: "seul",
        orientationEspace: "seul",
        securite: "seul",
        comportement: "seul",
      },
      precisionsMobilite: "Déplacements intérieurs en fauteuil roulant manuel.",
      coherenceReponses: "oui",
      lieu: "Mulhouse",
      date: "25/08/2026",
      medecin: { nom: "Dr Thomas RIEGEL", rpps: "10007654321", ville: "Mulhouse" },
    },
    cni: {
      nom: "MARTIN",
      prenoms: "Paul",
      sexe: "M",
      dateNaissance: "21/11/1967",
      lieuNaissance: "MULHOUSE (68)",
      taille: "1,80 m",
      numero: "680522009104",
      dateDelivrance: "05/05/2022",
      dateExpiration: "04/05/2032",
      autorite: "Préfecture du Haut-Rhin",
    },
    rib: {
      banque: BANQUE.nom,
      titulaire: "M. PAUL MARTIN",
      iban: ibanFr(BANQUE.code, "68002", "00098765432"),
      bic: BANQUE.bic,
      domiciliation: "Agence Mulhouse Centre",
    },
    avisImposition: {
      anneeAvis: 2025,
      anneeRevenus: 2024,
      nom: "MARTIN PAUL",
      adresse: adresse("27 rue de Bâle", "68100", "Mulhouse"),
      numeroFiscal: "3456789012345",
      revenuFiscalReference: 15200,
      nombreParts: 1,
      impotNet: 0,
    },
    composition: [
      { type: "cerfa", pages: [5, 6, 7, 8, 9, 11, 12, 13] },
      { type: "cni" },
      { type: "rib" },
      { type: "avis_imposition" },
    ],
    scenario: {
      titre: "Demandeur de 58 ans, PCH déjà perçue",
      attendu: [
        "Décision : condition d'âge (60 ans) non remplie → orientation vers la MDPH (PCH).",
        "Information : PCH déjà perçue, non cumulable avec l'APA.",
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 4. Dossier scanné avec la notice, orientation vers la caisse de retraite
  // ---------------------------------------------------------------------------
  {
    id: "D-2026-0304",
    lotId: "lot-2351",
    dateReception: "03/09/2026",
    libelleGed: "Demande autonomie — 16 pages — usager non identifié",
    formulaire: {
      demandeur: {
        civilite: "Madame",
        nomNaissance: "BERNARD",
        prenoms: "Simone",
        dateNaissance: "30/05/1951",
        communeNaissance: "Sélestat",
        departementNaissance: "67",
        paysNaissance: "France",
        nir: nirBernard,
      },
      caisseRetraite: "fonction_publique",
      telephone: "0388920011",
      typeDomicile: "domicile",
      adresse: adresse("3 place du Marché", "67600", "Sélestat"),
      situationFamiliale: "veuf",
      protection: { statut: "aucune" },
      proche: {
        civilite: "Monsieur",
        nom: "HOFFMANN",
        prenoms: "Michel",
        adresse: adresse("5 place du Marché", "67600", "Sélestat"),
        telephone: "0388920022",
        lien: "voisin",
      },
      questionnaire: { seLever: "oui", sHabiller: "oui", faireSaToilette: "oui", manger: "oui" },
      prestations: { actp: "non", aideSocialeDepartementale: "non", mtp: "non", pch: "non", pcrtp: "non" },
      ressources: {
        residencePrincipale: {
          adresse: adresse("3 place du Marché", "67600", "Sélestat"),
          statut: "proprietaire",
          occupation: "occupee",
        },
        autresBiens: [adresse("14 rue Principale", "67600", "Sélestat")],
        biensMobiliers: [],
      },
      cmi: { stationnement: "non", prioriteOuInvalidite: "non", renouvellement: "non" },
      signature: {
        civilite: "Madame",
        nom: "BERNARD",
        prenoms: "Simone",
        qualite: "en_mon_nom",
        lieu: "Sélestat",
        date: "01/09/2026",
      },
    },
    cni: {
      nom: "BERNARD",
      prenoms: "Simone",
      sexe: "F",
      dateNaissance: "30/05/1951",
      lieuNaissance: "SÉLESTAT (67)",
      taille: "1,65 m",
      numero: "670115002287",
      dateDelivrance: "12/01/2015",
      dateExpiration: "11/01/2030",
      autorite: "Préfecture du Bas-Rhin",
    },
    rib: {
      banque: BANQUE.nom,
      titulaire: "MME SIMONE BERNARD",
      iban: ibanFr(BANQUE.code, "67003", "00055566677"),
      bic: BANQUE.bic,
      domiciliation: "Agence Sélestat",
    },
    avisImposition: {
      anneeAvis: 2025,
      anneeRevenus: 2024,
      nom: "BERNARD SIMONE",
      adresse: adresse("3 place du Marché", "67600", "Sélestat"),
      numeroFiscal: "4567890123456",
      revenuFiscalReference: 21800,
      nombreParts: 1,
      impotNet: 412,
    },
    composition: [
      { type: "cerfa", pages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
      { type: "cni" },
      { type: "rib" },
      { type: "avis_imposition" },
    ],
    scenario: {
      titre: "Dossier scanné avec la notice, orientation caisse de retraite",
      attendu: [
        "Découpage : pages de notice (1 à 4), mentions RGPD (10) et certificat médical vierge (11 à 13) détectés et écartés.",
        "Décision : 4 réponses « oui » au questionnaire → organisme compétent = caisse de retraite (Fonction publique d'État), pas l'APA.",
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 5. Usager sous tutelle, jugement non joint, pièces dans le désordre
  // ---------------------------------------------------------------------------
  {
    id: "D-2026-0305",
    lotId: "lot-2351",
    dateReception: "03/09/2026",
    libelleGed: "Demande APA — usager présumé « MOREAU » (tutelle)",
    formulaire: {
      demandeur: {
        civilite: "Monsieur",
        nomNaissance: "MOREAU",
        prenoms: "Robert",
        dateNaissance: "08/09/1939",
        communeNaissance: "Obernai",
        departementNaissance: "67",
        paysNaissance: "France",
        nir: nirMoreau,
      },
      caisseRetraite: "assurance_retraite",
      telephone: "0388950044",
      typeDomicile: "domicile_famille",
      adresse: adresse("9 rue du Général Leclerc", "67210", "Obernai", { etage: "1er" }),
      situationFamiliale: "veuf",
      protection: {
        statut: "prononcee",
        mesure: "tutelle",
        organisme: {
          nom: "Association Tutélaire d'Alsace (ATA)",
          civilite: "Madame",
          nom_contact: "WEBER",
          prenoms: "Sophie",
          adresse: adresse("19 rue de Rome", "67000", "Strasbourg"),
          telephone: "0388601010",
          email: "s.weber@ata-exemple.fr",
        },
      },
      proche: {
        civilite: "Madame",
        nom: "MOREAU",
        prenoms: "Isabelle",
        adresse: adresse("9 rue du Général Leclerc", "67210", "Obernai"),
        telephone: "0677889900",
        lien: "enfant",
      },
      questionnaire: { seLever: "non", sHabiller: "non", faireSaToilette: "non", manger: "non" },
      prestations: { actp: "non", aideSocialeDepartementale: "non", mtp: "non", pch: "non", pcrtp: "non" },
      ressources: {
        residencePrincipale: {
          adresse: adresse("22 rue des Remparts", "67210", "Obernai"),
          statut: "proprietaire",
          occupation: "non_louee",
        },
        autresBiens: [],
        biensMobiliers: [],
      },
      cmi: { stationnement: "oui", prioriteOuInvalidite: "oui", renouvellement: "non" },
      signature: {
        civilite: "Madame",
        nom: "WEBER",
        prenoms: "Sophie",
        qualite: "representant_legal",
        representeDe: "M. Robert MOREAU",
        lieu: "Strasbourg",
        date: "28/08/2026",
      },
    },
    certificatMedical: {
      patient: {
        nomNaissance: "MOREAU",
        prenoms: "Robert",
        dateNaissance: "08/09/1939",
        adresse: adresse("9 rue du Général Leclerc", "67210", "Obernai"),
      },
      pathologies: PATHOLOGIES_ALZHEIMER,
      prisesEnCharge: "Suivi en consultation mémoire. Passage infirmier biquotidien. Compléments nutritionnels oraux.",
      perspective: "aggravation",
      perimetreMarche: "moins_200m",
      stationDeboutPenible: "oui",
      protheseMembresInferieurs: "non",
      oxygenotherapie: "non",
      aideHumaine: "oui",
      canne: "non",
      deambulateur: "oui",
      fauteuilRoulant: "oui",
      autreAideTechnique: "oui",
      autreAideTechniquePrecision: "Lit médicalisé, lève-personne",
      evaluation: {
        transferts: "avec_aide",
        deplacementInterieur: "avec_aide",
        deplacementExterieur: "non_realise",
        prehension: "avec_aide",
        motriciteFine: "non_realise",
        toilette: "non_realise",
        habillage: "non_realise",
        alimentation: "avec_aide",
        eliminationUrinaire: "non_realise",
        eliminationFecale: "avec_aide",
        orientationTemps: "non_realise",
        orientationEspace: "non_realise",
        securite: "non_realise",
        comportement: "avec_aide",
      },
      precisionsCognition: "Troubles cognitifs majeurs. Surveillance permanente nécessaire.",
      coherenceReponses: "non",
      scoreMms: "9/30",
      lieu: "Obernai",
      date: "18/08/2026",
      medecin: { nom: "Dr Nadia HAMMOUD", rpps: "10002468135", ville: "Obernai" },
    },
    cni: {
      nom: "MOREAU",
      prenoms: "Robert",
      sexe: "M",
      dateNaissance: "08/09/1939",
      lieuNaissance: "OBERNAI (67)",
      taille: "1,70 m",
      numero: "670218001955",
      dateDelivrance: "20/02/2018",
      dateExpiration: "19/02/2033",
      autorite: "Préfecture du Bas-Rhin",
    },
    rib: {
      banque: BANQUE.nom,
      titulaire: "M. ROBERT MOREAU",
      iban: ibanFr(BANQUE.code, "67004", "00011122233"),
      bic: BANQUE.bic,
      domiciliation: "Agence Obernai",
    },
    avisImposition: {
      anneeAvis: 2025,
      anneeRevenus: 2024,
      nom: "MOREAU ROBERT",
      adresse: adresse("9 rue du Général Leclerc", "67210", "Obernai"),
      numeroFiscal: "5678901234567",
      revenuFiscalReference: 26900,
      nombreParts: 1,
      impotNet: 1130,
    },
    composition: [
      { type: "cni" },
      { type: "cerfa", pages: [5, 6, 7, 8, 9] },
      { type: "rib" },
      { type: "avis_imposition" },
      { type: "cerfa", pages: [11, 12, 13] },
    ],
    scenario: {
      titre: "Usager sous tutelle, jugement non joint, pièces dans le désordre",
      attendu: [
        "Découpage : la CNI arrive en première page, le certificat médical en dernier.",
        "Signature par le représentant légal (tutrice), mesure de tutelle déclarée.",
        "Conformité : décision de justice de mise sous protection absente → pièce à réclamer.",
        "Résidence principale non louée → avis de taxe foncière attendu, à vérifier.",
        "Rapprochement : une demande APA est déjà en cours dans Solis, déposée par l'organisme tutélaire → rattacher, ne pas créer de doublon.",
        "Pré-instruction : 86 ans, 4 « non » → relève du département ; mise en attente de pièces.",
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // 6. CNI expirée, date de naissance incohérente, déménagement récent
  // ---------------------------------------------------------------------------
  {
    id: "D-2026-0306",
    lotId: "lot-2351",
    dateReception: "03/09/2026",
    libelleGed: "Demande APA — usager présumé « PETIT »",
    formulaire: {
      demandeur: {
        civilite: "Madame",
        nomNaissance: "GARNIER",
        nomUsage: "PETIT",
        prenoms: "Hélène",
        // Erreur volontaire de l'usager : la CNI indique le 17/03/1946.
        dateNaissance: "17/08/1946",
        communeNaissance: "Haguenau",
        departementNaissance: "67",
        paysNaissance: "France",
        nir: nirGarnier,
      },
      caisseRetraite: "assurance_retraite",
      telephone: "0388731122",
      email: "helene.petit@exemple.fr",
      typeDomicile: "domicile",
      adresse: adresse("41 route de Strasbourg", "67500", "Haguenau"),
      ancienneResidence: {
        adresse: adresse("15 rue des Roses", "57000", "Metz"),
        dateArrivee: "20/07/2026",
      },
      situationFamiliale: "marie",
      conjoint: {
        civilite: "Monsieur",
        nomNaissance: "PETIT",
        prenoms: "Bernard",
        dateNaissance: "02/12/1944",
        communeNaissance: "Haguenau",
        departementNaissance: "67",
        paysNaissance: "France",
        nir: nirPetitConjoint,
        domicile: "identique",
      },
      protection: { statut: "aucune" },
      proche: {
        civilite: "Monsieur",
        nom: "PETIT",
        prenoms: "Laurent",
        adresse: adresse("2 rue Serpenoise", "57000", "Metz"),
        telephone: "0655443322",
        lien: "enfant",
      },
      questionnaire: { seLever: "non", sHabiller: "non", faireSaToilette: "non", manger: "oui" },
      prestations: { actp: "non", aideSocialeDepartementale: "non", mtp: "non", pch: "non", pcrtp: "non" },
      ressources: {
        residencePrincipale: {
          adresse: adresse("41 route de Strasbourg", "67500", "Haguenau"),
          statut: "locataire",
        },
        autresBiens: [],
        biensMobiliers: [],
      },
      cmi: { stationnement: "non", prioriteOuInvalidite: "non", renouvellement: "non" },
      signature: {
        civilite: "Madame",
        nom: "PETIT",
        prenoms: "Hélène",
        qualite: "en_mon_nom",
        lieu: "Haguenau",
        date: "29/08/2026",
      },
    },
    certificatMedical: {
      patient: {
        nomNaissance: "GARNIER",
        nomUsage: "PETIT",
        prenoms: "Hélène",
        dateNaissance: "17/03/1946",
        adresse: adresse("41 route de Strasbourg", "67500", "Haguenau"),
      },
      pathologies: PATHOLOGIES_CARDIO,
      prisesEnCharge: "Oxygénothérapie de déambulation. Réhabilitation respiratoire. Diurétiques et bêtabloquants.",
      perspective: "stabilite",
      perimetreMarche: "moins_200m",
      stationDeboutPenible: "oui",
      protheseMembresInferieurs: "non",
      oxygenotherapie: "oui",
      aideHumaine: "oui",
      canne: "oui",
      deambulateur: "non",
      fauteuilRoulant: "non",
      autreAideTechnique: "non",
      evaluation: {
        transferts: "avec_aide",
        deplacementInterieur: "seul",
        deplacementExterieur: "avec_aide",
        prehension: "seul",
        motriciteFine: "seul",
        toilette: "avec_aide",
        habillage: "avec_aide",
        alimentation: "seul",
        eliminationUrinaire: "seul",
        eliminationFecale: "seul",
        orientationTemps: "seul",
        orientationEspace: "seul",
        securite: "seul",
        comportement: "seul",
      },
      coherenceReponses: "oui",
      scoreMms: "28/30",
      lieu: "Haguenau",
      date: "26/08/2026",
      medecin: { nom: "Dr Luc BAUMANN", rpps: "10009876543", ville: "Haguenau" },
    },
    cni: {
      nom: "GARNIER",
      nomUsage: "PETIT",
      prenoms: "Hélène",
      sexe: "F",
      dateNaissance: "17/03/1946",
      lieuNaissance: "HAGUENAU (67)",
      taille: "1,62 m",
      numero: "570210004410",
      dateDelivrance: "10/02/2010",
      dateExpiration: "09/02/2020",
      autorite: "Préfecture de la Moselle",
    },
    rib: {
      banque: BANQUE.nom,
      titulaire: "MME HELENE PETIT",
      iban: ibanFr(BANQUE.code, "67005", "00044455566"),
      bic: BANQUE.bic,
      domiciliation: "Agence Haguenau",
    },
    avisImposition: {
      anneeAvis: 2025,
      anneeRevenus: 2024,
      nom: "PETIT BERNARD",
      declarant2: "PETIT HELENE née GARNIER",
      adresse: adresse("15 rue des Roses", "57000", "Metz"),
      numeroFiscal: "6789012345678",
      revenuFiscalReference: 31200,
      nombreParts: 2,
      impotNet: 640,
    },
    composition: [
      { type: "cerfa", pages: [5, 6, 7, 8, 9] },
      { type: "cni" },
      { type: "rib" },
      { type: "avis_imposition" },
      { type: "cerfa", pages: [11, 12, 13] },
    ],
    scenario: {
      titre: "CNI expirée, date de naissance incohérente, déménagement récent",
      attendu: [
        "Conformité : CNI expirée (2020, prolongation de 5 ans jusqu'en 2025) → alerte.",
        "Conformité : date de naissance du CERFA (17/08/1946) différente de la CNI et du certificat médical (17/03/1946) → à vérifier par l'agent.",
        "Décision : arrivée à l'adresse actuelle depuis moins de 3 mois, ancien domicile en Moselle → département financeur à déterminer.",
      ],
    },
  },
];

export function trouverDossierFictif(id: string): DossierFictif | undefined {
  return DOSSIERS_FICTIFS.find((d) => d.id === id);
}

export function dossiersDuLot(lotId: string): DossierFictif[] {
  return DOSSIERS_FICTIFS.filter((d) => d.lotId === lotId);
}

/** Chemin public du PDF généré pour un dossier. */
export function cheminPdfDossier(dossier: Pick<DossierFictif, "id" | "lotId">): string {
  return `/ged/${dossier.lotId}/${dossier.id}.pdf`;
}
