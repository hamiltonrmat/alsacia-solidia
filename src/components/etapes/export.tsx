"use client";

import { useEffect, useState } from "react";
import type { ResultatRecherche } from "@/data/solis";
import { Alerte, Badge, Bouton, Carte, Chargement, Titre, useMonte } from "@/components/ui";
import { lecteurDepuisDossier, metadonneesExport, nomUsager } from "@/lib/dossier-utils";
import { LIBELLES_ORIENTATION } from "@/lib/regles/decision";
import { useDossierStore } from "@/store/dossier-store";

export function EtapeExport({ id }: { id: string }) {
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirExport = useDossierStore((s) => s.definirExport);
  const [recherche, setRecherche] = useState<ResultatRecherche | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [exportEnCours, setExportEnCours] = useState(false);
  const [voirMetadonnees, setVoirMetadonnees] = useState(false);

  const nir = dossier ? lecteurDepuisDossier(dossier)("cerfa_formulaire", "demandeur.nir") : null;
  const nomNaissance = dossier ? lecteurDepuisDossier(dossier)("cerfa_formulaire", "demandeur.nom_naissance") : null;
  const dateNaissance = dossier ? lecteurDepuisDossier(dossier)("cerfa_formulaire", "demandeur.date_naissance") : null;
  const dejaExporte = Boolean(dossier?.export);

  useEffect(() => {
    if (!monte || !dossier || dejaExporte || recherche) return;
    let annule = false;
    fetch("/api/solis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rechercher", nir, nomNaissance, dateNaissance }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Solis a répondu ${r.status}`);
        return (await r.json()) as ResultatRecherche;
      })
      .then((res) => !annule && setRecherche(res))
      .catch((e: unknown) => !annule && setErreur(e instanceof Error ? e.message : "Connexion à Solis impossible"));
    return () => {
      annule = true;
    };
  }, [monte, dossier, dejaExporte, recherche, nir, nomNaissance, dateNaissance]);

  if (!monte || !dossier) return null;
  if (!dossier.decision?.valideLe && !dossier.export) {
    return <Alerte teinte="attention">La décision n&apos;a pas été validée. Revenez à l&apos;étape précédente.</Alerte>;
  }

  const metadonnees = metadonneesExport(dossier);

  async function exporter() {
    if (!dossier) return;
    setExportEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/solis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "exporter",
          dossierId: dossier.id,
          numeroUsagerExistant: recherche?.trouve ? recherche.usager.numeroUsager : null,
          metadonnees,
        }),
      });
      const data = (await reponse.json()) as { action: "cree" | "rattache"; numeroUsager: string; numeroDossier: string; horodatage: string } | { error: string };
      if (!reponse.ok || "error" in data) throw new Error("error" in data ? data.error : `Erreur ${reponse.status}`);
      definirExport(dossier.id, { ...data, metadonnees });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setExportEnCours(false);
    }
  }

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Étape finale"
        titre="Export vers le logiciel métier Solis"
        description="L'usager est recherché dans Solis par son numéro de sécurité sociale, puis par son état civil. S'il est connu, la demande est rattachée à son dossier ; sinon, un usager est créé. Les métadonnées d'instruction sont transmises avec la demande."
        actions={
          dossier.export ? (
            <Bouton variante="secondaire" href="/ged">
              Retour à la GED
            </Bouton>
          ) : (
            <Bouton onClick={exporter} disabled={!recherche || exportEnCours}>
              {exportEnCours ? "Export en cours…" : "Exporter vers Solis"}
            </Bouton>
          )
        }
      />

      {erreur ? <Alerte teinte="danger" titre="Erreur">{erreur}</Alerte> : null}

      {dossier.export ? (
        <Alerte teinte="succes" titre={dossier.export.action === "rattache" ? "Demande rattachée à l'usager existant" : "Usager créé et demande enregistrée"}>
          <p>
            Usager <strong>{dossier.export.numeroUsager}</strong> · Dossier <strong>{dossier.export.numeroDossier}</strong> · le{" "}
            {new Date(dossier.export.horodatage).toLocaleString("fr-FR")}
          </p>
          <p className="mt-1">Orientation transmise : {dossier.decision?.orientationRetenue ? LIBELLES_ORIENTATION[dossier.decision.orientationRetenue] : "—"}</p>
        </Alerte>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte titre="Usager dans Solis" sousTitre="Logiciel métier (simulation)">
          {dossier.export ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Export effectué.</p>
          ) : !recherche ? (
            <Chargement texte="Recherche de l'usager dans Solis…" />
          ) : recherche.trouve ? (
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge teinte="primaire">Usager connu</Badge>
                <Badge>trouvé par {recherche.critere === "nir" ? "NIR" : "état civil"}</Badge>
              </div>
              <p>
                <strong>{recherche.usager.numeroUsager}</strong> · {recherche.usager.prenoms} {recherche.usager.nomNaissance}
                {recherche.usager.nomUsage ? ` (${recherche.usager.nomUsage})` : ""} · né(e) le {recherche.usager.dateNaissance}
              </p>
              <p className="text-zinc-500">{recherche.usager.adresse}</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                    <th className="py-1 pr-2 font-medium">Dossier</th>
                    <th className="py-1 pr-2 font-medium">Type</th>
                    <th className="py-1 pr-2 font-medium">Date</th>
                    <th className="py-1 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {recherche.usager.dossiers.map((d) => (
                    <tr key={d.numero} className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-1 pr-2 font-mono">{d.numero}</td>
                      <td className="py-1 pr-2">{d.type}</td>
                      <td className="py-1 pr-2">{d.dateDemande}</td>
                      <td className="py-1">{d.statut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-zinc-600 dark:text-zinc-400">Ce n&apos;est pas une première demande : la nouvelle demande sera rattachée à cet usager.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <Badge teinte="succes" className="self-start">Usager inconnu</Badge>
              <p>
                Aucun usager ne correspond au NIR {nir ?? "—"} ni à {nomUsager(dossier) ?? "l'état civil lu"} ({dateNaissance ?? "date de naissance non lue"}). Première demande : un
                usager sera créé dans Solis.
              </p>
            </div>
          )}
        </Carte>

        <Carte
          titre="Métadonnées transmises"
          sousTitre="Identité, demande, pièces et instruction"
          actions={
            <Bouton variante="secondaire" onClick={() => setVoirMetadonnees((v) => !v)}>
              {voirMetadonnees ? "Masquer le JSON" : "Voir le JSON"}
            </Bouton>
          }
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-zinc-500">Usager</dt>
            <dd>{nomUsager(dossier) ?? "—"}</dd>
            <dt className="text-zinc-500">NIR</dt>
            <dd className="font-mono">{nir ?? "—"}</dd>
            <dt className="text-zinc-500">Recevabilité</dt>
            <dd>{dossier.conformite?.recevabilite ?? "—"}</dd>
            <dt className="text-zinc-500">Orientation</dt>
            <dd>{dossier.decision?.orientationRetenue ? LIBELLES_ORIENTATION[dossier.decision.orientationRetenue] : "—"}</dd>
            <dt className="text-zinc-500">Pièces</dt>
            <dd>{(dossier.pieces ?? []).length}</dd>
          </dl>
          {voirMetadonnees ? (
            <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900">
              {JSON.stringify(metadonnees, null, 2)}
            </pre>
          ) : null}
        </Carte>
      </div>
    </main>
  );
}
