import Link from "next/link";
import { DossiersEnCours } from "@/components/dossiers-en-cours";

const ETAPES = [
  { n: 1, titre: "Import GED", texte: "Sélection d'un lot de numérisation et chargement du dossier à instruire." },
  { n: 2, titre: "Découpage", texte: "OCR du dossier, classification de chaque page et regroupement en pièces." },
  { n: 3, titre: "Pré-contrôle", texte: "Extraction structurée des champs avec score de confiance, correction par l'agent." },
  { n: 4, titre: "Conformité", texte: "Contrôle des pièces obligatoires et de leur cohérence, pré-recevabilité." },
  { n: 5, titre: "Aide à la décision", texte: "Application des règles administratives et orientation proposée." },
  { n: 6, titre: "Export Solis", texte: "Création ou rattachement de l'usager dans le logiciel métier, transfert des métadonnées." },
];

export default function Accueil() {
  return (
    <main className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Prototype v2</p>
        <h1 className="text-3xl font-semibold tracking-tight">Instruction assistée des dossiers APA</h1>
        <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
          De la GED au logiciel métier : le dossier numérisé est lu par OCR, découpé en pièces, ses champs sont extraits et
          contrôlés, puis les règles administratives proposent une orientation que l&apos;agent valide.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/ged" className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
            Importer un dossier depuis la GED
          </Link>
          <Link href="/outils/ocr" className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            Banc d&apos;essai OCR
          </Link>
        </div>
      </section>

      <DossiersEnCours />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Le parcours d&apos;un dossier</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ETAPES.map((e) => (
            <li key={e.n} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Étape {e.n}</p>
              <p className="mt-1 font-medium">{e.titre}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{e.texte}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
