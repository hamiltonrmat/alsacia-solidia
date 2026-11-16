"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CarteRapport } from "@/components/rapport-pdf";
import { Alerte, Badge, Bouton, Carte, Titre, useMonte } from "@/components/ui";
import { LIBELLES_PIECES, TYPES_A_ECARTER } from "@/lib/decoupage";
import { lecteurDepuisDossier, metadonneesExport, nomUsager, usagerRattache } from "@/lib/dossier-utils";
import { lireReponseApi } from "@/lib/reponse-api";
import { LIBELLES_STATUT, TEINTES_STATUT, type StatutDossier } from "@/lib/statuts";
import { useDossierStore, type DocumentRetourGed, type DocumentSolis } from "@/store/dossier-store";

function slug(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const LIBELLES_ACTION = {
  cree: "Usager créé et demande enregistrée",
  rattache: "Demande enregistrée et rattachée à l'usager existant",
  mis_a_jour: "Envoi rattaché à la demande déjà en cours",
};

export function EtapeExport({ id }: { id: string }) {
  const router = useRouter();
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirExport = useDossierStore((s) => s.definirExport);
  const revenirA = useDossierStore((s) => s.revenirA);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [voirMetadonnees, setVoirMetadonnees] = useState(false);

  if (!monte || !dossier) return null;
  if (!dossier.rapport && !dossier.export) {
    return (
      <Alerte teinte="attention" titre="Le rapport de contrôle n'a pas été généré">
        La transmission vers Solis part avec le rapport de contrôle, généré à la validation de l&apos;étape « Complétude et conformité ».
        <div className="mt-2">
          <Bouton href={`/dossiers/${id}/conformite`}>Aller à la complétude et conformité</Bouton>
        </div>
      </Alerte>
    );
  }

  const rapport = dossier.rapport?.donnees;
  const rapportPerime = !dossier.export && dossier.rapport !== undefined && dossier.rapport.revision !== dossier.revision;
  const statut: StatutDossier = dossier.export?.statut ?? rapport?.dossier.statutTransmission ?? "transmis_incomplet";
  const rattache = usagerRattache(dossier);
  const nouveau = dossier.rapprochement?.decision?.type === "nouveau";
  const metadonnees = metadonneesExport(dossier);
  const nir = lecteurDepuisDossier(dossier)("cerfa_formulaire", "demandeur.nir");
  const documents: DocumentRetourGed[] = (dossier.pieces ?? [])
    .filter((p) => !TYPES_A_ECARTER.includes(p.type))
    .map((p) => ({ pieceId: p.id, type: p.type, pages: p.pages }));
  const documentRapport = dossier.export?.documents.find((d) => d.type === "rapport_controle");
  const empreinteConforme = documentRapport && dossier.rapport?.empreinte ? documentRapport.empreinte === dossier.rapport.empreinte : null;

  async function enregistrer() {
    if (!dossier || !rapport) return;
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
          rapport,
        }),
      });
      const data = await lireReponseApi<{
        action: "cree" | "rattache" | "mis_a_jour";
        numeroUsager: string;
        numeroDossier: string;
        statut: StatutDossier;
        horodatage: string;
        documents: DocumentSolis[];
      }>(reponse);
      definirExport(dossier.id, { ...data, metadonnees, retourGed: documents });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setEnCours(false);
    }
  }

  function retourCompletude() {
    revenirA(id, "conformite");
    router.push(`/dossiers/${id}/conformite`);
  }

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Étape 5"
        titre="Enregistrement et transmission"
        description="La demande est enregistrée dans Solis, rattachée à l'usager confirmé ou à un usager créé, avec le rapport de contrôle et ses données structurées. Les pièces typées sont déposées dans la GED sous l'usager. L'appréciation du droit à la prestation appartient ensuite à l'instruction dans Solis."
        actions={
          dossier.export ? (
            <>
              <Bouton variante="secondaire" href="/dossiers">
                Retour au traitement des dossiers
              </Bouton>
              <Bouton href="/solis">Voir la demande dans Solis</Bouton>
            </>
          ) : (
            <Bouton onClick={enregistrer} disabled={enCours || rapportPerime || !dossier.rapprochement?.decision}>
              {enCours ? "Enregistrement en cours…" : "Enregistrer dans Solis et transmettre"}
            </Bouton>
          )
        }
      />

      {erreur ? <Alerte teinte="danger" titre="Erreur">{erreur}</Alerte> : null}

      {rapportPerime ? (
        <Alerte teinte="danger" titre="Le rapport de contrôle n'est plus à jour">
          Le dossier a été modifié depuis la génération du rapport : la transmission est bloquée tant que le rapport n&apos;est pas régénéré.
          <div className="mt-2">
            <Bouton onClick={retourCompletude}>Revenir à la complétude et conformité</Bouton>
          </div>
        </Alerte>
      ) : null}

      {dossier.export ? (
        <Alerte teinte="succes" titre={LIBELLES_ACTION[dossier.export.action]}>
          <p>
            Usager <strong>{dossier.export.numeroUsager}</strong> · Demande <strong>{dossier.export.numeroDossier}</strong> · statut{" "}
            <strong>{LIBELLES_STATUT[dossier.export.statut]}</strong> · le {new Date(dossier.export.horodatage).toLocaleString("fr-FR")}
          </p>
          {documentRapport ? (
            <p className="mt-1">
              Rapport de contrôle déposé sous la référence <strong className="font-mono">{documentRapport.reference}</strong> ({documentRapport.nbPages} pages)
              {empreinteConforme === true ? " : empreinte identique au rapport généré, document intègre." : empreinteConforme === false ? " : l'empreinte diffère du rapport généré, à vérifier." : "."}
            </p>
          ) : null}
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
            <dt className="text-slate-500">Dossier complet</dt>
            <dd>{dossier.dateCompletude ?? "non, pièces manquantes ou point bloquant"}</dd>
            <dt className="text-slate-500">Contrôle</dt>
            <dd>{rapport?.synthese.libelleVerdict ?? "—"}</dd>
            <dt className="text-slate-500">Statut</dt>
            <dd>
              <Badge teinte={TEINTES_STATUT[statut]}>{LIBELLES_STATUT[statut]}</Badge>
            </dd>
            <dt className="text-slate-500">Destinataire</dt>
            <dd>Solis, service instructeur des aides à l&apos;autonomie</dd>
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
      </div>

      <CarteRapport dossier={dossier} apercuOuvert={false} />

      <Carte titre="Retour vers la GED" sousTitre={dossier.export ? `Pièces déposées sous l'usager ${dossier.export.numeroUsager}` : "Pièces qui seront déposées sous l'usager"}>
        <ul className="grid gap-2 text-sm md:grid-cols-2">
          {documents.map((d) => (
            <li key={d.pieceId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
              <span>
                {LIBELLES_PIECES[d.type]} <span className="text-xs text-slate-500">p. {d.pages.join(", ")}</span>
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
          Chaque pièce est indexée dans la GED avec le numéro d&apos;enregistrement{dossier.export ? `, le numéro de demande ${dossier.export.numeroDossier}` : ""} et son type,
          sous l&apos;usager, de sorte qu&apos;elle soit retrouvable depuis sa fiche.
        </p>
      </Carte>
    </main>
  );
}
