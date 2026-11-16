/**
 * Statuts métier d'un dossier, partagés entre le poste de travail, le rapport
 * de contrôle et le logiciel métier simulé.
 *
 * Solid'IA n'apprécie pas le droit à la prestation : tout dossier contrôlé est
 * transmis à Solis, complet ou non. Le statut final dit seulement si la date
 * de dossier complet a pu être fixée.
 */

export type StatutDossier = "recu" | "en_cours" | "transmis_complet" | "transmis_incomplet";

export const LIBELLES_STATUT: Record<StatutDossier, string> = {
  recu: "Reçu, à traiter",
  en_cours: "En cours de contrôle",
  transmis_complet: "Transmis à Solis, complet",
  transmis_incomplet: "Transmis à Solis, incomplet",
};

/** Explication de chaque statut, pour le mode d'emploi. */
export const DESCRIPTIONS_STATUT: Record<StatutDossier, string> = {
  recu: "Pris en charge depuis la GED et lu, déliassage non validé.",
  en_cours: "Déliassage validé : contrôle des données ou de complétude en cours, ou rapport généré en attente de transmission.",
  transmis_complet: "Enregistré dans Solis avec sa date de dossier complet et son rapport de contrôle.",
  transmis_incomplet: "Enregistré dans Solis sans date de dossier complet : pièces manquantes ou point bloquant, signalés dans le rapport.",
};

export const TEINTES_STATUT: Record<StatutDossier, "neutre" | "primaire" | "succes" | "attention" | "danger" | "info"> = {
  recu: "neutre",
  en_cours: "primaire",
  transmis_complet: "succes",
  transmis_incomplet: "attention",
};

export const STATUTS_TRANSMIS: StatutDossier[] = ["transmis_complet", "transmis_incomplet"];
