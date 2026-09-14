# InstructOCR — Prototype OCR pour l'instruction des dossiers APA

Ce fichier est la référence de travail pour ce projet. Le brief d'origine de l'utilisateur est dans `instructions.md` (conserver tel quel, c'est la source). Ce document le structure et le complète avec ce qui est observable dans le dépôt.

Règles Next.js 16 pour les agents (régénérées par `next dev`) : @AGENTS.md

## 1. Contexte

Outil d'aide à l'instruction des dossiers APA (Allocation Personnalisée d'Autonomie) pour la Collectivité européenne d'Alsace. Un dossier reçu (scan ou courrier) est OCRisé, découpé en pièces (CERFA + CNI + certificat médical + ...), ses données sont extraites et hiérarchisées, contrôlées, puis l'outil propose une orientation selon les pièces et les règles métier, avant export vers le logiciel métier Solis.

Toutes les données manipulées sont **synthétiques**. Le but est la démonstration et l'architecture d'une vraie solution, jamais le traitement de données personnelles réelles.

## 2. Stack (décidée le 14/09/2026)

| Élément | Choix | Notes |
|---|---|---|
| Runtime | Node.js 24 LTS via nvm (`~/.nvm`), npm 11 | Hook nvm dans `~/.zprofile`. `~/.zshrc` appartient à root, ne pas y toucher |
| Framework | Next.js 16.3 (App Router, Turbopack), React 19, TypeScript | Dossier `src/`, alias `@/*` |
| Styles | Tailwind CSS 4 | Composants maison dans `src/components/ui.tsx` |
| État client | zustand + `persist` (localStorage, clé `instructocr-dossiers`) | Un dossier importé progresse d'étape en étape dans le navigateur |
| OCR | API Mistral `POST /v1/ocr`, `mistral-ocr-latest` | Serveur uniquement, `fetch` sans SDK, Markdown par page |
| Extraction | API Mistral chat, sortie JSON contrainte (`response_format: json_schema`, strict) | `mistral-small-latest` par défaut, surcharge par requête (`modele`) |
| Génération PDF | pdf-lib (remplissage du CERFA, pièces dessinées) + pdfjs-dist et @napi-rs/canvas (rasterisation) | Dev dependencies, script `tsx` |
| Hébergement cible | Vercel + GitHub | Pas encore de dépôt distant. Supabase envisagé pour les usagers |

Commandes : `npm run dev`, `npm run build` (type-check inclus, y compris `scripts/`), `npm run lint` (ESLint 9, règles React 19 : pas de `setState` direct dans un effet), `npm run generer:dossiers`, `npx tsx scripts/tester-pipeline.ts <id> [url] [sortie.json]`.

Dans un shell non interactif : `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"` avant npm. Next.js 16 refuse deux `next dev` sur le même projet : si l'utilisateur a lancé le sien (port 3000), tester contre lui.

## 3. Structure du dépôt

```
src/app/page.tsx                       Accueil, dossiers en cours, parcours
src/app/ged/page.tsx                   Import GED (composant import-ged)
src/app/dossiers/[id]/layout.tsx       Bandeau du dossier + fil des étapes (404 si id inconnu)
src/app/dossiers/[id]/{decoupage,extraction,conformite,decision,export}/page.tsx
src/app/outils/ocr/page.tsx            Banc d'essai OCR (upload libre)
src/app/api/ged/lots/route.ts          GET : lots et dossiers de la GED simulée
src/app/api/dossiers/[id]/ocr/route.ts POST : lit public/ged/<lot>/<id>.pdf, OCR Mistral
src/app/api/extraction/route.ts        POST { type, markdown, modele? } : extraction structurée
src/app/api/solis/route.ts             POST { action: rechercher | exporter } : Solis simulé
src/app/api/ocr/route.ts               POST multipart { file } : OCR d'un fichier envoyé
src/components/etapes/*.tsx            Les cinq étapes du poste de travail (client)
src/components/{ui,en-tete,en-tete-dossier,import-ged,visionneuse-pdf,dossiers-en-cours,ocr-bench}.tsx
src/lib/mistral-ocr.ts                 Client OCR (server-only)
src/lib/decoupage.ts                   Classification des pages par règles, regroupement en pièces
src/lib/extraction/schemas.ts          Schémas JSON par type de pièce, libellés, aplatissement
src/lib/extraction/mistral-extraction.ts  Prompt, appel chat, post-traitement IBAN/NIR (server-only)
src/lib/regles/conformite.ts           Phase 2 : contrôles, recevabilité, courrier de pièces
src/lib/regles/decision.ts             Phase 3 : règles, orientation, GIR estimé, PARAMETRES
src/lib/{dates,identifiants,dossier-utils}.ts
src/store/dossier-store.ts             État des dossiers (zustand persist), valeurEffective
src/data/types.ts                      Modèle d'un dossier fictif
src/data/dossiers-fictifs.ts           6 usagers fictifs, 3 lots, scénarios attendus
src/data/solis.ts                      Base Solis simulée, recherche par NIR puis état civil
scripts/generer-dossiers.ts            Génère public/ged/**/*.pdf (voir section 5)
scripts/tester-pipeline.ts             Test de bout en bout en CLI
public/ged/<lot>/<id>.pdf              Dossiers fictifs « numérisés » (13 Mo, versionnés)
Formulaire_demande_autonomie_cerfa_16301-01.pdf   CERFA officiel, 13 pages, AcroForm de 294 champs
old_version/                           Prototype v1 statique, exclu d'ESLint, ne pas modifier
instructions.md                        Brief brut de l'utilisateur
```

Git : dépôt local, branche `main`, pas de remote. Aucune identité git sur la machine : passer `-c user.name=hamiltonrmat -c user.email=hamiltonrmat@gmail.com` au commit. Messages de commit en français.

## 4. Le CERFA 16301*01

13 pages : 1 à 4 notice (page 4 = pièces justificatives), 5 à 9 formulaire, 10 mentions RGPD, 11 à 13 annexe certificat médical. Le pied de page « cerfa 16301*01 / n / 09/2023 » donne le numéro officiel de chaque page : c'est la clé du découpage.

Le PDF est un formulaire remplissable dont les champs ont des noms génériques (« Champ de texte 185 », « Case d'option 7 »). Le générateur les désigne par page et position (y depuis le haut, x si ambigu), relevées une fois pour toutes ; les cases de dates, NIR, téléphone et code postal sont des séries de champs à un caractère. Les boutons radio ont des états `/0`, `/1`... par option, mais on ne passe pas par le formulaire pour les cocher : on dessine.

Pièces obligatoires pour l'APA : justificatif d'identité, RIB, dernier avis d'imposition (demandeur et conjoint), certificat médical facultatif. Si concerné : décision de justice (mesure de protection), avis de taxe foncière (bien non loué).

Condition d'âge de l'APA : **60 ans et plus** (CERFA). La v1 évoquait 50 ans comme dérogation ; `PARAMETRES.ageMinimumApa` vaut 60, à valider avec l'utilisateur.

## 5. Génération des dossiers fictifs et comportement de l'OCR

`npm run generer:dossiers` : remplit le CERFA (pdf-lib, aplatissement), dessine CNI, RIB, avis d'imposition, jugement sur des pages A4, assemble dans l'ordre de « numérisation » du dossier, puis **rasterise** chaque page (150 dpi, JPEG q70) pour obtenir un vrai scan. Variables : `VECTORIEL=1`, `DPI_SCAN`, `QUALITE_JPEG`, `STYLE_MARQUE=x|zapf`, `TAILLE_MARQUE`, `CONTOUR_CASES=0|1`, `DOSSIERS=D-2026-0305,...`, `SORTIE_DIR`.

Enseignements mesurés le 14/09/2026 sur la lecture des cases à cocher par `mistral-ocr-latest` (déterministe d'une lecture à l'autre) :

- Le rendu retenu est **croix ZapfDingbats (✘, 8 pt) + contour explicite de toutes les cases + rasterisation**. Il est le seul à faire lire la page 7 du formulaire (civilité du proche, lien, questionnaire d'autonomie, prestations) et la grille du certificat médical.
- Le glyphe « X » gras lit mieux la partie 6 (propriétaire / occupation) mais perd la page 7. Les tracés vectoriels (traits, carré plein, coche) sont les moins bien lus.
- Sur certaines lignes (partie 6 « Propriétaire », « Non louée », CMI partie 7), la **case cochée disparaît** de la lecture alors que les cases vides restent (□). Le prompt d'extraction décrit cette heuristique (option sans symbole parmi des □ = cochée, confiance 0,6). `mistral-small-latest` ne l'applique pas toujours et peut inventer un ☑ dans `extrait`.
- L'annotation structurée de l'API OCR (`document_annotation_format`, modèle de vision) hallucine des valeurs plausibles quand une case est illisible : écartée.
- Les longues suites de chiffres peuvent perdre un chiffre à l'extraction : IBAN et NIR sont relus par expression régulière dans le Markdown et vérifiés par leur clé (`postTraitement`). Les dates en cases « 2 0 0 7 2 0 2 6 » doivent être lues JJ MM AAAA (règle explicite dans le prompt).
- Les champs non lus sont le fonctionnement normal du pré-contrôle : l'agent complète. Ne pas chercher à tout automatiser.

## 6. Scénarios de démonstration (src/data/dossiers-fictifs.ts)

| Dossier | Usager | Ce que la démo montre |
|---|---|---|
| D-2026-0301 | Jean DUPONT, 78 ans | Complet et conforme, 3 « non » → APA, usager connu de Solis (APA 2019) → rattachement |
| D-2026-0302 | Marie MEYER ép. LEROY, 83 ans | RIB absent → non recevable, avis commun (2 parts) |
| D-2026-0303 | Paul MARTIN, 58 ans | Condition d'âge non remplie → MDPH, PCH perçue (non-cumul) |
| D-2026-0304 | Simone BERNARD, 75 ans | 16 pages avec notice, RGPD et CM vierge écartés ; 4 « oui » → caisse de retraite |
| D-2026-0305 | Robert MOREAU, 86 ans | CNI en tête, CM en fin ; tutelle, signature de la tutrice, jugement absent → bloquant ; taxe foncière |
| D-2026-0306 | Hélène GARNIER ép. PETIT, 80 ans | CNI expirée (règle +5 ans), date de naissance incohérente CERFA/CNI, déménagement récent |

Résultats vérifiés par `scripts/tester-pipeline.ts` le 14/09/2026 : 0301, 0304, 0305, 0306 conformes aux attentes, à l'exception de la CMI (jamais lue) et, selon le modèle, de l'occupation du logement.

## 7. Workflow métier (3 phases)

1. **Découpage et extraction** (`decoupage.ts`, `extraction/`). Score de confiance par pièce, page et champ. L'agent contrôle, complète et valide.
2. **Conformité et recevabilité** (`regles/conformite.ts`). Statuts `ok | info | alerte | bloquant`. Un bloquant rend le dossier non recevable ; une alerte le rend recevable sous réserve. Courrier de demande de pièces généré.
3. **Aide à la décision** (`regles/decision.ts`). Orientation `instruction_apa | caisse_retraite | mdph | pieces_manquantes | indeterminee`. GIR estimé indicatif à partir de la grille du certificat médical. L'agent retient l'orientation finale et commente.

L'expertise métier appartient à l'utilisateur : les règles sont un premier jeu à affiner avec lui.

## 8. Règles de travail

- **Langue** : UI, documentation, commentaires et commits en français.
- **Secrets** : `MISTRAL_API_KEY` dans `.env.local`, jamais préfixée `NEXT_PUBLIC_`, jamais affichée. Tout appel Mistral passe par `src/lib/mistral-ocr.ts` ou `src/lib/extraction/mistral-extraction.ts` (server-only).
- **Données** : uniquement fictives. Les NIR et IBAN fictifs ont une clé valide mais ne correspondent à personne.
- **Next.js 16** : lire `node_modules/next/dist/docs/` avant d'utiliser une API dont on n'est pas sûr. `LayoutProps`, `PageProps`, `RouteContext` sont des helpers globaux ; `params` est une promesse.
- **Vercel** : corps de requête plafonné à 4,5 Mo ; les PDF de la GED sont lus sur disque par la route d'OCR (`outputFileTracingIncludes` dans `next.config.ts`). Pour de vrais dossiers, prévoir un stockage et passer une URL à Mistral.
- **Outils absents** : Homebrew, `pdftotext`, Ghostscript. La rasterisation se fait en Node (pdfjs-dist + @napi-rs/canvas).

## 9. Glossaire

APA (Allocation Personnalisée d'Autonomie), CERFA, NIR / NSS (15 chiffres), CNI, CMI (carte mobilité inclusion), GIR (groupe iso-ressources, 1 à 6), EMS (équipe médico-sociale), GED, Solis (logiciel métier), MDPH, PCH, ACTP, MTP, PCRTP (prestations non cumulables avec l'APA).

## 10. Prochaines étapes

1. Faire valider par l'utilisateur les règles de conformité et de décision, et les paramètres (`PARAMETRES`).
2. Choisir le modèle d'extraction du CERFA (small vs medium) selon le compromis coût / fiabilité des cases.
3. Créer le dépôt GitHub, brancher Vercel ; décider de Supabase pour remplacer le localStorage.
4. Pistes : persistance serveur des dossiers, journal des actions de l'agent, génération de PDF de courrier, dégradations de scan (inclinaison, bruit).
