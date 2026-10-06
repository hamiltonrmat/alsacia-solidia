"use client";

/** Aperçu du PDF du dossier, page par page, via le lecteur PDF du navigateur. */
export function VisionneusePdf({
  chemin,
  page,
  nbPages,
  onPage,
  hauteur = "h-[70vh]",
}: {
  chemin: string;
  page: number;
  nbPages: number;
  onPage: (p: number) => void;
  hauteur?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-2 text-xs font-medium text-slate-500">Page</span>
        {Array.from({ length: nbPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            className={`h-7 min-w-7 rounded px-1.5 text-xs font-medium transition ${
              n === page ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <iframe
        key={`${chemin}#${page}`}
        title={`Document numérisé, page ${page}`}
        src={`${chemin}#page=${page}&toolbar=0&navpanes=0&view=FitH`}
        className={`${hauteur} w-full rounded-md border border-slate-200 bg-slate-100`}
      />
      <p className="text-xs text-slate-500">
        Si l&apos;aperçu ne s&apos;affiche pas,{" "}
        <a href={chemin} target="_blank" rel="noreferrer" className="underline">
          ouvrir le PDF dans un nouvel onglet
        </a>
        .
      </p>
    </div>
  );
}
