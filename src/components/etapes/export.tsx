"use client";

import { useState } from "react";
import { Alerte, Badge, Bouton, Carte, Titre, useMonte } from "@/components/ui";
import { LIBELLES_PIECES, TYPES_A_ECARTER } from "@/lib/decoupage";
import { lecteurDepuisDossier, metadonneesExport, nomUsager, usagerRattache } from "@/lib/dossier-utils";
import { destinataireOrientation, LIBELLES_ORIENTATION, statutPourOrientation } from "@/lib/regles/decision";
import { LIBELLES_STATUT, TEINTES_STATUT } from "@/lib/statuts";
import { useDossierStore, type DocumentRetourGed } from "@/store/dossier-store";

function slug(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function EtapeExport({ id }: { id: string }) {
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirExport = useDossierStore((s) => s.definirExport);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [voirMetadonnees, setVoirMetadonnees] = useState(false);
  const [courrierOuvert, setCourrierOuvert] = useState<string | null>(null);

  if (!monte || !dossier) return null;
  if (!dossier.decision?.valideLe && !dossier.export) {
    return <Alerte teinte="attention">L&apos;orientation n&apos;a pas été validée. Revenez à l&apos;étape précédente.</Alerte>;
  }

  const orientation = dossier.decision?.orientationRetenue ?? dossier.decision?.resultat.orientation ?? "indeterminee";
  const statut = dossier.export?.statut ?? statutPourOrientation(orientation);
  const caisse = lecteurDepuisDossier(dossier)("cerfa_formulaire", "caisse_retraite");
  const rattache = usagerRattache(dossier);
  const nouveau = dossier.rapprochement?.decision?.type === "nouveau";
  const metadonnees = metadonneesExport(dossier);
  const nir = lecteurDepuisDossier(dossier)("cerfa_formulaire", "demandeur.nir");
  const documents: DocumentRetourGed[] = (dossier.pieces ?? [])
    .filter((p) => !TYPES_A_ECARTER.includes(p.type))
    .map((p) => ({ pieceId: p.id, type: p.type, pages: p.pages, confidentiel: p.type === "certificat_medical" }));

  async function enregistrer() {
    if (!dossier) return;
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/solis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enregistrer",
          dossierId: dossier.id,
          statut,
          numeroUsagerExistant: rattache?.usager.numeroUsager ?? null,
          numeroDemandeExistante: rattache?.demandeEnCours?.numero ?? null,
          metadonnees,
        }),
      });
      const data = (await reponse.json()) as
        | { action: "cree" | "rattache" | "mis_a_jour"; numeroUsager: string; numeroDossier: string; statut: typeof statut; horodatage: string }
        | { error: string };
      if (!reponse.ok || "error" in data) throw new Error("error" in data ? data.error : `Erreur ${reponse.status}`);
      definirExport(dossier.id, { ...data, metadonnees, retourGed: documents });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setEnCours(false);
    }
  }

  const LIBELLES_ACTION = {
    cree: "Usager créé et demande enregistrée",
    rattache: "Demande enregistrée et rattachée à l'usager existant",
    mis_a_jour: "Envoi rattaché à la demande déjà en cours",
  };

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Étape 5"
        titre="Enregistrement et transmission"
        description="La demande est enregistrée dans le logiciel métier avec son statut, rattachée à l'usager confirmé ou à un usager créé, puis transmise au destinataire de l'orientation. Les pièces typées sont déposées dans la GED sous l'usager, avec le numéro de demande en retour d'index."
        actions={
          dossier.export ? (
            <Bouton variante="secondaire" href="/ged">
              Retour à la GED
            </Bouton>
          ) : (
            <Bouton onClick={enregistrer} disabled={enCours || !dossier.rapprochement?.decision}>
              {enCours ? "Enregistrement en cours…" : "Enregistrer dans Solis et transmettre"}
            </Bouton>
          )
        }
      />

      {erreur ? <Alerte teinte="danger" titre="Erreur">{erreur}</Alerte> : null}

      {dossier.export ? (
        <Alerte teinte="succes" titre={LIBELLES_ACTION[dossier.export.action]}>
          <p>
            Usager <strong>{dossier.export.numeroUsager}</strong> · Demande <strong>{dossier.export.numeroDossier}</strong> · statut{" "}
            <strong>{LIBELLES_STATUT[dossier.export.statut]}</strong> · le {new Date(dossier.export.horodatage).toLocaleString("fr-FR")}
          </p>
          <p className="mt-1">Transmis à : {destinataireOrientation(orientation, caisse)}.</p>
        </Alerte>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte titre="Usager" sousTitre="Rapprochement confirmé au contrôle des données">
          {rattache ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge teinte="primaire">Usager connu</Badge>
                <Badge>{rattache.usager.numeroUsager}</Badge>
              </div>
              <p>
                {rattache.usager.civilite} {rattache.usager.prenoms} {rattache.usager.nomNaissance}
                {rattache.usager.nomUsage ? ` (${rattache.usager.nomUsage})` : ""} · né(e) le {rattache.usager.dateNaissance}
              </p>
              <p className="text-slate-500">{rattache.usager.adresse}</p>
              {rattache.demandeEnCours ? (
                <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                  Demande {rattache.demandeEnCours.numero} déjà en cours : cet envoi y est rattaché, aucune nouvelle demande n&apos;est créée.
                </p>
              ) : (
                <p className="text-slate-600">Ce n&apos;est pas une première demande : la demande sera rattachée à cet usager.</p>
              )}
            </div>
          ) : nouveau ? (
            <div className="flex flex-col gap-2 text-sm">
              <Badge teinte="succes" className="self-start">
                Nouvel usager
              </Badge>
              <p>
                {nomUsager(dossier) ?? "Identité lue"} · NIR <span className="font-mono">{nir ?? "—"}</span>. Première demande : un usager sera créé.
              </p>
            </div>
          ) : (
            <Alerte teinte="attention">Le rapprochement n&apos;a pas été confirmé au contrôle des données.</Alerte>
          )}
        </Carte>

        <Carte titre="Demande" sousTitre="Ce qui est enregistré dans Solis">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Enregistrement</dt>
            <dd className="font-mono">{dossier.numeroEnregistrement}</dd>
            <dt className="text-slate-500">Réception</dt>
            <dd>{dossier.dateReception}</dd>
            <dt className="text-slate-500">Complétude</dt>
            <dd>{dossier.dateCompletude ?? "en attente de pièces"}</dd>
            <dt className="text-slate-500">Recevabilité</dt>
            <dd>{dossier.conformite?.recevabilite ?? "—"}</dd>
            <dt className="text-slate-500">Orientation</dt>
            <dd>{LIBELLES_ORIENTATION[orientation]}</dd>
            <dt className="text-slate-500">Statut</dt>
            <dd>
              <Badge teinte={TEINTES_STATUT[statut]}>{LIBELLES_STATUT[statut]}</Badge>
            </dd>
            <dt className="text-slate-500">Destinataire</dt>
            <dd>{destinataireOrientation(orientation, caisse)}</dd>
          </dl>
          <div className="mt-3">
            <Bouton variante="secondaire" onClick={() => setVoirMetadonnees((v) => !v)}>
              {voirMetadonnees ? "Masquer les métadonnées" : "Voir les métadonnées transmises (JSON)"}
            </Bouton>
            {voirMetadonnees ? (
              <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs">{JSON.stringify(metadonnees, null, 2)}</pre>
            ) : null}
          </div>
        </Carte>

        <Carte titre="Courriers" sousTitre={`${dossier.courriers.length} courrier(s) généré(s)`}>
          {dossier.courriers.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun courrier généré.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {dossier.courriers.map((c) => (
                <li key={c.type} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{c.libelle}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{new Date(c.genereLe).toLocaleString("fr-FR")}</span>
                      <Bouton variante="discret" className="px-0 py-0 text-xs" onClick={() => setCourrierOuvert(courrierOuvert === c.type ? null : c.type)}>
                        {courrierOuvert === c.type ? "Masquer" : "Afficher"}
                      </Bouton>
                    </div>
                  </div>
                  {courrierOuvert === c.type ? <textarea readOnly value={c.texte} rows={14} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2 font-mono text-xs" /> : null}
                </li>
              ))}
            </ul>
          )}
        </Carte>

        <Carte titre="Retour vers la GED" sousTitre={dossier.export ? `Pièces déposées sous l'usager ${dossier.export.numeroUsager}` : "Pièces qui seront déposées sous l'usager"}>
          <ul className="flex flex-col gap-2 text-sm">
            {documents.map((d) => (
              <li key={d.pieceId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
                <span>
                  {LIBELLES_PIECES[d.type]} <span className="text-xs text-slate-500">p. {d.pages.join(", ")}</span>
                  {d.confidentiel ? <Badge teinte="attention" className="ml-2">confidentiel, EMS seulement</Badge> : null}
                </span>
                <a
                  href={`/api/dossiers/${dossier.id}/pieces?pages=${d.pages.join(",")}&nom=${slug(LIBELLES_PIECES[d.type])}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-blue-700 hover:underline"
                >
                  Ouvrir le PDF de la pièce
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Chaque pièce est indexée dans la GED avec le numéro d&apos;enregistrement{dossier.export ? `, le numéro de demande ${dossier.export.numeroDossier}` : ""} et son type. Le
            certificat médical est déposé avec un accès restreint à l&apos;équipe médico-sociale.
          </p>
        </Carte>
      </div>
    </main>
  );
}
