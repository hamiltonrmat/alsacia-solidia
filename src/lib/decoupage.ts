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
  inconnu: "Pièce non identifiée",
};

/** Types de pièces qui n'entrent pas dans l'instruction. */
export const TYPES_A_ECARTER: TypePiece[] = ["cerfa_notice", "cerfa_rgpd"];

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

/** Numéro officiel de page lu dans le pied de page « cerfa 16301*01 / n / 09/2023 ». */
function numeroPageCerfa(texte: string): number | undefined {
  const m = texte.match(/16301\s*\\?\*\s*01\s*(?:\n\s*)*(\d{1,2})\s*(?:\n\s*)*09\/2023/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 1 && n <= 13 ? n : undefined;
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

export function classerPages(pages: Array<{ markdown: string }>): PageClassee[] {
  return pages.map((p, i) => classerPage(i + 1, p.markdown));
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
