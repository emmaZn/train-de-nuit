# Essai jetable — « plus loin », 15 novembre 2026

Branche `spike-plus-loin`. À jeter. Rien ici n'est du code de production :
`src/scene/Oiseaux.ts`, `src/components/RepliquesSpike.vue`, et six accroches
dans `Scene.ts` / `useScene.ts` marquées `ESSAI JETABLE`.

Pour le revoir : `npm run dev`, puis `/plus-loin`. En bas à gauche, deux rangées
de réglages : la **pose** des oiseaux posés, qu'on peut figer pour juger chaque
dessin, et la **matière**. Le bouton « faire tomber un oiseau » est en bas à
droite, invisible jusqu'au focus clavier.

Le jeu de poses d'essai est complet : `essai-perche`, `essai-perche-ebouriffe`,
`essai-sonne`, `essai-vol-haut`, `essai-vol-bas`. Celle qui regarde à gauche est
la même, retournée au rendu.

## Les quatre variantes de matière

Sélecteur en bas à gauche de l'écran. Elles balaient le seul axe qui compte :
du **trait pur** (le langage du train) à la **matière pure** (celui du massif).

| | Ce que c'est | Ce qu'on y gagne, ce qu'on y perd |
|---|---|---|
| **1 · trait seul** | contour d'une cellule, corps vide | le plus proche du train ; mais l'oiseau est creux et son œil disparaît |
| **2 · trait + matière** | contour de deux cellules, corps dense | le plus lisible ; peut-être plus blanc que le train |
| **3 · tout en points** | pas de trait, le contour devient la matière la plus dense | la matière du massif, exactement ; la silhouette s'adoucit, pattes et bec se perdent |
| **4 · trait grainé** | contour en points, corps épars | le plus léger ; c'est aussi celui où l'oiseau perd sa forme |
| **5 · nouveau dessin** | la recette 1, sur un dessin fait pour la ligne | le test de l'hypothèse ci-dessous |

Emmanuelle a choisi **« trait seul »** — donc la scène veut l'oiseau comme une
**ligne**, exactement comme le train. Et elle a ajouté : « peut-être que les
assets sont mal choisis. »

### Le diagnostic, et le test

Les bouvreuils sont dessinés **pour un autre médium** : toute l'information est
dans les **aplats** (corps gris, poitrine claire, ventre plus clair), et la
règle du projet jette précisément les mi-teintes. La preuve : en « trait seul »,
**l'œil disparaît**, parce que c'était un aplat. S'y ajoutent une quinzaine de
formes distinctes pour 50 px — là où le train tient à 180 px avec de longues
droites — et le fait qu'un bouvreuil se reconnaisse à sa **couleur**, qui
n'existe pas ici.

La variante 5 teste l'hypothèse : `essai-perche.svg`, `essai-sonne.svg`,
`essai-vol.svg`, profil strict, six traits, une **silhouette fermée remplie de
`#0b0b0c`** pour que le corps masse comme celui du train, l'œil en trait, le bec
court et conique, et sur le sonné des pattes très allongées, écartées, pour que
« pattes en l'air » se lise à cette taille. La pose qui regarde à gauche est la
même, retournée.

C'est une main qui n'est pas la sienne : le test dit si le **genre** de dessin
est le bon, pas si ce dessin-là est bon.

**Le dessin retenu : « sans intérieur ».** Cinq dessins de perché ont été
comparés dans la scène — boule à nuque, boule nue, plus oiseau, tête à part,
sans intérieur. Elle a pris le dernier : **la silhouette et l'œil, rien
d'autre.** Pas de calotte, pas de ligne d'aile. Les autres poses s'y sont
alignées ; seules restent les marques qui portent un sens — les plumes de
l'ébouriffé, la croix dans l'œil et les pattes en l'air du sonné.

**Deux poids de trait, pas un.** Tout affiner d'un cran avait emporté le
« mignon » avec l'épaisseur. La silhouette, le bec et l'aile tiennent **1,5
unité** — c'est de là que vient la rondeur — l'œil **1**, les pattes et les
plumes **1,2**. (Passage par 2, trop gras, puis 1,2 partout, trop sec, puis 1,8
sur la seule silhouette, encore « un chouia trop large ».)

**La réplique s'affiche toujours au même endroit**, en haut au centre, sous la
frise. Elle n'a plus ni à éviter le train ni à suivre l'oiseau, et une seule
phrase est à l'écran à la fois : une nouvelle chute remplace la précédente.
`birdFell(x, y)` n'a donc plus besoin de porter de coordonnées.

**Le balayage est retiré.** Il a été essayé dans tous les sens — tous les corps
à un signal de départ, puis au passage du nez de la loco, vers l'avant puis vers
l'arrière, en roulant puis en glissant. Le dernier état était juste, et elle l'a
quand même retiré : « on oublie le balayage pour le moment ». Les corps restent
exactement où ils tombent. **L'idée n'est pas enterrée** — c'était la sienne au
départ — elle attend.

Ce que l'essai en retient quand même : depuis que le corps est une bosse
plantée, il ne peut pas **rouler**, puisque tourner montrerait sa base plate.

**Le sonné est une bosse, pas un oiseau couché.** Quatre formes ont été
comparées — un dôme, une bosse à demi enfoncée, la silhouette du perché
retournée, une version aplatie. Elle a pris la **bosse**. Un oiseau couché
dessiné de face ou de dos finit toujours par se lire comme un insecte : deux
pattes identiques sur un ovale lisse font des antennes, et un visage à cette
taille embrouille au lieu d'aider. La bosse supprime le problème au lieu de le
résoudre — on ne dessine plus un oiseau couché, on dessine un monticule planté
dans la terre, avec deux petites pattes qui dépassent. Elle n'a **pas de trait
sous elle** (le remplissage descend hors du cadre, le contour s'arrête au sol),
sans quoi elle flotterait au lieu d'être plantée.

`SOL` remonte à `HORIZON + 55` : la base de la bosse doit s'enfoncer dans la
bande de terre, pas dans l'eau du reflet.

**Le vol réutilise la silhouette du perché**, simplement inclinée de 12°, plus
une aile. C'est la simplification la plus forte : il n'y a plus qu'un corps
d'oiseau dans tout le jeu, et le vol ne demande plus de le relire. Le sonné a
perdu sa queue carrée et ses inflexions : un dôme, deux pattes, une croix.

**Taille : 80 px de cadre** pour la largeur du viewBox, soit un oiseau d'environ
50 px pour un train de 180. 92 était « un peu trop gros ».

**Résultat : l'hypothèse tient.** « Ta variante 5 est beaucoup plus sympa. »
Donc les bouvreuils seront **redessinés pour la ligne** — c'est une décision,
et elle change le §10 du cadrage, qui disait qu'on garderait le dessin
d'Emmanuelle en n'en retravaillant que la matière.

Le vol a demandé un second tour : deux traits ouverts montant du dos se lisent
comme des antennes. **Une aile doit être une forme fermée qui masse**, comme le
corps. Deux images — `essai-vol-haut`, `essai-vol-bas` — suffisent à faire un
battement.

Si aucune ne marche, alors le problème n'est pas la recette de grain : c'est le
dessin lui-même, sa taille, ou le fait qu'un personnage n'ait pas sa place dans
une scène qui n'a que des matières. C'est la discussion à avoir.

## Les raccourcis de l'essai — ce ne sont pas des décisions

- Les câbles sont visibles **à toutes les gares** et reviennent par la droite
  quand ils sortent : l'essai ne sait pas où est « plus loin » sur la ligne.
- **Une seule rangée** de poteaux : pas de deuxième vitesse.
- Pas de pirouette sur « Et je danse. », pas de regard de « … ».
- Les répliques s'affichent à la hauteur du corps, donc très bas, par-dessus le
  train.

## Les trois questions

**1. Le tas est-il drôle ou sinistre ?** — *drôle.* Emmanuelle l'a regardé :
« le tas au repos ça me va », et « l'ensemble de la composition marche très
bien ». Les corps restent donc, et **immobiles** : voir ci-dessous.

**2. Un bouvreuil se lit-il une fois grainé ?** — **question ouverte, et c'est
la seule qui reste.** J'avais répondu « oui » sur un zoom : à l'écran, non.
Deux tours ont suivi. Le trait à **une** cellule (1,15 px) se dissolvait dans le
grain du massif et de la terre — le train tient parce qu'il a de longues
droites, un oiseau de 50 px n'a que des courbes courtes. Dilaté à **deux**
cellules, avec une vraie matière dans le corps, il devient lisible. Mais
Emmanuelle : « les oiseaux sont lisibles cette fois-ci, mais je ne sais pas, ça
ne marche pas. » À reprendre avec elle **avant** d'écrire le vrai code : c'est
le cœur de la gare, et ça peut changer la forme de l'étape.

**3. Scintille-t-il en tournant ?** — *non.* Vérifié à l'écran : « ça ne
scintille pas ». Le grain cuit dans la pose tient la rotation. C'était le risque
technique de l'étape, il tombe.

## Valeurs trouvées à l'œil

| Constante | Valeur | Ce qu'on a appris |
|---|---|---|
| `TAILLE_OISEAU` | **80** px de cadre (largeur du viewBox) | 110 donnait un oiseau énorme, de la taille d'une fenêtre de wagon. À 80, l'oiseau fait ~50 px pour un train de 180 |
| `EPAISSISSEMENT` | **1,6** | 2,1 donnait un trait gras de dessin animé. La cellule de grain quantifie de toute façon le trait à **une cellule pleine** : c'est ce qui le sauve, et c'est exactement la finesse du reste de la scène |
| `FORCE` / `COURBE` | **0,28** / 1,3 | corps ≈ 7 % de points, ventre clair ≈ 22 % : le dos reste sombre et masse, le ventre garde sa signature |
| `SOL` | `HORIZON + 72` | voir ci-dessous |

## Ce qu'Emmanuelle a tranché en regardant

- **Les corps sonnés ne bougent pas.** J'avais mis un balancement et des
  sursauts, par peur du charnier. Elle : « bizarre que les oiseaux sonnés
  bougent pour aucune raison ». Retiré — un corps ne bouge que si le souffle le
  pousse. La peur du charnier était la mienne, pas un fait.
- **Les oiseaux posés, eux, vivent** : ils se retournent, font un pas sur le
  fil, s'ébouriffent, toutes les 3 à 8 s. C'est là que va le mouvement.
- **Le souffle déplace beaucoup et fait peu tourner.** Première version :
  ridicule, trois centimètres. Deuxième : trop de rotation. La bonne mesure est
  une longue course et un quart de tour.
- **Le souffle se calcule sur la position de la loco, pas sur une horloge.**
  Deux erreurs à moi, qu'elle a vues tout de suite : les corps partaient tous à
  un signal de départ, donc **avant** que le train ne les atteigne ; et ils
  étaient poussés **vers l'arrière**, alors qu'une rame qui double entraîne dans
  son sens. Un corps n'est bousculé qu'au passage du nez de la loco (fixe à
  l'écran, `TETE_LOCO`), dans le sens de la marche, avec une force qui suit la
  vitesse. Conséquence gratuite : un train qui **traverse** la gare bouscule le
  tas lui aussi, sans qu'on ait rien à brancher.
  Reste à voir : les corps déjà sous la rame au moment du départ ne sont jamais
  bousculés, puisque la loco les a dépassés avant l'arrêt. Il faudra peut-être
  que les wagons les remuent aussi.
- **La réplique sort au début de la chute, sur le fil**, et non à l'arrivée au
  sol. L'oiseau parle en tombant.
- **`bouvreuil-sonne` est déjà retourné dans le SVG** (`rotate(180 60 52)`, avec
  la croix dans l'œil). Le faire tourner le remet à l'endroit. La chute culbute
  donc la pose **debout**, et l'arrivée pose `sonne` sans rotation.

## Ce que l'essai a révélé, et qui n'était pas dans le cadrage

1. **La bande de terre est trop mince pour les corps.** Elle fait 46 px de
   cadre ; un oiseau couché en fait ~60. Posés dessus, les corps chevauchent
   les rails et ont l'air d'être *sur* la voie. Descendus (`HORIZON + 72`), ils
   passent sous le ballast et mordent le haut du reflet. Aucune des deux
   positions n'est évidente : c'est un choix d'œil, et il faut peut-être
   creuser la terre à cette gare.
2. **Tous les corps passent sous la rame, à chaque départ.** Le train reste
   fixe à l'écran : c'est le sol qui glisse vers la gauche sous lui. Donc chaque
   corps défile sous les roues au départ comme au passage, et pas seulement un
   malchanceux. Aucune règle de zone d'atterrissage n'y change rien. Si ça se
   lit comme un écrasement, ce n'est pas un cas limite à corriger : c'est l'idée
   des corps qui restent qui ne tient pas. **C'est le moment précis à
   regarder.**
3. **Les oiseaux doivent être devant le train, les câbles derrière.** Sinon la
   chute traverse la silhouette de la rame et l'oiseau disparaît à mi-course.
4. **Les répliques s'empilent en bas de l'écran** quand on joue vite, par-dessus
   le train. Il leur faut une hauteur à elles, pas celle du corps.
5. **Piège Pixi, rencontré deux fois** : détruire une texture encore montée fait
   tomber tout le rendu (`alphaMode` de `null`). Deux causes : `sprite.texture`
   vaut la texture vide **partagée** tant qu'on ne lui en a pas donné une ; et
   `grainer` rend la main au rendu entre deux poses, donc il faut tout fabriquer
   avant de rien détruire.
