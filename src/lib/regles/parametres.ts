/**
 * Paramètres métier, regroupés pour être validés et ajustés avec les services
 * instructeurs. Tous les seuils de règles et de délais viennent d'ici.
 */
export const PARAMETRES = {
  /** Condition d'âge de l'APA (CERFA 16301*01, notice partie 3). */
  ageMinimumApa: 60,
  /** Nombre minimal de réponses « non » au questionnaire pour relever du département. */
  seuilNonQuestionnaire: 2,
  /** Ancienneté de résidence (mois) en deçà de laquelle le département financeur est à déterminer. */
  moisDomicileDeSecours: 3,
  /** Délai pour accuser réception du dossier ou réclamer les pièces manquantes (jours). */
  joursAccuseReception: 10,
  /** Délai de décision à compter de la date de dossier complet (mois). */
  moisDecision: 2,
  /** Délai laissé à l'usager pour transmettre les pièces réclamées (jours). */
  joursReponsePieces: 30,
  /** Ancienneté maximale d'un certificat médical (mois) avant signalement. */
  moisValiditeCertificat: 3,
} as const;
