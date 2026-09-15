import { ajouterJours, ajouterMois, formaterDateFr, parserDateFr } from "@/lib/dates";
import { PARAMETRES } from "@/lib/regles/parametres";

/**
 * Courriers types générés au cours de la pré-instruction. Textes de
 * démonstration, à remplacer par les modèles de la collectivité.
 */

export type TypeCourrier = "accuse_reception" | "demande_pieces" | "transmission_caisse" | "orientation_mdph";

export const LIBELLES_COURRIER: Record<TypeCourrier, string> = {
  accuse_reception: "Accusé de réception de dossier complet",
  demande_pieces: "Demande de pièces manquantes",
  transmission_caisse: "Information de transmission à la caisse de retraite",
  orientation_mdph: "Information d'orientation vers la MDPH",
};

export type ContexteCourrier = {
  civilite: string | null;
  nomUsager: string | null;
  adresse?: string | null;
  numeroEnregistrement: string;
  dateReception: string;
  dateCompletude?: string;
};

const ENTETE = "Service Autonomie du Département\nPôle accueil et pré-instruction des demandes d'aide à l'autonomie";

function formule(ctx: ContexteCourrier): string {
  const civ = ctx.civilite ?? "Madame, Monsieur";
  return `${civ}${ctx.nomUsager ? ` ${ctx.nomUsager}` : ""},`;
}

function signature(): string {
  return "Le service Autonomie";
}

function dateDuJour(): string {
  return formaterDateFr(new Date());
}

/** Date limite de décision : dossier complet + délai réglementaire. */
export function dateLimiteDecision(dateCompletude: string): string | null {
  const d = parserDateFr(dateCompletude);
  return d ? formaterDateFr(ajouterMois(d, PARAMETRES.moisDecision)) : null;
}

/** Date limite pour accuser réception ou réclamer les pièces. */
export function dateLimiteAccuseReception(dateReception: string): string | null {
  const d = parserDateFr(dateReception);
  return d ? formaterDateFr(ajouterJours(d, PARAMETRES.joursAccuseReception)) : null;
}

export function courrierAccuseReception(ctx: ContexteCourrier): string {
  const completude = ctx.dateCompletude ?? ctx.dateReception;
  const limite = dateLimiteDecision(completude);
  return `${ENTETE}

Objet : accusé de réception de votre demande d'allocation personnalisée d'autonomie
Référence : ${ctx.numeroEnregistrement}
Le ${dateDuJour()}

${formule(ctx)}

Nous avons bien reçu le ${ctx.dateReception} votre demande d'allocation personnalisée d'autonomie à domicile. Votre dossier est complet à la date du ${completude}.

Il est transmis à l'équipe médico-sociale du Département, qui prendra contact avec vous pour organiser une visite à votre domicile afin d'évaluer vos besoins. La décision vous sera notifiée au plus tard le ${limite ?? "…"}.

Nous vous prions d'agréer, ${ctx.civilite ?? "Madame, Monsieur"}, l'expression de nos salutations distinguées.

${signature()}`;
}

export function courrierDemandePieces(ctx: ContexteCourrier, piecesManquantes: string[]): string {
  const lignes = piecesManquantes.map((p) => `  - ${p}`).join("\n");
  const d = parserDateFr(dateDuJour());
  const limite = d ? formaterDateFr(ajouterJours(d, PARAMETRES.joursReponsePieces)) : "…";
  return `${ENTETE}

Objet : votre demande d'allocation personnalisée d'autonomie, pièces manquantes
Référence : ${ctx.numeroEnregistrement}
Le ${dateDuJour()}

${formule(ctx)}

Nous avons bien reçu le ${ctx.dateReception} votre demande d'allocation personnalisée d'autonomie à domicile. Pour pouvoir l'instruire, nous avons besoin des pièces suivantes :

${lignes}

Nous vous remercions de nous les transmettre avant le ${limite}. Votre dossier sera considéré comme complet à la réception de ces pièces ; c'est à partir de cette date que court le délai d'instruction. Sans réponse de votre part, votre demande ne pourra pas être examinée.

Nous vous prions d'agréer, ${ctx.civilite ?? "Madame, Monsieur"}, l'expression de nos salutations distinguées.

${signature()}`;
}

export function courrierTransmissionCaisse(ctx: ContexteCourrier, caisse: string): string {
  return `${ENTETE}

Objet : transmission de votre demande d'aide à l'autonomie à votre caisse de retraite
Référence : ${ctx.numeroEnregistrement}
Le ${dateDuJour()}

${formule(ctx)}

Nous avons bien reçu le ${ctx.dateReception} votre demande d'aides à l'autonomie à domicile. Au vu des réponses apportées au questionnaire du formulaire (partie 4), votre demande relève de l'accompagnement à domicile mis en place par ${caisse}, et non de l'allocation personnalisée d'autonomie versée par le Département.

Nous avons transmis ce jour votre dossier complet à cet organisme, qui vous contactera directement. Vous n'avez aucune démarche supplémentaire à effectuer.

Nous vous prions d'agréer, ${ctx.civilite ?? "Madame, Monsieur"}, l'expression de nos salutations distinguées.

${signature()}`;
}

export function courrierOrientationMdph(ctx: ContexteCourrier): string {
  return `${ENTETE}

Objet : votre demande d'aide à l'autonomie
Référence : ${ctx.numeroEnregistrement}
Le ${dateDuJour()}

${formule(ctx)}

Nous avons bien reçu le ${ctx.dateReception} votre demande d'aides à l'autonomie à domicile. L'allocation personnalisée d'autonomie est réservée aux personnes âgées de ${PARAMETRES.ageMinimumApa} ans et plus ; votre demande ne peut donc pas être instruite à ce titre.

Votre situation peut relever de la prestation de compensation du handicap (PCH). Nous vous invitons à déposer une demande auprès de la Maison départementale des personnes handicapées (MDPH) de votre lieu de résidence, à l'aide du formulaire Cerfa n° 15692*01. Les pièces que vous nous avez transmises vous sont retournées.

Nous vous prions d'agréer, ${ctx.civilite ?? "Madame, Monsieur"}, l'expression de nos salutations distinguées.

${signature()}`;
}
