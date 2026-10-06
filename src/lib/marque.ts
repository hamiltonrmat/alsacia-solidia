/**
 * Identité de l'outil, utilisée dans l'interface, les métadonnées et les
 * documents produits.
 */
export const MARQUE = {
  nom: "Solid'IA",
  /** Découpage pour la mise en forme du logotype : « Solid » puis « IA ». */
  nomDebut: "Solid'",
  nomFin: "IA",
  accroche: "Le traitement intelligent des dossiers des solidarités",
  collectivite: "Collectivité européenne d'Alsace",
  version: "Prototype v2",
} as const;

/** Signature complète, en une ligne. */
export const SIGNATURE = `${MARQUE.nom} — ${MARQUE.accroche.toLowerCase()} de la ${MARQUE.collectivite}`;
