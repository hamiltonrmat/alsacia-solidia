# Solid'IA — Traitement intelligent des dossiers des solidarités (prototype APA)

Ce fichier est la référence de travail pour ce projet. Le brief d'origine de l'utilisateur est dans `instructions.md` (conserver tel quel, c'est la source). Ce document le structure et le complète avec ce qui est observable dans le dépôt.

Règles Next.js 16 pour les agents (régénérées par `next dev`) : @AGENTS.md

## 1. Contexte

**Nom de l'outil : Solid'IA**, « le traitement intelligent des dossiers des solidarités de la Collectivité européenne d'Alsace » (fixé le 06/10/2026). Identité centralisée dans `src/lib/marque.ts` ; ne pas écrire le nom en dur. Ne pas confondre **Solid'IA** (l'outil) et **Solis** (le logiciel métier de destination).

Outil d'aide à la pré-instruction des dossiers APA (Allocation Personnalisée d'Autonomie) pour la Collectivité européenne d'Alsace. Un dossier reçu (scan ou courrier) est enregistré, OCRisé, découpé en pièces typées, ses données sont extraites et contrôlées en regard du document, l'usager est rapproché du logiciel métier, la complétude et la recevabilité sont vérifiées, puis les règles administratives proposent une orientation que l'agent retient avant enregistrement dans Solis et transmission. L'agent d'accueil ne décide pas de l'attribution de l'APA : il pré-instruit et oriente.

Toutes les données manipulées sont **synthétiques**. Le but est la démonstration et l'architecture d'une vraie solution, jamais le traitement de données personnelles réelles.

## 2. Stack (décidée le 14/09/2026)

| Élément | Choix | Notes |
|---|---|---|
| Runtime | Node.js 24 LTS via nvm (`~/.nvm`), npm 11 | Hook nvm dans `~/.zprofile`. `~/.zshrc` appartient à root, ne pas y toucher |
| Framework | Next.js 16.3 (App Router, Turbopack), React 19, TypeScript | Dossier `src/`, alias `@/*` |
| Styles | Tailwind CSS 4, thème clair imposé (variant `dark` rattaché à une classe `.dark` jamais posée), palette slate | Composants maison dans `src/components/ui.tsx` |
| État client | zustand + `persist` (localStorage, clé `solidia-dossiers`, version 2 avec `migrate`, reprise de l'ancienne clé `instructocr-dossiers`) | Un dossier importé progresse d'étape en étape, avec statut métier et journal |
| OCR | API Mistral `POST /v1/ocr`, `mistral-ocr-latest` | Serveur uniquement, `fetch` sans SDK, Markdown par page |
| Extraction | API Mistral chat, sortie JSON contrainte (`response_format: json_schema`, strict) | `mistral-small-latest` par défaut, surcharge par requête (`modele`), post-traitement déterministe |
| Génération PDF | pdf-lib (remplissage du CERFA, pièces dessinées, découpage physique) + pdfjs-dist et @napi-rs/canvas (rasterisation) | Dev dependencies, script `tsx` |
| Hébergement cible | Vercel + GitHub | Pas encore de dépôt distant. `MISTRAL_API_KEY` ira dans les variables d'environnement Vercel. Supabase prévu pour remplacer le localStorage (bannette partagée, journal) |

Commandes : `npm run dev`, `npm run build` (type-check inclus, y compris `scripts/`), `npm run lint` (ESLint 9, règles React 19 : pas de `setState` direct dans un effet, mémoïser les objets passés en dépendances), `npm run generer:dossiers`, `npx tsx scripts/tester-pipeline.ts <id> [url] [sortie.json]`.

Dans un shell non interactif : `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` avant npm. Next.js 16 refuse deux `next dev` sur le même projet : l'utilisateur lance le sien (port 3000), tester contre lui.

## 3. Structure du dépôt

```
src/app/page.tsx                       Accueil : bienvenue, « Entrer » et « Mode d'emploi », les 3 modules, aperçu de la bannette
src/app/mode-d-emploi/page.tsx         Mode d'emploi complet (10 sections), alimenté par les données et paramètres du code
src/app/ged/page.tsx                   Module 1 · GED (composant module-ged : prise en charge, lecture, typage)
src/app/dossiers/page.tsx              Module 2 · Traitement : bannette filtrable + rappel des 5 étapes
src/app/dossiers/[id]/layout.tsx       Bandeau du dossier (fil d'Ariane, statut, n° d'enregistrement, fil des étapes, journal), 404 si id inconnu
src/app/dossiers/[id]/{decoupage,extraction,conformite,decision,export}/page.tsx
src/app/solis/page.tsx                 Module 3 · Solis : référentiel des usagers, demandes enregistrées, usagers créés
src/app/outils/ocr/page.tsx            Banc d'essai OCR (upload libre)
src/app/api/ged/lots/route.ts          GET : lots et dossiers de la GED simulée
src/app/api/dossiers/[id]/ocr/route.ts POST : lit public/ged/<lot>/<id>.pdf, OCR Mistral
src/app/api/dossiers/[id]/pieces/route.ts  GET ?pages=&nom= : PDF d'une pièce seule (découpage physique, retour GED)
src/app/api/extraction/route.ts        POST { type, markdown, modele? } : extraction structurée
src/app/api/solis/route.ts             POST { action: rechercher | enregistrer } : Solis simulé
src/app/api/ocr/route.ts               POST multipart { file } : OCR d'un fichier envoyé
src/components/etapes/*.tsx            Les cinq étapes du poste de travail (client)
src/components/bannette.tsx            Bannette filtrable (module 2) + ApercuBannette (accueil) + cheminEtape/libelleEtape
src/components/module-ged.tsx          Module 1 : lots, dossiers, prise en charge
src/components/vue-solis.tsx           Module 3 : référentiel et demandes enregistrées
src/components/bandeau-module.tsx      En-tête de page d'un module + liens vers les deux autres
src/components/rapprochement-usager.tsx  Identitovigilance : candidats Solis, confirmation par l'agent
src/components/{ui,en-tete,en-tete-dossier,visionneuse-pdf,ocr-bench}.tsx
src/lib/marque.ts                      Nom, accroche, collectivité, version
src/lib/modules.ts                     Les 3 modules (libellé, titre, chemin, description)
src/lib/etapes.ts                      Les 5 étapes et leur résumé (utilisable côté serveur, contrairement au store)
src/lib/mistral-ocr.ts                 Client OCR (server-only)
src/lib/decoupage.ts                   Classification des pages par règles (pied de page CERFA, mots-clés, page vide), pièces
src/lib/extraction/schemas.ts          Schémas JSON par type (certificat : volet complet), champs critiques, pages du CERFA
src/lib/extraction/mistral-extraction.ts  Prompt, appel chat, post-traitement (cases, IBAN, NIR) (server-only)
src/lib/regles/parametres.ts           Seuils et délais métier (PARAMETRES)
src/lib/regles/conformite.ts           Complétude, cohérences, rapprochement, recevabilité
src/lib/regles/decision.ts             Pré-instruction : règles, GIR estimé, orientation, statut et destinataire
src/lib/courriers.ts                   Accusé de réception, demande de pièces, transmission caisse, orientation MDPH, dates limites
src/lib/statuts.ts                     Statuts métier du dossier et libellés
src/lib/{dates,identifiants,dossier-utils}.ts
src/store/dossier-store.ts             État des dossiers (zustand persist) : statut, rapprochement, confirmations, courriers, journal
src/data/types.ts                      Modèle d'un dossier fictif
src/data/dossiers-fictifs.ts           6 usagers fictifs, 3 lots, scénarios attendus
src/data/solis.ts                      Base Solis simulée (4 usagers dont un homonyme et une demande en cours), recherche de candidats
scripts/generer-dossiers.ts            Génère public/ged/**/*.pdf (voir section 5)
scripts/tester-pipeline.ts             Test de bout en bout en CLI
public/ged/<lot>/<id>.pdf              Dossiers fictifs « numérisés » (13 Mo, versionnés)
Formulaire_demande_autonomie_cerfa_16301-01.pdf   CERFA officiel, 13 pages, AcroForm de 294 champs
old_version/                           Prototype v1 statique, exclu d'ESLint, ne pas modifier
instructions.md                        Brief brut de l'utilisateur
```

Git : dépôt local, branche `main`, pas de remote. Aucune identité git sur la machine : passer `-c user.name=hamiltonrmat -c user.email=hamiltonrmat@gmail.com` au commit. Messages de commit en français.

## 4. Le CERFA 16301*01

13 pages : 1 à 4 notice (page 4 = pièces justificatives), 5 à 9 formulaire, 10 mentions RGPD, 11 à 13 annexe certificat médical. Le pied de page « cerfa 16301*01 / n / 09/2023 » donne le numéro officiel de chaque page : c'est la clé du typage, du contrôle « formulaire complet » et du saut à la page d'un champ en vidéocodage (`pageCerfaPourChemin`).

Le PDF est un formulaire remplissable dont les champs ont des noms génériques. Le générateur les désigne par page et position ; les cases de dates, NIR, téléphone et code postal sont des séries de champs à un caractère ; les boutons radio sont cochés en dessinant.

Pièces obligatoires pour l'APA : justificatif d'identité, RIB, dernier avis d'imposition (demandeur et conjoint), formulaire complet et signé ; certificat médical facultatif, intégralement exploité (identité, pathologies, prises en charge, grille d'évaluation). Si concerné : décision de justice (mesure de protection), avis de taxe foncière (bien non loué).

Condition d'âge de l'APA : **60 ans et plus** (CERFA). `PARAMETRES.ageMinimumApa` vaut 60, à valider avec l'utilisateur, comme les délais (AR 10 jours, décision 2 mois après complétude, 30 jours de réponse pour les pièces).

## 5. Génération des dossiers fictifs et comportement de l'OCR

`npm run generer:dossiers` : remplit le CERFA (pdf-lib, aplatissement), dessine CNI, RIB, avis d'imposition, jugement, assemble dans l'ordre de « numérisation » du dossier, puis **rasterise** chaque page (150 dpi, JPEG q70). Variables : `VECTORIEL=1`, `DPI_SCAN`, `QUALITE_JPEG`, `STYLE_MARQUE=x|zapf`, `TAILLE_MARQUE`, `CONTOUR_CASES=0|1`, `DOSSIERS=D-2026-0305,...`, `SORTIE_DIR`.

Enseignements sur la lecture des cases à cocher par `mistral-ocr-latest` :

- Rendu retenu : **croix ZapfDingbats (✘, 8 pt) + contour explicite de toutes les cases + rasterisation**, le mieux lu parmi huit variantes testées le 14/09/2026.
- **La lecture n'est pas stable dans le temps** : un même PDF lu le 14/09 puis le 15/09 a donné des textes différents sur 8 pages sur 11 (cases du questionnaire présentes puis absentes). Aucun rendu ne garantit la lecture des cases ; la robustesse vient du post-traitement et du contrôle par l'agent.
- Post-traitement déterministe (`postTraitement`) : (1) un symbole de case cochée cité dans `extrait` mais absent du texte abaisse la confiance à 0,3 ; (2) pour tout champ à cases du CERFA, si la ligne d'origine ne contient aucun symbole de case, la valeur devient null (0,2) ; (3) pour les groupes de la partie 6, l'option seule sans case parmi des cases vides est retenue à 0,6 ; (4) IBAN et NIR sont relus par expression régulière et vérifiés par leur clé.
- L'annotation structurée de l'API OCR hallucine des valeurs plausibles : écartée. `mistral-medium` invente moins mais rate d'autres champs et prend deux fois plus de temps.
- Les champs non lus sont le fonctionnement normal du contrôle des données : l'agent complète, document en regard.

## 6. Scénarios de démonstration (src/data/dossiers-fictifs.ts)

| Dossier | Usager | Ce que la démo montre |
|---|---|---|
| D-2026-0301 | Jean DUPONT, 78 ans | Complet et conforme ; rapprochement par NIR avec un homonyme à écarter ; rattachement à l'usager existant |
| D-2026-0302 | Marie MEYER ép. LEROY, 83 ans | RIB absent → non recevable, avis commun (2 parts) |
| D-2026-0303 | Paul MARTIN, 58 ans | Condition d'âge non remplie → MDPH, PCH perçue (non-cumul) |
| D-2026-0304 | Simone BERNARD, 75 ans | 16 pages avec notice, RGPD et CM vierge écartés ; 4 « oui » → caisse de retraite |
| D-2026-0305 | Robert MOREAU, 86 ans | CNI en tête, CM en fin ; tutelle, signature de la tutrice, jugement absent → bloquant ; taxe foncière ; **demande déjà en cours dans Solis** → rattacher, pas de doublon |
| D-2026-0306 | Hélène GARNIER ép. PETIT, 80 ans | CNI expirée (règle +5 ans), date de naissance incohérente CERFA/CNI, déménagement récent |

Résultats vérifiés par `scripts/tester-pipeline.ts` le 15/09/2026 : 0301, 0304, 0305 conformes aux attentes, sauf les cases du questionnaire de 0301 non lues ce jour-là (variance OCR, champ « non lu » à compléter par l'agent).

## 7. Organisation en modules et parcours métier

Trois modules distincts (`src/lib/modules.ts`), affichés dans la barre du haut et sur l'accueil, pour que le traitement ne soit plus caché derrière l'écran d'arrivée des documents :

1. **GED** (`/ged`) : lots de numérisation, prise en charge d'un dossier (numéro d'enregistrement `REC-AAAA-nnnnnn`, statut `recu`, OCR, typage automatique).
2. **Dossiers** (`/dossiers`) : bannette filtrable (tous, à traiter, en attente de pièces, transmis) avec barre d'avancement, et les cinq étapes du dossier.
3. **Solis** (`/solis`) : référentiel des usagers fictifs, demandes enregistrées depuis le poste (lignes bleues sous la fiche de l'usager), usagers créés par l'outil.

Les cinq étapes d'un dossier :

1. **Typage des pièces** (`decoupage.ts`) : pied de page CERFA, mots-clés, pages vides écartées.
2. **Contrôle des données** (`extraction/`) : vidéocodage (document en regard, saut à la page du champ), champs critiques ★ à confirmer (`CHAMPS_CRITIQUES`), corrections journalisées avec avant/après, **rapprochement usager** (candidats Solis par NIR, état civil, homonymes ; confirmation par l'agent ; demande en cours signalée). Validation bloquée tant que tout n'est pas vérifié et rapproché.
3. **Complétude et recevabilité** (`regles/conformite.ts`) : pièces obligatoires et conditionnelles, formulaire complet (pages 5 à 9) sans doublon, un seul demandeur, signé et daté, cohérences CNI/RIB/avis/certificat, rapprochement. Statuts `ok | info | alerte | bloquant`. Délais (AR, complétude, décision) et courrier. À la validation : `dateCompletude` si recevable, statut `en_cours` ou `en_attente_pieces`.
4. **Pré-instruction** (`regles/decision.ts`) : recevabilité recalculée sur place, règles (âge, questionnaire, résidence, domicile de secours, non-cumul, **GIR estimé** par `estimerGir` sur les 14 items de la grille du certificat), orientation `instruction_apa | caisse_retraite | mdph | pieces_manquantes | indeterminee`, statut dérivé, courrier généré s'il manque.
5. **Enregistrement et transmission** (`api/solis` enregistrer) : usager créé ou rattaché, demande créée, rattachée ou mise à jour, statut transmis, courriers, retour GED (une route sert le PDF de chaque pièce).

Journal (`journal` dans le store) : prise en charge, OCR, typage, corrections, vérifications, rapprochement, recevabilité, courriers, orientation, enregistrement, navigation.

## 8. Règles de travail

- **Langue** : UI, documentation, commentaires et commits en français. Vocabulaire métier : module, typage, contrôle des données, complétude, pré-instruction, enregistrement, bannette.
- **Secrets** : `MISTRAL_API_KEY` dans `.env.local`, jamais préfixée `NEXT_PUBLIC_`, jamais affichée. Tout appel Mistral passe par `src/lib/mistral-ocr.ts` ou `src/lib/extraction/mistral-extraction.ts` (server-only).
- **Certificat médical** : intégralement exploité (décision de l'utilisateur, 06/10/2026). Le cloisonnement « pli cacheté » introduit le 15/09 a été retiré à sa demande : pas de pages masquées, pas d'extraction partielle. Le GIR estimé reste présenté comme **indicatif**, l'évaluation AGGIR à domicile faisant foi.
- **Identitovigilance** : jamais de rattachement automatique à un usager ; l'agent confirme.
- **Données** : uniquement fictives. Les NIR et IBAN fictifs ont une clé valide mais ne correspondent à personne.
- **Next.js 16** : lire `node_modules/next/dist/docs/` avant d'utiliser une API dont on n'est pas sûr. `LayoutProps`, `PageProps`, `RouteContext` sont des helpers globaux ; `params` est une promesse. Ne pas importer de constantes d'un module `"use client"` dans un composant serveur (le mode d'emploi importe `statuts.ts`, `decision.ts`, pas le store).
- **Vercel** : corps de requête plafonné à 4,5 Mo ; les PDF de la GED sont lus sur disque par les routes d'OCR et de pièces (`outputFileTracingIncludes` dans `next.config.ts`). Pour de vrais dossiers, prévoir un stockage et passer une URL à Mistral.
- **Outils absents** : Homebrew, `pdftotext`, Ghostscript. La rasterisation se fait en Node (pdfjs-dist + @napi-rs/canvas).

## 9. Glossaire

Solid'IA (l'outil), Solis (le logiciel métier de destination), APA, CERFA, NIR / NSS (15 chiffres), CNI, CMI, GIR (estimé à titre indicatif par l'outil, déterminé par l'EMS), EMS (équipe médico-sociale), GED, Solis (logiciel métier), bannette, vidéocodage, identitovigilance, date de dossier complet, MDPH, PCH, ACTP, MTP, PCRTP (non cumulables avec l'APA).

## 10. Prochaines étapes

1. Faire valider par l'utilisateur les règles, les seuils et délais (`PARAMETRES`), les textes de courriers.
2. Supabase : tables dossiers, pièces, extractions, rapprochements, courriers, journal, usagers Solis simulés ; bannette partagée avec affectation et ancienneté ; remplacer `persist` par des routes API. L'utilisateur doit fournir l'URL et les clés du projet.
3. Créer le dépôt GitHub, brancher Vercel (`MISTRAL_API_KEY` en variable d'environnement).
4. Pistes : tableau de bord dans le module Dossiers (volumes, délais, stock en attente), relances et clôture faute de pièces, dégradations de scan, courriers en PDF, autres prestations des solidarités que l'APA (le nom Solid'IA couvre l'ensemble des solidarités).
