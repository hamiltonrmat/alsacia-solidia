"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DossierGed, LotGedAvecDossiers } from "@/app/api/ged/lots/route";
import { cheminEtape, libelleEtape } from "@/components/dossiers-en-cours";
import { Alerte, Badge, Bouton, Carte, Chargement, Titre, useMonte } from "@/components/ui";
import { classerPages, regrouperEnPieces } from "@/lib/decoupage";
import { useDossierStore } from "@/store/dossier-store";

type EtatImport = { id: string; message: string } | null;

/** Page d'import : connexion à la GED simulée, choix du lot et du dossier, OCR. */
export function ImportGed() {
  const router = useRouter();
  const monte = useMonte();
  const [lots, setLots] = useState<LotGedAvecDossiers[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lotId, setLotId] = useState<string | null>(null);
  const [importEnCours, setImportEnCours] = useState<EtatImport>(null);

  const dossiersPoste = useDossierStore((s) => s.dossiers);
  const importerDossier = useDossierStore((s) => s.importerDossier);
  const supprimerDossier = useDossierStore((s) => s.supprimerDossier);
  const definirOcr = useDossierStore((s) => s.definirOcr);
  const definirDecoupage = useDossierStore((s) => s.definirDecoupage);

  useEffect(() => {
    let annule = false;
    fetch("/api/ged/lots")
      .then(async (r) => {
        if (!r.ok) throw new Error(`La GED a répondu ${r.status}`);
        return (await r.json()) as { lots: LotGedAvecDossiers[] };
      })
      .then((data) => {
        if (annule) return;
        setLots(data.lots);
        setLotId(data.lots.find((l) => l.dossiers.length > 0)?.id ?? data.lots[0]?.id ?? null);
      })
      .catch((e: unknown) => !annule && setErreur(e instanceof Error ? e.message : "Connexion à la GED impossible"));
    return () => {
      annule = true;
    };
  }, []);

  async function importer(lot: LotGedAvecDossiers, dossier: DossierGed) {
    setErreur(null);
    setImportEnCours({ id: dossier.id, message: "Transfert du PDF depuis la GED…" });
    importerDossier({
      id: dossier.id,
      lotId: lot.id,
      libelle: dossier.libelle,
      dateReception: dossier.dateReception,
      cheminPdf: dossier.cheminPdf,
      nbPages: dossier.nbPages,
    });
    try {
      setImportEnCours({ id: dossier.id, message: `OCR Mistral en cours (${dossier.nbPages} pages)…` });
      const reponse = await fetch(`/api/dossiers/${dossier.id}/ocr`, { method: "POST" });
      const data = (await reponse.json()) as { pages: Array<{ index: number; markdown: string }>; modele: string; dureeMs: number } | { error: string };
      if (!reponse.ok || "error" in data) throw new Error("error" in data ? data.error : `Erreur ${reponse.status}`);
      definirOcr(dossier.id, data);
      setImportEnCours({ id: dossier.id, message: "Classification des pages…" });
      const pagesClassees = classerPages(data.pages);
      definirDecoupage(dossier.id, pagesClassees, regrouperEnPieces(pagesClassees));
      router.push(`/dossiers/${dossier.id}/decoupage`);
    } catch (e) {
      supprimerDossier(dossier.id);
      setErreur(e instanceof Error ? e.message : "Import impossible");
      setImportEnCours(null);
    }
  }

  const lot = lots?.find((l) => l.id === lotId) ?? null;

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Étape préalable"
        titre="Import depuis la GED"
        description="Les dossiers numérisés arrivent par lots. Sélectionnez un lot, puis chargez le dossier à instruire : l'OCR démarre aussitôt et le dossier entre dans le poste de travail."
      />

      {erreur ? <Alerte teinte="danger" titre="Erreur">{erreur}</Alerte> : null}

      {!lots ? (
        <Carte>
          <Chargement texte="Connexion à la GED départementale…" />
        </Carte>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Carte titre="Lots de numérisation" sousTitre="GED départementale (simulation)">
            <ul className="flex flex-col gap-2">
              {lots.map((l) => {
                const actif = l.id === lotId;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setLotId(l.id)}
                      className={`w-full rounded-md border px-3 py-2 text-left transition ${actif ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{l.libelle}</span>
                        <Badge teinte={l.dossiers.length ? "primaire" : "neutre"}>
                          {l.dossiers.length} dossier{l.dossiers.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {l.date} · {l.source}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Carte>

          <Carte titre={lot ? `Dossiers du ${lot.libelle}` : "Dossiers"} sousTitre={lot?.source}>
            {!lot || lot.dossiers.length === 0 ? (
              <p className="text-sm text-slate-500">Ce lot ne contient aucun dossier à traiter.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {lot.dossiers.map((d) => {
                  const enPoste = monte ? dossiersPoste[d.id] : undefined;
                  const enImport = importEnCours?.id === d.id;
                  return (
                    <li key={d.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {d.id} <span className="text-slate-500">· {d.libelle}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            Reçu le {d.dateReception} · {d.nbPages} pages · {d.tailleKo ? `${(d.tailleKo / 1024).toFixed(1)} Mo` : "PDF non généré"}
                          </p>
                        </div>
                        {enPoste ? <Badge teinte={enPoste.etape === "termine" ? "succes" : "primaire"}>{libelleEtape(enPoste.etape)}</Badge> : <Badge>À traiter</Badge>}
                      </div>

                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-slate-600 dark:text-slate-400">Scénario de démonstration : {d.scenario.titre}</summary>
                        <ul className="mt-1 list-disc pl-5 text-slate-600 dark:text-slate-400">
                          {d.scenario.attendu.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </details>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {enPoste && !enImport ? (
                          <Bouton variante="secondaire" href={cheminEtape(d.id, enPoste.etape)}>
                            Reprendre
                          </Bouton>
                        ) : null}
                        <Bouton onClick={() => importer(lot, d)} disabled={importEnCours !== null || !d.tailleKo}>
                          {enImport ? "Import en cours…" : enPoste ? "Réimporter et relancer l'OCR" : "Importer et lancer l'OCR"}
                        </Bouton>
                        {enImport ? <Chargement texte={importEnCours?.message} /> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Carte>
        </div>
      )}
    </main>
  );
}
