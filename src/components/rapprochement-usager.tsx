"use client";

import { useEffect, useRef, useState } from "react";
import { LIBELLES_CRITERE, type CandidatSolis } from "@/data/solis";
import { Alerte, Badge, Bouton, Carte, Chargement } from "@/components/ui";
import { identiteLue } from "@/lib/dossier-utils";
import { useDossierStore } from "@/store/dossier-store";

/**
 * Rapprochement d'identité avec le logiciel métier (identitovigilance).
 * L'outil propose des candidats du plus sûr au moins sûr ; l'agent confirme
 * l'usager existant ou déclare un nouvel usager. Jamais de rattachement
 * automatique.
 */
export function RapprochementUsager({ id }: { id: string }) {
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirRapprochement = useDossierStore((s) => s.definirRapprochement);
  const confirmerRapprochement = useDossierStore((s) => s.confirmerRapprochement);
  const [erreur, setErreur] = useState<{ cle: string; message: string } | null>(null);
  const derniereCle = useRef<string | null>(null);

  const identite = dossier ? identiteLue(dossier) : null;
  const nir = identite?.nir ?? null;
  const nomNaissance = identite?.nomNaissance ?? null;
  const nomUsage = identite?.nomUsage ?? null;
  const dateNaissance = identite?.dateNaissance ?? null;
  const identiteDisponible = Boolean(nir || (nomNaissance && dateNaissance));
  // La clé texte des critères est le seul déclencheur de la recherche : elle ne
  // change que si une valeur d'identité change, pas à chaque rendu.
  const cle = identiteDisponible ? JSON.stringify({ nir, nomNaissance, nomUsage, dateNaissance }) : null;
  const rapprochement = dossier?.rapprochement;
  const aJour = Boolean(rapprochement && cle && JSON.stringify(rapprochement.criteres) === cle);
  const erreurCourante = erreur && erreur.cle === cle ? erreur.message : null;
  const enCours = Boolean(cle) && !aJour && !erreurCourante;

  useEffect(() => {
    if (!cle || aJour || derniereCle.current === cle) return;
    derniereCle.current = cle;
    const criteres = JSON.parse(cle) as { nir: string | null; nomNaissance: string | null; nomUsage: string | null; dateNaissance: string | null };
    fetch("/api/solis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rechercher", ...criteres }) })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Solis a répondu ${r.status}`);
        return (await r.json()) as { candidats: CandidatSolis[] };
      })
      .then((data) => {
        setErreur(null);
        definirRapprochement(id, { criteres, candidats: data.candidats, rechercheLe: new Date().toISOString() });
      })
      .catch((e: unknown) => {
        derniereCle.current = null;
        setErreur({ cle, message: e instanceof Error ? e.message : "Connexion à Solis impossible" });
      });
  }, [cle, aJour, id, definirRapprochement]);

  if (!dossier || !identite) return null;

  const decision = aJour ? rapprochement?.decision : undefined;

  return (
    <Carte
      titre="Rapprochement avec les usagers connus"
      sousTitre="Logiciel métier Solis (simulation) · recherche par NIR, puis par nom et date de naissance"
      actions={
        <Bouton
          variante="secondaire"
          disabled={enCours || !identiteDisponible}
          onClick={() => {
            derniereCle.current = null;
            setErreur(null);
            definirRapprochement(id, { criteres: { nir: null, nomNaissance: null, nomUsage: null, dateNaissance: null }, candidats: [], rechercheLe: "" });
          }}
        >
          Relancer la recherche
        </Bouton>
      }
    >
      <p className="mb-3 text-sm text-slate-600">
        Critères : NIR <span className="font-mono">{identite.nir ?? "non lu"}</span> · {identite.nomNaissance ?? "nom non lu"}
        {identite.nomUsage ? ` (${identite.nomUsage})` : ""} · né(e) le {identite.dateNaissance ?? "date non lue"}
      </p>

      {!identiteDisponible ? (
        <Alerte teinte="attention">Renseignez au moins le NIR, ou le nom de naissance et la date de naissance, pour lancer la recherche.</Alerte>
      ) : erreurCourante ? (
        <Alerte teinte="danger" titre="Recherche impossible">
          {erreurCourante} — utilisez « Relancer la recherche ».
        </Alerte>
      ) : enCours ? (
        <Chargement texte="Recherche dans Solis…" />
      ) : decision ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {decision.type === "existant" ? (
            <span>
              Usager <strong>{decision.numeroUsager}</strong> rattaché
              {decision.numeroDemandeEnCours ? (
                <>
                  {" "}
                  · demande <strong>{decision.numeroDemandeEnCours}</strong> déjà en cours, cet envoi y sera rattaché
                </>
              ) : null}
              .
            </span>
          ) : (
            <span>
              <strong>Nouvel usager</strong> : aucune correspondance retenue, un usager sera créé à l&apos;enregistrement.
            </span>
          )}
          <Bouton
            variante="discret"
            className="ml-auto px-0 py-0"
            onClick={() => rapprochement && definirRapprochement(id, { ...rapprochement, decision: undefined, confirmeLe: undefined })}
          >
            Modifier
          </Bouton>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rapprochement && rapprochement.candidats.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {rapprochement.candidats.map((c) => (
                <li key={c.usager.numeroUsager} className={`rounded-md border p-3 ${c.critere === "homonyme" ? "border-slate-200" : "border-blue-200 bg-blue-50/40"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {c.usager.numeroUsager} · {c.usager.civilite} {c.usager.prenoms} {c.usager.nomNaissance}
                      {c.usager.nomUsage ? ` (${c.usager.nomUsage})` : ""} · né(e) le {c.usager.dateNaissance}
                    </p>
                    <Badge teinte={c.critere === "nir" ? "succes" : c.critere === "etat_civil" ? "primaire" : "attention"}>{LIBELLES_CRITERE[c.critere]}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    NIR {c.usager.nir} · {c.usager.adresse}
                  </p>
                  {c.usager.dossiers.length ? (
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                      {c.usager.dossiers.map((d) => (
                        <li key={d.numero}>
                          <span className="font-mono">{d.numero}</span> · {d.type} · {d.dateDemande} · {d.statut}
                          {d.commentaire ? ` · ${d.commentaire}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {c.demandeEnCours ? (
                    <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      Une demande APA est déjà en cours pour cet usager ({c.demandeEnCours.numero}). En le rattachant, cet envoi complétera cette demande au lieu d&apos;en créer une nouvelle.
                    </p>
                  ) : null}
                  <div className="mt-2">
                    <Bouton
                      variante={c.critere === "homonyme" ? "secondaire" : "primaire"}
                      onClick={() =>
                        confirmerRapprochement(id, { type: "existant", numeroUsager: c.usager.numeroUsager, numeroDemandeEnCours: c.demandeEnCours?.numero ?? null })
                      }
                    >
                      C&apos;est cet usager
                    </Bouton>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">Aucun usager ne correspond aux critères.</p>
          )}
          <div>
            <Bouton variante={rapprochement?.candidats.length ? "secondaire" : "primaire"} onClick={() => confirmerRapprochement(id, { type: "nouveau" })}>
              {rapprochement?.candidats.length ? "Aucun ne correspond : nouvel usager" : "Nouvel usager"}
            </Bouton>
          </div>
        </div>
      )}
    </Carte>
  );
}
