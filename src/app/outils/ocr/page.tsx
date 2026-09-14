import { OcrBench } from "@/components/ocr-bench";

export default function PageOutilOcr() {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Outil</p>
        <h1 className="text-2xl font-semibold tracking-tight">Banc d&apos;essai OCR</h1>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          Envoyez n&apos;importe quel PDF ou image pour voir le texte Markdown produit par Mistral OCR, page par page. Utile pour
          vérifier la qualité de lecture d&apos;un document avant de l&apos;intégrer au workflow.
        </p>
      </div>
      <OcrBench />
    </main>
  );
}
