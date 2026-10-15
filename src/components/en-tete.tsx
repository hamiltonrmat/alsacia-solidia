"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MARQUE } from "@/lib/marque";
import { MODULES } from "@/lib/modules";

/**
 * Barre de navigation principale : le logotype, les trois modules de l'outil,
 * puis les pages d'appui (mode d'emploi, outils).
 */
export function EnTete() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center" title={`${MARQUE.nom} · ${MARQUE.collectivite}`}>
          <Image src={MARQUE.logo} alt={MARQUE.nom} width={900} height={305} priority className="h-11 w-auto" />
        </Link>

        <nav aria-label="Modules" className="flex flex-wrap items-center gap-1">
          {MODULES.map((m) => {
            const actif = pathname === m.chemin || pathname.startsWith(`${m.chemin}/`);
            return (
              <Link
                key={m.id}
                href={m.chemin}
                aria-current={actif ? "page" : undefined}
                title={m.sousTitre}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  actif ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    actif ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {m.numero}
                </span>
                {m.libelle}
              </Link>
            );
          })}
        </nav>

        <nav aria-label="Aide et outils" className="ml-auto flex items-center gap-1 text-sm">
          <Link
            href="/mode-d-emploi"
            className={`rounded-md px-3 py-1.5 transition hover:bg-slate-100 ${pathname.startsWith("/mode-d-emploi") ? "font-medium text-blue-700" : "text-slate-600"}`}
          >
            Mode d&apos;emploi
          </Link>
          <Link
            href="/outils/ocr"
            className={`rounded-md px-3 py-1.5 transition hover:bg-slate-100 ${pathname.startsWith("/outils") ? "font-medium text-blue-700" : "text-slate-600"}`}
          >
            Banc d&apos;essai OCR
          </Link>
        </nav>
      </div>
    </header>
  );
}
