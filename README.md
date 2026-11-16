# Solid'IA — prototype v3

**Solid'IA, le traitement intelligent des dossiers des solidarités de la Collectivité européenne d'Alsace.**

Outil de contrôle des dossiers de demande d'APA (Allocation Personnalisée d'Autonomie), de leur arrivée dans la GED à leur enregistrement dans Solis, le logiciel métier. Le menu propose, après l'accueil :

1. **Traitement des dossiers** — le parcours d'un dossier en cinq étapes : GED (prise en charge et lecture OCR), déliassage, contrôle des données en vidéocodage avec rapprochement de l'usager, complétude et conformité par le moteur de règles métier avec génération du rapport de contrôle, enregistrement et transmission dans Solis.
2. **Schéma de l'outil** — l'outil en une page : le parcours d'un dossier, qui fait quoi à chaque étape, et l'architecture technique.
3. **Règles métier** — le catalogue des règles de complétude et de conformité, consultable rapidement (recherche, filtres), avec les paramètres et le périmètre du moteur.
4. **Mode d'emploi** — parcours pas à pas, lecture des indicateurs, rapport de contrôle, dossiers de démonstration.

L'outil n'apprécie pas le droit à la prestation : tout dossier contrôlé est transmis à Solis, complet ou non, où l'instruction en décide. Chaque action de l'agent est journalisée. Toutes les données sont fictives : le projet sert de démonstration et de base d'architecture.

## Versions

- **v3** (novembre 2026) : le dossier va de la GED à Solis sans appréciation du droit (pré-instruction et courriers supprimés, l'instruction se fait dans Solis) ; moteur de règles métier en catalogue, consultable sur sa propre page ; rapport de contrôle PDF structuré (robustesse de la lecture globale et par page, déliassage, champs contrôlés, règles appliquées, JSON joint, empreinte SHA-256) transmis avec le dossier ; schéma de l'outil.
- **v2** (septembre-octobre 2026) : application Next.js, OCR et extraction Mistral, dossiers fictifs générés depuis le CERFA, contrôle des données, rapprochement d'usager, pré-instruction et orientation, protection par mot de passe.
- **v1** : maquette statique, conservée dans `old_version/`.

## Prérequis

- Node.js 24 et npm.
- Une clé API Mistral (lecture des documents et extraction structurée).

## Installation

```bash
npm install
cp .env.example .env.local   # puis renseigner MISTRAL_API_KEY
npm run dev                   # http://localhost:3000
```

Sous Windows, si PowerShell refuse `npm` (stratégie d'exécution), utiliser `npm.cmd` et `npx.cmd`. Si le port 3000 est occupé : `npm run dev -- -p 3100`.

Pour exiger le mot de passe en local : `SOLIDIA_MOT_DE_PASSE="demo" npm run dev`.

## Déploiement

La procédure complète est dans [DEPLOIEMENT.md](DEPLOIEMENT.md) : dépôt GitHub, projet Vercel et trois variables d'environnement (`MISTRAL_API_KEY`, `SOLIDIA_MOT_DE_PASSE`, `SOLIDIA_SECRET_SESSION`). L'entrée est protégée par un mot de passe unique ; sans la variable, l'accès est libre, ce qui ne convient qu'au développement local.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (avec type-check) |
| `npm run start` | Sert le build de production |
| `npm run lint` | Analyse statique ESLint |
| `npm run generer:dossiers` | Régénère les dossiers fictifs PDF dans `public/ged/` à partir du CERFA officiel |
| `npx tsx scripts/tester-pipeline.ts D-2026-0305 [url] [sortie.json] [rapport.pdf]` | Test de bout en bout d'un dossier contre un serveur lancé, rapport PDF compris |

Le mode d'emploi complet est dans l'application (`/mode-d-emploi`).

## Structure

- `src/app/page.tsx` : accueil.
- `src/app/dossiers/page.tsx` : traitement des dossiers (GED et bannette) ; `src/app/dossiers/[id]/*` : les quatre étapes d'un dossier pris en charge.
- `src/app/solis/page.tsx` : Solis simulé, destination des dossiers transmis.
- `src/app/schema/page.tsx` : schéma de l'outil ; `src/app/regles/page.tsx` : règles métier ; `src/app/mode-d-emploi/page.tsx` : mode d'emploi.
- `src/app/api/` : GED simulée, lecture d'un dossier, découpage physique des pièces, extraction, mise en page du rapport, Solis simulé.
- `src/components/etapes/` : les étapes ; `arrivees-ged.tsx`, `bannette.tsx`, `rapport-pdf.tsx`, `vue-solis.tsx`, `rapprochement-usager.tsx`.
- `src/lib/regles/` : moteur de règles métier (catalogue et application) et paramètres.
- `src/lib/rapport/` : modèle du rapport de contrôle, construction, mise en page PDF.
- `src/lib/` : client OCR, déliassage, schémas et extraction, statuts, étapes, marque.
- `src/data/` : usagers fictifs, lots GED, base Solis simulée.
- `src/store/` : état des dossiers en cours (localStorage), journal des actions.
- `scripts/` : générateur de dossiers fictifs, test de pipeline.
- `public/ged/` : dossiers fictifs numérisés (PDF).
- `old_version/` : premier prototype statique, conservé comme référence.
- `CLAUDE.md` : documentation de travail détaillée.
