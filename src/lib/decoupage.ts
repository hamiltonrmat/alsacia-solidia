/**
 * Découpage d'un dossier numérisé en pièces.
 *
 * Chaque page est classée à partir de son texte OCR (Markdown), par règles
 * lexicales déterministes et transparentes : le pied de page du CERFA donne
 * son numéro officiel, les pièces jointes sont reconnues par leurs intitulés.
 * Les pages consécutives de même type sont ensuite regroupées en pièces.
 */

export type TypePage =
  | "cerfa_notice"
  | "cerfa_formulaire"
  | "cerfa_rgpd"
  | "certificat_medical"
  | "cni"
  | "rib"
  | "avis_imposition"
  | "jugement_protection"
  | "taxe_fonciere"
  | "page_vide"
  | "inconnu";

export type TypePiece = TypePage;

export type PageClassee = {
  /** Numéro de page dans le dossier, à partir de 1. */
  numero: number;
  type: TypePage;
  /** 0 à 1. */
  confiance: number;
  /** Explication lisible de la classification. */
  justification: string;
  /** Numéro officiel de la page du CERFA (1 à 13), si identifié. */
  pageCerfa?: number;
  /** Premières lignes utiles de la page, pour l'aperçu. */
  apercu: string;
  /** Interne au classement : code du CERFA lu sans numéro, numéro à déduire des pages voisines. */
  cerfaSansNumero?: boolean;
};

export type Piece = {
  id: string;
  type: TypePiece;
  /** Numéros de pages (à partir de 1), consécutifs. */
  pages: number[];
  /** Confiance minimale des pages de la pièce. */
  confiance: number;
  /** Faux si le type a été fixé par l'agent. */
  automatique: boolean;
};

export const LIBELLES_PIECES: Record<TypePiece, string> = {
  cerfa_notice: "Notice du CERFA (à écarter)",
  cerfa_formulaire: "Formulaire de demande (CERFA 16301*01)",
  cerfa_rgpd: "Mentions RGPD du CERFA (à écarter)",
  certificat_medical: "Certificat médical",
  cni: "Pièce d'identité (CNI)",
  rib: "Relevé d'identité bancaire (RIB)",
  avis_imposition: "Avis d'imposition",
  jugement_protection: "Décision de justice (mesure de protection)",
  taxe_fonciere: "Avis de taxe foncière",
  page_vide: "Page vide ou illisible (à écarter)",
  inconnu: "Pièce non identifiée",
};

/** Types de pièces qui n'entrent pas dans l'instruction. */
export const TYPES_A_ECARTER: TypePiece[] = ["cerfa_notice", "cerfa_rgpd", "page_vide"];

/** En deçà de ce nombre de caractères utiles, une page est considérée vide ou illisible. */
const SEUIL_PAGE_VIDE = 40;

/** Types de pièces pour lesquels une extraction de champs est prévue. */
export const TYPES_EXTRAITS: TypePiece[] = [
  "cerfa_formulaire",
  "certificat_medical",
  "cni",
  "rib",
  "avis_imposition",
  "jugement_protection",
];

function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘`]/g, "'")
    .toLowerCase();
}

type Regle = { type: TypePage; motsCles: string[]; poids?: number };

const REGLES: Regle[] = [
  { type: "cni", motsCles: ["carte nationale d'identite", "identity card", "card number", "date d'expiration"] },
  { type: "rib", motsCles: ["releve d'identite bancaire", "iban", "bic", "code guichet"] },
  { type: "avis_imposition", motsCles: ["avis d'impot", "revenu fiscal de reference", "finances publiques", "numero fiscal"] },
  { type: "jugement_protection", motsCles: ["tribunal", "jugement", "tutelle", "curatelle", "juge des contentieux"] },
  { type: "taxe_fonciere", motsCles: ["taxe fonciere", "proprietes baties", "finances publiques"] },
  {
    type: "certificat_medical",
    motsCles: [
      "certificat medical",
      "coordonnees du patient",
      "pathologies et signes cliniques",
      "prises en charges therapeutiques",
      "evaluation de la perte d'autonomie",
      "cachet du medecin",
      "deficiences sensorielles",
    ],
  },
  {
    type: "cerfa_notice",
    motsCles: [
      "notice, partie a conserver",
      "comment constituer votre dossier",
      "quelle prestation peut etre demandee",
      "conditions d'attribution",
      "documents justificatifs a fournir",
      "etapes de la demande",
    ],
  },
  {
    type: "cerfa_rgpd",
    motsCles: ["donnees a caractere personnel", "responsable du traitement", "rgpd", "cnil"],
  },
  {
    type: "cerfa_formulaire",
    motsCles: [
      "situation du demandeur",
      "cadre reserve a l'administration",
      "situation familiale",
      "mesure de protection du demandeur",
      "personne proche a contacter",
      "identification de l'organisme competent",
      "ressources et patrimoine",
      "carte mobilite inclusion",
      "signature du demandeur",
    ],
  },
];

/** Code du CERFA, tel qu'il apparaît dans le pied de page (l'astérisque est parfois échappé en Markdown). */
const CODE_CERFA = /16301\s*\\?\*\s*01/;

/**
 * Numéro officiel de page lu dans le pied de page « cerfa 16301*01 / n / 09/2023 ».
 *
 * Selon le modèle de lecture, ce pied de page ne sort pas toujours de la même
 * façon : ordre « 16301*01, n, 09/2023 » (modèles de 2025), ou numéro juste
 * après le code, pied de page remonté en haut de la page (« 09/2023 16301*01
 * 6 »), et souvent sans numéro du tout (mistral-ocr-2512, novembre 2026).
 */
function numeroPageCerfa(texte: string): number | undefined {
  const valide = (n: number) => (n >= 1 && n <= 13 ? n : undefined);
  const ancien = texte.match(/16301\s*\\?\*\s*01\s*(?:\n\s*)*(\d{1,2})\s*(?:\n\s*)*09\/2023/);
  if (ancien) return valide(Number(ancien[1]));
  // Numéro juste après le code, qui n'est ni une date (09/2023) ni un numéro de rubrique (« 3. »).
  for (const m of texte.matchAll(/16301\s*\\?\*\s*01[ \t]*(?:\n\s*)?(\d{1,2})(?![\d/.])/g)) {
    const n = valide(Number(m[1]));
    if (n !== undefined) return n;
  }
  return undefined;
}

/**
 * Intitulés propres à chaque page du CERFA, pour la reconnaître quand son
 * numéro manque au pied de page. Relevés sur la lecture des 13 pages
 * (mistral-ocr-2512) ; chaque intitulé ne figure que sur sa page.
 */
const SIGNATURES_PAGES_CERFA: Record<number, string[]> = {
  1: ["notice, partie a conserver", "comment constituer votre dossier", "quelle prestation peut etre demandee"],
  2: ["a quoi ces prestations correspondent", "conditions d'attribution", "qui peut beneficier"],
  3: ["qu'est-ce que la carte mobilite inclusion", "quelles sont les etapes de la demande", "comment en faire la demande"],
  4: ["par les caisses de retraite :", "documents justificatifs a fournir", "pieces justificatives a fournir"],
  5: ["situation du demandeur", "cadre reserve a l'administration", "ancien lieu de residence du demandeur"],
  6: ["situation familiale", "mesure de protection du demandeur", "les informations du conjoint"],
  7: ["personne proche a contacter", "identification de l'organisme competent", "le lien avec le demandeur"],
  8: ["revenu declare", "biens immobiliers et mobiliers", "residence principale du demandeur", "biens mobiliers et capitaux"],
  9: ["signature du demandeur et/ou de son representant legal", "remplir cette partie uniquement si le demandeur sollicite l'apa", "7. carte mobilite inclusion"],
  10: ["donnees a caractere personnel", "responsable du traitement", "mentions d'information"],
  11: ["certificat medical pour demander", "coordonnees du patient", "pathologies et signes cliniques"],
  12: ["prises en charges therapeutiques", "perspective d'evolution de l'atteinte", "evaluation de la perte d'autonomie", "mobilite – deplacements"],
  13: ["deficiences sensorielles", "autres actes essentiels de la vie quotidienne", "cognition / capacite cognitive", "identification du medecin"],
};

/** Page du CERFA reconnue à ses intitulés : le meilleur score, s'il est net. */
function pageCerfaParIntitules(texte: string): { page: number; trouves: string[] } | undefined {
  const scores = Object.entries(SIGNATURES_PAGES_CERFA)
    .map(([page, intitules]) => ({ page: Number(page), trouves: intitules.filter((i) => texte.includes(i)) }))
    .filter((s) => s.trouves.length > 0)
    .sort((a, b) => b.trouves.length - a.trouves.length);
  if (scores.length === 0) return undefined;
  if (scores.length > 1 && scores[1].trouves.length === scores[0].trouves.length) return undefined;
  return scores[0];
}

function typeDepuisPageCerfa(n: number): TypePage {
  if (n <= 4) return "cerfa_notice";
  if (n <= 9) return "cerfa_formulaire";
  if (n === 10) return "cerfa_rgpd";
  return "certificat_medical";
}

function apercuDe(markdown: string): string {
  return markdown
    .split("\n")
    .map((l) => l.replace(/[#*|>\-]+/g, " ").replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 3 && !/^(republique|francaise|liberte|egalite|fraternite|cerfa)$/i.test(normaliser(l)))
    .slice(0, 3)
    .join(" · ")
    .slice(0, 160);
}

/** Classe une page à partir de son Markdown OCR. */
export function classerPage(numero: number, markdown: string): PageClassee {
  const texte = normaliser(markdown);
  const apercu = apercuDe(markdown);

  const utile = texte.replace(/[^a-z0-9]/g, "");
  if (utile.length < SEUIL_PAGE_VIDE) {
    return {
      numero,
      type: "page_vide",
      confiance: 0.9,
      justification: `${utile.length} caractère(s) lisible(s) seulement : page vide, illisible ou mal numérisée`,
      apercu,
    };
  }

  // 1. Numéro lu au pied de page : le plus sûr.
  const pageCerfa = numeroPageCerfa(markdown);
  if (pageCerfa !== undefined) {
    return {
      numero,
      type: typeDepuisPageCerfa(pageCerfa),
      confiance: 0.98,
      justification: `Pied de page « cerfa 16301*01 » page ${pageCerfa}`,
      pageCerfa,
      apercu,
    };
  }

  // 2. Code du CERFA présent sans numéro, ou intitulés caractéristiques : la page est reconnue à ses intitulés.
  const codeCerfa = CODE_CERFA.test(markdown);
  const parIntitules = pageCerfaParIntitules(texte);
  if (parIntitules && (codeCerfa || parIntitules.trouves.length >= 2)) {
    return {
      numero,
      type: typeDepuisPageCerfa(parIntitules.page),
      confiance: codeCerfa ? 0.92 : 0.85,
      justification: `Page ${parIntitules.page} du CERFA reconnue à ses intitulés (${parIntitules.trouves.slice(0, 2).join(", ")})${codeCerfa ? ", pied de page sans numéro" : ""}`,
      pageCerfa: parIntitules.page,
      apercu,
    };
  }
  if (codeCerfa) {
    // 3. Page du CERFA dont le numéro sera déduit de ses voisines (voir classerPages).
    return { numero, type: "cerfa_formulaire", confiance: 0.6, justification: "Pied de page « cerfa 16301*01 » sans numéro", apercu, cerfaSansNumero: true };
  }

  let meilleur: { type: TypePage; score: number; trouves: string[] } | null = null;
  for (const regle of REGLES) {
    const trouves = regle.motsCles.filter((mot) => texte.includes(mot));
    if (trouves.length === 0) continue;
    const score = trouves.length / regle.motsCles.length;
    if (!meilleur || score > meilleur.score) meilleur = { type: regle.type, score, trouves };
  }

  if (!meilleur) {
    return { numero, type: "inconnu", confiance: 0.2, justification: "Aucun intitulé connu reconnu", apercu };
  }
  const confiance = Math.min(0.95, 0.55 + meilleur.score * 0.45);
  return {
    numero,
    type: meilleur.type,
    confiance: Number(confiance.toFixed(2)),
    justification: `Intitulés reconnus : ${meilleur.trouves.slice(0, 3).join(", ")}`,
    apercu,
  };
}

/**
 * Classe toutes les pages d'un dossier. Une page portant le code du CERFA mais
 * ni numéro ni intitulé reconnaissable reçoit le numéro qui suit celui de la
 * page précédente (ou qui précède celui de la suivante) : les pages d'un même
 * formulaire se suivent dans le scan.
 */
export function classerPages(pages: Array<{ markdown: string }>): PageClassee[] {
  const classees = pages.map((p, i) => classerPage(i + 1, p.markdown));
  for (let passe = 0; passe < 2; passe += 1) {
    classees.forEach((page, i) => {
      if (!page.cerfaSansNumero) return;
      const precedente = classees[i - 1]?.pageCerfa;
      const suivante = classees[i + 1]?.pageCerfa;
      const deduite = precedente !== undefined && precedente < 13 ? precedente + 1 : suivante !== undefined && suivante > 1 ? suivante - 1 : undefined;
      if (deduite === undefined) return;
      classees[i] = {
        ...page,
        type: typeDepuisPageCerfa(deduite),
        pageCerfa: deduite,
        confiance: 0.8,
        justification: `Page ${deduite} du CERFA déduite de la page ${precedente !== undefined ? "précédente" : "suivante"} (pied de page sans numéro)`,
        cerfaSansNumero: undefined,
      };
    });
  }
  return classees.map(({ cerfaSansNumero: _ignore, ...page }) => {
    void _ignore;
    return page;
  });
}

/**
 * Regroupe les pages consécutives de même type en pièces. Une page du CERFA
 * dont le numéro officiel ne suit pas le précédent ouvre une nouvelle pièce
 * (deux formulaires différents dans un même dossier, par exemple).
 */
export function regrouperEnPieces(pages: PageClassee[]): Piece[] {
  const pieces: Piece[] = [];
  let courante: Piece | null = null;
  let dernierePageCerfa: number | undefined;

  for (const page of pages) {
    const continuite =
      courante !== null &&
      courante.type === page.type &&
      (page.pageCerfa === undefined || dernierePageCerfa === undefined || page.pageCerfa === dernierePageCerfa + 1);

    if (continuite && courante) {
      courante.pages.push(page.numero);
      courante.confiance = Math.min(courante.confiance, page.confiance);
    } else {
      courante = {
        id: `piece-${pieces.length + 1}`,
        type: page.type,
        pages: [page.numero],
        confiance: page.confiance,
        automatique: true,
      };
      pieces.push(courante);
    }
    dernierePageCerfa = page.pageCerfa;
  }
  return pieces;
}

/** Reconstruit les pièces après modification manuelle du type d'une page. */
export function reclasserPage(pages: PageClassee[], numero: number, type: TypePage): PageClassee[] {
  return pages.map((p) =>
    p.numero === numero ? { ...p, type, confiance: 1, justification: "Type fixé par l'agent", pageCerfa: undefined } : p,
  );
}
