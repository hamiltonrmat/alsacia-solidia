"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alerte, Badge, Bouton, Carte, Titre, useMonte, type Teinte } from "@/components/ui";
import { courrierAccuseReception, courrierDemandePieces, dateLimiteAccuseReception, dateLimiteDecision, LIBELLES_COURRIER, type ContexteCourrier } from "@/lib/courriers";
import { LIBELLES_PIECES, TYPES_A_ECARTER } from "@/lib/decoupage";
import { identiteLue, lecteurDepuisDossier, nomUsager, pagesCerfaPresentes, rapprochementPourConformite } from "@/lib/dossier-utils";
import { evaluerConformite, LIBELLES_RECEVABILITE, type StatutControle } from "@/lib/regles/conformite";
import { PARAMETRES } from "@/lib/regles/parametres";
import { useDossierStore, type EtatDossier } from "@/store/dossier-store";

const STATUTS: Record<StatutControle, { libelle: string; teinte: Teinte; icone: string }> = {
  bloquant: { libelle: "Bloquant", teinte: "danger", icone: "✕" },
  alerte: { libelle: "Alerte", teinte: "attention", icone: "!" },
  info: { libelle: "Information", teinte: "info", icone: "i" },
  ok: { libelle: "Conforme", teinte: "succes", icone: "✓" },
  non_applicable: { libelle: "Sans objet", teinte: "neutre", icone: "–" },
};

const ORDRE: StatutControle[] = ["bloquant", "alerte", "info", "ok", "non_applicable"];

export function contexteCourrier(dossier: EtatDossier): ContexteCourrier {
  const identite = identiteLue(dossier);
  return {
    civilite: identite.civilite,
    nomUsager: nomUsager(dossier),
    numeroEnregistrement: dossier.numeroEnregistrement,
    dateReception: dossier.dateReception,
    dateCompletude: dossier.dateCompletude,
  };
}

export function EtapeConformite({ id }: { id: string }) {
  const router = useRouter();
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirConformite = useDossierStore((s) => s.definirConformite);
  const validerConformite = useDossierStore((s) => s.validerConformite);
  const ajouterCourrier = useDossierStore((s) => s.ajouterCourrier);
  const revenirA = useDossierStore((s) => s.revenirA);
  const [courrierOuvert, setCourrierOuvert] = useState(false);

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

  const teinteRecevabilite: Teinte = resultat.recevabilite === "recevable" ? "succes" : resultat.recevabilite === "recevable_sous_reserve" ? "attention" : "danger";
  const parStatut = ORDRE.map((s) => ({ statut: s, controles: resultat.controles.filter((c) => c.statut === s) })).filter((g) => g.controles.length > 0);
  const nonRecevable = resultat.recevabilite === "non_recevable";
  const typeCourrier = nonRecevable ? "demande_pieces" : "accuse_reception";
  const courrierExistant = dossier.courriers.find((c) => c.type === typeCourrier);
  const limiteAr = dateLimiteAccuseReception(dossier.dateReception);
  const completude = nonRecevable ? null : (dossier.dateCompletude ?? dossier.dateReception);
  const limiteDecision = completude ? dateLimiteDecision(completude) : null;

  function genererCourrier() {
    if (!dossier || !resultat) return;
    const ctx = { ...contexteCourrier(dossier), dateCompletude: dossier.dateCompletude ?? dossier.dateReception };
    const texte = nonRecevable ? courrierDemandePieces(ctx, resultat.piecesManquantes) : courrierAccuseReception(ctx);
    ajouterCourrier(id, { type: typeCourrier, libelle: LIBELLES_COURRIER[typeCourrier], texte });
    setCourrierOuvert(true);
  }

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
        surtitre="Étape 3"
        titre="Complétude et recevabilité"
        description="Présence des pièces obligatoires et conditionnelles, formulaire complet et signé, validité et cohérence de chaque pièce avec le formulaire, rapprochement avec l'usager connu. Le verdict fixe la date de dossier complet et le courrier à adresser à l'usager."
        actions={
          <>
            <Bouton variante="secondaire" onClick={retour}>
              Retour au contrôle des données
            </Bouton>
            <Bouton onClick={suivant}>Valider et passer à la pré-instruction</Bouton>
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
                  <span className="text-xs text-slate-500">{groupe.controles.length}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {groupe.controles.map((c) => (
                    <li key={c.id} className="flex gap-3 rounded-md border border-slate-200 p-3">
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
                          {c.piece ? <span className="ml-2 text-xs font-normal text-slate-500">{LIBELLES_PIECES[c.piece]}</span> : null}
                        </p>
                        <p className="text-sm text-slate-600">{c.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Carte>

        <div className="flex flex-col gap-6">
          <Carte titre="Délais" sousTitre="Réglementaires, à compter de la réception">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-slate-500">Réception</dt>
              <dd>{dossier.dateReception}</dd>
              <dt className="text-slate-500">Accusé de réception</dt>
              <dd>
                avant le <strong>{limiteAr ?? "—"}</strong> ({PARAMETRES.joursAccuseReception} jours)
              </dd>
              <dt className="text-slate-500">Dossier complet</dt>
              <dd>{completude ? <strong>{completude}</strong> : <span className="text-amber-700">en attente de pièces</span>}</dd>
              <dt className="text-slate-500">Décision attendue</dt>
              <dd>{limiteDecision ? <>avant le <strong>{limiteDecision}</strong> ({PARAMETRES.moisDecision} mois après complétude)</> : "à compter de la réception des pièces"}</dd>
            </dl>
          </Carte>

          <Carte
            titre="Courrier à l'usager"
            sousTitre={LIBELLES_COURRIER[typeCourrier]}
            actions={
              <Bouton variante="secondaire" onClick={courrierExistant ? () => setCourrierOuvert((v) => !v) : genererCourrier}>
                {courrierExistant ? (courrierOuvert ? "Masquer" : "Afficher") : "Générer le courrier"}
              </Bouton>
            }
          >
            {nonRecevable ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-600">Pièces à réclamer :</p>
                <ul className="list-disc pl-5 text-sm">
                  {resultat.piecesManquantes.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Le dossier est complet : l&apos;accusé de réception fixe la date de complétude et annonce la visite à domicile.</p>
            )}
            {courrierExistant ? (
              <p className="mt-2 text-xs text-slate-500">Généré le {new Date(courrierExistant.genereLe).toLocaleString("fr-FR")}.</p>
            ) : null}
            {courrierExistant && courrierOuvert ? (
              <div className="mt-2 flex flex-col gap-2">
                <textarea readOnly value={courrierExistant.texte} rows={16} className="w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-xs" />
                <Bouton variante="secondaire" onClick={genererCourrier}>
                  Régénérer
                </Bouton>
              </div>
            ) : null}
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
