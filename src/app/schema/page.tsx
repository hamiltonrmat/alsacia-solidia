import Link from "next/link";
import { SchemaFonctionnel, SchemaTechnique } from "@/components/schemas-outil";
import { MARQUE } from "@/lib/marque";

export const metadata = {
  title: "Schéma de l'outil — Solid'IA",
  description: "Vue d'ensemble de Solid'IA : le parcours d'un dossier de la GED à Solis, étape par étape, et l'architecture technique.",
};

export default function PageSchema() {
  return (
    <main className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Vue d&apos;ensemble · {MARQUE.version}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Schéma de l&apos;outil</h1>
        <p className="max-w-3xl text-slate-600">
          {MARQUE.nom} en une page : d&apos;où vient le dossier, ce qui se passe à chacune des cinq étapes, qui fait quoi entre l&apos;outil et
          l&apos;agent, et où le dossier aboutit. L&apos;outil contrôle et documente le dossier ; l&apos;appréciation du droit à la prestation
          appartient à l&apos;instruction, dans Solis.
        </p>
        <nav aria-label="Sur cette page" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href="#parcours" className="font-medium text-blue-700 hover:underline">
            Le parcours d&apos;un dossier
          </a>
          <a href="#architecture" className="font-medium text-blue-700 hover:underline">
            Architecture technique
          </a>
        </nav>
      </header>

      <section id="parcours" className="flex scroll-mt-6 flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Le parcours d&apos;un dossier, de la GED à Solis</h2>
          <p className="text-sm text-slate-600">
            Chaque colonne est une étape. On y lit ce que fait l&apos;outil, ce que fait l&apos;agent, les services sollicités et ce qui passe à
            l&apos;étape suivante.
          </p>
        </div>
        <SchemaFonctionnel />
      </section>

      <section id="architecture" className="flex scroll-mt-6 flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Architecture technique</h2>
          <p className="max-w-3xl text-sm text-slate-600">
            Où s&apos;exécute chaque traitement et quels échanges circulent. C&apos;est la base d&apos;une solution réelle : la GED et Solis
            seraient remplacés par leurs connecteurs, et l&apos;état des dossiers, aujourd&apos;hui conservé dans le navigateur, par une base
            partagée.
          </p>
        </div>
        <SchemaTechnique />
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-sm text-blue-900">Pour aller plus loin : le traitement lui-même, les règles appliquées, ou le guide pas à pas.</p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/dossiers" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            Traitement des dossiers
          </Link>
          <Link href="/regles" className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100">
            Règles métier
          </Link>
          <Link href="/mode-d-emploi" className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100">
            Mode d&apos;emploi
          </Link>
        </div>
      </div>
    </main>
  );
}
