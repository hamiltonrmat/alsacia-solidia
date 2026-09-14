import { OcrBench } from "@/components/ocr-bench";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Prototype v2
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">InstructOCR</h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Instruction assistée des dossiers APA : import depuis la GED, découpage en pièces,
          extraction des champs, contrôle de conformité, aide à la décision et export vers Solis.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Banc d&apos;essai OCR</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Étape technique de validation : envoyez un PDF ou une image pour vérifier l&apos;extraction
            Mistral OCR page par page. Le workflow complet de traitement sera construit sur cette base.
          </p>
        </div>
        <OcrBench />
      </section>
    </main>
  );
}
