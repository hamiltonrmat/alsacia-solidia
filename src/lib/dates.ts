/**
 * Manipulation des dates au format administratif français JJ/MM/AAAA.
 * Les calculs se font en UTC pour éviter les décalages de fuseau.
 */

export type DateFr = string;

/** Analyse JJ/MM/AAAA (séparateurs / . - ou espaces tolérés). Renvoie null si invalide. */
export function parserDateFr(valeur: string | null | undefined): Date | null {
  if (!valeur) return null;
  const m = valeur.trim().match(/^(\d{1,2})\s*[\/.\-\s]\s*(\d{1,2})\s*[\/.\-\s]\s*(\d{4})$/);
  if (!m) return null;
  const jour = Number(m[1]);
  const mois = Number(m[2]);
  const annee = Number(m[3]);
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  if (date.getUTCFullYear() !== annee || date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) {
    return null;
  }
  return date;
}

export function formaterDateFr(date: Date): DateFr {
  const jj = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${jj}/${mm}/${date.getUTCFullYear()}`;
}

/** Normalise une date saisie librement en JJ/MM/AAAA, ou null. */
export function normaliserDateFr(valeur: string | null | undefined): DateFr | null {
  const d = parserDateFr(valeur);
  return d ? formaterDateFr(d) : null;
}

/** Âge révolu à une date de référence. */
export function ageA(dateNaissance: Date, reference: Date): number {
  let age = reference.getUTCFullYear() - dateNaissance.getUTCFullYear();
  const anniversairePasse =
    reference.getUTCMonth() > dateNaissance.getUTCMonth() ||
    (reference.getUTCMonth() === dateNaissance.getUTCMonth() && reference.getUTCDate() >= dateNaissance.getUTCDate());
  if (!anniversairePasse) age -= 1;
  return age;
}

/** Nombre de mois entiers écoulés entre deux dates (positif si `fin` est après `debut`). */
export function moisEntre(debut: Date, fin: Date): number {
  let mois = (fin.getUTCFullYear() - debut.getUTCFullYear()) * 12 + (fin.getUTCMonth() - debut.getUTCMonth());
  if (fin.getUTCDate() < debut.getUTCDate()) mois -= 1;
  return mois;
}

export function ajouterAnnees(date: Date, annees: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + annees, date.getUTCMonth(), date.getUTCDate()));
}

export function ajouterMois(date: Date, mois: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + mois, date.getUTCDate()));
}

export function ajouterJours(date: Date, jours: number): Date {
  return new Date(date.getTime() + jours * 86_400_000);
}

/** Nombre de jours entiers entre deux dates (positif si `fin` est après `debut`). */
export function joursEntre(debut: Date, fin: Date): number {
  return Math.floor((fin.getTime() - debut.getTime()) / 86_400_000);
}
