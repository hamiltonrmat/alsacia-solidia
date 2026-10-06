/**
 * Les trois modules de l'outil. La GED, le traitement des dossiers et le
 * logiciel métier sont des espaces distincts : le traitement ne se trouve plus
 * derrière l'écran d'arrivée des documents.
 */

export type Module = {
  id: "ged" | "dossiers" | "solis";
  numero: number;
  /** Libellé court, pour la barre de navigation. */
  libelle: string;
  /** Titre complet de la page du module. */
  titre: string;
  sousTitre: string;
  description: string;
  chemin: string;
  /** Emoji repère, décoratif. */
  icone: string;
};

export const MODULES: Module[] = [
  {
    id: "ged",
    numero: 1,
    libelle: "GED",
    titre: "Gestion électronique des documents",
    sousTitre: "Arrivée des dossiers numérisés",
    description:
      "Les courriers numérisés arrivent par lots. C'est ici que l'on choisit un dossier et qu'on l'enregistre pour le prendre en charge.",
    chemin: "/ged",
    icone: "📨",
  },
  {
    id: "dossiers",
    numero: 2,
    libelle: "Dossiers",
    titre: "Traitement des dossiers",
    sousTitre: "Bannette du poste de travail et étapes de pré-instruction",
    description:
      "La file des dossiers pris en charge, avec leur statut, et les cinq étapes de pré-instruction : typage, contrôle des données, recevabilité, orientation, transmission.",
    chemin: "/dossiers",
    icone: "🗂️",
  },
  {
    id: "solis",
    numero: 3,
    libelle: "Solis",
    titre: "Logiciel métier Solis",
    sousTitre: "Usagers et demandes enregistrées",
    description:
      "La base des usagers connus et de leurs demandes. C'est la destination finale du dossier pré-instruit, et la source du rapprochement d'identité.",
    chemin: "/solis",
    icone: "🏛️",
  },
];

export function moduleParId(id: Module["id"]): Module {
  const m = MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`Module inconnu : ${id}`);
  return m;
}
