"use client";

import Link from "next/link";
import { Badge, Bouton, useMonte } from "@/components/ui";
import { nomUsager } from "@/lib/dossier-utils";
import { ETAPES, useDossierStore, type Etape } from "@/store/dossier-store";

export function libelleEtape(etape: Etape): string {
  if (etape === "termine") return "Terminé";
  return ETAPES.find((e) => e.id === etape)?.libelle ?? etape;
}

export function cheminEtape(id: string, etape: Etape): string {
  return `/dossiers/${id}/${etape === "termine" ? "export" : etape}`;
}

/** Liste des dossiers importés dans ce navigateur, avec leur étape courante. */
export function DossiersEnCours() {
  const monte = useMonte();
  const dossiers = useDossierStore((s) => s.dossiers);
  const supprimer = useDossierStore((s) => s.supprimerDossier);
  const liste = Object.values(dossiers).sort((a, b) => b.importeLe.localeCompare(a.importeLe));

  if (!monte || liste.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Dossiers en cours dans ce poste de travail</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {liste.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {d.id} <span className="text-slate-500">· {nomUsager(d) ?? d.libelle}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Reçu le {d.dateReception} · {d.nbPages} pages · importé le {new Date(d.importeLe).toLocaleString("fr-FR")}
                </p>
              </div>
              <Badge teinte={d.etape === "termine" ? "succes" : "primaire"}>{libelleEtape(d.etape)}</Badge>
            </div>
            <div className="flex gap-2">
              <Link href={cheminEtape(d.id, d.etape)} className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-300">
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
