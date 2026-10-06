import { BandeauModule } from "@/components/bandeau-module";
import { Bannette } from "@/components/bannette";
import { ETAPES } from "@/lib/etapes";

export const metadata = {
  title: "Traitement des dossiers — Solid'IA",
  description: "Bannette du poste de travail et étapes de pré-instruction des dossiers d'aide à l'autonomie.",
};

export default function PageDossiers() {
  return (
    <main className="flex flex-col gap-8">
      <BandeauModule id="dossiers" />

      <Bannette />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Les cinq étapes de pré-instruction</h2>
        <p className="text-sm text-slate-600">
          Chaque dossier de la bannette suit ce parcours. Les étapes déjà franchies restent accessibles depuis le fil, en haut du dossier.
        </p>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ETAPES.map((e) => (
            <li key={e.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{e.numero}</span>
              <p className="mt-2 font-medium text-slate-900">{e.libelle}</p>
              <p className="mt-1 text-sm text-slate-600">{e.resume}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
