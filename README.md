# Solid'IA — prototype v2

**Solid'IA, le traitement intelligent des dossiers des solidarités de la Collectivité européenne d'Alsace.**

Outil de pré-instruction des dossiers APA (Allocation Personnalisée d'Autonomie), organisé en trois modules :

1. **GED** — arrivée des dossiers numérisés, lots de numérisation, prise en charge d'un dossier.
2. **Dossiers** — bannette du poste de travail et cinq étapes de pré-instruction : typage des pièces, contrôle des données en vidéocodage avec rapprochement de l'usager, complétude et recevabilité avec délais et courriers, pré-instruction et orientation, enregistrement et transmission.
3. **Solis** — référentiel des usagers et demandes enregistrées, simulation du logiciel métier de l'action sociale.

Chaque action de l'agent est journalisée. Toutes les données sont fictives : le projet sert de démonstration et de base d'architecture.

## Prérequis

- Node.js 24 (installé via nvm) et npm.
- Une clé API Mistral (lecture des documents et extraction structurée).

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

Le mode d'emploi complet est dans l'application (`/mode-d-emploi`).

## Structure

- `src/app/page.tsx` : accueil, présentation des trois modules.
- `src/app/{ged,dossiers,solis}/page.tsx` : les trois modules.
- `src/app/dossiers/[id]/*` : les cinq étapes d'un dossier.
- `src/app/api/` : GED simulée, lecture d'un dossier, découpage physique des pièces, extraction, Solis simulé.
- `src/components/etapes/` : les cinq étapes ; `bannette.tsx`, `module-ged.tsx`, `vue-solis.tsx`, `rapprochement-usager.tsx`, `bandeau-module.tsx`.
- `src/lib/` : client OCR, typage, schémas et extraction, règles (paramètres, complétude, pré-instruction), courriers, statuts, étapes, marque, modules.
- `src/data/` : usagers fictifs, lots GED, base Solis simulée.
- `src/store/` : état des dossiers en cours (localStorage), journal des actions.
- `scripts/` : générateur de dossiers fictifs, test de pipeline.
- `public/ged/` : dossiers fictifs numérisés (PDF).
- `old_version/` : premier prototype statique, conservé comme référence.
- `CLAUDE.md` : documentation de travail détaillée.
