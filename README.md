# InstructOCR — prototype v2

Outil de pré-instruction des dossiers APA (Allocation Personnalisée d'Autonomie) : import depuis une GED simulée, OCR du dossier numérisé, typage des pièces avec mise sous pli du certificat médical, contrôle des données en vidéocodage, rapprochement de l'usager avec le logiciel métier, complétude et recevabilité avec délais et courriers, pré-instruction et orientation, enregistrement dans Solis (simulé) et retour des pièces vers la GED. Chaque action de l'agent est journalisée.

Toutes les données sont fictives. Le projet sert de démonstration et de base d'architecture.

## Prérequis

- Node.js 24 (installé via nvm) et npm.
- Une clé API Mistral (OCR et extraction structurée).

## Installation

```bash
npm install
cp .env.example .env.local   # puis renseigner MISTRAL_API_KEY
npm run dev                   # http://localhost:3000
```

Sur Vercel, renseigner `MISTRAL_API_KEY` dans les variables d'environnement du projet.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (avec type-check) |
| `npm run start` | Sert le build de production |
| `npm run lint` | Analyse statique ESLint |
| `npm run generer:dossiers` | Régénère les dossiers fictifs PDF dans `public/ged/` à partir du CERFA officiel |
| `npx tsx scripts/tester-pipeline.ts D-2026-0305` | Test de bout en bout d'un dossier contre le serveur de dev |

## Parcours dans l'application

1. **Import GED** (`/ged`) : choix d'un lot et d'un dossier, numéro d'enregistrement, OCR immédiat.
2. **Typage des pièces** : classification de chaque page, regroupement en pièces, certificat médical mis sous pli, correction par l'agent.
3. **Contrôle des données** : extraction structurée en regard du document, champs critiques à vérifier, rapprochement de l'usager avec Solis.
4. **Complétude et recevabilité** : pièces obligatoires et conditionnelles, formulaire complet et signé, cohérences, délais, courrier à l'usager.
5. **Pré-instruction** : règles administratives, orientation retenue par l'agent, statut du dossier.
6. **Enregistrement et transmission** : création ou rattachement de l'usager, enregistrement de la demande, transmission, pièces déposées dans la GED.

Le mode d'emploi complet est dans l'application (`/mode-d-emploi`).

## Structure

- `src/app/` : pages (App Router) et route handlers `api/` (GED, OCR d'un dossier, découpage physique des pièces, extraction, Solis).
- `src/components/etapes/` : les cinq étapes du poste de travail ; `rapprochement-usager.tsx`, `en-tete-dossier.tsx` (statut, journal).
- `src/lib/` : OCR Mistral, typage, secret médical, schémas et extraction, règles (paramètres, complétude, pré-instruction), courriers, statuts, utilitaires.
- `src/data/` : usagers fictifs, lots GED, base Solis simulée.
- `src/store/` : état des dossiers en cours (localStorage), journal des actions.
- `scripts/` : générateur de dossiers fictifs, test de pipeline.
- `public/ged/` : dossiers fictifs numérisés (PDF).
- `old_version/` : premier prototype statique, conservé comme référence.
- `CLAUDE.md` : documentation de travail détaillée.
