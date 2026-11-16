import { NextResponse } from "next/server";
import { refuserSiNonAutorise } from "@/lib/garde-api";
import { genererNumeroDossier, genererNumeroUsager, rechercherCandidats, type CandidatSolis } from "@/data/solis";
import { estRapportControle } from "@/lib/rapport/modele";
import { rapportPdfServeur } from "@/lib/rapport/serveur";
import { STATUTS_TRANSMIS, type StatutDossier } from "@/lib/statuts";

/**
 * Connexion simulée au logiciel métier Solis.
 *
 * POST /api/solis { action: "rechercher", nir?, nomNaissance?, nomUsage?, dateNaissance? }
 *   → { candidats: CandidatSolis[] }
 * POST /api/solis { action: "enregistrer", dossierId, statut, numeroUsagerExistant?, numeroDemandeExistante?, metadonnees, rapport }
 *   → { action: "cree" | "rattache" | "mis_a_jour", numeroUsager, numeroDossier, statut, horodatage, documents }
 *
 * À l'enregistrement, Solis reçoit les métadonnées et le rapport de contrôle
 * structuré ; il en dépose la version PDF sous la demande et renvoie sa
 * référence et son empreinte.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

type Corps =
  | { action: "rechercher"; nir?: string | null; nomNaissance?: string | null; nomUsage?: string | null; dateNaissance?: string | null }
  | {
      action: "enregistrer";
      dossierId: string;
      statut: string;
      numeroUsagerExistant?: string | null;
      numeroDemandeExistante?: string | null;
      metadonnees: Record<string, unknown>;
      rapport: unknown;
    };

export async function POST(request: Request) {
  const refus = refuserSiNonAutorise(request);
  if (refus) return refus;

  let corps: Corps;
  try {
    corps = (await request.json()) as Corps;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  // Latence simulée de l'échange avec le logiciel métier.
  await new Promise((r) => setTimeout(r, 600));

  if (corps.action === "rechercher") {
    const candidats: CandidatSolis[] = rechercherCandidats({
      nir: corps.nir,
      nomNaissance: corps.nomNaissance,
      nomUsage: corps.nomUsage,
      dateNaissance: corps.dateNaissance,
    });
    return NextResponse.json({ candidats });
  }

  if (corps.action === "enregistrer") {
    if (!corps.dossierId || typeof corps.metadonnees !== "object" || !STATUTS_TRANSMIS.includes(corps.statut as StatutDossier)) {
      return NextResponse.json({ error: "dossierId, statut de transmission et metadonnees sont requis." }, { status: 400 });
    }
    if (!estRapportControle(corps.rapport)) {
      return NextResponse.json({ error: "Le rapport de contrôle est requis pour enregistrer la demande." }, { status: 400 });
    }

    let pdf: Awaited<ReturnType<typeof rapportPdfServeur>>;
    try {
      pdf = await rapportPdfServeur(corps.rapport);
    } catch (e) {
      return NextResponse.json({ error: `Rapport de contrôle illisible : ${e instanceof Error ? e.message : "erreur inconnue"}` }, { status: 422 });
    }

    const annee = new Date().getUTCFullYear();
    const existant = Boolean(corps.numeroUsagerExistant);
    const miseAJour = existant && Boolean(corps.numeroDemandeExistante);
    const numeroDossier = miseAJour ? (corps.numeroDemandeExistante as string) : genererNumeroDossier(annee);
    return NextResponse.json({
      action: miseAJour ? "mis_a_jour" : existant ? "rattache" : "cree",
      numeroUsager: existant ? corps.numeroUsagerExistant : genererNumeroUsager(),
      numeroDossier,
      statut: corps.statut,
      horodatage: new Date().toISOString(),
      documents: [
        {
          reference: `DOC-${numeroDossier}-${pdf.empreinte.slice(0, 8).toUpperCase()}`,
          type: "rapport_controle",
          nom: pdf.nomFichier,
          empreinte: pdf.empreinte,
          tailleOctets: pdf.octets.byteLength,
          nbPages: pdf.nbPages,
        },
      ],
    });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
