"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MARQUE } from "@/lib/marque";

/**
 * Barre de navigation principale : le logotype, la version et les entrées de
 * l'outil. Le traitement des dossiers regroupe tout le parcours, de la GED à
 * Solis ; le schéma montre l'outil en entier ; les règles métier se consultent
 * rapidement ; le mode d'emploi détaille le fonctionnement.
 */
const ENTREES = [
  {
    libelle: "Accueil",
    chemin: "/",
    titre: "Page d'accueil",
    actif: (p: string) => p === "/",
  },
  {
    libelle: "Traitement des dossiers",
    chemin: "/dossiers",
    titre: "GED, déliassage, contrôle des données, complétude et conformité, transmission vers Solis",
    actif: (p: string) => p.startsWith("/dossiers") || p.startsWith("/solis"),
  },
  {
    libelle: "Schéma de l'outil",
    chemin: "/schema",
    titre: "Vue d'ensemble de l'outil : parcours d'un dossier et architecture",
    actif: (p: string) => p.startsWith("/schema"),
  },
  {
    libelle: "Règles métier",
    chemin: "/regles",
    titre: "Catalogue des règles de complétude et de conformité, paramètres et périmètre",
    actif: (p: string) => p.startsWith("/regles"),
  },
  {
    libelle: "Mode d'emploi",
    chemin: "/mode-d-emploi",
    titre: "Fonctionnement de l'outil pas à pas et lecture des indicateurs",
    actif: (p: string) => p.startsWith("/mode-d-emploi"),
  },
];

export function EnTete() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2" title={`${MARQUE.nom} · ${MARQUE.collectivite} · ${MARQUE.version}`}>
          <Image src={MARQUE.logo} alt={MARQUE.nom} width={900} height={305} priority className="h-11 w-auto" />
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{MARQUE.versionCourte}</span>
        </Link>

        <nav aria-label="Navigation principale" className="ml-auto flex flex-wrap items-center gap-1.5">
          {ENTREES.map((e) => {
            const actif = e.actif(pathname);
            return (
              <Link
                key={e.chemin}
                href={e.chemin}
                aria-current={actif ? "page" : undefined}
                title={e.titre}
                className={`inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  actif ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {e.libelle}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
