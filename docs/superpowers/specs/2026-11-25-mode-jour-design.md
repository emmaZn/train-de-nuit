# Le mode jour

2026-11-25 · projet

## Intention

Emmanuelle, le 25 novembre : « j'ai fait une palette avec 3 couleurs, je trouve
ça un peu nul — tu crois qu'on pourrait faire juste un light mode et on inverse
100 % le blanc en noir et le noir en blanc ? »

Montré en direct sur le site qui tourne, sans toucher un fichier : **« en vrai
j'aime bcp »**. Puis, en regardant : « ça manque de lisibilité », « grainé c'est
plus joli », « c6 est parfait en noir et c9 est parfait en blanc », « il faut
qu'on arrive à reload le site alors si on peut pas avoir de transition propre
entre les 2 couleurs », « je veux partir sur un beige chaud pâle pas un blanc »,
« je veux garder la teinte encre, pas la noir ».

Le cycle de trois couleurs sombres disparaît. À sa place, **deux modes** : la
nuit, et le jour, qui en est le négatif.

## Ce qu'elle a tranché

1. **Deux modes au lieu de trois couleurs.** L'œil ne parcourt plus un cycle,
   il bascule.
2. **La nuit garde la teinte encre**, `#151517`. Le noir `#000` et la vieille
   photo sortent de la palette.
3. **Le jour est un beige chaud pâle, pas un blanc** : **« papier »,
   `#F2EEE6`**, choisi parmi trois rendus sur la scène.
4. **L'inversion est à 100 %** : ce qui est encre d'un côté est fond de l'autre.
5. **Le grain reste**, dans les deux modes. La piste « train sans grain » a été
   fabriquée, regardée et écartée : « grainé c'est plus joli ».
6. **Le contour de la silhouette du train s'élargit**, et pas de la même
   quantité selon le mode : **6 px de source en nuit, 9 px en jour**. Voir
   `[[contour-silhouette-train]]` en mémoire pour la mesure.
7. **Les lumières, piste C** : « La lanterne, le cadran, les carreaux restent de
   l'encre. La lueur s'en va. » Donc, de jour : pas de faisceau, pas de halo,
   pas de lueur autour des vitres.
8. **Les vitres allumées restent telles quelles**, sans leur lueur : un carré de
   grain sombre. « ça suffit ».
9. **La bascule recharge le site.**
10. **Les étoiles des visiteurs perdent leur lueur de jour** : un point d'encre
    nu, une constellation dessinée sur la feuille. La montée d'une phrase se
    termine donc par une condensation, pas par un éclat.
11. **De jour, il n'y a plus de feuille de CV** : la page *est* la feuille. On
    retire la plaque, on garde le texte.

## Ce que j'ai tranché, et qu'elle a vu

- **Tout lui a été montré sur la scène qui bouge**, jamais sur une maquette :
  l'inversion en direct dans son navigateur, puis un serveur à part sur `:5180`
  pour les essais. Sa branche et celle de l'autre agent n'ont pas bougé.
- **Le banc d'essai du grain du massif est ressorti du stash** du 23 novembre,
  dans un worktree jetable, parce qu'elle a rouvert la question d'elle-même.
  `FONDU_AVANT` y a été remis à 0,18 : à zéro il divise par zéro et peut faire
  disparaître le maillage.
- **Le rechargement se cache derrière la dissolution** (§2 du CONCEPT : tout ce
  qui apparaît ou disparaît le fait par dissolution). Proposé, pas encore vu
  par elle.
- **Trois beiges à lui montrer** (ci-dessous). Je n'en pose aucun à sa place.

## Buts

- Le jour est le négatif de la nuit, sans rien redessiner : la même matière,
  les mêmes gestes, l'autre sens.
- La nuit d'aujourd'hui ne bouge pas d'un pixel, sauf le contour du train
  qu'elle a demandé.
- Un visiteur ne charge que les images de son mode.
- Le mode est connu **avant** le premier dessin : ni clignotement, ni gris plat.

## Non-buts

- **Pas de troisième mode**, pas de retour du cycle de couleurs.
- **Pas de mode automatique** selon le réglage du système : c'est un geste,
  pas une préférence devinée. (À confirmer par elle si elle veut l'inverse.)
- **Pas de nouvelle matière** : rien d'autre que du grain et du trait. Le jour
  ne gagne ni hachures, ni aplats, ni ombres portées.
- **On ne retouche pas le grain du massif** dans ce chantier. La question du
  « trop défini » reste ouverte, et elle ne l'a pas tranchée.

## Anti-but

Que le jour ressemble à un thème clair de site web — fond blanc, gris de
formulaire, ombres douces. Ce qu'on fait, c'est une **gravure sur papier**, pas
un light mode.

## Les approches

**1. Un filtre `invert(1)` sur la page.** Une ligne de CSS, et c'est ce qui a
servi à tout lui montrer. Écartée pour la suite : elle ne peut pas donner un
beige sans empiler un second filtre, elle inverse aussi les éléments
d'interface qu'on ne veut pas toucher, et un filtre plein écran par image
au-dessus d'un canvas WebGL se paie cher sur téléphone.

**2. Un second pôle dans la règle de recoloration.** *Retenue.* La règle unique
du projet devient une règle à deux bornes : le fond et l'encre. Le shader et son
jumeau CPU la portent déjà à une borne près ; côté CSS, c'est deux variables au
lieu d'une.

**3. Un second jeu d'assets déjà inversés.** Écartée : elle doublerait tout ce
qui est cuit, et surtout elle ne peut rien pour le massif, le ciel, la terre et
le reflet, qui sont calculés et pas cuits.

## Comment

### 1. La règle à deux pôles

`src/scene/recolor.ts`. Aujourd'hui le shader mélange vers le **texel**, pas
vers du blanc :

```
nuit = mix(uFond, straight, lum)
```

Ce n'est pas la même chose qu'un mélange vers une encre fixe, et remplacer l'un
par l'autre déplacerait tous les gris de la nuit. Donc **la nuit garde son
calcul mot pour mot**, et le jour est un remappage de ce qu'elle aurait donné :

```
vec3 nuit = mix(uFond, straight, lum);         // inchangé
float n   = dot(nuit, LUMA);                   // lum(uFond) sur le sol, 1 sur le trait
float t   = clamp((n - uSol) / (1.0 - uSol), 0.0, 1.0);
vec3 jour = mix(uPapier, uEncre, t);           // 0 -> papier, 1 -> encre
sortie    = mix(nuit, jour, uJour);            // uJour vaut 0 ou 1
```

**La normalisation par `uSol = lum(uFond)` n'est pas un détail.** Sans elle, un
pixel de sol (le noir des assets, qui devient `#151517`) a une luminance de
0,083 et non 0 : il retomberait sur `#E0DCD5` au lieu de `#F2EEE6`. Or le train
est la version **pleine**, à corps noir, et la masse du bâtiment d'« ailleurs »
est un aplat : on aurait un pavé gris pour la rame et une dalle grise pour la
gare, sur une page plus claire. C'est très exactement l'anti-but.

Trois uniformes nouveaux (`uPapier`, `uEncre`, `uSol`) et un interrupteur.
`recolorPixel`, le jumeau CPU, suit la même forme, et les tests tiennent les
deux ensemble.

### 2. Les couleurs

| | Nuit | Jour |
|---|---|---|
| Fond | `#151517` (encre) | un beige chaud pâle |
| Trait / texte | `#ececf0`, traits `#e6e6ea` | l'encre, `#151517` |

**La teinte encre est donc gardée deux fois** : elle est le sol de la nuit et le
trait du jour. Une seule couleur, deux rôles.

Trois beiges lui ont été rendus sur la scène, du plus sobre au plus jaune.
Elle a choisi le premier :

| Nom | Valeur | |
|---|---|---|
| **papier** | **`#F2EEE6`** | **retenu** — à peine chaud, le papier d'un carnet |
| vieille photo claire | `#EDE4D4` | écarté — plus jaune, l'inverse de sa « vieille photo » |
| lin | `#E8E2D6` | écarté — plus sourd, plus gris |

Contraste du texte sur `#F2EEE6` : 17:1, au-dessus de la nuit.

**`#F2EEE6` est la couleur que la page affiche**, pas un multiplicateur : c'est
celle qu'elle a jugée, sur des rendus dont le fond mesurait exactement cette
valeur. `--fond`, `theme-color`, le fond du renderer et l'écran d'attente
portent donc tous la même, et c'est la normalisation ci-dessus qui garantit que
le sol **à l'intérieur** des sprites y retombe aussi.

Côté CSS, `--fond` et `--trait` ne changent pas de nom — ils changent de valeur
avec le mode. `base.css` les définit pour la nuit et les redéfinit sous
`:root[data-mode="jour"]`.

### 3. Le mode avant le chargement

Le mode est lu dans `localStorage` par un script inline d'`index.html`, **avant**
le moindre module, et posé en `data-mode` sur `<html>`. L'écran d'attente, le
`theme-color` et le choix des images du train en dépendent tous. Repli silencieux
si le stockage est indisponible, comme `palette.ts` le fait déjà.

`src/scene/palette.ts` perd son cycle et devient deux modes : `charger`,
`enregistrer`, `suivant`.

### 4. Les deux jeux d'images du train

- Une option `--contour=N` dans `outils/grain_train.py` : avant le grain, la
  bande extérieure de la forme opaque (N px de source) est forcée en trait à
  pleine luminance, puis reçoit le grain comme le reste. Elle existe déjà dans
  une copie jetable ; il faut la porter dans l'outil, avec son aide en tête de
  fichier.
- Deux cuissons depuis `PTITRAIN_plein`, recette des séquences retenues plus le
  contour :
  `--trait=1,1 --gris=#EDEDED --corps=0.05,0.01 --trous=0.08 --coupe=492 --contour=6` (puis `=9`).
- Deux passages de `tools/build_assets.py --train-src …` vers
  `public/assets/train-nuit/` et `public/assets/train-jour/`. 8,3 et 8,5 Mo.
  Le manifeste donne la même boîte et le même compte dans les deux cas : le
  choix du dossier est un simple préfixe, posé au chargement du manifeste.
- `01_rails` n'existe pas dans `PTITRAIN_plein` : la voie continue de venir du
  repli (`PTITRAIN_grain_vivant`), identique dans les deux modes.

### 5. Les lumières, piste C

Le plan `lumieres` se sépare en deux : **les objets** (le mât, la lanterne, le
cadran et ses aiguilles, le cadre du panneau) et **les lueurs** (le cône du
faisceau, le halo de l'horloge, la lueur autour des vitres). De jour, les lueurs
ne sont pas dessinées ; les objets restent, en encre.

Les vitres gardent leur grain et perdent leur lueur. Elles restent exemptées de
la teinte : à « ailleurs », de jour, la scène se délave et elles restent encrées.

**Conséquence assumée** : de jour, « ailleurs » n'a plus son faisceau, donc plus
son théâtre. De nuit la scène s'assombrit et une lampe se révèle ; de jour elle
se délave et il ne reste que le trait. Ce n'est pas le même geste, c'est le même
sens.

#### 5 bis. Les étoiles et la feuille du CV

Deux pièces qui n'étaient dans aucune liste, relevées à la relecture.

**Les étoiles des visiteurs.** `StarLayer.ts` dessine chaque étoile comme une
pile d'anneaux à l'alpha décroissant (`0.16 × (1−t)^2.2`) autour d'un cœur à
0,45 : un dégradé radial fait main, qui n'est pas dans les quatre « entorses
assumées » du CONCEPT et que la piste C ne couvrait donc pas. De jour, la lueur
tombe : **chaque étoile est un point d'encre**. Et `Dissolve.ts` termine la
montée d'une phrase par un éclat de 22 px à 0,45 — de jour, la phrase se
condense en point, sans éclat. Le geste reste, la lumière part, comme partout
ailleurs.

**La feuille du CV.** `CvLigne.vue` dérive `--papier` et `--encre` de `--texte`
et `--fond` (règle du 22 novembre : « la feuille change avec l'œil, c'est un
papier posé dans cette nuit-là »). Sous l'inversion, les deux noms échangent
leur sens et la feuille devient une plaque presque noire, plein écran, sur une
page beige. De jour, **il n'y a plus de feuille** : la page est la feuille, on
écrit directement dessus. La plaque, son bord et sa dérivation ne sont posés
qu'en mode nuit — ce qui demande de reprendre le test « n'utilise aucune
couleur en dur » de `CvLigne.test.ts`, qui interdit aujourd'hui la sortie de la
dérivation.

## 6. La bascule

Un clic sur l'œil : l'écran d'attente revient, le mode s'écrit dans
`localStorage`, la page recharge, et l'arrivée du site rejoue dans l'autre mode.
Pas de fondu de couleur, donc pas de passage par un gris plat, et les bonnes
images du train sont demandées d'emblée.

**C'est l'écran d'attente qu'on réutilise, pas une dissolution neuve.** Ni
`Dissolve.ts` — qui défait le rectangle d'**une phrase** vers une étoile — ni
`rideau.ts` — qui ne dessine plus rien depuis que la plaque est en DOM — ne
savent défaire la scène entière, et en fabriquer une le ferait par un
traitement plein écran à chaque image au-dessus du WebGL : exactement ce que
l'approche 1 écarte comme trop cher sur téléphone. L'écran de `chargement.ts` a
déjà son fondu de 600 ms et son ciel qui se peuple en 2,2 s. Le basculement
devient donc un départ et une arrivée — le geste du site, à l'endroit.
C'est mon choix, pas le sien : à lui montrer.

L'œil change d'étiquette : `aria-label` n'est plus « Changer la couleur de la
nuit » — deux clés d'i18n à reprendre, en français et en anglais.

## Ce que ça fait tomber dans le CONCEPT

- **§6, « Couleur de fond variable »** : le tableau des trois couleurs et la
  phrase « palette validée (toutes sombres) » ne sont plus vraies.
- **§6, « L'icône œil »** : ce n'est plus un cycle en fondu d'une seconde, c'est
  une bascule qui recharge.
- **§6, la règle unique** : « dans tous les assets, le noir devient la couleur du
  fond » reste vraie, mais il faut ajouter sa seconde borne.
- **§6, les « entorses assumées »** : la liste des quatre lumières devient une
  liste de nuit. De jour il n'y en a aucune — et la liste était incomplète : la
  lueur des étoiles et l'éclat de la dissolution en sont aussi.
- **§5, le ciel des voyageurs** : de jour, une étoile est un point d'encre.
- **§6, le train** : il n'y a plus une séquence mais deux, et le contour y est
  élargi.

## Laissé au constructeur

- Garder `public/assets/train/` comme jeu de nuit ou le renommer en
  `train-nuit/` : question de propreté, sans effet visible.
- Où vit l'interrupteur `uJour` — un uniforme ou deux filtres. Le moins de
  changements d'état par image gagne.
- La durée de la dissolution avant rechargement.

## Pièges relevés à la relecture

- **La rampe de densité du corps se calcule sur le corps d'avant contour.**
  `--corps=0.05,0.01` tire sa rampe de l'étendue verticale du corps
  (`body.any(1)`). Si `--contour` convertit la bande extérieure en trait
  *avant* ce calcul, le corps rétrécit de N px en haut et en bas et le grain du
  corps bouge partout, pas seulement au contour. L'écart mesuré est infime
  (~1 % sur la rampe), mais les jeux `c6`/`c9` qu'elle a validés ont été cuits
  ainsi : la nouvelle cuisson se diffe contre eux, et si la différence se voit,
  on la lui montre avant de la garder.
- **`PTITRAIN_jour/` à la racine de `projet_zero` n'est pas le jeu de jour.**
  C'est la piste **sans grain**, fabriquée puis écartée. Le jeu de jour, c'est
  `c9`. Le nom est un piège : le renommer `PTITRAIN_sans_grain/`.
- **Le conteneur `dissous` est hors du filtre.** Il est accroché à `app.stage`,
  pas à `decor` : ses grains resteraient blancs, donc invisibles sur le papier.
  Il passe par la règle à deux pôles.

## Connu, non corrigé

- **Le massif reste en pixels d'écran** et le train en pixels de cadre. La
  question du « trop défini » sur bureau est rouverte mais pas tranchée, et ce
  chantier ne la touche pas.
- **Le reflet grise ses points** : c'est une mi-teinte assumée, et elle le reste
  dans les deux modes.

## Comment on saura

1. **La nuit est identique à aujourd'hui**, hors contour du train : le jumeau
   CPU de la recoloration rend les mêmes valeurs, et les tests de `recolor` le
   tiennent.
2. **Les deux bornes tombent juste** : un pixel de sol rend exactement
   `#F2EEE6`, un trait à pleine luminance rend exactement l'encre, et la page
   autour est de la même couleur que le sol à l'intérieur des sprites. Un test
   sur le jumeau CPU le tient.
3. **Le jour est le négatif de la nuit** : sur une image de contrôle, la
   luminance de chaque pixel du jour suit celle de la nuit, inversée, entre le
   papier et l'encre.
4. **Le mode survit au rechargement**, et un stockage indisponible rend la nuit
   sans rien casser.
5. **Un seul jeu d'images du train part sur le réseau** par visite.
6. **À « ailleurs », de jour**, aucun dégradé n'est dessiné : ni cône, ni halo,
   ni lueur.
7. **Le contour** mesure 6 px de source en nuit et 9 en jour, vérifié sur une
   image de chaque séquence.
8. **De jour, aucun dégradé nulle part** : ni dans la gare, ni autour des
   étoiles, ni à la fin d'une dissolution. La règle « blanc ou absent » devient
   vraie sans exception — sauf le grisement du reflet, qui reste assumé.
9. Les 1180 tests passent.
