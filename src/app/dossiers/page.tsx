import Link from "next/link";
import { ArriveesGed } from "@/components/arrivees-ged";
import { Bannette } from "@/components/bannette";
import { ETAPES } from "@/lib/etapes";

export const metadata = {
  title: "Traitement des dossiers — Solid'IA",
  description: "Prise en charge depuis la GED, déliassage, contrôle des données, complétude et conformité, enregistrement et transmission dans Solis.",
};

export default function PageTraitement() {
  return (
    <main className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Traitement des dossiers</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">De la GED à Solis, en cinq étapes</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Prenez en charge un dossier numérisé dans la GED : il est lu, délié en pièces, ses données sont contrôlées en regard du document, sa
            complétude et sa conformité sont vérifiées par le moteur de règles, puis il est enregistré dans Solis avec son rapport de contrôle.
            L&apos;appréciation du droit à la prestation relève ensuite de l&apos;instruction dans Solis.
          </p>
        </div>
        <ol className="grid gap-2 sm:grid-cols-5">
          {ETAPES.map((e) => (
            <li key={e.id} className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{e.numero}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{e.libelle}</p>
                <p className="text-xs text-slate-500">{e.resume}</p>
              </div>
            </li>
          ))}
        </ol>
      </header>

      <section id="ged" className="flex scroll-mt-6 flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              <span className="text-blue-600">1 ·</span> GED : dossiers numérisés à prendre en charge
            </h2>
            <p className="text-sm text-slate-600">La prise en charge enregistre la réception, lit le document et ouvre le déliassage.</p>
          </div>
        </div>
        <ArriveesGed />
      </section>

      <section id="bannette" className="flex scroll-mt-6 flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Bannette du poste</h2>
            <p className="text-sm text-slate-600">
              Les dossiers pris en charge sur ce poste, leur avancement et leur statut. Ceux qui sont transmis sont consultables dans{" "}
              <Link href="/solis" className="font-medium text-blue-700 hover:underline">
                Solis (simulation)
              </Link>
              .
            </p>
          </div>
        </div>
        <Bannette />
      </section>
    </main>
  );
}
