"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RapprochementUsager } from "@/components/rapprochement-usager";
import { Alerte, Badge, Bouton, Carte, Chargement, ScoreConfiance, Titre, useMonte } from "@/components/ui";
import { VisionneusePdf } from "@/components/visionneuse-pdf";
import { LIBELLES_PIECES, TYPES_EXTRAITS, type Piece } from "@/lib/decoupage";
import { markdownPiece, pagePourChamp } from "@/lib/dossier-utils";
import { aplatirChamps, CHAMPS_CRITIQUES, estChampCritique, libelleValeur, optionsChamp } from "@/lib/extraction/schemas";
import { useDossierStore, type EtatDossier, type ExtractionPiece } from "@/store/dossier-store";

/** Champs critiques d'une pièce restant à vérifier (ni confirmés ni corrigés). */
function critiquesRestants(extraction: ExtractionPiece | undefined, piece: Piece): string[] {
  const critiques = CHAMPS_CRITIQUES[piece.type] ?? [];
  if (!extraction?.champs) return critiques;
  return critiques.filter((c) => !(c in extraction.confirmations) && !(c in extraction.corrections));
}

function toutVerifie(dossier: EtatDossier, pieces: Piece[]): boolean {
  return pieces.every((p) => dossier.extractions[p.id]?.champs && critiquesRestants(dossier.extractions[p.id], p).length === 0);
}

export function EtapeExtraction({ id }: { id: string }) {
  const router = useRouter();
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirExtraction = useDossierStore((s) => s.definirExtraction);
  const corrigerChamp = useDossierStore((s) => s.corrigerChamp);
  const confirmerChamp = useDossierStore((s) => s.confirmerChamp);
  const validerExtraction = useDossierStore((s) => s.validerExtraction);

  const [pieceActive, setPieceActive] = useState<string | null>(null);
  const [page, setPage] = useState<number | null>(null);
  const [enCours, setEnCours] = useState<Set<string>>(new Set());
  const [voirOcr, setVoirOcr] = useState(false);
  const lancees = useRef(new Set<string>());

  const piecesAExtraire: Piece[] = (dossier?.pieces ?? []).filter((p) => TYPES_EXTRAITS.includes(p.type));

  const extraire = useCallback(
    async (piece: Piece) => {
      if (!dossier) return;
      setEnCours((s) => new Set(s).add(piece.id));
      const existante = dossier.extractions[piece.id];
      const base: ExtractionPiece = {
        pieceId: piece.id,
        type: piece.type,
        corrections: existante?.corrections ?? {},
        confirmations: {},
        valide: false,
      };
      try {
        const reponse = await fetch("/api/extraction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: piece.type, markdown: markdownPiece(dossier, piece.pages) }),
        });
        const data = (await reponse.json()) as { modele: string; champs: Record<string, unknown> } | { error: string };
        if (!reponse.ok || "error" in data) throw new Error("error" in data ? data.error : `Erreur ${reponse.status}`);
        definirExtraction(id, { ...base, modele: data.modele, champs: data.champs });
      } catch (e) {
        definirExtraction(id, { ...base, erreur: e instanceof Error ? e.message : "Extraction impossible" });
      } finally {
        setEnCours((s) => {
          const copie = new Set(s);
          copie.delete(piece.id);
          return copie;
        });
      }
    },
    [dossier, id, definirExtraction],
  );

  // Lance l'extraction des pièces qui n'en ont pas encore, une seule fois chacune.
  useEffect(() => {
    if (!monte || !dossier) return;
    for (const piece of piecesAExtraire) {
      const existante = dossier.extractions[piece.id];
      if (existante?.champs || existante?.erreur || lancees.current.has(piece.id)) continue;
      lancees.current.add(piece.id);
      void extraire(piece);
    }
  }, [monte, dossier, piecesAExtraire, extraire]);

  if (!monte || !dossier) return null;
  if (piecesAExtraire.length === 0) {
    return <Alerte teinte="attention">Aucune pièce à extraire. Revenez au typage pour qualifier les pages.</Alerte>;
  }

  const piece = piecesAExtraire.find((p) => p.id === pieceActive) ?? piecesAExtraire[0];
  const extraction = dossier.extractions[piece.id];
  const champs = extraction?.champs ? aplatirChamps(extraction.champs) : [];
  const nonLus = champs.filter((c) => c.valeur === null).length;
  const faibles = champs.filter((c) => c.valeur !== null && c.confiance < 0.5).length;
  const corrections = Object.keys(extraction?.corrections ?? {}).length;
  const restants = critiquesRestants(extraction, piece);
  const toutExtrait = piecesAExtraire.every((p) => dossier.extractions[p.id]?.champs);
  const extractionEnCours = enCours.size > 0;
  const rapprochementConfirme = Boolean(dossier.rapprochement?.decision);
  const pretAValider = toutExtrait && !extractionEnCours && toutVerifie(dossier, piecesAExtraire) && rapprochementConfirme;
  const pageAffichee = page ?? piece.pages[0];

  function valider() {
    validerExtraction(id);
    router.push(`/dossiers/${id}/conformite`);
  }

  function marquerToutVerifie() {
    for (const chemin of restants) confirmerChamp(id, piece.id, chemin, true);
  }

  const manque: string[] = [];
  if (!toutExtrait) manque.push("extraction de toutes les pièces");
  if (!toutVerifie(dossier, piecesAExtraire)) manque.push("vérification des champs critiques");
  if (!rapprochementConfirme) manque.push("rapprochement de l'usager");

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Étape 2"
        titre="Contrôle des données"
        description="Les champs de chaque pièce sont extraits du texte OCR avec un score de confiance et affichés en regard du document. Les champs critiques, qui commandent la recevabilité et l'orientation, doivent être vérifiés un à un ; les autres se corrigent au besoin. L'identité lue est ensuite rapprochée des usagers connus."
        actions={
          <div className="flex flex-col items-end gap-1">
            <Bouton onClick={valider} disabled={!pretAValider}>
              Valider et passer à la recevabilité
            </Bouton>
            {!pretAValider && manque.length ? <p className="text-xs text-slate-500">Reste : {manque.join(", ")}.</p> : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {piecesAExtraire.map((p) => {
          const e = dossier.extractions[p.id];
          const actif = p.id === piece.id;
          const reste = critiquesRestants(e, p).length;
          const etat = enCours.has(p.id) ? "…" : e?.erreur ? "!" : e?.champs ? (reste ? `${reste} à vérifier` : "✓") : "";
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPieceActive(p.id);
                setPage(p.pages[0]);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${actif ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
            >
              {LIBELLES_PIECES[p.type]} <span className="text-xs opacity-70">(p. {p.pages.join(", ")})</span> <span className="text-xs">{etat}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Carte titre="Document" sousTitre="Cliquez sur un champ pour afficher sa page" className="xl:sticky xl:top-4 xl:self-start">
          <VisionneusePdf chemin={dossier.cheminPdf} page={pageAffichee} nbPages={dossier.nbPages} onPage={setPage} hauteur="h-[60vh]" />
        </Carte>

        <div className="flex flex-col gap-6">
          <Carte
            titre={LIBELLES_PIECES[piece.type]}
            sousTitre={extraction?.modele ? `Extrait par ${extraction.modele}` : undefined}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {champs.length ? (
                  <>
                    <Badge>{champs.length} champs</Badge>
                    {nonLus ? <Badge teinte="danger">{nonLus} non lu{nonLus > 1 ? "s" : ""}</Badge> : null}
                    {faibles ? <Badge teinte="attention">{faibles} douteux</Badge> : null}
                    {corrections ? <Badge teinte="primaire">{corrections} corrigé{corrections > 1 ? "s" : ""}</Badge> : null}
                    {restants.length ? <Badge teinte="attention">{restants.length} critique(s) à vérifier</Badge> : <Badge teinte="succes">critiques vérifiés</Badge>}
                  </>
                ) : null}
                <Bouton variante="secondaire" onClick={() => setVoirOcr((v) => !v)}>
                  {voirOcr ? "Masquer le texte OCR" : "Voir le texte OCR"}
                </Bouton>
                <Bouton variante="secondaire" onClick={() => extraire(piece)} disabled={enCours.has(piece.id)}>
                  Relancer l&apos;extraction
                </Bouton>
                {restants.length ? (
                  <Bouton variante="secondaire" onClick={marquerToutVerifie}>
                    Marquer les {restants.length} critique(s) vérifié(s)
                  </Bouton>
                ) : null}
              </div>
            }
          >
            {enCours.has(piece.id) ? <Chargement texte="Extraction structurée en cours…" /> : null}
            {extraction?.erreur ? <Alerte teinte="danger" titre="Extraction impossible">{extraction.erreur}</Alerte> : null}

            {voirOcr ? (
              <pre className="my-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs">
                {markdownPiece(dossier, piece.pages)}
              </pre>
            ) : null}

            {champs.length ? (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3 font-medium">Champ</th>
                      <th className="py-2 pr-3 font-medium">Valeur</th>
                      <th className="py-2 pr-3 font-medium">Confiance</th>
                      <th className="py-2 pr-3 font-medium">Vérifié</th>
                      <th className="py-2 font-medium">Extrait OCR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {champs.map((c) => {
                      const corrige = c.chemin in (extraction?.corrections ?? {});
                      const critique = estChampCritique(piece.type, c.chemin);
                      const confirme = Boolean(extraction?.confirmations[c.chemin]);
                      const valeurAffichee = corrige ? (extraction?.corrections[c.chemin] ?? "") : (c.valeur ?? "");
                      const douteux = !corrige && (c.valeur === null || c.confiance < 0.5);
                      const options = optionsChamp(piece.type, c.chemin);
                      const classeLigne = corrige ? "bg-blue-50/60" : douteux ? "bg-amber-50/70" : critique && !confirme ? "bg-slate-50" : "";
                      const pageChamp = pagePourChamp(dossier, piece, c.chemin);
                      const corriger = (valeur: string | null) => corrigerChamp(id, piece.id, c.chemin, c.libelle, corrige ? (extraction?.corrections[c.chemin] ?? null) : c.valeur, valeur);
                      return (
                        <tr key={c.chemin} className={`border-b border-slate-100 align-top ${classeLigne}`} onFocus={() => setPage(pageChamp)} onClick={() => setPage(pageChamp)}>
                          <td className="py-1.5 pr-3 text-slate-700">
                            {c.libelle}
                            {critique ? (
                              <span className="ml-1 text-xs text-blue-600" title="Champ critique : vérification obligatoire">
                                ★
                              </span>
                            ) : null}
                          </td>
                          <td className="py-1.5 pr-3">
                            {options ? (
                              <select
                                value={valeurAffichee}
                                onChange={(e) => corriger(e.target.value === "" ? null : e.target.value)}
                                className="w-full min-w-40 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                                aria-label={c.libelle}
                              >
                                <option value="">— non renseigné —</option>
                                {options.map((o) => (
                                  <option key={o} value={o}>
                                    {libelleValeur(o)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={valeurAffichee}
                                onChange={(e) => corriger(e.target.value === "" ? null : e.target.value)}
                                placeholder="non lu"
                                className="w-full min-w-40 rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-red-400"
                                aria-label={c.libelle}
                              />
                            )}
                          </td>
                          <td className="py-1.5 pr-3">
                            {corrige ? <Badge teinte="primaire">corrigé</Badge> : <ScoreConfiance valeur={c.confiance} nonLu={c.valeur === null} />}
                          </td>
                          <td className="py-1.5 pr-3">
                            {critique ? (
                              <label className="inline-flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={confirme || corrige}
                                  disabled={corrige}
                                  onChange={(e) => confirmerChamp(id, piece.id, c.chemin, e.target.checked)}
                                  aria-label={`Vérifié : ${c.libelle}`}
                                />
                                {corrige ? "corrigé" : confirme ? "oui" : "à faire"}
                              </label>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="max-w-xs py-1.5 font-mono text-xs text-slate-500">{c.extrait ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Carte>

          {dossier.extractions[piecesAExtraire.find((p) => p.type === "cerfa_formulaire")?.id ?? ""]?.champs ? <RapprochementUsager id={id} /> : null}
        </div>
      </div>
    </main>
  );
}
