"use client";

import Link from "next/link";
import { useState } from "react";
import { USAGERS_SOLIS, type UsagerSolis } from "@/data/solis";
import { Alerte, Badge, Bouton, Carte, Chargement, useMonte } from "@/components/ui";
import { identiteLue, nomUsager } from "@/lib/dossier-utils";
import { LIBELLES_ORIENTATION } from "@/lib/regles/decision";
import { LIBELLES_STATUT, TEINTES_STATUT } from "@/lib/statuts";
import { useDossierStore, type EtatDossier } from "@/store/dossier-store";

type TeinteStatut = "succes" | "primaire" | "attention" | "neutre";

const TEINTE_DEMANDE: Record<string, TeinteStatut> = {
  Accordé: "succes",
  "En cours": "primaire",
  Refusé: "attention",
  Clos: "neutre",
};

function FicheUsager({ usager, dossiersLocaux }: { usager: UsagerSolis; dossiersLocaux: EtatDossier[] }) {
  const rattaches = dossiersLocaux.filter((d) => d.export?.numeroUsager === usager.numeroUsager);
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">
            {usager.civilite} {usager.prenoms} {usager.nomNaissance}
            {usager.nomUsage ? <span className="text-slate-500"> (nom d&apos;usage : {usager.nomUsage})</span> : null}
          </p>
          <p className="text-xs text-slate-500">
            <span className="font-mono">{usager.numeroUsager}</span> · né(e) le {usager.dateNaissance} · NIR <span className="font-mono">{usager.nir}</span>
          </p>
          <p className="text-xs text-slate-500">{usager.adresse}</p>
        </div>
        {rattaches.length ? <Badge teinte="succes">{rattaches.length} demande(s) de ce poste</Badge> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-1.5 pr-3 font-medium">Demande</th>
              <th className="py-1.5 pr-3 font-medium">Type</th>
              <th className="py-1.5 pr-3 font-medium">Déposée le</th>
              <th className="py-1.5 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {usager.dossiers.map((d) => (
              <tr key={d.numero} className="border-b border-slate-100 align-top">
                <td className="py-1.5 pr-3 font-mono text-xs">{d.numero}</td>
                <td className="py-1.5 pr-3">
                  {d.type}
                  {d.commentaire ? <span className="block text-xs text-slate-500">{d.commentaire}</span> : null}
                </td>
                <td className="py-1.5 pr-3">{d.dateDemande}</td>
                <td className="py-1.5">
                  <Badge teinte={TEINTE_DEMANDE[d.statut] ?? "neutre"}>{d.statut}</Badge>
                </td>
              </tr>
            ))}
            {rattaches.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 bg-blue-50/50 align-top">
                <td className="py-1.5 pr-3 font-mono text-xs">{d.export?.numeroDossier}</td>
                <td className="py-1.5 pr-3">
                  Demande d&apos;aides à l&apos;autonomie (CERFA 16301*01)
                  <span className="block text-xs text-slate-500">
                    Enregistrée depuis ce poste · dossier {d.id} ·{" "}
                    {d.decision?.orientationRetenue ? LIBELLES_ORIENTATION[d.decision.orientationRetenue] : "orientation non retenue"}
                  </span>
                </td>
                <td className="py-1.5 pr-3">{d.dateReception}</td>
                <td className="py-1.5">
                  <Badge teinte={TEINTES_STATUT[d.statut]}>{LIBELLES_STATUT[d.statut]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </li>
  );
}

/**
 * Vue du logiciel métier simulé : la base des usagers connus, les demandes
 * enregistrées depuis ce poste, et les usagers créés par l'outil.
 */
export function VueSolis() {
  const monte = useMonte();
  const dossiers = useDossierStore((s) => s.dossiers);
  const [recherche, setRecherche] = useState("");

  if (!monte) return <Chargement texte="Connexion au logiciel métier…" />;

  const locaux = Object.values(dossiers);
  const enregistres = locaux.filter((d) => d.export);
  const numerosConnus = new Set(USAGERS_SOLIS.map((u) => u.numeroUsager));
  const crees = enregistres.filter((d) => d.export && !numerosConnus.has(d.export.numeroUsager));

  const terme = recherche
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  const correspond = (u: UsagerSolis) =>
    !terme ||
    `${u.prenoms} ${u.nomNaissance} ${u.nomUsage ?? ""} ${u.numeroUsager} ${u.nir}`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .includes(terme);
  const usagers = USAGERS_SOLIS.filter(correspond);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Usagers au référentiel", String(USAGERS_SOLIS.length + crees.length)],
          ["Demandes enregistrées depuis ce poste", String(enregistres.length)],
          ["Usagers créés par l'outil", String(crees.length)],
        ].map(([libelle, valeur]) => (
          <div key={libelle} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-semibold text-slate-900">{valeur}</p>
            <p className="text-sm text-slate-600">{libelle}</p>
          </div>
        ))}
      </div>

      <Alerte teinte="info">
        Cette vue simule le logiciel métier de l&apos;action sociale. Les usagers listés sont fictifs et servent au rapprochement d&apos;identité à
        l&apos;étape de contrôle des données. Les lignes bleues sont les demandes que vous avez enregistrées depuis ce poste.
      </Alerte>

      <Carte
        titre="Référentiel des usagers"
        sousTitre="Recherche par nom, prénom, numéro d'usager ou NIR"
        actions={
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un usager…"
            aria-label="Rechercher un usager"
            className="w-56 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          />
        }
      >
        {usagers.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun usager ne correspond à « {recherche} ».</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {usagers.map((u) => (
              <FicheUsager key={u.numeroUsager} usager={u} dossiersLocaux={locaux} />
            ))}
          </ul>
        )}
      </Carte>

      {crees.length > 0 ? (
        <Carte titre="Usagers créés par l'outil" sousTitre="Premières demandes, sans correspondance au référentiel">
          <ul className="flex flex-col gap-3">
            {crees.map((d) => {
              const identite = identiteLue(d);
              return (
                <li key={d.id} className="flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {nomUsager(d) ?? d.libelle}
                      <span className="ml-2 font-mono text-xs text-slate-500">{d.export?.numeroUsager}</span>
                    </p>
                    <Badge teinte={TEINTES_STATUT[d.statut]}>{LIBELLES_STATUT[d.statut]}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    né(e) le {identite.dateNaissance ?? "—"} · NIR <span className="font-mono">{identite.nir ?? "—"}</span> · demande{" "}
                    {d.export?.numeroDossier}
                  </p>
                  <Link href={`/dossiers/${d.id}/export`} className="text-sm font-medium text-blue-700 hover:underline">
                    Voir le dossier d&apos;origine
                  </Link>
                </li>
              );
            })}
          </ul>
        </Carte>
      ) : null}

      {enregistres.length === 0 ? (
        <Carte titre="Aucune demande enregistrée depuis ce poste">
          <p className="text-sm text-slate-600">
            Les demandes apparaissent ici une fois la dernière étape du traitement franchie.
          </p>
          <div className="mt-3 flex gap-2">
            <Bouton href="/dossiers">Ouvrir la bannette</Bouton>
            <Bouton variante="secondaire" href="/ged">
              Prendre un dossier
            </Bouton>
          </div>
        </Carte>
      ) : null}
    </div>
  );
}
