# Déployer Solid'IA sur Vercel

La démonstration est protégée par un mot de passe unique demandé à l'entrée. Les secrets (clé Mistral, mot de passe) ne sont jamais dans le code : ils vivent dans les variables d'environnement du projet Vercel.

## 1. Préparer les deux secrets

Choisissez un mot de passe de démonstration, puis générez un secret de signature de session :

```bash
openssl rand -hex 32
```

Vous aurez donc trois valeurs à renseigner :

| Variable | Rôle | Exemple |
|---|---|---|
| `MISTRAL_API_KEY` | Lecture des documents et extraction des champs | la clé de votre compte Mistral |
| `SOLIDIA_MOT_DE_PASSE` | Mot de passe demandé à l'entrée | `cea-autonomie-2026` |
| `SOLIDIA_SECRET_SESSION` | Clé de signature du ticket d'entrée, que personne ne saisit jamais | la sortie de la commande ci-dessus |

Sans `SOLIDIA_MOT_DE_PASSE`, l'accès est libre : c'est voulu en développement local, à éviter en ligne.

`SOLIDIA_SECRET_SESSION` mérite un mot d'explication. Après une connexion réussie, le serveur dépose un ticket d'entrée dans le navigateur, pour ne pas redemander le mot de passe à chaque page. Ce ticket pourrait être fabriqué de toutes pièces par un visiteur : le serveur y apporte donc une signature calculée avec cette clé, que lui seul connaît. Vous n'avez rien à retenir et personne ne la saisit jamais. Elle est même facultative : sans elle, la signature est calculée à partir du mot de passe, ce qui fonctionne mais serait plus facile à deviner si le mot de passe était court.

## 2. Le dépôt GitHub

Fait le 06/10/2026 : le code est sur **https://github.com/hamiltonrmat/alsacia-solidia**, branche `main`. Le dépôt est public ; pour le fermer, Settings puis Change visibility. Rien de sensible n'y est versionné : `.env.local` est ignoré, seul `.env.example` est suivi, et la clé Mistral n'apparaît dans aucun commit.

Pour pousser les évolutions suivantes :

```bash
cd ~/Desktop/proto_ocr_codex
git push
```

Vercel redéploie alors automatiquement.

## 3. Créer le projet Vercel

Deux chemins, au choix.

**Depuis l'interface web**, le plus simple :

1. Ouvrir https://vercel.com/new.
2. Importer le dépôt `alsacia-solidia`. Vercel détecte Next.js tout seul : ne rien changer aux commandes de build.
3. Avant de cliquer sur « Deploy », déplier « Environment Variables » et saisir les trois variables du tableau ci-dessus, pour les trois environnements (Production, Preview, Development).
4. Déployer.

**Depuis le terminal**, si vous préférez :

```bash
cd ~/Desktop/proto_ocr_codex
npx vercel login          # ouvre le navigateur
npx vercel link           # crée ou rattache le projet
npx vercel env add MISTRAL_API_KEY production
npx vercel env add SOLIDIA_MOT_DE_PASSE production
npx vercel env add SOLIDIA_SECRET_SESSION production
npx vercel --prod         # déploie
```

## 4. Après avoir ajouté ou changé une variable

Vercel ne réapplique pas les variables à un déploiement existant : **redéployez** (bouton « Redeploy » sur le dernier déploiement, ou `npx vercel --prod`). Sans cela, le mot de passe ne serait pas pris en compte.

## 5. Réglages conseillés

- **Région des fonctions** : dans Settings puis Functions, choisir Paris (`cdg1`). Les appels partent alors d'Europe, ce qui réduit la latence de lecture des documents.
- **Durée des fonctions** : les routes de lecture et d'extraction déclarent déjà `maxDuration = 60`. Sur le plan Hobby, la limite est de 60 secondes : c'est suffisant, un dossier de seize pages se lit en moins de dix secondes.

## 6. Vérifier le déploiement

1. Ouvrir l'adresse fournie par Vercel : la page de connexion doit s'afficher.
2. Saisir un mauvais mot de passe : refus.
3. Saisir le bon : vous arrivez sur l'accueil, et « Quitter la démonstration » apparaît dans le pied de page.
4. Module GED, lot #2347, « Prendre en charge et lire le dossier » sur Jean DUPONT : la lecture doit aboutir en quelques secondes et vous amener au typage des pièces.
5. En navigation privée, vérifier qu'aucune page n'est accessible sans le mot de passe.

## 7. Ce qui reste local à chaque poste

Les dossiers en cours, leur journal et leurs courriers sont conservés dans le navigateur de chaque visiteur : deux personnes qui ouvrent la démonstration ne voient pas la même bannette. C'est l'objet de l'étape suivante du projet, une base partagée (Supabase).

## 8. Tester la protection en local

```bash
SOLIDIA_MOT_DE_PASSE="demo" npm run dev
```

Le mot de passe est alors demandé comme en ligne. Sans la variable, l'accès reste direct.
