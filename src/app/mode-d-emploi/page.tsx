import Link from "next/link";
import type { ReactNode } from "react";
import { SchemaFonctionnel, SchemaTechnique } from "@/components/schemas-outil";
import { DOSSIERS_FICTIFS, LOTS_GED } from "@/data/dossiers-fictifs";
import { ageA, parserDateFr } from "@/lib/dates";
import { LIBELLES_PIECES, TYPES_A_ECARTER, TYPES_EXTRAITS, type TypePiece } from "@/lib/decoupage";
import { MARQUE } from "@/lib/marque";
import { DESCRIPTIONS_STATUT_CHAMP, LIBELLES_STATUT_CHAMP, METHODE_ROBUSTESSE, SCHEMA_RAPPORT, VERSION_RAPPORT, type StatutChamp } from "@/lib/rapport/modele";
import {
  CATALOGUE_REGLES,
  DESCRIPTIONS_VERDICT,
  LIBELLES_FAMILLE,
  LIBELLES_STATUT_CONTROLE,
  LIBELLES_VERDICT,
  ORDRE_FAMILLES,
  type Verdict,
} from "@/lib/regles/conformite";
import { PARAMETRES } from "@/lib/regles/parametres";
import { DESCRIPTIONS_STATUT, LIBELLES_STATUT, type StatutDossier } from "@/lib/statuts";

export const metadata = {
  title: "Mode d'emploi — Solid'IA",
  description: "Présentation de l'outil, schémas d'ensemble, parcours d'un dossier de la GED à Solis, lecture des indicateurs, rapport de contrôle et architecture.",
};

const SOMMAIRE = [
  { id: "presentation", titre: "1. À quoi sert l'outil" },
  { id: "vue-ensemble", titre: "2. Vue d'ensemble" },
  { id: "organisation", titre: "3. Organisation de l'outil" },
  { id: "caracteristiques", titre: "4. Caractéristiques" },
  { id: "parcours", titre: "5. Le parcours pas à pas" },
  { id: "indicateurs", titre: "6. Lire les indicateurs" },
  { id: "regles", titre: "7. Les règles métier" },
  { id: "rapport", titre: "8. Le rapport de contrôle" },
  { id: "architecture", titre: "9. Architecture technique" },
  { id: "demonstration", titre: "10. Les dossiers de démonstration" },
  { id: "limites", titre: "11. Limites à connaître" },
  { id: "faq", titre: "12. Questions fréquentes" },
  { id: "glossaire", titre: "13. Glossaire" },
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

type Couleur = "vert" | "ambre" | "rouge" | "bleu" | "gris" | "ciel";

function Pastille({ couleur, children }: { couleur: Couleur; children: ReactNode }) {
  const classes = {
    vert: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ambre: "bg-amber-50 text-amber-800 border-amber-200",
    rouge: "bg-red-50 text-red-700 border-red-200",
    bleu: "bg-blue-50 text-blue-700 border-blue-200",
    gris: "bg-slate-100 text-slate-700 border-slate-200",
    ciel: "bg-sky-50 text-sky-700 border-sky-200",
  }[couleur];
  return <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}>{children}</span>;
}

const COULEUR_VERDICT: Record<Verdict, Couleur> = { conforme: "vert", conforme_sous_reserve: "ambre", non_conforme: "rouge" };
const COULEUR_CHAMP: Record<StatutChamp, Couleur> = { confirme: "vert", corrige: "bleu", lu: "gris", vide: "gris", douteux: "ambre", non_lu: "rouge" };
const COULEUR_STATUT: Record<StatutDossier, Couleur> = { recu: "gris", en_cours: "bleu", transmis_complet: "vert", transmis_incomplet: "ambre" };

type EtapeGuide = {
  numero: number;
  titre: string;
  chemin: string;
  objectif: string;
  ecran: string[];
  actions: string[];
  conseil?: string;
};

const ETAPES_GUIDE: EtapeGuide[] = [
  {
    numero: 1,
    titre: "GED : prise en charge",
    chemin: "/dossiers",
    objectif: "Choisir le dossier à traiter parmi les lots de numérisation, l'enregistrer et le faire lire.",
    ecran: [
      "En haut de « Traitement des dossiers », les lots de numérisation de la GED, avec leur date, leur origine et leur nombre de dossiers ; à droite, les dossiers du lot sélectionné.",
      "Un badge indique le statut du dossier s'il est déjà pris en charge sur ce poste, ainsi que son étape en cours.",
      "Le pli « Scénario de démonstration » décrit ce que le dossier est censé illustrer.",
      "Plus bas, la bannette du poste : les dossiers pris en charge, leur avancement et leur statut, filtrables.",
    ],
    actions: [
      "Cliquez sur « Prendre en charge et lire le dossier ». Le document est lu par l'OCR en quelques secondes, le dossier reçoit un numéro d'enregistrement et vous arrivez au déliassage.",
      "« Reprendre » rouvre un dossier déjà commencé à son étape courante. « Reprendre à zéro » relance la lecture, après confirmation : le travail en cours est effacé, mais seulement si la nouvelle lecture réussit.",
    ],
    conseil: "Commencez par le dossier D-2026-0301 (Jean DUPONT) : il est complet, ce qui permet de voir tout le parcours sans obstacle, y compris le rattachement à un usager déjà connu.",
  },
  {
    numero: 2,
    titre: "Déliassage",
    chemin: "/dossiers/<id>/decoupage",
    objectif: "Vérifier que chaque page a été rattachée à la bonne pièce (formulaire, certificat médical, pièce d'identité, RIB, avis d'imposition…) et que les pages inutiles sont écartées.",
    ecran: [
      "À gauche, le document numérisé, page par page.",
      "À droite, la structure détectée : chaque document avec ses pages, son type, un score de confiance et une mention « auto » ou « agent ».",
      "Les pages de la notice du CERFA, les mentions RGPD et les pages vides ou illisibles sont marquées « à écarter » : elles n'entrent pas dans le dossier transmis.",
      "« Détail des pages » montre, pour chaque page, la raison de sa classification et un aperçu de son texte.",
    ],
    actions: [
      "Si une pièce est mal typée, changez son type dans la liste déroulante. Le type peut aussi être changé page par page. Chaque changement est journalisé et repris dans le rapport.",
      "« Recalculer automatiquement » revient à la proposition initiale.",
      "« Valider le déliassage et extraire » enregistre la structure et lance l'extraction des champs.",
    ],
    conseil: "Le pied de page « cerfa 16301*01 » donne à l'outil le numéro officiel de chaque page du formulaire : c'est ce qui rend le déliassage fiable, même quand les pièces arrivent dans le désordre, et ce qui permet de vérifier que le formulaire est complet.",
  },
  {
    numero: 3,
    titre: "Contrôle des données",
    chemin: "/dossiers/<id>/extraction",
    objectif: "Relire les champs extraits de chaque pièce en regard du document, vérifier les champs critiques, compléter ce qui n'a pas été lu, puis rapprocher l'identité des usagers connus de Solis.",
    ecran: [
      "À gauche, le document ; à droite, un onglet par pièce et le tableau des champs : libellé, valeur (modifiable), score de confiance, case « vérifié », extrait du texte d'où vient la valeur. Cliquer sur une ligne affiche la page du document où se trouve le champ, y compris pour les trois pages du certificat médical.",
      "Les champs critiques portent une étoile : identité, date de naissance, numéro de sécurité sociale, questionnaire d'autonomie, mesure de protection, signature, validité de la pièce d'identité, IBAN, patient et date du certificat médical. Ils doivent être cochés « vérifié » ou corrigés.",
      "Les lignes non lues ou douteuses sont surlignées en ambre ; les lignes modifiées passent en bleu avec la mention « corrigé ».",
      "Sous le tableau, la carte « Rapprochement avec les usagers connus » présente les usagers de Solis correspondant à l'identité lue, du plus sûr (numéro de sécurité sociale identique) au moins sûr (homonyme), avec leurs demandes antérieures.",
    ],
    actions: [
      "Tapez directement dans une case pour corriger une valeur ; pour les champs à cases cochées, utilisez la liste déroulante.",
      "Cochez « vérifié » sur chaque champ critique après l'avoir comparé au document, ou utilisez « Marquer les critiques vérifiés » pour une pièce sûre.",
      "Dans le rapprochement, cliquez « C'est cet usager » pour rattacher la demande à un usager existant, ou « Nouvel usager » si aucun candidat ne correspond. Jamais de rattachement automatique.",
      "« Valider et passer à la complétude » n'est actif que lorsque toutes les pièces sont extraites, tous les champs critiques vérifiés et le rapprochement confirmé.",
    ],
    conseil: "Vos vérifications et corrections alimentent l'indice de robustesse du rapport : un champ vérifié compte comme une lecture exacte, un champ corrigé comme une lecture fausse.",
  },
  {
    numero: 4,
    titre: "Complétude et conformité",
    chemin: "/dossiers/<id>/conformite",
    objectif: "Appliquer le moteur de règles métier, savoir si le dossier est complet et cohérent, fixer la date de dossier complet et générer le rapport de contrôle.",
    ecran: [
      "Un bandeau donne le verdict : « complet et conforme », « complet, points d'attention » ou « incomplet ou non conforme », avec une phrase de synthèse.",
      "Les contrôles sont regroupés par gravité : bloquants, alertes, informations, conformes. Chacun indique sa famille de règles, ce qu'il a vérifié et ce qu'il a trouvé ; « Voir la règle » ouvre sa description dans un nouvel onglet.",
      "À droite : les dates (réception, accusé de réception à émettre, dossier complet), les pièces manquantes, les observations pour l'instruction et la liste des pièces.",
      "Après validation, la carte « Rapport de contrôle » affiche l'aperçu du PDF, son empreinte, et permet de le télécharger.",
    ],
    actions: [
      "Lisez les bloquants et les alertes. Si une alerte vient d'une mauvaise lecture, revenez au contrôle des données, corrigez, et le contrôle se recalcule.",
      "Notez dans « Observations pour l'instruction » ce que l'agent instructeur doit savoir : elles figurent en première page du rapport.",
      "« Valider et générer le rapport » fige le verdict et la date de dossier complet, construit le rapport et l'affiche. « Passer à l'enregistrement et la transmission » ouvre la dernière étape.",
    ],
    conseil: "Un dossier incomplet est transmis quand même : il part dans Solis au statut « incomplet », sans date de dossier complet, avec la liste des pièces manquantes. Les demandes de pièces sont émises depuis Solis.",
  },
  {
    numero: 5,
    titre: "Enregistrement et transmission",
    chemin: "/dossiers/<id>/export",
    objectif: "Enregistrer la demande dans Solis avec son rapport de contrôle, la rattacher à l'usager confirmé ou créer l'usager, et déposer les pièces typées dans la GED.",
    ecran: [
      "La carte « Usager » rappelle le rapprochement confirmé : usager connu (avec sa demande en cours le cas échéant) ou nouvel usager.",
      "La carte « Demande » résume ce qui part vers Solis : numéro d'enregistrement, dates, verdict, statut ; les métadonnées complètes sont consultables en JSON.",
      "La carte « Rapport de contrôle » et la carte « Retour vers la GED », où chaque pièce s'ouvre en PDF.",
    ],
    actions: [
      "Cliquez sur « Enregistrer dans Solis et transmettre ». Le retour affiche le numéro d'usager, le numéro de demande (créée, rattachée ou mise à jour), le statut et la référence du rapport déposé, dont l'empreinte est comparée à celle du rapport généré.",
      "« Voir la demande dans Solis » montre la demande sous la fiche de l'usager, avec son rapport.",
    ],
    conseil: "Si le dossier a été modifié après la génération du rapport, la transmission est bloquée : revenez à la complétude et régénérez le rapport.",
  },
];

export default function ModeDEmploi() {
  const piecesExtraites = TYPES_EXTRAITS.map((t) => LIBELLES_PIECES[t]);
  const piecesEcartees = TYPES_A_ECARTER.map((t) => LIBELLES_PIECES[t]);
  const autresPieces = (Object.keys(LIBELLES_PIECES) as TypePiece[]).filter((t) => !TYPES_EXTRAITS.includes(t) && !TYPES_A_ECARTER.includes(t)).map((t) => LIBELLES_PIECES[t]);
  const regles = Object.values(CATALOGUE_REGLES);

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
          <Link href="/dossiers" className="mt-4 block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-700">
            Traitement des dossiers
          </Link>
        </nav>
      </aside>

      <div className="flex flex-col gap-12">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Mode d&apos;emploi</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Prendre en main {MARQUE.nom}</h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Ce guide s&apos;adresse à un agent qui découvre l&apos;outil. Il décrit ce qu&apos;il fait, le montre en schémas, explique comment se
            déroule le traitement d&apos;un dossier de la GED à Solis, comment lire chaque indicateur et ce que contient le rapport de contrôle. Les
            règles métier ont leur propre page, pour être consultées rapidement. Comptez dix minutes de lecture.
          </p>
        </header>

        <Section id="presentation" titre="1. À quoi sert l'outil">
          <p className="text-slate-700">
            {MARQUE.nom} est l&apos;outil de traitement intelligent des dossiers des solidarités de la {MARQUE.collectivite}. Cette version traite
            les demandes d&apos;aide à l&apos;autonomie à domicile déposées avec le formulaire CERFA 16301*01. Un dossier arrive numérisé depuis la
            gestion électronique des documents : le formulaire, la pièce d&apos;identité, le relevé bancaire, l&apos;avis d&apos;imposition, parfois
            un certificat médical, le tout dans un seul document et pas toujours dans l&apos;ordre.
          </p>
          <p className="text-slate-700">
            L&apos;outil enregistre la réception, lit le document, le délie en pièces, en extrait les informations utiles, rapproche l&apos;usager
            des usagers connus, vérifie que le dossier est complet et cohérent, puis l&apos;enregistre dans Solis avec un rapport de contrôle. À
            chaque étape, l&apos;agent voit ce que l&apos;outil a compris, corrige et valide ; chaque action est journalisée.
          </p>
          <Encart titre="Ce que l'outil ne fait pas">
            Il n&apos;apprécie pas le droit à la prestation : ni condition d&apos;âge, ni organisme compétent, ni non-cumul, ni perte
            d&apos;autonomie (aucun GIR). Tout dossier contrôlé est transmis à Solis, complet ou non ; c&apos;est l&apos;agent instructeur qui
            décide, et qui refusera la demande si le droit n&apos;est pas ouvert. Dans cette version de démonstration, la GED et Solis sont
            simulés et tous les usagers sont fictifs.
          </Encart>
        </Section>

        <Section id="vue-ensemble" titre="2. Vue d'ensemble">
          <p className="text-slate-700">
            Le schéma ci-dessous montre l&apos;outil en entier : d&apos;où vient le dossier, ce qui se passe à chacune des cinq étapes (ce que fait
            l&apos;outil, ce que fait l&apos;agent, les services sollicités, ce qui en sort) et où il aboutit. L&apos;architecture technique est
            décrite en section 9. Les deux schémas sont aussi réunis, en pleine largeur, sur la page{" "}
            <Link href="/schema" className="font-medium text-blue-700 hover:underline">
              Schéma de l&apos;outil
            </Link>
            .
          </p>
          <SchemaFonctionnel />
        </Section>

        <Section id="organisation" titre="3. Organisation de l'outil">
          <p className="text-slate-700">
            La barre du haut propose, après l&apos;accueil, quatre entrées. Le logotype ramène aussi à l&apos;accueil ; la pastille à côté indique
            la version de l&apos;outil ({MARQUE.version}).
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Traitement des dossiers</p>
              <p className="flex-1 text-sm text-slate-600">
                Tout le parcours d&apos;un dossier, dans l&apos;ordre réel du travail : la GED où l&apos;on prend en charge le dossier, le déliassage,
                le contrôle des données, la complétude et la conformité, l&apos;enregistrement et la transmission vers Solis. La page présente la GED
                puis la bannette du poste.
              </p>
              <Link href="/dossiers" className="text-sm font-semibold text-blue-700 hover:underline">
                Ouvrir →
              </Link>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Schéma de l&apos;outil</p>
              <p className="flex-1 text-sm text-slate-600">
                L&apos;outil en une page : le parcours d&apos;un dossier de la GED à Solis, avec pour chaque étape ce que font l&apos;outil et
                l&apos;agent, puis l&apos;architecture technique. Le meilleur point de départ pour présenter l&apos;outil.
              </p>
              <Link href="/schema" className="text-sm font-semibold text-blue-700 hover:underline">
                Ouvrir →
              </Link>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Règles métier</p>
              <p className="flex-1 text-sm text-slate-600">
                Le catalogue des {regles.length} règles de complétude et de conformité, consultable rapidement : recherche, filtres par famille et
                par issue, paramètres, et ce que le moteur ne vérifie pas. Chaque contrôle d&apos;un dossier renvoie à sa règle.
              </p>
              <Link href="/regles" className="text-sm font-semibold text-blue-700 hover:underline">
                Ouvrir →
              </Link>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Mode d&apos;emploi</p>
              <p className="flex-1 text-sm text-slate-600">
                Ce guide : vue d&apos;ensemble, parcours pas à pas, lecture des indicateurs, rapport de contrôle, architecture technique, dossiers
                de démonstration et questions fréquentes.
              </p>
            </div>
          </div>
          <Encart teinte="vert" titre="Ne pas confondre Solid'IA et Solis">
            {MARQUE.nom} est l&apos;outil que vous utilisez. Solis est le logiciel métier de l&apos;action sociale, où les usagers et leurs demandes
            sont enregistrés et instruits : c&apos;est la destination du dossier. Sa simulation se consulte depuis la bannette ou la dernière étape
            (« Voir la demande dans Solis »). Le banc d&apos;essai OCR, en pied de page, permet de tester la lecture de n&apos;importe quel PDF.
          </Encart>
        </Section>

        <Section id="caracteristiques" titre="4. Caractéristiques">
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["Enregistrement à la réception", "Chaque dossier pris en charge reçoit un numéro d'enregistrement et un statut qui évolue : reçu, en cours de contrôle, transmis complet ou transmis incomplet."],
              ["Lecture automatique", "Chaque page est convertie en texte structuré par un moteur de reconnaissance de documents, tableaux et cases cochées compris. Une dizaine de pages prend quelques secondes."],
              ["Déliassage par règles", "Le numéro officiel de chaque page du CERFA est lu dans son pied de page ; les autres pièces sont reconnues à leurs intitulés ; les pages vides sont écartées. Les règles sont déterministes et expliquées."],
              ["Extraction structurée et vidéocodage", "Pour chaque type de pièce, un schéma de champs est extrait du texte, avec pour chaque champ une valeur, un score de confiance et l'extrait d'origine. Les champs s'affichent en regard du document ; les champs critiques exigent une vérification explicite."],
              ["Vérifications déterministes", "Les identifiants à clé de contrôle (sécurité sociale, IBAN) sont relus dans le texte et vérifiés ; une case cochée invisible à la lecture est déduite quand les cases voisines sont visibles vides ; une case inventée par le modèle est démasquée."],
              ["Rapprochement d'identité", "L'identité lue est confrontée aux usagers connus, par numéro de sécurité sociale puis par état civil, homonymes compris. L'agent confirme ; une demande déjà en cours est signalée pour éviter les doublons."],
              ["Moteur de règles métier", `${regles.length} règles de complétude et de conformité, regroupées en ${ORDRE_FAMILLES.length} familles, déclarées dans un catalogue unique, consultable sur la page Règles métier et repris dans le rapport.`],
              ["Rapport de contrôle", "Un PDF structuré, avec sa version JSON jointe : robustesse de la lecture globale et par page, détail du déliassage, champs contrôlés, règles appliquées, traçabilité. Il part dans Solis avec le dossier."],
              ["Enregistrement, transmission, retour GED", "Création ou rattachement de l'usager, création ou mise à jour de la demande avec son statut et son rapport, dépôt des pièces typées dans la GED sous l'usager."],
              ["Journal des actions", "Prise en charge, déliassage, corrections avec valeur avant et après, vérifications, rapprochement, complétude, rapport, enregistrement : tout est horodaté et consultable depuis le bandeau du dossier."],
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
              <p className="text-sm font-semibold text-slate-900">Pages écartées au déliassage</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {piecesEcartees.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section id="parcours" titre="5. Le parcours pas à pas">
          <p className="text-slate-700">
            Un dossier suit cinq étapes, de la GED à Solis. Le fil des étapes en haut de chaque dossier montre où vous en êtes ; les étapes déjà
            passées restent accessibles. Le journal des actions se déplie sous le fil.
          </p>
          <ol className="flex flex-col gap-6">
            {ETAPES_GUIDE.map((e) => (
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

        <Section id="indicateurs" titre="6. Lire les indicateurs">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Scores de confiance et vérification</p>
              <p className="mt-1 text-sm text-slate-600">Sur les pièces au déliassage et sur chaque champ au contrôle des données.</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Pastille couleur="vert">{Math.round(PARAMETRES.seuilConfianceSure * 100)} % et plus</Pastille> lecture sûre, à survoler.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="ambre">
                    {Math.round(PARAMETRES.seuilConfianceDouteuse * 100)} à {Math.round(PARAMETRES.seuilConfianceSure * 100) - 1} %
                  </Pastille>{" "}
                  lecture partielle ou déduite, à vérifier.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="rouge">moins de {Math.round(PARAMETRES.seuilConfianceDouteuse * 100)} %</Pastille> lecture douteuse, à contrôler dans le document.
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
              <p className="font-semibold text-slate-900">Statuts des contrôles</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Pastille couleur="rouge">{LIBELLES_STATUT_CONTROLE.bloquant}</Pastille> rend le dossier incomplet ou non conforme.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="ambre">{LIBELLES_STATUT_CONTROLE.alerte}</Pastille> point d&apos;attention signalé à l&apos;instruction.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="ciel">{LIBELLES_STATUT_CONTROLE.info}</Pastille> utile à l&apos;instruction, sans effet sur la complétude.
                </li>
                <li className="flex items-center gap-2">
                  <Pastille couleur="vert">{LIBELLES_STATUT_CONTROLE.ok}</Pastille> contrôle passé.
                </li>
              </ul>
              <p className="mt-4 font-semibold text-slate-900">Verdict de complétude et conformité</p>
              <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-700">
                {(Object.keys(LIBELLES_VERDICT) as Verdict[]).map((v) => (
                  <li key={v} className="flex items-start gap-2">
                    <Pastille couleur={COULEUR_VERDICT[v]}>{LIBELLES_VERDICT[v]}</Pastille>
                    <span>{DESCRIPTIONS_VERDICT[v]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Indice de robustesse de la lecture</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
                {METHODE_ROBUSTESSE.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <p className="mt-3 font-semibold text-slate-900">États d&apos;un champ dans le rapport</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-700">
                {(Object.keys(LIBELLES_STATUT_CHAMP) as StatutChamp[]).map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <Pastille couleur={COULEUR_CHAMP[s]}>{LIBELLES_STATUT_CHAMP[s]}</Pastille>
                    <span>{DESCRIPTIONS_STATUT_CHAMP[s]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">Les statuts du dossier</p>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                {(Object.keys(LIBELLES_STATUT) as StatutDossier[]).map((s) => (
                  <div key={s} className="flex items-start gap-2">
                    <dt>
                      <Pastille couleur={COULEUR_STATUT[s]}>{LIBELLES_STATUT[s]}</Pastille>
                    </dt>
                    <dd className="text-slate-600">{DESCRIPTIONS_STATUT[s]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Section>

        <Section id="regles" titre="7. Les règles métier">
          <p className="text-slate-700">
            L&apos;étape « Complétude et conformité » applique {regles.length} règles métier, regroupées en {ORDRE_FAMILLES.length} familles. Elles
            disent si le dossier est complet et cohérent ; elles n&apos;apprécient pas le droit à la prestation. Le détail de chaque règle (ce
            qu&apos;elle vérifie, ses issues possibles), les paramètres et ce que le moteur ne vérifie pas se consultent sur une page dédiée, avec
            recherche et filtres. À l&apos;étape 4, chaque contrôle d&apos;un dossier renvoie directement à sa règle.
          </p>
          <div className="flex flex-wrap gap-2">
            {ORDRE_FAMILLES.map((f) => (
              <a
                key={f}
                href={`/regles#famille-${f}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {LIBELLES_FAMILLE[f]}
                <span className="text-xs text-slate-500">{regles.filter((r) => r.famille === f).length}</span>
              </a>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/regles" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
              Consulter les règles métier
            </Link>
          </div>
          <Encart teinte="ambre" titre="Un premier jeu de règles">
            Les règles sont issues du CERFA 16301*01, de sa notice et des pratiques usuelles de gestion de dossiers. Elles constituent une base de
            travail à affiner avec les services instructeurs ; les seuils et délais sont regroupés dans un fichier de paramètres.
          </Encart>
        </Section>

        <Section id="rapport" titre="8. Le rapport de contrôle">
          <p className="text-slate-700">
            Le rapport est généré à la validation de l&apos;étape « Complétude et conformité » et transmis à Solis avec le dossier. C&apos;est
            d&apos;abord une donnée structurée (schéma <code className="rounded bg-slate-100 px-1 text-xs">{SCHEMA_RAPPORT}</code>, version {VERSION_RAPPORT}),
            mise en page en PDF ; le PDF embarque cette donnée en pièce jointe, lisible par le logiciel métier sans ressaisie.
          </p>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              ["Première page", "Identification du dossier et de l'usager, rapprochement Solis, verdict et date de dossier complet, indicateurs clés, points à signaler à l'instruction, pièces manquantes, observations de l'agent."],
              ["1. Robustesse de la lecture", "Moteur, durée, confiance du typage ; indice global et décompte des champs ; tableau de chaque page avec son type, son nombre de caractères lus, ses champs non lus ou corrigés et son indice ; méthode de calcul."],
              ["2. Déliassage", "Documents identifiés avec leurs pages, leur confiance, leur origine (outil ou agent) et leur traitement ; motif de reconnaissance de chaque page ; interventions de l'agent."],
              ["3. Contrôle des données", "Pour chaque pièce, tous les champs : valeur retenue, confiance, état (vérifié, corrigé, lu, vide, douteux, non lu) et page ; champs critiques marqués ; corrections avec valeur lue et valeur retenue."],
              ["4. Complétude et conformité", "Verdict, dates, et chaque contrôle du moteur de règles par famille, avec son statut et son constat."],
              ["5. Traçabilité", "Journal horodaté des actions, de la prise en charge à la génération du rapport, et description des données structurées jointes."],
            ].map(([titre, texte]) => (
              <li key={titre} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">{titre}</p>
                <p className="mt-1 text-sm text-slate-600">{texte}</p>
              </li>
            ))}
          </ol>
          <Encart titre="Intégrité du rapport">
            Un même rapport produit toujours le même PDF, octet pour octet : son empreinte SHA-256 est affichée à la génération et comparée à celle
            du document déposé dans Solis. Si le dossier est modifié après la génération (correction, vérification, déliassage, observations), le
            rapport est signalé comme périmé et la transmission est bloquée jusqu&apos;à sa régénération.
          </Encart>
        </Section>

        <Section id="architecture" titre="9. Architecture technique">
          <p className="text-slate-700">
            Où s&apos;exécute chaque traitement et quels échanges circulent entre le poste de l&apos;agent, le serveur de l&apos;outil et les
            services. C&apos;est la base d&apos;architecture d&apos;une solution réelle : la GED et Solis seraient remplacés par leurs connecteurs,
            et l&apos;état des dossiers, aujourd&apos;hui conservé dans le navigateur, par une base partagée.
          </p>
          <SchemaTechnique />
        </Section>

        <Section id="demonstration" titre="10. Les dossiers de démonstration">
          <p className="text-slate-700">
            Six dossiers fictifs, répartis dans {LOTS_GED.filter((l) => DOSSIERS_FICTIFS.some((d) => d.lotId === l.id)).length} lots, ont été
            fabriqués à partir du CERFA officiel puis numérisés. Chacun illustre une situation que le contrôle rencontre. Aucune de ces personnes
            n&apos;existe.
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

        <Section id="limites" titre="11. Limites à connaître">
          <ul className="flex flex-col gap-3">
            {[
              ["La lecture automatique n'est pas parfaite, ni toujours identique", "Certaines cases cochées ne sont pas vues, et la lecture d'un même document peut varier d'un jour à l'autre. Quand aucune case n'est visible, l'outil déclare le champ « non lu » plutôt que de deviner : c'est à l'agent de compléter, document à l'appui. L'indice de robustesse du rapport en rend compte."],
              ["L'indice de robustesse est une mesure indirecte", "Le moteur de lecture ne donne pas de confiance par caractère : l'indice repose sur la confiance de l'extraction et sur les vérifications de l'agent. Une page sans champ extrait n'a pas d'indice."],
              ["Les dossiers restent dans votre navigateur", "L'état des dossiers en cours, leur journal et leur rapport sont conservés sur ce poste, dans ce navigateur. Un autre poste ne les voit pas, et vider les données du navigateur les efface. Une base partagée est prévue pour la suite."],
              ["GED et logiciel métier sont simulés", "Les lots, les dossiers, la recherche d'usager, l'enregistrement et le dépôt des pièces sont des simulations réalistes mais locales. Les numéros renvoyés ne sont pas réels."],
              ["Les règles sont un premier jeu", "Elles reflètent le CERFA, sa notice et les pratiques usuelles, pas encore celles des services instructeurs. Les seuils et délais sont modifiables."],
              ["Des appels réseau à chaque étape", "La lecture et l'extraction passent par un service en ligne. Une coupure d'accès à internet fait échouer la prise en charge ou l'extraction : il suffit de relancer une fois la connexion revenue."],
              ["Pas de comptes ni de rôles", "Le prototype est protégé par un mot de passe unique, sans comptes ni droits différenciés. Il ne doit pas être utilisé avec des données réelles."],
            ].map(([titre, texte]) => (
              <li key={titre} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-slate-900">{titre}</p>
                <p className="mt-1 text-sm text-slate-600">{texte}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="faq" titre="12. Questions fréquentes">
          <dl className="flex flex-col gap-4">
            {[
              ["Où commencer ?", "« Traitement des dossiers », dans la barre du haut : la GED est en haut de la page, la bannette en dessous. Une fois un dossier pris en charge, ses étapes s'ouvrent l'une après l'autre jusqu'à la transmission dans Solis."],
              ["Pourquoi l'outil ne dit-il pas si l'usager a droit à l'APA ?", "Parce que ce n'est pas son rôle : l'appréciation du droit (âge, organisme compétent, non-cumul, perte d'autonomie) appartient à l'agent instructeur, dans Solis. L'outil garantit que le dossier qui arrive est lu, contrôlé, complet ou signalé incomplet, et documenté par son rapport."],
              ["Un dossier incomplet part-il dans Solis ?", "Oui. Il est enregistré au statut « transmis à Solis, incomplet », sans date de dossier complet, avec la liste des pièces manquantes dans le rapport. Les demandes de pièces sont émises depuis Solis."],
              ["Comment recommencer un dossier depuis le début ?", "Dans la GED, « Reprendre à zéro » relance la lecture et repart du déliassage avec un nouveau numéro d'enregistrement, après confirmation. Dans la bannette, « Retirer du poste » enlève un dossier, après confirmation."],
              ["Puis-je revenir à une étape précédente ?", "Oui. Le fil des étapes en haut du dossier permet de rouvrir toute étape déjà passée. Une modification après la génération du rapport le rend périmé : il faut le régénérer à l'étape « Complétude et conformité » avant de transmettre."],
              ["Pourquoi le bouton de validation du contrôle des données est-il grisé ?", "Il faut que toutes les pièces soient extraites, que chaque champ critique (★) soit coché « vérifié » ou corrigé, et que le rapprochement usager soit confirmé. Le texte sous le bouton indique ce qui manque."],
              ["Le rapprochement propose plusieurs usagers, lequel choisir ?", "Le candidat « numéro de sécurité sociale identique » est le plus sûr. « Nom et date de naissance identiques » demande de vérifier l'adresse et les demandes antérieures. Un « homonyme » n'est presque jamais la bonne personne. En cas de doute, « Nouvel usager », et signalez-le dans les observations."],
              ["Une extraction s'est terminée en erreur, que faire ?", "Ouvrez l'onglet de la pièce concernée et cliquez sur « Relancer l'extraction ». Si la prise en charge elle-même a échoué, rien n'a été modifié sur le poste : relancez-la depuis la GED."],
              ["Que devient une valeur que j'ai corrigée ?", "Elle prime sur la valeur lue pour toute la suite et reste marquée « corrigé » ; la valeur d'origine et la nouvelle sont consignées dans le journal et dans le rapport. Vider la case revient à déclarer le champ non renseigné."],
              ["Où trouver le rapport d'un dossier transmis ?", "À l'étape « Enregistrement et transmission » du dossier, ou dans Solis, sous la fiche de l'usager, sur la ligne de la demande."],
              ["L'outil donne-t-il un GIR ?", "Non, jamais. Il lit le certificat médical et le transmet avec le dossier, mais il ne note pas la perte d'autonomie : le GIR est déterminé par l'équipe médico-sociale lors de la visite à domicile."],
            ].map(([q, r]) => (
              <div key={q} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="font-semibold text-slate-900">{q}</dt>
                <dd className="mt-1 text-sm text-slate-600">{r}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="glossaire" titre="13. Glossaire">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            {[
              [MARQUE.nom, `L'outil que vous utilisez : ${MARQUE.accroche.toLowerCase()} de la ${MARQUE.collectivite}.`],
              ["Solis", "Le logiciel métier de l'action sociale, où sont gérés les usagers et leurs demandes, et où les demandes sont instruites. Destination du dossier."],
              ["APA", "Allocation Personnalisée d'Autonomie, versée par le département aux personnes de 60 ans et plus en perte d'autonomie."],
              ["CERFA 16301*01", "Formulaire national de demande d'aides à l'autonomie à domicile : accompagnement des caisses de retraite ou APA."],
              ["GED", "Gestion électronique des documents : l'outil où arrivent les dossiers numérisés et où les pièces typées sont redéposées."],
              ["Déliassage", "Séparation d'un envoi numérisé en pièces distinctes, chacune typée, et mise à l'écart des pages inutiles."],
              ["Bannette", "File des dossiers pris en charge sur un poste de travail, avec leur avancement et leur statut."],
              ["OCR", "Reconnaissance optique de caractères : conversion d'une image de document en texte."],
              ["Vidéocodage", "Vérification des données extraites en regard de l'image du document."],
              ["Identitovigilance", "Ensemble des précautions pour rattacher une demande à la bonne personne : recherche par identifiant puis par état civil, confirmation humaine, gestion des homonymes."],
              ["Moteur de règles métier", "Catalogue des règles de complétude et de conformité appliquées au dossier, avec leurs issues possibles ; consultable sur la page Règles métier."],
              ["Rapport de contrôle", "Document structuré (PDF et JSON joint) qui rend compte de la lecture, du déliassage, du contrôle des données et de la complétude d'un dossier ; transmis à Solis."],
              ["Indice de robustesse", "Mesure de 0 à 100 de la fiabilité de la lecture d'une page ou du dossier, calculée sur les champs extraits et les vérifications de l'agent."],
              ["Empreinte SHA-256", "Identifiant calculé à partir du contenu exact d'un fichier : deux fichiers de même empreinte sont identiques."],
              ["NIR", "Numéro d'inscription au répertoire, dit numéro de sécurité sociale, 15 chiffres dont 2 de clé."],
              ["Date de dossier complet", "Date à laquelle toutes les pièces sont réunies ; point de départ du délai d'instruction."],
              ["EMS", "Équipe médico-sociale du département, qui évalue à domicile et établit le plan d'aide, à l'instruction."],
              ["GIR", "Groupe iso-ressources, de 1 à 6, déterminé par l'équipe médico-sociale lors de la visite à domicile, jamais par l'outil."],
              ["CMI", "Carte mobilité inclusion, mentions stationnement, priorité ou invalidité."],
              ["PCH, ACTP, MTP, PCRTP", "Prestations liées au handicap ou à la tierce personne, déclarées en partie 5 du formulaire et transmises telles quelles."],
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
          <Link href="/dossiers" className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            Traitement des dossiers
          </Link>
        </div>
      </div>
    </main>
  );
}
