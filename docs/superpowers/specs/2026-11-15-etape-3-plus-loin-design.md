# Étape 3 — « plus loin » : les câbles et les bouvreuils

> Cadrage. Branche `etape-3-plus-loin`. Prolonge `docs/CONCEPT.md` §4.2 : en cas
> de contradiction, **ce document gagne**, et le §13 liste ce qu'il faut
> corriger dans `CONCEPT.md`.
>
> Une bonne part de ce qui suit a été tranché **en regardant un essai jetable
> tourner dans la scène**, le 15 novembre. Ce qu'il a appris, et comment, est
> dans `docs/superpowers/essai-plus-loin.md` ; son code est sur la branche
> `spike-plus-loin`, et il est à jeter.

## 1. Pourquoi

Le site roule et il écoute. Il ne sait pas encore être drôle.

« plus loin » est la seule récréation du voyage, la seule touche d'humour
(CONCEPT §2), et le seul endroit où l'on apprend qui est Emmanuelle — sans
qu'une ligne du site ne parle d'elle à la première personne hors de la bouche
d'un oiseau qu'on vient de faire tomber d'un câble. C'est le contraire du reste
du site : ailleurs on contemple, ici on tripote.

C'est aussi la première fois qu'une gare a un décor **à elle**. Jusqu'ici les
quatre arrêts sont le même paysage ; après cette étape, la boucle a un lieu.

## 2. Ce qui doit exister à la fin

Quand le train approche de « plus loin », des poteaux électriques entrent par la
droite — **deux rangées à deux vitesses**, une proche et une lointaine plus
lente — avec leurs fils. Des bouvreuils sont posés sur les fils de la rangée
proche, et ils y **vivent** : l'un se retourne, l'autre fait un pas sur le fil,
un troisième s'ébouriffe.

À quai, on clique sur un oiseau : le fil vibre, sa réplique paraît aussitôt
au-dessus de lui, **là-haut sur le fil**, et il tombe en culbutant. Il atterrit
sur le dos, sur la terre sous les rails, trois petites étoiles tournent au-dessus
de sa tête. **Il ne se relève pas, et il ne bouge plus.** Un autre bouvreuil
arrive en vol et prend la place libre : on peut recommencer indéfiniment, et les
corps s'accumulent en bas de l'écran.

Quand le train repart, chaque corps est bousculé **au moment où le nez de la
locomotive l'atteint**, et part en roulant vers l'arrière, dans le sillage.
Rien n'est effacé : au tour suivant ils sont encore là, et la terre est un peu
plus encombrée.

Au clavier, un bouton visible au focus fait tomber un oiseau ; les répliques
sont annoncées.

Le décor **reste là** quand le train traverse « plus loin » sans s'arrêter : les
poteaux défilent à pleine vitesse, les oiseaux restent posés, et les corps se
font bousculer au passage de la loco comme au départ.

## 3. Non-objectifs

- Les textes d'« ici », le poteau indicateur et le message privé d'« ailleurs » :
  étape 4.
- Le mouvement réduit, le mobile et le poids des assets, traités pour de bon :
  étape 5. Cette étape ne doit pas les **empêcher** (voir §8), elle ne les règle
  pas.
- **L'envol de peur au passage à pleine vitesse.** Proposé, écarté par
  Emmanuelle : « on verra ensuite si c'est nécessaire ».
- **Un oiseau qui se relève et retourne se poser.** C'était le prototype ; ce
  n'est plus le gag. Rien ne remet un corps debout.
- La perspective fuyante des fils (voir §5, approche D) : ce serait un autre
  cadrage de la gare, pas un choix de rendu.

## 4. Anti-objectifs

Ce qui ferait rater l'étape même si tout fonctionne :

- **Un oiseau creux.** Le train ressort parce que son corps est de la couleur du
  fond et qu'il **éteint** ce qu'il couvre. Un oiseau qui n'est qu'un contour
  laisse la montagne lui traverser le ventre : il est collé sur la scène au lieu
  d'y être.
- **Un oiseau illisible.** C'est le défaut qu'on a mis le plus longtemps à
  comprendre (§10). Un contour d'une cellule sur un dessin trop détaillé se
  dissout dans le grain du massif.
- **Des corps qui tressaillent sans raison.** Essayé, et rejeté à l'œil :
  « bizarre que les oiseaux sonnés bougent pour aucune raison ». Un corps ne
  bouge que si quelque chose le pousse.
- **Un souffle qui ne vient pas du train.** Un corps qui part avant que la loco
  ne l'atteigne, ou qui part vers l'avant comme devant un chasse-neige : les
  deux ont été vus dans l'essai, et corrigés.
- **Du texte cuit dans le canvas.** Les répliques sont du HTML : c'est ce qui les
  rend annonçables, sélectionnables et nettes.
- **La scène qui apprend à connaître Vue.** `src/scene/` reste du TypeScript pur ;
  un test le vérifie déjà.
- **Un clic qui fait deux choses.** Faire tomber un oiseau ne doit pas ouvrir en
  même temps la bulle d'une étoile : `pointerdown` pilote déjà les étoiles.
- **Un décor qui s'assemble à la demande.** Les câbles existent à leur place sur
  la ligne, qu'on s'y arrête ou qu'on les traverse.

## 5. Les approches considérées

**A — En 3D, comme le massif.** Three.js, poteaux en volume, fils en caténaire,
tramés en shader. *Écartée, et d'abord pour des raisons artistiques* :

- la scène a une grammaire — **la profondeur, c'est la distance**. Le massif a du
  volume parce qu'il est loin ; tout ce qui est près est plat (train de profil,
  voie en bande, poteau indicateur en silhouette). Les câbles ont le pied sur les
  rails : ils sont dans le plan près. Leur donner de la perspective casse la
  règle juste à côté du train, qui resterait plat et deviendrait un autocollant ;
- les bouvreuils sont les **seuls personnages** du site. Un personnage se lit à sa
  silhouette et à sa pose. À ~55 px de haut, de nuit, un oiseau en volume perd
  l'ébouriffé et le sonné : il ne reste qu'une petite masse ;
- la décision 12.3 de `CONCEPT.md` a déjà refusé la perspective dans ce plan ;
- accessoirement : le canvas Three vit hors de `decor`, donc hors de la
  recoloration par la couleur du fond et hors du reflet.

**B — En 2D, cuit dans une image.** Le SVG des câbles et les PNG des bouvreuils
rasterisés, posés en sprites. *Écartée* : un fil cuit ne peut pas vibrer, et le
grain cuit dans une image réduite ensuite ~10× se salit — c'est exactement ce
qui avait dégradé les vitres avant qu'on les calcule au rendu. Les fils du SVG
sont en plus à 0,65–0,75 d'opacité : des mi-teintes.

**C — En 2D, dessiné au rendu, grain calculé. _Retenue._** Les câbles sont
redessinés depuis leur géométrie (le SVG n'est que ça : des rectangles et des
courbes). Les bouvreuils sont **redessinés pour la ligne** (§10) et leur contour
est quantifié à la cellule de grain du projet. Tout vit dans `decor`, qui porte
déjà le filtre de recoloration et qui est ce qu'on retourne dans le reflet : les
deux sont gratuits.

**D — Les fils fuyants.** Poteau après poteau vers l'horizon, l'image classique
de la fenêtre de train. Très belle, et écartée pour cette étape : elle demande
que les câbles soient **loin**, pas derrière la loco. C'est un autre cadrage de
la gare. Parkée, pas enterrée.

## 6. Ce qu'Emmanuelle a décidé

Les premiers points viennent de la conversation, les suivants de l'essai.

- **2D**, dans le même plan que le train, au style du premier plan.
- **Deux rangées de poteaux à deux vitesses** : une proche, une lointaine plus
  lente. De la profondeur par le rythme, pas par la perspective.
- **Le décor reste présent** quand le train traverse la gare sans s'arrêter, et
  les oiseaux y restent posés. Pas d'envol de peur pour l'instant.
- **Les corps tombent en bas de l'écran, sous l'horizon**, au lieu de se relever,
  et **ils ne se relèvent jamais**.
- **De nouveaux oiseaux arrivent**, pour que les fils ne se vident pas : le
  nombre d'oiseaux et de corps est, de son mot, « infini ».
- **La scène n'est jamais réinitialisée.** Le tas survit à la boucle, et la terre
  s'encombre au fil de la visite. C'est le but.
- **Pas d'enfoncement automatique des vieux corps.** Seulement si leur nombre
  finit par nuire au projet — pas par principe.
- **Les corps sonnés ne bougent pas d'eux-mêmes.**
- **Les oiseaux posés, eux, vivent** : ils se retournent, font un pas, s'ébouriffent.
- **Le souffle se calcule sur la position de la loco**, et pousse **vers
  l'arrière**, dans le sillage.
- **La réplique sort au début de la chute, sur le fil**, au-dessus de l'oiseau et
  jamais sur lui, avec une tache de nuit derrière elle pour rester lisible.
- **Les bouvreuils sont redessinés pour la ligne** (§10). Entre quatre recettes
  de matière, elle a choisi **« trait seul »** — donc la scène veut l'oiseau
  comme un trait, exactement comme le train.

## 7. Ce que j'ai décidé à sa place

Tout ce qui suit est mon choix, pas le sien. À relire et à corriger.

1. **Les corps tombent sur la terre, pas dans l'eau.** La bande sous l'horizon
   est un **reflet** : tout ce qui s'y trouve est la copie retournée de quelque
   chose au-dessus, et un corps qui n'existe que là n'aurait pas d'original. Il
   se poserait en plus sur l'eau, ce qui change le gag. Juste au-dessus il y a la
   bonne zone : **la terre** (`Terre.ts`). Leur reflet, lui, vient tout seul.
2. **Les oiseaux ne se posent que sur la rangée proche.** La rangée lointaine n'a
   que des fils. Sinon on voit des oiseaux qu'on a envie de cliquer et qui sont
   trop petits pour répondre.
3. **Les nouveaux oiseaux arrivent en vol**, depuis le bord du champ, et se
   posent sur une place libre — le fil vibre quand ils s'y posent.
4. **Les corps appartiennent à l'île de câbles, pas au sol.** La ligne est
   infinie vers l'avant : faire un tour de boucle n'y ramène pas au même
   endroit, le décor de « plus loin » est simplement réancré devant le train à
   chaque approche. Les corps voyagent avec lui — c'est la seule façon que « la
   scène n'est jamais réinitialisée » ait un sens sur une voie qui ne revient
   jamais.
5. **L'enfoncement des vieux corps dans la terre est une soupape, désactivée par
   défaut.** Spécifiée, pas branchée : le corps le plus ancien perdrait son trait
   jusqu'à se confondre avec les grains de la terre — ce que `CONCEPT.md` §5 fait
   déjà des étoiles très anciennes. On ne l'allume que si le tas nuit, et c'est
   Emmanuelle qui le dit (§12). Ce qui forcera la question n'est pas le coût —
   deux cents petits sprites ne coûtent rien — mais la **largeur de la bande de
   terre** : au-delà d'un certain nombre, les corps se chevauchent en un liseré
   blanc sous le train.
6. **On ne peut pas cliquer un oiseau pendant un passage à pleine vitesse.** Le
   décor file ; l'oiseau visé n'est plus là quand la chute se jouerait.
7. **Les répliques sont du HTML**, annoncées (CONCEPT §9). **Mais elles ne vivent
   pas dans `GarePlusLoin.vue`** : l'URL change à l'instant du clic sur une autre
   gare, bien avant que le train ne bouge, et le composant de gare serait détruit
   au milieu d'une phrase. Elles vivent dans une couche qui survit au changement
   de route.
8. **La tache de nuit des répliques est celle de `StarTooltip`** — un dégradé
   radial mélangé depuis `--fond`, qui suit donc l'œil. On ne réinvente pas un
   cadre : le projet a déjà résolu « du texte lisible par-dessus du grain ».
9. **Le compteur de répliques vit le temps de la visite**, pas au-delà.
10. **Les câbles roulent sur l'horloge des rails**, celle de la voie et de la
    terre (vitesse brute), et non sur celle du massif et de la frise (normalisée
    par étape). Les deux diffèrent d'un facteur 1,43 pendant la croisière : un
    poteau sur l'horloge du massif glisserait contre le ballast à chaque freinage.
11. **L'ancrage se fait sur la distance qui reste jusqu'à l'arrêt**, pas sur une
    position absolue : selon qu'on arrive d'« ici » en une étape ou d'« ailleurs »
    en deux, le sol parcouru diffère de ~320 px.
12. **La position à quai est composée, pas subie.** À l'arrêt, les oiseaux doivent
    être dans le champ libre à droite du nez de la loco. Une chute doit être vue.
13. **Les câbles passent derrière la rame, les oiseaux devant.** Sinon la chute
    traverse la silhouette du train et l'oiseau disparaît à mi-course. Vérifié
    dans l'essai.
14. **L'installation est une île, pas une ligne infinie.** Une étape avec arrêt ne
    parcourt que ~2 270 px de sol, soit à peine une largeur de cadre (2 320 px).
    Les câbles tiennent donc dans **deux travées environ**, et leurs extrémités
    se **dissolvent** au lieu de se couper net. C'est aussi ce qui les empêche de
    déborder sur « ici », qui n'est « rien que le ciel ».
15. **Les deux vitesses sont pour l'approche et le départ, pas pour l'arrêt.** Une
    parallaxe ne se voit que si ça bouge. La rangée lointaine entre plus tôt et
    sort plus tard, en se dissolvant : son travail, c'est le trajet.
16. **Un oiseau à la fois par séquence**, mais plusieurs chutes en parallèle sont
    permises : c'est le plaisir du jeu.
17. **L'envol de tous au départ de la gare** (CONCEPT §4.2) **tombe** : les
    oiseaux encore sur le fil partent avec le décor, les corps sont bousculés.
18. **Le grain des oiseaux est cuit une fois par pose**, et non recalculé à
    chaque image. L'essai a vérifié qu'un oiseau grainé **ne scintille pas** en
    culbutant, ce qui était le risque technique de l'étape — c'est ce qui avait
    fait rejeter des versions du massif. Les textures se refont au
    redimensionnement et au changement de densité de pixels, comme les vitres.

## 8. Contraintes

- **Même horloge que tout le reste** : à la distance, pas au temps. Le décor
  démarre, freine et s'arrête avec le train (CONCEPT §6).
- **Grain en texels du rendu**, `GRAIN_ECRAN = 1.5`, comme le massif, la terre et
  les vitres.
- **Blanc ou absent.** Pas de mi-teinte nouvelle. Les deux entorses assumées du
  projet (la lueur des vitres, le grisement du bas du reflet) ne s'étendent pas
  ici. La tache de nuit des répliques n'en est pas une : c'est du fond, pas du
  trait.
- **Le noir devient la couleur du fond.** Corps des poteaux et des oiseaux :
  `#0b0b0c`, repris par le filtre de `decor`.
- **Tout dans `decor`**, pour hériter de la recoloration et du reflet.
- **Ne pas fermer la porte à l'étape 5** : le gag ne doit piéger personne en
  mouvement réduit, et rien ne doit supposer une souris.
- **La scène reste pure** : aucun import de Vue dans `src/scene/`.
- **Piège Pixi, rencontré deux fois dans l'essai** : détruire une texture encore
  montée fait tomber tout le rendu. `sprite.texture` vaut la texture vide
  **partagée** tant qu'on ne lui en a pas donné une, et la fabrication d'une pose
  rend la main au rendu : on fabrique tout **avant** de rien détruire.

## 9. Le gag, et son minutage

Point de départ : le prototype du 8 novembre, corrigé par l'essai. Ce sont des
valeurs à revoir à l'œil, pas des constantes.

| Temps | Ce qui se passe |
|---|---|
| clic | le fil reçoit une secousse (amortie en `exp(-2,2 t)`, oscillation ~9 rad/s, flèche en `sin(πu)`) ; **la réplique paraît aussitôt**, au-dessus de l'oiseau, sur le fil |
| chute | impulsion vers le haut puis gravité ; l'oiseau culbute jusqu'à π, dans la pose **debout** |
| réplique | Inter Light 15 px sur une tache de nuit ; ~2,8 s, ~3,6 s au-delà de 24 caractères ; entrée en 0,35 s, sortie en 0,8 s en montant |
| au sol | pose `sonné` **sans rotation** — elle porte déjà le retournement ; trois étoiles tournent au-dessus de la tête ~2,4 s |
| ensuite | **il reste, et il ne bouge plus** |
| sur le fil | toutes les 3 à 8 s, un oiseau posé se retourne, fait un pas (avec un bond, et le fil vibre à la pose), ou s'ébouriffe |
| arrivée | un nouveau bouvreuil entre en vol et prend une place libre |
| souffle | au passage du nez de la loco, et seulement là : poussée **vers l'arrière**, force très variable — la plupart basculent à peine, un ou deux roulent loin —, un rebond sur la terre, puis le frein |

Neuf places **simultanées** sur les fils, à `u ∈ [0,08 ; 0,92]`, jamais deux à
moins de 0,1 l'une de l'autre. Ce n'est pas le nombre total d'oiseaux de la
visite, qui n'est pas borné.

**Les répliques** sont celles du §4.2 de `CONCEPT.md`, dans l'ordre, puis au
hasard parmi « aïe », « encore ? », « pfff », « hé ! ». Avec des oiseaux qui ne
s'épuisent pas, on atteint vraiment les dernières.

**Restent à placer**, que l'essai n'a pas joués : la pirouette de « Et je
danse. » avant la chute, et le regard de « … » — qui se redresse, fixe, et
retombe, puisqu'il ne repart plus.

## 10. Les assets

### Les câbles

`cables/cables-scene.svg` n'est que de la géométrie : quatre groupes de poteaux
espacés de **620 unités** dans un cadre 1280 × 832, pied à `y = 586`, sommet à
`y = 294`, et six fils en courbes quadratiques partant de `y = 315` et `y = 349`.
Attention : les décalages 92 et 104 sont des **points de contrôle**, la flèche
réelle à mi-portée en vaut la moitié — 46 et 52 unités.

Dans le cadre de la scène (× 1,8125), cela fait des poteaux de ~530 px pour un
train de 180 px, des fils à ~430 et ~490 px au-dessus des rails, et une travée
de ~1 120 px. Trois fois la hauteur du train, c'est beaucoup, et c'est
vraisemblablement voulu — une caténaire domine une rame. Vu dans l'essai : ça
tient.

On ne rasterise pas ce fichier : **on en lit les mesures** et on redessine en
points à pleine luminance. Le fil peut donc vibrer, et les opacités 0,65–0,75
deviennent une densité de points. Le pied des poteaux se cale sur
`HORIZON = 921`, pas sur un `y` de Figma.

### Les bouvreuils : redessinés

**C'est le changement le plus important de ce cadrage.** On ne retravaille pas
la matière des dessins existants : on redessine les poses.

Les bouvreuils actuels sont dessinés **pour un autre médium**. Toute leur
information est dans les **aplats** — corps `#5f5f67`, poitrine `#d9d9de`,
ventre `#f2f2f4` — et la règle du projet jette précisément les mi-teintes. La
preuve la plus nette : réduits à leur trait, **l'œil disparaît**, parce que
c'était un aplat. S'y ajoutent une quinzaine de formes distinctes pour ~55 px de
haut — là où le train tient à 180 px avec de longues droites — et le fait qu'un
bouvreuil se reconnaisse à sa **couleur**, qui n'existe pas ici.

Ce que les poses redessinées doivent respecter, vérifié dans l'essai :

1. **Profil strict**, comme tout le premier plan.
2. **Une silhouette fermée, remplie de `#0b0b0c`** : c'est elle qui fait que le
   corps **masse** et éteint la montagne, comme celui du train. Sans elle
   l'oiseau est creux.
3. **Tout ce qui porte l'information est un trait**, l'œil compris.
4. **Cinq ou six traits**, pas quinze formes.
5. **Les poses exagérées** : à cette taille, « pattes en l'air » ne se lit que si
   les pattes sont longues et écartées, doigts vers l'extérieur.
6. **Une aile en vol est une forme fermée qui masse**, pas un trait ouvert — deux
   traits montant du dos se lisent comme des antennes.

**Les poses nécessaires** sont moins nombreuses qu'avant : celle qui regarde à
gauche est la **même, retournée** au rendu. Il faut donc `perche`,
`perche-ebouriffe`, `sonne`, et deux images de vol — ailes hautes et ailes
basses suffisent à faire un battement.

Trois poses témoins existent sur la branche de l'essai (`essai-perche`,
`essai-sonne`, `essai-vol-haut`, `essai-vol-bas`). Elles ont servi à vérifier le
**genre** de dessin, pas à être gardées.

### La recette de matière

Quatre ont été comparées dans la scène ; Emmanuelle a choisi **« trait seul »** :

- le contour est **plein, d'une cellule de grain**, obtenu en allumant toute
  cellule que le contour traverse — on balaie la cellule entière et non son seul
  centre, sans quoi un trait plus fin qu'un pixel passe entre deux centres et
  sort troué ;
- le corps ne reçoit **aucune matière** : il n'est que la masse couleur du fond.

Taille de départ : la largeur du cadre de la pose (viewBox 120 × 90) fait
**~92 px de cadre**, soit un oiseau d'environ 55 px pour un train de 180.

## 11. Où ça vit dans le code

```
src/scene/
  Cables.ts     les deux rangées, leur défilement à la distance, la vibration
  Birds.ts      les bouvreuils : poses, gestes sur le fil, chute, tas, arrivées,
                le souffle au passage de la loco
  oiseaux.ts    les fonctions pures : places libres, choix du geste, soupape
src/components/
  RepliquesOiseaux.vue   les répliques (HTML, aria-live) et le bouton clavier,
                         hors de la route pour survivre au départ (§7.7)
```

- `Cables` s'ajoute à `decor` **derrière** la rame, `Birds` **devant** (§7.13).
- La scène gagne de quoi savoir **où est « plus loin » sur la ligne**, et émet
  `birdFell(x, y)` — l'événement existe déjà dans `events.ts` — **au clic**, à la
  hauteur du haut de l'oiseau, et non à l'arrivée au sol.
- **Vue décide quoi dire**, la scène décide **où** et **comment ça bouge**. La
  variante de séquence (pirouette, regard) et la durée d'affichage sont passées à
  la scène par l'appelant, puisqu'elles dépendent du texte.
- Le bouton clavier emprunte exactement le même chemin qu'un clic.

## 12. Ce qui revient à Emmanuelle

- **Redessiner les poses** selon les six règles du §10.
- **Régler les deux vitesses** et la **taille des poteaux**.
- **Juger la profondeur de la terre** : elle fait 46 px de cadre, un oiseau
  couché en fait ~60. Posés dessus, les corps ont l'air d'être *sur* la voie ;
  descendus, ils mordent le haut du reflet. Il faudra peut-être la creuser à
  cette gare.
- **Regarder le passage des corps sous la rame.** Le train est fixe à l'écran et
  c'est le sol qui glisse : **tous** les corps défilent sous les roues à chaque
  départ et à chaque passage. Si ça se lit comme un écrasement, ce n'est pas un
  cas limite — c'est l'idée des corps qui restent qui ne tient pas.
- **Dire quand le tas devient trop** (§7.5).

## 13. Changements à apporter à `CONCEPT.md`

- §4.2 : deux rangées de poteaux à deux vitesses, et non « deux poteaux » ; les
  oiseaux ne se posent que sur la rangée proche.
- §4.2 : le gag change de fin. La réplique sort **au début de la chute**.
  L'oiseau ne se relève pas et ne retourne pas se poser ; il reste au sol et n'y
  bouge plus, un autre arrive, les corps s'accumulent, et le passage de la loco
  les bouscule sans les effacer. L'envol de tous au départ disparaît.
- §4.2 : la gare **ne se réinitialise jamais** ; la terre s'encombre au fil de la
  visite.
- §4.2 : les oiseaux posés ont une vie propre — demi-tours, pas sur le fil,
  ébouriffages.
- §4.2 : le décor existe aussi quand le train traverse sans s'arrêter.
- §7 : `cables-scene.svg` sert de **mesures**, pas de texture ; et les bouvreuils
  sont **redessinés pour la ligne**, en moins de poses qu'avant.
- §9 : ajouter `Cables.ts` à côté de `Birds.ts`, et la couche des répliques hors
  de la route.

## 14. Laissé au constructeur

- La fabrication exacte des textures de pose (seuil, dilatation, cache par
  densité de pixels), en suivant ce que l'essai a établi.
- La physique du souffle : courbe de force, rebond, frein.
- Le nombre de travées fabriquées et le recyclage des poteaux sortis du champ.
- La structure de données des places sur les fils et du tas.
- Le comportement en mouvement réduit. Défaut proposé : l'oiseau ne tombe pas, la
  réplique paraît quand même — le contenu est le but, la chute est le plaisir.
- Les tests : au minimum les fonctions pures (places libres, gestes, soupape,
  ordre des répliques), la pureté de `src/scene/`, et le fait que le clic d'un
  oiseau n'ouvre pas de bulle d'étoile.
