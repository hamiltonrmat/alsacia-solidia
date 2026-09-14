"use client";

import { useState, type FormEvent } from "react";

type OcrResponse = {
  fileName: string;
  model: string;
  pages: Array<{ index: number; markdown: string }>;
  usage: { pagesProcessed: number; docSizeBytes: number };
};

type Status = "idle" | "loading" | "done" | "error";

/**
 * Banc d'essai OCR : envoie un fichier à /api/ocr et affiche le Markdown
 * renvoyé page par page. Sert à valider la chaîne technique avant de
 * construire le workflow complet.
 */
export function OcrBench() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<OcrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setStatus("loading");
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = (await response.json()) as OcrResponse | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : `Erreur ${response.status}`);
      }
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <label className="flex flex-col gap-2 text-sm font-medium">
          Document à analyser (PDF ou image)
          <input
            type="file"
            name="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,image/avif"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!file || status === "loading"}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Analyse en cours…" : "Lancer l'OCR"}
          </button>
          {file ? (
            <span className="text-sm text-zinc-500">
              {file.name} · {(file.size / 1024).toFixed(0)} Ko
            </span>
          ) : null}
        </div>

        {status === "error" && error ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </form>

      {result ? (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-zinc-500">
            {result.fileName} · {result.usage.pagesProcessed} page{result.usage.pagesProcessed > 1 ? "s" : ""} traitée
            {result.usage.pagesProcessed > 1 ? "s" : ""} · modèle {result.model}
          </p>
          {result.pages.map((page) => (
            <article
              key={page.index}
              className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <header className="border-b border-zinc-200 px-4 py-2 text-sm font-medium dark:border-zinc-800">
                Page {page.index + 1}
              </header>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                {page.markdown || "(page vide)"}
              </pre>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
