import Link from "next/link";
import { MODULES, moduleParId, type Module } from "@/lib/modules";

/**
 * En-tête de page d'un module : situe l'écran dans le parcours et donne accès
 * aux deux autres modules.
 */
export function BandeauModule({ id, actions }: { id: Module["id"]; actions?: React.ReactNode }) {
  const courant = moduleParId(id);
  const autres = MODULES.filter((m) => m.id !== id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl ring-1 ring-blue-100" aria-hidden>
            {courant.icone}
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Module {courant.numero} sur {MODULES.length} · {courant.libelle}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{courant.titre}</h1>
            <p className="max-w-2xl text-sm text-slate-600">{courant.description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <nav aria-label="Autres modules" className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-slate-500">Aller à :</span>
        {autres.map((m) => (
          <Link
            key={m.id}
            href={m.chemin}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:bg-slate-50"
          >
            <span aria-hidden>{m.icone}</span>
            {m.numero}. {m.libelle}
            <span className="text-xs text-slate-500">{m.sousTitre.toLowerCase()}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
