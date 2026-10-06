import type { DossierSolis, UsagerSolis } from "@/data/solis";
import { LIBELLES_PIECES, type Piece, type TypePiece } from "@/lib/decoupage";
import { ajouterAnnees, formaterDateFr, moisEntre, parserDateFr } from "@/lib/dates";
import { ibanValide, nirValide } from "@/lib/identifiants";
import { PARAMETRES } from "./parametres";

/**
 * Phase 2 : complétude des pièces, cohérence et pré-recevabilité.
 *
 * Les règles ci-dessous sont un premier jeu, à affiner avec l'expertise
 * métier. Chaque contrôle est expliqué pour que l'agent comprenne le verdict.
 */

export type StatutControle = "ok" | "info" | "alerte" | "bloquant" | "non_applicable";

export type Controle = {
  id: string;
  libelle: string;
  statut: StatutControle;
  detail: string;
  piece?: TypePiece;
};

export type Recevabilite = "recevable" | "recevable_sous_reserve" | "non_recevable";

export type ResultatConformite = {
  controles: Controle[];
  recevabilite: Recevabilite;
  piecesManquantes: string[];
  synthese: string;
  calculeLe: string;
};

export type Lecteur = (type: TypePiece, chemin: string) => string | null;

export type EntreeConformite = {
  pieces: Piece[];
  lire: Lecteur;
  dateReception: string;
  /** Numéros officiels (5 à 9) des pages du formulaire présentes, doublons compris. */
  pagesCerfa?: number[];
  /** Résultat du rapprochement d'identité avec le logiciel métier. */
  rapprochement?: {
    confirme: boolean;
    usager: UsagerSolis | null;
    demandeEnCours: DossierSolis | null;
  };
};

export const LIBELLES_RECEVABILITE: Record<Recevabilite, string> = {
  recevable: "Dossier recevable",
  recevable_sous_reserve: "Dossier recevable sous réserve",
  non_recevable: "Dossier non recevable",
};

const PAGES_FORMULAIRE = [5, 6, 7, 8, 9];

function normaliser(v: string | null): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/** Adresse réduite aux lettres et chiffres, pour comparaison. */
function normaliserAdresse(v: string | null): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function premierPrenom(v: string | null): string {
  return normaliser((v ?? "").split(/[\s,-]+/)[0] ?? "");
}

function contientNom(texte: string | null, ...noms: Array<string | null>): boolean {
  const t = normaliser(texte);
  return noms.some((n) => n && normaliser(n).length >= 3 && t.includes(normaliser(n)));
}

export function evaluerConformite(entree: EntreeConformite): ResultatConformite {
  const { pieces, lire, dateReception, pagesCerfa, rapprochement } = entree;
  const controles: Controle[] = [];
  const piecesManquantes: string[] = [];
  const reception = parserDateFr(dateReception) ?? new Date();
  const present = (type: TypePiece) => pieces.some((p) => p.type === type);
  const ajouter = (c: Controle) => controles.push(c);

  // --- Présence des pièces obligatoires ---------------------------------
  const obligatoires: Array<{ type: TypePiece; libelle: string }> = [
    { type: "cerfa_formulaire", libelle: "Formulaire de demande (CERFA 16301*01)" },
    { type: "cni", libelle: "Justificatif d'identité" },
    { type: "rib", libelle: "Relevé d'identité bancaire au nom du demandeur" },
    { type: "avis_imposition", libelle: "Dernier avis d'imposition ou de non-imposition" },
  ];
  for (const o of obligatoires) {
    if (present(o.type)) {
      ajouter({ id: `presence-${o.type}`, libelle: o.libelle, statut: "ok", detail: "Pièce présente.", piece: o.type });
    } else {
      piecesManquantes.push(o.libelle);
      ajouter({ id: `presence-${o.type}`, libelle: o.libelle, statut: "bloquant", detail: "Pièce obligatoire absente du dossier.", piece: o.type });
    }
  }

  // --- Formulaire complet, sans doublon, un seul demandeur ----------------
  if (present("cerfa_formulaire") && pagesCerfa) {
    const manquantes = PAGES_FORMULAIRE.filter((n) => !pagesCerfa.includes(n));
    const doublons = PAGES_FORMULAIRE.filter((n) => pagesCerfa.filter((p) => p === n).length > 1);
    if (manquantes.length) {
      piecesManquantes.push(`Page(s) ${manquantes.join(", ")} du formulaire de demande`);
      ajouter({ id: "formulaire-complet", libelle: "Formulaire complet (pages 5 à 9)", statut: "bloquant", detail: `Page(s) manquante(s) : ${manquantes.join(", ")}. Le formulaire doit être fourni en entier${manquantes.includes(9) ? ", y compris la page de signature" : ""}.`, piece: "cerfa_formulaire" });
    } else {
      ajouter({ id: "formulaire-complet", libelle: "Formulaire complet (pages 5 à 9)", statut: "ok", detail: "Les cinq pages du formulaire sont présentes.", piece: "cerfa_formulaire" });
    }
    if (doublons.length) {
      ajouter({ id: "formulaire-doublons", libelle: "Pages en double", statut: "alerte", detail: `Page(s) ${doublons.join(", ")} présente(s) plusieurs fois : page numérisée deux fois, ou second formulaire (un dossier par demandeur pour un couple). Vérifier au typage des pièces.`, piece: "cerfa_formulaire" });
    }
  }
  const nbFormulaires = pieces.filter((p) => p.type === "cerfa_formulaire").length;
  if (nbFormulaires > 1) {
    ajouter({ id: "formulaire-multiple", libelle: "Plusieurs formulaires détectés", statut: "alerte", detail: `${nbFormulaires} formulaires distincts dans le même envoi. Si les deux membres d'un couple font une demande, ouvrir un dossier par demandeur.`, piece: "cerfa_formulaire" });
  }

  // --- Signature -----------------------------------------------------------
  const statutProtection = lire("cerfa_formulaire", "protection.statut");
  const qualiteSignature = lire("cerfa_formulaire", "signature.qualite");
  const signataire = lire("cerfa_formulaire", "signature.nom") ?? lire("cerfa_formulaire", "signature.prenoms");
  const dateSignature = parserDateFr(lire("cerfa_formulaire", "signature.date"));
  if (present("cerfa_formulaire") && (!pagesCerfa || pagesCerfa.includes(9))) {
    if (!signataire && !dateSignature) {
      ajouter({ id: "signature-presence", libelle: "Formulaire signé et daté", statut: "alerte", detail: "Ni nom du signataire ni date de signature lus : vérifier que la page 9 est signée. Un formulaire non signé est à retourner à l'usager.", piece: "cerfa_formulaire" });
    } else if (!dateSignature) {
      ajouter({ id: "signature-presence", libelle: "Formulaire signé et daté", statut: "alerte", detail: `Signataire : ${signataire}. Date de signature non lue.`, piece: "cerfa_formulaire" });
    } else if (dateSignature.getTime() > reception.getTime()) {
      ajouter({ id: "signature-presence", libelle: "Formulaire signé et daté", statut: "alerte", detail: `Date de signature (${formaterDateFr(dateSignature)}) postérieure à la réception : probable erreur de lecture.`, piece: "cerfa_formulaire" });
    } else {
      ajouter({ id: "signature-presence", libelle: "Formulaire signé et daté", statut: "ok", detail: `Signé par ${signataire ?? "le demandeur"} le ${formaterDateFr(dateSignature)}.`, piece: "cerfa_formulaire" });
    }
  }

  if (qualiteSignature === "representant_legal" && statutProtection !== "prononcee") {
    ajouter({ id: "signature-qualite", libelle: "Qualité du signataire", statut: "alerte", detail: "Signé par un représentant légal alors qu'aucune mesure de protection prononcée n'est déclarée." });
  } else if (qualiteSignature === "en_mon_nom" && statutProtection === "prononcee") {
    const mesure = lire("cerfa_formulaire", "protection.mesure");
    ajouter({ id: "signature-qualite", libelle: "Qualité du signataire", statut: mesure === "tutelle" ? "alerte" : "info", detail: mesure === "tutelle" ? "Le demandeur est sous tutelle mais a signé en son nom : la signature du tuteur est attendue." : "Mesure de protection déclarée, signature en son nom : vérifier l'étendue de la mesure." });
  } else if (qualiteSignature === null) {
    ajouter({ id: "signature-qualite", libelle: "Qualité du signataire", statut: "alerte", detail: "La qualité du signataire (en son nom, représentant légal) n'a pas été lue." });
  } else {
    ajouter({ id: "signature-qualite", libelle: "Qualité du signataire", statut: "ok", detail: "Qualité du signataire cohérente avec la situation déclarée." });
  }

  // --- Pièces conditionnelles -------------------------------------------
  if (statutProtection === "prononcee" || qualiteSignature === "representant_legal") {
    if (present("jugement_protection")) {
      ajouter({ id: "jugement", libelle: "Décision de justice (mesure de protection)", statut: "ok", detail: "Jugement joint.", piece: "jugement_protection" });
    } else {
      piecesManquantes.push("Photocopie de la décision de justice relative à la mesure de protection");
      ajouter({
        id: "jugement",
        libelle: "Décision de justice (mesure de protection)",
        statut: "bloquant",
        detail:
          statutProtection === "prononcee"
            ? "Une mesure de protection est déclarée prononcée : la décision de justice doit être jointe."
            : "Le formulaire est signé par un représentant légal : la décision de justice doit être jointe.",
        piece: "jugement_protection",
      });
    }
  } else if (statutProtection === "en_cours") {
    ajouter({ id: "jugement", libelle: "Décision de justice (mesure de protection)", statut: "info", detail: "Demande de protection en cours : jugement à réclamer lorsqu'il sera rendu." });
  }

  const occupation = lire("cerfa_formulaire", "residence_principale.occupation");
  const autresBiens = Number(lire("cerfa_formulaire", "autres_biens_immobiliers") ?? "0") || 0;
  if (occupation === "non_louee" || autresBiens > 0) {
    ajouter(
      present("taxe_fonciere")
        ? { id: "taxe-fonciere", libelle: "Avis de taxe foncière", statut: "ok", detail: "Avis joint.", piece: "taxe_fonciere" }
        : {
            id: "taxe-fonciere",
            libelle: "Avis de taxe foncière",
            statut: "alerte",
            detail:
              occupation === "non_louee"
                ? "Résidence principale déclarée non louée : l'avis de taxe foncière est attendu."
                : `${autresBiens} autre(s) bien(s) immobilier(s) déclaré(s) : avis de taxe foncière attendu pour chaque bien non loué.`,
            piece: "taxe_fonciere",
          },
    );
  }

  // --- Identité du demandeur ---------------------------------------------
  const nomNaissance = lire("cerfa_formulaire", "demandeur.nom_naissance");
  const nomUsage = lire("cerfa_formulaire", "demandeur.nom_usage");
  const prenoms = lire("cerfa_formulaire", "demandeur.prenoms");
  const dateNaissance = lire("cerfa_formulaire", "demandeur.date_naissance");
  const nir = lire("cerfa_formulaire", "demandeur.nir");

  const essentiels: Array<[string, string | null]> = [
    ["Nom de naissance", nomNaissance],
    ["Prénom(s)", prenoms],
    ["Date de naissance", dateNaissance],
    ["Numéro de sécurité sociale", nir],
  ];
  const manquants = essentiels.filter(([, v]) => !v).map(([l]) => l);
  ajouter(
    manquants.length === 0
      ? { id: "identite-complete", libelle: "Identité du demandeur renseignée", statut: "ok", detail: "Nom, prénom, date de naissance et NIR lus.", piece: "cerfa_formulaire" }
      : { id: "identite-complete", libelle: "Identité du demandeur renseignée", statut: "alerte", detail: `Champ(s) non lu(s) : ${manquants.join(", ")}. À compléter avant instruction.`, piece: "cerfa_formulaire" },
  );

  if (nir) {
    ajouter(
      nirValide(nir)
        ? { id: "nir", libelle: "Clé du numéro de sécurité sociale", statut: "ok", detail: "Clé de contrôle correcte.", piece: "cerfa_formulaire" }
        : { id: "nir", libelle: "Clé du numéro de sécurité sociale", statut: "alerte", detail: "La clé de contrôle ne correspond pas : NIR probablement mal lu ou mal saisi.", piece: "cerfa_formulaire" },
    );
  }

  const questionnaire = ["se_lever", "s_habiller", "faire_sa_toilette", "manger"].map((q) => lire("cerfa_formulaire", `questionnaire.${q}`));
  const reponsesManquantes = questionnaire.filter((r) => r !== "oui" && r !== "non").length;
  ajouter(
    reponsesManquantes === 0
      ? { id: "questionnaire", libelle: "Questionnaire d'autonomie (partie 4)", statut: "ok", detail: "Les 4 réponses sont lues.", piece: "cerfa_formulaire" }
      : { id: "questionnaire", libelle: "Questionnaire d'autonomie (partie 4)", statut: "alerte", detail: `${reponsesManquantes} réponse(s) non lue(s) : indispensable pour déterminer l'organisme compétent.`, piece: "cerfa_formulaire" },
  );

  // --- Rapprochement avec le logiciel métier --------------------------------
  if (rapprochement) {
    if (!rapprochement.confirme) {
      ajouter({ id: "rapprochement", libelle: "Rapprochement avec l'usager Solis", statut: "alerte", detail: "L'identité n'a pas été rapprochée des usagers connus : à confirmer au contrôle des données." });
    } else if (rapprochement.usager) {
      const u = rapprochement.usager;
      const ecarts: string[] = [];
      if (nomNaissance && normaliser(u.nomNaissance) !== normaliser(nomNaissance)) ecarts.push(`nom de naissance (Solis : ${u.nomNaissance})`);
      const ddnSolis = parserDateFr(u.dateNaissance);
      const ddnCerfa = parserDateFr(dateNaissance);
      if (ddnSolis && ddnCerfa && ddnSolis.getTime() !== ddnCerfa.getTime()) ecarts.push(`date de naissance (Solis : ${u.dateNaissance})`);
      ajouter(
        ecarts.length
          ? { id: "rapprochement", libelle: "Rapprochement avec l'usager Solis", statut: "alerte", detail: `Usager ${u.numeroUsager} rattaché, mais écart(s) avec le formulaire : ${ecarts.join(", ")}. Vérifier qu'il s'agit bien de la même personne et mettre Solis à jour.` }
          : { id: "rapprochement", libelle: "Rapprochement avec l'usager Solis", statut: "ok", detail: `Usager connu ${u.numeroUsager}, identité concordante.` },
      );
      const voieCerfa = lire("cerfa_formulaire", "adresse.voie") ?? "";
      const adresseCerfa = `${voieCerfa} ${lire("cerfa_formulaire", "adresse.code_postal") ?? ""}`.trim();
      const cleVoie = normaliserAdresse(voieCerfa).slice(0, 12);
      if (cleVoie.length >= 6 && !normaliserAdresse(u.adresse).includes(cleVoie)) {
        ajouter({ id: "rapprochement-adresse", libelle: "Adresse connue de Solis", statut: "info", detail: `Solis : ${u.adresse}. Formulaire : ${adresseCerfa}, ${lire("cerfa_formulaire", "adresse.commune") ?? ""}. Adresse à mettre à jour lors de l'enregistrement.` });
      }
      if (rapprochement.demandeEnCours) {
        const d = rapprochement.demandeEnCours;
        ajouter({ id: "demande-double", libelle: "Demande déjà en cours", statut: "alerte", detail: `Une demande ${d.numero} (${d.type}) est en cours depuis le ${d.dateDemande}${d.commentaire ? ` : ${d.commentaire}` : "."} Rattacher le présent envoi à cette demande plutôt que d'en créer une nouvelle.` });
      }
    } else {
      ajouter({ id: "rapprochement", libelle: "Rapprochement avec l'usager Solis", statut: "ok", detail: "Aucun usager correspondant : première demande, un usager sera créé à l'enregistrement." });
    }
  }

  // --- Pièce d'identité ----------------------------------------------------
  if (present("cni")) {
    const nomCni = lire("cni", "nom");
    const nomUsageCni = lire("cni", "nom_usage");
    const prenomsCni = lire("cni", "prenoms");
    const ddnCni = lire("cni", "date_naissance");

    if (nomCni && nomNaissance) {
      const memeNom = normaliser(nomCni) === normaliser(nomNaissance) || (nomUsage !== null && normaliser(nomCni) === normaliser(nomUsage)) || (nomUsageCni !== null && normaliser(nomUsageCni) === normaliser(nomNaissance));
      ajouter(
        memeNom
          ? { id: "cni-nom", libelle: "Nom sur la pièce d'identité", statut: "ok", detail: `CNI : ${nomCni} — CERFA : ${nomNaissance}.`, piece: "cni" }
          : { id: "cni-nom", libelle: "Nom sur la pièce d'identité", statut: "bloquant", detail: `Le nom de la CNI (${nomCni}) ne correspond pas à celui du CERFA (${nomNaissance}).`, piece: "cni" },
      );
    } else {
      ajouter({ id: "cni-nom", libelle: "Nom sur la pièce d'identité", statut: "alerte", detail: "Nom non lu sur la CNI ou le CERFA.", piece: "cni" });
    }

    if (prenomsCni && prenoms) {
      ajouter(
        premierPrenom(prenomsCni) === premierPrenom(prenoms)
          ? { id: "cni-prenom", libelle: "Prénom sur la pièce d'identité", statut: "ok", detail: `CNI : ${prenomsCni} — CERFA : ${prenoms}.`, piece: "cni" }
          : { id: "cni-prenom", libelle: "Prénom sur la pièce d'identité", statut: "alerte", detail: `Prénom CNI (${prenomsCni}) différent du CERFA (${prenoms}).`, piece: "cni" },
      );
    }

    if (ddnCni && dateNaissance) {
      const a = parserDateFr(ddnCni);
      const b = parserDateFr(dateNaissance);
      ajouter(
        a && b && a.getTime() === b.getTime()
          ? { id: "cni-ddn", libelle: "Date de naissance sur la pièce d'identité", statut: "ok", detail: `${ddnCni} sur les deux documents.`, piece: "cni" }
          : { id: "cni-ddn", libelle: "Date de naissance sur la pièce d'identité", statut: "alerte", detail: `CNI : ${ddnCni} — CERFA : ${dateNaissance}. Incohérence à vérifier avec l'usager.`, piece: "cni" },
      );
    }

    const expiration = parserDateFr(lire("cni", "date_expiration"));
    const delivrance = parserDateFr(lire("cni", "date_delivrance"));
    if (!expiration) {
      ajouter({ id: "cni-validite", libelle: "Validité de la pièce d'identité", statut: "alerte", detail: "Date d'expiration non lue.", piece: "cni" });
    } else {
      // Les CNI délivrées à des majeurs entre 2004 et 2013 sont prolongées de 5 ans.
      const prolongee = delivrance !== null && delivrance.getUTCFullYear() >= 2004 && delivrance.getUTCFullYear() <= 2013;
      const expirationEffective = prolongee ? ajouterAnnees(expiration, 5) : expiration;
      if (expirationEffective.getTime() >= reception.getTime()) {
        ajouter({
          id: "cni-validite",
          libelle: "Validité de la pièce d'identité",
          statut: "ok",
          detail: prolongee ? `Valide jusqu'au ${formaterDateFr(expirationEffective)} (prolongation légale de 5 ans).` : `Valide jusqu'au ${formaterDateFr(expiration)}.`,
          piece: "cni",
        });
      } else {
        ajouter({
          id: "cni-validite",
          libelle: "Validité de la pièce d'identité",
          statut: "alerte",
          detail: `Pièce expirée le ${formaterDateFr(expirationEffective)}${prolongee ? " (prolongation de 5 ans incluse)" : ""}. Une pièce périmée reste un justificatif d'identité : à apprécier par l'agent.`,
          piece: "cni",
        });
      }
    }
  }

  // --- RIB ----------------------------------------------------------------
  if (present("rib")) {
    const titulaire = lire("rib", "titulaire");
    ajouter(
      contientNom(titulaire, nomNaissance, nomUsage)
        ? { id: "rib-titulaire", libelle: "RIB au nom du demandeur", statut: "ok", detail: `Titulaire : ${titulaire}.`, piece: "rib" }
        : { id: "rib-titulaire", libelle: "RIB au nom du demandeur", statut: "alerte", detail: `Titulaire lu : ${titulaire ?? "non lu"}. Le nom du demandeur n'y figure pas.`, piece: "rib" },
    );
    const iban = lire("rib", "iban");
    if (iban) {
      ajouter(
        ibanValide(iban)
          ? { id: "rib-iban", libelle: "IBAN", statut: "ok", detail: "Clé IBAN correcte.", piece: "rib" }
          : { id: "rib-iban", libelle: "IBAN", statut: "alerte", detail: "Clé IBAN incorrecte : IBAN mal lu ou erroné.", piece: "rib" },
      );
    }
  }

  // --- Avis d'imposition ------------------------------------------------
  if (present("avis_imposition")) {
    const anneeRevenus = Number(lire("avis_imposition", "annee_revenus"));
    const anneeReception = reception.getUTCFullYear();
    if (!anneeRevenus) {
      ajouter({ id: "avis-annee", libelle: "Année de l'avis d'imposition", statut: "alerte", detail: "Année des revenus non lue.", piece: "avis_imposition" });
    } else if (anneeReception - anneeRevenus <= 2) {
      ajouter({ id: "avis-annee", libelle: "Année de l'avis d'imposition", statut: "ok", detail: `Revenus ${anneeRevenus} : dernier avis disponible.`, piece: "avis_imposition" });
    } else {
      ajouter({ id: "avis-annee", libelle: "Année de l'avis d'imposition", statut: "alerte", detail: `Revenus ${anneeRevenus} : avis trop ancien, demander le dernier avis.`, piece: "avis_imposition" });
    }
    const declarants = `${lire("avis_imposition", "declarant_1") ?? ""} ${lire("avis_imposition", "declarant_2") ?? ""}`;
    ajouter(
      contientNom(declarants, nomNaissance, nomUsage)
        ? { id: "avis-nom", libelle: "Avis d'imposition au nom du demandeur", statut: "ok", detail: `Déclarant(s) : ${declarants.trim()}.`, piece: "avis_imposition" }
        : { id: "avis-nom", libelle: "Avis d'imposition au nom du demandeur", statut: "alerte", detail: `Déclarant(s) lu(s) : ${declarants.trim() || "non lu"}. Le nom du demandeur n'y figure pas.`, piece: "avis_imposition" },
    );
    const situation = lire("cerfa_formulaire", "situation_familiale");
    if (situation === "marie" || situation === "pacse" || situation === "concubinage") {
      const parts = Number((lire("avis_imposition", "nombre_parts") ?? "").replace(",", "."));
      const conjointMentionne = Boolean(lire("avis_imposition", "declarant_2")) || parts >= 2;
      ajouter(
        conjointMentionne
          ? { id: "avis-conjoint", libelle: "Ressources du conjoint", statut: "ok", detail: "Avis commun : les ressources du conjoint sont prises en compte.", piece: "avis_imposition" }
          : { id: "avis-conjoint", libelle: "Ressources du conjoint", statut: "alerte", detail: "Demandeur en couple mais avis d'imposition individuel : réclamer l'avis du conjoint.", piece: "avis_imposition" },
      );
    }
  }

  // --- Certificat médical -------------------------------------------------
  const nomPatient = lire("certificat_medical", "patient.nom_naissance");
  const dateCmBrute = lire("certificat_medical", "date");
  const medecin = lire("certificat_medical", "medecin_nom");
  const rpps = lire("certificat_medical", "medecin_rpps");
  const cmVierge = present("certificat_medical") && !nomPatient && !dateCmBrute && !medecin && !rpps;
  if (cmVierge) {
    ajouter({ id: "presence-cm", libelle: "Certificat médical", statut: "info", detail: "L'annexe « certificat médical » est jointe mais vierge : elle est considérée comme absente (pièce facultative).", piece: "certificat_medical" });
  } else if (present("certificat_medical")) {
    ajouter({ id: "presence-cm", libelle: "Certificat médical", statut: "ok", detail: "Certificat médical joint : il sera transmis à l'équipe médico-sociale avec le dossier.", piece: "certificat_medical" });
    const ddnPatient = parserDateFr(lire("certificat_medical", "patient.date_naissance"));
    const ddnCerfa = parserDateFr(dateNaissance);
    const memePersonne = contientNom(nomPatient, nomNaissance, nomUsage) && (!ddnPatient || !ddnCerfa || ddnPatient.getTime() === ddnCerfa.getTime());
    ajouter(
      memePersonne
        ? { id: "cm-patient", libelle: "Certificat médical établi pour le demandeur", statut: "ok", detail: `Patient : ${nomPatient}.`, piece: "certificat_medical" }
        : { id: "cm-patient", libelle: "Certificat médical établi pour le demandeur", statut: "alerte", detail: `Patient lu : ${nomPatient ?? "non lu"}${ddnPatient ? `, né(e) le ${formaterDateFr(ddnPatient)}` : ""}. Identité à vérifier.`, piece: "certificat_medical" },
    );
    const dateCm = parserDateFr(dateCmBrute);
    if (!dateCm) {
      ajouter({ id: "cm-date", libelle: "Date du certificat médical", statut: "alerte", detail: "Date non lue.", piece: "certificat_medical" });
    } else {
      const mois = moisEntre(dateCm, reception);
      ajouter(
        mois <= PARAMETRES.moisValiditeCertificat
          ? { id: "cm-date", libelle: "Date du certificat médical", statut: "ok", detail: `Établi le ${formaterDateFr(dateCm)}, moins de ${PARAMETRES.moisValiditeCertificat} mois avant la réception.`, piece: "certificat_medical" }
          : { id: "cm-date", libelle: "Date du certificat médical", statut: "alerte", detail: `Établi le ${formaterDateFr(dateCm)}, il y a ${mois} mois : certificat ancien.`, piece: "certificat_medical" },
      );
    }
    ajouter(
      medecin || rpps
        ? { id: "cm-medecin", libelle: "Médecin identifié", statut: "ok", detail: `${medecin ?? ""}${rpps ? ` (RPPS ${rpps})` : ""}`.trim(), piece: "certificat_medical" }
        : { id: "cm-medecin", libelle: "Médecin identifié", statut: "alerte", detail: "Ni nom ni RPPS lus : vérifier le cachet et la signature.", piece: "certificat_medical" },
    );
  } else {
    ajouter({ id: "presence-cm", libelle: "Certificat médical", statut: "info", detail: "Pièce facultative, absente. L'évaluation médico-sociale à domicile pourra la remplacer.", piece: "certificat_medical" });
  }

  // --- Synthèse -----------------------------------------------------------
  const nbBloquants = controles.filter((c) => c.statut === "bloquant").length;
  const nbAlertes = controles.filter((c) => c.statut === "alerte").length;
  const recevabilite: Recevabilite = nbBloquants > 0 ? "non_recevable" : nbAlertes > 0 ? "recevable_sous_reserve" : "recevable";
  const synthese =
    recevabilite === "non_recevable"
      ? `${nbBloquants} point(s) bloquant(s)${piecesManquantes.length ? `, ${piecesManquantes.length} pièce(s) à réclamer` : ""}. Le dossier ne peut pas partir en instruction en l'état.`
      : recevabilite === "recevable_sous_reserve"
        ? `${nbAlertes} point(s) d'attention à apprécier par l'agent avant transmission.`
        : "Toutes les pièces sont présentes et cohérentes.";

  return { controles, recevabilite, piecesManquantes, synthese, calculeLe: new Date().toISOString() };
}

export function libellePiece(type: TypePiece): string {
  return LIBELLES_PIECES[type];
}
