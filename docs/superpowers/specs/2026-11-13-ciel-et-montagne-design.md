# Le ciel et la montagne

2026-11-13 · projet · étape 2 · sous-projet (c)

> Ce document ne couvre que **(c)**. Deux autres sous-projets attendent :
> **(a)** l'allure des étoiles (disques à bord net, « pas un halo ») et
> **(b)** le fond du formulaire « Laisser une trace ? » et l'exclusion du
> survol sur sa zone. Ils se brainstorment séparément.

## Intention

Les étoiles des voyageurs transparaissent à travers le massif. Elles sont
pourtant déjà dessinées **derrière** lui (`Stars` entre dans `app.stage` avant
`monde`) : ce qu'on voit à travers, ce sont les trous entre les grains du
massif, qui est un nuage de points sur fond transparent
(`setClearColor(0x000000, 0)`).

Et il n'y a presque pas de ciel. La bande actuelle va du bas de la frise à
mi-hauteur de la fenêtre, et cette bande est presque entièrement à l'intérieur
de la montagne. Mesuré, enveloppe réelle, espace libre au-dessus de la crête :

| fenêtre | au sommet | aux bords |
|---|---|---|
| 1512 × 771 | 20 px | 358 px |
| 1440 × 900 | 51 px | 345 px |
| 390 × 844 (debout) | 41 px | 43 px |
| 844 × 390 (couché) | **−60 px** | 129 px |

Les valeurs négatives veulent dire que la crête monte **dans la frise** : sur un
téléphone couché, sur 279 px de large.

## Le pourquoi

« Chaque étoile est quelqu'un qui est passé par ici » : le ciel est le sujet du
site, pas son décor. Des étoiles qui clignotent à travers une montagne ne sont
ni dans le ciel ni derrière le relief — elles sont nulle part.

## Buts

- Une étoile n'est **jamais** derrière la montagne, sur aucun écran, à aucun
  moment de la rotation du massif.
- Au moins **60 px de ciel au-dessus du sommet** : de quoi y poser une étoile,
  pas seulement une marge.
- Plus de ciel utilisable qu'aujourd'hui.

## Non-buts

- Changer le rendu du massif. Le boucher n'est pas nécessaire : si les places se
  tirent dans la région libre, rien ne passe derrière lui.
- Toucher au tirage d'une place une fois écrite. `update` est interdit par les
  règles Firestore ; une trace garde son `(x, y)`.
- Les sous-projets (a) et (b).

## Anti-buts

- Un massif rapetissé sur les grands écrans. Le relief est la moitié de la
  composition ; le réduire partout pour sauver un téléphone serait payer au
  mauvais endroit.
- Un seuil de format posé à vue de nez. Chaque bascule se déduit de la
  géométrie mesurée.

## Contraintes

- **Rien n'est déployé** (`.firebaserc` → `demo-train-de-nuit`) : refaire la
  bande du ciel ne déplace aucune trace réelle. C'est maintenant que ça coûte
  le moins.
- La place d'une trace est normalisée sur la **fenêtre**, le massif est cadré
  pour **couvrir** la scène (`fitStage`). Les deux ne coïncident pas d'un format
  à l'autre : la région doit donc se recalculer par fenêtre.
- `HORIZON` (921, coordonnées de scène) est partagé : rails, train, voile du
  pied et massif y sont calés. Il ne bouge pas.
- La poussière d'étoiles (`Sky`) suit le pointeur (`setPointer`) ; le massif,
  non. Aucune marge de parallaxe n'est due à la montagne.

## Approches

**L'enveloppe de la crête — d'où elle vient**

| | |
|---|---|
| mesurée une fois, figée, régénérable par un script | **retenue** |
| recalculée au chargement depuis la carte de relief | écartée : il faudrait sortir le calcul de crête du shader et le refaire pour tout un tour au démarrage, pour un résultat identique |
| un triangle analytique à trois points | écartée : la crête n'est pas droite, il jetterait du ciel sur les flancs, là où il est le plus précieux |

**Comment on dégage le ciel**

| | |
|---|---|
| décaler le cadre de la scène vers le bas (`fitStage`), par forme de fenêtre | **retenue** : un seul endroit, et rien ne bouge les uns par rapport aux autres |
| descendre `HORIZON` | écartée : constante partagée, la changer par format décalerait rails, train et voile les uns des autres |

Emmanuelle a tranché ces deux-là, et a fixé la cible à 60 px de ciel au sommet.

## Ce qui est décidé

### 1. L'enveloppe

Un script `tools/crete_massif.py` lit les 180 images de
`montagne_hd/tramage/webp/` — un tour complet en boucle, vérifié dans
`blender/massif.py` — et émet, pour chaque colonne, la ligne la plus haute
jamais atteinte sur tout le tour. Il écrit une polyligne dans
`src/scene/crete.ts`, en coordonnées du **cadre source** (3840 × 944), avec la
date et la commande qui l'a produite.

**Ce n'est pas une enveloppe exacte, et le dire** : les images sont la référence
de calage, l'affichage est le portage GLSL ; le tour est échantillonné tous les
2° ; les colonnes sont agrégées. Une marge `MARGE_CRETE` couvre l'écart.

Le script émet le **vrai maximum** par colonne, agrégé par paquets de 64
colonnes en prenant le minimum du paquet — soit 60 points, et le choix
conservateur à chaque fois. La marge n'a donc pas à couvrir de lissage ; elle
couvre l'écart GLSL / rendu de référence, l'échantillonnage à 2°, **et le rayon
propre de l'étoile** : son halo fait 9 px et sa cible de survol 14 px. « Jamais
derrière la montagne » vaut pour le halo, pas seulement pour le point.

### 2. La région libre

À un `x` donné, le ciel va du **bas de la frise** à la **crête moins la marge**.
C'est la « région libre ». Elle se recalcule à chaque redimensionnement, comme
`bandeCiel` aujourd'hui.

`projeter` place une trace à `x` sur la largeur, puis `y` dans la hauteur libre
**à ce x**. Une trace déjà écrite garde sa place relative. Conséquence assumée :
la région change de forme selon l'écran, donc deux personnes ne voient pas une
étoile au même endroit absolu. C'est déjà vrai aujourd'hui pour `y`.

### 3. Le dégagement, par règle et non par chiffres

**Correction, après vérification.** `fitStage` est un cadrage *cover* : son jeu
vertical vaut `-offsetY`, et il est **nul dès que la fenêtre est pilotée par sa
hauteur**. Mesuré : 11 px sur 1512 × 771, 26 px sur 844 × 390, **0 px** sur
1440 × 900, 1728 × 1117 et 390 × 844. Le décalage n'est donc pas un levier
général — c'est un appoint sur deux formats. L'exemple de la version précédente
(18 px sur 1512 × 771) dépassait son propre jeu.

**Le levier principal est donc la frise**, un pixel pour un pixel, sur tous les
formats.

**Décidé : la frise passe de 116 à 96 px** — `--haut-voie` de 64 à 44, les 52 px
de libellés inchangés. Valeur choisie à l'œil, dans l'appli, parmi 116 / 96 / 86.

Deux constantes, et le reste se calcule :

- `CIEL_SOMMET = 60` ;
- `PLANCHER_REFLET` — ce qu'on garde sous les rails. C'est un **plafond au
  décalage**, pas une garantie : on ne réduit pas en dessous, on ne promet pas
  de l'atteindre.

La règle :

1. décaler le cadre vers le bas, au plus du jeu de couverture disponible, et au
   plus de ce que `PLANCHER_REFLET` autorise ;
2. si `CIEL_SOMMET` n'est toujours pas atteint, **résoudre l'échelle du
   massif** : la plus grande qui tienne la cible.

**L'échelle est résolue, pas posée.** Étant résolue, elle est continue en
hauteur de fenêtre : aucune interpolation à écrire, et aucun seuil de format à
poser à la main.

Ce que ça donne, à frise 96 (enveloppe réelle, cible 60) :

| fenêtre | jeu | ciel à 2,2 | échelle retenue |
|---|---|---|---|
| 1512 × 771 | 11 px | 50 px | 2,153 (−2 %) |
| 1280 × 800 | 0 | 52 px | 2,160 (−2 %) |
| 1440 × 900 | 0 | 70 px | 2,200 |
| 1728 × 1117 | 0 | 110 px | 2,200 |
| 1512 × 982 | 0 | 85 px | 2,200 |
| 390 × 844 | 0 | 60 px | 2,200 |
| 844 × 390 | 26 px | −14 px | 1,555 (−29 %) |

**Aucune exception n'est déclarée** : la cible tient partout. Le prix sur les
deux formats de bureau serrés est un massif rabaissé de 2 %, imperceptible.
Seul le téléphone couché paie vraiment.

### 4. Ce qui bascule en même temps

Tous les appelants de `projeter` / `bandeCiel` changent d'un bloc :
`StarLayer`, **`Dissolve`** — le grain doit monter là où l'étoile s'allumera
vraiment —, `GareLaHaut` (qui est le site d'appel réel de `tirerPlace`, avec son
quatrième argument `window.innerWidth / bande.height`), `StarTooltip` (qui suit
`HAUTEUR_FRISE` de son côté), et les tests de `layout` et `stars` qui fixent
`bandeCiel` — dont celui qui vérifie que `HAUTEUR_FRISE` est bien la somme des
deux morceaux de CSS.

`tirerPlace` mesure sa distance « la plus éloignée des autres » en espace
normalisé. Avec une hauteur libre qui varie selon `x`, cela ne veut plus dire
« loin à l'écran » : il doit mesurer dans l'espace déformé, sinon les étoiles
s'entassent sous le sommet.

### 5. La mise en page

- La frise passe de **116 à 96 px** : `--haut-voie` de 64 à 44, les 52 px de
  libellés inchangés. C'est le levier principal — chaque pixel gagné est un
  pixel de ciel sur **tous** les formats.
- **L'œil se pose sur la ligne de voie**, à son extrémité droite, la ligne le
  traversant. *Correction d'une erreur de la version précédente* : l'œil n'a
  jamais été dans le ciel, il était dans la bande de la frise, au-dessus de la
  ligne. Il ne coûtait donc aucun ciel. Il bouge parce que cette bande passe de
  64 à 44 px et qu'un bouton de 36 px n'y tient plus proprement — et parce que
  sur la ligne, il s'aligne enfin sur quelque chose, ce que son propre
  commentaire réclame (`EyeButton.vue`).

## Ce qui reste au réalisateur

- La plage et la courbe d'interpolation de l'échelle du massif.
- La valeur de `MARGE_CRETE`, au-dessus de 16 px de cadre source.
- La valeur de `PLANCHER_REFLET` (90 px comme point de départ).
- La façon dont `tirerPlace` mesure dans l'espace déformé.

## Ce qu'Emmanuelle a tranché

- **Frise à 96 px**, après comparaison à l'écran de 116 / 96 / 86.
- **Œil sur la ligne de voie**, extrémité droite, après comparaison de trois
  places (au-dessus de la ligne, sur la ligne, en bas à droite).
- **La poussière d'étoiles se restreint** à la même région libre que les
  étoiles-voyageuses. Elle transparaissait à travers le grain exactement comme
  elles, et en bien plus nombreuse.
- **Plancher là où il n'y a pas de crête** (bords d'écran sur format court) :
  le haut du voile, `HORIZON - DEGRADE_HAUTEUR`. Sans lui, une étoile s'y
  poserait sur les rails, le train ou le reflet.
- **Les fenêtres de bureau basses rapetissent aussi le massif**, pas seulement
  le téléphone couché : même cause géométrique, et ce sont des fenêtres où le
  relief écrase déjà tout.

Une question de la version précédente est caduque : « décaler autant que le
plancher du reflet le permet sur les formats hauts » supposait un jeu qui
n'existe pas — il est nul dès que la fenêtre est pilotée par sa hauteur.
