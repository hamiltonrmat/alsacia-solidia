import type { CandidatSolis } from "@/data/solis";
import type { Piece, TypePiece } from "@/lib/decoupage";
import { pageCerfaPourChemin } from "@/lib/extraction/schemas";
import type { EntreeConformite, Lecteur } from "@/lib/regles/conformite";
import { pagesSousPliCachete } from "@/lib/secret-medical";
import { extractionParType, valeurEffective, type EtatDossier } from "@/store/dossier-store";

/**
 * Fonctions utilitaires sur l'état d'un dossier, utilisables côté client.
 */

/** Lecteur de valeurs effectives (corrigées par l'agent) par type de pièce et chemin. */
export function lecteurDepuisDossier(dossier: EtatDossier): Lecteur {
  return (type: TypePiece, chemin: string) => valeurEffective(extractionParType(dossier, type), chemin);
}

/** Identité du demandeur telle que lue et corrigée sur le CERFA. */
export function identiteLue(dossier: EtatDossier) {
  const lire = lecteurDepuisDossier(dossier);
  return {
    civilite: lire("cerfa_formulaire", "demandeur.civilite"),
    nomNaissance: lire("cerfa_formulaire", "demandeur.nom_naissance"),
    nomUsage: lire("cerfa_formulaire", "demandeur.nom_usage"),
    prenoms: lire("cerfa_formulaire", "demandeur.prenoms"),
    dateNaissance: lire("cerfa_formulaire", "demandeur.date_naissance"),
    nir: lire("cerfa_formulaire", "demandeur.nir"),
  };
}

/** Nom affichable de l'usager, d'après le CERFA extrait. */
export function nomUsager(dossier: EtatDossier): string | null {
  const i = identiteLue(dossier);
  const nom = i.nomUsage ?? i.nomNaissance;
  if (!nom && !i.prenoms) return null;
  return [i.prenoms, nom?.toUpperCase()].filter(Boolean).join(" ");
}

/** Markdown OCR concaténé des pages d'une pièce. */
export function markdownPiece(dossier: EtatDossier, pages: number[]): string {
  return pages
    .map((n) => {
      const page = dossier.ocr?.pages[n - 1];
      return `<!-- page ${n} -->\n${page?.markdown ?? ""}`;
    })
    .join("\n\n");
}

/** Numéros officiels des pages du formulaire présentes dans le dossier (doublons compris). */
export function pagesCerfaPresentes(dossier: EtatDossier): number[] {
  return (dossier.pagesClassees ?? [])
    .filter((p) => p.type === "cerfa_formulaire" && p.pageCerfa !== undefined)
    .map((p) => p.pageCerfa as number);
}

/** Page du dossier à afficher pour vérifier un champ d'une pièce. */
export function pagePourChamp(dossier: EtatDossier, piece: Piece, chemin: string): number {
  if (piece.type !== "cerfa_formulaire") return piece.pages[0];
  const cible = pageCerfaPourChemin(chemin);
  const page = piece.pages.find((n) => dossier.pagesClassees?.[n - 1]?.pageCerfa === cible);
  return page ?? piece.pages[0];
}

/** Pages dont l'image ne doit pas être montrée à l'agent (certificat médical). */
export function pagesMasquees(dossier: EtatDossier): number[] {
  return pagesSousPliCachete(dossier.pagesClassees);
}

/** Candidat Solis retenu par l'agent, s'il a rattaché un usager existant. */
export function usagerRattache(dossier: EtatDossier): CandidatSolis | null {
  const r = dossier.rapprochement;
  if (!r?.decision || r.decision.type !== "existant") return null;
  const numero = r.decision.numeroUsager;
  return r.candidats.find((c) => c.usager.numeroUsager === numero) ?? null;
}

/** Entrée « rapprochement » des règles de conformité. */
export function rapprochementPourConformite(dossier: EtatDossier): EntreeConformite["rapprochement"] {
  const r = dossier.rapprochement;
  if (!r?.decision) return { confirme: false, usager: null, demandeEnCours: null };
  const candidat = usagerRattache(dossier);
  return { confirme: true, usager: candidat?.usager ?? null, demandeEnCours: candidat?.demandeEnCours ?? null };
}

/** Métadonnées transmises au logiciel métier lors de l'enregistrement. */
export function metadonneesExport(dossier: EtatDossier): Record<string, unknown> {
  const lire = lecteurDepuisDossier(dossier);
  const c = (chemin: string) => lire("cerfa_formulaire", chemin);
  const rattache = usagerRattache(dossier);
  return {
    source: {
      ged: { lot: dossier.lotId, dossier: dossier.id, pages: dossier.nbPages, dateReception: dossier.dateReception },
      numeroEnregistrement: dossier.numeroEnregistrement,
      outil: "InstructOCR v2",
      importeLe: dossier.importeLe,
    },
    usager: {
      rapprochement: rattache ? { numeroUsager: rattache.usager.numeroUsager, critere: rattache.critere } : { nouveau: true },
      civilite: c("demandeur.civilite"),
      nomNaissance: c("demandeur.nom_naissance"),
      nomUsage: c("demandeur.nom_usage"),
      prenoms: c("demandeur.prenoms"),
      dateNaissance: c("demandeur.date_naissance"),
      lieuNaissance: [c("demandeur.commune_naissance"), c("demandeur.departement_naissance")].filter(Boolean).join(" "),
      nir: c("demandeur.nir"),
      situationFamiliale: c("situation_familiale"),
      adresse: { voie: c("adresse.voie"), codePostal: c("adresse.code_postal"), commune: c("adresse.commune") },
      telephone: c("telephone"),
      email: c("email"),
      typeDomicile: c("type_domicile"),
      mesureProtection: c("protection.statut") === "prononcee" ? c("protection.mesure") : null,
      representantLegal:
        c("protection.statut") === "prononcee"
          ? [c("protection.representant_prenoms"), c("protection.representant_nom"), c("protection.organisme_nom")].filter(Boolean).join(" — ")
          : null,
      caisseRetraite: c("caisse_retraite"),
      personneAContacter: {
        nom: [c("proche.prenoms"), c("proche.nom")].filter(Boolean).join(" "),
        lien: c("proche.lien"),
        telephone: c("proche.telephone"),
      },
    },
    demande: {
      type: "Demande d'aides à l'autonomie à domicile (CERFA 16301*01)",
      dateReception: dossier.dateReception,
      dateCompletude: dossier.dateCompletude ?? null,
      dateSignature: c("signature.date"),
      questionnaireAutonomie: {
        seLever: c("questionnaire.se_lever"),
        sHabiller: c("questionnaire.s_habiller"),
        faireSaToilette: c("questionnaire.faire_sa_toilette"),
        manger: c("questionnaire.manger"),
      },
      demandeCmi: {
        stationnement: c("cmi.stationnement"),
        prioriteOuInvalidite: c("cmi.priorite_ou_invalidite"),
      },
      rib: { iban: lire("rib", "iban"), bic: lire("rib", "bic"), titulaire: lire("rib", "titulaire") },
      revenuFiscalReference: lire("avis_imposition", "revenu_fiscal_reference"),
      certificatMedical: dossier.pieces?.some((p) => p.type === "certificat_medical") ? "joint, sous pli cacheté, transmis à l'EMS" : "non joint",
    },
    pieces: (dossier.pieces ?? []).map((p) => ({
      type: p.type,
      pages: p.pages,
      extraite: Boolean(dossier.extractions[p.id]?.champs),
    })),
    preInstruction: {
      statut: dossier.statut,
      recevabilite: dossier.conformite?.recevabilite ?? null,
      piecesManquantes: dossier.conformite?.piecesManquantes ?? [],
      pointsAttention: (dossier.conformite?.controles ?? []).filter((x) => x.statut === "alerte" || x.statut === "bloquant").map((x) => x.libelle),
      orientationRecommandee: dossier.decision?.resultat.orientation ?? null,
      orientationRetenue: dossier.decision?.orientationRetenue ?? null,
      commentaireAgent: dossier.decision?.commentaire ?? null,
      courriers: dossier.courriers.map((x) => ({ type: x.type, genereLe: x.genereLe })),
      decideLe: dossier.decision?.valideLe ?? null,
      champsCorriges: Object.values(dossier.extractions).reduce((n, e) => n + Object.keys(e.corrections).length, 0),
      champsVerifies: Object.values(dossier.extractions).reduce((n, e) => n + Object.keys(e.confirmations).length, 0),
    },
  };
}
