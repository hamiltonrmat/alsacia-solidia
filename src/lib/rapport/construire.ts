import { LIBELLES_CRITERE } from "@/data/solis";
import { LIBELLES_PIECES, TYPES_A_ECARTER, TYPES_EXTRAITS, type Piece } from "@/lib/decoupage";
import { identiteLue, pagePourChamp, usagerRattache } from "@/lib/dossier-utils";
import { aplatirChamps, estChampCritique } from "@/lib/extraction/schemas";
import { MARQUE } from "@/lib/marque";
import { PARAMETRES } from "@/lib/regles/parametres";
import {
  dateLimiteAccuseReception,
  LIBELLES_FAMILLE,
  LIBELLES_STATUT_CONTROLE,
  LIBELLES_VERDICT,
  type ResultatConformite,
} from "@/lib/regles/conformite";
import type { EtatDossier, EvenementJournal, ExtractionPiece } from "@/store/dossier-store";
import { indicateursDe, SCHEMA_RAPPORT, VERSION_RAPPORT, type RapportControle, type StatutChamp } from "./modele";

/**
 * Construit le rapport de contrôle d'un dossier à partir de son état de
 * travail. Fonction pure : à état et horodatage égaux, rapport identique.
 */

type ChampRapport = RapportControle["controleDonnees"]["pieces"][number]["champs"][number];

function statutChamp(extraction: ExtractionPiece, chemin: string, valeur: string | null, confiance: number): StatutChamp {
  if (chemin in extraction.corrections) return "corrige";
  if (chemin in extraction.confirmations) return "confirme";
  if (valeur === null) return confiance >= PARAMETRES.seuilConfianceDouteuse ? "vide" : "non_lu";
  return confiance < PARAMETRES.seuilConfianceDouteuse ? "douteux" : "lu";
}

function champsDePiece(dossier: EtatDossier, piece: Piece, extraction: ExtractionPiece): ChampRapport[] {
  return aplatirChamps(extraction.champs).map((c) => {
    const corrige = c.chemin in extraction.corrections;
    return {
      chemin: c.chemin,
      libelle: c.libelle,
      page: pagePourChamp(dossier, piece, c.chemin),
      critique: estChampCritique(piece.type, c.chemin),
      valeurLue: c.valeur,
      valeurRetenue: corrige ? extraction.corrections[c.chemin] : c.valeur,
      confiance: Number(c.confiance.toFixed(2)),
      statut: statutChamp(extraction, c.chemin, c.valeur, c.confiance),
      extrait: c.extrait,
    };
  });
}

/** Remplace les codes de types de pièces (« cerfa_formulaire ») par leur libellé. */
function lisible(texte: string): string {
  if (texte in LIBELLES_PIECES) return LIBELLES_PIECES[texte as keyof typeof LIBELLES_PIECES];
  return texte.replace(/\(([a-z_]+)\)/g, (tout, code: string) => (code in LIBELLES_PIECES ? `(${LIBELLES_PIECES[code as keyof typeof LIBELLES_PIECES]})` : tout));
}

/** Journal sans la navigation entre étapes, qui n'a pas sa place dans un rapport. */
function journalUtile(journal: EvenementJournal[]): RapportControle["journal"] {
  return journal
    .filter((e) => e.contexte !== "navigation")
    .map((e) => ({
      horodatage: e.horodatage,
      contexte: e.contexte,
      action: lisible(e.action),
      detail: e.detail ? lisible(e.detail) : null,
      avant: e.avant ?? null,
      apres: e.apres ?? null,
    }));
}

export function construireRapport(
  dossier: EtatDossier,
  entree: { conformite: ResultatConformite; dateCompletude: string | null; genereLe: string },
): RapportControle {
  const { conformite, dateCompletude, genereLe } = entree;
  const identite = identiteLue(dossier);
  const rattache = usagerRattache(dossier);
  const pieces = dossier.pieces ?? [];
  const pagesClassees = dossier.pagesClassees ?? [];
  const numeroDocument = new Map(pieces.map((p, i) => [p.id, i + 1]));

  // --- Contrôle des données : champs de chaque pièce extraite --------------
  const piecesControlees = pieces
    .filter((p) => TYPES_EXTRAITS.includes(p.type) && dossier.extractions[p.id])
    .map((p) => {
      const extraction = dossier.extractions[p.id];
      const champs = extraction.champs ? champsDePiece(dossier, p, extraction) : [];
      return {
        document: numeroDocument.get(p.id) ?? 0,
        pieceId: p.id,
        type: p.type,
        libelle: LIBELLES_PIECES[p.type],
        pages: p.pages,
        modele: extraction.modele ?? null,
        erreur: extraction.erreur ?? null,
        indicateurs: indicateursDe(champs),
        champs,
      };
    });
  const tousLesChamps = piecesControlees.flatMap((p) => p.champs);

  // --- Robustesse de la lecture, page par page ---------------------------------
  const pages = pagesClassees.map((pc) => {
    const piece = pieces.find((p) => p.pages.includes(pc.numero));
    const champsPage = piecesControlees.filter((p) => p.pieceId === piece?.id).flatMap((p) => p.champs.filter((c) => c.page === pc.numero));
    const markdown = dossier.ocr?.pages[pc.numero - 1]?.markdown ?? "";
    return {
      numero: pc.numero,
      type: pc.type,
      libelleType: LIBELLES_PIECES[pc.type],
      document: piece ? (numeroDocument.get(piece.id) ?? null) : null,
      pageCerfa: pc.pageCerfa ?? null,
      ecartee: TYPES_A_ECARTER.includes(pc.type),
      caracteres: markdown.replace(/\s+/g, "").length,
      confianceTypage: Math.round(pc.confiance * 100),
      justification: pc.justification,
      apercu: pc.apercu,
      ...indicateursDe(champsPage),
    };
  });

  // --- Synthèse ----------------------------------------------------------------
  const compter = (statut: string) => conformite.controles.filter((c) => c.statut === statut).length;
  const decision = dossier.rapprochement?.decision;

  return {
    schema: SCHEMA_RAPPORT,
    version: VERSION_RAPPORT,
    genereLe,
    outil: { nom: MARQUE.nom, version: MARQUE.version, collectivite: MARQUE.collectivite },

    dossier: {
      id: dossier.id,
      numeroEnregistrement: dossier.numeroEnregistrement,
      lot: dossier.lotId,
      libelleGed: dossier.libelle,
      dateReception: dossier.dateReception,
      prisEnChargeLe: dossier.importeLe,
      nbPages: dossier.nbPages,
      dateCompletude,
      statutTransmission: conformite.verdict === "non_conforme" ? "transmis_incomplet" : "transmis_complet",
    },

    usager: {
      civilite: identite.civilite,
      nomNaissance: identite.nomNaissance,
      nomUsage: identite.nomUsage,
      prenoms: identite.prenoms,
      dateNaissance: identite.dateNaissance,
      nir: identite.nir,
      rapprochement: {
        decision: decision?.type ?? "non_confirme",
        numeroUsager: rattache?.usager.numeroUsager ?? null,
        critere: rattache ? LIBELLES_CRITERE[rattache.critere] : null,
        demandeEnCours: rattache?.demandeEnCours?.numero ?? null,
        confirmeLe: dossier.rapprochement?.confirmeLe ?? null,
      },
    },

    synthese: {
      verdict: conformite.verdict,
      libelleVerdict: LIBELLES_VERDICT[conformite.verdict],
      texte: conformite.synthese,
      nbBloquants: compter("bloquant"),
      nbAlertes: compter("alerte"),
      nbInformations: compter("info"),
      nbConformes: compter("ok"),
      piecesManquantes: conformite.piecesManquantes,
      observations: dossier.observations?.trim() || null,
    },

    ocr: {
      moteur: dossier.ocr?.modele ?? "inconnu",
      dureeSecondes: Number(((dossier.ocr?.dureeMs ?? 0) / 1000).toFixed(1)),
      nbPages: pagesClassees.length,
      confianceTypage: pagesClassees.length ? Math.round((pagesClassees.reduce((n, p) => n + p.confiance, 0) / pagesClassees.length) * 100) : 0,
      pagesEcartees: pages.filter((p) => p.ecartee).length,
      pagesVides: pages.filter((p) => p.type === "page_vide").length,
      global: indicateursDe(tousLesChamps),
      pages,
    },

    deliassage: {
      valideLe: dossier.decoupageValideLe ?? null,
      pieces: pieces.map((p, i) => ({
        document: i + 1,
        id: p.id,
        type: p.type,
        libelle: LIBELLES_PIECES[p.type],
        pages: p.pages,
        confiance: Math.round(p.confiance * 100),
        origine: p.automatique ? "automatique" : "agent",
        traitement: TYPES_A_ECARTER.includes(p.type) ? "ecartee" : TYPES_EXTRAITS.includes(p.type) ? "extraite" : "sans_extraction",
      })),
      interventions: dossier.journal
        .filter((e) => (e.contexte === "deliassage" || e.contexte === "typage") && e.action !== "Déliassage validé" && e.action !== "Typage des pièces validé")
        .map((e) => ({ horodatage: e.horodatage, action: e.action })),
    },

    controleDonnees: {
      valideLe: dossier.extractionValideeLe ?? null,
      pieces: piecesControlees,
    },

    completude: {
      valideLe: genereLe,
      verdict: conformite.verdict,
      libelleVerdict: LIBELLES_VERDICT[conformite.verdict],
      synthese: conformite.synthese,
      piecesManquantes: conformite.piecesManquantes,
      controles: conformite.controles.map((c) => ({
        id: c.id,
        famille: c.famille,
        libelleFamille: LIBELLES_FAMILLE[c.famille],
        libelle: c.libelle,
        statut: c.statut,
        libelleStatut: LIBELLES_STATUT_CONTROLE[c.statut],
        piece: c.piece ? LIBELLES_PIECES[c.piece] : null,
        detail: c.detail,
      })),
      delais: {
        dateReception: dossier.dateReception,
        accuseReceptionAvant: dateLimiteAccuseReception(dossier.dateReception),
        dateCompletude,
      },
    },

    journal: [
      ...journalUtile(dossier.journal),
      {
        horodatage: genereLe,
        contexte: "rapport",
        action: "Complétude et conformité validées, rapport de contrôle généré",
        detail: LIBELLES_VERDICT[conformite.verdict],
        avant: null,
        apres: null,
      },
    ],
  };
}
