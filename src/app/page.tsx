import Image from "next/image";
import Link from "next/link";
import { ApercuBannette } from "@/components/bannette";
import { ETAPES } from "@/lib/etapes";
import { MARQUE } from "@/lib/marque";
import { MODULES } from "@/lib/modules";

const CARACTERISTIQUES = [
  {
    titre: "Lecture automatique des dossiers",
    texte: "Chaque page du courrier numérisé est lue, reconnue et rattachée à la bonne pièce : formulaire, pièce d'identité, RIB, avis d'imposition, certificat médical.",
  },
  {
    titre: "Extraction expliquée",
    texte: "Chaque champ affiche son score de confiance et l'extrait du document d'où il vient, à côté de l'image de la page. Rien n'est caché à l'agent.",
  },
  {
    titre: "Contrôles et règles lisibles",
    texte: "Complétude, cohérence entre pièces, délais, règles d'orientation : chaque verdict est formulé en français avec son motif, et chaque action est journalisée.",
  },
  {
    titre: "Démonstration sans risque",
    texte: "Six dossiers fictifs couvrent les cas courants et les pièges. Aucune donnée réelle : la GED et le logiciel métier sont simulés.",
  },
];

export default function Accueil() {
  return (
    <main className="flex flex-col gap-14">
      {/* Bandeau de bienvenue */}
      <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 px-6 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-sky-100/70 blur-3xl" aria-hidden />

        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              {MARQUE.version} · démonstration
            </span>
            <div className="flex flex-col gap-3">
              <h1>
                <Image src={MARQUE.logo} alt={MARQUE.nom} width={900} height={305} priority className="h-28 w-auto sm:h-36" />
              </h1>
              <p className="text-lg font-medium text-slate-700">
                {MARQUE.accroche} de la {MARQUE.collectivite}
              </p>
            </div>
            <p className="max-w-xl text-slate-600">
              Du courrier numérisé au logiciel métier : le dossier est lu, découpé en pièces, contrôlé, rapproché de l&apos;usager et orienté en
              quelques minutes, sous le regard de l&apos;agent qui garde la main à chaque étape.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/ged"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Entrer
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/mode-d-emploi"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Mode d&apos;emploi
              </Link>
            </div>
            <p className="text-sm text-slate-500">
              Première visite ? Le mode d&apos;emploi présente les trois modules, le parcours d&apos;un dossier et la lecture des indicateurs.
            </p>
          </div>

          {/* Illustration : un dossier en cours de traitement */}
          <div className="relative mx-auto w-full max-w-sm" aria-hidden>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Dossier D-2026-0301</p>
                  <p className="font-semibold text-slate-900">Jean DUPONT</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">Recevable</span>
              </div>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                <li className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <span className="text-slate-700">Formulaire CERFA · 5 pages</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">98 %</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <span className="text-slate-700">Certificat médical · 3 pages</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">98 %</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <span className="text-slate-700">Pièce d&apos;identité · 1 page</span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">72 %</span>
                </li>
                <li className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <span className="text-slate-700">RIB · 1 page</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">95 %</span>
                </li>
              </ul>
              <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Orientation proposée : transmettre à l&apos;équipe médico-sociale
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
              <p className="font-medium text-slate-800">3 modules · 5 étapes</p>
              <p className="text-slate-500">L&apos;agent valide chaque étape</p>
            </div>
          </div>
        </div>
      </section>

      {/* Les trois modules */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Les trois modules</h2>
          <p className="text-slate-600">
            L&apos;outil suit le chemin réel d&apos;un dossier : il arrive dans la gestion documentaire, il est traité, puis il est enregistré dans le
            logiciel métier.
          </p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {MODULES.map((m) => (
            <li key={m.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg ring-1 ring-blue-100" aria-hidden>
                  {m.icone}
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Module {m.numero}</p>
                  <p className="font-semibold text-slate-900">{m.libelle}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-slate-700">{m.sousTitre}</p>
              <p className="flex-1 text-sm text-slate-600">{m.description}</p>
              <Link href={m.chemin} className="text-sm font-semibold text-blue-700 hover:underline">
                Ouvrir le module {m.libelle} →
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <ApercuBannette />

      {/* Caractéristiques */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Ce que l&apos;outil apporte</h2>
          <p className="text-slate-600">Un poste de travail qui prépare l&apos;instruction sans jamais décider à la place de l&apos;agent.</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {CARACTERISTIQUES.map((c) => (
            <li key={c.titre} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">{c.titre}</p>
              <p className="mt-1 text-sm text-slate-600">{c.texte}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Les étapes du module de traitement */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Les cinq étapes du traitement</h2>
          <p className="text-slate-600">Dans le module Dossiers, chaque dossier suit ce parcours, dans l&apos;ordre, et reste modifiable.</p>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ETAPES.map((e) => (
            <li key={e.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {e.numero}
              </span>
              <p className="font-semibold text-slate-900">{e.libelle}</p>
              <p className="text-sm text-slate-600">{e.resume}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-sm text-blue-900">Prêt à essayer ? Le lot #2347 contient trois dossiers de démonstration.</p>
          <Link href="/ged" className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            Entrer
          </Link>
          <Link href="/mode-d-emploi" className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100">
            Lire le mode d&apos;emploi
          </Link>
        </div>
      </section>
    </main>
  );
}
