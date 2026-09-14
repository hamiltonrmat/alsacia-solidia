"use client";

/** Aperçu du PDF du dossier, page par page, via le lecteur PDF du navigateur. */
export function VisionneusePdf({ chemin, page, nbPages, onPage }: { chemin: string; page: number; nbPages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-2 text-xs font-medium text-zinc-500">Page</span>
        {Array.from({ length: nbPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            className={`h-7 min-w-7 rounded px-1.5 text-xs font-medium transition ${n === page ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <iframe
        key={`${chemin}#${page}`}
        title={`Document numérisé, page ${page}`}
        src={`${chemin}#page=${page}&toolbar=0&navpanes=0&view=FitH`}
        className="h-[70vh] w-full rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800"
      />
      <p className="text-xs text-zinc-500">
        Si l&apos;aperçu ne s&apos;affiche pas,{" "}
        <a href={chemin} target="_blank" rel="noreferrer" className="underline">
          ouvrir le PDF dans un nouvel onglet
        </a>
        .
      </p>
    </div>
  );
}
