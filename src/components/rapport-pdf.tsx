"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Alerte, Badge, Bouton, Carte, Chargement, type Teinte } from "@/components/ui";
import { LIBELLES_NIVEAU, nomFichierRapport, type NiveauRobustesse, type RapportControle } from "@/lib/rapport/modele";
import type { Verdict } from "@/lib/regles/conformite";
import { useDossierStore, type EtatDossier } from "@/store/dossier-store";

/**
 * Rapport de contrôle côté navigateur : demande de mise en page au serveur,
 * aperçu, téléchargement. Le rapport lui-même (données structurées) est
 * construit et conservé dans l'état du dossier.
 */

export const TEINTE_VERDICT: Record<Verdict, Teinte> = { conforme: "succes", conforme_sous_reserve: "attention", non_conforme: "danger" };
export const TEINTE_NIVEAU: Record<NiveauRobustesse, Teinte> = { bonne: "succes", moyenne: "attention", faible: "danger", non_evaluee: "neutre" };

type MiseEnPage = { blob: Blob; empreinte: string | null; nbPages: number | null };

export async function demanderRapportPdf(rapport: RapportControle): Promise<MiseEnPage> {
  const reponse = await fetch("/api/rapport", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rapport }),
  });
  if (!reponse.ok) {
    let message = `Le serveur a répondu ${reponse.status}`;
    try {
      message = ((await reponse.json()) as { error?: string }).error ?? message;
    } catch {
      // réponse non JSON : on garde le message générique
    }
    throw new Error(message);
  }
  return {
    blob: await reponse.blob(),
    empreinte: reponse.headers.get("X-Empreinte-Sha256"),
    nbPages: Number(reponse.headers.get("X-Nombre-Pages")) || null,
  };
}

type EtatPdf = { cle: string; url: string | null; empreinte: string | null; nbPages: number | null; tailleOctets: number | null; erreur: string | null };

/** URL locale (blob) du PDF d'un rapport, demandée au serveur quand le rapport change. */
export function useRapportPdf(rapport: RapportControle | undefined, actif = true) {
  const [essai, setEssai] = useState(0);
  const [etat, setEtat] = useState<EtatPdf | null>(null);
  const cle = rapport ? `${rapport.dossier.numeroEnregistrement}|${rapport.genereLe}|${essai}` : null;

  useEffect(() => {
    if (!actif || !rapport || !cle) return;
    let annule = false;
    let url: string | null = null;
    demanderRapportPdf(rapport)
      .then((r) => {
        if (annule) return;
        url = URL.createObjectURL(r.blob);
        setEtat({ cle, url, empreinte: r.empreinte, nbPages: r.nbPages, tailleOctets: r.blob.size, erreur: null });
      })
      .catch((e: unknown) => {
        if (!annule) setEtat({ cle, url: null, empreinte: null, nbPages: null, tailleOctets: null, erreur: e instanceof Error ? e.message : "Mise en page impossible" });
      });
    return () => {
      annule = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [actif, rapport, cle]);

  const aJour = etat !== null && etat.cle === cle;
  return {
    url: aJour ? etat.url : null,
    empreinte: aJour ? etat.empreinte : null,
    nbPages: aJour ? etat.nbPages : null,
    tailleOctets: aJour ? etat.tailleOctets : null,
    erreur: aJour ? etat.erreur : null,
    enCours: Boolean(actif && cle && !aJour),
    relancer: () => setEssai((n) => n + 1),
  };
}

/** Bouton qui ouvre le PDF d'un rapport dans un nouvel onglet (onglet ouvert avant la requête, pour ne pas être bloqué). */
export function BoutonOuvrirRapport({ rapport, libelle = "Rapport de contrôle (PDF)" }: { rapport: RapportControle; libelle?: string }) {
  const [enCours, setEnCours] = useState(false);
  async function ouvrir() {
    const onglet = window.open("", "_blank");
    setEnCours(true);
    try {
      const { blob } = await demanderRapportPdf(rapport);
      const url = URL.createObjectURL(blob);
      if (onglet) onglet.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      onglet?.close();
      window.alert(e instanceof Error ? e.message : "Ouverture du rapport impossible");
    } finally {
      setEnCours(false);
    }
  }
  return (
    <button type="button" onClick={ouvrir} disabled={enCours} className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-60">
      {enCours ? "Mise en page…" : libelle}
    </button>
  );
}

function taille(octets: number | null | undefined): string {
  if (!octets) return "—";
  return octets > 1024 * 1024 ? `${(octets / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(octets / 1024)} Ko`;
}

/**
 * Carte du rapport de contrôle d'un dossier : synthèse, empreinte, aperçu du
 * PDF et téléchargement. Enregistre l'empreinte renvoyée par le serveur.
 */
export function CarteRapport({ dossier, apercuOuvert = true, actions }: { dossier: EtatDossier; apercuOuvert?: boolean; actions?: ReactNode }) {
  const definirMiseEnPageRapport = useDossierStore((s) => s.definirMiseEnPageRapport);
  const [apercu, setApercu] = useState(apercuOuvert);
  const rapport = dossier.rapport?.donnees;
  const pdf = useRapportPdf(rapport);
  const stocke = dossier.rapport;

  // Conserve l'empreinte et la taille du PDF avec le rapport, une fois connues.
  useEffect(() => {
    if (pdf.empreinte && pdf.nbPages && pdf.tailleOctets && stocke && stocke.empreinte !== pdf.empreinte) {
      definirMiseEnPageRapport(dossier.id, { empreinte: pdf.empreinte, nbPages: pdf.nbPages, tailleOctets: pdf.tailleOctets });
    }
  }, [pdf.empreinte, pdf.nbPages, pdf.tailleOctets, stocke, dossier.id, definirMiseEnPageRapport]);

  if (!rapport || !stocke) return null;

  return (
    <Carte
      titre="Rapport de contrôle"
      sousTitre={`Généré le ${new Date(rapport.genereLe).toLocaleString("fr-FR")} · schéma ${rapport.schema} v${rapport.version}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {pdf.url ? (
            <>
              <Bouton variante="secondaire" onClick={() => setApercu((v) => !v)}>
                {apercu ? "Masquer l'aperçu" : "Afficher l'aperçu"}
              </Bouton>
              <a href={pdf.url} download={nomFichierRapport(rapport)} className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                Télécharger le PDF
              </a>
              <a href={pdf.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-700 hover:underline">
                Ouvrir dans un onglet
              </a>
            </>
          ) : null}
          {actions}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge teinte={TEINTE_VERDICT[rapport.synthese.verdict]}>{rapport.synthese.libelleVerdict}</Badge>
          <Badge teinte={TEINTE_NIVEAU[rapport.ocr.global.niveau]}>
            Robustesse OCR {rapport.ocr.global.indice ?? "—"} / 100 · {LIBELLES_NIVEAU[rapport.ocr.global.niveau].toLowerCase()}
          </Badge>
          <Badge>{rapport.deliassage.pieces.length} documents</Badge>
          <Badge>{rapport.ocr.global.champs} champs contrôlés</Badge>
          <Badge>{rapport.completude.controles.length} règles appliquées</Badge>
          {stocke.nbPages ? <Badge>{stocke.nbPages} pages · {taille(stocke.tailleOctets)}</Badge> : null}
        </div>
        <p className="text-xs text-slate-500">
          Empreinte SHA-256 du PDF : <span className="break-all font-mono">{stocke.empreinte ?? pdf.empreinte ?? "en cours de calcul"}</span>. Le PDF embarque sa
          version structurée (JSON) en pièce jointe, transmise à Solis avec la demande.
        </p>
        {pdf.erreur ? (
          <Alerte teinte="danger" titre="Mise en page impossible">
            {pdf.erreur}{" "}
            <button type="button" onClick={pdf.relancer} className="font-medium underline">
              Réessayer
            </button>
          </Alerte>
        ) : null}
        {pdf.enCours ? <Chargement texte="Mise en page du rapport…" /> : null}
        {pdf.url && apercu ? <iframe title="Aperçu du rapport de contrôle" src={`${pdf.url}#view=FitH`} className="h-[75vh] w-full rounded-md border border-slate-200 bg-slate-100" /> : null}
      </div>
    </Carte>
  );
}
