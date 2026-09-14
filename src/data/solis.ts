import { chiffres, nirAvecCle } from "@/lib/identifiants";
import { normaliserDateFr } from "@/lib/dates";

/**
 * Base d'usagers du logiciel métier « Solis », simulée.
 *
 * Sert à la page d'export : si l'usager est déjà connu, la nouvelle demande
 * est rattachée à son dossier ; sinon un usager est créé. Données fictives.
 */

export type DossierSolis = {
  numero: string;
  type: string;
  dateDemande: string;
  statut: "En cours" | "Accordé" | "Refusé" | "Clos";
  commentaire?: string;
};

export type UsagerSolis = {
  numeroUsager: string;
  nir: string;
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
    numeroUsager: "U-0051977",
    nir: nirAvecCle("2550367482004"),
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
  dateNaissance?: string | null;
};

export type ResultatRecherche =
  | { trouve: true; usager: UsagerSolis; critere: "nir" | "etat_civil" }
  | { trouve: false };

/** Recherche un usager par NIR, puis par nom de naissance et date de naissance. */
export function rechercherUsagerSolis(critere: CritereRecherche): ResultatRecherche {
  const nir = critere.nir ? chiffres(critere.nir) : "";
  if (nir.length === 15) {
    const parNir = USAGERS_SOLIS.find((u) => u.nir === nir);
    if (parNir) return { trouve: true, usager: parNir, critere: "nir" };
  }
  const nom = normaliserNom(critere.nomNaissance);
  const date = normaliserDateFr(critere.dateNaissance);
  if (nom && date) {
    const parEtatCivil = USAGERS_SOLIS.find(
      (u) => normaliserNom(u.nomNaissance) === nom && u.dateNaissance === date,
    );
    if (parEtatCivil) return { trouve: true, usager: parEtatCivil, critere: "etat_civil" };
  }
  return { trouve: false };
}

let compteurUsager = 60000;
let compteurDossier = 1200;

/** Simule la création d'un usager et renvoie son numéro. */
export function genererNumeroUsager(): string {
  compteurUsager += 1;
  return `U-${String(compteurUsager).padStart(7, "0")}`;
}

/** Simule la création d'un dossier de demande et renvoie son numéro. */
export function genererNumeroDossier(annee: number): string {
  compteurDossier += 1;
  return `APA-${annee}-${String(compteurDossier).padStart(5, "0")}`;
}
