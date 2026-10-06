"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMonte } from "@/components/ui";
import { COOKIE_SESSION_OUVERTE } from "@/lib/noms-cookies";

/**
 * Referme la session de démonstration. Ne s'affiche que si une session est
 * ouverte, ce que signale un cookie sans secret posé à la connexion.
 */
export function BoutonDeconnexion() {
  const monte = useMonte();
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  const sessionOuverte = monte && typeof document !== "undefined" && document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE_SESSION_OUVERTE}=1`));
  if (!sessionOuverte) return null;

  async function quitter() {
    setEnCours(true);
    await fetch("/api/connexion", { method: "DELETE" });
    router.replace("/connexion");
    router.refresh();
  }

  return (
    <button type="button" onClick={quitter} disabled={enCours} className="font-medium text-blue-700 transition hover:underline disabled:opacity-60">
      {enCours ? "Déconnexion…" : "Quitter la démonstration"}
    </button>
  );
}
