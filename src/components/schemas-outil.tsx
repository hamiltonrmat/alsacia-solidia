import { Fragment, type ReactNode } from "react";
import { ETAPES, type IdEtape } from "@/lib/etapes";
import { CATALOGUE_REGLES } from "@/lib/regles/conformite";

/**
 * Schémas d'ensemble de l'outil pour le mode d'emploi : la vue fonctionnelle
 * (le parcours d'un dossier, en couloirs) et la vue technique (navigateur,
 * serveur, services). Rendus en HTML pour rester lisibles et à jour.
 */

const NB_REGLES = Object.keys(CATALOGUE_REGLES).length;

type Couloir = "outil" | "agent" | "services" | "resultat";

const COULOIRS: Array<{ id: Couloir; titre: string; sousTitre: string; cellule: string; puce: string }> = [
  { id: "outil", titre: "L'outil", sousTitre: "fait automatiquement", cellule: "border-blue-100 bg-blue-50", puce: "bg-blue-500" },
  { id: "agent", titre: "L'agent", sousTitre: "contrôle et valide", cellule: "border-emerald-100 bg-emerald-50", puce: "bg-emerald-500" },
  { id: "services", titre: "Services", sousTitre: "sollicités", cellule: "border-slate-200 bg-white", puce: "bg-slate-400" },
  { id: "resultat", titre: "Résultat", sousTitre: "transmis à l'étape suivante", cellule: "border-dashed border-slate-300 bg-white", puce: "bg-slate-400" },
];

const CONTENU: Record<IdEtape, Record<Couloir, string[]>> = {
  ged: {
    outil: ["Enregistre la réception (n° REC)", "Lit le document page par page"],
    agent: ["Choisit le lot et le dossier", "Le prend en charge"],
    services: ["GED", "Mistral OCR"],
    resultat: ["Texte de chaque page", "Numéro d'enregistrement"],
  },
  decoupage: {
    outil: ["Reconnaît chaque page (pied de page CERFA, intitulés)", "Regroupe les pages en pièces", "Écarte notice, RGPD, pages vides"],
    agent: ["Corrige le type d'une pièce ou d'une page", "Valide le déliassage"],
    services: ["Règles de déliassage"],
    resultat: ["Pièces typées", "Pages écartées"],
  },
  extraction: {
    outil: ["Extrait les champs de chaque pièce, avec leur confiance", "Relit NIR et IBAN par leur clé", "Cherche l'usager dans Solis"],
    agent: ["Vérifie les champs critiques ★, document en regard", "Corrige ou complète", "Confirme l'usager", "Valide le contrôle"],
    services: ["Mistral (extraction)", "Solis (recherche)"],
    resultat: ["Données contrôlées", "Usager confirmé"],
  },
  conformite: {
    outil: [`Applique les ${NB_REGLES} règles métier`, "Calcule le verdict et la date de dossier complet", "Construit le rapport de contrôle"],
    agent: ["Lit bloquants et alertes", "Rédige ses observations", "Valide et génère le rapport"],
    services: ["Moteur de règles", "Mise en page PDF"],
    resultat: ["Verdict", "Rapport PDF et JSON", "Empreinte SHA-256"],
  },
  export: {
    outil: ["Crée ou rattache l'usager", "Crée ou complète la demande", "Dépose le rapport et les pièces"],
    agent: ["Relit l'usager et la demande", "Lance l'enregistrement"],
    services: ["Solis (enregistrement)", "GED (dépôt)"],
    resultat: ["N° d'usager et de demande", "Statut complet ou incomplet", "Référence du rapport"],
  },
};

function Fleche({ vertical = false, symbole = "→" }: { vertical?: boolean; symbole?: string }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center text-xl text-slate-400 ${vertical ? "rotate-90 py-1 md:rotate-0 md:px-1 md:py-0" : ""}`}>
      {symbole}
    </span>
  );
}

function Bloc({ titre, sousTitre, children, accent }: { titre: string; sousTitre: string; children: ReactNode; accent: string }) {
  return (
    <div className={`flex flex-1 flex-col gap-1 rounded-xl border-2 px-4 py-3 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{sousTitre}</p>
      <p className="font-semibold">{titre}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/** Vue fonctionnelle : de la GED à Solis, ce que font l'outil et l'agent à chaque étape. */
export function SchemaFonctionnel() {
  return (
    <figure className="flex flex-col gap-4">
      <div className="flex flex-col items-stretch md:flex-row">
        <Bloc titre="GED départementale" sousTitre="Entrée" accent="border-slate-300 bg-white text-slate-800">
          Courriers numérisés, regroupés par lots de numérisation.
        </Bloc>
        <Fleche vertical />
        <Bloc titre="Solid'IA · contrôle du dossier" sousTitre="5 étapes, validées par l'agent" accent="border-blue-300 bg-blue-50 text-blue-950">
          Lecture, déliassage, contrôle des données, complétude et conformité, rapport de contrôle.
        </Bloc>
        <Fleche vertical />
        <Bloc titre="Solis · logiciel métier" sousTitre="Sortie" accent="border-emerald-300 bg-emerald-50 text-emerald-950">
          Usager, demande et rapport ; pièces indexées dans la GED. Puis instruction : appréciation du droit, courriers, évaluation à domicile.
        </Bloc>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="grid min-w-[720px] grid-cols-5 gap-x-3 gap-y-1.5">
          {ETAPES.map((e, i) => (
            <div key={e.id} className="relative flex items-center gap-2 rounded-lg bg-blue-600 px-2.5 py-2 text-white">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-blue-700">{e.numero}</span>
              <span className="text-sm font-semibold leading-tight">{e.libelle}</span>
              {i < ETAPES.length - 1 ? (
                <span aria-hidden className="absolute -right-3 top-1/2 z-10 w-3 -translate-y-1/2 text-center text-lg font-bold text-blue-600">
                  ›
                </span>
              ) : null}
            </div>
          ))}

          {COULOIRS.map((c) => (
            <Fragment key={c.id}>
              <div className="col-span-5 mt-2 flex items-center gap-2">
                <span aria-hidden className={`h-2 w-2 rounded-full ${c.puce}`} />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-800">{c.titre}</p>
                <p className="text-xs text-slate-500">{c.sousTitre}</p>
                <span aria-hidden className="h-px flex-1 bg-slate-200" />
              </div>
              {ETAPES.map((e) => (
                <div key={`${c.id}-${e.id}`} className={`rounded-lg border px-3 py-2 ${c.cellule}`}>
                  {c.id === "services" ? (
                    <div className="flex flex-wrap gap-1">
                      {CONTENU[e.id].services.map((s) => (
                        <span key={s} className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-1 text-xs text-slate-700">
                      {CONTENU[e.id][c.id].map((l, k, liste) => (
                        <li key={l} className="flex gap-1.5">
                          <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${c.puce}`} />
                          <span className={c.id === "agent" && k === liste.length - 1 ? "font-semibold text-emerald-800" : ""}>{l}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </Fragment>
          ))}

          <div className="col-span-5 mt-2 flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full bg-violet-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-800">Journal</p>
            <p className="text-xs text-slate-500">traçabilité, de bout en bout</p>
            <span aria-hidden className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="col-span-5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
            Chaque action, de l&apos;outil comme de l&apos;agent, est horodatée dans le journal du dossier, de la prise en charge à la transmission, et
            reprise dans le rapport de contrôle. Une modification après la génération du rapport le rend périmé et bloque la transmission.
          </div>
        </div>
      </div>
      <figcaption className="text-xs text-slate-500">
        Vue fonctionnelle. Chaque colonne est une étape, à lire de haut en bas ; chaque étape se termine par une action de l&apos;agent (en gras)
        qui ouvre la suivante : rien ne part dans Solis sans lui. Sur petit écran, faites défiler le schéma horizontalement.
      </figcaption>
    </figure>
  );
}

type Echange = { quoi: string; navigateur: string; route: string; service: string };

const ECHANGES: Echange[] = [
  { quoi: "Lots de la GED", navigateur: "Affiche les lots et les dossiers", route: "GET /api/ged/lots", service: "GED (simulée)" },
  { quoi: "Lecture du dossier", navigateur: "Prise en charge, puis déliassage automatique", route: "POST /api/dossiers/[id]/ocr", service: "Mistral OCR" },
  { quoi: "Extraction d'une pièce", navigateur: "Envoie le texte de la pièce", route: "POST /api/extraction", service: "Mistral (sortie JSON contrainte)" },
  { quoi: "Rapprochement d'usager", navigateur: "Envoie l'identité lue", route: "POST /api/solis · rechercher", service: "Solis (simulé)" },
  { quoi: "Rapport de contrôle", navigateur: "Construit le rapport (JSON)", route: "POST /api/rapport", service: "Mise en page PDF sur le serveur" },
  { quoi: "Enregistrement", navigateur: "Envoie métadonnées et rapport", route: "POST /api/solis · enregistrer", service: "Solis (simulé)" },
  { quoi: "Pièces déposées", navigateur: "Ouvre le PDF d'une pièce", route: "GET /api/dossiers/[id]/pieces", service: "GED (simulée)" },
];

function Colonne({ titre, sousTitre, elements, accent }: { titre: string; sousTitre: string; elements: string[]; accent: string }) {
  return (
    <div className={`flex flex-1 flex-col gap-2 rounded-xl border-2 p-4 ${accent}`}>
      <div>
        <p className="font-semibold text-slate-900">{titre}</p>
        <p className="text-xs text-slate-500">{sousTitre}</p>
      </div>
      <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
        {elements.map((e) => (
          <li key={e} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
            {e}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Vue technique : où s'exécute chaque traitement et quels échanges circulent. */
export function SchemaTechnique() {
  return (
    <figure className="flex flex-col gap-4">
      <div className="flex flex-col items-stretch gap-0 md:flex-row">
        <Colonne
          titre="Navigateur"
          sousTitre="poste de l'agent"
          accent="border-blue-200 bg-blue-50/50"
          elements={[
            "Écrans du traitement, règles métier, mode d'emploi",
            "Déliassage automatique (classement des pages)",
            "Moteur de règles métier (complétude et conformité)",
            "Construction du rapport de contrôle (JSON)",
            "État des dossiers et journal : stockage du navigateur (base partagée prévue)",
          ]}
        />
        <Fleche vertical symbole="⇄" />
        <Colonne
          titre="Serveur Solid'IA"
          sousTitre="Next.js, hébergé sur Vercel"
          accent="border-slate-300 bg-slate-50"
          elements={[
            "Porte d'entrée : mot de passe, jeton signé",
            "Routes d'API, chacune protégée",
            "Clé Mistral, jamais envoyée au navigateur",
            "Mise en page du rapport (PDF) et empreinte SHA-256",
          ]}
        />
        <Fleche vertical symbole="⇄" />
        <Colonne
          titre="Services"
          sousTitre="externes ou simulés"
          accent="border-emerald-200 bg-emerald-50/50"
          elements={["Mistral OCR : lecture des pages", "Mistral : extraction structurée des champs", "GED (simulée) : PDF des lots", "Solis (simulé) : usagers et demandes"]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 font-medium">Échange</th>
              <th className="px-4 py-2 font-medium">Navigateur</th>
              <th className="px-2 py-2" aria-hidden />
              <th className="px-4 py-2 font-medium">Route du serveur</th>
              <th className="px-2 py-2" aria-hidden />
              <th className="px-4 py-2 font-medium">Service</th>
            </tr>
          </thead>
          <tbody>
            {ECHANGES.map((e) => (
              <tr key={e.quoi} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium text-slate-900">{e.quoi}</td>
                <td className="px-4 py-2 text-slate-600">{e.navigateur}</td>
                <td className="px-2 py-2 text-slate-400" aria-hidden>
                  ⇄
                </td>
                <td className="px-4 py-2">
                  <code className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{e.route}</code>
                </td>
                <td className="px-2 py-2 text-slate-400" aria-hidden>
                  ⇄
                </td>
                <td className="px-4 py-2 text-slate-600">{e.service}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="text-xs text-slate-500">
        Vue technique. Le navigateur ne parle jamais directement à Mistral ni à Solis : tout passe par les routes du serveur, qui vérifient le
        mot de passe et détiennent la clé. Les règles métier et la construction du rapport s&apos;exécutent dans le navigateur, sur les données
        que l&apos;agent a validées.
      </figcaption>
    </figure>
  );
}
