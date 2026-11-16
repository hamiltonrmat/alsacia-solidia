import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { libelleValeur } from "@/lib/extraction/schemas";
import { LIBELLES_FAMILLE, ORDRE_FAMILLES, type StatutControle, type Verdict } from "@/lib/regles/conformite";
import { LIBELLES_STATUT } from "@/lib/statuts";
import {
  DESCRIPTIONS_STATUT_CHAMP,
  LIBELLES_NIVEAU,
  LIBELLES_STATUT_CHAMP,
  METHODE_ROBUSTESSE,
  nomFichierRapport,
  SCHEMA_RAPPORT,
  VERSION_RAPPORT,
  type NiveauRobustesse,
  type RapportControle,
  type StatutChamp,
} from "./modele";

/**
 * Mise en page PDF du rapport de contrôle (pdf-lib, polices standard).
 *
 * Le rendu est déterministe : les dates du document et de la pièce jointe
 * sont celles du rapport, si bien qu'un même rapport donne toujours le même
 * PDF, octet pour octet, et donc la même empreinte SHA-256. La version
 * structurée (JSON) est jointe au PDF.
 *
 * Module isomorphe : le logo est fourni en octets par l'appelant.
 */

// --- Mise en forme ------------------------------------------------------------

const A4: [number, number] = [595.28, 841.89];
const MARGE_X = 42;
const MARGE_HAUT = 64;
const MARGE_BAS = 52;
const LARGEUR = A4[0] - 2 * MARGE_X;

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

const C = {
  encre: hex("#0f172a"),
  texte: hex("#334155"),
  discret: hex("#64748b"),
  trait: hex("#e2e8f0"),
  fond: hex("#f8fafc"),
  fondFonce: hex("#f1f5f9"),
  bleu: hex("#2563eb"),
  blanc: rgb(1, 1, 1),
};

type Teinte = "succes" | "attention" | "danger" | "info" | "neutre" | "primaire";

const TEINTES: Record<Teinte, { texte: RGB; fond: RGB; bord: RGB }> = {
  succes: { texte: hex("#047857"), fond: hex("#ecfdf5"), bord: hex("#a7f3d0") },
  attention: { texte: hex("#b45309"), fond: hex("#fffbeb"), bord: hex("#fde68a") },
  danger: { texte: hex("#b91c1c"), fond: hex("#fef2f2"), bord: hex("#fecaca") },
  info: { texte: hex("#0369a1"), fond: hex("#f0f9ff"), bord: hex("#bae6fd") },
  neutre: { texte: hex("#475569"), fond: hex("#f1f5f9"), bord: hex("#e2e8f0") },
  primaire: { texte: hex("#1d4ed8"), fond: hex("#eff6ff"), bord: hex("#bfdbfe") },
};

const TEINTE_VERDICT: Record<Verdict, Teinte> = { conforme: "succes", conforme_sous_reserve: "attention", non_conforme: "danger" };
const TEINTE_NIVEAU: Record<NiveauRobustesse, Teinte> = { bonne: "succes", moyenne: "attention", faible: "danger", non_evaluee: "neutre" };
const TEINTE_CONTROLE: Record<StatutControle, Teinte> = { ok: "succes", info: "info", alerte: "attention", bloquant: "danger", non_applicable: "neutre" };
const TEINTE_CHAMP: Record<StatutChamp, Teinte> = { confirme: "succes", corrige: "primaire", lu: "neutre", vide: "neutre", douteux: "attention", non_lu: "danger" };

const LIBELLES_CONTEXTE: Record<string, string> = {
  import: "GED",
  deliassage: "Déliassage",
  typage: "Déliassage",
  controle: "Contrôle",
  usager: "Usager",
  completude: "Complétude",
  rapport: "Rapport",
  transmission: "Transmission",
};

const FORMAT_DATE_HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
const FORMAT_DATE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short" });

function dateHeure(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : FORMAT_DATE_HEURE.format(d).replace(" ", " à ");
}

function dateSeule(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : FORMAT_DATE.format(d);
}

function plage(pages: number[]): string {
  if (pages.length === 0) return "—";
  if (pages.length === 1) return `p. ${pages[0]}`;
  const consecutives = pages.every((p, i) => i === 0 || p === pages[i - 1] + 1);
  return consecutives ? `p. ${pages[0]} à ${pages[pages.length - 1]}` : `p. ${pages.join(", ")}`;
}

/** Remplacements des caractères absents de l'encodage WinAnsi des polices standard. */
const REMPLACEMENTS: Array<[RegExp, string]> = [
  [/[    ]/g, " "],
  [/[‘’‛]/g, "'"],
  [/[“”]/g, '"'],
  [/[✓✔]/g, "v"],
  [/[★☆]/g, "*"],
  [/→/g, "->"],
  [/←/g, "<-"],
  [/≥/g, ">="],
  [/≤/g, "<="],
  [/[☒☑■✕✗✘]/g, "[X]"],
  [/[☐□]/g, "[ ]"],
  [/∅/g, "(vide)"],
  [/\t/g, " "],
  [/\r/g, ""],
];

// --- Rédacteur : curseur vertical, sauts de page, primitives ------------------

type Polices = { normale: PDFFont; grasse: PDFFont; italique: PDFFont };
type Style = { police?: keyof Polices; taille?: number; couleur?: RGB };

type Cellule = string | { texte: string; police?: keyof Polices; couleur?: RGB; teinte?: Teinte };
type Colonne = { titre: string; poids: number; alignement?: "gauche" | "droite" };

class Redacteur {
  readonly doc: PDFDocument;
  readonly polices: Polices;
  private readonly jeu: Set<number>;
  private readonly enTete: string;
  page!: PDFPage;
  y = 0;

  constructor(doc: PDFDocument, polices: Polices, enTete: string) {
    this.doc = doc;
    this.polices = polices;
    this.jeu = new Set(polices.normale.getCharacterSet());
    this.enTete = enTete;
  }

  /** Texte compatible avec les polices standard. */
  propre(texte: string | null | undefined): string {
    let t = texte ?? "";
    for (const [motif, par] of REMPLACEMENTS) t = t.replace(motif, par);
    let sortie = "";
    for (const car of t) {
      const code = car.codePointAt(0) ?? 63;
      sortie += car === "\n" || this.jeu.has(code) ? car : code < 32 ? " " : "?";
    }
    return sortie;
  }

  largeur(texte: string, police: keyof Polices, taille: number): number {
    return this.polices[police].widthOfTextAtSize(texte, taille);
  }

  /** Coupe un texte en lignes tenant dans la largeur donnée. */
  couper(brut: string, police: keyof Polices, taille: number, largeur: number): string[] {
    const lignes: string[] = [];
    for (const paragraphe of this.propre(brut).split("\n")) {
      let ligne = "";
      for (let mot of paragraphe.split(/ +/)) {
        while (mot.length > 1 && this.largeur(mot, police, taille) > largeur) {
          let n = mot.length - 1;
          while (n > 1 && this.largeur(mot.slice(0, n), police, taille) > largeur) n -= 1;
          if (ligne) lignes.push(ligne);
          ligne = "";
          lignes.push(mot.slice(0, n));
          mot = mot.slice(n);
        }
        const essai = ligne ? `${ligne} ${mot}` : mot;
        if (this.largeur(essai, police, taille) <= largeur) ligne = essai;
        else {
          if (ligne) lignes.push(ligne);
          ligne = mot;
        }
      }
      lignes.push(ligne);
    }
    return lignes;
  }

  nouvellePage(): void {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - MARGE_HAUT;
    if (this.doc.getPageCount() > 1) {
      const yEnTete = A4[1] - 34;
      this.page.drawText(this.propre(this.enTete), { x: MARGE_X, y: yEnTete, size: 7.5, font: this.polices.normale, color: C.discret });
      this.page.drawLine({ start: { x: MARGE_X, y: yEnTete - 6 }, end: { x: A4[0] - MARGE_X, y: yEnTete - 6 }, thickness: 0.5, color: C.trait });
    }
  }

  /** Garantit la place pour un bloc de hauteur h, sinon change de page. Renvoie vrai si la page a changé. */
  place(h: number): boolean {
    if (this.y - h < MARGE_BAS) {
      this.nouvellePage();
      return true;
    }
    return false;
  }

  ecrire(texte: string, x: number, y: number, style: Style = {}): void {
    this.page.drawText(this.propre(texte), {
      x,
      y,
      size: style.taille ?? 9,
      font: this.polices[style.police ?? "normale"],
      color: style.couleur ?? C.texte,
    });
  }

  espace(h: number): void {
    this.y -= h;
  }

  paragraphe(texte: string, style: Style & { retrait?: number; apres?: number } = {}): void {
    const taille = style.taille ?? 9;
    const police = style.police ?? "normale";
    const interligne = taille * 1.38;
    const retrait = style.retrait ?? 0;
    for (const ligne of this.couper(texte, police, taille, LARGEUR - retrait)) {
      this.place(interligne);
      this.y -= interligne;
      this.ecrire(ligne, MARGE_X + retrait, this.y + taille * 0.28, { ...style, taille, police });
    }
    this.y -= style.apres ?? 4;
  }

  puce(texte: string, style: Style = {}): void {
    const taille = style.taille ?? 9;
    const interligne = taille * 1.38;
    const lignes = this.couper(texte, style.police ?? "normale", taille, LARGEUR - 12);
    lignes.forEach((ligne, i) => {
      this.place(interligne);
      this.y -= interligne;
      if (i === 0) this.ecrire("-", MARGE_X + 2, this.y + taille * 0.28, { ...style, taille, couleur: C.discret });
      this.ecrire(ligne, MARGE_X + 12, this.y + taille * 0.28, { ...style, taille });
    });
    this.y -= 2;
  }

  titreSection(numero: string, titre: string): void {
    this.place(70);
    this.y -= 24;
    this.page.drawRectangle({ x: MARGE_X, y: this.y - 4, width: 3, height: 18, color: C.bleu });
    this.ecrire(`${numero}  ${titre}`, MARGE_X + 10, this.y, { police: "grasse", taille: 13, couleur: C.encre });
    this.y -= 14;
  }

  sousTitre(titre: string, complement?: string): void {
    this.place(44);
    this.y -= 10;
    this.ecrire(titre, MARGE_X, this.y, { police: "grasse", taille: 10, couleur: C.encre });
    if (complement) {
      const x = MARGE_X + this.largeur(this.propre(titre), "grasse", 10) + 8;
      const lignes = this.couper(complement, "normale", 8, A4[0] - MARGE_X - x);
      this.ecrire(lignes[0] ?? "", x, this.y, { taille: 8, couleur: C.discret });
    }
    this.y -= 8;
  }

  /** Pastille colorée posée sur la ligne de base y. Renvoie sa largeur. */
  pastille(texte: string, x: number, y: number, teinte: Teinte, taille = 7.5): number {
    const t = this.propre(texte);
    const l = this.largeur(t, "grasse", taille) + 8;
    const c = TEINTES[teinte];
    this.page.drawRectangle({ x, y: y - taille * 0.38, width: l, height: taille * 1.5, color: c.fond, borderColor: c.bord, borderWidth: 0.6 });
    this.page.drawText(t, { x: x + 4, y, size: taille, font: this.polices.grasse, color: c.texte });
    return l;
  }

  /** Encadré teinté avec un titre et un texte. */
  encadre(titre: string, texte: string, teinte: Teinte, lignesSup: string[] = []): void {
    const c = TEINTES[teinte];
    const lignes = this.couper(texte, "normale", 9, LARGEUR - 28);
    const sup = lignesSup.flatMap((l) => this.couper(l, "grasse", 8.5, LARGEUR - 28));
    const h = 12 + 15 + lignes.length * 12.4 + sup.length * 11.5 + 8;
    this.place(h + 6);
    const bas = this.y - h;
    this.page.drawRectangle({ x: MARGE_X, y: bas, width: LARGEUR, height: h, color: c.fond, borderColor: c.bord, borderWidth: 0.8 });
    this.page.drawRectangle({ x: MARGE_X, y: bas, width: 4, height: h, color: c.texte });
    let y = this.y - 20;
    this.ecrire(titre, MARGE_X + 14, y, { police: "grasse", taille: 12, couleur: c.texte });
    y -= 15;
    for (const l of lignes) {
      this.ecrire(l, MARGE_X + 14, y, { taille: 9, couleur: C.encre });
      y -= 12.4;
    }
    for (const l of sup) {
      this.ecrire(l, MARGE_X + 14, y, { police: "grasse", taille: 8.5, couleur: C.texte });
      y -= 11.5;
    }
    this.y = bas - 8;
  }

  /** Grille de paires libellé / valeur sur plusieurs colonnes. */
  grille(paires: Array<[string, string]>, colonnes = 2): void {
    const l = LARGEUR / colonnes;
    for (let i = 0; i < paires.length; i += colonnes) {
      const rang = paires.slice(i, i + colonnes).map(([libelle, valeur]) => ({ libelle, lignes: this.couper(valeur || "—", "grasse", 9, l - 12) }));
      const h = 11 + Math.max(...rang.map((r) => r.lignes.length)) * 11.5 + 6;
      this.place(h);
      rang.forEach((r, j) => {
        const x = MARGE_X + j * l;
        this.ecrire(r.libelle, x, this.y - 9, { taille: 7.5, couleur: C.discret });
        r.lignes.forEach((ligne, k) => this.ecrire(ligne, x, this.y - 21 - k * 11.5, { police: "grasse", taille: 9, couleur: C.encre }));
      });
      this.y -= h;
    }
    this.y -= 2;
  }

  /** Rangée de tuiles d'indicateurs. */
  tuiles(tuiles: Array<{ valeur: string; libelle: string; detail: string; teinte: Teinte }>): void {
    const ecart = 8;
    const l = (LARGEUR - ecart * (tuiles.length - 1)) / tuiles.length;
    const h = 62;
    this.place(h + 8);
    const bas = this.y - h;
    tuiles.forEach((t, i) => {
      const x = MARGE_X + i * (l + ecart);
      const c = TEINTES[t.teinte];
      this.page.drawRectangle({ x, y: bas, width: l, height: h, color: C.blanc, borderColor: C.trait, borderWidth: 0.8 });
      this.page.drawRectangle({ x, y: bas + h - 3, width: l, height: 3, color: c.texte });
      this.ecrire(t.libelle, x + 8, this.y - 15, { taille: 7.5, couleur: C.discret });
      this.ecrire(t.valeur, x + 8, this.y - 35, { police: "grasse", taille: 17, couleur: c.texte });
      this.couper(t.detail, "normale", 7, l - 16)
        .slice(0, 2)
        .forEach((ligne, k) => this.ecrire(ligne, x + 8, this.y - 47 - k * 8.5, { taille: 7, couleur: C.texte }));
    });
    this.y = bas - 10;
  }

  /** Tableau à lignes de hauteur variable ; l'en-tête est répété à chaque page. */
  tableau(colonnes: Colonne[], lignes: Cellule[][], taille = 7.8): void {
    const total = colonnes.reduce((n, c) => n + c.poids, 0);
    const largeurs = colonnes.map((c) => (c.poids / total) * LARGEUR);
    const xs = largeurs.map((_, i) => MARGE_X + largeurs.slice(0, i).reduce((n, l) => n + l, 0));
    const pad = 4;
    const interligne = taille * 1.32;
    const hEntete = taille + 9;

    const dessinerEntete = () => {
      this.page.drawRectangle({ x: MARGE_X, y: this.y - hEntete, width: LARGEUR, height: hEntete, color: C.fondFonce });
      colonnes.forEach((c, i) => {
        const t = this.propre(c.titre);
        const x = c.alignement === "droite" ? xs[i] + largeurs[i] - pad - this.largeur(t, "grasse", taille - 0.5) : xs[i] + pad;
        this.ecrire(t, x, this.y - hEntete + 4.5, { police: "grasse", taille: taille - 0.5, couleur: C.discret });
      });
      this.y -= hEntete;
    };

    const preparer = (ligne: Cellule[]) =>
      ligne.map((cellule, i) => {
        const c = typeof cellule === "string" ? { texte: cellule } : cellule;
        const police = c.teinte ? "grasse" : (c.police ?? "normale");
        return { ...c, police, lignes: this.couper(c.texte, police, taille, largeurs[i] - 2 * pad - (c.teinte ? 8 : 0)) };
      });

    const premiere = lignes[0] ? preparer(lignes[0]) : [];
    const hPremiere = Math.max(1, ...premiere.map((c) => c.lignes.length)) * interligne + 2 * pad;
    this.place(hEntete + hPremiere + 2);
    dessinerEntete();

    lignes.forEach((ligne, rang) => {
      const cellules = preparer(ligne);
      const h = Math.max(1, ...cellules.map((c) => c.lignes.length)) * interligne + 2 * pad;
      if (this.place(h)) dessinerEntete();
      if (rang % 2 === 1) this.page.drawRectangle({ x: MARGE_X, y: this.y - h, width: LARGEUR, height: h, color: C.fond });
      cellules.forEach((c, i) => {
        c.lignes.forEach((texte, k) => {
          const yLigne = this.y - pad - taille - k * interligne + 1.5;
          if (c.teinte) {
            this.pastille(texte, xs[i] + pad, yLigne, c.teinte, taille - 0.6);
            return;
          }
          const x = colonnes[i].alignement === "droite" ? xs[i] + largeurs[i] - pad - this.largeur(texte, c.police, taille) : xs[i] + pad;
          this.ecrire(texte, x, yLigne, { police: c.police, taille, couleur: c.couleur ?? C.encre });
        });
      });
      this.y -= h;
      this.page.drawLine({ start: { x: MARGE_X, y: this.y }, end: { x: MARGE_X + LARGEUR, y: this.y }, thickness: 0.4, color: C.trait });
    });
    this.y -= 8;
  }

  /** Pied de page sur toutes les pages, une fois leur nombre connu. */
  piedsDePage(gauche: string): void {
    const pages = this.doc.getPages();
    pages.forEach((page, i) => {
      page.drawLine({ start: { x: MARGE_X, y: 36 }, end: { x: A4[0] - MARGE_X, y: 36 }, thickness: 0.5, color: C.trait });
      page.drawText(this.propre(gauche), { x: MARGE_X, y: 24, size: 7, font: this.polices.normale, color: C.discret });
      const droite = `Page ${i + 1} / ${pages.length}`;
      page.drawText(droite, { x: A4[0] - MARGE_X - this.largeur(droite, "normale", 7), y: 24, size: 7, font: this.polices.normale, color: C.discret });
    });
  }
}

// --- Le rapport ----------------------------------------------------------------

function nomComplet(r: RapportControle): string {
  const u = r.usager;
  const ne = u.civilite === "Madame" ? "née" : u.civilite === "Monsieur" ? "né" : "né(e)";
  const nom = u.nomUsage ? `${u.nomUsage} (${ne} ${u.nomNaissance ?? "?"})` : (u.nomNaissance ?? "nom non lu");
  return [u.civilite, u.prenoms, nom].filter(Boolean).join(" ");
}

function libelleRapprochement(r: RapportControle): string {
  const rp = r.usager.rapprochement;
  if (rp.decision === "existant") return `Usager existant ${rp.numeroUsager ?? ""}${rp.critere ? ` (${rp.critere.toLowerCase()})` : ""}`;
  if (rp.decision === "nouveau") return "Nouvel usager, à créer dans Solis";
  return "Non confirmé";
}

function indiceTexte(indice: number | null): string {
  return indice === null ? "—" : `${indice} / 100`;
}

export type RapportPdf = { octets: Uint8Array; nbPages: number; nomFichier: string };

export async function rendreRapportPdf(r: RapportControle, options: { logoPng?: Uint8Array } = {}): Promise<RapportPdf> {
  const date = new Date(r.genereLe);
  const doc = await PDFDocument.create();
  const polices: Polices = {
    normale: await doc.embedFont(StandardFonts.Helvetica),
    grasse: await doc.embedFont(StandardFonts.HelveticaBold),
    italique: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  let logo: PDFImage | null = null;
  if (options.logoPng) {
    try {
      logo = await doc.embedPng(options.logoPng);
    } catch {
      logo = null;
    }
  }

  const w = new Redacteur(doc, polices, `${r.outil.nom} · Rapport de contrôle · ${r.dossier.numeroEnregistrement} · dossier ${r.dossier.id} · ${nomComplet(r)}`);
  w.nouvellePage();

  // --- Première page : identification, verdict, indicateurs ---------------------
  const hautPage = A4[1] - 40;
  if (logo) {
    const h = 40;
    w.page.drawImage(logo, { x: MARGE_X, y: hautPage - h, width: (logo.width / logo.height) * h, height: h });
  } else {
    w.ecrire(r.outil.nom, MARGE_X, hautPage - 26, { police: "grasse", taille: 22, couleur: C.bleu });
  }
  const droite = [r.outil.collectivite, "Pôle autonomie · accueil des demandes", `Généré le ${dateHeure(r.genereLe)}`];
  droite.forEach((t, i) => {
    const s = w.propre(t);
    w.ecrire(s, A4[0] - MARGE_X - w.largeur(s, i === 0 ? "grasse" : "normale", 8), hautPage - 10 - i * 11, {
      police: i === 0 ? "grasse" : "normale",
      taille: 8,
      couleur: i === 0 ? C.encre : C.discret,
    });
  });
  w.y = hautPage - 66;
  w.ecrire("Rapport de contrôle du dossier", MARGE_X, w.y, { police: "grasse", taille: 20, couleur: C.encre });
  w.y -= 16;
  w.ecrire("Demande d'aides à l'autonomie à domicile (CERFA 16301*01) · déliassage, contrôle des données, complétude et conformité", MARGE_X, w.y, {
    taille: 8.5,
    couleur: C.discret,
  });
  w.y -= 14;
  w.page.drawLine({ start: { x: MARGE_X, y: w.y }, end: { x: A4[0] - MARGE_X, y: w.y }, thickness: 0.8, color: C.trait });
  w.y -= 4;

  w.grille(
    [
      ["Usager", nomComplet(r)],
      ["Date de naissance · NIR", `${r.usager.dateNaissance ?? "non lue"} · ${r.usager.nir ?? "NIR non lu"}`],
      ["Numéro d'enregistrement", r.dossier.numeroEnregistrement],
      ["Dossier GED", `${r.dossier.id} · lot ${r.dossier.lot.replace("lot-", "#")} · ${r.dossier.nbPages} pages`],
      ["Reçu le", r.dossier.dateReception],
      ["Pris en charge le", dateHeure(r.dossier.prisEnChargeLe)],
      ["Rapprochement Solis", libelleRapprochement(r)],
      ["Transmission", `${LIBELLES_STATUT[r.dossier.statutTransmission]}${r.usager.rapprochement.demandeEnCours ? ` · rattachée à la demande ${r.usager.rapprochement.demandeEnCours}` : ""}`],
    ],
    2,
  );

  w.encadre(r.synthese.libelleVerdict, r.synthese.texte, TEINTE_VERDICT[r.synthese.verdict], [
    r.dossier.dateCompletude ? `Date de dossier complet : ${r.dossier.dateCompletude}` : "Date de dossier complet : non fixée, le dossier est incomplet",
  ]);

  const g = r.ocr.global;
  const piecesRetenues = r.deliassage.pieces.filter((p) => p.traitement !== "ecartee");
  w.tuiles([
    {
      valeur: indiceTexte(g.indice),
      libelle: "Robustesse de la lecture",
      detail: `${LIBELLES_NIVEAU[g.niveau]} · ${r.ocr.nbPages} pages lues par ${r.ocr.moteur}`,
      teinte: TEINTE_NIVEAU[g.niveau],
    },
    {
      valeur: String(piecesRetenues.length),
      libelle: "Pièces retenues",
      detail: `${r.ocr.pagesEcartees} page(s) écartée(s) au déliassage`,
      teinte: "primaire",
    },
    {
      valeur: String(g.champs),
      libelle: "Champs contrôlés",
      detail: `${g.confirmes} vérifié(s), ${g.corriges} corrigé(s), ${g.nonLus} non lu(s)`,
      teinte: g.nonLus > 0 ? "attention" : "primaire",
    },
    {
      valeur: `${r.synthese.nbBloquants} / ${r.synthese.nbAlertes}`,
      libelle: "Bloquants / alertes",
      detail: `${r.synthese.nbConformes} contrôle(s) conforme(s), ${r.synthese.nbInformations} information(s)`,
      teinte: r.synthese.nbBloquants ? "danger" : r.synthese.nbAlertes ? "attention" : "succes",
    },
  ]);

  const points = r.completude.controles.filter((c) => c.statut === "bloquant" || c.statut === "alerte");
  w.sousTitre("Points à signaler à l'instruction", `${points.length} point(s)`);
  if (points.length === 0) {
    w.paragraphe("Aucun point bloquant ni alerte.", { couleur: C.discret });
  } else {
    w.tableau(
      [
        { titre: "Statut", poids: 11 },
        { titre: "Règle", poids: 27 },
        { titre: "Constat", poids: 62 },
      ],
      points.map((c) => [{ texte: c.libelleStatut, teinte: TEINTE_CONTROLE[c.statut] }, { texte: c.libelle, police: "grasse" }, c.detail]),
    );
  }
  if (r.synthese.piecesManquantes.length) {
    w.sousTitre("Pièces manquantes");
    r.synthese.piecesManquantes.forEach((p) => w.puce(p));
    w.espace(6);
  }
  if (r.synthese.observations) {
    w.sousTitre("Observations de l'agent pour l'instruction");
    w.paragraphe(r.synthese.observations, { police: "italique" });
  }

  // --- 1. Robustesse de la lecture ------------------------------------------------
  w.nouvellePage();
  w.titreSection("1.", "Robustesse de la lecture (OCR)");
  w.paragraphe(
    `Le document de ${r.ocr.nbPages} pages a été lu par ${r.ocr.moteur} en ${r.ocr.dureeSecondes.toLocaleString("fr-FR")} s. Confiance moyenne du typage des pages : ${r.ocr.confianceTypage} %. ${r.ocr.pagesVides} page(s) vide(s) ou illisible(s).`,
  );
  w.grille(
    [
      ["Indice global", `${indiceTexte(g.indice)} · ${LIBELLES_NIVEAU[g.niveau]}`],
      ["Champs extraits", String(g.champs)],
      ["Vérifiés par l'agent", String(g.confirmes)],
      ["Corrigés par l'agent", String(g.corriges)],
      ["Lus, non vérifiés", String(g.lus)],
      ["Vides sur le document", String(g.vides)],
      ["Douteux", String(g.douteux)],
      ["Non lus", String(g.nonLus)],
    ],
    4,
  );
  w.sousTitre("Indice par page");
  w.tableau(
    [
      { titre: "Page", poids: 5, alignement: "droite" },
      { titre: "Doc.", poids: 5, alignement: "droite" },
      { titre: "Type reconnu", poids: 34 },
      { titre: "CERFA", poids: 6, alignement: "droite" },
      { titre: "Caract.", poids: 7, alignement: "droite" },
      { titre: "Typage", poids: 7, alignement: "droite" },
      { titre: "Champs", poids: 7, alignement: "droite" },
      { titre: "Non lus", poids: 8, alignement: "droite" },
      { titre: "Corrigés", poids: 8, alignement: "droite" },
      { titre: "Indice", poids: 13 },
    ],
    r.ocr.pages.map((p) => [
      String(p.numero),
      p.document ? String(p.document) : "—",
      { texte: `${p.libelleType}${p.ecartee ? " · écartée" : ""}`, couleur: p.ecartee ? C.discret : C.encre },
      p.pageCerfa ? String(p.pageCerfa) : "—",
      String(p.caracteres),
      `${p.confianceTypage} %`,
      String(p.champs),
      String(p.nonLus),
      String(p.corriges),
      p.indice === null ? { texte: "—", couleur: C.discret } : { texte: `${p.indice} · ${LIBELLES_NIVEAU[p.niveau]}`, teinte: TEINTE_NIVEAU[p.niveau] },
    ]),
  );
  w.sousTitre("Méthode de calcul");
  METHODE_ROBUSTESSE.forEach((m) => w.puce(m, { taille: 8, couleur: C.texte }));

  // --- 2. Déliassage --------------------------------------------------------------
  w.titreSection("2.", "Déliassage");
  w.paragraphe(
    `${r.deliassage.pieces.length} document(s) identifié(s), dont ${piecesRetenues.length} retenu(s) pour l'instruction et ${r.deliassage.pieces.length - piecesRetenues.length} écarté(s). Déliassage validé le ${dateHeure(r.deliassage.valideLe)}.`,
  );
  const TRAITEMENTS = { extraite: "Champs extraits", sans_extraction: "Jointe sans extraction", ecartee: "Écartée" } as const;
  w.tableau(
    [
      { titre: "Doc.", poids: 6, alignement: "droite" },
      { titre: "Pièce", poids: 38 },
      { titre: "Pages", poids: 16 },
      { titre: "Confiance", poids: 10, alignement: "droite" },
      { titre: "Typée par", poids: 12 },
      { titre: "Traitement", poids: 18 },
    ],
    r.deliassage.pieces.map((p) => [
      String(p.document),
      { texte: p.libelle, police: "grasse", couleur: p.traitement === "ecartee" ? C.discret : C.encre },
      plage(p.pages),
      `${p.confiance} %`,
      p.origine === "agent" ? { texte: "l'agent", teinte: "primaire" } : "l'outil",
      p.traitement === "ecartee" ? { texte: TRAITEMENTS.ecartee, teinte: "neutre" } : TRAITEMENTS[p.traitement],
    ]),
  );
  w.sousTitre("Reconnaissance de chaque page");
  w.tableau(
    [
      { titre: "Page", poids: 6, alignement: "droite" },
      { titre: "Type reconnu", poids: 36 },
      { titre: "Motif", poids: 58 },
    ],
    r.ocr.pages.map((p) => [String(p.numero), p.libelleType, p.justification]),
  );
  w.sousTitre("Interventions de l'agent");
  if (r.deliassage.interventions.length === 0) w.paragraphe("Aucune : le déliassage automatique a été validé tel quel.", { couleur: C.discret });
  else r.deliassage.interventions.forEach((e) => w.puce(`${dateHeure(e.horodatage)} · ${e.action}`));

  // --- 3. Contrôle des données ------------------------------------------------------
  w.nouvellePage();
  w.titreSection("3.", "Contrôle des données");
  w.paragraphe(
    `Champs extraits de chaque pièce et contrôlés par l'agent en regard du document (vidéocodage). Contrôle validé le ${dateHeure(r.controleDonnees.valideLe)}. Les champs marqués * sont critiques : leur vérification est obligatoire.`,
  );
  (Object.keys(LIBELLES_STATUT_CHAMP) as StatutChamp[]).forEach((s) => w.puce(`${LIBELLES_STATUT_CHAMP[s]} : ${DESCRIPTIONS_STATUT_CHAMP[s]}.`, { taille: 8 }));
  for (const piece of r.controleDonnees.pieces) {
    w.sousTitre(
      `Document ${piece.document} · ${piece.libelle}`,
      `${plage(piece.pages)} · ${piece.modele ? `extrait par ${piece.modele}` : "non extrait"} · indice ${indiceTexte(piece.indicateurs.indice)}`,
    );
    if (piece.erreur) w.paragraphe(`Extraction en erreur : ${piece.erreur}`, { couleur: TEINTES.danger.texte });
    if (piece.champs.length === 0) continue;
    w.tableau(
      [
        { titre: "", poids: 3 },
        { titre: "Champ", poids: 30 },
        { titre: "Valeur retenue", poids: 40 },
        { titre: "Conf.", poids: 7, alignement: "droite" },
        { titre: "État", poids: 13 },
        { titre: "Page", poids: 7, alignement: "droite" },
      ],
      piece.champs.map((c) => [
        { texte: c.critique ? "*" : "", police: "grasse", couleur: C.bleu },
        c.libelle,
        { texte: c.valeurRetenue === null ? "—" : libelleValeur(c.valeurRetenue), couleur: c.valeurRetenue === null ? C.discret : C.encre },
        c.statut === "corrige" ? "—" : `${Math.round(c.confiance * 100)} %`,
        { texte: LIBELLES_STATUT_CHAMP[c.statut], teinte: TEINTE_CHAMP[c.statut] },
        String(c.page),
      ]),
      7.6,
    );
    const corrections = piece.champs.filter((c) => c.statut === "corrige");
    if (corrections.length) {
      w.paragraphe(`Corrections apportées par l'agent (${corrections.length})`, { police: "grasse", taille: 8.5, apres: 2 });
      w.tableau(
        [
          { titre: "Champ", poids: 30 },
          { titre: "Valeur lue", poids: 35 },
          { titre: "Valeur retenue", poids: 35 },
        ],
        corrections.map((c) => [
          c.libelle,
          { texte: c.valeurLue === null ? "non lue" : libelleValeur(c.valeurLue), couleur: C.discret },
          { texte: c.valeurRetenue === null ? "vidée" : libelleValeur(c.valeurRetenue), police: "grasse" },
        ]),
        7.6,
      );
    }
  }

  // --- 4. Complétude et conformité ----------------------------------------------------
  w.nouvellePage();
  w.titreSection("4.", "Complétude et conformité");
  w.paragraphe(
    `${r.completude.controles.length} règles du moteur de règles métier appliquées. Elles disent si le dossier est complet et cohérent ; elles n'apprécient pas le droit à la prestation, qui relève de l'instruction dans Solis.`,
  );
  w.encadre(r.completude.libelleVerdict, r.completude.synthese, TEINTE_VERDICT[r.completude.verdict]);
  w.grille(
    [
      ["Reçu le", r.completude.delais.dateReception],
      ["Accusé de réception à émettre avant le", r.completude.delais.accuseReceptionAvant ?? "—"],
      ["Date de dossier complet", r.completude.delais.dateCompletude ?? "non fixée"],
    ],
    3,
  );
  for (const famille of ORDRE_FAMILLES) {
    const controles = r.completude.controles.filter((c) => c.famille === famille);
    if (controles.length === 0) continue;
    w.sousTitre(LIBELLES_FAMILLE[famille]);
    w.tableau(
      [
        { titre: "Statut", poids: 12 },
        { titre: "Règle", poids: 28 },
        { titre: "Constat", poids: 60 },
      ],
      controles.map((c) => [{ texte: c.libelleStatut, teinte: TEINTE_CONTROLE[c.statut] }, { texte: c.libelle, police: "grasse" }, c.detail]),
    );
  }

  // --- 5. Traçabilité ------------------------------------------------------------------
  w.titreSection("5.", "Traçabilité");
  w.paragraphe("Actions horodatées sur le dossier, de la prise en charge à la génération du rapport.");
  w.tableau(
    [
      { titre: "Horodatage", poids: 17 },
      { titre: "Étape", poids: 13 },
      { titre: "Action", poids: 70 },
    ],
    r.journal.map((e) => {
      const modif = e.avant !== null || e.apres !== null ? ` · ${e.avant ?? "(vide)"} -> ${e.apres ?? "(vide)"}` : "";
      return [dateHeure(e.horodatage), LIBELLES_CONTEXTE[e.contexte] ?? e.contexte, `${e.action}${e.detail ? ` · ${e.detail}` : ""}${modif}`];
    }),
    7.4,
  );
  w.sousTitre("Données structurées");
  w.paragraphe(
    `Ce PDF embarque sa version structurée en pièce jointe (${nomFichierRapport(r).replace(/\.pdf$/, ".json")}, schéma ${SCHEMA_RAPPORT} version ${VERSION_RAPPORT}), lisible par le logiciel métier sans ressaisie. Le rapport est généré à partir de l'état du dossier au ${dateHeure(r.genereLe)} ; toute modification ultérieure du dossier impose de le régénérer.`,
    { taille: 8.5 },
  );

  w.piedsDePage(`${r.outil.nom} · ${r.dossier.numeroEnregistrement} · rapport du ${dateSeule(r.genereLe)} · données fictives, démonstration`);

  // --- Métadonnées et pièce jointe ------------------------------------------------------
  const json = new TextEncoder().encode(JSON.stringify(r, null, 2));
  await doc.attach(json, nomFichierRapport(r).replace(/\.pdf$/, ".json"), {
    mimeType: "application/json",
    description: `Rapport de contrôle structuré (${SCHEMA_RAPPORT} v${VERSION_RAPPORT})`,
    creationDate: date,
    modificationDate: date,
  });
  doc.setTitle(`Rapport de contrôle ${r.dossier.numeroEnregistrement}`);
  doc.setAuthor(`${r.outil.nom} — ${r.outil.collectivite}`);
  doc.setSubject(`Dossier ${r.dossier.id} · ${r.synthese.libelleVerdict}`);
  doc.setKeywords(["rapport de contrôle", "APA", "CERFA 16301*01", r.dossier.numeroEnregistrement, r.dossier.id]);
  doc.setCreator(`${r.outil.nom} ${r.outil.version}`);
  doc.setProducer(`${r.outil.nom} (pdf-lib)`);
  doc.setLanguage("fr-FR");
  doc.setCreationDate(date);
  doc.setModificationDate(date);

  const octets = await doc.save();
  return { octets, nbPages: doc.getPageCount(), nomFichier: nomFichierRapport(r) };
}
