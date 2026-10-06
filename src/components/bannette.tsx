"use client";

import Link from "next/link";
import { useState } from "react";
import { Alerte, Badge, Bouton, Carte, Chargement, useMonte } from "@/components/ui";
import { nomUsager } from "@/lib/dossier-utils";
import { LIBELLES_STATUT, TEINTES_STATUT, type StatutDossier } from "@/lib/statuts";
import { ETAPES, useDossierStore, type Etape, type EtatDossier } from "@/store/dossier-store";

export function libelleEtape(etape: Etape): string {
  if (etape === "termine") return "Terminé";
  return ETAPES.find((e) => e.id === etape)?.libelle ?? etape;
}

export function cheminEtape(id: string, etape: Etape): string {
  return `/dossiers/${id}/${etape === "termine" ? "export" : etape}`;
}

const FILTRES: Array<{ id: string; libelle: string; statuts: StatutDossier[] | null }> = [
  { id: "tous", libelle: "Tous", statuts: null },
  { id: "a_traiter", libelle: "À traiter", statuts: ["recu", "en_cours"] },
  { id: "attente", libelle: "En attente de pièces", statuts: ["en_attente_pieces"] },
  { id: "transmis", libelle: "Transmis", statuts: ["transmis_ems", "transmis_caisse", "oriente_mdph", "clos"] },
];

function Ligne({ dossier, onRetirer }: { dossier: EtatDossier; onRetirer: () => void }) {
  const etapeCourante = ETAPES.find((e) => e.id === dossier.etape);
  const avancement = dossier.etape === "termine" ? ETAPES.length : (etapeCourante?.numero ?? 1) - 1;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">
            {nomUsager(dossier) ?? dossier.libelle}
            <span className="ml-2 font-mono text-xs text-slate-500">{dossier.id}</span>
          </p>
          <p className="text-xs text-slate-500">
            {dossier.numeroEnregistrement} · reçu le {dossier.dateReception} · {dossier.nbPages} pages · lot{" "}
            {dossier.lotId.replace("lot-", "#")}
            {dossier.dateCompletude ? ` · complet le ${dossier.dateCompletude}` : ""}
          </p>
        </div>
        <Badge teinte={TEINTES_STATUT[dossier.statut]}>{LIBELLES_STATUT[dossier.statut]}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(avancement / ETAPES.length) * 100}%` }} />
        </div>
        <span className="shrink-0 text-xs text-slate-500">
          {dossier.etape === "termine" ? "Terminé" : `Étape ${etapeCourante?.numero ?? 1} sur ${ETAPES.length} · ${libelleEtape(dossier.etape)}`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Bouton href={cheminEtape(dossier.id, dossier.etape)}>{dossier.etape === "termine" ? "Consulter" : "Reprendre"}</Bouton>
        {dossier.export ? (
          <span className="text-xs text-slate-500">
            Solis : usager {dossier.export.numeroUsager}, demande {dossier.export.numeroDossier}
          </span>
        ) : null}
        <Bouton variante="discret" onClick={onRetirer} className="ml-auto px-0 py-0 text-sm text-slate-500">
          Retirer du poste
        </Bouton>
      </div>
    </li>
  );
}

/** Bannette complète : la file des dossiers pris en charge sur ce poste. */
export function Bannette() {
  const monte = useMonte();
  const dossiers = useDossierStore((s) => s.dossiers);
  const supprimer = useDossierStore((s) => s.supprimerDossier);
  const [filtre, setFiltre] = useState("tous");

  if (!monte) return <Chargement texte="Ouverture de la bannette…" />;

  const tous = Object.values(dossiers).sort((a, b) => b.importeLe.localeCompare(a.importeLe));
  const actif = FILTRES.find((f) => f.id === filtre) ?? FILTRES[0];
  const liste = actif.statuts ? tous.filter((d) => actif.statuts?.includes(d.statut)) : tous;

  if (tous.length === 0) {
    return (
      <Carte titre="Aucun dossier en cours sur ce poste">
        <p className="text-sm text-slate-600">
          La bannette se remplit depuis la gestion électronique des documents : choisissez un lot, puis prenez en charge un dossier.
        </p>
        <div className="mt-3">
          <Bouton href="/ged">Aller à la GED</Bouton>
        </div>
      </Carte>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTRES.map((f) => {
          const n = f.statuts ? tous.filter((d) => f.statuts?.includes(d.statut)).length : tous.length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltre(f.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                f.id === filtre ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f.libelle}
              <span className={`text-xs ${f.id === filtre ? "text-white/80" : "text-slate-500"}`}>{n}</span>
            </button>
          );
        })}
        <Bouton variante="secondaire" href="/ged" className="ml-auto">
          Prendre un dossier dans la GED
        </Bouton>
      </div>

      {liste.length === 0 ? (
        <Alerte teinte="info">Aucun dossier dans cette catégorie.</Alerte>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {liste.map((d) => (
            <Ligne key={d.id} dossier={d} onRetirer={() => supprimer(d.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Aperçu court de la bannette, pour l'accueil. */
export function ApercuBannette() {
  const monte = useMonte();
  const dossiers = useDossierStore((s) => s.dossiers);
  const liste = Object.values(dossiers).sort((a, b) => b.importeLe.localeCompare(a.importeLe));

  if (!monte || liste.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Vos dossiers en cours</h2>
        <Link href="/dossiers" className="text-sm font-medium text-blue-700 hover:underline">
          Ouvrir la bannette ({liste.length})
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {liste.slice(0, 3).map((d) => (
          <li key={d.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-medium text-slate-900">{nomUsager(d) ?? d.libelle}</p>
              <Badge teinte={TEINTES_STATUT[d.statut]}>{LIBELLES_STATUT[d.statut]}</Badge>
            </div>
            <p className="text-xs text-slate-500">
              {d.id} · {libelleEtape(d.etape)}
            </p>
            <Link href={cheminEtape(d.id, d.etape)} className="text-sm font-medium text-blue-700 hover:underline">
              {d.etape === "termine" ? "Consulter" : "Reprendre"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
