"use client";

import { useState, type ReactNode } from "react";
import { LIBELLES_PIECES } from "@/lib/decoupage";
import {
  ancreRegle,
  CATALOGUE_REGLES,
  LIBELLES_FAMILLE,
  LIBELLES_STATUT_CONTROLE,
  ORDRE_FAMILLES,
  type DefinitionRegle,
  type FamilleRegle,
  type IdRegle,
  type StatutControle,
} from "@/lib/regles/conformite";

/**
 * Catalogue des règles métier, consultable rapidement : recherche plein texte,
 * filtre par famille et par issue possible, une ancre par règle
 * (/regles#regle-<id>) pour y renvoyer depuis le traitement d'un dossier.
 */

type Issue = Exclude<StatutControle, "non_applicable">;

const ISSUES: Issue[] = ["bloquant", "alerte", "info", "ok"];

const PASTILLES: Record<Issue, string> = {
  bloquant: "border-red-200 bg-red-50 text-red-700",
  alerte: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const FILTRES_ISSUE: Array<{ id: Issue | "toutes"; libelle: string }> = [
  { id: "toutes", libelle: "Toutes les issues" },
  { id: "bloquant", libelle: "Peut bloquer" },
  { id: "alerte", libelle: "Peut alerter" },
  { id: "info", libelle: "Informe" },
];

const REGLES = Object.entries(CATALOGUE_REGLES) as Array<[IdRegle, DefinitionRegle]>;

function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Texte indexé pour la recherche : identifiant, libellé, pièce, condition, famille, issues et leurs statuts. */
const INDEX = new Map(
  REGLES.map(([id, r]) => [
    id,
    normaliser(
      [
        id,
        r.libelle,
        r.verifie,
        LIBELLES_FAMILLE[r.famille],
        r.piece ? LIBELLES_PIECES[r.piece] : "",
        ...ISSUES.filter((s) => r.issues[s]).flatMap((s) => [LIBELLES_STATUT_CONTROLE[s], r.issues[s] ?? ""]),
      ].join(" "),
    ),
  ]),
);

function Puce({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition ${
        actif ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export function CatalogueRegles() {
  const [recherche, setRecherche] = useState("");
  const [famille, setFamille] = useState<FamilleRegle | "toutes">("toutes");
  const [issue, setIssue] = useState<Issue | "toutes">("toutes");

  const termes = normaliser(recherche).split(/\s+/).filter(Boolean);
  const correspond = (id: IdRegle, r: DefinitionRegle, ignorerFamille = false) =>
    (ignorerFamille || famille === "toutes" || r.famille === famille) &&
    (issue === "toutes" || Boolean(r.issues[issue])) &&
    termes.every((t) => INDEX.get(id)?.includes(t));
  const filtrees = REGLES.filter(([id, r]) => correspond(id, r));
  const filtreActif = recherche !== "" || famille !== "toutes" || issue !== "toutes";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-2 lg:z-10">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher : RIB, signature, tutelle, bloquant, cni-nom…"
            aria-label="Rechercher une règle"
            className="min-w-64 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <p className="text-sm text-slate-600" aria-live="polite">
            <strong>{filtrees.length}</strong> règle{filtrees.length > 1 ? "s" : ""} sur {REGLES.length}
          </p>
          {filtreActif ? (
            <button
              type="button"
              onClick={() => {
                setRecherche("");
                setFamille("toutes");
                setIssue("toutes");
              }}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Tout afficher
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par famille">
          <Puce actif={famille === "toutes"} onClick={() => setFamille("toutes")}>
            Toutes les familles
          </Puce>
          {ORDRE_FAMILLES.map((f) => {
            const n = REGLES.filter(([id, r]) => r.famille === f && correspond(id, r, true)).length;
            return (
              <Puce key={f} actif={famille === f} onClick={() => setFamille(f)}>
                {LIBELLES_FAMILLE[f]}
                <span className={`text-xs ${famille === f ? "text-white/80" : "text-slate-500"}`}>{n}</span>
              </Puce>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par issue possible">
          {FILTRES_ISSUE.map((f) => (
            <Puce key={f.id} actif={issue === f.id} onClick={() => setIssue(f.id)}>
              {f.libelle}
            </Puce>
          ))}
        </div>
      </div>

      {filtrees.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-600">Aucune règle ne correspond à ces critères.</p>
      ) : (
        ORDRE_FAMILLES.map((f) => {
          const regles = filtrees.filter(([, r]) => r.famille === f);
          if (regles.length === 0) return null;
          return (
            <section key={f} id={`famille-${f}`} className="flex scroll-mt-48 flex-col gap-2">
              <h2 className="text-lg font-semibold text-slate-900">
                {LIBELLES_FAMILLE[f]} <span className="text-sm font-normal text-slate-500">· {regles.length} règle(s)</span>
              </h2>
              <ul className="flex flex-col gap-2">
                {regles.map(([id, r]) => (
                  <li
                    key={id}
                    id={ancreRegle(id)}
                    className="grid scroll-mt-48 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm target:border-blue-500 target:ring-2 target:ring-blue-200 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,4fr)]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{r.libelle}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">{id}</p>
                      {r.piece ? <p className="mt-1 text-xs text-slate-500">{LIBELLES_PIECES[r.piece]}</p> : null}
                    </div>
                    <div className="min-w-0 text-sm text-slate-700">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ce qui est vérifié</p>
                      <p className="mt-1">{r.verifie}</p>
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Issues possibles</p>
                      <ul className="mt-1 flex flex-col gap-1.5">
                        {ISSUES.filter((s) => r.issues[s]).map((s) => (
                          <li key={s} className="flex items-start gap-2 text-slate-600">
                            <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PASTILLES[s]}`}>
                              {LIBELLES_STATUT_CONTROLE[s]}
                            </span>
                            <span>{r.issues[s]}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
