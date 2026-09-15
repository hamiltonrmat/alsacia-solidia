"use client";

/**
 * Aperçu du PDF du dossier, page par page, via le lecteur PDF du navigateur.
 * Les pages sous pli cacheté (certificat médical) ne sont pas affichées.
 */
export function VisionneusePdf({
  chemin,
  page,
  nbPages,
  onPage,
  pagesMasquees = [],
  hauteur = "h-[70vh]",
}: {
  chemin: string;
  page: number;
  nbPages: number;
  onPage: (p: number) => void;
  pagesMasquees?: number[];
  hauteur?: string;
}) {
  const masquee = pagesMasquees.includes(page);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-2 text-xs font-medium text-slate-500">Page</span>
        {Array.from({ length: nbPages }, (_, i) => i + 1).map((n) => {
          const m = pagesMasquees.includes(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              title={m ? "Certificat médical, sous pli cacheté" : `Page ${n}`}
              className={`h-7 min-w-7 rounded px-1.5 text-xs font-medium transition ${
                n === page ? "bg-blue-600 text-white" : m ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {n}
              {m ? "🔒" : ""}
            </button>
          );
        })}
      </div>
      {masquee ? (
        <div className={`flex ${hauteur} w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50 px-6 text-center`}>
          <span className="text-3xl" aria-hidden>
            🔒
          </span>
          <p className="font-medium text-amber-900">Page du certificat médical, sous pli cacheté</p>
          <p className="max-w-sm text-sm text-amber-800">
            Son contenu est réservé à l&apos;équipe médico-sociale. Seuls l&apos;identité du patient, la date et le médecin sont lus pour le contrôle
            administratif.
          </p>
        </div>
      ) : (
        <iframe
          key={`${chemin}#${page}`}
          title={`Document numérisé, page ${page}`}
          src={`${chemin}#page=${page}&toolbar=0&navpanes=0&view=FitH`}
          className={`${hauteur} w-full rounded-md border border-slate-200 bg-slate-100`}
        />
      )}
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
