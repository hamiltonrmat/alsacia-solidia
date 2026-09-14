# InstructOCR — Prototype OCR pour l'instruction des dossiers APA

Ce fichier est la référence de travail pour ce projet. Le brief d'origine de l'utilisateur est dans `instructions.md` (conserver tel quel, c'est la source). Ce document le structure et le complète avec ce qui est observable dans le dépôt.

Règles Next.js 16 pour les agents (régénérées par `next dev`) : @AGENTS.md

## 1. Contexte

Outil d'aide à l'instruction des dossiers APA (Allocation Personnalisée d'Autonomie) pour la Collectivité européenne d'Alsace. Un dossier reçu (scan ou courrier) est OCRisé, découpé en pièces (CERFA + CNI + certificat médical + ...), ses données sont extraites et hiérarchisées, contrôlées, puis l'outil propose des instructions de décision selon les pièces et les règles métier.

Toutes les données manipulées sont **synthétiques**. Le but est la démonstration et l'architecture d'une vraie solution, jamais le traitement de données personnelles réelles.

## 2. Stack de la v2 (décidée le 14/09/2026)

| Élément | Choix | Notes |
|---|---|---|
| Runtime | Node.js 24 LTS via nvm (`~/.nvm`), npm 11 | Hook nvm dans `~/.zprofile`. `~/.zshrc` appartient à root, ne pas y toucher |
| Framework | Next.js 16.3 (App Router, Turbopack), React 19, TypeScript | Généré par `create-next-app`, dossier `src/`, alias `@/*` |
| Styles | Tailwind CSS 4 | Design à reprendre de `old_version/styles.css` (polices Outfit / Plus Jakarta Sans) au moment de construire l'UI |
| OCR | API Mistral `POST /v1/ocr`, modèle `mistral-ocr-latest` | Appel serveur uniquement, via `fetch`, sans SDK. Renvoie du Markdown par page |
| Hébergement cible | Vercel + GitHub | Pas encore de dépôt distant. Supabase envisagé pour les usagers |

Commandes : `npm run dev` (http://localhost:3000), `npm run build`, `npm run start`, `npm run lint`. Le build fait le type-check TypeScript ; ESLint ne s'exécute plus au build en Next 16, lancer `npm run lint` séparément.

Dans un shell non interactif (ex. Bash de l'agent), sourcer nvm avant npm : `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"`.

## 3. Structure du dépôt

```
src/app/layout.tsx            Layout racine (lang fr, métadonnées)
src/app/page.tsx              Accueil + banc d'essai OCR
src/app/api/ocr/route.ts      POST multipart { file } → { fileName, model, pages[], usage }
src/lib/mistral-ocr.ts        Client serveur Mistral OCR (import "server-only")
src/components/ocr-bench.tsx  Composant client d'upload et d'affichage page par page
.env.local                    MISTRAL_API_KEY (ignoré par git)   .env.example : modèle
Formulaire_demande_autonomie_cerfa_16301-01.pdf   CERFA officiel de référence, 13 pages
old_version/                  Prototype v1 statique, conservé tel quel, exclu d'ESLint
instructions.md               Brief brut de l'utilisateur
```

Git est initialisé en local (branche `main`). Aucune identité git n'est configurée sur la machine (`user.name` / `user.email` absents) : ne pas modifier la config, passer `-c user.name=... -c user.email=...` au commit ou demander à l'utilisateur de la configurer.

## 4. Le CERFA 16301*01 (référence pour l'extraction)

Vérifié par OCR Mistral le 14/09/2026 : 13 pages, toutes bien reconnues.

| Pages | Contenu | Utilité pour l'outil |
|---|---|---|
| 1 à 4 | Notice explicative | Page 4 = liste des pièces justificatives obligatoires (base des règles de recevabilité) |
| 5 à 9 | Formulaire à remplir | Champs à extraire, voir ci-dessous |
| 10 | Mentions RGPD | Aucune donnée |
| 11 à 13 | Annexe : certificat médical | Pièce distincte à détecter et découper |

Sections du formulaire : cadre administration (n° dossier, date de réception) ; 1 situation du demandeur (identité, NSS 15 chiffres, caisse de retraite, coordonnées, type de domicile, ancien lieu de résidence) ; situation familiale et conjoint ; 2 mesure de protection ; 3 personne proche à contacter ; 4 identification de l'organisme compétent (4 questions oui/non, 2 « non » ou plus = APA département, sinon caisse de retraite) ; 5 autres prestations (ACTP, PCH, MTP, ...) ; 6 ressources et patrimoine ; 7 demande de CMI ; 8 signature.

Pièces obligatoires pour l'APA (page 4) : justificatif d'identité, RIB, dernier avis d'imposition du demandeur et du conjoint, certificat médical (facultatif, sous pli cacheté). Si concerné : décision de justice de mise sous protection, avis de taxe foncière.

Règle de la v1 à réconcilier : la v1 évoquait « autonomie de niveau 1 réservée aux 50 ans et plus ». Le CERFA réel fixe la condition d'âge de l'APA à **60 ans et plus**. Valider avec l'utilisateur avant d'implémenter les règles de décision.

## 5. `old_version/` — prototype v1

Application 100 % front, HTML/CSS/JS vanilla, sans build. Tout l'état est codé en dur dans `app.js` (lots, dossiers, champs OCR, conformité). SPA à 5 onglets : Chargement, Découpage, Pré-contrôle, Conformité, Aide à Décision. `dossier_apa.html` est un faux dossier converti en PDF par `generate_pdf.ps1` (Windows uniquement). `dossier_apa_extrait.md` simule une extraction OCR imparfaite. `OCR - Workflow Outil.md` est la spécification métier des 3 phases.

Hiérarchie de données : **Lot** de numérisation → **Dossier** usager → **Pièces** (`cerfa`, `cni`, `cm`) → **Champs** avec score de confiance.

## 6. Workflow métier (3 phases)

1. **Découpage et extraction.** Un dossier devient un CERFA suivi de ses pièces justificatives. Pour chaque type de pièce, un schéma d'extraction déclare les champs à récupérer. Score OCR par lot, dossier, document, page et champ. L'agent contrôle, complète et valide.
2. **Conformité et recevabilité.** Contrôle intrinsèque de chaque pièce (CNI du demandeur, validité), puis vérification des pièces obligatoires selon le type de demande. Prévoir plusieurs niveaux de contrôle pour qu'une erreur OCR mineure ne bloque pas un dossier presque conforme.
3. **Aide à la décision.** Application des règles métier sur un dossier recevable. L'expertise métier appartient à l'utilisateur.

## 7. Objectifs de la v2 (résumé de `instructions.md`)

- Application **réellement fonctionnelle**, OCR par l'API Mistral. Fait : clé fournie et validée, endpoint `/api/ocr` opérationnel.
- Générer des **dossiers usagers fictifs en PDF** à partir du CERFA 16301-01, avec des cas intéressants (pièces manquantes, données ambiguës, âges limites, doublons).
- Page **Import** simulant une **GED** fictive listant les dossiers à traiter.
- Page finale **Export** simulant le logiciel métier **Solis** : création de l'usager si première demande, sinon rattachement du dossier à l'usager existant.
- Déploiement Vercel + GitHub, Supabase envisagé pour la persistance des usagers.

## 8. Règles de travail

- **Langue** : UI, documentation, commentaires et messages de commit en français.
- **Secrets** : jamais de clé dans le code ni dans le dépôt. `MISTRAL_API_KEY` dans `.env.local`, jamais préfixée `NEXT_PUBLIC_`. Tout appel Mistral passe par `src/lib/mistral-ocr.ts` côté serveur.
- **Données** : uniquement des données fictives, y compris fixtures et captures.
- **Next.js 16** : lire `node_modules/next/dist/docs/` avant d'utiliser une API dont on n'est pas sûr, les conventions ont changé (voir AGENTS.md).
- **Limite Vercel** : le corps d'une requête vers une fonction est plafonné à 4,5 Mo. Pour les dossiers scannés volumineux, prévoir un stockage (Supabase Storage ou Vercel Blob) et passer une URL à Mistral (`document_url` https) au lieu d'un base64.
- **Génération de PDF** : `generate_pdf.ps1` ne fonctionne pas sur macOS. Prévoir une méthode multiplateforme (bibliothèque JS de génération PDF ou impression headless Chromium).
- **Outils absents** : Homebrew et `pdftotext` ne sont pas installés. Python 3.9 système disponible.

## 9. Glossaire

- **APA** : Allocation Personnalisée d'Autonomie. **CERFA** : formulaire administratif normalisé. **NIR / NSS** : numéro de sécurité sociale, 15 chiffres. **CNI** : carte nationale d'identité. **CMI** : carte mobilité inclusion. **GED** : gestion électronique des documents. **Solis** : logiciel métier cible de l'export. **EMS** : équipe médico-sociale.

## 10. Prochaines étapes

1. Construire le workflow complet dans l'app (import GED → découpage → extraction → conformité → décision → export Solis) en reprenant l'ergonomie des 5 onglets de la v1.
2. Définir le schéma d'extraction du CERFA (sections 1 à 8) et des pièces jointes, puis l'extraction structurée à partir du Markdown OCR (règles ou modèle Mistral en aval de l'OCR).
3. Produire un jeu de dossiers fictifs en PDF couvrant les cas de test.
4. Créer le dépôt GitHub, brancher Vercel, décider de Supabase.
