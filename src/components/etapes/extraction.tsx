"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alerte, Badge, Bouton, Carte, Chargement, ScoreConfiance, Titre, useMonte } from "@/components/ui";
import { LIBELLES_PIECES, TYPES_EXTRAITS, type Piece } from "@/lib/decoupage";
import { markdownPiece } from "@/lib/dossier-utils";
import { aplatirChamps, libelleValeur, optionsChamp } from "@/lib/extraction/schemas";
import { useDossierStore, type ExtractionPiece } from "@/store/dossier-store";

export function EtapeExtraction({ id }: { id: string }) {
  const router = useRouter();
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirExtraction = useDossierStore((s) => s.definirExtraction);
  const corrigerChamp = useDossierStore((s) => s.corrigerChamp);
  const validerExtraction = useDossierStore((s) => s.validerExtraction);

  const [pieceActive, setPieceActive] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<Set<string>>(new Set());
  const [voirOcr, setVoirOcr] = useState(false);
  const lancees = useRef(new Set<string>());

  const piecesAExtraire: Piece[] = (dossier?.pieces ?? []).filter((p) => TYPES_EXTRAITS.includes(p.type));

  const extraire = useCallback(
    async (piece: Piece) => {
      if (!dossier) return;
      setEnCours((s) => new Set(s).add(piece.id));
      const base: ExtractionPiece = { pieceId: piece.id, type: piece.type, corrections: {}, valide: false };
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
    return <Alerte teinte="attention">Aucune pièce à extraire. Revenez au découpage pour qualifier les pages.</Alerte>;
  }

  const piece = piecesAExtraire.find((p) => p.id === pieceActive) ?? piecesAExtraire[0];
  const extraction = dossier.extractions[piece.id];
  const champs = extraction?.champs ? aplatirChamps(extraction.champs) : [];
  const nonLus = champs.filter((c) => c.valeur === null).length;
  const faibles = champs.filter((c) => c.valeur !== null && c.confiance < 0.5).length;
  const corrections = Object.keys(extraction?.corrections ?? {}).length;
  const toutExtrait = piecesAExtraire.every((p) => dossier.extractions[p.id]?.champs);
  const extractionEnCours = enCours.size > 0;

  function valider() {
    validerExtraction(id);
    router.push(`/dossiers/${id}/conformite`);
  }

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Phase 1 · étape 2"
        titre="Extraction des données et pré-contrôle"
        description="Les champs de chaque pièce sont extraits du texte OCR avec un score de confiance. Les champs non lus ou douteux sont mis en évidence : contrôlez-les et corrigez-les avant de passer au contrôle de conformité."
        actions={
          <Bouton onClick={valider} disabled={!toutExtrait || extractionEnCours}>
            Valider et passer au contrôle
          </Bouton>
        }
      />

      <div className="flex flex-wrap gap-2">
        {piecesAExtraire.map((p) => {
          const e = dossier.extractions[p.id];
          const actif = p.id === piece.id;
          const etat = enCours.has(p.id) ? "…" : e?.erreur ? "!" : e?.champs ? "✓" : "";
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPieceActive(p.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${actif ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"}`}
            >
              {LIBELLES_PIECES[p.type]} <span className="text-xs opacity-70">(p. {p.pages.join(", ")})</span> {etat}
            </button>
          );
        })}
      </div>

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
              </>
            ) : null}
            <Bouton variante="secondaire" onClick={() => setVoirOcr((v) => !v)}>
              {voirOcr ? "Masquer le texte OCR" : "Voir le texte OCR"}
            </Bouton>
            <Bouton variante="secondaire" onClick={() => extraire(piece)} disabled={enCours.has(piece.id)}>
              Relancer l&apos;extraction
            </Bouton>
          </div>
        }
      >
        {enCours.has(piece.id) ? <Chargement texte="Extraction structurée en cours…" /> : null}
        {extraction?.erreur ? <Alerte teinte="danger" titre="Extraction impossible">{extraction.erreur}</Alerte> : null}

        {voirOcr ? (
          <pre className="mb-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-800 dark:bg-slate-900">
            {markdownPiece(dossier, piece.pages)}
          </pre>
        ) : null}

        {champs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">Champ</th>
                  <th className="py-2 pr-3 font-medium">Valeur</th>
                  <th className="py-2 pr-3 font-medium">Confiance</th>
                  <th className="py-2 font-medium">Extrait OCR</th>
                </tr>
              </thead>
              <tbody>
                {champs.map((c) => {
                  const corrige = c.chemin in (extraction?.corrections ?? {});
                  const valeurAffichee = corrige ? (extraction?.corrections[c.chemin] ?? "") : (c.valeur ?? "");
                  const douteux = !corrige && (c.valeur === null || c.confiance < 0.5);
                  const options = optionsChamp(piece.type, c.chemin);
                  const classeLigne = corrige ? "bg-blue-50/60 dark:bg-blue-950/40" : douteux ? "bg-amber-50/70 dark:bg-amber-950/30" : "";
                  return (
                    <tr key={c.chemin} className={`border-b border-slate-100 align-top dark:border-slate-900 ${classeLigne}`}>
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{c.libelle}</td>
                      <td className="py-1.5 pr-3">
                        {options ? (
                          <select
                            value={valeurAffichee}
                            onChange={(e) => corrigerChamp(id, piece.id, c.chemin, e.target.value === "" ? null : e.target.value)}
                            className="w-full min-w-40 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
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
                            onChange={(e) => corrigerChamp(id, piece.id, c.chemin, e.target.value === "" ? null : e.target.value)}
                            placeholder="non lu"
                            className="w-full min-w-40 rounded border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-red-400 dark:border-slate-700 dark:bg-slate-900"
                            aria-label={c.libelle}
                          />
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        {corrige ? <Badge teinte="primaire">corrigé</Badge> : <ScoreConfiance valeur={c.confiance} nonLu={c.valeur === null} />}
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
    </main>
  );
}
