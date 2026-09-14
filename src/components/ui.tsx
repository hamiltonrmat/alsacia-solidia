"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

/** Petits composants d'interface partagés. */

export type Teinte = "neutre" | "primaire" | "succes" | "attention" | "danger" | "info";

const TEINTES: Record<Teinte, string> = {
  neutre: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700",
  primaire: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900",
  succes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900",
  attention: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
  danger: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900",
  info: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-900",
};

export function Badge({ teinte = "neutre", children, className = "" }: { teinte?: Teinte; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TEINTES[teinte]} ${className}`}>
      {children}
    </span>
  );
}

export function Alerte({ teinte = "info", titre, children }: { teinte?: Teinte; titre?: string; children: ReactNode }) {
  return (
    <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${TEINTES[teinte]}`}>
      {titre ? <p className="font-semibold">{titre}</p> : null}
      <div className={titre ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

type BoutonProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variante?: "primaire" | "secondaire" | "danger" | "discret";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

const VARIANTES: Record<NonNullable<BoutonProps["variante"]>, string> = {
  primaire: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
  secondaire: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  discret: "text-blue-700 hover:underline dark:text-blue-300",
};

export function Bouton({ children, onClick, href, variante = "primaire", disabled, type = "button", className = "" }: BoutonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className}`;
  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

export function Carte({ titre, sousTitre, actions, children, className = "" }: { titre?: ReactNode; sousTitre?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${className}`}>
      {titre ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold">{titre}</h2>
            {sousTitre ? <p className="mt-0.5 text-sm text-zinc-500">{sousTitre}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Chargement({ texte = "Chargement…" }: { texte?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-zinc-500" role="status">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" aria-hidden />
      {texte}
    </div>
  );
}

/** Score de confiance 0-1 rendu en pastille colorée. */
export function ScoreConfiance({ valeur, nonLu }: { valeur: number; nonLu?: boolean }) {
  if (nonLu) return <Badge teinte="danger">non lu</Badge>;
  const pct = Math.round(valeur * 100);
  const teinte: Teinte = valeur >= 0.8 ? "succes" : valeur >= 0.5 ? "attention" : "danger";
  return <Badge teinte={teinte}>{pct} %</Badge>;
}

export function Titre({ surtitre, titre, description, actions }: { surtitre?: string; titre: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {surtitre ? <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">{surtitre}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight">{titre}</h1>
        {description ? <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const abonnementVide = () => () => {};

/** Vrai une fois le composant monté côté client (après réhydratation du store). */
export function useMonte(): boolean {
  return useSyncExternalStore(
    abonnementVide,
    () => true,
    () => false,
  );
}
