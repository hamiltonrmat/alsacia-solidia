"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Alerte, Badge, Chargement, useMonte } from "@/components/ui";
import { nomUsager } from "@/lib/dossier-utils";
import { ETAPES, useDossierStore, type Etape } from "@/store/dossier-store";

const ORDRE: Etape[] = ["decoupage", "extraction", "conformite", "decision", "export", "termine"];

/** Bandeau du dossier en cours : identité, métadonnées et fil des étapes. */
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Dossier {dossier.id}</p>
          <h1 className="text-xl font-semibold tracking-tight">{usager ?? dossier.libelle}</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge>Lot {dossier.lotId.replace("lot-", "#")}</Badge>
          <Badge>Reçu le {dossier.dateReception}</Badge>
          <Badge>{dossier.nbPages} pages</Badge>
          {dossier.ocr ? <Badge teinte="info">OCR {dossier.ocr.modele}</Badge> : null}
        </div>
      </div>

      <ol className="flex flex-wrap gap-2">
        {ETAPES.map((e, i) => {
          const atteinte = i <= indexCourant;
          const active = pathname?.includes(`/${e.id}`) ?? false;
          const classes = active
            ? "border-blue-600 bg-blue-600 text-white"
            : atteinte
              ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"
              : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950";
          const contenu = (
            <>
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-white text-blue-700" : atteinte ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-800"}`}>
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
    </div>
  );
}
