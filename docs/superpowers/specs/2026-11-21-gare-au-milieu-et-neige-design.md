# La gare au milieu, la neige, et le panneau par-dessus tout

> Conception du 21 novembre 2026, écrite après la page « Où tombe la gare »
> (https://claude.ai/artifact/PuqG59x5kPKxmiKmDG1gMQ), qui a montré à la
> propriétaire les compositions à l'échelle avec ses propres dessins. Relue le
> même jour par un constructeur frais : ses cinq questions sont traitées dans le
> texte, et la plus grave — le panneau qui cessait de couvrir l'horloge au-delà
> de 1920 px — a changé la conception du panneau.
>
> **Base.** `HEAD` est `f44deee` : le panneau-rideau en volets y est commité, et
> c'est lui que décrit la colonne « aujourd'hui » des mesures. `DECALAGE_GARE =
> 626`, le réverbère à 1390 et sa hauteur 400 sont des choix de la propriétaire,
> essayés à la main dans `quai.ts` le même jour ; l'arbre de travail les porte
> déjà, sous une forme à corriger (voir « Le réverbère »).
>
> **À ne pas toucher** : `grain.ts`, `grain.test.ts`, `poses.ts`, `CableLayer.ts`
> et son test appartiennent au travail de grain des poteaux et des oiseaux, mené
> par une autre session, et atterrissent séparément. `GRAIN_ECRAN = 1.5` y reste.

## Intention

Six demandes du même matin, qui forment un seul mouvement : **faire de la gare
d'« ailleurs » le centre de la scène, et de sa nuit quelque chose qu'on
regarde.**

Aujourd'hui l'horloge est à 1726 sur une scène de 2320. Sur un écran de bureau
elle est là, en haut à droite ; sur un téléphone, dont la bande de cadre visible
va de 879 à 1441, **ni la gare ni l'horloge ne sont à l'écran.** La commande du
panneau, qui est l'horloge, n'existait donc sur mobile que par le cadran de
secours ajouté la veille. La gare descend au milieu, et le problème disparaît.

Dans le même geste : le panneau cesse d'être une plaque de la scène pour devenir
ce qu'il est déjà à moitié — une boîte de dialogue qui recouvre tout ; le
réverbère perd son halo rond pour ne garder que son cône, et s'éteint quand on
le touche ; et il neige sur la gare, surtout dans ce cône.

## Buts

1. **L'horloge au milieu de la scène**, donc visible sur tout écran, téléphone
   compris. Avec elle le corps de gare, dont elle occupe le centre.
2. **Le panneau passe devant tout** : frise de navigation comprise, fumée et
   oiseaux compris.
3. **Un moyen de fermer le panneau qui ne soit pas l'horloge**, puisque le
   panneau la recouvre désormais.
4. **Le panneau à coins droits**, sans biseau.
5. **Un réverbère un peu plus court, sans halo rond**, dont il ne reste que le
   faisceau triangulaire — et qui s'éteint au clic.
6. **De la neige qui tombe sur cette gare seulement**, particulièrement visible
   dans le faisceau, et qui s'arrête quand le train repart.

## Non-buts

- Déplacer le train. `TETE_LOCO` est global : la rame s'arrête au même endroit
  aux quatre gares, et elle y reste.
- Refaire le dessin de la gare ou du réverbère. Les PNG ne changent pas.
- Donner à la neige un vent, une accumulation au sol, ou une interaction avec
  le pointeur.
- Rendre la nuit réglable par le visiteur. Le réverbère s'éteint ; c'est un
  jouet, pas un réglage qu'on garde.
- Toucher aux trois autres gares, qui ne reçoivent ni neige ni fondu au noir.

## Anti-buts

Ce qui ferait rater le travail même s'il fonctionne :

- **Un réverbère caché par la rame.** C'est ce qui a fait écarter la première
  composition : le mât noyé dans les wagons, 42 % du bas du cône avalés, et la
  neige qui devait briller dedans invisible. Le faisceau est le sujet des
  demandes 5, 6 et 7 ; s'il est mangé, les trois tombent.
- **Un panneau qu'on ne sait plus fermer.** Il recouvre sa propre commande.
  S'il n'y a pas de sortie évidente et atteignable au clavier, il piège le
  visiteur.
- **De la neige qui coûte une image par flocon.** La scène tient à 60 im/s sur
  un téléphone ; une population reconstruite à chaque image ne passe pas.
- **Perdre le grain.** Les mi-teintes sont l'exception dans ce projet
  (CONCEPT §12.2) ; la neige n'a pas le droit d'en inventer de nouvelles
  au-delà de ce que les trois lumières de la gare ont déjà obtenu.

## Contraintes

- **« Blanc ou absent » (CONCEPT §12.2).** Le blanc pur est réservé aux sources
  de lumière. La neige est éclairée par le réverbère : elle a droit au régime
  des trois lumières de la gare (lanterne, cône, horloge), pas à un quatrième.
- **Pureté scène ↔ Vue.** `src/scene` n'importe jamais Vue (`purity.test.ts`).
  La scène reçoit son état par des accesseurs et rend compte par `SceneEvents`.
- **Deux repères.** Pixels de cadre (scène 2320 × 1217) et pixels d'écran. Les
  tests passent par `cadrageScene`, jamais par `fitStage`.
- **CONCEPT §11.** Moins de particules sous `SEUIL_MOBILE` ; rien ne bouge sous
  `prefers-reduced-motion`.
- **Le plan `lumieres` reste derrière la rame.** Le mettre devant ferait passer
  le réverbère par-dessus le train à chaque départ. Ce commentaire est dans
  `Scene.ts` ; il tient toujours.
- **Le CV reste au-dessus de tout**, panneau compris.

## Place et taille

Tous les nombres sont en pixels de cadre. `E = 1813 / 2114 = 0,857616` convertit
les pixels de l'image du bâtiment.

### La gare

| | aujourd'hui | après |
|---|---|---|
| `DECALAGE_GARE` | 60 | **626** |
| bord gauche du bâtiment | 817,3 | **251,3** |
| corps de gare | 1364,5 → 2090,1 | **798,5 → 1524,0** |
| horloge | **1726,4** | **1160,4** (milieu : 1160) |
| `FIN_GARE` | 2690,3 (hors cadre) | **2064,3** |

L'horloge garde son `y` (595,9) et son rayon (29,2) : seule l'abscisse bouge.

**Conséquence à assumer** : la marquise de droite, que la propriétaire avait
accepté de ne jamais voir à l'arrêt (mémoire `gare-v2-ailleurs`, 20 novembre),
**rentre dans le cadre** — `FIN_GARE` passe de 2690 à 2064. C'est un gain, pas
une perte, mais c'est un retournement d'une décision écrite : à lui montrer.

### Le réverbère

Il **se détache de `DECALAGE_GARE`** et se pose à `x = 1390`, en clair. C'est le
cœur de l'option retenue : la gare glisse sous lui, et il se retrouve devant
elle, sur le quai — sa place sur un vrai quai.

**Écrire 1390, et non `1990 − DECALAGE_GARE`.** La propriétaire a posé la
seconde forme à la main pour visualiser, quand `DECALAGE_GARE` valait 600 : les
deux donnaient alors le même 1390. Gardée, elle rendrait le réverbère solidaire
de la gare — à 626 elle le ramène déjà à 1364, et un prochain réglage le ferait
rentrer dans la rame, c'est-à-dire exactement l'option écartée. Le découplage
est la décision ; la forme littérale est ce qui la rend vraie.

| | aujourd'hui | après |
|---|---|---|
| `x` | 1330 (= 1390 − `DECALAGE_GARE`) | **1390**, en clair |
| hauteur | 490 | **400** |
| demi-embase | 35,0 | 28,6 |
| emprise | 1295,0 → 1365,0 | **1361,4 → 1418,6** |
| lanterne (sommet du cône) | 525,5 | **598,1** |
| cône | 359,5 de haut, base 460 | **286,9 de haut**, base 460 |

Le nez de la rame est à **1299,2**, l'emprise du réverbère commence à 1361,4 :
**62,2 px de dégagement.**

La hauteur 400 est un choix d'œil de la propriétaire (21 novembre), fait en
comparant trois hauteurs sur la scène à l'échelle. Elle avait d'abord essayé
310 : le cône n'y faisait plus que 214 px de haut pour 460 de base, un éventail
plutôt qu'un faisceau — et c'est dans ce volume que la neige doit se lire.

**Ce que la rame mange quand même du cône.** Le mât est dégagé ; le cône ne
l'est pas tout à fait. Sa base court de 1160 à 1620 à y = 885, et la rame
s'arrête à 1299,2 en montant jusqu'à y ≈ 749 : **17,4 % de l'aire du cône** —
son coin bas-gauche — reste derrière les wagons. C'est moins qu'aujourd'hui
(25,6 % à 1330 et 490) et nettement moins que l'option écartée (27,8 %), donc
la composition retenue **améliore** ce point au lieu de l'aggraver. Mais ce
n'est pas zéro, et c'est la partie basse, la plus large : la neige du faisceau
se lira surtout dans la moitié droite du cône. À regarder une fois que ça
tourne ; si ça gêne, c'est `DEMI_BASE` qui se règle, pas le plan des lumières.

`DEBUT_GARE` et `FIN_GARE` n'ont pas besoin de changer de formule : avec le
bâtiment à 251,3 et le réverbère à 1330, le `min` et le `max` tombent déjà tous
les deux sur le bâtiment.

### Ce que chaque écran voit

Bande de cadre visible, par `fitStage` en « cover ». L'horloge est à 1160,4 et
le réverbère à 1390 : les deux tiennent partout.

| écran | bande | horloge | réverbère |
|---|---|---|---|
| 1512 × 771 | 0 → 2320 | ✓ | ✓ |
| 1920 × 1080 | 78 → 2242 | ✓ | ✓ |
| 1024 × 768 | 349 → 1971 | ✓ | ✓ |
| 390 × 844 | 879 → 1441 | ✓ | ✓ (cône rogné à droite) |

### La pile du DOM

| plan | z-index |
|---|---|
| frise de navigation | 2 |
| œil | 3 |
| bulles d'étoiles, répliques | 5 |
| liste d'étoiles | 10 |
| **panneau** | **15** |
| **commande du panneau** | **16** |
| CV | 20 |

## Approches

### Amener la gare au milieu

Trois chemins, montrés à l'échelle dans la page « Où tombe la gare ».

- **Déplacer la vue** plutôt que la gare. **Écarté, impossible** : à 1512 px de
  large les 2320 px de la scène sont déjà tous à l'écran. Décaler la caméra vers
  l'horloge découvrirait 369 px de vide à droite du cadre.
- **La gare au milieu, le réverbère la suit** (à 764). **Écarté** : il tombe en
  plein dans la rame, qui occupe −76 → 1299 et monte à 180 px au-dessus du rail.
  39 % du mât et 42 % du bas du cône — la partie large — passent derrière les
  wagons, et sur un téléphone il sort de l'écran par la gauche. C'est l'anti-but
  nº 1.
- **La gare au milieu, le réverbère reste à 1330.** **Retenu.** Le prix : la
  composition du 20 novembre (loco, réverbère, gare, de gauche à droite) devient
  « loco, gare, et le réverbère devant elle », et ce n'est plus un seul nombre
  qui déplace toute la gare.

Le chevauchement de la loco et du flanc gauche du bâtiment est **assumé** :
« ce n'est pas grave si les 2 se chevauchent » (21 novembre).

### Faire passer le panneau devant tout

- **Monter le plan `rideau` devant `plateau`.** Insuffisant : ça règle la fumée
  et les oiseaux, mais **un canvas ne peut jamais passer devant un élément du
  DOM**, et la frise en est un.
- **Effacer la frise pendant que le panneau est baissé.** Écarté : ce n'est pas
  « par-dessus », c'est « à la place de », et ça ajoute un mouvement à l'écran.
- **Le panneau quitte le canvas.** **Retenu.** Le rendu détaché — celui qui
  existe déjà sous 720 px — devient le seul. Le DOM dessine la plaque, les bras
  et le bandeau ; `RideauLayer` disparaît.

Ce que ça supprime au passage, sans effort : la fumée de la locomotive qui
passait devant la plaque, la plaque fantôme du canvas derrière le panneau
détaché, et les deux rendus à tenir en accord.

### Où vit la neige

- **Une couche DOM au-dessus de tout**, flocons devant le panneau baissé.
  Écarté par la propriétaire : une telle couche ne sait pas où est le cône du
  réverbère ; il faudrait lui redonner sa géométrie à la main et elle se
  décalerait à chaque redimensionnement.
- **Dans le canvas.** **Retenu.** Le cône est déjà un polygone calculé
  (`coneDuFaisceau`) : la population lumineuse s'y découpe en masque, exactement,
  et s'éteint avec le réverbère sans qu'on ait à le lui dire.

## Ce qui est décidé

### 1. La gare descend au milieu

`DECALAGE_GARE` passe à 626. `PIECES.reverbere.x` devient **1330 en clair**, sans
soustraction — et son commentaire dit pourquoi : il se tient devant la gare, pas
à son bord.

L'en-tête de `quai.ts` affirme que `DECALAGE_GARE` est « le seul nombre à
changer » pour déplacer la gare. **Ce n'est plus vrai** : il déplace le bâtiment
et ce qui en dérive, pas le réverbère. Le commentaire doit être réécrit, pas
contourné.

**Un test tombe, et c'est le test qui a tort.** Dans `quai.test.ts`, « l'horloge
ne tombe pas sur le réverbère » asserte

```
HORLOGE.x − HORLOGE.rayon × HALO_HORLOGE.rayon  >  PIECES.reverbere.x + embase
```

c'est-à-dire « l'horloge est entièrement **à droite** du réverbère ». C'était
vrai avec l'horloge à 1726 et le réverbère à 1330 ; la gare au milieu **inverse
l'ordre** — 1160 contre 1390. L'intention du garde, posée le 20 novembre (que le
cadran ne tombe pas sur le mât, deux lumières l'une dans l'autre), est intacte :
le halo s'arrête à 1230,4, le mât commence à 1361,4, **131 px d'écart**.

Le test est donc à **reformuler en « les deux disques ne se touchent pas »**,
sans présumer lequel est à gauche : ainsi il garde sa valeur si la gare rebouge.
Le relever à la main pour le faire passer, ou l'écarter, serait perdre le garde.
Mesure confirmée indépendamment par une seconde session le 21 novembre.

### 2. Le réverbère

- Hauteur **490 → 440**. Lanterne, lueur et sommet du faisceau suivent déjà
  l'échelle (`hauteur / CADRES.reverbere.hauteur`) : rien d'autre à calculer.
- **`LUEUR` est supprimée** — le halo rond autour de la lanterne, ses 60 nappes
  et son rayon de 150. Le corps blanc de la lanterne reste : c'est la source, pas
  le halo.
- Le cône, lui, ne change pas de réglages. Il raccourcit seulement parce que son
  sommet descend : 319,1 px de haut au lieu de 359,5.

### 3. Le réverbère s'éteint

Un état `allume` sur la gare, vrai par défaut. Éteint, il emporte **la lanterne
blanche, le cône peint, la poussière du cône et la neige du cône** — tout ce qui
est lumière. Le mât, qui est du décor, reste.

- **Au clic** sur le réverbère, et **au clavier** par un bouton transparent posé
  dessus, comme l'horloge en a un. Il porte `aria-pressed`, et son nom dit l'état
  (« Éteindre le réverbère » / « Allumer le réverbère »).
- **Seulement à l'arrêt.** Comme l'horloge : en route, le bouton est `disabled`
  et `pointer-events: none`. C'est la correction qui a déjà été faite pour
  l'horloge — un disque invisible qui reste à la place d'arrêt pendant que la
  gare défile mange les clics et les bulles d'étoiles.
- **Il se rallume quand on revient.** L'état ne survit pas au départ du train.
- **La cible fait au moins 44 px d'écran de large**, quelle que soit l'échelle :
  l'emprise du réverbère ne fait que 57,1 px de cadre, soit 37 px sur un écran
  de 1512. Elle s'élargit donc, et déborde d'environ 3 px de cadre sur le nez de
  la loco — sans conséquence, la rame ne se clique pas.
- **En hauteur, elle couvre tout le mât**, de la lanterne au rail. Mais le
  bouton transparent qui la porte ne doit pas avaler les appuis qui tombent
  dessus sans la viser : c'est exactement le défaut déjà corrigé pour l'horloge,
  dont le disque `disabled` mangeait les clics et les bulles d'étoiles pendant
  que la gare défilait. La bande où les étoiles se posent descend de la frise
  jusqu'à la crête du massif, et le mât court de 360 à 620 px d'écran sur un
  1512 : **elles se croisent.** À régler par la mesure, pas par le raisonnement —
  le même `elementFromPoint` qui a servi à sceller le trou de l'horloge.

### 4. Le panneau quitte le canvas

- `detache` devient **toujours vrai**. Le rendu sous `SEUIL_MOBILE` devient le
  rendu unique ; `RideauLayer.ts` et le plan `rideau` de `plansDuDecor`
  disparaissent, ainsi que le tracé de la plaque, des bras et du biseau en canvas.
- La scène garde **l'état et la position** du rideau (`Rideau`, `yPoseA`,
  `yRangeA`, les événements) : c'est elle qui commande, et le DOM qui dessine.
- **`--biseau: 0px`** et `BISEAU = 0` : coins droits. `pointsBiseau` rend déjà
  les quatre coins dédoublés à biseau nul — la forme reste juste.
- **Le cadran épinglé en bas à droite disparaît.** Sous le seuil mobile, la
  commande se déplaçait en un petit cadran de 52 px portant l'heure, parce que
  l'horloge de la gare était hors champ sur un téléphone. La gare au milieu
  règle ce manque à la racine : l'horloge est désormais visible sur tout écran,
  et le cadran de secours n'a plus de raison d'être — décision de la
  propriétaire, 21 novembre. `cadranDessine`, `cadranMontre` et la règle
  `.commande.visible` s'en vont. La commande reste ce qu'elle est sur grand
  écran : un disque transparent posé sur l'horloge, et, panneau posé, sur
  l'heure de son bandeau.
- **`z-index: 15`** sur le panneau, **16** sur sa commande. Le CV reste à 20.

**La plaque garde la géométrie du cadre, elle ne devient pas une boîte de
taille fixe.** C'est la correction la plus importante de cette spec, et elle
vient d'une relecture.

Le rendu détaché est haut de `HAUTEUR_DETACHE = 220` px d'écran, en dur : une
valeur dessinée pour un téléphone. Promu tel quel à tous les écrans, il reste
un timbre-poste sur un grand écran — et il **cesse de couvrir l'horloge**, qui,
elle, grandit avec la scène. Mesuré, panneau posé, cible de l'horloge comprise :

| écran | panneau (y d'écran) | cible de l'horloge | couverte ? |
|---|---|---|---|
| 1512 × 771 | 242 → 462 | 363 → 454 | oui |
| 1920 × 1080 | 322 → **542** | 487 → **611** | **non** |
| 2560 × 1440 | 422 → **642** | 642 → **808** | **non** |

La règle est donc : **le panneau est la plaque de `RIDEAU` (1127 × 329 px de
cadre) mise à l'échelle du cadre**, et sa largeur est bornée par la fenêtre
moins une gouttière — `min(1127 × scale, fenêtre − 2 × gouttière)`. Une seule
règle, continue, sans seuil : elle rend 734 px à 1512, 1000 px à 1920, et
tombe d'elle-même sur le comportement actuel du téléphone. La taille du texte
suit la même échelle. `HAUTEUR_DETACHE` et le plafond de 760 px disparaissent
tous les deux.

**Il est centré sur la fenêtre**, pas posé à `RIDEAU.x`. Le cadrage « cover »
centre la scène, l'horloge est au milieu de la scène : elle est donc au milieu
de la fenêtre à toute taille, et un panneau centré la couvre partout. Avec la
même échelle, la couverture est vraie à 1512, 1920 et 2560 (vérifié). `RIDEAU.x`
ne sert plus qu'à la scène ; seule la largeur compte pour le DOM.
- `pointDansRideau` et `sousLeRideau` ne servaient qu'à empêcher l'horloge d'être
  cliquée à travers la plaque. Le panneau étant en DOM et devant, c'est son propre
  `pointerdown` qui arrête l'appui : la logique de couverture côté canvas est à
  retirer, pas à maintenir en double.

### 5. Fermer le panneau

Il lui faut trois choses, et seulement trois :

- **Une croix de fermeture dans le bandeau**, d'au moins 44 × 44 px, visible
  (pas un disque transparent : elle est le chemin de sortie).
- **Échap**, tant que le panneau est baissé.
- **Le focus qui entre** dans le panneau à l'ouverture, et **revient sur
  l'horloge** à la fermeture — sauf au départ du train, où la commande est
  `disabled` : le focus retourne alors au corps du document.

L'horloge reste la commande d'**ouverture**. Panneau baissé, elle est dessous :
sa commande se retire (`v-if`), elle ne reste pas en piège sous la plaque.

**Ce n'est pas une boîte de dialogue modale, et il ne faut pas en faire une.**
La première version de cette spec promettait que le panneau recouvrirait la
frise et le réverbère. La mesure dit le contraire, et c'est tant mieux :

- **La frise n'est jamais couverte.** `yPoseA` gare délibérément la plaque sous
  elle (`HAUTEUR_FRISE + DEGAGEMENT_ECRAN`), et c'est le travail du 20 novembre.
  « Par-dessus la frise » est donc une question d'**ordre**, pas d'emprise : ce
  qui la traverse, ce sont les **deux bras**, et c'est eux qui cessent de
  l'éviter. La vague de correction qui les avait écartés des libellés
  (`retraitBras`) perd sa raison d'être : ils passent dessus, simplement.
- **La navigation n'est donc pas perdue**, et l'anti-but du 20 novembre n'est
  pas touché. Deux traits fins la traversent, rien de plus.
- **Le réverbère reste atteignable.** Le panneau posé couvre y 340 → 669 en
  pixels de cadre ; le mât court de 521 à 921. Sa lanterne est dessous, mais
  **les deux tiers bas du mât sont dégagés** : on peut l'éteindre panneau
  baissé.

Il n'y a donc **ni piège de focus, ni `inert` sur le reste de la page, ni
`aria-modal`** : la page derrière reste atteignable parce qu'elle reste visible,
et prétendre le contraire au lecteur d'écran serait un mensonge. Ça évite aussi
de restructurer `App.vue`, où `PanneauDeparts` vit à l'intérieur d'un
`<div class="dessous">`.

### 6. La neige

**Elle suit `nuitDeLaGare`**, exactement comme le fondu au noir : son opacité
*est* la nuit. Elle monte pendant le freinage vers « ailleurs », tombe pendant le
démarrage, ne se montre pas si le train traverse sans s'arrêter, et est déjà là
à pleine force si un lien partagé pose « ailleurs » d'emblée.

**Deux populations, deux maisons.**

| | la neige libre | la neige du faisceau |
|---|---|---|
| où | un plan neuf, **devant `plateau`** | dans `lumieres`, avec le `Faisceau` |
| découpe | toute la fenêtre | masquée sur le polygone du cône |
| densité | 1/1800 px² (provisoire) | 1/150 px² (provisoire) |
| éclat | discret | vif |
| s'éteint avec le réverbère | non | **oui** |

Les flocons passent donc **devant la rame** — c'est ce que fait la neige — et
hors de toute teinte de nuit, qui les grisaillerait.

**Comment ça tombe, sans coûter une image par flocon.** Quatre couches, chacune
tracée **une seule fois** ; à chaque image on ne déplace que la racine de la
couche, et on la reboucle quand elle a descendu une hauteur de tirage. C'est
l'idiome du projet : `Sky` décale déjà sa racine entière pour sa parallaxe, et
`Faisceau` fait respirer quatre couches à des rythmes décalés. Rien n'est
reconstruit. Les vitesses des quatre couches diffèrent : c'est ce qui fait la
profondeur.

**CONCEPT §11.** Moins de flocons sous `SEUIL_MOBILE`. Sous
`prefers-reduced-motion`, **la neige est posée mais ne tombe pas** : l'image
reste, le mouvement s'en va — même règle que le faisceau, qui reste allumé sans
respirer.

**Au départ, elle s'arrête.** Pas de brusquerie : c'est la rampe de
`nuitDeLaGare` qui l'emporte, comme elle emporte l'assombrissement.

**Pas de neige dans le reflet.** La scène se rend une seconde fois pour le
reflet de l'eau, et `rendreReflet` y masque déjà le plan `ciel`
(`Scene.ts:1070-1074`). Le plan de neige libre doit passer par le même
interrupteur : sans lui, les flocons **monteraient** dans le reflet au lieu d'y
tomber.

## Ce qui reste ouvert

Deux réglages d'œil, posés à des valeurs de départ et à trancher **en regardant
la scène tourner**, comme le grain du massif et la terre l'ont été. Ils seront
montrés dans une page, pas décrits en chiffres.

1. **La densité et la vitesse de la neige**, dans le faisceau et hors de lui.
2. **L'éclat des flocons du cône** : assez pour qu'on les voie, pas au point de
   laver le grain du massif — c'est la limite qui a déjà réglé `CONE_ALPHA`.

Et deux choses à regarder à la première image qui tourne, qui ne sont pas des
réglages : la part du cône que la rame mange (17,4 %), et la gouttière du
panneau une fois la plaque mise à l'échelle du cadre.

**Ce qui n'y est plus.** La hauteur du réverbère, tranchée à 400 le 21 novembre
en comparant 310, 400 et 440 sur la scène à l'échelle. Et le plafond de largeur
du panneau : la mise à l'échelle du cadre le remplace.

## Ce qui reste au constructeur

- La forme exacte du bouclage vertical des couches de neige.
- Le mécanisme de masque du cône (masque Pixi ou découpe géométrique au tirage),
  tant que la population suit le cône quand l'échelle change.
- La structure du bouton de fermeture dans le bandeau et son dessin, pourvu
  qu'il fasse 44 px et qu'il se voie.
- Le nom et la place du nouvel état `allume` : sur `Quai`, sur `Scene`, ou
  partagé — pourvu que `src/scene` n'importe pas Vue.
- Comment la neige obtient le cône : `coneDuFaisceau(PIECES.reverbere)` est pur
  et déjà exporté.
