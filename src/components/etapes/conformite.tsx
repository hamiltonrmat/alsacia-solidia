"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alerte, Badge, Bouton, Carte, Titre, useMonte, type Teinte } from "@/components/ui";
import { LIBELLES_PIECES, TYPES_A_ECARTER } from "@/lib/decoupage";
import { lecteurDepuisDossier, nomUsager } from "@/lib/dossier-utils";
import { courrierDemandePieces, evaluerConformite, LIBELLES_RECEVABILITE, type StatutControle } from "@/lib/regles/conformite";
import { useDossierStore } from "@/store/dossier-store";

const STATUTS: Record<StatutControle, { libelle: string; teinte: Teinte; icone: string }> = {
  bloquant: { libelle: "Bloquant", teinte: "danger", icone: "✕" },
  alerte: { libelle: "Alerte", teinte: "attention", icone: "!" },
  info: { libelle: "Information", teinte: "info", icone: "i" },
  ok: { libelle: "Conforme", teinte: "succes", icone: "✓" },
  non_applicable: { libelle: "Sans objet", teinte: "neutre", icone: "–" },
};

const ORDRE: StatutControle[] = ["bloquant", "alerte", "info", "ok", "non_applicable"];

export function EtapeConformite({ id }: { id: string }) {
  const router = useRouter();
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirConformite = useDossierStore((s) => s.definirConformite);
  const validerConformite = useDossierStore((s) => s.validerConformite);
  const revenirA = useDossierStore((s) => s.revenirA);
  const [voirCourrier, setVoirCourrier] = useState(false);

  const pieces = dossier?.pieces;
  const extractions = dossier?.extractions;
  const dateReception = dossier?.dateReception;

  const resultat = useMemo(() => {
    if (!dossier || !pieces || !extractions || !dateReception) return null;
    return evaluerConformite({
      pieces: pieces.filter((p) => !TYPES_A_ECARTER.includes(p.type)),
      lire: lecteurDepuisDossier(dossier),
      dateReception,
    });
    // Le dossier complet est nécessaire au lecteur ; on ne recalcule que si ses entrées changent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, extractions, dateReception]);

  useEffect(() => {
    if (!resultat || !dossier) return;
    if (JSON.stringify(dossier.conformite?.controles) !== JSON.stringify(resultat.controles)) {
      definirConformite(id, resultat);
    }
  }, [resultat, dossier, id, definirConformite]);

  if (!monte || !dossier) return null;
  if (!resultat) return <Alerte teinte="attention">Les extractions ne sont pas disponibles. Revenez au pré-contrôle.</Alerte>;

  const teinteRecevabilite: Teinte = resultat.recevabilite === "recevable" ? "succes" : resultat.recevabilite === "recevable_sous_reserve" ? "attention" : "danger";
  const parStatut = ORDRE.map((s) => ({ statut: s, controles: resultat.controles.filter((c) => c.statut === s) })).filter((g) => g.controles.length > 0);

  function suivant() {
    validerConformite(id);
    router.push(`/dossiers/${id}/decision`);
  }

  function retour() {
    revenirA(id, "extraction");
    router.push(`/dossiers/${id}/extraction`);
  }

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Phase 2"
        titre="Conformité des pièces et pré-recevabilité"
        description="Présence des pièces obligatoires selon la demande, validité et cohérence de chaque pièce avec le formulaire. Les règles sont un premier jeu à affiner avec l'expertise métier."
        actions={
          <>
            <Bouton variante="secondaire" onClick={retour}>
              Retour au pré-contrôle
            </Bouton>
            <Bouton onClick={suivant}>Passer à l&apos;aide à la décision</Bouton>
          </>
        }
      />

      <Alerte teinte={teinteRecevabilite} titre={LIBELLES_RECEVABILITE[resultat.recevabilite]}>
        {resultat.synthese}
      </Alerte>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Carte titre="Contrôles" sousTitre={`${resultat.controles.length} contrôles appliqués`}>
          <div className="flex flex-col gap-5">
            {parStatut.map((groupe) => (
              <div key={groupe.statut} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge teinte={STATUTS[groupe.statut].teinte}>{STATUTS[groupe.statut].libelle}</Badge>
                  <span className="text-xs text-zinc-500">{groupe.controles.length}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {groupe.controles.map((c) => (
                    <li key={c.id} className="flex gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          c.statut === "ok" ? "bg-emerald-600 text-white" : c.statut === "bloquant" ? "bg-red-600 text-white" : c.statut === "alerte" ? "bg-amber-500 text-white" : "bg-sky-500 text-white"
                        }`}
                        aria-hidden
                      >
                        {STATUTS[c.statut].icone}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">
                          {c.libelle}
                          {c.piece ? <span className="ml-2 text-xs font-normal text-zinc-500">{LIBELLES_PIECES[c.piece]}</span> : null}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Carte>

        <div className="flex flex-col gap-6">
          <Carte titre="Pièces à réclamer" sousTitre={resultat.piecesManquantes.length ? `${resultat.piecesManquantes.length} pièce(s)` : "Aucune"}>
            {resultat.piecesManquantes.length ? (
              <div className="flex flex-col gap-3">
                <ul className="list-disc pl-5 text-sm">
                  {resultat.piecesManquantes.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <Bouton variante="secondaire" onClick={() => setVoirCourrier((v) => !v)}>
                  {voirCourrier ? "Masquer le courrier" : "Générer le courrier à l'usager"}
                </Bouton>
                {voirCourrier ? (
                  <textarea
                    readOnly
                    value={courrierDemandePieces(resultat, nomUsager(dossier))}
                    rows={14}
                    className="w-full rounded-md border border-zinc-300 bg-white p-3 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Toutes les pièces obligatoires sont présentes.</p>
            )}
          </Carte>

          <Carte titre="Pièces du dossier">
            <ul className="flex flex-col gap-1 text-sm">
              {(dossier.pieces ?? []).map((p) => (
                <li key={p.id} className={`flex items-center justify-between gap-2 ${TYPES_A_ECARTER.includes(p.type) ? "text-zinc-400 line-through" : ""}`}>
                  <span>{LIBELLES_PIECES[p.type]}</span>
                  <span className="text-xs text-zinc-500">p. {p.pages.join(", ")}</span>
                </li>
              ))}
            </ul>
          </Carte>
        </div>
      </div>
    </main>
  );
}
