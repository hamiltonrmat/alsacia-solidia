import { NextResponse } from "next/server";
import { genererNumeroDossier, genererNumeroUsager, rechercherUsagerSolis } from "@/data/solis";

/**
 * Connexion simulée au logiciel métier Solis.
 *
 * POST /api/solis  { action: "rechercher", nir?, nomNaissance?, dateNaissance? }
 *   → { trouve, usager?, critere? }
 * POST /api/solis  { action: "exporter", dossierId, usager: {...}, numeroUsagerExistant?, metadonnees }
 *   → { action: "cree" | "rattache", numeroUsager, numeroDossier, horodatage }
 */

export const runtime = "nodejs";

type Corps =
  | { action: "rechercher"; nir?: string | null; nomNaissance?: string | null; dateNaissance?: string | null }
  | {
      action: "exporter";
      dossierId: string;
      numeroUsagerExistant?: string | null;
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
  await new Promise((r) => setTimeout(r, 700));

  if (corps.action === "rechercher") {
    return NextResponse.json(
      rechercherUsagerSolis({ nir: corps.nir, nomNaissance: corps.nomNaissance, dateNaissance: corps.dateNaissance }),
    );
  }

  if (corps.action === "exporter") {
    if (!corps.dossierId || typeof corps.metadonnees !== "object") {
      return NextResponse.json({ error: "dossierId et metadonnees sont requis." }, { status: 400 });
    }
    const annee = new Date().getUTCFullYear();
    const rattache = Boolean(corps.numeroUsagerExistant);
    return NextResponse.json({
      action: rattache ? "rattache" : "cree",
      numeroUsager: rattache ? corps.numeroUsagerExistant : genererNumeroUsager(),
      numeroDossier: genererNumeroDossier(annee),
      horodatage: new Date().toISOString(),
    });
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
