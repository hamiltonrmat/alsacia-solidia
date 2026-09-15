import { chiffres, nirAvecCle } from "@/lib/identifiants";
import { normaliserDateFr } from "@/lib/dates";

/**
 * Base d'usagers du logiciel métier « Solis », simulée.
 *
 * Sert au rapprochement d'identité (identitovigilance) : l'agent confronte
 * l'identité lue sur le CERFA aux usagers connus, confirme ou crée. Données
 * fictives.
 */

export type StatutDemandeSolis = "En cours" | "Accordé" | "Refusé" | "Clos";

export type DossierSolis = {
  numero: string;
  type: string;
  dateDemande: string;
  statut: StatutDemandeSolis;
  commentaire?: string;
};

export type UsagerSolis = {
  numeroUsager: string;
  nir: string;
  civilite: "Madame" | "Monsieur";
  nomNaissance: string;
  nomUsage?: string;
  prenoms: string;
  dateNaissance: string;
  adresse: string;
  dossiers: DossierSolis[];
};

export const USAGERS_SOLIS: UsagerSolis[] = [
  {
    numeroUsager: "U-0048213",
    // Même NIR que le dossier fictif D-2026-0301 (Jean DUPONT).
    nir: nirAvecCle("1480767482123"),
    civilite: "Monsieur",
    nomNaissance: "DUPONT",
    prenoms: "Jean",
    dateNaissance: "12/07/1948",
    adresse: "12 rue de la Paix, 67000 Strasbourg",
    dossiers: [
      {
        numero: "APA-2019-01187",
        type: "APA à domicile — première demande",
        dateDemande: "14/05/2019",
        statut: "Accordé",
        commentaire: "GIR 4, plan d'aide 12 h/mois. Droits échus le 31/05/2024.",
      },
    ],
  },
  {
    // Homonyme de Jean DUPONT : ne doit jamais être rattaché sans confirmation.
    numeroUsager: "U-0053310",
    nir: nirAvecCle("1520367482077"),
    civilite: "Monsieur",
    nomNaissance: "DUPONT",
    prenoms: "Jean-Pierre",
    dateNaissance: "03/03/1952",
    adresse: "4 rue des Bateliers, 67000 Strasbourg",
    dossiers: [
      {
        numero: "ASD-2023-00415",
        type: "Aide sociale à domicile",
        dateDemande: "02/10/2023",
        statut: "Clos",
      },
    ],
  },
  {
    numeroUsager: "U-0051977",
    nir: nirAvecCle("2550367482004"),
    civilite: "Madame",
    nomNaissance: "SCHNEIDER",
    nomUsage: "KLEIN",
    prenoms: "Louise",
    dateNaissance: "14/03/1955",
    adresse: "7 rue des Tanneurs, 67000 Strasbourg",
    dossiers: [
      {
        numero: "APA-2024-00932",
        type: "APA à domicile — première demande",
        dateDemande: "03/11/2024",
        statut: "En cours",
      },
    ],
  },
  {
    // Même NIR que le dossier fictif D-2026-0305 (Robert MOREAU) : une demande
    // est déjà enregistrée, déposée par l'organisme tutélaire.
    numeroUsager: "U-0059842",
    nir: nirAvecCle("1390967348019"),
    civilite: "Monsieur",
    nomNaissance: "MOREAU",
    prenoms: "Robert",
    dateNaissance: "08/09/1939",
    adresse: "22 rue des Remparts, 67210 Obernai",
    dossiers: [
      {
        numero: "APA-2026-01099",
        type: "APA à domicile — première demande",
        dateDemande: "25/08/2026",
        statut: "En cours",
        commentaire: "Demande déposée par l'Association Tutélaire d'Alsace. En attente de la décision de justice.",
      },
    ],
  },
];

export function normaliserNom(valeur: string | null | undefined): string {
  return (valeur ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export type CritereRecherche = {
  nir?: string | null;
  nomNaissance?: string | null;
  nomUsage?: string | null;
  dateNaissance?: string | null;
};

export type CritereCandidat = "nir" | "etat_civil" | "homonyme";

export type CandidatSolis = {
  usager: UsagerSolis;
  critere: CritereCandidat;
  /** Demande du même type déjà en cours, s'il y en a une. */
  demandeEnCours: DossierSolis | null;
};

export const LIBELLES_CRITERE: Record<CritereCandidat, string> = {
  nir: "Numéro de sécurité sociale identique",
  etat_civil: "Nom de naissance et date de naissance identiques",
  homonyme: "Homonyme (nom identique, date de naissance différente)",
};

/**
 * Recherche les usagers candidats, du plus sûr au moins sûr : NIR, puis nom de
 * naissance et date de naissance, puis homonymes. Le rapprochement final
 * appartient à l'agent.
 */
export function rechercherCandidats(critere: CritereRecherche): CandidatSolis[] {
  const resultats: CandidatSolis[] = [];
  const vus = new Set<string>();
  const ajouter = (u: UsagerSolis, c: CritereCandidat) => {
    if (vus.has(u.numeroUsager)) return;
    vus.add(u.numeroUsager);
    resultats.push({ usager: u, critere: c, demandeEnCours: u.dossiers.find((d) => d.statut === "En cours" && d.type.startsWith("APA")) ?? null });
  };

  const nir = critere.nir ? chiffres(critere.nir) : "";
  if (nir.length === 15) {
    for (const u of USAGERS_SOLIS) if (u.nir === nir) ajouter(u, "nir");
  }

  const noms = [normaliserNom(critere.nomNaissance), normaliserNom(critere.nomUsage)].filter((n) => n.length >= 2);
  const date = normaliserDateFr(critere.dateNaissance);
  if (noms.length) {
    for (const u of USAGERS_SOLIS) {
      const nomsUsager = [normaliserNom(u.nomNaissance), normaliserNom(u.nomUsage)];
      if (!noms.some((n) => nomsUsager.includes(n))) continue;
      ajouter(u, date && u.dateNaissance === date ? "etat_civil" : "homonyme");
    }
  }
  return resultats.slice(0, 6);
}

let compteurUsager = 60000;
let compteurDossier = 1200;

/** Simule la création d'un usager et renvoie son numéro. */
export function genererNumeroUsager(): string {
  compteurUsager += 1;
  return `U-${String(compteurUsager).padStart(7, "0")}`;
}

/** Simule la création d'une demande et renvoie son numéro. */
export function genererNumeroDossier(annee: number): string {
  compteurDossier += 1;
  return `APA-${annee}-${String(compteurDossier).padStart(5, "0")}`;
}
