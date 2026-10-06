"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { contexteCourrier } from "@/components/etapes/conformite";
import { Alerte, Badge, Bouton, Carte, Titre, useMonte, type Teinte } from "@/components/ui";
import { courrierAccuseReception, courrierDemandePieces, courrierOrientationMdph, courrierTransmissionCaisse, LIBELLES_COURRIER, type TypeCourrier } from "@/lib/courriers";
import { TYPES_A_ECARTER } from "@/lib/decoupage";
import { lecteurDepuisDossier, pagesCerfaPresentes, rapprochementPourConformite } from "@/lib/dossier-utils";
import { evaluerConformite } from "@/lib/regles/conformite";
import { destinataireOrientation, evaluerDecision, LIBELLES_CAISSE, LIBELLES_ORIENTATION, ORIENTATIONS, PARAMETRES, statutPourOrientation, type Orientation, type StatutRegle } from "@/lib/regles/decision";
import { LIBELLES_STATUT } from "@/lib/statuts";
import { useDossierStore } from "@/store/dossier-store";

const STATUTS: Record<StatutRegle, { libelle: string; teinte: Teinte }> = {
  verifiee: { libelle: "Vérifiée", teinte: "succes" },
  non_verifiee: { libelle: "Non remplie", teinte: "danger" },
  attention: { libelle: "Point d'attention", teinte: "attention" },
  indeterminee: { libelle: "Indéterminée", teinte: "neutre" },
};

const COURRIER_PAR_ORIENTATION: Partial<Record<Orientation, TypeCourrier>> = {
  instruction_apa: "accuse_reception",
  pieces_manquantes: "demande_pieces",
  caisse_retraite: "transmission_caisse",
  mdph: "orientation_mdph",
};

export function EtapeDecision({ id }: { id: string }) {
  const router = useRouter();
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirDecision = useDossierStore((s) => s.definirDecision);
  const definirConformite = useDossierStore((s) => s.definirConformite);
  const ajouterCourrier = useDossierStore((s) => s.ajouterCourrier);
  const revenirA = useDossierStore((s) => s.revenirA);

  const pieces = dossier?.pieces;
  const pagesClassees = dossier?.pagesClassees;
  const extractions = dossier?.extractions;
  const rapprochement = dossier?.rapprochement;
  const dateReception = dossier?.dateReception;

  // La recevabilité est recalculée ici pour rester juste même si l'agent a
  // corrigé une valeur sans repasser par l'étape de complétude.
  const conformite = useMemo(() => {
    if (!dossier || !pieces || !extractions || !dateReception) return null;
    return evaluerConformite({
      pieces: pieces.filter((p) => !TYPES_A_ECARTER.includes(p.type)),
      lire: lecteurDepuisDossier(dossier),
      dateReception,
      pagesCerfa: pagesCerfaPresentes(dossier),
      rapprochement: rapprochementPourConformite(dossier),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, pagesClassees, extractions, rapprochement, dateReception]);

  useEffect(() => {
    if (!conformite || !dossier) return;
    if (JSON.stringify(dossier.conformite?.controles) !== JSON.stringify(conformite.controles)) definirConformite(id, conformite);
  }, [conformite, dossier, id, definirConformite]);

  const resultat = useMemo(() => {
    if (!dossier || !pieces || !conformite || !dateReception) return null;
    return evaluerDecision({
      pieces: pieces.filter((p) => !TYPES_A_ECARTER.includes(p.type)),
      lire: lecteurDepuisDossier(dossier),
      dateReception,
      recevabilite: conformite.recevabilite,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, extractions, conformite, dateReception]);

  const [orientation, setOrientation] = useState<Orientation | null>(dossier?.decision?.orientationRetenue ?? null);
  const [commentaire, setCommentaire] = useState(dossier?.decision?.commentaire ?? "");

  if (!monte || !dossier) return null;
  if (!resultat || !conformite) return <Alerte teinte="attention">Le contrôle de complétude n&apos;a pas été effectué. Revenez à l&apos;étape précédente.</Alerte>;

  const retenue = orientation ?? resultat.orientation;
  const teinteReco: Teinte = resultat.orientation === "instruction_apa" ? "succes" : resultat.orientation === "indeterminee" ? "neutre" : "attention";
  const caisse = lecteurDepuisDossier(dossier)("cerfa_formulaire", "caisse_retraite");
  const statutCible = statutPourOrientation(retenue);
  const typeCourrier = COURRIER_PAR_ORIENTATION[retenue];

  function valider() {
    if (!resultat || !dossier) return;
    if (typeCourrier && !dossier.courriers.some((c) => c.type === typeCourrier)) {
      const ctx = { ...contexteCourrier(dossier), dateCompletude: dossier.dateCompletude ?? dossier.dateReception };
      const texte =
        typeCourrier === "accuse_reception"
          ? courrierAccuseReception(ctx)
          : typeCourrier === "demande_pieces"
            ? courrierDemandePieces(ctx, conformite?.piecesManquantes ?? [])
            : typeCourrier === "transmission_caisse"
              ? courrierTransmissionCaisse(ctx, LIBELLES_CAISSE[caisse ?? "autre"] ?? "sa caisse de retraite")
              : courrierOrientationMdph(ctx);
      ajouterCourrier(id, { type: typeCourrier, libelle: LIBELLES_COURRIER[typeCourrier], texte });
    }
    definirDecision(id, { resultat, orientationRetenue: retenue, commentaire: commentaire || undefined, valideLe: new Date().toISOString() }, statutCible);
    router.push(`/dossiers/${id}/export`);
  }

  function retour() {
    revenirA(id, "conformite");
    router.push(`/dossiers/${id}/conformite`);
  }

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Étape 4"
        titre="Pré-instruction et orientation"
        description={`Les règles administratives sont appliquées au dossier : condition d'âge (${PARAMETRES.ageMinimumApa} ans), organisme compétent d'après le questionnaire, lieu de résidence, département financeur, non-cumul. L'agent d'accueil ne décide pas de l'attribution : il retient l'orientation et prépare la transmission.`}
        actions={
          <>
            <Bouton variante="secondaire" onClick={retour}>
              Retour à la recevabilité
            </Bouton>
            <Bouton onClick={valider}>Valider l&apos;orientation et préparer la transmission</Bouton>
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
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-slate-200 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.libelle}</p>
                  <p className="text-sm text-slate-600">{r.detail}</p>
                </div>
                <Badge teinte={STATUTS[r.statut].teinte}>{STATUTS[r.statut].libelle}</Badge>
              </li>
            ))}
          </ul>
        </Carte>

        <div className="flex flex-col gap-6">
          <Carte titre="Orientation retenue par l'agent">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm text-slate-600">Choisir l&apos;orientation</legend>
              {ORIENTATIONS.map((o) => (
                <label key={o} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${retenue === o ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                  <input type="radio" name="orientation" value={o} checked={retenue === o} onChange={() => setOrientation(o)} />
                  <span>{LIBELLES_ORIENTATION[o]}</span>
                  {o === resultat.orientation ? <Badge teinte="info">proposée</Badge> : null}
                </label>
              ))}
            </fieldset>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-slate-500">Destinataire</dt>
              <dd>{destinataireOrientation(retenue, caisse)}</dd>
              <dt className="text-slate-500">Statut du dossier</dt>
              <dd>{LIBELLES_STATUT[statutCible]}</dd>
              <dt className="text-slate-500">Courrier</dt>
              <dd>{typeCourrier ? LIBELLES_COURRIER[typeCourrier] : "aucun"}</dd>
            </dl>
            <label className="mt-4 flex flex-col gap-1 text-sm">
              Commentaire pour l&apos;instruction
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={4}
                placeholder="Motivation, points à signaler…"
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
              />
            </label>
          </Carte>
        </div>
      </div>
    </main>
  );
}
