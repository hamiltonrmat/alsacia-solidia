/**
 * Les cinq étapes de pré-instruction d'un dossier, avec leur résumé.
 *
 * Défini hors du magasin d'état (qui est un module client) pour être
 * utilisable aussi dans les pages serveur.
 */

export type IdEtape = "decoupage" | "extraction" | "conformite" | "decision" | "export";

export type DescriptionEtape = {
  id: IdEtape;
  numero: number;
  libelle: string;
  resume: string;
};

export const ETAPES: DescriptionEtape[] = [
  {
    id: "decoupage",
    numero: 1,
    libelle: "Typage des pièces",
    resume: "Reconnaître chaque page et la rattacher à la bonne pièce.",
  },
  {
    id: "extraction",
    numero: 2,
    libelle: "Contrôle des données",
    resume: "Vérifier les champs extraits en regard du document et rapprocher l'usager.",
  },
  {
    id: "conformite",
    numero: 3,
    libelle: "Complétude et recevabilité",
    resume: "Contrôler les pièces, fixer la date de dossier complet, écrire à l'usager.",
  },
  {
    id: "decision",
    numero: 4,
    libelle: "Pré-instruction",
    resume: "Appliquer les règles et retenir l'orientation du dossier.",
  },
  {
    id: "export",
    numero: 5,
    libelle: "Enregistrement et transmission",
    resume: "Enregistrer dans Solis, transmettre et reverser les pièces dans la GED.",
  },
];
