# Solid'IA — Traitement intelligent des dossiers des solidarités (prototype APA)

Ce fichier est la référence de travail pour ce projet. Le brief d'origine de l'utilisateur est dans `instructions.md` (conserver tel quel, c'est la source). Ce document le structure et le complète avec ce qui est observable dans le dépôt.

Règles Next.js 16 pour les agents (régénérées par `next dev`) : @AGENTS.md

## 1. Contexte

**Nom de l'outil : Solid'IA**, « le traitement intelligent des dossiers des solidarités de la Collectivité européenne d'Alsace » (fixé le 06/10/2026). Identité centralisée dans `src/lib/marque.ts` ; ne pas écrire le nom en dur. Ne pas confondre **Solid'IA** (l'outil) et **Solis** (le logiciel métier de destination).

Outil de contrôle des dossiers APA (Allocation Personnalisée d'Autonomie) pour la Collectivité européenne d'Alsace. Un dossier reçu (scan ou courrier) est pris en charge dans la GED, OCRisé, délié en pièces typées, ses données sont extraites et contrôlées en regard du document, l'usager est rapproché de Solis, la complétude et la conformité sont vérifiées par le moteur de règles métier, un rapport de contrôle est généré, puis le dossier est enregistré dans Solis avec ce rapport.

**L'outil n'apprécie pas le droit à la prestation** (décision du 16/11/2026) : ni âge, ni organisme compétent, ni domicile de secours, ni non-cumul, ni GIR. Tout dossier contrôlé est transmis à Solis, complet ou non ; l'agent instructeur y décide, et refusera la demande si le droit n'est pas ouvert. L'ancienne étape de pré-instruction et d'orientation a été supprimée, ainsi que les courriers (Solis les émet).

Toutes les données manipulées sont **synthétiques**. Le but est la démonstration et l'architecture d'une vraie solution, jamais le traitement de données personnelles réelles.

## 2. Stack (décidée le 14/09/2026)

| Élément | Choix | Notes |
|---|---|---|
| Runtime | Node.js 24 LTS, npm 11 | Voir « Environnement » ci-dessous |
| Framework | Next.js 16.3 (App Router, Turbopack), React 19, TypeScript | Dossier `src/`, alias `@/*` |
| Styles | Tailwind CSS 4, thème clair imposé (variant `dark` rattaché à une classe `.dark` jamais posée), palette slate | Composants maison dans `src/components/ui.tsx` |
| État client | zustand + `persist` (localStorage, clé `solidia-dossiers`, version 3 avec `migrate`, reprise de l'ancienne clé `instructocr-dossiers`) | Un dossier pris en charge progresse d'étape en étape, avec statut, révision et journal |
| OCR | API Mistral `POST /v1/ocr`, **`mistral-ocr-2512` épinglé** (surcharge `MISTRAL_OCR_MODEL`) | Serveur uniquement, `fetch` sans SDK, Markdown par page, délai d'attente 50 s |
| Extraction | API Mistral chat, sortie JSON contrainte (`response_format: json_schema`, strict) | **`mistral-small-2603` épinglé** (surcharge `MISTRAL_CHAT_MODEL` ou `modele` par requête), délai 50 s, post-traitement déterministe |
| PDF | pdf-lib (dépendance d'exécution : rapport de contrôle, découpage physique ; et remplissage du CERFA dans le générateur) + pdfjs-dist et @napi-rs/canvas (rasterisation, dev) | Polices standard (WinAnsi), voir section 7 |
| Hébergement cible | Vercel + GitHub | Procédure dans `DEPLOIEMENT.md`. Trois variables : `MISTRAL_API_KEY`, `SOLIDIA_MOT_DE_PASSE`, `SOLIDIA_SECRET_SESSION`. Supabase prévu pour remplacer le localStorage |

Commandes : `npm run dev`, `npm run build` (type-check inclus, y compris `scripts/`), `npm run lint` (ESLint 9, règles React 19 : pas de `setState` direct dans un effet, mémoïser les objets passés en dépendances), `npm run generer:dossiers`, `npx tsx scripts/tester-pipeline.ts <id> [url] [sortie.json] [rapport.pdf]`.

**Environnement (depuis novembre 2026)** : poste Windows 11, projet dans OneDrive (`OneDrive - Alsace\Apps\alsacia-solidia`). Node 24 installé en version portable dans `Documents\node-v24.18.1-win-x64`. PowerShell bloque `npm.ps1` (stratégie d'exécution) : utiliser `npm.cmd` et `npx.cmd`. Le port 3000 est occupé par un autre logiciel (AMAgent) : lancer `next dev` ou `next start` avec `-p 3100`. Next.js 16 refuse deux `next dev` sur le même projet. `.env.local` est absent de ce poste : sans `MISTRAL_API_KEY`, la lecture et l'extraction échouent (le rapport, Solis simulé et les pages fonctionnent). Si `tsc` signale `PageProps`/`RouteContext` introuvables ou une page supprimée dans `.next/dev/types`, lancer `npx.cmd next typegen`.

Git : branche `main`, remote `origin` = `github.com/hamiltonrmat/alsacia-solidia`. Depuis la v3 (16/11/2026), les commits sont faits avec l'identité configurée sur ce poste (`alsace-ia`) ; ceux de la v2 sont signés `hamiltonrmat`. Messages de commit en français.

`<html suppressHydrationWarning>` dans `src/app/layout.tsx` : une extension Edge déployée sur les postes de la collectivité (IT Hit, WebDAV) ajoute `data-dav0-error` à `<html>`, ce qui provoquait un faux avertissement d'hydratation (« 1 Issue ») en développement.

## 3. Structure du dépôt

```
src/app/page.tsx                       Accueil : bienvenue, « Entrer » et « Mode d'emploi », le parcours en 5 étapes, aperçu de la bannette
src/app/dossiers/page.tsx              Traitement des dossiers : rappel des 5 étapes, GED (étape 1), bannette filtrable
src/app/dossiers/[id]/layout.tsx       Bandeau du dossier (fil d'Ariane, statut, n° d'enregistrement, fil des étapes, journal), 404 si id inconnu
src/app/dossiers/[id]/{decoupage,extraction,conformite,export}/page.tsx   Étapes 2 à 5
src/app/solis/page.tsx                 Solis simulé (hors menu) : référentiel, demandes enregistrées avec leur rapport, usagers créés
src/app/schema/page.tsx                Schéma de l'outil (pleine largeur) : vue fonctionnelle et architecture technique
src/app/regles/page.tsx                Règles métier : calcul du verdict, catalogue consultable, paramètres, hors périmètre (ancres #regle-<id>, #famille-<f>)
src/app/mode-d-emploi/page.tsx         Mode d'emploi (13 sections) : vue d'ensemble et architecture en schémas, parcours, indicateurs, rapport
src/app/outils/ocr/page.tsx            Banc d'essai OCR (lien en pied de page)
src/app/api/ged/lots/route.ts          GET : lots et dossiers de la GED simulée
src/app/api/dossiers/[id]/ocr/route.ts POST : lit public/ged/<lot>/<id>.pdf, OCR Mistral
src/app/api/dossiers/[id]/pieces/route.ts  GET ?pages=&nom= : PDF d'une pièce seule (découpage physique, retour GED)
src/app/api/extraction/route.ts        POST { type, markdown, modele? } : extraction structurée
src/app/api/rapport/route.ts           POST { rapport } : PDF du rapport, en-têtes X-Empreinte-Sha256 et X-Nombre-Pages
src/app/api/solis/route.ts             POST { action: rechercher | enregistrer } : Solis simulé ; enregistrer exige le rapport et renvoie sa référence et son empreinte
src/app/api/ocr/route.ts               POST multipart { file } : OCR d'un fichier envoyé
src/components/etapes/*.tsx            Déliassage (decoupage), contrôle des données (extraction), complétude et conformité, enregistrement et transmission (export)
src/components/arrivees-ged.tsx        Étape 1 · GED : lots, dossiers, prise en charge (l'OCR précède toute écriture dans le store)
src/components/bannette.tsx            Bannette filtrable + ApercuBannette (accueil) + cheminEtape/libelleEtape
src/components/rapport-pdf.tsx         Rapport côté navigateur : demande de mise en page, CarteRapport (aperçu, téléchargement, empreinte), BoutonOuvrirRapport
src/components/vue-solis.tsx           Solis : référentiel et demandes enregistrées avec rapport
src/components/catalogue-regles.tsx    Catalogue des règles (client) : recherche plein texte, filtres par famille et par issue, ancre par règle
src/components/schemas-outil.tsx       Schémas du mode d'emploi en HTML : SchemaFonctionnel (couloirs × 5 étapes), SchemaTechnique (navigateur, serveur, services)
src/components/rapprochement-usager.tsx  Identitovigilance : candidats Solis, confirmation par l'agent
src/components/{ui,en-tete,en-tete-dossier,visionneuse-pdf,ocr-bench}.tsx
src/proxy.ts                           Porte d'entrée (ex-middleware, runtime Node en Next 16) : redirige vers /connexion sans jeton
src/app/connexion/page.tsx             Page de connexion (force-dynamic : l'env est lu à l'exécution)
src/app/api/connexion/route.ts         POST (vérifie le mot de passe, pose les cookies) / DELETE (déconnexion)
src/lib/session.ts                     Jeton HMAC, options de cookies, protectionActive() (server-only)
src/lib/garde-api.ts                   Seconde vérification du jeton dans les routes d'API
src/lib/noms-cookies.ts                Noms de cookies partagés serveur/navigateur
src/lib/marque.ts                      Nom, accroche, collectivité, version, logo
src/lib/etapes.ts                      Les 5 étapes (ged, decoupage, extraction, conformite, export) et leur résumé (utilisable côté serveur)
src/lib/mistral-ocr.ts                 Client OCR (server-only)
src/lib/decoupage.ts                   Classification des pages par règles (pied de page CERFA, mots-clés, page vide), pièces
src/lib/extraction/schemas.ts          Schémas JSON par type, champs critiques, page CERFA de chaque champ (formulaire 5-9, certificat 11-13)
src/lib/extraction/mistral-extraction.ts  Prompt, appel chat, post-traitement (cases, IBAN, NIR) (server-only)
src/lib/regles/parametres.ts           Seuils et délais (PARAMETRES) et leur description (DESCRIPTION_PARAMETRES)
src/lib/regles/conformite.ts           Moteur de règles : CATALOGUE_REGLES (famille, ce qui est vérifié, issues), HORS_PERIMETRE, ancreRegle, evaluerConformite, verdict, date limite d'AR
src/lib/rapport/modele.ts              Modèle versionné du rapport (RapportControle), indice de robustesse, méthode, contrôle de forme (isomorphe)
src/lib/rapport/construire.ts          construireRapport(dossier, …) : rapport depuis l'état du dossier (navigateur, scripts)
src/lib/rapport/pdf.ts                 rendreRapportPdf : mise en page pdf-lib déterministe, JSON joint (isomorphe, logo fourni en octets)
src/lib/rapport/serveur.ts             Mise en page côté serveur : logo lu sur disque, empreinte SHA-256 (server-only)
src/lib/statuts.ts                     Statuts du dossier (recu, en_cours, transmis_complet, transmis_incomplet), libellés, descriptions
src/lib/{dates,identifiants,dossier-utils}.ts
src/store/dossier-store.ts             État des dossiers (zustand persist v3) : statut, révision, rapprochement, observations, rapport, export, journal
src/data/types.ts                      Modèle d'un dossier fictif
src/data/dossiers-fictifs.ts           6 usagers fictifs, 3 lots, scénarios attendus
src/data/solis.ts                      Base Solis simulée (4 usagers dont un homonyme et une demande en cours), recherche de candidats
scripts/generer-dossiers.ts            Génère public/ged/**/*.pdf (voir section 5)
scripts/tester-pipeline.ts             Test de bout en bout en CLI, rapport PDF compris
public/ged/<lot>/<id>.pdf              Dossiers fictifs « numérisés » (13 Mo, versionnés)
Formulaire_demande_autonomie_cerfa_16301-01.pdf   CERFA officiel, 13 pages, AcroForm de 294 champs
old_version/                           Prototype v1 statique, exclu d'ESLint, ne pas modifier
instructions.md                        Brief brut de l'utilisateur
```

`/ged` redirige vers `/dossiers` (next.config.ts). `outputFileTracingIncludes` embarque `public/ged/**` pour les routes d'OCR, de pièces et de lots, et `public/solidia-logo.png` pour `/api/rapport` et `/api/solis`.

## 4. Le CERFA 16301*01

13 pages : 1 à 4 notice (page 4 = pièces justificatives), 5 à 9 formulaire, 10 mentions RGPD, 11 à 13 annexe certificat médical. Le pied de page « cerfa 16301*01 / n / 09/2023 » donne le numéro officiel de chaque page : c'est la clé du déliassage, du contrôle « formulaire complet » et du saut à la page d'un champ en vidéocodage (`pageCerfaPourChemin(chemin, type)`, certificat compris).

Le PDF est un formulaire remplissable dont les champs ont des noms génériques. Le générateur les désigne par page et position ; les cases de dates, NIR, téléphone et code postal sont des séries de champs à un caractère ; les boutons radio sont cochés en dessinant.

Pièces obligatoires pour l'APA : justificatif d'identité, RIB, dernier avis d'imposition (demandeur et conjoint), formulaire complet et signé ; certificat médical facultatif, intégralement extrait et transmis. Si concerné : décision de justice (mesure de protection), avis de taxe foncière (bien non loué).

## 5. Génération des dossiers fictifs et comportement de l'OCR

`npm run generer:dossiers` : remplit le CERFA (pdf-lib, aplatissement), dessine CNI, RIB, avis d'imposition, jugement, assemble dans l'ordre de « numérisation » du dossier, puis **rasterise** chaque page (150 dpi, JPEG q70). Variables : `VECTORIEL=1`, `DPI_SCAN`, `QUALITE_JPEG`, `STYLE_MARQUE=x|zapf`, `TAILLE_MARQUE`, `CONTOUR_CASES=0|1`, `DOSSIERS=D-2026-0305,...`, `SORTIE_DIR`.

Enseignements sur la lecture des cases à cocher par `mistral-ocr-latest` :

- Rendu retenu : **croix ZapfDingbats (✘, 8 pt) + contour explicite de toutes les cases + rasterisation**, le mieux lu parmi huit variantes testées le 14/09/2026.
- **La lecture n'est pas stable dans le temps** : un même PDF lu le 14/09 puis le 15/09 a donné des textes différents sur 8 pages sur 11. Aucun rendu ne garantit la lecture des cases ; la robustesse vient du post-traitement et du contrôle par l'agent.
- Post-traitement déterministe (`postTraitement`) : (1) un symbole de case cochée cité dans `extrait` mais absent du texte abaisse la confiance à 0,3 ; (2) pour tout champ à cases du CERFA, si la ligne d'origine ne contient aucun symbole de case, la valeur devient null (0,2) ; (3) pour les groupes de la partie 6, l'option seule sans case parmi des cases vides est retenue à 0,6 ; (4) IBAN et NIR sont relus par expression régulière et vérifiés par leur clé.
- L'annotation structurée de l'API OCR hallucine des valeurs plausibles : écartée. `mistral-medium` invente moins mais rate d'autres champs et prend deux fois plus de temps.
- Les champs non lus sont le fonctionnement normal du contrôle des données : l'agent complète, document en regard. L'API OCR ne donne aucune confiance par caractère : c'est pourquoi l'indice de robustesse du rapport est calculé sur les champs (section 7).
- **Ne jamais utiliser les alias `-latest`** (incident du 16/11/2026) : `mistral-ocr-latest` est passé à OCR 4.1 (`mistral-ocr-4-1`), qui ne répondait plus (plus de 200 s pour une page), d'où en ligne un dépassement de la durée des fonctions Vercel et l'erreur « Unexpected token 'A'… is not valid JSON ». `mistral-ocr-2512` (OCR 3) lit 16 pages en 10 s. Avant de changer de version : tester avec `scripts/tester-pipeline.ts`. Lister les versions et leurs alias : `GET https://api.mistral.ai/v1/models`.
- **Pied de page avec OCR 3** : le numéro de page est le plus souvent perdu (`cerfa 16301*01` seul), parfois en tête de page (`09/2023 16301*01 6`) ou déformé (`evrb 16301*01`). Le déliassage (`decoupage.ts`) reconnaît donc une page du CERFA en trois temps : numéro lu au pied de page (0,98), sinon intitulés propres à la page (`SIGNATURES_PAGES_CERFA`, 0,92 avec le code, 0,85 sans), sinon déduction depuis les pages voisines (0,8). Vérifié le 16/11/2026 sur les 38 pages de 0301, 0304 et 0305 : toutes bien classées.
- Les routes renvoient un JSON d'erreur lisible avant d'être interrompues (délai Mistral 50 s < `maxDuration` 60 s) ; côté navigateur, `lireReponseApi` (`src/lib/reponse-api.ts`) traduit une réponse non JSON (page d'erreur Vercel) en message compréhensible.

## 6. Scénarios de démonstration (src/data/dossiers-fictifs.ts)

| Dossier | Usager | Ce que la démo montre |
|---|---|---|
| D-2026-0301 | Jean DUPONT, 78 ans | Complet et conforme ; rapprochement par NIR avec un homonyme à écarter ; rattachement à l'usager existant |
| D-2026-0302 | Marie MEYER ép. LEROY, 83 ans | RIB absent → incomplet, transmis quand même à Solis au statut « incomplet » ; avis commun (2 parts) |
| D-2026-0303 | Paul MARTIN, 58 ans | Aucune appréciation du droit : complet, transmis ; l'instruction constatera l'âge ; PCH déclarée transmise telle quelle |
| D-2026-0304 | Simone BERNARD, 75 ans | 16 pages avec notice, RGPD et CM vierge écartés ; questionnaire « 4 oui » transmis tel quel |
| D-2026-0305 | Robert MOREAU, 86 ans | CNI en tête, CM en fin ; tutelle, signature de la tutrice, jugement absent → bloquant ; taxe foncière ; **demande déjà en cours dans Solis** → rattacher, pas de doublon |
| D-2026-0306 | Hélène GARNIER ép. PETIT, 80 ans | CNI expirée (règle +5 ans), date de naissance incohérente CERFA/CNI ; déménagement récent transmis à Solis |

Résultats OCR vérifiés par `scripts/tester-pipeline.ts` le 15/09/2026 : 0301, 0304, 0305 conformes aux attentes, sauf les cases du questionnaire de 0301 non lues ce jour-là (variance OCR). Le 16/11/2026 avec `mistral-ocr-2512` : 0301 complet et conforme, robustesse 98/100, questionnaire lu, parcours complet en 45 s. Le 16/11/2026, le rapport de 0305 a été généré hors ligne à partir de la vérité terrain : 9 pages, verdict « incomplet » (jugement), rendu déterministe (même empreinte en script et sur le serveur).

## 7. Organisation et parcours métier (refonte du 16/11/2026)

**Version 3** (`MARQUE.version` = « Prototype v3 », pastille `v3` à côté du logo, package 3.0.0), publiée le 16/11/2026. La barre du haut a **cinq entrées** : **Accueil**, **Traitement des dossiers** (`/dossiers`), **Schéma de l'outil** (`/schema`, à mettre en évidence selon l'utilisateur : aussi en bouton sur l'accueil), **Règles métier** (`/regles`, pour consulter les règles rapidement, hors du mode d'emploi) et **Mode d'emploi**. Les anciens « modules » GED / Dossiers / Solis ont disparu : la GED est l'étape 1 du traitement, Solis la destination (vue `/solis`, accessible depuis la bannette et l'étape 5). Le banc d'essai OCR est en pied de page. À l'étape 4, chaque contrôle a un lien « Voir la règle » qui ouvre `/regles#regle-<id>` dans un nouvel onglet (la règle visée est surlignée par `:target`). Le mode d'emploi contient deux schémas d'ensemble (vue fonctionnelle en couloirs, architecture technique), rendus en HTML dans `schemas-outil.tsx` : à mettre à jour si une étape, un service ou une route change.

Les cinq étapes (`src/lib/etapes.ts`) :

1. **GED** (`/dossiers`, section du haut) : lots, prise en charge (numéro `REC-AAAA-nnnnnn`, statut `recu`, OCR puis déliassage automatique). « Reprendre à zéro » demande confirmation et n'efface rien si la lecture échoue.
2. **Déliassage** (`decoupage.ts`, route `/decoupage`) : pied de page CERFA, mots-clés, pages vides, notice et RGPD écartées.
3. **Contrôle des données** (`extraction/`) : vidéocodage (document en regard, saut à la page du champ), champs critiques ★ à confirmer (`CHAMPS_CRITIQUES`), corrections journalisées avec avant/après (frappes successives d'un même champ regroupées en un événement), **rapprochement usager** (candidats Solis par NIR, état civil, homonymes ; confirmation par l'agent ; demande en cours signalée). Validation bloquée tant que tout n'est pas vérifié et rapproché.
4. **Complétude et conformité** (`regles/conformite.ts`) : le **moteur de règles métier**. `CATALOGUE_REGLES` déclare 30 règles en 8 familles (pièces, formulaire, identité, rapprochement, CNI, RIB, avis, certificat), chacune avec ce qu'elle vérifie et ses issues par statut ; `IdRegle` est le type de leurs clés, ce qui empêche un contrôle non déclaré. Statuts `ok | info | alerte | bloquant`. Verdict `conforme | conforme_sous_reserve | non_conforme` (un bloquant suffit à rendre le dossier incomplet). Observations de l'agent pour l'instruction. « Valider et générer le rapport » fixe `dateCompletude` (sauf `non_conforme`), construit et fige le rapport, affiche son aperçu PDF.
5. **Enregistrement et transmission** (`api/solis` enregistrer) : usager créé ou rattaché, demande créée, rattachée ou mise à jour, statut `transmis_complet` ou `transmis_incomplet`, rapport déposé (référence `DOC-…`, empreinte comparée à celle du rapport généré), retour GED des pièces.

**Rapport de contrôle** (`src/lib/rapport/`) : donnée structurée `RapportControle` (schéma `solidia.rapport-controle`, version 1 ; incrémenter à toute évolution incompatible) puis PDF. Contenu : identification, verdict, indicateurs, points à signaler, pièces manquantes, observations ; 1. robustesse de la lecture (globale et par page, méthode) ; 2. déliassage (documents, reconnaissance de chaque page, interventions de l'agent) ; 3. contrôle des données (tous les champs, état, page, corrections) ; 4. complétude et conformité (règles par famille, dates) ; 5. traçabilité (journal sans la navigation). Le JSON est joint au PDF. Rendu **déterministe** (dates du PDF = `genereLe`) : même rapport, même empreinte SHA-256. Le PDF est mis en page côté serveur (`/api/rapport`) à partir du JSON construit dans le navigateur.

**Indice de robustesse** : score par champ = 1 si vérifié par l'agent sans correction, 0 si corrigé, sinon la confiance d'extraction ; moyenne par page (champs rattachés par `pagePourChamp`) et globale, sur 100 ; seuils 80 et 50 (`PARAMETRES`). Une page sans champ extrait n'a pas d'indice.

**Révision** : `revision` est incrémentée par toute modification de données (déliassage, extraction, correction, vérification, rapprochement, observations). Le rapport mémorise la révision de sa génération ; un écart le déclare périmé et bloque la transmission jusqu'à régénération.

Journal (`journal` dans le store), contextes : `import`, `deliassage`, `controle`, `usager`, `completude`, `rapport`, `transmission`, `navigation` (anciens : `typage`, `recevabilite`, `courrier`, `pre-instruction`, toujours libellés).

## 8. Règles de travail

- **Langue** : UI, documentation, commentaires et commits en français. Vocabulaire métier : traitement des dossiers, déliassage, contrôle des données, complétude et conformité, moteur de règles métier, rapport de contrôle, enregistrement et transmission, bannette.
- **Périmètre** : ne pas réintroduire d'appréciation du droit (âge, organisme compétent, domicile de secours, non-cumul, orientation) ni de courriers : décision de l'utilisateur du 16/11/2026. Les données correspondantes sont transmises telles quelles dans les métadonnées.
- **Moteur de règles** : toute nouvelle règle s'ajoute d'abord dans `CATALOGUE_REGLES` (la page Règles métier et le rapport la reprennent automatiquement), puis dans `evaluerConformite` ; un nouveau paramètre s'ajoute dans `PARAMETRES` et `DESCRIPTION_PARAMETRES`.
- **Langue des échanges** : parler en français à l'utilisateur, y compris dans les boîtes de questions (demande du 16/11/2026).
- **Vérification visuelle** : Edge est installé ; `msedge --headless=new --screenshot=... --window-size=1440,H <url>` capture une page du serveur de dev (port 3100). Les captures avec une ancre (#…) sortent blanches : capturer la page entière et rogner (System.Drawing).
- **Protection de la démo** : mot de passe unique via `SOLIDIA_MOT_DE_PASSE` (absente = accès libre, cas du développement local). Cookie `solidia_acces` httpOnly portant un jeton HMAC signé (7 jours) ; drapeau `solidia_session_ouverte` sans secret pour afficher la déconnexion. Le proxy protège les pages, `garde-api.ts` protège en plus chaque route d'API pour que la clé Mistral ne soit pas consommable sans mot de passe. `maxDuration = 60` sur les routes de lecture et d'extraction, 30 sur le rapport et Solis.
- **Secrets** : `MISTRAL_API_KEY` dans `.env.local`, jamais préfixée `NEXT_PUBLIC_`, jamais affichée. Tout appel Mistral passe par `src/lib/mistral-ocr.ts` ou `src/lib/extraction/mistral-extraction.ts` (server-only).
- **Certificat médical** : intégralement extrait, affiché et repris dans le rapport (décision du 06/10/2026). **L'outil ne calcule aucun GIR** : refus explicite de l'utilisateur le 06/10/2026. Ne pas réintroduire de score de dépendance.
- **Identitovigilance** : jamais de rattachement automatique à un usager ; l'agent confirme.
- **Données** : uniquement fictives. Les NIR et IBAN fictifs ont une clé valide mais ne correspondent à personne.
- **PDF du rapport** : polices standard pdf-lib, donc encodage WinAnsi ; `Redacteur.propre()` remplace les caractères hors jeu (✓, ★, →, espaces fines…). `pdf.ts` ne doit pas importer `server-only` (il sert aussi aux scripts) ; la lecture du logo et l'empreinte sont dans `serveur.ts`.
- **Next.js 16** : lire `node_modules/next/dist/docs/` avant d'utiliser une API dont on n'est pas sûr. `LayoutProps`, `PageProps`, `RouteContext` sont des helpers globaux ; `params` est une promesse. Ne pas importer de constantes d'un module `"use client"` dans un composant serveur (le mode d'emploi importe `statuts.ts`, `regles/conformite.ts`, `rapport/modele.ts`, pas le store).
- **Vercel** : corps de requête plafonné à 4,5 Mo (un rapport JSON pèse quelques dizaines de Ko) ; les PDF de la GED et le logo sont lus sur disque (`outputFileTracingIncludes`). Pour de vrais dossiers, prévoir un stockage et passer une URL à Mistral.
- **Outils absents** : `pdftotext`, Ghostscript, `gh`, `vercel`. La rasterisation se fait en Node (pdfjs-dist + @napi-rs/canvas).

## 9. Glossaire

Solid'IA (l'outil), Solis (le logiciel métier de destination, où se fait l'instruction), APA, CERFA, NIR / NSS (15 chiffres), CNI, CMI, GED, déliassage, bannette, vidéocodage, identitovigilance, moteur de règles métier, rapport de contrôle, indice de robustesse, empreinte SHA-256, date de dossier complet, GIR (déterminé par l'EMS, jamais calculé par l'outil), EMS (équipe médico-sociale), MDPH, PCH, ACTP, MTP, PCRTP (prestations déclarées, transmises telles quelles).

## 10. Prochaines étapes

1. Faire valider par l'utilisateur le catalogue de règles, les seuils (`PARAMETRES`) et le contenu du rapport de contrôle ; vérifier le parcours complet dans le navigateur avec une clé Mistral.
2. Supabase : tables dossiers, pièces, extractions, rapprochements, rapports (JSON et PDF), journal, usagers Solis simulés ; bannette partagée avec affectation et ancienneté ; remplacer `persist` par des routes API. L'utilisateur doit fournir l'URL et les clés du projet.
3. Déploiement : le dépôt GitHub existe (`origin`) ; reste le projet Vercel, qui demande les identifiants de l'utilisateur.
4. Pistes : tableau de bord dans le traitement des dossiers (volumes, délais, indices de robustesse), relances, dégradations de scan pour éprouver l'indice de robustesse, autres prestations des solidarités que l'APA (le nom Solid'IA couvre l'ensemble des solidarités).
