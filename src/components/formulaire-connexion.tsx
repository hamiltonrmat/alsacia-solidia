"use client";

import { useRef, useState, type FormEvent } from "react";

/** Délai au-delà duquel on propose un lien, si la navigation n'a pas eu lieu. */
const DELAI_SECOURS_MS = 5000;

/** Formulaire d'entrée dans la démonstration. */
export function FormulaireConnexion({ suite }: { suite: string }) {
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [secours, setSecours] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function soumettre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnCours(true);
    setErreur(null);
    setSecours(false);
    try {
      const reponse = await fetch("/api/connexion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motDePasse }),
      });
      const data = (await reponse.json().catch(() => ({ error: `Réponse inattendue du serveur (${reponse.status}).` }))) as {
        ouvert?: boolean;
        error?: string;
      };
      if (!reponse.ok || data.error) throw new Error(data.error ?? `Erreur ${reponse.status}`);

      /*
       * Navigation complète plutôt que le routeur interne : la requête repart
       * avec le cookie qui vient d'être posé, sans passer par le cache du
       * routeur client, qui garde en mémoire la redirection reçue plus tôt
       * pour cette même adresse et laisserait l'écran figé.
       */
      window.location.assign(suite);

      // Si la page n'a pas changé au bout de quelques secondes, ne pas laisser
      // l'utilisateur devant un bouton bloqué.
      minuterie.current = setTimeout(() => {
        setEnCours(false);
        setSecours(true);
      }, DELAI_SECOURS_MS);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Connexion impossible";
      setErreur(message.includes("fetch") ? "Serveur injoignable. Vérifiez votre connexion et réessayez." : message);
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

      {secours ? (
        <p role="status" className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Vous êtes connecté.{" "}
          <a href={suite} className="font-semibold underline">
            Continuer vers l&apos;outil
          </a>
          .
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
