import Link from "next/link";
import { VueSolis } from "@/components/vue-solis";

export const metadata = {
  title: "Solis (simulation) — Solid'IA",
  description: "Logiciel métier simulé : référentiel des usagers et demandes enregistrées avec leur rapport de contrôle.",
};

export default function PageSolis() {
  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Link href="/dossiers" className="font-medium text-blue-700 hover:underline">
            Traitement des dossiers
          </Link>
          <span aria-hidden>›</span>
          <span>Solis</span>
        </nav>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Destination des dossiers · simulation</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Logiciel métier Solis</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Ce que reçoit le logiciel métier à la dernière étape du traitement : l&apos;usager créé ou rattaché, la demande et son rapport de
            contrôle. C&apos;est aussi la base interrogée pour le rapprochement d&apos;identité.
          </p>
        </div>
      </div>
      <VueSolis />
    </main>
  );
}
