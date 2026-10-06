import Link from "next/link";
import type { ReactNode } from "react";
import { DOSSIERS_FICTIFS, LOTS_GED } from "@/data/dossiers-fictifs";
import { ageA, parserDateFr } from "@/lib/dates";
import { LIBELLES_PIECES, TYPES_A_ECARTER, TYPES_EXTRAITS, type TypePiece } from "@/lib/decoupage";
import { MARQUE } from "@/lib/marque";
import { MODULES } from "@/lib/modules";
import { LIBELLES_ORIENTATION } from "@/lib/regles/decision";
import { PARAMETRES } from "@/lib/regles/parametres";
import { LIBELLES_STATUT } from "@/lib/statuts";

export const metadata = {
  title: "Mode d'emploi — Solid'IA",
  description: "Présentation de l'outil, des trois modules, du parcours d'un dossier étape par étape, de la lecture des indicateurs et des règles appliquées.",
};

const SOMMAIRE = [
  { id: "presentation", titre: "1. À quoi sert l'outil" },
  { id: "modules", titre: "2. Les trois modules" },
  { id: "caracteristiques", titre: "3. Caractéristiques" },
  { id: "parcours", titre: "4. Le parcours pas à pas" },
  { id: "indicateurs", titre: "5. Lire les indicateurs" },
  { id: "regles", titre: "6. Les règles appliquées" },
  { id: "demonstration", titre: "7. Les dossiers de démonstration" },
  { id: "limites", titre: "8. Limites à connaître" },
  { id: "faq", titre: "9. Questions fréquentes" },
  { id: "glossaire", titre: "10. Glossaire" },
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

type EtapeGuide = {
  numero: number;
  titre: string;
  module: string;
  chemin: string;
  objectif: string;
  ecran: string[];
  actions: string[];
  conseil?: string;
};

const ETAPES_GUIDE: EtapeGuide[] = [
  {
    numero: 0,
    titre: "Prise en charge depuis la GED",
    module: "Module 1 · GED",
    chemin: "/ged",
    objectif: "Choisir le dossier à traiter parmi les lots de numérisation, l'enregistrer et le faire entrer dans la bannette du poste de travail.",
    ecran: [
      "À gauche, les lots de numérisation avec leur date, leur origine (scanner, courrier) et leur nombre de dossiers.",
      "À droite, les dossiers du lot : identifiant, libellé donné par la GED, date de réception, nombre de pages, taille du document.",
      "Un badge indique le statut métier du dossier s'il est déjà dans votre bannette, ainsi que l'étape en cours.",
      "Le pli « Scénario de démonstration » décrit ce que le dossier est censé illustrer.",
    ],
    actions: [
      "Cliquez sur un lot pour afficher ses dossiers.",
      "Cliquez sur « Prendre en charge et lire le dossier ». Le dossier reçoit un numéro d'enregistrement, le document est lu par l'OCR en quelques secondes et les pages sont typées. Vous arrivez directement à la première étape de traitement.",
      "« Reprendre » rouvre un dossier déjà commencé à son étape courante. « Reprendre à zéro » relance la lecture depuis le début.",
    ],
    conseil: "Commencez par le dossier D-2026-0301 (Jean DUPONT) : il est complet, ce qui permet de voir tout le parcours sans obstacle, y compris le rattachement à un usager déjà connu.",
  },
  {
    numero: 1,
    titre: "Typage des pièces",
    module: "Module 2 · Dossiers",
    chemin: "/dossiers/<id>/decoupage",
    objectif: "Vérifier que chaque page a été rattachée à la bonne pièce (formulaire, certificat médical, pièce d'identité, RIB, avis d'imposition…).",
    ecran: [
      "À gauche, le document numérisé, page par page.",
      "À droite, la structure détectée : chaque pièce avec ses pages, son type, un score de confiance et une mention « auto » ou « agent ».",
      "Les pages de la notice du CERFA, les mentions RGPD et les pages vides ou illisibles sont marquées « à écarter » : elles n'entrent pas dans l'instruction.",
      "« Détail des pages » montre, pour chaque page, la raison de sa classification et un aperçu de son texte.",
    ],
    actions: [
      "Si une pièce est mal typée, changez son type dans la liste déroulante. Le type peut aussi être changé page par page. Chaque changement est journalisé.",
      "« Recalculer automatiquement » revient à la proposition initiale.",
      "« Valider le typage et extraire » enregistre la structure et lance l'extraction des champs.",
    ],
    conseil: "Le pied de page « cerfa 16301*01 » donne à l'outil le numéro officiel de chaque page du formulaire : c'est ce qui rend le typage fiable, même quand les pièces arrivent dans le désordre, et ce qui permet de vérifier que le formulaire est complet.",
  },
  {
    numero: 2,
    titre: "Contrôle des données",
    module: "Module 2 · Dossiers",
    chemin: "/dossiers/<id>/extraction",
    objectif: "Relire les champs extraits de chaque pièce en regard du document, vérifier les champs critiques, compléter ce qui n'a pas été lu, puis rapprocher l'identité des usagers connus.",
    ecran: [
      "À gauche, le document ; à droite, un onglet par pièce et le tableau des champs : libellé, valeur (modifiable), score de confiance, case « vérifié », extrait du texte d'où vient la valeur. Cliquer sur une ligne affiche la page du document où se trouve le champ.",
      "Les champs critiques portent une étoile : identité, date de naissance, numéro de sécurité sociale, questionnaire d'autonomie, mesure de protection, signature, validité de la pièce d'identité, IBAN, patient et date du certificat médical. Ils doivent être cochés « vérifié » ou corrigés.",
      "Les lignes non lues ou douteuses sont surlignées en ambre ; les lignes modifiées passent en bleu avec la mention « corrigé ».",
      "Pour le certificat médical, tout le volet est extrait : identité du patient, pathologies, prises en charge, mobilité et grille remplie par le médecin. L'outil restitue ces éléments sans en tirer de note.",
      "Sous le tableau, la carte « Rapprochement avec les usagers connus » présente les usagers du logiciel métier correspondant à l'identité lue, du plus sûr (numéro de sécurité sociale identique) au moins sûr (homonyme), avec leurs demandes antérieures.",
    ],
    actions: [
      "Tapez directement dans une case pour corriger une valeur ; pour les champs à cases cochées, utilisez la liste déroulante.",
      "Cochez « vérifié » sur chaque champ critique après l'avoir comparé au document, ou utilisez « Marquer les critiques vérifiés » pour une pièce sûre.",
      "Dans le rapprochement, cliquez « C'est cet usager » pour rattacher la demande à un usager existant, ou « Nouvel usager » si aucun candidat ne correspond. Jamais de rattachement automatique.",
      "« Voir le texte OCR » affiche le texte brut de la pièce. « Relancer l'extraction » refait l'appel pour la pièce affichée, les corrections sont conservées.",
      "« Valider et passer à la recevabilité » n'est actif que lorsque toutes les pièces sont extraites, tous les champs critiques vérifiés et le rapprochement confirmé.",
    ],
    conseil: "Si un candidat affiche « demande déjà en cours », le rattacher évite de créer un doublon : l'envoi viendra compléter la demande existante.",
  },
  {
    numero: 3,
    titre: "Complétude et recevabilité",
    module: "Module 2 · Dossiers",
    chemin: "/dossiers/<id>/conformite",
    objectif: "Savoir si le dossier peut partir en instruction ou s'il faut réclamer des pièces, fixer la date de dossier complet et préparer le courrier à l'usager.",
    ecran: [
      "Un bandeau donne le verdict : « recevable », « recevable sous réserve » ou « non recevable », avec une phrase de synthèse.",
      "Les contrôles sont regroupés par gravité : bloquants, alertes, informations, conformes. Chacun explique ce qu'il a vérifié et ce qu'il a trouvé.",
      "La carte « Délais » affiche la date limite de l'accusé de réception et, si le dossier est complet, la date limite de décision.",
      "La carte « Courrier à l'usager » propose l'accusé de réception (dossier complet) ou la demande de pièces (dossier incomplet).",
    ],
    actions: [
      "Lisez les bloquants et les alertes. Si une alerte vient d'une mauvaise lecture, revenez au contrôle des données, corrigez, et le contrôle se recalcule.",
      "« Générer le courrier » produit le texte prêt à copier, conservé dans le dossier.",
      "« Valider et passer à la pré-instruction » enregistre le verdict : un dossier complet reçoit sa date de complétude, un dossier incomplet passe « en attente de pièces ».",
    ],
  },
  {
    numero: 4,
    titre: "Pré-instruction et orientation",
    module: "Module 2 · Dossiers",
    chemin: "/dossiers/<id>/decision",
    objectif: "Obtenir une orientation motivée par les règles administratives, puis retenir celle qui sera appliquée. L'agent d'accueil ne décide pas de l'attribution de l'aide : il oriente.",
    ecran: [
      "Un bandeau annonce l'orientation proposée et sa motivation.",
      "La liste des règles appliquées : condition d'âge, organisme compétent d'après le questionnaire, lieu de résidence, département financeur, non-cumul, éléments médicaux versés au dossier.",
      "L'outil ne note pas la perte d'autonomie : il indique que le certificat médical est joint et le transmet. Le GIR est déterminé par l'équipe médico-sociale lors de la visite à domicile.",
      "La carte « Orientation retenue » propose les orientations possibles (celle du système est signalée « proposée »), affiche le destinataire, le statut que prendra le dossier et le courrier associé, et un champ de commentaire.",
    ],
    actions: [
      "Choisissez l'orientation. Vous pouvez suivre la proposition ou vous en écarter : c'est votre décision, elle est journalisée.",
      "Ajoutez un commentaire pour l'instruction (motivation, points à signaler).",
      "« Valider l'orientation et préparer la transmission » enregistre le tout, génère le courrier correspondant s'il manque et ouvre l'étape d'enregistrement.",
    ],
  },
  {
    numero: 5,
    titre: "Enregistrement et transmission",
    module: "Module 2 · Dossiers, vers le module 3 · Solis",
    chemin: "/dossiers/<id>/export",
    objectif: "Enregistrer la demande dans le logiciel métier avec son statut, la rattacher à l'usager confirmé ou créer l'usager, la transmettre au destinataire, et déposer les pièces typées dans la GED.",
    ecran: [
      "La carte « Usager » rappelle le rapprochement confirmé : usager connu (avec sa demande en cours le cas échéant) ou nouvel usager.",
      "La carte « Demande » résume ce qui part vers le logiciel métier : numéro d'enregistrement, dates, recevabilité, orientation, statut, destinataire ; le détail complet est consultable.",
      "La carte « Courriers » liste les courriers générés. La carte « Retour vers la GED » liste les pièces qui seront déposées sous l'usager, chacune ouvrable en PDF.",
    ],
    actions: [
      "Cliquez sur « Enregistrer dans Solis et transmettre ». Le retour affiche le numéro d'usager, le numéro de demande (créée, rattachée ou mise à jour) et le statut.",
      "Le dossier prend son statut final et apparaît dans le module Solis, sous la fiche de l'usager.",
    ],
  },
];

const PIECES_OBLIGATOIRES = [
  "Formulaire de demande (CERFA 16301*01) complet (pages 5 à 9), signé et daté",
  "Justificatif d'identité",
  "Relevé d'identité bancaire au nom du demandeur",
  "Dernier avis d'imposition ou de non-imposition (demandeur et conjoint)",
];

const CONTROLES_COHERENCE = [
  "Formulaire complet : les cinq pages présentes, aucune page en double, un seul formulaire par dossier (un dossier par demandeur pour un couple).",
  "Formulaire signé et daté ; qualité du signataire cohérente avec la mesure de protection déclarée.",
  "Nom, prénom et date de naissance de la pièce d'identité comparés au formulaire.",
  "Validité de la pièce d'identité à la date de réception, avec la prolongation légale de 5 ans des cartes délivrées entre 2004 et 2013.",
  "Titulaire du relevé bancaire contenant le nom du demandeur ; clé de l'IBAN vérifiée.",
  "Année de l'avis d'imposition ; nom du demandeur parmi les déclarants ; avis commun attendu quand le demandeur est en couple.",
  "Certificat médical établi pour le demandeur, daté de moins de 3 mois, médecin identifié ; certificat vierge considéré comme absent.",
  "Rapprochement : identité concordante avec l'usager rattaché, adresse à mettre à jour signalée, demande déjà en cours signalée.",
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
            Entrer dans l&apos;outil
          </Link>
        </nav>
      </aside>

      <div className="flex flex-col gap-12">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Mode d&apos;emploi</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Prendre en main {MARQUE.nom}</h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Ce guide s&apos;adresse à un agent qui découvre l&apos;outil. Il décrit ce qu&apos;il fait, comment se déroule la pré-instruction
            d&apos;un dossier, comment lire chaque indicateur et quelles règles sont appliquées. Comptez dix minutes de lecture.
          </p>
        </header>

        <Section id="presentation" titre="1. À quoi sert l'outil">
          <p className="text-slate-700">
            {MARQUE.nom} est l&apos;outil de traitement intelligent des dossiers des solidarités de la {MARQUE.collectivite}. Cette version prépare
            l&apos;instruction des demandes d&apos;aide à l&apos;autonomie à domicile déposées avec le formulaire CERFA 16301*01 (Allocation
            Personnalisée d&apos;Autonomie, dite APA). Un dossier arrive numérisé depuis la gestion électronique des documents : le formulaire, la
            pièce d&apos;identité, le relevé bancaire, l&apos;avis d&apos;imposition, parfois un certificat médical, le tout dans un seul document et
            pas toujours dans l&apos;ordre.
          </p>
          <p className="text-slate-700">
            L&apos;outil enregistre la réception, lit le document, reconnaît chaque page, en extrait les informations utiles, rapproche l&apos;usager
            des usagers connus, vérifie que le dossier est complet et cohérent, applique les règles administratives et propose une orientation. À
            chaque étape, l&apos;agent voit ce que l&apos;outil a compris, corrige et valide ; chaque action est journalisée. Rien n&apos;est transmis
            au logiciel métier sans son accord.
          </p>
          <Encart titre="Ce que l'outil ne fait pas">
            Il ne décide pas de l&apos;attribution de l&apos;aide et n&apos;évalue pas la perte d&apos;autonomie : il ne calcule aucun GIR. L&apos;évaluation
            à domicile par l&apos;équipe médico-sociale est la seule qui détermine le degré de dépendance. Il ne remplace pas le logiciel métier. Dans
            cette version de démonstration, la gestion documentaire et le logiciel métier sont simulés et tous les usagers sont fictifs.
          </Encart>
        </Section>

        <Section id="modules" titre="2. Les trois modules">
          <p className="text-slate-700">
            L&apos;outil suit le chemin réel d&apos;un dossier, et chaque étape de ce chemin a son propre espace, accessible depuis la barre du haut.
            Le traitement n&apos;est pas caché derrière l&apos;écran d&apos;arrivée des documents.
          </p>
          <ol className="grid gap-4 md:grid-cols-3">
            {MODULES.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg ring-1 ring-blue-100" aria-hidden>
                    {m.icone}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Module {m.numero}</p>
                    <p className="font-semibold text-slate-900">{m.libelle}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700">{m.sousTitre}</p>
                <p className="text-sm text-slate-600">{m.description}</p>
                <Link href={m.chemin} className="mt-1 text-sm font-semibold text-blue-700 hover:underline">
                  Ouvrir →
                </Link>
              </li>
            ))}
          </ol>
          <Encart teinte="vert" titre="Ne pas confondre Solid'IA et Solis">
            {MARQUE.nom} est l&apos;outil que vous utilisez. Solis est le logiciel métier de l&apos;action sociale, où les usagers et leurs demandes
            sont enregistrés : c&apos;est la destination du dossier, simulée ici par le module 3.
          </Encart>
        </Section>

        <Section id="caracteristiques" titre="3. Caractéristiques">
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["Enregistrement à la réception", "Chaque dossier pris en charge reçoit un numéro d'enregistrement et un statut métier qui évolue : reçu, en cours, en attente de pièces, transmis, orienté."],
              ["Lecture automatique", "Chaque page est convertie en texte structuré par un moteur de reconnaissance de documents, tableaux et cases cochées compris. Une dizaine de pages prend quelques secondes."],
              ["Typage par règles", "Le numéro officiel de chaque page du CERFA est lu dans son pied de page ; les autres pièces sont reconnues à leurs intitulés ; les pages vides sont écartées. Les règles sont déterministes et expliquées."],
              ["Extraction structurée et vidéocodage", "Pour chaque type de pièce, un schéma de champs est extrait du texte, avec pour chaque champ une valeur, un score de confiance et l'extrait d'origine. Les champs s'affichent en regard du document ; les champs critiques exigent une vérification explicite."],
              ["Vérifications déterministes", "Les identifiants à clé de contrôle (sécurité sociale, IBAN) sont relus dans le texte et vérifiés ; une case cochée invisible à la lecture est déduite quand les cases voisines sont visibles vides ; une case inventée par le modèle est démasquée."],
              ["Rapprochement d'identité", "L'identité lue est confrontée aux usagers connus, par numéro de sécurité sociale puis par état civil, homonymes compris. L'agent confirme ; une demande déjà en cours est signalée pour éviter les doublons."],
              ["Complétude, délais et courriers", "Pièces obligatoires et conditionnelles, formulaire complet et signé, cohérence entre pièces ; date de dossier complet, délais d'accusé de réception et de décision ; courriers générés (accusé de réception, demande de pièces, transmission, orientation)."],
              ["Pré-instruction", `Condition d'âge (${PARAMETRES.ageMinimumApa} ans), organisme compétent d'après le questionnaire, résidence, département financeur, non-cumul. L'agent retient l'orientation et le statut en découle.`],
              ["Enregistrement, transmission, retour GED", "Création ou rattachement de l'usager, création ou mise à jour de la demande avec son statut, transmission au destinataire, dépôt des pièces typées dans la GED sous l'usager."],
              ["Journal des actions", "Prise en charge, typage, corrections avec valeur avant et après, vérifications, rapprochement, recevabilité, courriers, orientation, enregistrement : tout est horodaté et consultable depuis le bandeau du dossier."],
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

        <Section id="parcours" titre="4. Le parcours pas à pas">
          <p className="text-slate-700">
            Un dossier est pris en charge dans le module GED, puis suit cinq étapes dans le module Dossiers avant d&apos;être enregistré dans le
            logiciel métier. Le fil des étapes en haut de chaque dossier montre où vous en êtes ; les étapes déjà passées restent accessibles. Le
            journal des actions se déplie sous le fil.
          </p>
          <ol className="flex flex-col gap-6">
            {ETAPES_GUIDE.map((e) => (
              <li key={e.numero} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${e.numero === 0 ? "bg-slate-500" : "bg-blue-600"}`}
                  >
                    {e.numero === 0 ? "0" : e.numero}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900">{e.titre}</h3>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{e.module}</span>
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

        <Section id="indicateurs" titre="5. Lire les indicateurs">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Scores de confiance et vérification</p>
              <p className="mt-1 text-sm text-slate-600">Sur les pièces au typage et sur chaque champ au contrôle des données.</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Pastille couleur="vert">80 % et plus</Pastille> lecture sûre, à survoler.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="ambre">50 à 79 %</Pastille> lecture partielle ou déduite, à vérifier.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="rouge">moins de 50 %</Pastille> lecture douteuse, à contrôler dans le document.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="rouge">non lu</Pastille> champ absent, illisible ou case non visible : à saisir si nécessaire.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="bleu">corrigé</Pastille> valeur saisie par l&apos;agent, elle prime sur la lecture.
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">★</span> champ critique : case « vérifié » obligatoire avant de valider l&apos;étape.
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Statuts des contrôles de complétude</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Pastille couleur="rouge">Bloquant</Pastille> rend le dossier non recevable (pièce obligatoire absente, formulaire incomplet, identité différente).
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
              <p className="mt-4 font-semibold text-slate-900">Statuts des règles de pré-instruction</p>
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Les orientations possibles</p>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div>
                  <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.instruction_apa}</dt>
                  <dd className="text-slate-600">Dossier recevable, âge requis, département compétent. Accusé de réception, puis évaluation à domicile.</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.caisse_retraite}</dt>
                  <dd className="text-slate-600">
                    Moins de {PARAMETRES.seuilNonQuestionnaire} réponses « non » au questionnaire : la demande relève de la caisse de retraite. Courrier
                    d&apos;information à l&apos;usager.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.mdph}</dt>
                  <dd className="text-slate-600">Le demandeur a moins de {PARAMETRES.ageMinimumApa} ans : la PCH relève de la MDPH. Courrier d&apos;orientation.</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.pieces_manquantes}</dt>
                  <dd className="text-slate-600">Dossier non recevable en l&apos;état : la demande est enregistrée en attente, la demande de pièces est envoyée.</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-900">{LIBELLES_ORIENTATION.indeterminee}</dt>
                  <dd className="text-slate-600">Une information essentielle n&apos;a pas pu être lue : revenir au contrôle des données.</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Les statuts du dossier</p>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                {(Object.entries(LIBELLES_STATUT) as Array<[string, string]>).map(([cle, libelle]) => (
                  <div key={cle}>
                    <dt className="font-medium text-slate-900">{libelle}</dt>
                    <dd className="text-slate-600">
                      {
                        {
                          recu: "Pris en charge et enregistré, typage non validé.",
                          en_cours: "Pré-instruction en cours, ou dossier complet en attente d'orientation.",
                          en_attente_pieces: "Non recevable : demande de pièces envoyée, le délai d'instruction ne court pas.",
                          transmis_ems: "Transmis à l'équipe médico-sociale pour évaluation à domicile.",
                          transmis_caisse: "Transmis à la caisse de retraite compétente.",
                          oriente_mdph: "Usager orienté vers la MDPH, demande close au titre de l'APA.",
                          clos: "Dossier clos.",
                        }[cle]
                      }
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Section>

        <Section id="regles" titre="6. Les règles appliquées">
          <Encart teinte="ambre" titre="Un premier jeu de règles">
            Les règles ci-dessous sont issues du CERFA 16301*01, de sa notice et des pratiques usuelles de gestion de dossiers. Elles constituent une
            base de travail à affiner avec les services instructeurs ; les seuils et délais sont regroupés dans un fichier de paramètres.
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
              <p className="mt-3 font-semibold text-slate-900">Délais</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                <li>Accusé de réception ou demande de pièces sous {PARAMETRES.joursAccuseReception} jours après réception.</li>
                <li>Décision sous {PARAMETRES.moisDecision} mois à compter de la date de dossier complet.</li>
                <li>{PARAMETRES.joursReponsePieces} jours laissés à l&apos;usager pour transmettre les pièces réclamées.</li>
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
            <p className="font-semibold text-slate-900">Règles de pré-instruction</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
              <li>
                <span className="font-medium text-slate-800">Condition d&apos;âge :</span> {PARAMETRES.ageMinimumApa} ans révolus à la date de réception. En deçà, orientation vers la MDPH.
              </li>
              <li>
                <span className="font-medium text-slate-800">Organisme compétent :</span> au moins {PARAMETRES.seuilNonQuestionnaire} réponses « non » aux quatre questions d&apos;autonomie pour relever du département ; sinon, la caisse de retraite principale.
              </li>
              <li>
                <span className="font-medium text-slate-800">Lieu de résidence :</span> domicile, domicile d&apos;un proche, accueil familial ou résidence autonomie. L&apos;accueil familial est incompatible avec la prestation des caisses de retraite.
              </li>
              <li>
                <span className="font-medium text-slate-800">Département financeur :</span> une arrivée à l&apos;adresse actuelle depuis moins de {PARAMETRES.moisDomicileDeSecours} mois signale que le domicile de secours est à déterminer.
              </li>
              <li>
                <span className="font-medium text-slate-800">Non-cumul :</span> ACTP, aide sociale départementale à domicile, MTP, PCH et PCRTP ne se cumulent pas avec l&apos;APA. Leur perception est signalée.
              </li>
              <li>
                <span className="font-medium text-slate-800">Perte d&apos;autonomie :</span> jamais évaluée par l&apos;outil. Le certificat médical est versé au dossier et transmis à l&apos;équipe médico-sociale, qui détermine le GIR lors de la visite à domicile.
              </li>
            </ul>
          </div>
        </Section>

        <Section id="demonstration" titre="7. Les dossiers de démonstration">
          <p className="text-slate-700">
            Six dossiers fictifs, répartis dans {LOTS_GED.filter((l) => DOSSIERS_FICTIFS.some((d) => d.lotId === l.id)).length} lots, ont été
            fabriqués à partir du CERFA officiel puis numérisés. Chacun illustre une situation que la pré-instruction rencontre. Aucune de ces
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

        <Section id="limites" titre="8. Limites à connaître">
          <ul className="flex flex-col gap-3">
            {[
              ["La lecture automatique n'est pas parfaite, ni toujours identique", "Certaines cases cochées ne sont pas vues, et la lecture d'un même document peut varier d'un jour à l'autre. Quand aucune case n'est visible, l'outil déclare le champ « non lu » plutôt que de deviner : c'est à l'agent de compléter, document à l'appui."],
              ["Les dossiers restent dans votre navigateur", "L'état des dossiers en cours, leur journal et leurs courriers sont conservés sur ce poste, dans ce navigateur. Un autre poste ne les voit pas, et vider les données du navigateur les efface. Une base partagée est prévue pour la suite."],
              ["GED et logiciel métier sont simulés", "Les lots, les dossiers, la recherche d'usager, l'enregistrement et le dépôt des pièces sont des simulations réalistes mais locales. Les numéros renvoyés ne sont pas réels."],
              ["Les règles sont un premier jeu", "Elles reflètent le CERFA, sa notice et les pratiques usuelles, pas encore celles des services instructeurs. Les seuils et délais sont modifiables."],
              ["Des appels réseau à chaque étape", "La lecture et l'extraction passent par un service en ligne. Une coupure d'accès à internet fait échouer la prise en charge ou l'extraction : il suffit de relancer une fois la connexion revenue."],
              ["Pas d'authentification ni de rôles", "Le prototype n'a pas de comptes ni de droits différenciés. Il ne doit pas être exposé avec des données réelles."],
            ].map(([titre, texte]) => (
              <li key={titre} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">{titre}</p>
                <p className="mt-1 text-sm text-slate-600">{texte}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="faq" titre="9. Questions fréquentes">
          <dl className="flex flex-col gap-4">
            {[
              ["Où commencer ?", "Module 1, la GED : c'est là qu'arrivent les dossiers. Une fois un dossier pris en charge, il vit dans le module 2, Dossiers, où se trouve votre bannette et les cinq étapes. Le module 3, Solis, montre où aboutissent les demandes."],
              ["Comment recommencer un dossier depuis le début ?", "Dans la GED, « Reprendre à zéro » relance la lecture et repart de l'étape 1 avec un nouveau numéro d'enregistrement. Dans la bannette, « Retirer du poste » enlève un dossier sans le retraiter."],
              ["Puis-je revenir à une étape précédente ?", "Oui. Le fil des étapes en haut du dossier permet de rouvrir toute étape déjà passée. Les corrections faites au contrôle des données recalculent automatiquement la recevabilité et les règles, même si vous sautez directement à la pré-instruction."],
              ["Pourquoi le bouton de validation du contrôle des données est-il grisé ?", "Il faut que toutes les pièces soient extraites, que chaque champ critique (★) soit coché « vérifié » ou corrigé, et que le rapprochement usager soit confirmé. Le texte sous le bouton indique ce qui manque."],
              ["Le rapprochement propose plusieurs usagers, lequel choisir ?", "Le candidat « numéro de sécurité sociale identique » est le plus sûr. « Nom et date de naissance identiques » demande de vérifier l'adresse et les demandes antérieures. Un « homonyme » n'est presque jamais la bonne personne. En cas de doute, « Nouvel usager » et signalez-le dans le commentaire."],
              ["Une extraction s'est terminée en erreur, que faire ?", "Ouvrez l'onglet de la pièce concernée et cliquez sur « Relancer l'extraction ». Si la prise en charge elle-même a échoué, le dossier a été retiré de la bannette : reprenez-le depuis la GED."],
              ["Combien de temps prend un dossier ?", "La lecture prend quelques secondes, l'extraction du formulaire une dizaine de secondes, les autres pièces deux à trois secondes chacune. Le reste dépend de l'agent : compter trois à six minutes pour un dossier de démonstration, vérification des champs critiques comprise."],
              ["Que devient une valeur que j'ai corrigée ?", "Elle prime sur la valeur lue pour toute la suite et reste marquée « corrigé » ; la valeur d'origine et la nouvelle sont consignées dans le journal. Vider la case revient à déclarer le champ non renseigné."],
              ["Pourquoi un dossier non recevable peut-il continuer ?", "Parce que la demande doit être enregistrée dès sa réception, avec le statut « en attente de pièces », et que la demande de pièces doit partir. Le délai d'instruction ne court qu'à partir du dossier complet."],
              ["L'outil donne-t-il un GIR ?", "Non, jamais. Il lit le certificat médical et le transmet avec le dossier, mais il ne note pas la perte d'autonomie : le GIR est déterminé par l'équipe médico-sociale lors de la visite à domicile."],
              ["Où voir le texte lu par la machine ?", "Au contrôle des données, « Voir le texte OCR » affiche le texte de la pièce affichée. Le banc d'essai, dans la barre du haut, permet aussi de tester n'importe quel PDF ou image."],
            ].map(([q, r]) => (
              <div key={q} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="font-semibold text-slate-900">{q}</dt>
                <dd className="mt-1 text-sm text-slate-600">{r}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="glossaire" titre="10. Glossaire">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            {[
              [MARQUE.nom, `L'outil que vous utilisez : ${MARQUE.accroche.toLowerCase()} de la ${MARQUE.collectivite}.`],
              ["Solis", "Le logiciel métier de l'action sociale, où sont gérés les usagers et leurs demandes. Destination du dossier, simulée par le module 3."],
              ["APA", "Allocation Personnalisée d'Autonomie, versée par le département aux personnes de 60 ans et plus en perte d'autonomie."],
              ["CERFA 16301*01", "Formulaire national de demande d'aides à l'autonomie à domicile : accompagnement des caisses de retraite ou APA."],
              ["GED", "Gestion électronique des documents : l'outil où arrivent les dossiers numérisés et où les pièces typées sont redéposées."],
              ["Bannette", "File des dossiers d'un poste de travail, avec leur statut."],
              ["OCR", "Reconnaissance optique de caractères : conversion d'une image de document en texte."],
              ["Vidéocodage", "Vérification des données extraites en regard de l'image du document."],
              ["Identitovigilance", "Ensemble des précautions pour rattacher une demande à la bonne personne : recherche par identifiant puis par état civil, confirmation humaine, gestion des homonymes."],
              ["NIR", "Numéro d'inscription au répertoire, dit numéro de sécurité sociale, 15 chiffres dont 2 de clé."],
              ["Date de dossier complet", "Date à laquelle toutes les pièces sont réunies ; point de départ du délai de décision."],
              ["EMS", "Équipe médico-sociale du département, qui évalue à domicile et établit le plan d'aide."],
              ["GIR", "Groupe iso-ressources, de 1 à 6, déterminé par l'équipe médico-sociale lors de la visite à domicile, jamais par l'outil. L'APA concerne les GIR 1 à 4."],
              ["CMI", "Carte mobilité inclusion, mentions stationnement, priorité ou invalidité."],
              ["MDPH", "Maison départementale des personnes handicapées, compétente pour la PCH."],
              ["PCH, ACTP, MTP, PCRTP", "Prestations liées au handicap ou à la tierce personne, non cumulables avec l'APA."],
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
            Entrer dans l&apos;outil
          </Link>
        </div>
      </div>
    </main>
  );
}
