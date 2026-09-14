/**
 * Test de bout en bout du pipeline d'instruction, en ligne de commande.
 *
 * Enchaîne contre un serveur de développement en cours d'exécution :
 * OCR du dossier → découpage → extraction de chaque pièce → conformité →
 * décision → recherche de l'usager dans Solis. Affiche les résultats clés et
 * enregistre le détail en JSON.
 *
 * Lancer : npm run dev (dans un terminal) puis
 *          npx tsx scripts/tester-pipeline.ts D-2026-0305 [http://localhost:3000] [sortie.json]
 */

import { writeFileSync } from "node:fs";
import { classerPages, LIBELLES_PIECES, regrouperEnPieces, TYPES_A_ECARTER, TYPES_EXTRAITS, type Piece, type TypePiece } from "../src/lib/decoupage";
import { aplatirChamps } from "../src/lib/extraction/schemas";
import { evaluerConformite, type Lecteur } from "../src/lib/regles/conformite";
import { evaluerDecision } from "../src/lib/regles/decision";
import { trouverDossierFictif } from "../src/data/dossiers-fictifs";

const [, , dossierId = "D-2026-0305", base = "http://localhost:3000", sortie] = process.argv;

async function poster<T>(chemin: string, corps?: unknown): Promise<T> {
  const reponse = await fetch(`${base}${chemin}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  const data = (await reponse.json()) as T | { error: string };
  if (!reponse.ok || (typeof data === "object" && data !== null && "error" in data)) {
    throw new Error(`${chemin} → ${reponse.status} ${(data as { error?: string }).error ?? ""}`);
  }
  return data as T;
}

async function main() {
  const fictif = trouverDossierFictif(dossierId);
  if (!fictif) throw new Error(`Dossier ${dossierId} inconnu`);
  console.log(`\n=== ${dossierId} — ${fictif.scenario.titre} ===`);
  for (const a of fictif.scenario.attendu) console.log(`  attendu : ${a}`);

  // 1. OCR
  const debut = Date.now();
  const ocr = await poster<{ pages: Array<{ index: number; markdown: string }>; modele: string; dureeMs: number }>(`/api/dossiers/${dossierId}/ocr`);
  console.log(`\n[OCR] ${ocr.pages.length} pages en ${(ocr.dureeMs / 1000).toFixed(1)} s (${ocr.modele})`);

  // 2. Découpage
  const pagesClassees = classerPages(ocr.pages);
  const pieces = regrouperEnPieces(pagesClassees);
  console.log(`\n[Découpage] ${pieces.length} pièces`);
  for (const p of pieces) {
    console.log(`  ${LIBELLES_PIECES[p.type].padEnd(46)} p. ${p.pages.join(",").padEnd(12)} confiance ${(p.confiance * 100).toFixed(0)} %${TYPES_A_ECARTER.includes(p.type) ? "  (écartée)" : ""}`);
  }

  // 3. Extraction
  const extractions = new Map<TypePiece, Record<string, unknown>>();
  console.log("\n[Extraction]");
  for (const piece of pieces.filter((p: Piece) => TYPES_EXTRAITS.includes(p.type))) {
    if (extractions.has(piece.type)) continue;
    const markdown = piece.pages.map((n) => `<!-- page ${n} -->\n${ocr.pages[n - 1].markdown}`).join("\n\n");
    const t0 = Date.now();
    const res = await poster<{ modele: string; champs: Record<string, unknown>; usage: { promptTokens: number; completionTokens: number } }>("/api/extraction", { type: piece.type, markdown });
    extractions.set(piece.type, res.champs);
    const champs = aplatirChamps(res.champs);
    const nonLus = champs.filter((c) => c.valeur === null).length;
    const faibles = champs.filter((c) => c.valeur !== null && c.confiance < 0.5).length;
    console.log(`  ${LIBELLES_PIECES[piece.type].padEnd(46)} ${champs.length} champs, ${nonLus} non lus, ${faibles} douteux, ${((Date.now() - t0) / 1000).toFixed(1)} s, ${res.usage.promptTokens}+${res.usage.completionTokens} tokens`);
    for (const c of champs.filter((c) => c.valeur !== null && c.confiance < 0.5).slice(0, 6)) {
      console.log(`      douteux : ${c.libelle} = ${c.valeur} (${(c.confiance * 100).toFixed(0)} %)`);
    }
  }

  const lire: Lecteur = (type, chemin) => {
    let courant: unknown = extractions.get(type);
    for (const segment of chemin.split(".")) {
      if (typeof courant !== "object" || courant === null) return null;
      courant = (courant as Record<string, unknown>)[segment];
    }
    const v = (courant as { valeur?: unknown } | undefined)?.valeur;
    return typeof v === "string" ? v : null;
  };

  const cles = [
    "demandeur.civilite",
    "demandeur.nom_naissance",
    "demandeur.nom_usage",
    "demandeur.prenoms",
    "demandeur.date_naissance",
    "demandeur.nir",
    "caisse_retraite",
    "type_domicile",
    "situation_familiale",
    "protection.statut",
    "protection.mesure",
    "proche.lien",
    "questionnaire.se_lever",
    "questionnaire.s_habiller",
    "questionnaire.faire_sa_toilette",
    "questionnaire.manger",
    "prestations.pch",
    "residence_principale.statut",
    "residence_principale.occupation",
    "cmi.stationnement",
    "signature.qualite",
    "signature.date",
    "ancienne_residence.date_arrivee",
  ];
  console.log("\n[CERFA] valeurs lues");
  for (const c of cles) console.log(`  ${c.padEnd(36)} ${lire("cerfa_formulaire", c) ?? "∅"}`);
  if (extractions.has("cni")) console.log(`  CNI : ${lire("cni", "nom")} ${lire("cni", "prenoms")}, née ${lire("cni", "date_naissance")}, expire ${lire("cni", "date_expiration")}`);
  if (extractions.has("rib")) console.log(`  RIB : ${lire("rib", "titulaire")} — ${lire("rib", "iban")}`);
  if (extractions.has("avis_imposition")) console.log(`  Avis : ${lire("avis_imposition", "declarant_1")} / ${lire("avis_imposition", "declarant_2") ?? "-"}, revenus ${lire("avis_imposition", "annee_revenus")}, RFR ${lire("avis_imposition", "revenu_fiscal_reference")}`);
  if (extractions.has("certificat_medical")) console.log(`  CM : ${lire("certificat_medical", "patient.nom_naissance")}, ${lire("certificat_medical", "date")}, ${lire("certificat_medical", "medecin_nom")}, transferts=${lire("certificat_medical", "evaluation.transferts")}, toilette=${lire("certificat_medical", "evaluation.toilette")}`);

  // 4. Conformité
  const conformite = evaluerConformite({ pieces: pieces.filter((p) => !TYPES_A_ECARTER.includes(p.type)), lire, dateReception: fictif.dateReception });
  console.log(`\n[Conformité] ${conformite.recevabilite} — ${conformite.synthese}`);
  for (const c of conformite.controles.filter((c) => c.statut !== "ok")) console.log(`  ${c.statut.padEnd(9)} ${c.libelle} — ${c.detail}`);

  // 5. Décision
  const decision = evaluerDecision({ pieces, lire, dateReception: fictif.dateReception, recevabilite: conformite.recevabilite });
  console.log(`\n[Décision] ${decision.orientation} — ${decision.recommandation}`);
  for (const r of decision.regles) console.log(`  ${r.statut.padEnd(13)} ${r.libelle} — ${r.detail}`);
  if (decision.girEstime) console.log(`  GIR estimé ${decision.girEstime.gir} (${decision.girEstime.libelle})`);

  // 6. Solis
  const solis = await poster<{ trouve: boolean; usager?: { numeroUsager: string }; critere?: string }>("/api/solis", {
    action: "rechercher",
    nir: lire("cerfa_formulaire", "demandeur.nir"),
    nomNaissance: lire("cerfa_formulaire", "demandeur.nom_naissance"),
    dateNaissance: lire("cerfa_formulaire", "demandeur.date_naissance"),
  });
  console.log(`\n[Solis] ${solis.trouve ? `usager connu ${solis.usager?.numeroUsager} (par ${solis.critere}) → rattachement` : "usager inconnu → création"}`);
  console.log(`\nDurée totale ${((Date.now() - debut) / 1000).toFixed(0)} s`);

  if (sortie) {
    writeFileSync(sortie, JSON.stringify({ ocr, pagesClassees, pieces, extractions: Object.fromEntries(extractions), conformite, decision, solis }, null, 2));
    console.log(`Détail enregistré dans ${sortie}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
