/**
 * Statuts métier d'un dossier de demande, partagés entre le poste de travail,
 * les règles et le logiciel métier simulé.
 */

export type StatutDossier =
  | "recu"
  | "en_cours"
  | "en_attente_pieces"
  | "transmis_ems"
  | "transmis_caisse"
  | "oriente_mdph"
  | "clos";

export const LIBELLES_STATUT: Record<StatutDossier, string> = {
  recu: "Reçu, à traiter",
  en_cours: "En cours de pré-instruction",
  en_attente_pieces: "En attente de pièces",
  transmis_ems: "Transmis à l'équipe médico-sociale",
  transmis_caisse: "Transmis à la caisse de retraite",
  oriente_mdph: "Orienté vers la MDPH",
  clos: "Clos",
};

export const TEINTES_STATUT: Record<StatutDossier, "neutre" | "primaire" | "succes" | "attention" | "danger" | "info"> = {
  recu: "neutre",
  en_cours: "primaire",
  en_attente_pieces: "attention",
  transmis_ems: "succes",
  transmis_caisse: "info",
  oriente_mdph: "info",
  clos: "neutre",
};
