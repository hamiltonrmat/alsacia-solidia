import { NextResponse } from "next/server";
import { genererNumeroDossier, genererNumeroUsager, rechercherCandidats, type CandidatSolis } from "@/data/solis";

/**
 * Connexion simulée au logiciel métier Solis.
 *
 * POST /api/solis { action: "rechercher", nir?, nomNaissance?, nomUsage?, dateNaissance? }
 *   → { candidats: CandidatSolis[] }
 * POST /api/solis { action: "enregistrer", dossierId, statut, numeroUsagerExistant?, numeroDemandeExistante?, metadonnees }
 *   → { action: "cree" | "rattache" | "mis_a_jour", numeroUsager, numeroDossier, statut, horodatage }
 */

export const runtime = "nodejs";

type Corps =
  | { action: "rechercher"; nir?: string | null; nomNaissance?: string | null; nomUsage?: string | null; dateNaissance?: string | null }
  | {
      action: "enregistrer";
      dossierId: string;
      statut: string;
      numeroUsagerExistant?: string | null;
      numeroDemandeExistante?: string | null;
      metadonnees: Record<string, unknown>;
    };

export async function POST(request: Request) {
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
    if (!corps.dossierId || typeof corps.metadonnees !== "object" || !corps.statut) {
      return NextResponse.json({ error: "dossierId, statut et metadonnees sont requis." }, { status: 400 });
    }
    const annee = new Date().getUTCFullYear();
    const existant = Boolean(corps.numeroUsagerExistant);
    const miseAJour = existant && Boolean(corps.numeroDemandeExistante);
    return NextResponse.json({
      action: miseAJour ? "mis_a_jour" : existant ? "rattache" : "cree",
      numeroUsager: existant ? corps.numeroUsagerExistant : genererNumeroUsager(),
      numeroDossier: miseAJour ? corps.numeroDemandeExistante : genererNumeroDossier(annee),
      statut: corps.statut,
      horodatage: new Date().toISOString(),
    });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
