/**
 * Utilitaires sur les identifiants administratifs : NIR (numéro de sécurité
 * sociale) et IBAN. Utilisés par le générateur de dossiers fictifs et par les
 * règles de contrôle.
 */

function mod97(chaine: string): number {
  // Calcul incrémental pour éviter les débordements sur les grands nombres.
  let reste = 0;
  for (const c of chaine) {
    reste = (reste * 10 + Number(c)) % 97;
  }
  return reste;
}

/** Ne garde que les chiffres. */
export function chiffres(valeur: string): string {
  return valeur.replace(/\D/g, "");
}

/**
 * Clé de contrôle d'un NIR à partir de ses 13 premiers chiffres.
 * Les départements corses 2A et 2B sont remplacés par 19 et 18.
 */
export function cleNir(base13: string): string {
  const normalise = base13.toUpperCase().replace("2A", "19").replace("2B", "18");
  if (!/^\d{13}$/.test(normalise)) {
    throw new Error(`Base NIR invalide : ${base13}`);
  }
  return String(97 - mod97(normalise)).padStart(2, "0");
}

/** Construit un NIR complet (15 chiffres) à partir de ses 13 premiers. */
export function nirAvecCle(base13: string): string {
  const base = chiffres(base13);
  return base + cleNir(base);
}

/** Vrai si le NIR a 15 chiffres et une clé de contrôle correcte. */
export function nirValide(nir: string): boolean {
  const n = chiffres(nir);
  if (n.length !== 15) return false;
  try {
    return cleNir(n.slice(0, 13)) === n.slice(13);
  } catch {
    return false;
  }
}

/** Présentation usuelle : 1 48 07 67 482 123 45. */
export function formaterNir(nir: string): string {
  const n = chiffres(nir);
  if (n.length !== 15) return nir;
  return [n.slice(0, 1), n.slice(1, 3), n.slice(3, 5), n.slice(5, 7), n.slice(7, 10), n.slice(10, 13), n.slice(13)].join(" ");
}

function lettresEnChiffres(chaine: string): string {
  return chaine
    .toUpperCase()
    .split("")
    .map((c) => (c >= "A" && c <= "Z" ? String(c.charCodeAt(0) - 55) : c))
    .join("");
}

/** Clé RIB (2 chiffres) à partir du code banque, du guichet et du numéro de compte. */
export function cleRib(banque: string, guichet: string, compte: string): string {
  const compteNumerique = lettresEnChiffres(compte).padStart(11, "0");
  const reste = mod97(`${banque}${guichet}${compteNumerique}00`);
  return String(97 - reste).padStart(2, "0");
}

/** IBAN français valide construit à partir d'un RIB. */
export function ibanFr(banque: string, guichet: string, compte: string): string {
  const bban = `${banque}${guichet}${compte}${cleRib(banque, guichet, compte)}`;
  const reste = mod97(lettresEnChiffres(`${bban}FR00`));
  const cle = String(98 - reste).padStart(2, "0");
  return `FR${cle}${bban}`;
}

/** Vérifie la clé d'un IBAN (tous pays), espaces tolérés. */
export function ibanValide(iban: string): boolean {
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return false;
  const rearrange = compact.slice(4) + compact.slice(0, 4);
  return mod97(lettresEnChiffres(rearrange)) === 1;
}

/** Présentation par groupes de 4 caractères. */
export function formaterIban(iban: string): string {
  return iban.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}
