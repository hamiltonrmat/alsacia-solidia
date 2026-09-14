Lien vers le schéma: [[wokflow_OCR.excalidraw]]

#OCR 
# Principes / Fonctionnalités de l'outil

> [!tip] 3 étapes
> Des niveaux de détail et de difficulté différents
## Phase 1
### Découper les dossiers 

**Un dossier devient un CERFA suivi des pièces justificatives:** Dossier -> CERFA + CNI + Cert Médical + ...
### Extraire les informations de manière structuré et hiérarchisé 

l'Ensemble des caractères convertis des pdf vers le format texte (`markdown`) sont structurées avec la finalité de récupérer les informations importantes : type de pièce, libellé des champs et informations saisies.

> [!info] La schématisation des dossiers
> Pour chaque dossier, et pour chaque pièce jointe possible d'être reçu, il va falloir établir un schéma d'extraction et une structuration de la donnée extraite.
> 
> En résumé, dans un CERFA, par exemple, nous allons dire que nous voulons le nom, le NIR, le type de demande etc. Ainsi, nous déclarons à la "moulinette", qui passera suite à la extraction OCR, quelles informations récupérer et comment les garder pour les traitements qui viendront derrière.

### Pré contrôle et score OCR

- Score par:
	- Lot
	- Dossier
	- Document
	- Page
	- Champ

> Interface permettant de transformer la donnée structurée en une page interactive permettant le contrôle / saisie / envoie du dossier à la prochaine étape 

> [!example] Score
> L'agent regarde les documents découpées, saisi les informations manquantes / imprécises et envoie le dossier à la prochaine étape


---
## Phase 2

### Contrôler les pièces (conformité intrinsèque aux pièces)

 Exemple: la page 37 contient **apparemment** une carte d'identité
 - Il s'agit de la carte d'identité du demandeur ?
 - Est-elle encore valide ?
 - ...

> [!tip] Important !
> Nous avons besoin de votre expertise métier pour en prendre connaissance, comprendre et traduire ces détails en fonctionalitées / régles de l'outil.

> **A ce stade:**
> Un dossier est arrivé > il à été découpé > nous avons identifié le type et la conformité de chaque pièce justificative > nous avons les informations nécessaires à l'instruction gardés  

### Vérifier la (pré) - recevabilité

- Selon le type de demande (selon le CERFA et la demande indiqué) quels sont les pièces justificatives obligatoires ?
- Sont elles présentes ?
	- Oui, le dossier pars pour l'instruction **métier**
	- Non
		- L'agent reprends la main
		- Renvoi à l'usager pour compléter des pièces ?
		- Quelle pièce manque ?

>[!tip] Plusieurs niveaux de contrôle
> 
> **Exemple:** Un dossier n'est pas classé recevable car, le nom de famille de l'usager n'a pas été bien écrit et donc pas reconnu par l'OCR. Pourtant, dossier à 99% conforme.
> 
> - Contrôle:
> 	- Par dossier ?
> 	- Par pièce ?
> 	- Par champ ?

## Phase 3

### Assister la décision

> [!tip] Important !
> Nous avons besoin de votre expertise métier pour en prendre connaissance, comprendre et traduire ces détails en fonctionalitées / régles de l'outil.

> **A ce stade:**
> Un dossier est arrivé > il à été découpé > nous avons identifié le type et la conformité de chaque pièce justificative > nous avons les informations nécessaires à l'instruction gardés > et le dossier à été classé recevable. 

- Si la demande concerne, l'autonomie de niveau 1, il faut avoir au moins 50 ans
	- l'usager à 48 ans
		- envoyer à la CAF
	- l'usager à 51 ans
		- nous donnons suite a sa demande 