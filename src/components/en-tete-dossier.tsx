"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Alerte, Badge, Chargement, useMonte } from "@/components/ui";
import { nomUsager } from "@/lib/dossier-utils";
import { LIBELLES_STATUT, TEINTES_STATUT } from "@/lib/statuts";
import { ETAPES, useDossierStore, type Etape, type EvenementJournal } from "@/store/dossier-store";

const ORDRE: Etape[] = ["decoupage", "extraction", "conformite", "decision", "export", "termine"];

const LIBELLES_CONTEXTE: Record<string, string> = {
  import: "Import",
  typage: "Typage",
  controle: "Contrôle",
  usager: "Usager",
  recevabilite: "Recevabilité",
  courrier: "Courrier",
  "pre-instruction": "Pré-instruction",
  transmission: "Transmission",
  navigation: "Navigation",
};

function Journal({ evenements }: { evenements: EvenementJournal[] }) {
  const liste = [...evenements].reverse();
  return (
    <ol className="mt-2 flex max-h-72 flex-col gap-1 overflow-auto text-xs">
      {liste.map((e, i) => (
        <li key={`${e.horodatage}-${i}`} className="grid grid-cols-[auto_auto_1fr] items-start gap-2 rounded px-2 py-1 odd:bg-slate-50">
          <span className="whitespace-nowrap text-slate-500">{new Date(e.horodatage).toLocaleString("fr-FR")}</span>
          <Badge className="whitespace-nowrap">{LIBELLES_CONTEXTE[e.contexte] ?? e.contexte}</Badge>
          <span className="min-w-0">
            <span className="font-medium text-slate-800">{e.action}</span>
            {e.detail ? <span className="text-slate-600"> · {e.detail}</span> : null}
            {e.avant !== undefined || e.apres !== undefined ? (
              <span className="text-slate-600">
                {" "}
                · <span className="line-through">{e.avant ?? "∅"}</span> puis <span className="font-medium">{e.apres ?? "∅"}</span>
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Bandeau du dossier en cours : identité, statut, métadonnées, fil des étapes, journal. */
export function EnTeteDossier({ id }: { id: string }) {
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const pathname = usePathname();

  if (!monte) return <Chargement texte="Ouverture du dossier…" />;
  if (!dossier) {
    return (
      <Alerte teinte="attention" titre={`Le dossier ${id} n'est pas chargé dans ce poste de travail`}>
        <Link href="/ged" className="font-medium underline">
          Retourner à la GED pour l&apos;importer
        </Link>
      </Alerte>
    );
  }

  const indexCourant = ORDRE.indexOf(dossier.etape);
  const usager = nomUsager(dossier);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <Link href="/dossiers" className="font-medium text-blue-700 hover:underline">
          Module 2 · Traitement des dossiers
        </Link>
        <span aria-hidden>›</span>
        <span>{dossier.id}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Dossier {dossier.id} · enregistrement {dossier.numeroEnregistrement}
          </p>
          <h1 className="text-xl font-semibold tracking-tight">{usager ?? dossier.libelle}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge teinte={TEINTES_STATUT[dossier.statut]}>{LIBELLES_STATUT[dossier.statut]}</Badge>
          <Badge>Lot {dossier.lotId.replace("lot-", "#")}</Badge>
          <Badge>Reçu le {dossier.dateReception}</Badge>
          {dossier.dateCompletude ? <Badge teinte="succes">Complet le {dossier.dateCompletude}</Badge> : null}
          <Badge>{dossier.nbPages} pages</Badge>
          {dossier.export ? <Badge teinte="info">Solis {dossier.export.numeroDossier}</Badge> : null}
        </div>
      </div>

      <ol className="flex flex-wrap gap-2">
        {ETAPES.map((e, i) => {
          const atteinte = i <= indexCourant;
          const active = pathname?.includes(`/${e.id}`) ?? false;
          const classes = active
            ? "border-blue-600 bg-blue-600 text-white"
            : atteinte
              ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
              : "border-slate-200 bg-white text-slate-400";
          const contenu = (
            <>
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-white text-blue-700" : atteinte ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {i < indexCourant ? "✓" : e.numero}
              </span>
              {e.libelle}
            </>
          );
          return (
            <li key={e.id}>
              {atteinte ? (
                <Link href={`/dossiers/${dossier.id}/${e.id}`} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${classes}`}>
                  {contenu}
                </Link>
              ) : (
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${classes}`}>{contenu}</span>
              )}
            </li>
          );
        })}
      </ol>

      <details className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
        <summary className="cursor-pointer select-none font-medium text-slate-700">
          Journal des actions <span className="text-slate-500">({dossier.journal.length})</span>
        </summary>
        <Journal evenements={dossier.journal} />
      </details>
    </div>
  );
}
