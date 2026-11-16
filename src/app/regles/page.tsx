import Link from "next/link";
import { CatalogueRegles } from "@/components/catalogue-regles";
import { CATALOGUE_REGLES, DESCRIPTIONS_VERDICT, HORS_PERIMETRE, LIBELLES_VERDICT, ORDRE_FAMILLES, type Verdict } from "@/lib/regles/conformite";
import { DESCRIPTION_PARAMETRES } from "@/lib/regles/parametres";

export const metadata = {
  title: "Règles métier — Solid'IA",
  description: "Catalogue des règles de complétude et de conformité appliquées aux dossiers, paramètres et périmètre du moteur de règles.",
};

const COULEURS_VERDICT: Record<Verdict, string> = {
  conforme: "border-emerald-200 bg-emerald-50 text-emerald-800",
  conforme_sous_reserve: "border-amber-200 bg-amber-50 text-amber-900",
  non_conforme: "border-red-200 bg-red-50 text-red-800",
};

export default function PageRegles() {
  const nbRegles = Object.keys(CATALOGUE_REGLES).length;

  return (
    <main className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Moteur de règles métier</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Règles de complétude et de conformité</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Les {nbRegles} règles, en {ORDRE_FAMILLES.length} familles, que l&apos;étape « Complétude et conformité » applique à chaque dossier. Cette
          page est lue dans le code même du moteur : elle est toujours à jour. Chaque règle a une adresse propre, vers laquelle renvoient les
          contrôles d&apos;un dossier.
        </p>
        <nav aria-label="Sur cette page" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href="#verdict" className="font-medium text-blue-700 hover:underline">
            Calcul du verdict
          </a>
          <a href="#catalogue" className="font-medium text-blue-700 hover:underline">
            Catalogue des règles
          </a>
          <a href="#parametres" className="font-medium text-blue-700 hover:underline">
            Paramètres
          </a>
          <a href="#hors-perimetre" className="font-medium text-blue-700 hover:underline">
            Ce que le moteur ne vérifie pas
          </a>
          <Link href="/mode-d-emploi" className="text-slate-600 hover:underline">
            Mode d&apos;emploi
          </Link>
        </nav>
      </header>

      <section id="verdict" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Calcul du verdict</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Chaque règle applicable produit un contrôle : bloquant, alerte, information ou conforme. Une règle sans objet pour le dossier (pièce
          absente, situation non concernée) ne produit rien. Le verdict découle des statuts obtenus.
        </p>
        <ul className="grid gap-3 md:grid-cols-3">
          {(Object.keys(LIBELLES_VERDICT) as Verdict[]).map((v) => (
            <li key={v} className={`rounded-lg border px-4 py-3 text-sm ${COULEURS_VERDICT[v]}`}>
              <p className="font-semibold">{LIBELLES_VERDICT[v]}</p>
              <p className="mt-1">{DESCRIPTIONS_VERDICT[v]}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="catalogue" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className="sr-only">Catalogue des règles</h2>
        <CatalogueRegles />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section id="parametres" className="flex scroll-mt-6 flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Paramètres</h2>
          <p className="text-sm text-slate-600">Seuils et délais utilisés par les règles, regroupés pour être validés avec les services instructeurs.</p>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-medium">Paramètre</th>
                  <th className="px-4 py-2 font-medium">Valeur</th>
                  <th className="px-4 py-2 font-medium">Usage</th>
                </tr>
              </thead>
              <tbody>
                {DESCRIPTION_PARAMETRES.map((p) => (
                  <tr key={p.cle} className="border-b border-slate-100 align-top last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900">{p.libelle}</p>
                      <p className="font-mono text-xs text-slate-400">{p.cle}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-900">{p.valeur}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="hors-perimetre" className="flex scroll-mt-6 flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Ce que le moteur ne vérifie pas</h2>
          <p className="text-sm text-slate-600">
            L&apos;appréciation du droit à la prestation relève de l&apos;instruction dans Solis. Tout dossier contrôlé y est transmis, complet ou
            non, avec les données utiles telles que contrôlées.
          </p>
          <dl className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
            {HORS_PERIMETRE.map((h) => (
              <div key={h.sujet}>
                <dt className="font-medium text-slate-900">{h.sujet}</dt>
                <dd className="text-slate-600">{h.explication}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
