"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alerte, Badge, Bouton, Carte, Titre, useMonte, type Teinte } from "@/components/ui";
import { TYPES_A_ECARTER } from "@/lib/decoupage";
import { lecteurDepuisDossier } from "@/lib/dossier-utils";
import { evaluerDecision, LIBELLES_ORIENTATION, PARAMETRES, type Orientation, type StatutRegle } from "@/lib/regles/decision";
import { useDossierStore } from "@/store/dossier-store";

const STATUTS: Record<StatutRegle, { libelle: string; teinte: Teinte }> = {
  verifiee: { libelle: "Vérifiée", teinte: "succes" },
  non_verifiee: { libelle: "Non remplie", teinte: "danger" },
  attention: { libelle: "Point d'attention", teinte: "attention" },
  indeterminee: { libelle: "Indéterminée", teinte: "neutre" },
};

const ORIENTATIONS: Orientation[] = ["instruction_apa", "caisse_retraite", "mdph", "pieces_manquantes", "indeterminee"];

export function EtapeDecision({ id }: { id: string }) {
  const router = useRouter();
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirDecision = useDossierStore((s) => s.definirDecision);
  const revenirA = useDossierStore((s) => s.revenirA);

  const pieces = dossier?.pieces;
  const extractions = dossier?.extractions;
  const dateReception = dossier?.dateReception;
  const recevabilite = dossier?.conformite?.recevabilite;

  const resultat = useMemo(() => {
    if (!dossier || !pieces || !extractions || !dateReception || !recevabilite) return null;
    return evaluerDecision({
      pieces: pieces.filter((p) => !TYPES_A_ECARTER.includes(p.type)),
      lire: lecteurDepuisDossier(dossier),
      dateReception,
      recevabilite,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, extractions, dateReception, recevabilite]);

  const [orientation, setOrientation] = useState<Orientation | null>(dossier?.decision?.orientationRetenue ?? null);
  const [commentaire, setCommentaire] = useState(dossier?.decision?.commentaire ?? "");

  if (!monte || !dossier) return null;
  if (!resultat) return <Alerte teinte="attention">Le contrôle de conformité n&apos;a pas été effectué. Revenez à l&apos;étape précédente.</Alerte>;

  const retenue = orientation ?? resultat.orientation;
  const teinteReco: Teinte = resultat.orientation === "instruction_apa" ? "succes" : resultat.orientation === "indeterminee" ? "neutre" : "attention";

  function valider() {
    if (!resultat) return;
    definirDecision(id, { resultat, orientationRetenue: retenue, commentaire: commentaire || undefined, valideLe: new Date().toISOString() });
    router.push(`/dossiers/${id}/export`);
  }

  function retour() {
    revenirA(id, "conformite");
    router.push(`/dossiers/${id}/conformite`);
  }

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Phase 3"
        titre="Aide à la décision"
        description={`Les règles administratives connues sont appliquées au dossier : condition d'âge (${PARAMETRES.ageMinimumApa} ans), organisme compétent d'après le questionnaire, lieu de résidence, non-cumul. L'agent retient l'orientation finale.`}
        actions={
          <>
            <Bouton variante="secondaire" onClick={retour}>
              Retour à la conformité
            </Bouton>
            <Bouton onClick={valider}>Valider la décision et préparer l&apos;export</Bouton>
          </>
        }
      />

      <Alerte teinte={teinteReco} titre={`Orientation proposée : ${LIBELLES_ORIENTATION[resultat.orientation]}`}>
        {resultat.recommandation}
      </Alerte>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Carte titre="Règles appliquées">
          <ul className="flex flex-col gap-2">
            {resultat.regles.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.libelle}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{r.detail}</p>
                </div>
                <Badge teinte={STATUTS[r.statut].teinte}>{STATUTS[r.statut].libelle}</Badge>
              </li>
            ))}
          </ul>
        </Carte>

        <div className="flex flex-col gap-6">
          {resultat.girEstime ? (
            <Carte titre="Perte d'autonomie estimée" sousTitre="Indicatif, d'après le certificat médical">
              <p className="text-2xl font-semibold">GIR {resultat.girEstime.gir}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{resultat.girEstime.libelle}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Score {resultat.girEstime.score}/28 sur {resultat.girEstime.itemsRenseignes} items. L&apos;évaluation AGGIR à domicile fait foi.
              </p>
            </Carte>
          ) : null}

          <Carte titre="Décision de l'agent">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm text-zinc-600 dark:text-zinc-400">Orientation retenue</legend>
              {ORIENTATIONS.map((o) => (
                <label key={o} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${retenue === o ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-zinc-200 dark:border-zinc-800"}`}>
                  <input type="radio" name="orientation" value={o} checked={retenue === o} onChange={() => setOrientation(o)} />
                  <span>{LIBELLES_ORIENTATION[o]}</span>
                  {o === resultat.orientation ? <Badge teinte="info">proposée</Badge> : null}
                </label>
              ))}
            </fieldset>
            <label className="mt-4 flex flex-col gap-1 text-sm">
              Commentaire
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={4}
                placeholder="Motivation, points à signaler à l'instruction…"
                className="w-full rounded-md border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </Carte>
        </div>
      </div>
    </main>
  );
}
