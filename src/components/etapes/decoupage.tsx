"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alerte, Badge, Bouton, Carte, ScoreConfiance, Titre, useMonte } from "@/components/ui";
import { VisionneusePdf } from "@/components/visionneuse-pdf";
import { classerPages, LIBELLES_PIECES, reclasserPage, regrouperEnPieces, TYPES_A_ECARTER, type TypePiece } from "@/lib/decoupage";
import { useDossierStore } from "@/store/dossier-store";

const TYPES: TypePiece[] = Object.keys(LIBELLES_PIECES) as TypePiece[];

function plagePages(pages: number[]): string {
  if (pages.length === 1) return `p. ${pages[0]}`;
  return `p. ${pages[0]} à ${pages[pages.length - 1]}`;
}

export function EtapeDecoupage({ id }: { id: string }) {
  const router = useRouter();
  const monte = useMonte();
  const dossier = useDossierStore((s) => s.dossiers[id]);
  const definirDecoupage = useDossierStore((s) => s.definirDecoupage);
  const validerDecoupage = useDossierStore((s) => s.validerDecoupage);
  const [page, setPage] = useState(1);
  const [pieceOuverte, setPieceOuverte] = useState<string | null>(null);

  if (!monte || !dossier) return null;
  if (!dossier.ocr || !dossier.pagesClassees || !dossier.pieces) {
    return <Alerte teinte="attention">L&apos;OCR de ce dossier n&apos;est pas disponible. Réimportez-le depuis la GED.</Alerte>;
  }

  const { pagesClassees, pieces } = dossier;
  const nbEcartees = pieces.filter((p) => TYPES_A_ECARTER.includes(p.type)).reduce((n, p) => n + p.pages.length, 0);

  function changerTypePiece(pieceId: string, type: TypePiece) {
    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece || !dossier?.pagesClassees) return;
    let pages = dossier.pagesClassees;
    for (const n of piece.pages) pages = reclasserPage(pages, n, type);
    definirDecoupage(id, pages, regrouperEnPieces(pages));
  }

  function changerTypePage(numero: number, type: TypePiece) {
    if (!dossier?.pagesClassees) return;
    const pages = reclasserPage(dossier.pagesClassees, numero, type);
    definirDecoupage(id, pages, regrouperEnPieces(pages));
  }

  function recalculer() {
    if (!dossier?.ocr) return;
    const pages = classerPages(dossier.ocr.pages);
    definirDecoupage(id, pages, regrouperEnPieces(pages));
  }

  function valider() {
    validerDecoupage(id);
    router.push(`/dossiers/${id}/extraction`);
  }

  return (
    <main className="flex flex-col gap-6">
      <Titre
        surtitre="Phase 1 · étape 1"
        titre="Découpage du dossier en pièces"
        description={`Le document de ${dossier.nbPages} pages a été lu par ${dossier.ocr.modele} en ${(dossier.ocr.dureeMs / 1000).toFixed(1)} s. Chaque page a été classée d'après son contenu ; corrigez le type d'une pièce ou d'une page si nécessaire, puis validez.`}
        actions={
          <>
            <Bouton variante="secondaire" onClick={recalculer}>
              Recalculer automatiquement
            </Bouton>
            <Bouton onClick={valider}>Valider le découpage et extraire</Bouton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Carte titre="Document numérisé" sousTitre={`${dossier.nbPages} pages`}>
          <VisionneusePdf chemin={dossier.cheminPdf} page={page} nbPages={dossier.nbPages} onPage={setPage} />
        </Carte>

        <Carte
          titre="Structure détectée"
          sousTitre={`${pieces.length} pièce${pieces.length > 1 ? "s" : ""}${nbEcartees ? ` · ${nbEcartees} page${nbEcartees > 1 ? "s" : ""} à écarter` : ""}`}
        >
          <ul className="flex flex-col gap-3">
            {pieces.map((piece, index) => {
              const ecartee = TYPES_A_ECARTER.includes(piece.type);
              const ouverte = pieceOuverte === piece.id;
              return (
                <li key={piece.id} className={`rounded-md border p-3 ${ecartee ? "border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" : "border-slate-200 dark:border-slate-800"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">Document {index + 1}</span>
                      <button type="button" onClick={() => setPage(piece.pages[0])} className="text-xs text-blue-700 hover:underline dark:text-blue-300">
                        {plagePages(piece.pages)}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {piece.automatique ? <Badge teinte="info">auto</Badge> : <Badge teinte="primaire">agent</Badge>}
                      <ScoreConfiance valeur={piece.confiance} />
                    </div>
                  </div>
                  <select
                    value={piece.type}
                    onChange={(e) => changerTypePiece(piece.id, e.target.value as TypePiece)}
                    className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                    aria-label={`Type du document ${index + 1}`}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {LIBELLES_PIECES[t]}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setPieceOuverte(ouverte ? null : piece.id)} className="mt-2 text-xs text-slate-500 hover:underline">
                    {ouverte ? "Masquer le détail des pages" : `Détail des ${piece.pages.length} page${piece.pages.length > 1 ? "s" : ""}`}
                  </button>
                  {ouverte ? (
                    <ul className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-2 dark:border-slate-800">
                      {piece.pages.map((n) => {
                        const pc = pagesClassees[n - 1];
                        return (
                          <li key={n} className="flex flex-col gap-1 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => setPage(n)} className={`font-medium ${n === page ? "text-blue-700 dark:text-blue-300" : ""}`}>
                                Page {n}
                              </button>
                              <ScoreConfiance valeur={pc.confiance} />
                              <span className="text-slate-500">{pc.justification}</span>
                              <select
                                value={pc.type}
                                onChange={(e) => changerTypePage(n, e.target.value as TypePiece)}
                                className="ml-auto rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                                aria-label={`Type de la page ${n}`}
                              >
                                {TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {LIBELLES_PIECES[t]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <p className="truncate text-slate-500">{pc.apercu}</p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Carte>
      </div>
    </main>
  );
}
