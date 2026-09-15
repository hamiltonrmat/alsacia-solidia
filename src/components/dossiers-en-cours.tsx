"use client";

import Link from "next/link";
import { Badge, Bouton, useMonte } from "@/components/ui";
import { nomUsager } from "@/lib/dossier-utils";
import { LIBELLES_STATUT, TEINTES_STATUT } from "@/lib/statuts";
import { ETAPES, useDossierStore, type Etape } from "@/store/dossier-store";

export function libelleEtape(etape: Etape): string {
  if (etape === "termine") return "Terminé";
  return ETAPES.find((e) => e.id === etape)?.libelle ?? etape;
}

export function cheminEtape(id: string, etape: Etape): string {
  return `/dossiers/${id}/${etape === "termine" ? "export" : etape}`;
}

/** Bannette : dossiers importés dans ce navigateur, avec statut et étape courante. */
export function DossiersEnCours() {
  const monte = useMonte();
  const dossiers = useDossierStore((s) => s.dossiers);
  const supprimer = useDossierStore((s) => s.supprimerDossier);
  const liste = Object.values(dossiers).sort((a, b) => b.importeLe.localeCompare(a.importeLe));

  if (!monte || liste.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Bannette : dossiers de ce poste de travail</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {liste.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {d.id} <span className="text-slate-500">· {nomUsager(d) ?? d.libelle}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Reçu le {d.dateReception} · {d.nbPages} pages · {d.numeroEnregistrement}
                </p>
              </div>
              <Badge teinte={TEINTES_STATUT[d.statut]}>{LIBELLES_STATUT[d.statut]}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-xs text-slate-500">Étape : {libelleEtape(d.etape)}</span>
              <Link href={cheminEtape(d.id, d.etape)} className="font-medium text-blue-700 hover:underline">
                Reprendre
              </Link>
              <Bouton variante="discret" onClick={() => supprimer(d.id)} className="px-0 py-0 text-sm text-slate-500">
                Retirer du poste
              </Bouton>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
