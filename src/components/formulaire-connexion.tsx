"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** Formulaire d'entrée dans la démonstration. */
export function FormulaireConnexion({ suite }: { suite: string }) {
  const router = useRouter();
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/connexion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motDePasse }),
      });
      const data = (await reponse.json()) as { ouvert?: boolean; error?: string };
      if (!reponse.ok || data.error) throw new Error(data.error ?? `Erreur ${reponse.status}`);
      router.replace(suite);
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Connexion impossible");
      setMotDePasse("");
      setEnCours(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Mot de passe de la démonstration
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          autoFocus
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {erreur ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erreur}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enCours || motDePasse.length === 0}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {enCours ? "Vérification…" : "Entrer"}
        {enCours ? null : <span aria-hidden>→</span>}
      </button>
    </form>
  );
}
