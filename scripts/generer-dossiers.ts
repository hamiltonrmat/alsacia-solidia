/**
 * Génère les dossiers fictifs en PDF à partir du CERFA officiel.
 *
 * Pour chaque dossier de src/data/dossiers-fictifs.ts :
 *  1. le CERFA 16301*01 est rempli champ par champ (formulaire AcroForm),
 *     les cases à cocher sont marquées d'une croix, puis le formulaire est
 *     aplati pour ressembler à un document imprimé ;
 *  2. les pièces jointes (CNI, RIB, avis d'imposition, jugement) sont
 *     dessinées sur des pages A4 ;
 *  3. le tout est assemblé dans l'ordre de « numérisation » décrit par la
 *     composition du dossier, rasterisé page par page (150 dpi, JPEG) pour
 *     ressembler à un scan, et écrit dans public/ged/<lot>/<id>.pdf.
 *
 * Lancer : npm run generer:dossiers
 * Variables : VECTORIEL=1 (pas de rasterisation), DPI_SCAN, QUALITE_JPEG.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFFont,
  PDFForm,
  PDFName,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { DOSSIERS_FICTIFS, LOTS_GED } from "../src/data/dossiers-fictifs";
import type {
  Adresse,
  CertificatMedical,
  DossierFictif,
  FormulaireCerfa,
  NiveauRealisation,
  PieceAvisImposition,
  PieceCni,
  PieceJugement,
  PieceRib,
} from "../src/data/types";
import { formaterIban, formaterNir } from "../src/lib/identifiants";

const RACINE = path.resolve(import.meta.dirname, "..");
const MODELE = path.join(RACINE, "Formulaire_demande_autonomie_cerfa_16301-01.pdf");
const SORTIE = process.env.SORTIE_DIR ?? path.join(RACINE, "public", "ged");

/** Options d'expérimentation du rendu des cases (voir CLAUDE.md, section OCR). */
const OPTIONS = {
  /** "x" : glyphe X gras ; "zapf" : croix ZapfDingbats. */
  styleMarque: process.env.STYLE_MARQUE ?? "zapf",
  tailleMarque: Number(process.env.TAILLE_MARQUE ?? 8),
  contourCases: (process.env.CONTOUR_CASES ?? "1") === "1",
  /** Liste d'identifiants séparés par des virgules pour ne générer qu'une partie des dossiers. */
  dossiers: process.env.DOSSIERS?.split(",").map((s) => s.trim()).filter(Boolean),
};

// ---------------------------------------------------------------------------
// Index des widgets du formulaire (page, position) → nom de champ
// ---------------------------------------------------------------------------

type Widget = {
  page: number;
  name: string;
  ft: string;
  x: number;
  yTop: number;
  w: number;
  h: number;
  rect: { x: number; y: number; width: number; height: number };
};

function indexerWidgets(doc: PDFDocument): Widget[] {
  const widgets: Widget[] = [];
  doc.getPages().forEach((page, index) => {
    const hauteur = page.getHeight();
    const annots = page.node.Annots();
    if (!annots) return;
    for (let i = 0; i < annots.size(); i++) {
      const dict = doc.context.lookup(annots.get(i), PDFDict);
      if (!dict || dict.get(PDFName.of("Subtype"))?.toString() !== "/Widget") continue;
      const parentRef = dict.get(PDFName.of("Parent"));
      const parent = parentRef ? doc.context.lookup(parentRef, PDFDict) : undefined;
      const tObj = dict.get(PDFName.of("T")) ?? parent?.get(PDFName.of("T"));
      const name = tObj ? (doc.context.lookup(tObj) as unknown as { decodeText(): string }).decodeText() : "?";
      const ft = (dict.get(PDFName.of("FT")) ?? parent?.get(PDFName.of("FT")))?.toString() ?? "?";
      const rect = doc.context.lookup(dict.get(PDFName.of("Rect")), PDFArray).asRectangle();
      widgets.push({
        page: index + 1,
        name,
        ft,
        x: rect.x,
        yTop: hauteur - rect.y - rect.height,
        w: rect.width,
        h: rect.height,
        rect,
      });
    }
  });
  return widgets;
}

/**
 * Remplit le CERFA en désignant les champs par leur page et leur position
 * verticale (et horizontale si nécessaire), telles que relevées dans le
 * formulaire officiel.
 */
class Remplisseur {
  private marques: Array<{ page: number; rect: Widget["rect"] }> = [];

  constructor(
    private readonly doc: PDFDocument,
    private readonly form: PDFForm,
    private readonly widgets: Widget[],
    private readonly police: PDFFont,
    private readonly policeGras: PDFFont,
  ) {}

  private candidats(page: number, y: number, ft: string, tolerance = 3): Widget[] {
    return this.widgets.filter((w) => w.page === page && w.ft === ft && Math.abs(w.yTop - y) <= tolerance);
  }

  private ligneWidget(page: number, y: number, x?: number): Widget {
    const lignes = this.candidats(page, y, "/Tx").filter((w) => w.w > 12);
    if (lignes.length === 0) throw new Error(`Aucun champ texte page ${page} y=${y}`);
    if (lignes.length === 1) return lignes[0];
    if (x === undefined) throw new Error(`Plusieurs champs texte page ${page} y=${y}, préciser x`);
    return lignes.reduce((a, b) => (Math.abs(a.x - x) <= Math.abs(b.x - x) ? a : b));
  }

  /** Champ texte sur une ligne. */
  texte(page: number, y: number, valeur: string | undefined, x?: number): void {
    if (!valeur) return;
    const champ = this.form.getTextField(this.ligneWidget(page, y, x).name);
    champ.setText(valeur);
    champ.updateAppearances(this.police);
  }

  /** Grand champ texte multiligne. */
  multiligne(page: number, y: number, valeur: string | undefined, x?: number, taille = 8): void {
    if (!valeur) return;
    const champ = this.form.getTextField(this.ligneWidget(page, y, x).name);
    champ.enableMultiline();
    champ.setFontSize(taille);
    champ.setText(valeur);
    champ.updateAppearances(this.police);
  }

  /** Série de cases à un caractère (date, NIR, téléphone, code postal). */
  cases(page: number, y: number, valeur: string | undefined): void {
    if (!valeur) return;
    const boites = this.candidats(page, y, "/Tx")
      .filter((w) => w.w <= 12)
      .sort((a, b) => a.x - b.x);
    const caracteres = valeur.replace(/\D/g, "");
    if (boites.length !== caracteres.length) {
      throw new Error(`Page ${page} y=${y} : ${boites.length} cases pour « ${valeur} » (${caracteres.length} chiffres)`);
    }
    boites.forEach((boite, i) => {
      const champ = this.form.getTextField(boite.name);
      champ.setText(caracteres[i]);
      champ.updateAppearances(this.police);
    });
  }

  /** Coche la case (bouton radio ou case à cocher) située à cette position. */
  coche(page: number, y: number, x: number): void {
    const boutons = this.candidats(page, y, "/Btn").filter((w) => Math.abs(w.x - x) <= 4);
    if (boutons.length !== 1) throw new Error(`Case introuvable page ${page} y=${y} x=${x} (${boutons.length} candidats)`);
    this.marques.push({ page, rect: boutons[0].rect });
  }

  /**
   * Aplatit le formulaire, redessine un contour uniforme pour toutes les
   * cases à cocher (certaines n'ont pas de bordure imprimée dans le CERFA),
   * puis marque d'une croix les cases cochées. Ce rendu est celui qui est le
   * mieux relu par l'OCR parmi les variantes testées.
   */
  async finaliser(): Promise<void> {
    this.form.flatten({ updateFieldAppearances: false });
    const pages = this.doc.getPages();
    if (OPTIONS.contourCases) {
      for (const w of this.widgets) {
        if (w.ft !== "/Btn") continue;
        pages[w.page - 1].drawRectangle({
          x: w.rect.x,
          y: w.rect.y,
          width: w.rect.width,
          height: w.rect.height,
          borderColor: rgb(0.15, 0.15, 0.2),
          borderWidth: 0.7,
          color: rgb(1, 1, 1),
        });
      }
    }
    const zapf = OPTIONS.styleMarque === "zapf" ? await this.doc.embedFont(StandardFonts.ZapfDingbats) : null;
    const glyphe = zapf ? "✘" : "X";
    const police = zapf ?? this.policeGras;
    const taille = OPTIONS.tailleMarque;
    for (const { page, rect } of this.marques) {
      const largeur = police.widthOfTextAtSize(glyphe, taille);
      pages[page - 1].drawText(glyphe, {
        x: rect.x + (rect.width - largeur) / 2,
        y: rect.y + (rect.height - taille * 0.72) / 2,
        size: taille,
        font: police,
        color: rgb(0.05, 0.05, 0.1),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Remplissage du formulaire (pages 5 à 9) et du certificat médical (11 à 13)
// ---------------------------------------------------------------------------

const X_OUI = 396;
const X_NON = 453;
const COLONNES_EVALUATION: Record<NiveauRealisation, number> = { seul: 239, avec_aide: 338, non_realise: 422, nsp: 509 };

function remplirFormulaire(r: Remplisseur, f: FormulaireCerfa): void {
  const d = f.demandeur;

  // Page 5 — 1. Situation du demandeur
  r.coche(5, 266, d.civilite === "Madame" ? 21 : 93);
  r.texte(5, 279, d.nomNaissance);
  r.texte(5, 296, d.nomUsage);
  r.texte(5, 311, d.prenoms);
  r.cases(5, 326, d.dateNaissance);
  r.texte(5, 343, d.communeNaissance);
  r.texte(5, 358, d.departementNaissance, 159);
  r.texte(5, 357, d.paysNaissance, 402);
  r.cases(5, 375, d.nir);
  r.coche(5, 407, { assurance_retraite: 21, fonction_publique: 135, msa: 279, autre: 327 }[f.caisseRetraite]);
  r.texte(5, 405, f.caisseRetraiteAutre);
  r.cases(5, 450, f.telephone);
  r.texte(5, 467, f.email);
  r.coche(5, { domicile: 500, domicile_famille: 513, accueillant_familial: 526, residence_autonomie: 539, autre: 553 }[f.typeDomicile], 21);
  r.texte(5, 551, f.typeDomicileAutre);
  r.texte(5, 603, f.adresse.voie);
  r.cases(5, 618, f.adresse.codePostal);
  r.texte(5, 620, f.adresse.commune);
  r.texte(5, 639, f.adresse.batiment, 73);
  r.texte(5, 639, f.adresse.etage, 200);
  r.texte(5, 639, f.adresse.digicode, 360);
  if (f.ancienneResidence) {
    r.texte(5, 743, f.ancienneResidence.adresse.voie);
    r.cases(5, 760, f.ancienneResidence.adresse.codePostal);
    r.texte(5, 759, f.ancienneResidence.adresse.commune, 288);
    r.cases(5, 777, f.ancienneResidence.dateArrivee);
  }

  // Page 6 — Situation familiale, conjoint, mesure de protection
  r.coche(6, 45, { celibataire: 28, marie: 114, pacse: 174, concubinage: 235, divorce: 345, veuf: 466 }[f.situationFamiliale]);
  if (f.conjoint) {
    const c = f.conjoint;
    r.coche(6, 133, c.civilite === "Madame" ? 28 : 100);
    r.texte(6, 149, c.nomNaissance);
    r.texte(6, 166, c.nomUsage);
    r.texte(6, 181, c.prenoms);
    r.cases(6, 196, c.dateNaissance);
    r.texte(6, 212, c.communeNaissance);
    r.texte(6, 227, c.departementNaissance, 166);
    r.texte(6, 227, c.paysNaissance, 409);
    r.cases(6, 243, c.nir);
    r.coche(6, { identique: 278, accueillant_familial: 294, ehpad: 309, autre: 325 }[c.domicile], 28);
    if (c.domicile === "ehpad") r.cases(6, 307, c.dateEntreeEhpad);
    if (c.domicile === "autre") r.texte(6, 324, c.domicileAutre);
  }
  r.coche(6, 392, { prononcee: 28, en_cours: 218, aucune: 436 }[f.protection.statut]);
  if (f.protection.mesure) {
    r.coche(
      6,
      {
        sauvegarde_justice: 426,
        curatelle_simple: 441,
        curatelle_renforcee: 457,
        tutelle: 473,
        habilitation_familiale: 489,
        mandat_protection_future: 505,
      }[f.protection.mesure],
      28,
    );
  }
  if (f.protection.organisme) {
    const o = f.protection.organisme;
    r.texte(6, 590, o.nom);
    r.coche(6, 620, o.civilite === "Madame" ? 28 : 97);
    r.texte(6, 635, o.nom_contact);
    r.texte(6, 653, o.prenoms);
    r.texte(6, 682, o.adresse.voie);
    r.cases(6, 699, o.adresse.codePostal);
    r.texte(6, 700, o.adresse.commune);
    r.cases(6, 728, o.telephone);
    r.texte(6, 747, o.email);
  }

  // Page 7 — Personne proche, organisme compétent, autres prestations
  if (f.proche) {
    const p = f.proche;
    r.coche(7, 137, p.civilite === "Madame" ? 28 : 100);
    r.texte(7, 151, p.nom);
    r.texte(7, 167, p.prenoms);
    r.texte(7, 184, p.adresse.voie);
    r.cases(7, 201, p.adresse.codePostal);
    r.texte(7, 201, p.adresse.commune, 295);
    r.cases(7, 223, p.telephone);
    r.texte(7, 240, p.email);
    r.coche(7, 286, { conjoint: 28, enfant: 100, ami: 162, voisin: 213, autre: 272 }[p.lien]);
    r.texte(7, 285, p.lienAutre);
  }
  const q = f.questionnaire;
  r.coche(7, 358, q.seLever === "oui" ? X_OUI : X_NON);
  r.coche(7, 374, q.sHabiller === "oui" ? X_OUI : X_NON);
  r.coche(7, 391, q.faireSaToilette === "oui" ? X_OUI : X_NON);
  r.coche(7, 408, q.manger === "oui" ? X_OUI : X_NON);
  const pr = f.prestations;
  r.coche(7, 700, pr.actp === "oui" ? X_OUI : X_NON);
  r.coche(7, 717, pr.aideSocialeDepartementale === "oui" ? X_OUI : X_NON);
  r.coche(7, 734, pr.mtp === "oui" ? X_OUI : X_NON);
  r.coche(7, 751, pr.pch === "oui" ? X_OUI : X_NON);
  r.coche(7, 767, pr.pcrtp === "oui" ? X_OUI : X_NON);

  // Page 8 — Ressources et patrimoine
  const rp = f.ressources.residencePrincipale;
  r.texte(8, 237, rp.adresse.voie);
  r.cases(8, 260, rp.adresse.codePostal);
  r.texte(8, 260, rp.adresse.commune, 295);
  r.coche(8, rp.statut === "proprietaire" ? 295 : 310, 28);
  if (rp.occupation) r.coche(8, { occupee: 355, louee: 370, non_louee: 385 }[rp.occupation], 28);
  const lignesBiens: Array<[number, number]> = [
    [460, 476],
    [497, 513],
    [535, 551],
  ];
  f.ressources.autresBiens.slice(0, 3).forEach((bien, i) => {
    const [yVoie, yCp] = lignesBiens[i];
    r.texte(8, yVoie, bien.voie);
    r.cases(8, yCp, bien.codePostal);
    r.texte(8, yCp, bien.commune, 295);
  });
  [670, 696, 721].forEach((y, i) => {
    const bien = f.ressources.biensMobiliers[i];
    if (!bien) return;
    r.texte(8, y, bien.nature, 34);
    r.texte(8, y, bien.valeur, 381);
  });

  // Page 9 — CMI et signature
  r.coche(9, 103, f.cmi.stationnement === "oui" ? 483 : 524);
  r.coche(9, 119, f.cmi.prioriteOuInvalidite === "oui" ? 483 : 524);
  r.coche(9, 136, f.cmi.renouvellement === "oui" ? 483 : 524);
  const s = f.signature;
  r.coche(9, 238, s.civilite === "Madame" ? 105 : 172);
  r.texte(9, 252, s.nom);
  r.texte(9, 267, s.prenoms);
  r.coche(9, s.qualite === "en_mon_nom" ? 282 : 297, 82);
  r.texte(9, 295, s.representeDe);
  r.texte(9, 355, s.lieu);
  r.cases(9, 371, s.date);
  r.multiligne(9, 384, `${s.prenoms} ${s.nom}`, undefined, 14);
}

function remplirCertificat(r: Remplisseur, cm: CertificatMedical): void {
  const p = cm.patient;
  // Page 11 — Coordonnées du patient, pathologies
  r.texte(11, 319, p.nomNaissance);
  r.texte(11, 337, p.nomUsage);
  r.texte(11, 355, p.prenoms);
  r.cases(11, 372, p.dateNaissance);
  r.texte(11, 391, p.adresse.voie);
  r.cases(11, 407, p.adresse.codePostal);
  r.texte(11, 409, p.adresse.commune);
  r.multiligne(11, 517, cm.pathologies, undefined, 9);

  // Page 12 — Prises en charge, perspective, mobilité, évaluation (1re table)
  r.multiligne(12, 92, cm.prisesEnCharge, undefined, 9);
  if (cm.perspective === "amelioration") {
    r.coche(12, 238, 28);
    if (cm.dureeLimitationsSiAmelioration) r.coche(12, 238, cm.dureeLimitationsSiAmelioration === "moins_1_an" ? 397 : 453);
  } else {
    r.coche(12, 261, { stabilite: 28, aggravation: 100, evolutivite_majeure: 190, non_definie: 314 }[cm.perspective]);
  }
  r.coche(12, 308, cm.perimetreMarche === "moins_200m" ? 195 : 263);
  const ouiNon12 = (y: number, v: "oui" | "non") => r.coche(12, y, v === "oui" ? 391 : 447);
  ouiNon12(336, cm.stationDeboutPenible);
  ouiNon12(353, cm.protheseMembresInferieurs);
  ouiNon12(370, cm.oxygenotherapie);
  ouiNon12(403, cm.aideHumaine);
  ouiNon12(420, cm.canne);
  ouiNon12(437, cm.deambulateur);
  ouiNon12(453, cm.fauteuilRoulant);
  r.coche(12, 470, cm.autreAideTechnique === "oui" ? 190 : 234);
  r.texte(12, 469, cm.autreAideTechniquePrecision);
  const e = cm.evaluation;
  r.coche(12, 560, COLONNES_EVALUATION[e.transferts]);
  r.coche(12, 586, COLONNES_EVALUATION[e.deplacementInterieur]);
  r.coche(12, 611, COLONNES_EVALUATION[e.deplacementExterieur]);
  r.coche(12, 631, COLONNES_EVALUATION[e.prehension]);
  r.coche(12, 651, COLONNES_EVALUATION[e.motriciteFine]);
  r.multiligne(12, 690, cm.precisionsMobilite);

  // Page 13 — Autres actes, cognition, signature du médecin
  r.coche(13, 65, COLONNES_EVALUATION[e.toilette]);
  r.coche(13, 80, COLONNES_EVALUATION[e.habillage]);
  r.coche(13, 100, COLONNES_EVALUATION[e.alimentation]);
  r.coche(13, 125, COLONNES_EVALUATION[e.eliminationUrinaire]);
  r.coche(13, 150, COLONNES_EVALUATION[e.eliminationFecale]);
  r.multiligne(13, 187, cm.precisionsActes);
  r.coche(13, 285, COLONNES_EVALUATION[e.orientationTemps]);
  r.coche(13, 303, COLONNES_EVALUATION[e.orientationEspace]);
  r.coche(13, 320, COLONNES_EVALUATION[e.securite]);
  r.coche(13, 337, COLONNES_EVALUATION[e.comportement]);
  r.multiligne(13, 370, cm.precisionsCognition);
  r.coche(13, 423, cm.coherenceReponses === "oui" ? 244 : 280);
  r.texte(13, 439, cm.scoreMms);
  r.multiligne(13, 470, cm.precisionsCognitionSuite);
  r.texte(13, 641, cm.lieu);
  r.cases(13, 658, cm.date);
  r.multiligne(13, 716, `${cm.medecin.nom}\nMédecin généraliste\n${cm.medecin.ville}\nRPPS ${cm.medecin.rpps}`, 35, 9);
  r.multiligne(13, 716, cm.medecin.nom, 331, 13);
}

// ---------------------------------------------------------------------------
// Pièces jointes dessinées
// ---------------------------------------------------------------------------

type Polices = { normale: PDFFont; grasse: PDFFont; italique: PDFFont };

const GRIS = rgb(0.45, 0.45, 0.5);
const NOIR = rgb(0.08, 0.08, 0.12);
const BLEU = rgb(0.1, 0.2, 0.5);

function formaterAdresse(a: Adresse): string {
  return `${a.voie}, ${a.codePostal} ${a.commune}`;
}

function formaterEuros(montant: number): string {
  return `${montant.toLocaleString("fr-FR").replace(/ /g, " ")} €`;
}

function piedDePage(page: PDFPage, polices: Polices): void {
  page.drawText("Document fictif généré pour la démonstration InstructOCR — ne correspond à aucune personne réelle.", {
    x: 40,
    y: 28,
    size: 7,
    font: polices.italique,
    color: GRIS,
  });
}

class Dessinateur {
  y: number;

  constructor(
    readonly page: PDFPage,
    readonly polices: Polices,
    yDepart = 790,
  ) {
    this.y = yDepart;
  }

  titre(texte: string, taille = 15, couleur = NOIR): void {
    this.page.drawText(texte, { x: 40, y: this.y, size: taille, font: this.polices.grasse, color: couleur });
    this.y -= taille + 8;
  }

  ligne(libelle: string, valeur: string, options: { x?: number; taille?: number } = {}): void {
    const x = options.x ?? 40;
    const taille = options.taille ?? 10;
    this.page.drawText(libelle, { x, y: this.y, size: taille, font: this.polices.grasse, color: NOIR });
    const largeur = this.polices.grasse.widthOfTextAtSize(libelle, taille);
    this.page.drawText(valeur, { x: x + largeur + 6, y: this.y, size: taille, font: this.polices.normale, color: NOIR });
    this.y -= taille + 6;
  }

  paragraphe(texte: string, taille = 9, largeurMax = 515): void {
    const mots = texte.split(" ");
    let courante = "";
    const lignes: string[] = [];
    for (const mot of mots) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (this.polices.normale.widthOfTextAtSize(essai, taille) > largeurMax) {
        lignes.push(courante);
        courante = mot;
      } else {
        courante = essai;
      }
    }
    if (courante) lignes.push(courante);
    for (const l of lignes) {
      this.page.drawText(l, { x: 40, y: this.y, size: taille, font: this.polices.normale, color: NOIR });
      this.y -= taille + 4;
    }
    this.y -= 4;
  }

  espace(hauteur = 10): void {
    this.y -= hauteur;
  }
}

function dessinerCni(doc: PDFDocument, polices: Polices, cni: PieceCni): void {
  const page = doc.addPage([595.28, 841.89]);
  const d = new Dessinateur(page, polices);
  d.titre("Photocopie de la pièce d'identité", 12, GRIS);
  d.espace(6);

  // Recto de la carte
  const carteX = 60;
  const carteY = 560;
  const carteL = 470;
  const carteH = 190;
  page.drawRectangle({ x: carteX, y: carteY, width: carteL, height: carteH, borderColor: NOIR, borderWidth: 1.2, color: rgb(0.96, 0.96, 0.98) });
  page.drawText("RÉPUBLIQUE FRANÇAISE", { x: carteX + 14, y: carteY + carteH - 22, size: 9, font: polices.grasse, color: BLEU });
  page.drawText("CARTE NATIONALE D'IDENTITÉ / IDENTITY CARD", { x: carteX + 14, y: carteY + carteH - 36, size: 10, font: polices.grasse, color: NOIR });
  page.drawRectangle({ x: carteX + 14, y: carteY + 18, width: 82, height: 105, color: rgb(0.8, 0.82, 0.86), borderColor: GRIS, borderWidth: 0.8 });
  page.drawText("PHOTO", { x: carteX + 38, y: carteY + 66, size: 8, font: polices.normale, color: GRIS });

  const champs: Array<[string, string]> = [
    ["NOM / Surname :", cni.nom],
    ...(cni.nomUsage ? ([["NOM D'USAGE / Alternate name :", cni.nomUsage]] as Array<[string, string]>) : []),
    ["Prénoms / Given names :", cni.prenoms.toUpperCase()],
    ["Sexe / Sex :", `${cni.sexe}     Nationalité / Nationality : FRA`],
    ["Date de naiss. / Date of birth :", cni.dateNaissance],
    ["Lieu de naissance / Place of birth :", cni.lieuNaissance],
    ["Taille / Height :", cni.taille],
    ["N° de la carte / Card number :", cni.numero],
  ];
  let y = carteY + carteH - 56;
  for (const [libelle, valeur] of champs) {
    page.drawText(libelle, { x: carteX + 110, y, size: 8, font: polices.grasse, color: BLEU });
    page.drawText(valeur, { x: carteX + 290, y, size: 9, font: polices.normale, color: NOIR });
    y -= 15;
  }

  // Verso de la carte
  const versoY = 340;
  page.drawRectangle({ x: carteX, y: versoY, width: carteL, height: carteH, borderColor: NOIR, borderWidth: 1.2, color: rgb(0.96, 0.96, 0.98) });
  const versoChamps: Array<[string, string]> = [
    ["Date de délivrance / Date of issue :", cni.dateDelivrance],
    ["Date d'expiration / Expiry date :", cni.dateExpiration],
    ["Autorité / Authority :", cni.autorite],
  ];
  y = versoY + carteH - 30;
  for (const [libelle, valeur] of versoChamps) {
    page.drawText(libelle, { x: carteX + 14, y, size: 8, font: polices.grasse, color: BLEU });
    page.drawText(valeur, { x: carteX + 220, y, size: 9, font: polices.normale, color: NOIR });
    y -= 16;
  }
  page.drawText("Signature du titulaire / Holder's signature :", { x: carteX + 14, y: versoY + 60, size: 8, font: polices.grasse, color: BLEU });
  page.drawText(`${cni.prenoms} ${cni.nom}`, { x: carteX + 230, y: versoY + 58, size: 11, font: polices.italique, color: NOIR });

  piedDePage(page, polices);
}

function dessinerRib(doc: PDFDocument, polices: Polices, rib: PieceRib): void {
  const page = doc.addPage([595.28, 841.89]);
  const d = new Dessinateur(page, polices);
  d.titre(rib.banque, 16, BLEU);
  d.ligne("Agence :", rib.domiciliation);
  d.espace(18);
  d.titre("RELEVÉ D'IDENTITÉ BANCAIRE", 14);
  d.espace(6);
  d.ligne("Titulaire du compte :", rib.titulaire);
  d.ligne("Domiciliation :", `${rib.banque} — ${rib.domiciliation}`);
  d.espace(14);

  const iban = rib.iban.replace(/\s+/g, "");
  const colonnes: Array<[string, string]> = [
    ["Code banque", iban.slice(4, 9)],
    ["Code guichet", iban.slice(9, 14)],
    ["Numéro de compte", iban.slice(14, 25)],
    ["Clé RIB", iban.slice(25, 27)],
  ];
  let x = 40;
  const largeurs = [90, 90, 160, 70];
  colonnes.forEach(([entete, valeur], i) => {
    page.drawRectangle({ x, y: d.y - 30, width: largeurs[i], height: 40, borderColor: NOIR, borderWidth: 0.8 });
    page.drawText(entete, { x: x + 6, y: d.y - 4, size: 8, font: polices.grasse, color: GRIS });
    page.drawText(valeur, { x: x + 6, y: d.y - 22, size: 11, font: polices.normale, color: NOIR });
    x += largeurs[i];
  });
  d.y -= 60;
  d.ligne("IBAN :", formaterIban(rib.iban), { taille: 12 });
  d.ligne("BIC :", rib.bic, { taille: 12 });
  d.espace(20);
  d.paragraphe(
    "Ce relevé d'identité bancaire permet à toute personne ou organisme d'effectuer des virements ou des prélèvements sur ce compte. Il est à joindre à toute demande de prestation.",
  );
  piedDePage(page, polices);
}

function dessinerAvisImposition(doc: PDFDocument, polices: Polices, avis: PieceAvisImposition): void {
  const page = doc.addPage([595.28, 841.89]);
  const d = new Dessinateur(page, polices);
  d.titre("DIRECTION GÉNÉRALE DES FINANCES PUBLIQUES", 11, BLEU);
  d.titre(`AVIS D'IMPÔT ${avis.anneeAvis}`, 18);
  d.titre(`IMPÔT SUR LES REVENUS DE L'ANNÉE ${avis.anneeRevenus}`, 12, GRIS);
  d.espace(10);
  d.ligne("Déclarant 1 :", avis.nom);
  if (avis.declarant2) d.ligne("Déclarant 2 :", avis.declarant2);
  d.ligne("Adresse :", formaterAdresse(avis.adresse));
  d.ligne("Numéro fiscal :", avis.numeroFiscal);
  d.espace(16);
  d.titre("Détail des revenus", 12);
  const revenuBrut = Math.round(avis.revenuFiscalReference * 1.11);
  d.ligne("Revenu brut global :", formaterEuros(revenuBrut));
  d.ligne("Revenu imposable :", formaterEuros(avis.revenuFiscalReference));
  d.ligne("Revenu fiscal de référence :", formaterEuros(avis.revenuFiscalReference), { taille: 12 });
  d.ligne("Nombre de parts :", String(avis.nombreParts).replace(".", ","));
  d.espace(16);
  d.titre("Impôt sur le revenu net", 12);
  d.ligne("Montant net de l'impôt :", formaterEuros(avis.impotNet), { taille: 12 });
  d.ligne("Situation :", avis.impotNet === 0 ? "Non imposable" : "Imposable");
  d.espace(20);
  d.paragraphe(
    "Cet avis vous est adressé pour vous informer de votre situation fiscale. Conservez-le, il vous sera demandé pour vos démarches administratives (demande de prestations sociales, logement, etc.).",
  );
  piedDePage(page, polices);
}

function dessinerJugement(doc: PDFDocument, polices: Polices, j: PieceJugement): void {
  const page = doc.addPage([595.28, 841.89]);
  const d = new Dessinateur(page, polices);
  d.titre(j.tribunal.toUpperCase(), 14, BLEU);
  d.titre("Juge des contentieux de la protection", 11, GRIS);
  d.espace(6);
  d.titre("JUGEMENT", 18);
  d.ligne("Date :", j.date);
  d.ligne("N° RG :", j.numeroRg);
  d.espace(14);
  const mesures: Record<PieceJugement["mesure"], string> = {
    sauvegarde_justice: "sauvegarde de justice",
    curatelle_simple: "curatelle simple",
    curatelle_renforcee: "curatelle renforcée",
    tutelle: "tutelle",
    habilitation_familiale: "habilitation familiale",
    mandat_protection_future: "mandat de protection future",
  };
  d.paragraphe(
    `Le juge, statuant publiquement, par jugement contradictoire et en premier ressort, ordonne l'ouverture d'une mesure de ${mesures[j.mesure]} à l'égard de ${j.personneProtegee.prenoms} ${j.personneProtegee.nom}, né(e) le ${j.personneProtegee.dateNaissance}.`,
    10,
  );
  d.paragraphe(
    `Désigne ${j.representant.prenoms} ${j.representant.nom} (${j.representant.organisme}) en qualité de représentant légal, pour une durée de 60 mois, avec mission de représenter la personne protégée dans les actes de la vie civile.`,
    10,
  );
  piedDePage(page, polices);
}

// ---------------------------------------------------------------------------
// Rasterisation : le PDF vectoriel devient une suite d'images, comme un scan
// ---------------------------------------------------------------------------

const DPI_SCAN = Number(process.env.DPI_SCAN ?? 150);
const QUALITE_JPEG = Number(process.env.QUALITE_JPEG ?? 70);

async function rasteriser(octets: Uint8Array): Promise<Uint8Array> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");
  const require = createRequire(import.meta.url);
  const standardFontDataUrl = path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts") + "/";

  const source = await pdfjs.getDocument({ data: octets, standardFontDataUrl, disableFontFace: true }).promise;
  const sortie = await PDFDocument.create();
  sortie.setProducer("InstructOCR — dossier fictif numérisé");
  for (let n = 1; n <= source.numPages; n++) {
    const page = await source.getPage(n);
    const viewport = page.getViewport({ scale: DPI_SCAN / 72 });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    const image = await sortie.embedJpg(await canvas.encode("jpeg", QUALITE_JPEG));
    const { width, height } = page.getViewport({ scale: 1 });
    sortie.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
  }
  return sortie.save();
}

// ---------------------------------------------------------------------------
// Assemblage des dossiers
// ---------------------------------------------------------------------------

async function genererDossier(modele: Uint8Array, dossier: DossierFictif): Promise<Uint8Array> {
  const cerfa = await PDFDocument.load(modele);
  const form = cerfa.getForm();
  const police = await cerfa.embedFont(StandardFonts.Helvetica);
  const policeGras = await cerfa.embedFont(StandardFonts.HelveticaBold);
  const remplisseur = new Remplisseur(cerfa, form, indexerWidgets(cerfa), police, policeGras);
  remplirFormulaire(remplisseur, dossier.formulaire);
  if (dossier.certificatMedical) remplirCertificat(remplisseur, dossier.certificatMedical);
  await remplisseur.finaliser();

  const sortie = await PDFDocument.create();
  sortie.setTitle(`Dossier ${dossier.id}`);
  sortie.setProducer("InstructOCR — générateur de dossiers fictifs");
  const polices: Polices = {
    normale: await sortie.embedFont(StandardFonts.Helvetica),
    grasse: await sortie.embedFont(StandardFonts.HelveticaBold),
    italique: await sortie.embedFont(StandardFonts.HelveticaOblique),
  };

  for (const element of dossier.composition) {
    switch (element.type) {
      case "cerfa": {
        const pages = await sortie.copyPages(cerfa, element.pages.map((p) => p - 1));
        pages.forEach((p) => sortie.addPage(p));
        break;
      }
      case "cni":
        if (!dossier.cni) throw new Error(`${dossier.id} : CNI absente des données`);
        dessinerCni(sortie, polices, dossier.cni);
        break;
      case "rib":
        if (!dossier.rib) throw new Error(`${dossier.id} : RIB absent des données`);
        dessinerRib(sortie, polices, dossier.rib);
        break;
      case "avis_imposition":
        if (!dossier.avisImposition) throw new Error(`${dossier.id} : avis d'imposition absent des données`);
        dessinerAvisImposition(sortie, polices, dossier.avisImposition);
        break;
      case "jugement":
        if (!dossier.jugement) throw new Error(`${dossier.id} : jugement absent des données`);
        dessinerJugement(sortie, polices, dossier.jugement);
        break;
    }
  }
  const vectoriel = await sortie.save();
  return process.env.VECTORIEL === "1" ? vectoriel : rasteriser(vectoriel);
}

async function main(): Promise<void> {
  const modele = new Uint8Array(readFileSync(MODELE));
  for (const lot of LOTS_GED) mkdirSync(path.join(SORTIE, lot.id), { recursive: true });

  const selection = OPTIONS.dossiers ? DOSSIERS_FICTIFS.filter((d) => OPTIONS.dossiers?.includes(d.id)) : DOSSIERS_FICTIFS;
  for (const dossier of selection) {
    const octets = await genererDossier(modele, dossier);
    const cible = path.join(SORTIE, dossier.lotId, `${dossier.id}.pdf`);
    writeFileSync(cible, octets);
    const nbPages = dossier.composition.reduce((n, e) => n + (e.type === "cerfa" ? e.pages.length : 1), 0);
    console.log(
      `${dossier.id}  ${dossier.formulaire.demandeur.nomNaissance.padEnd(8)} ${String(nbPages).padStart(2)} pages  ${(octets.length / 1024).toFixed(0).padStart(4)} Ko  NIR ${formaterNir(dossier.formulaire.demandeur.nir)}  → ${path.relative(RACINE, cible)}`,
    );
  }
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
