"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { CarteRapport } from "@/components/rapport-pdf";
import { Alerte, Badge, Bouton, Carte, Titre, useMonte, type Teinte } from "@/components/ui";
import { LIBELLES_PIECES, TYPES_A_ECARTER } from "@/lib/decoupage";
import { lecteurDepuisDossier, pagesCerfaPresentes, rapprochementPourConformite } from "@/lib/dossier-utils";
import { construireRapport } from "@/lib/rapport/construire";
import {
  ancreRegle,
  dateLimiteAccuseReception,
  evaluerConformite,
  LIBELLES_FAMILLE,
  LIBELLES_STATUT_CONTROLE,
  LIBELLES_VERDICT,
  type StatutControle,
} from "@/lib/regles/conformite";
import { PARAMETRES } from "@/lib/regles/parametres";
import { useDossierStore } from "@/store/dossier-store";

const STATUTS: Record<StatutControle, { teinte: Teinte; icone: string; fond: string }> = {
  bloquant: { teinte: "danger", icone: "✕", fond: "bg-red-600" },
  alerte: { teinte: "attention", icone: "!", fond: "bg-amber-500" },
  info: { teinte: "info", icone: "i", fond: "bg-sky-500" },
  ok: { teinte: "succes", icone: "✓", fond: "bg-emerald-600" },
  non_applicable: { teinte: "neutre", icone: "–", fond: "bg-slate-400" },
};

const ORDRE: StatutControle[] = ["bloquant", "alerte", "info", "ok", "non_applicable"];

export function EtapeConformite({ id }: { id: string }) {
  const router = useRouter();
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirConformite = useDossierStore((s) => s.definirConformite);
  const definirObservations = useDossierStore((s) => s.definirObservations);
  const validerConformite = useDossierStore((s) => s.validerConformite);
  const revenirA = useDossierStore((s) => s.revenirA);

  const pieces = dossier?.pieces;
  const pagesClassees = dossier?.pagesClassees;
  const extractions = dossier?.extractions;
  const rapprochement = dossier?.rapprochement;
  const dateReception = dossier?.dateReception;

  const resultat = useMemo(() => {
    if (!dossier || !pieces || !extractions || !dateReception) return null;
    return evaluerConformite({
      pieces: pieces.filter((p) => !TYPES_A_ECARTER.includes(p.type)),
      lire: lecteurDepuisDossier(dossier),
      dateReception,
      pagesCerfa: pagesCerfaPresentes(dossier),
      rapprochement: rapprochementPourConformite(dossier),
    });
    // Le dossier complet est nécessaire au lecteur ; on ne recalcule que si ses entrées changent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, pagesClassees, extractions, rapprochement, dateReception]);

  useEffect(() => {
    if (!resultat || !dossier) return;
    if (JSON.stringify(dossier.conformite?.controles) !== JSON.stringify(resultat.controles)) {
      definirConformite(id, resultat);
    }
  }, [resultat, dossier, id, definirConformite]);

  if (!monte || !dossier) return null;
  if (!resultat) return <Alerte teinte="attention">Les extractions ne sont pas disponibles. Revenez au contrôle des données.</Alerte>;

  const teinteVerdict: Teinte = resultat.verdict === "conforme" ? "succes" : resultat.verdict === "conforme_sous_reserve" ? "attention" : "danger";
  const parStatut = ORDRE.map((s) => ({ statut: s, controles: resultat.controles.filter((c) => c.statut === s) })).filter((g) => g.controles.length > 0);
  const incomplet = resultat.verdict === "non_conforme";
  const completude = incomplet ? null : (dossier.dateCompletude ?? dossier.dateReception);
  const limiteAr = dateLimiteAccuseReception(dossier.dateReception);
  const rapportAJour = Boolean(dossier.rapport && dossier.rapport.revision === dossier.revision);
  const rapportPerime = Boolean(dossier.rapport && !rapportAJour && !dossier.export);

  function valider() {
    if (!dossier || !resultat) return;
    const genereLe = new Date().toISOString();
    const rapport = construireRapport(dossier, { conformite: resultat, dateCompletude: completude, genereLe });
    validerConformite(id, { conformite: resultat, dateCompletude: completude, rapport });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function retour() {
    revenirA(id, "extraction");
    router.push(`/dossiers/${id}/extraction`);
  }

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Étape 4"
        titre="Complétude et conformité"
        description="Le moteur de règles métier vérifie la présence des pièces obligatoires et conditionnelles, le formulaire complet et signé, la validité et la cohérence de chaque pièce avec le formulaire, et le rapprochement avec l'usager connu. Il ne se prononce pas sur le droit à la prestation : tout dossier est transmis à Solis, où l'instruction en décide. La validation fixe la date de dossier complet et génère le rapport de contrôle."
        actions={
          <>
            <Bouton variante="secondaire" onClick={retour}>
              Retour au contrôle des données
            </Bouton>
            {rapportAJour && !dossier.export ? (
              <Bouton href={`/dossiers/${id}/export`}>Passer à l&apos;enregistrement et la transmission</Bouton>
            ) : dossier.export ? null : (
              <Bouton onClick={valider}>{dossier.rapport ? "Valider et régénérer le rapport" : "Valider et générer le rapport"}</Bouton>
            )}
          </>
        }
      />

      <Alerte teinte={teinteVerdict} titre={LIBELLES_VERDICT[resultat.verdict]}>
        {resultat.synthese}
      </Alerte>

      {rapportPerime ? (
        <Alerte teinte="attention" titre="Le rapport de contrôle n'est plus à jour">
          Le dossier a été modifié depuis la génération du rapport. Validez à nouveau pour le régénérer avant la transmission.
          <div className="mt-2">
            <Bouton onClick={valider}>Valider et régénérer le rapport</Bouton>
          </div>
        </Alerte>
      ) : null}

      {rapportAJour ? <CarteRapport dossier={dossier} apercuOuvert={!dossier.export} /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Carte
          titre="Contrôles"
          sousTitre={`${resultat.controles.length} règles appliquées`}
          actions={
            <a href="/regles" target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-700 hover:underline">
              Toutes les règles métier ↗
            </a>
          }
        >
          <div className="flex flex-col gap-5">
            {parStatut.map((groupe) => (
              <div key={groupe.statut} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge teinte={STATUTS[groupe.statut].teinte}>{LIBELLES_STATUT_CONTROLE[groupe.statut]}</Badge>
                  <span className="text-xs text-slate-500">{groupe.controles.length}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {groupe.controles.map((c) => (
                    <li key={c.id} className="flex gap-3 rounded-md border border-slate-200 p-3">
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${STATUTS[c.statut].fond}`}
                        aria-hidden
                      >
                        {STATUTS[c.statut].icone}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {c.libelle}
                          <span className="ml-2 text-xs font-normal text-slate-500">{LIBELLES_FAMILLE[c.famille]}</span>
                        </p>
                        <p className="text-sm text-slate-600">{c.detail}</p>
                      </div>
                      <a
                        href={`/regles#${ancreRegle(c.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Ouvrir la règle dans un nouvel onglet"
                        className="shrink-0 self-start text-xs font-medium text-blue-700 hover:underline"
                      >
                        Voir la règle ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Carte>

        <div className="flex flex-col gap-6">
          <Carte titre="Dates" sousTitre="À compter de la réception">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-slate-500">Réception</dt>
              <dd>{dossier.dateReception}</dd>
              <dt className="text-slate-500">Accusé de réception</dt>
              <dd>
                avant le <strong>{limiteAr ?? "—"}</strong> ({PARAMETRES.joursAccuseReception} jours), émis depuis Solis
              </dd>
              <dt className="text-slate-500">Dossier complet</dt>
              <dd>{completude ? <strong>{completude}</strong> : <span className="text-amber-700">non fixée, dossier incomplet</span>}</dd>
            </dl>
          </Carte>

          {resultat.piecesManquantes.length ? (
            <Carte titre="Pièces manquantes" sousTitre="Listées dans le rapport, réclamées depuis Solis">
              <ul className="list-disc pl-5 text-sm">
                {resultat.piecesManquantes.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Carte>
          ) : null}

          <Carte titre="Observations pour l'instruction" sousTitre="Reprises dans le rapport de contrôle">
            <textarea
              value={dossier.observations ?? ""}
              onChange={(e) => definirObservations(id, e.target.value)}
              rows={5}
              disabled={Boolean(dossier.export)}
              placeholder="Points à signaler à l'agent instructeur, précisions sur une pièce, échange avec l'usager…"
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm disabled:bg-slate-50"
              aria-label="Observations pour l'instruction"
            />
          </Carte>

          <Carte titre="Pièces du dossier">
            <ul className="flex flex-col gap-1 text-sm">
              {(dossier.pieces ?? []).map((p) => (
                <li key={p.id} className={`flex items-center justify-between gap-2 ${TYPES_A_ECARTER.includes(p.type) ? "text-slate-400 line-through" : ""}`}>
                  <span>{LIBELLES_PIECES[p.type]}</span>
                  <span className="text-xs text-slate-500">p. {p.pages.join(", ")}</span>
                </li>
              ))}
            </ul>
          </Carte>
        </div>
      </div>
    </main>
  );
}
