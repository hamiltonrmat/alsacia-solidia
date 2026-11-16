/**
 * Les cinq étapes du traitement d'un dossier, de la GED à Solis.
 *
 * Défini hors du magasin d'état (qui est un module client) pour être
 * utilisable aussi dans les pages serveur. La première étape, la GED, se
 * déroule sur la page « Traitement des dossiers » ; les quatre suivantes ont
 * chacune leur page sous /dossiers/<id>/.
 */

export type IdEtape = "ged" | "decoupage" | "extraction" | "conformite" | "export";

export type DescriptionEtape = {
  id: IdEtape;
  numero: number;
  libelle: string;
  resume: string;
};

export const ETAPES: DescriptionEtape[] = [
  {
    id: "ged",
    numero: 1,
    libelle: "GED",
    resume: "Prendre en charge un dossier numérisé : enregistrement de la réception et lecture OCR.",
  },
  {
    id: "decoupage",
    numero: 2,
    libelle: "Déliassage",
    resume: "Reconnaître chaque page, la rattacher à la bonne pièce et écarter les pages inutiles.",
  },
  {
    id: "extraction",
    numero: 3,
    libelle: "Contrôle des données",
    resume: "Vérifier les champs extraits en regard du document et rapprocher l'usager de Solis.",
  },
  {
    id: "conformite",
    numero: 4,
    libelle: "Complétude et conformité",
    resume: "Appliquer les règles métier, fixer la date de dossier complet et générer le rapport de contrôle.",
  },
  {
    id: "export",
    numero: 5,
    libelle: "Enregistrement et transmission",
    resume: "Enregistrer la demande dans Solis avec le rapport de contrôle et les pièces.",
  },
];
