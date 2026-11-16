/**
 * Identité de l'outil, utilisée dans l'interface, les métadonnées et les
 * documents produits.
 */
export const MARQUE = {
  nom: "Solid'IA",
  /** Logotype complet (pictogramme, nom et signature), fond transparent, 900 × 305. */
  logo: "/solidia-logo.png",
  accroche: "Le traitement intelligent des dossiers des solidarités",
  collectivite: "Collectivité européenne d'Alsace",
  /**
   * Version 3 (16/11/2026) : traitement de la GED à Solis sans appréciation
   * du droit, moteur de règles métier consultable, rapport de contrôle.
   * Version 2 : Next.js, OCR et pré-instruction. Version 1 : maquette statique.
   */
  version: "Prototype v3",
  versionCourte: "v3",
} as const;

/** Signature complète, en une ligne. */
export const SIGNATURE = `${MARQUE.nom} — ${MARQUE.accroche.toLowerCase()} de la ${MARQUE.collectivite}`;
