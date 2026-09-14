import type { TypePiece } from "@/lib/decoupage";
import type { Lecteur } from "@/lib/regles/conformite";
import { extractionParType, valeurEffective, type EtatDossier } from "@/store/dossier-store";

/**
 * Fonctions utilitaires sur l'état d'un dossier, utilisables côté client.
 */

/** Lecteur de valeurs effectives (corrigées par l'agent) par type de pièce et chemin. */
export function lecteurDepuisDossier(dossier: EtatDossier): Lecteur {
  return (type: TypePiece, chemin: string) => valeurEffective(extractionParType(dossier, type), chemin);
}

/** Nom affichable de l'usager, d'après le CERFA extrait. */
export function nomUsager(dossier: EtatDossier): string | null {
  const lire = lecteurDepuisDossier(dossier);
  const nom = lire("cerfa_formulaire", "demandeur.nom_usage") ?? lire("cerfa_formulaire", "demandeur.nom_naissance");
  const prenoms = lire("cerfa_formulaire", "demandeur.prenoms");
  if (!nom && !prenoms) return null;
  return [prenoms, nom?.toUpperCase()].filter(Boolean).join(" ");
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

/** Métadonnées transmises au logiciel métier lors de l'export. */
export function metadonneesExport(dossier: EtatDossier): Record<string, unknown> {
  const lire = lecteurDepuisDossier(dossier);
  const c = (chemin: string) => lire("cerfa_formulaire", chemin);
  return {
    source: {
      ged: { lot: dossier.lotId, dossier: dossier.id, pages: dossier.nbPages, dateReception: dossier.dateReception },
      outil: "InstructOCR v2",
      importeLe: dossier.importeLe,
    },
    usager: {
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
      representantLegal: c("protection.statut") === "prononcee" ? [c("protection.representant_prenoms"), c("protection.representant_nom"), c("protection.organisme_nom")].filter(Boolean).join(" — ") : null,
      caisseRetraite: c("caisse_retraite"),
      personneAContacter: {
        nom: [c("proche.prenoms"), c("proche.nom")].filter(Boolean).join(" "),
        lien: c("proche.lien"),
        telephone: c("proche.telephone"),
      },
    },
    demande: {
      type: "Demande d'aides à l'autonomie à domicile (CERFA 16301*01)",
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
    },
    pieces: (dossier.pieces ?? []).map((p) => ({
      type: p.type,
      pages: p.pages,
      extraite: Boolean(dossier.extractions[p.id]?.champs),
    })),
    instruction: {
      recevabilite: dossier.conformite?.recevabilite ?? null,
      piecesManquantes: dossier.conformite?.piecesManquantes ?? [],
      pointsAttention: (dossier.conformite?.controles ?? []).filter((x) => x.statut === "alerte" || x.statut === "bloquant").map((x) => x.libelle),
      orientationRecommandee: dossier.decision?.resultat.orientation ?? null,
      orientationRetenue: dossier.decision?.orientationRetenue ?? null,
      commentaireAgent: dossier.decision?.commentaire ?? null,
      girEstime: dossier.decision?.resultat.girEstime?.gir ?? null,
      decideLe: dossier.decision?.valideLe ?? null,
    },
  };
}
