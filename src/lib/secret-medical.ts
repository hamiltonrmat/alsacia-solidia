import type { PageClassee } from "@/lib/decoupage";

/**
 * Secret médical.
 *
 * Le certificat médical du CERFA 16301*01 est remis « sous pli cacheté » et
 * destiné à l'équipe médico-sociale. L'agent administratif n'a à connaître
 * que l'identité du patient, la date et le médecin. Ce module retire du texte
 * OCR des pages du certificat tout le contenu médical, avant conservation et
 * avant extraction.
 */

export const MARQUEUR_PLI_CACHETE = "[Contenu médical sous pli cacheté : non conservé, réservé à l'équipe médico-sociale]";

const DEBUT_MEDICAL = /^\s*#{0,4}\s*2\.\s*Pathologies/im;
const FIN_MEDICAL = /^\s*#{0,4}\s*Document rédigé à la demande du patient/im;
const FAIT_A = /^\s*Fait à\s*:/im;

/**
 * Ne garde que les parties administratives d'une page du certificat médical :
 * l'identité du patient (avant la partie 2) et le bloc de signature du médecin
 * (à partir de « Document rédigé… », sinon « Fait à »).
 */
export function redigerCertificatMedical(markdown: string, pageCerfa?: number): string {
  if (markdown.includes(MARQUEUR_PLI_CACHETE)) return markdown;

  const debut = markdown.search(DEBUT_MEDICAL);
  let fin = markdown.search(FIN_MEDICAL);
  if (fin < 0) fin = markdown.search(FAIT_A);

  // Page centrale de l'annexe (page 12) : entièrement médicale.
  if (pageCerfa === 12 || (debut < 0 && fin < 0 && pageCerfa !== undefined)) {
    return `${MARQUEUR_PLI_CACHETE}\n`;
  }

  const avant = debut >= 0 ? markdown.slice(0, debut) : fin >= 0 ? "" : markdown;
  const apres = fin >= 0 ? markdown.slice(fin) : "";
  if (debut < 0 && fin < 0) return markdown;
  return `${avant.trimEnd()}\n\n${MARQUEUR_PLI_CACHETE}\n\n${apres.trimStart()}`;
}

/** Applique la rédaction aux pages classées « certificat médical ». */
export function appliquerSecretMedical<T extends { markdown: string }>(pages: T[], classees: PageClassee[]): T[] {
  return pages.map((page, i) => {
    const classee = classees[i];
    if (!classee || classee.type !== "certificat_medical") return page;
    const markdown = redigerCertificatMedical(page.markdown, classee.pageCerfa);
    return markdown === page.markdown ? page : { ...page, markdown };
  });
}

/** Numéros (à partir de 1) des pages dont l'image ne doit pas être affichée à l'agent. */
export function pagesSousPliCachete(classees: PageClassee[] | undefined): number[] {
  return (classees ?? []).filter((p) => p.type === "certificat_medical").map((p) => p.numero);
}
