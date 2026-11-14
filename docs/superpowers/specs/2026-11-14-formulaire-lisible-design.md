# Rendre lisible le formulaire de « là-haut »

2026-11-14 · petit changement · étape 2

## Intention

Le formulaire « Laisser une trace ? » est écrit à même la scène, sans rien
derrière. Quand il tombe sur le grain blanc du massif, le placeholder, le
compteur `0 / 80` et `laisser ↵` s'effacent — ce sont les éléments les plus
pâles (mono 10,5 px, opacité faible) et ils disparaissent les premiers. Sur
téléphone le formulaire s'étire d'un bord à l'autre (`left: 16px; right: 16px`)
et traverse la montagne de part en part : c'est là que c'est le pire.

C'est le seul endroit du site où l'on demande quelque chose au visiteur. Un
formulaire qu'on déchiffre décourage le geste avant même qu'il commence.

## Buts

- Les quatre textes — titre, champ phrase, champ prénom, ligne méta — se lisent
  partout, sur la nuit comme sur le grain, quelle que soit la couleur du fond.

## Non-buts

- **La place du formulaire.** Emmanuelle : « ça me dérange pas que le bloc
  traverse la montagne, même sur téléphone ». On n'y touche pas.
- Le massif, la frise, le placement des étoiles.

## Anti-buts

- Un cadre, une boîte, un panneau : le site n'a qu'une matière (CONCEPT §2) et
  ses formulaires sont « sans cadre » (§4.3). *Même dérogation que pour la
  bulle : la tache a une arête, acceptée au bénéfice de la lisibilité.*
- Éclaircir le texte ou l'épaissir : la hiérarchie d'opacités du §6 tient le
  ton du site, elle ne se négocie pas pour un problème de fond.

## Contraintes

- « Dans tous les assets, le noir devient la couleur du fond » (CONCEPT §6) : la
  tache se prend sur `--fond`, jamais sur une couleur figée, pour suivre l'œil.
- `.trace` porte `transition: opacity 0.7s` et passe à `opacity: 0` pendant
  l'envoi (temps 1 et 5 du §4.3). Un `::before` hérite de l'opacité du parent :
  la tache s'efface donc avec le formulaire, sans réglage séparé.
- `color-mix()` : Chrome 111+, Safari 16.2+ — même socle que la bulle.

## Approches

La comparaison des remèdes a déjà été faite pour la bulle, en jetable dans
l'appli : rien, un halo d'ombres autour des lettres, une tache de nuit derrière.
La tache a gagné nettement et son prix — elle efface le massif derrière — a été
regardé et accepté. **On ne rouvre pas ce choix.** Restait la forme à donner à
la tache pour un bloc, qui n'est pas une bulle :

| | Ce que ça donne | Verdict |
|---|---|---|
| **(a) une tache derrière tout le bloc** | la plus simple, la plus proche de la bulle ; efface aussi les vides entre les lignes, où il n'y a rien à protéger | **retenue** |
| (b) une tache par ligne de texte | n'efface que le nécessaire, mais quatre taches qui se chevauchent risquent un effet de nappe irrégulière | écartée |
| (c) une colonne dégradée | plus calme, mais la plus visible : ça ressemble vite à un panneau, ce que l'anti-but exclut | écartée |

Emmanuelle a choisi (a). Je recommandais (b) pour épargner le massif ; son
choix prend le risque inverse, et il a pour lui la cohérence avec la bulle.

## Ce qui est décidé

Une seule tache, sur `.trace::before`, construite comme celle de la bulle :
dégradé radial elliptique mélangé depuis `--fond`, posé en `z-index: -1`, débordant
le bloc par un `inset` négatif.

## Laissé au constructeur

Les valeurs : l'`inset`, les arrêts du dégradé, et s'il faut ou non débattre
l'`inset` entre bureau et téléphone puisque la largeur du bloc change du simple
au double. La recette de `.bulle::before` est le point de départ, pas une
copie à l'identique : une bulle fait une ou deux lignes, le formulaire en fait
une dizaine de hauteur.
