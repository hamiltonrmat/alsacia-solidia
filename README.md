# InstructOCR — prototype v2

Outil d'instruction assistée des dossiers APA (Allocation Personnalisée d'Autonomie) : import depuis une GED simulée, OCR du dossier numérisé, découpage en pièces, extraction des champs avec score de confiance, contrôle de conformité, aide à la décision et export vers le logiciel métier Solis (simulé).

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

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (avec type-check) |
| `npm run start` | Sert le build de production |
| `npm run lint` | Analyse statique ESLint |
| `npm run generer:dossiers` | Régénère les dossiers fictifs PDF dans `public/ged/` à partir du CERFA officiel |
| `npx tsx scripts/tester-pipeline.ts D-2026-0305` | Test de bout en bout d'un dossier contre le serveur de dev (OCR, découpage, extraction, règles, Solis) |

## Parcours dans l'application

1. **Import GED** (`/ged`) : choix d'un lot de numérisation et d'un dossier, OCR immédiat.
2. **Découpage** : classification de chaque page, regroupement en pièces, correction par l'agent.
3. **Pré-contrôle** : extraction structurée des champs de chaque pièce, score de confiance, correction.
4. **Conformité** : pièces obligatoires, validité et cohérence, pré-recevabilité, courrier de demande de pièces.
5. **Aide à la décision** : règles administratives, orientation proposée, décision de l'agent.
6. **Export Solis** : recherche de l'usager, création ou rattachement, métadonnées transmises.

## Structure

- `src/app/` : pages (App Router) et route handlers `api/` (GED, OCR d'un dossier, extraction, Solis).
- `src/components/etapes/` : les cinq étapes du poste de travail.
- `src/lib/` : OCR Mistral, découpage, schémas et extraction, règles de conformité et de décision, utilitaires.
- `src/data/` : usagers fictifs, lots GED, base Solis simulée.
- `src/store/` : état des dossiers en cours (localStorage).
- `scripts/` : générateur de dossiers fictifs, test de pipeline.
- `public/ged/` : dossiers fictifs numérisés (PDF).
- `old_version/` : premier prototype statique, conservé comme référence.
- `CLAUDE.md` : documentation de travail détaillée.
