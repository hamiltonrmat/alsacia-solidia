import Link from "next/link";
import type { ReactNode } from "react";
import { DOSSIERS_FICTIFS, LOTS_GED } from "@/data/dossiers-fictifs";
import { ageA, parserDateFr } from "@/lib/dates";
import { LIBELLES_PIECES, TYPES_A_ECARTER, TYPES_EXTRAITS, type TypePiece } from "@/lib/decoupage";
import { LIBELLES_ORIENTATION, PARAMETRES } from "@/lib/regles/decision";

export const metadata = {
  title: "Mode d'emploi — InstructOCR",
  description: "Présentation de la plateforme, parcours d'un dossier étape par étape, lecture des indicateurs, règles appliquées et questions fréquentes.",
};

const SOMMAIRE = [
  { id: "presentation", titre: "1. À quoi sert la plateforme" },
  { id: "caracteristiques", titre: "2. Caractéristiques" },
  { id: "parcours", titre: "3. Le parcours pas à pas" },
  { id: "indicateurs", titre: "4. Lire les indicateurs" },
  { id: "regles", titre: "5. Les règles appliquées" },
  { id: "demonstration", titre: "6. Les dossiers de démonstration" },
  { id: "limites", titre: "7. Limites à connaître" },
  { id: "faq", titre: "8. Questions fréquentes" },
  { id: "glossaire", titre: "9. Glossaire" },
];

function Section({ id, titre, children }: { id: string; titre: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 flex flex-col gap-4">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{titre}</h2>
      {children}
    </section>
  );
}

function Encart({ titre, children, teinte = "bleu" }: { titre?: string; children: ReactNode; teinte?: "bleu" | "ambre" | "vert" }) {
  const classes = {
    bleu: "border-blue-100 bg-blue-50 text-blue-900",
    ambre: "border-amber-200 bg-amber-50 text-amber-900",
    vert: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[teinte];
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${classes}`}>
      {titre ? <p className="font-semibold">{titre}</p> : null}
      <div className={titre ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

function Pastille({ couleur, children }: { couleur: "vert" | "ambre" | "rouge" | "bleu" | "gris"; children: ReactNode }) {
  const classes = {
    vert: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ambre: "bg-amber-50 text-amber-800 border-amber-200",
    rouge: "bg-red-50 text-red-700 border-red-200",
    bleu: "bg-blue-50 text-blue-700 border-blue-200",
    gris: "bg-slate-100 text-slate-700 border-slate-200",
  }[couleur];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}>{children}</span>;
}

type Etape = {
  numero: number;
  titre: string;
  chemin: string;
  objectif: string;
  ecran: string[];
  actions: string[];
  conseil?: string;
};

const ETAPES: Etape[] = [
  {
    numero: 1,
    titre: "Import depuis la GED",
    chemin: "/ged",
    objectif: "Choisir le dossier à instruire parmi les lots de numérisation et le charger dans le poste de travail.",
    ecran: [
      "À gauche, les lots de numérisation avec leur date, leur origine (scanner, courrier) et leur nombre de dossiers.",
      "À droite, les dossiers du lot sélectionné : identifiant, libellé donné par la GED, date de réception, nombre de pages, taille du PDF.",
      "Un badge indique l'état du dossier dans votre poste : « À traiter », l'étape en cours, ou « Terminé ».",
      "Le pli « Scénario de démonstration » décrit ce que le dossier est censé illustrer.",
    ],
    actions: [
      "Cliquez sur un lot pour afficher ses dossiers.",
      "Cliquez sur « Importer et lancer l'OCR ». Le PDF est transféré, lu par l'OCR (environ 5 secondes pour une dizaine de pages), puis vous arrivez au découpage.",
      "« Reprendre » rouvre un dossier déjà commencé à son étape courante. « Réimporter » repart de zéro pour ce dossier.",
    ],
    conseil: "Commencez par le dossier D-2026-0301 (Jean DUPONT) : il est complet et conforme, ce qui permet de voir tout le parcours sans obstacle.",
  },
  {
    numero: 2,
    titre: "Découpage du dossier en pièces",
    chemin: "/dossiers/<id>/decoupage",
    objectif: "Vérifier que chaque page a été rattachée à la bonne pièce (formulaire, certificat médical, pièce d'identité, RIB, avis d'imposition…).",
    ecran: [
      "À gauche, le document numérisé, page par page. Les boutons numérotés changent de page.",
      "À droite, la structure détectée : chaque pièce avec ses pages, son type, un score de confiance et une mention « auto » ou « agent ».",
      "Les pages de la notice du CERFA et les mentions RGPD sont reconnues et marquées « à écarter » : elles n'entrent pas dans l'instruction.",
      "« Détail des pages » montre, pour chaque page, la raison de sa classification et un aperçu de son texte.",
    ],
    actions: [
      "Si une pièce est mal typée, changez son type dans la liste déroulante. Le type peut aussi être changé page par page.",
      "« Recalculer automatiquement » revient à la proposition initiale.",
      "« Valider le découpage et extraire » enregistre la structure et lance l'extraction des champs.",
    ],
    conseil: "Le pied de page « cerfa 16301*01 » donne à l'outil le numéro officiel de chaque page du formulaire : c'est ce qui rend le découpage fiable, même quand les pièces arrivent dans le désordre.",
  },
  {
    numero: 3,
    titre: "Pré-contrôle des données extraites",
    chemin: "/dossiers/<id>/extraction",
    objectif: "Relire les champs extraits de chaque pièce, compléter ceux qui n'ont pas été lus et corriger ceux qui sont douteux.",
    ecran: [
      "Un onglet par pièce. Un symbole indique l'état : extraction en cours, terminée, ou en erreur.",
      "Pour la pièce affichée, un tableau : libellé du champ, valeur (modifiable), score de confiance, extrait du texte OCR d'où vient la valeur.",
      "Les lignes non lues ou douteuses sont surlignées en ambre ; les lignes que vous avez modifiées passent en bleu avec la mention « corrigé ».",
      "Les compteurs en tête de tableau résument : nombre de champs, non lus, douteux, corrigés.",
    ],
    actions: [
      "Tapez directement dans une case pour corriger une valeur ; pour les champs à choix (cases cochées), utilisez la liste déroulante.",
      "« Voir le texte OCR » affiche le Markdown brut de la pièce pour vérifier une lecture.",
      "« Relancer l'extraction » refait l'appel pour la pièce affichée (les corrections sont conservées).",
      "« Valider et passer au contrôle » n'est actif que lorsque toutes les pièces ont été extraites.",
    ],
    conseil: "Inutile de tout vérifier ligne par ligne : concentrez-vous sur les lignes surlignées et sur les champs qui commandent la suite (identité, date de naissance, NIR, questionnaire d'autonomie, mesure de protection).",
  },
  {
    numero: 4,
    titre: "Conformité des pièces et pré-recevabilité",
    chemin: "/dossiers/<id>/conformite",
    objectif: "Savoir si le dossier peut partir en instruction ou s'il faut réclamer des pièces à l'usager.",
    ecran: [
      "Un bandeau donne le verdict : « Dossier recevable », « recevable sous réserve » ou « non recevable », avec une phrase de synthèse.",
      "Les contrôles sont regroupés par gravité : bloquants, alertes, informations, conformes. Chacun explique ce qu'il a vérifié et ce qu'il a trouvé.",
      "La carte « Pièces à réclamer » liste les pièces manquantes et génère le courrier à l'usager.",
      "La carte « Pièces du dossier » rappelle la structure retenue au découpage (les pièces écartées sont barrées).",
    ],
    actions: [
      "Lisez les bloquants et les alertes. Si une alerte vient d'une mauvaise lecture, revenez au pré-contrôle avec « Retour au pré-contrôle », corrigez, et le contrôle se recalcule.",
      "« Générer le courrier à l'usager » affiche un texte prêt à copier.",
      "« Passer à l'aide à la décision » enregistre le verdict et continue. Un dossier non recevable peut continuer : la décision proposera alors de réclamer les pièces.",
    ],
  },
  {
    numero: 5,
    titre: "Aide à la décision",
    chemin: "/dossiers/<id>/decision",
    objectif: "Obtenir une orientation motivée par les règles administratives, puis retenir la décision.",
    ecran: [
      "Un bandeau annonce l'orientation proposée et sa motivation.",
      "La liste des règles appliquées : condition d'âge, organisme compétent d'après le questionnaire, lieu de résidence, département financeur, non-cumul, perte d'autonomie estimée.",
      "Quand un certificat médical est renseigné, une carte donne un GIR estimé, indicatif : l'évaluation à domicile fait foi.",
      "La carte « Décision de l'agent » propose les orientations possibles (celle du système est signalée « proposée ») et un champ de commentaire.",
    ],
    actions: [
      "Choisissez l'orientation retenue. Vous pouvez suivre la proposition ou vous en écarter : c'est votre décision.",
      "Ajoutez un commentaire pour l'instruction (motivation, points à signaler).",
      "« Valider la décision et préparer l'export » enregistre le tout et ouvre l'export.",
    ],
  },
  {
    numero: 6,
    titre: "Export vers le logiciel métier Solis",
    chemin: "/dossiers/<id>/export",
    objectif: "Transmettre la demande et ses métadonnées au logiciel métier, en créant l'usager ou en rattachant la demande à un usager existant.",
    ecran: [
      "La carte « Usager dans Solis » montre le résultat de la recherche : par numéro de sécurité sociale d'abord, par nom de naissance et date de naissance ensuite.",
      "Usager connu : son numéro, ses dossiers antérieurs, et l'annonce d'un rattachement. Usager inconnu : annonce d'une création (première demande).",
      "La carte « Métadonnées transmises » résume ce qui part vers Solis (identité, demande, pièces, instruction) et permet de voir le JSON complet.",
    ],
    actions: [
      "Cliquez sur « Exporter vers Solis ». Le retour affiche le numéro d'usager et le numéro de dossier attribués.",
      "Le dossier passe à l'état « Terminé ». « Retour à la GED » permet d'en prendre un autre.",
    ],
  },
];

const PIECES_OBLIGATOIRES = ["Formulaire de demande (CERFA 16301*01), signé", "Justificatif d'identité", "Relevé d'identité bancaire au nom du demandeur", "Dernier avis d'imposition ou de non-imposition (demandeur et conjoint)"];

const CONTROLES_COHERENCE = [
  "Nom, prénom et date de naissance de la pièce d'identité comparés au formulaire.",
  "Validité de la pièce d'identité à la date de réception, avec la prolongation légale de 5 ans des cartes délivrées entre 2004 et 2013.",
  "Titulaire du RIB contenant le nom du demandeur ; clé de l'IBAN vérifiée.",
  "Année de l'avis d'imposition ; nom du demandeur parmi les déclarants ; avis commun attendu quand le demandeur est en couple.",
  "Certificat médical établi pour le demandeur, daté de moins de 3 mois, médecin identifié (nom ou RPPS).",
  "Cohérence entre la qualité du signataire (en son nom, représentant légal) et la mesure de protection déclarée.",
  "Clé du numéro de sécurité sociale ; présence des réponses au questionnaire d'autonomie.",
];

export default function ModeDEmploi() {
  const piecesExtraites = TYPES_EXTRAITS.map((t) => LIBELLES_PIECES[t]);
  const piecesEcartees = TYPES_A_ECARTER.map((t) => LIBELLES_PIECES[t]);
  const autresPieces = (Object.keys(LIBELLES_PIECES) as TypePiece[]).filter((t) => !TYPES_EXTRAITS.includes(t) && !TYPES_A_ECARTER.includes(t)).map((t) => LIBELLES_PIECES[t]);

  return (
    <main className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <nav aria-label="Sommaire" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sommaire</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {SOMMAIRE.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-blue-700">
                  {s.titre}
                </a>
              </li>
            ))}
          </ul>
          <Link href="/ged" className="mt-4 block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-700">
            Entrer dans la plateforme
          </Link>
        </nav>
      </aside>

      <div className="flex flex-col gap-12">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Mode d&apos;emploi</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Prendre en main InstructOCR</h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Ce guide s&apos;adresse à un agent qui découvre la plateforme. Il décrit ce qu&apos;elle fait, comment se déroule l&apos;instruction
            d&apos;un dossier, comment lire chaque indicateur et quelles règles sont appliquées. Comptez dix minutes de lecture.
          </p>
        </header>

        <Section id="presentation" titre="1. À quoi sert la plateforme">
          <p className="text-slate-700">
            InstructOCR prépare l&apos;instruction des demandes d&apos;aide à l&apos;autonomie à domicile déposées avec le formulaire CERFA
            16301*01 (Allocation Personnalisée d&apos;Autonomie, dite APA). Un dossier arrive numérisé depuis la GED : le formulaire, la pièce
            d&apos;identité, le RIB, l&apos;avis d&apos;imposition, parfois un certificat médical, le tout dans un seul PDF et pas toujours dans l&apos;ordre.
          </p>
          <p className="text-slate-700">
            La plateforme lit ce PDF, reconnaît chaque page, en extrait les informations utiles, vérifie que le dossier est complet et
            cohérent, applique les règles administratives connues et propose une orientation. À chaque étape, l&apos;agent voit ce que
            l&apos;outil a compris, corrige et valide. Rien n&apos;est transmis au logiciel métier sans son accord.
          </p>
          <Encart titre="Ce que la plateforme ne fait pas">
            Elle ne décide pas à la place de l&apos;agent, n&apos;évalue pas le niveau de dépendance (cela reste l&apos;évaluation à domicile) et ne
            remplace pas le logiciel métier. Dans cette version de démonstration, la GED et le logiciel Solis sont simulés et tous les
            usagers sont fictifs.
          </Encart>
        </Section>

        <Section id="caracteristiques" titre="2. Caractéristiques">
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["Lecture OCR", "Chaque page du PDF est convertie en texte structuré par Mistral OCR, y compris les tableaux et les cases cochées. Une dizaine de pages prend environ 5 secondes."],
              ["Découpage par règles", "Le numéro officiel de chaque page du CERFA est lu dans son pied de page ; les autres pièces sont reconnues à leurs intitulés. Les règles sont déterministes et expliquées."],
              ["Extraction structurée", "Pour chaque type de pièce, un schéma de champs est extrait du texte par un modèle de langage, avec pour chaque champ une valeur, un score de confiance et l'extrait d'origine."],
              ["Vérifications déterministes", "Les identifiants à clé de contrôle (NIR, IBAN) sont relus dans le texte et vérifiés ; une case cochée invisible à l'OCR est déduite quand les cases voisines sont visibles vides."],
              ["Contrôles de conformité", "Présence des pièces obligatoires et conditionnelles, validité et cohérence entre pièces, courrier de demande de pièces généré automatiquement."],
              ["Aide à la décision", `Condition d'âge (${PARAMETRES.ageMinimumApa} ans), organisme compétent d'après le questionnaire, résidence, non-cumul, GIR estimé à titre indicatif.`],
              ["Export vers Solis", "Recherche de l'usager par NIR puis par état civil, création ou rattachement, transmission des métadonnées d'instruction."],
              ["Traçabilité", "Chaque valeur corrigée par l'agent est marquée, chaque contrôle et chaque règle porte son motif, la décision est horodatée et commentée."],
            ].map(([titre, texte]) => (
              <li key={titre} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">{titre}</p>
                <p className="mt-1 text-sm text-slate-600">{texte}</p>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Pièces dont les champs sont extraits</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {piecesExtraites.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Pièces reconnues sans extraction</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {autresPieces.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Pages écartées automatiquement</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {piecesEcartees.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section id="parcours" titre="3. Le parcours pas à pas">
          <p className="text-slate-700">
            Un dossier suit toujours les mêmes six étapes. Le fil des étapes en haut de chaque page de dossier montre où vous en êtes ;
            les étapes déjà passées restent accessibles pour revenir en arrière.
          </p>
          <ol className="flex flex-col gap-6">
            {ETAPES.map((e) => (
              <li key={e.numero} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{e.numero}</span>
                  <h3 className="text-lg font-semibold text-slate-900">{e.titre}</h3>
                  <code className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{e.chemin}</code>
                </div>
                <p className="mt-3 text-sm text-slate-700">
                  <span className="font-semibold">Objectif.</span> {e.objectif}
                </p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Ce que vous voyez</p>
                    <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                      {e.ecran.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Ce que vous faites</p>
                    <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                      {e.actions.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {e.conseil ? (
                  <div className="mt-3">
                    <Encart teinte="vert" titre="Conseil">
                      {e.conseil}
                    </Encart>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>

        <Section id="indicateurs" titre="4. Lire les indicateurs">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Scores de confiance</p>
              <p className="mt-1 text-sm text-slate-600">Sur les pièces au découpage et sur chaque champ au pré-contrôle.</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Pastille couleur="vert">80 % et plus</Pastille> lecture sûre, à survoler.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="ambre">50 à 79 %</Pastille> lecture partielle ou reconstituée, à vérifier.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="rouge">moins de 50 %</Pastille> lecture douteuse, à contrôler dans le document.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="rouge">non lu</Pastille> champ absent ou illisible, à saisir si nécessaire.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="bleu">corrigé</Pastille> valeur saisie par l&apos;agent, elle prime sur la lecture.
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Statuts des contrôles de conformité</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Pastille couleur="rouge">Bloquant</Pastille> rend le dossier non recevable (pièce obligatoire absente, identité différente).
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="ambre">Alerte</Pastille> à apprécier par l&apos;agent, le dossier est recevable sous réserve.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="bleu">Information</Pastille> utile pour l&apos;instruction, sans effet sur la recevabilité.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="vert">Conforme</Pastille> contrôle passé.
                </li>
              </ul>
              <p className="mt-4 font-semibold text-slate-900">Statuts des règles de décision</p>
              <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Pastille couleur="vert">Vérifiée</Pastille> condition remplie.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="rouge">Non remplie</Pastille> condition qui exclut l&apos;APA (âge, organisme compétent).
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="ambre">Point d&apos;attention</Pastille> à signaler à l&apos;instruction.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="gris">Indéterminée</Pastille> une donnée manque pour conclure.
                </li>
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="font-semibold text-slate-900">Les orientations possibles</p>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.instruction_apa}</dt>
              <dd className="text-slate-600">Le dossier est recevable, l&apos;usager a l&apos;âge requis et le département est compétent. Une évaluation à domicile suivra.</dd>
              <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.caisse_retraite}</dt>
              <dd className="text-slate-600">Moins de {PARAMETRES.seuilNonQuestionnaire} réponses « non » au questionnaire d&apos;autonomie : la demande relève de la caisse de retraite (Accompagnement à domicile).</dd>
              <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.mdph}</dt>
              <dd className="text-slate-600">Le demandeur a moins de {PARAMETRES.ageMinimumApa} ans : la prestation de compensation du handicap relève de la MDPH.</dd>
              <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.pieces_manquantes}</dt>
              <dd className="text-slate-600">Le dossier est non recevable en l&apos;état : envoyer le courrier généré à l&apos;étape de conformité.</dd>
              <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.indeterminee}</dt>
              <dd className="text-slate-600">Une information essentielle (date de naissance, questionnaire) n&apos;a pas pu être lue : revenir au pré-contrôle.</dd>
            </dl>
          </div>
        </Section>

        <Section id="regles" titre="5. Les règles appliquées">
          <Encart teinte="ambre" titre="Un premier jeu de règles">
            Les règles ci-dessous sont issues du CERFA 16301*01 et de sa notice. Elles constituent une base de travail à affiner avec les
            services instructeurs ; les seuils sont regroupés dans un fichier de paramètres.
          </Encart>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Pièces obligatoires</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {PIECES_OBLIGATOIRES.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p className="mt-3 font-semibold text-slate-900">Pièces conditionnelles</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                <li>Décision de justice si une mesure de protection est déclarée prononcée ou si le formulaire est signé par un représentant légal (bloquant).</li>
                <li>Avis de taxe foncière si la résidence principale est déclarée non louée ou si d&apos;autres biens immobiliers sont déclarés (alerte).</li>
                <li>Certificat médical : facultatif. S&apos;il est joint mais vierge, il est considéré comme absent.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Contrôles de cohérence</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {CONTROLES_COHERENCE.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="font-semibold text-slate-900">Règles de décision</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
              <li>
                <span className="font-medium text-slate-800">Condition d&apos;âge :</span> {PARAMETRES.ageMinimumApa} ans révolus à la date de réception du dossier. En deçà, orientation vers la MDPH.
              </li>
              <li>
                <span className="font-medium text-slate-800">Organisme compétent :</span> au moins {PARAMETRES.seuilNonQuestionnaire} réponses « non » aux quatre questions d&apos;autonomie (se lever, s&apos;habiller, faire sa toilette, manger) pour relever du département ; sinon, la caisse de retraite principale.
              </li>
              <li>
                <span className="font-medium text-slate-800">Lieu de résidence :</span> domicile, domicile d&apos;un proche, accueil familial ou résidence autonomie. L&apos;accueil familial est incompatible avec la prestation des caisses de retraite.
              </li>
              <li>
                <span className="font-medium text-slate-800">Département financeur :</span> une arrivée à l&apos;adresse actuelle depuis moins de {PARAMETRES.moisDomicileDeSecours} mois signale que le domicile de secours est à déterminer.
              </li>
              <li>
                <span className="font-medium text-slate-800">Non-cumul :</span> ACTP, aide sociale départementale à domicile, MTP, PCH et PCRTP ne se cumulent pas avec l&apos;APA. Leur perception est signalée, l&apos;usager devra choisir.
              </li>
              <li>
                <span className="font-medium text-slate-800">Perte d&apos;autonomie :</span> un GIR est estimé à partir de la grille du certificat médical (14 items), à titre indicatif. Les GIR 5 et 6 n&apos;ouvrent pas droit à l&apos;APA.
              </li>
            </ul>
          </div>
        </Section>

        <Section id="demonstration" titre="6. Les dossiers de démonstration">
          <p className="text-slate-700">
            Six dossiers fictifs, répartis dans {LOTS_GED.filter((l) => DOSSIERS_FICTIFS.some((d) => d.lotId === l.id)).length} lots, ont été
            fabriqués à partir du CERFA officiel puis numérisés. Chacun illustre une situation que l&apos;instruction rencontre. Aucune de ces
            personnes n&apos;existe.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 font-medium">Dossier</th>
                  <th className="px-4 py-2 font-medium">Usager</th>
                  <th className="px-4 py-2 font-medium">Situation</th>
                  <th className="px-4 py-2 font-medium">Ce que vous devez observer</th>
                </tr>
              </thead>
              <tbody>
                {DOSSIERS_FICTIFS.map((d) => {
                  const ddn = parserDateFr(d.formulaire.demandeur.dateNaissance);
                  const reception = parserDateFr(d.dateReception);
                  const age = ddn && reception ? ageA(ddn, reception) : null;
                  const nom = d.formulaire.demandeur.nomUsage ? `${d.formulaire.demandeur.nomNaissance} ép. ${d.formulaire.demandeur.nomUsage}` : d.formulaire.demandeur.nomNaissance;
                  return (
                    <tr key={d.id} className="border-b border-slate-100 align-top">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {d.id}
                        <br />
                        <span className="text-slate-500">lot {d.lotId.replace("lot-", "#")}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {d.formulaire.demandeur.prenoms} {nom}
                        {age !== null ? <span className="text-slate-500">, {age} ans</span> : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{d.scenario.titre}</td>
                      <td className="px-4 py-3">
                        <ul className="list-disc pl-4 text-slate-600">
                          {d.scenario.attendu.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="limites" titre="7. Limites à connaître">
          <ul className="flex flex-col gap-3">
            {[
              ["L'OCR n'est pas parfait", "Certaines cases cochées ne sont pas vues, en particulier la demande de carte mobilité inclusion. Un chiffre peut être mal lu. Le pré-contrôle existe pour cela : les champs non lus ou douteux sont signalés et l'agent complète."],
              ["Les dossiers restent dans votre navigateur", "L'état des dossiers en cours est conservé sur ce poste, dans ce navigateur. Un autre poste ne le voit pas, et vider les données du navigateur l'efface. Une base partagée est prévue pour la suite."],
              ["GED et Solis sont simulés", "Les lots, les dossiers, la recherche d'usager et l'export sont des simulations réalistes mais locales. Les numéros d'usager et de dossier renvoyés ne sont pas réels."],
              ["Les règles sont un premier jeu", "Elles reflètent le CERFA et sa notice, pas encore la pratique des services instructeurs. Les seuils sont modifiables."],
              ["Des appels réseau à chaque étape", "OCR et extraction passent par l'API Mistral. Une coupure d'accès à internet fait échouer l'import ou l'extraction : il suffit de relancer une fois la connexion revenue."],
              ["Pas d'authentification", "Le prototype n'a pas de comptes ni de droits. Il ne doit pas être exposé avec des données réelles."],
            ].map(([titre, texte]) => (
              <li key={titre} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">{titre}</p>
                <p className="mt-1 text-sm text-slate-600">{texte}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="faq" titre="8. Questions fréquentes">
          <dl className="flex flex-col gap-4">
            {[
              ["Comment recommencer un dossier depuis le début ?", "Sur la page d'import, cliquez sur « Réimporter et relancer l'OCR » : le dossier repart de zéro. Sur l'accueil, « Retirer du poste » supprime un dossier en cours sans le retraiter."],
              ["Puis-je revenir à une étape précédente ?", "Oui. Le fil des étapes en haut du dossier permet de rouvrir toute étape déjà passée. Les boutons « Retour » des étapes de conformité et de décision font de même. Les corrections faites au pré-contrôle recalculent automatiquement les contrôles et les règles."],
              ["Une extraction s'est terminée en erreur, que faire ?", "Ouvrez l'onglet de la pièce concernée et cliquez sur « Relancer l'extraction ». Si l'import lui-même a échoué, le dossier a été retiré du poste : réimportez-le."],
              ["Combien de temps prend un dossier ?", "L'OCR prend quelques secondes, l'extraction du formulaire une dizaine de secondes, les autres pièces deux à trois secondes chacune. Le reste dépend de l'agent : compter deux à cinq minutes pour un dossier de démonstration."],
              ["Que devient une valeur que j'ai corrigée ?", "Elle prime sur la valeur lue pour toute la suite (contrôles, règles, export) et reste marquée « corrigé ». Vider la case revient à déclarer le champ non renseigné."],
              ["Pourquoi un dossier non recevable peut-il continuer ?", "Pour que l'agent voie la décision proposée (réclamer les pièces) et, s'il le souhaite, la trace de l'instruction. L'export vers Solis reste possible pour enregistrer la demande en attente de pièces."],
              ["Où voir le texte lu par l'OCR ?", "Au pré-contrôle, « Voir le texte OCR » affiche le texte de la pièce. Le banc d'essai OCR, dans le menu, permet aussi de tester n'importe quel PDF ou image."],
            ].map(([q, r]) => (
              <div key={q} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="font-semibold text-slate-900">{q}</dt>
                <dd className="mt-1 text-sm text-slate-600">{r}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="glossaire" titre="9. Glossaire">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            {[
              ["APA", "Allocation Personnalisée d'Autonomie, versée par le département aux personnes de 60 ans et plus en perte d'autonomie."],
              ["CERFA 16301*01", "Formulaire national de demande d'aides à l'autonomie à domicile : accompagnement des caisses de retraite ou APA."],
              ["GED", "Gestion électronique des documents : l'outil où arrivent les dossiers numérisés."],
              ["Solis", "Logiciel métier de l'action sociale, où sont gérés les usagers et leurs demandes."],
              ["OCR", "Reconnaissance optique de caractères : conversion d'une image de document en texte."],
              ["NIR", "Numéro d'inscription au répertoire, dit numéro de sécurité sociale, 15 chiffres dont 2 de clé."],
              ["GIR", "Groupe iso-ressources, de 1 (dépendance la plus forte) à 6 (autonomie). L'APA concerne les GIR 1 à 4."],
              ["CMI", "Carte mobilité inclusion, mentions stationnement, priorité ou invalidité."],
              ["MDPH", "Maison départementale des personnes handicapées, compétente pour la PCH."],
              ["PCH, ACTP, MTP, PCRTP", "Prestations liées au handicap ou à la tierce personne, non cumulables avec l'APA."],
              ["EMS", "Équipe médico-sociale du département, qui évalue à domicile et établit le plan d'aide."],
              ["Recevabilité", "Aptitude d'un dossier à être instruit : pièces présentes et cohérentes."],
            ].map(([terme, definition]) => (
              <div key={terme} className="contents">
                <dt className="font-medium text-slate-900">{terme}</dt>
                <dd className="text-slate-600">{definition}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-sm text-blue-900">Vous avez tout lu ? Le plus simple est maintenant d&apos;essayer avec un dossier de démonstration.</p>
          <Link href="/ged" className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            Entrer dans la plateforme
          </Link>
        </div>
      </div>
    </main>
  );
}
