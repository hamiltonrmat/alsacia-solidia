/**
 * Paramètres métier, regroupés pour être validés et ajustés avec les services
 * instructeurs. Tous les seuils des règles de complétude et de conformité, et
 * les délais affichés, viennent d'ici.
 *
 * Les critères d'appréciation du droit (âge, organisme compétent, domicile de
 * secours, non-cumul) ne figurent plus ici : ils relèvent de l'instruction
 * dans Solis.
 */
export const PARAMETRES = {
  /** Délai pour accuser réception du dossier ou réclamer les pièces manquantes (jours). */
  joursAccuseReception: 10,
  /** Ancienneté maximale d'un certificat médical (mois) avant signalement. */
  moisValiditeCertificat: 3,
  /** Ancienneté maximale de l'avis d'imposition (années entre les revenus et la réception). */
  anneesAvisImposition: 2,
  /** Prolongation légale des CNI délivrées à des majeurs entre 2004 et 2013 (années). */
  anneesProlongationCni: 5,
  /** Seuils de lecture des scores de confiance et de l'indice de robustesse (0 à 1). */
  seuilConfianceSure: 0.8,
  seuilConfianceDouteuse: 0.5,
} as const;

/** Description de chaque paramètre, pour la page des règles métier. */
export const DESCRIPTION_PARAMETRES: Array<{ cle: keyof typeof PARAMETRES; libelle: string; valeur: string; usage: string }> = [
  {
    cle: "joursAccuseReception",
    libelle: "Délai d'accusé de réception",
    valeur: `${PARAMETRES.joursAccuseReception} jours`,
    usage: "Date limite affichée à l'étape « Complétude et conformité » et dans le rapport ; l'accusé de réception ou la demande de pièces est émis depuis Solis.",
  },
  {
    cle: "moisValiditeCertificat",
    libelle: "Ancienneté maximale du certificat médical",
    valeur: `${PARAMETRES.moisValiditeCertificat} mois`,
    usage: "Règle « Date du certificat médical ».",
  },
  {
    cle: "anneesAvisImposition",
    libelle: "Ancienneté maximale de l'avis d'imposition",
    valeur: `${PARAMETRES.anneesAvisImposition} ans`,
    usage: "Règle « Année de l'avis d'imposition » : écart entre l'année des revenus et l'année de réception.",
  },
  {
    cle: "anneesProlongationCni",
    libelle: "Prolongation légale des cartes d'identité",
    valeur: `${PARAMETRES.anneesProlongationCni} ans`,
    usage: "Règle « Validité de la pièce d'identité », pour les cartes délivrées à des majeurs entre 2004 et 2013.",
  },
  {
    cle: "seuilConfianceSure",
    libelle: "Seuil de lecture sûre",
    valeur: `${Math.round(PARAMETRES.seuilConfianceSure * 100)} %`,
    usage: "Au-delà, un score de confiance est affiché en vert et l'indice de robustesse est « bon ».",
  },
  {
    cle: "seuilConfianceDouteuse",
    libelle: "Seuil de lecture douteuse",
    valeur: `${Math.round(PARAMETRES.seuilConfianceDouteuse * 100)} %`,
    usage: "En deçà, une lecture est douteuse (rouge), un champ vide est « non lu » et l'indice de robustesse est « faible ».",
  },
];
