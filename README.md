# InstructOCR — prototype v2

Outil d'instruction assistée des dossiers APA (Allocation Personnalisée d'Autonomie) : OCR des dossiers reçus, découpage en pièces, extraction des champs, contrôle de conformité, aide à la décision et export vers le logiciel métier.

Toutes les données utilisées sont fictives. Le projet sert de démonstration et de base d'architecture.

## Prérequis

- Node.js 24 (installé via nvm) et npm.
- Une clé API Mistral pour la partie OCR.

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
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | Analyse statique ESLint |

## Structure

- `src/app/` : pages et route handlers (App Router).
- `src/app/api/ocr/route.ts` : endpoint POST qui reçoit un fichier et renvoie le Markdown OCR page par page.
- `src/lib/mistral-ocr.ts` : client serveur de l'API OCR Mistral.
- `src/components/` : composants React.
- `old_version/` : premier prototype statique, conservé comme référence.
- `CLAUDE.md` : documentation de travail détaillée du projet.
