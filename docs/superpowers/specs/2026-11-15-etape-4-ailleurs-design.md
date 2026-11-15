# « ailleurs » — le quai, le réverbère et le panneau des départs

2026-11-15 · projet · étape 4 du §13 de `CONCEPT.md`

## 1. Intention

« ailleurs » est la dernière gare : celle où l'on peut retrouver Emmanuelle.
Le cadrage prévoyait un **poteau indicateur** à trois flèches (`LINKEDIN →`,
`← CV`, `ÉCRIRE →`) et un formulaire de message privé. Emmanuelle a retravaillé
le design : **le poteau est abandonné**.

À la place, un vrai quai de gare de nuit. Un réverbère allumé et son faisceau,
un banc, une valise posée, un bâtiment à pignon avec son horloge et sa porte
vitrée, la bordure du quai au-dessus des rails. Et, à droite, **le panneau des
prochains départs** :

```
PROCHAINS DÉPARTS                          21:03
─────────────────────────────────────────────────
21:07  LINKEDIN                           QUAI 1
21:14  CV                                 QUAI 2
21:22  ÉCRIRE                       EMBARQUEMENT
21:34  L'ENFANCE                         ANNULÉ
21:51  NULLE PART                      SUPPRIMÉ
22:08  LE PRINTEMPS                   À L'HEURE
```

Les trois premières lignes sont les trois façons de la joindre. Les suivantes
partent pour des endroits où aucun train ne va.

**Pourquoi c'est mieux que le poteau.** Le poteau donnait trois liens plantés
sur un piquet : on les lisait, on cliquait, il n'y avait rien d'autre à faire.
Le panneau donne un *lieu*. On s'arrête pour lire les départs comme on le fait
vraiment dans une gare, et les trois liens s'y trouvent sans que rien les
annonce — ce que le §2 demande partout ailleurs sur le site.

Et le reste de l'étape suit de là : si c'est un quai, il y a un réverbère ; si
le réverbère est allumé, c'est que le reste est sombre.

## 2. Buts

- « ailleurs » cesse d'être une coquille vide et devient le lieu décrit
  ci-dessus.
- Les trois liens — LinkedIn, CV, écrire — sont atteignables à la souris, au
  doigt et au clavier.
- Le panneau est **vivant** : l'heure est la vraie heure, les horaires se
  recalculent, les lignes éteintes changent.
- À l'arrivée en gare, **toute la scène s'assombrit** pour faire ressortir le
  faisceau du réverbère ; au départ, elle se rallume.
- Tout le nouveau décor est de la même matière que le reste : trait blanc et
  grain, recoloré avec la couleur de fond.

## 3. Non-buts

- **« ici » : rien.** Emmanuelle : « ici c'est bon, pas besoin de faire quoi que
  ce soit pour le moment ». Les textes restent tels quels, y compris leur
  lisibilité sur le grain du massif. Le §13 range « les textes d'ici » dans
  l'étape 4 ; ce n'est plus vrai, et le CONCEPT le dira.
- **Le formulaire de message privé : supprimé.** Voir §5.4.
- **Le mobile, le mouvement réduit et le poids des assets**, traités pour de
  bon : étape 5. Cette étape ne doit pas les *empêcher* (voir §8), elle ne les
  règle pas.
- **Le poteau indicateur.** `ailleurs/panneau-ailleurs.svg` et ses deux aperçus
  ne servent plus. On ne les supprime pas, on ne s'en sert pas.
- **Le dosage de l'assombrissement.** Il se règle dans la scène en mouvement,
  pas ici (voir §7).

## 4. Anti-buts

- **Les aplats de gris moyens.** La maquette en a — le mur du bâtiment, les
  carreaux de la porte. Le site n'allume jamais un point à mi-teinte (§12.2) ;
  c'est le reproche déjà mesuré sur les bouvreuils, on n'en ajoute pas une
  deuxième source. Le bâtiment est une masse de **grain**, pas un aplat.
- **Une deuxième horloge dans la scène.** Tout ce qui bouge est sur l'horloge
  du train (§3). L'assombrissement ne fait donc pas exception : il se cale sur
  le freinage et le démarrage, jamais sur une minuterie à part. *L'heure
  affichée par le panneau et l'horloge du bâtiment sont la seule entorse, et
  elle est assumée : un panneau de gare qui n'est pas à l'heure n'est pas un
  panneau de gare.*
- **Refaire au canvas ce que le DOM donne.** Le focus clavier, la sélection du
  texte, le lecteur d'écran, le `mailto:` : rien de tout ça ne se réimplémente
  à la main dans Pixi.
- **Un cadre, une boîte, un panneau flottant** pour le texte du panneau : il a
  déjà son cadre, qui est un objet du quai.

## 5. Approches

### 5.1 Où vit chaque morceau

La scène a déjà deux mondes qui cohabitent : le **canvas** (Pixi — défile sur
l'horloge du train, passe sous le filtre de recoloration) et le **DOM** (la
frise, les formulaires, la liste d'étoiles — sait le clavier et les liens).

| | Ce que ça donne | Verdict |
|---|---|---|
| **(A) tout dans le canvas** | une seule matière, aucune couture ; mais le panneau est du texte et trois liens, et il faudrait refaire à la main le focus clavier, la sélection, le lecteur d'écran et le `mailto:` que le §11 exige | écartée |
| **(B) décor dans le canvas, panneau dans le DOM** | le partage déjà en place (le ciel est du canvas, les étoiles se lisent au clavier par une liste DOM) ; le décor défile et se recolore, le texte est du vrai texte | **retenue** |
| **(C) tout dans le DOM, décor en SVG posé sur le canvas** | le plus rapide à dessiner, accessible d'office ; mais le décor sortirait de l'horloge du train et surtout du shader — il ne suivrait plus la couleur de fond de l'œil | écartée |

Emmanuelle a choisi **(B)**.

### 5.2 Le panneau, coupé en deux

Le panneau est à cheval sur la règle du §4 : « le contenu apparaît quand le
train est à quai et disparaît en fondu au départ », alors que le décor, lui,
reste et défile (c'est ce qu'on a fait à « plus loin »).

| | Ce que ça donne | Verdict |
|---|---|---|
| **(1) le cadre est du décor, le texte est du contenu** | au passage sans arrêt, on voit défiler un **panneau éteint** ; le texte DOM n'existe qu'à l'arrêt, à une position connue | **retenue** |
| (2) le panneau reste allumé et son texte suit le défilement | illisible à cette vitesse de toute façon, et il faut recoller du HTML sur du canvas image par image, au risque d'un décalage d'un pixel entre le texte et son cadre | écartée |

Emmanuelle a choisi **(1)**, sur maquette.

### 5.3 Comment le décor est dessiné

Deux précédents dans le dépôt : les **poteaux de « plus loin »**, dessinés en
code (`Graphics`), et les **bouvreuils**, dessinés en SVG à la main puis
chargés en textures.

On prend le second. Ces formes — un réverbère à lanterne, un banc à lattes, une
valise, un pignon avec horloge et porte cintrée — sont trop dessinées pour
tenir en quelques lignes de géométrie paramétrique. **Emmanuelle ne fournit
aucun asset** (« j'ai pas d'assets à fournir, tu peux imaginer ») : le
constructeur les dessine, d'après la description du §5.4.

### 5.4 Ce que montrent les deux captures du 15 novembre

Emmanuelle a montré son retravail sous forme de deux captures d'écran, l'une
cadrée serré sur le quai, l'autre posée dans la scène réelle. **Elles ne sont
pas dans le dépôt** — elle doit les y déposer (`ailleurs/quai-serre.png`,
`ailleurs/quai-dans-la-scene.png`). D'ici là, et de toute façon ensuite,
voici ce qu'elles montrent, pièce par pièce. Tout est au **trait blanc non
rempli**, sauf mention contraire.

- **Le réverbère.** Mât vertical fin, planté sur une embase trapézoïdale évasée ;
  un manchon rectangulaire au tiers de la hauteur. En tête, une lanterne :
  corps trapézoïdal vitré (plus large en bas), toit pyramidal à quatre pans,
  petit anneau au sommet, et deux courtes potences latérales terminées chacune
  par un anneau. **La lanterne est la seule surface pleinement blanche de la
  scène** — c'est elle, la source.
- **Le faisceau.** Un cône qui descend de la lanterne, large, ouvert vers le bas,
  et surtout **peuplé de points blancs** de tailles variées, bien plus denses
  que la poussière du fond. Il déborde largement sur le massif derrière.
- **Le banc.** De profil, légèrement de trois quarts : dossier à trois lattes
  horizontales, assise à lattes, accoudoir, deux pieds courbes. Au trait, vide.
- **La valise.** Posée au sol à droite du banc : rectangle à coins arrondis,
  poignée en demi-cercle, deux fermoirs, et une étiquette qui pend sur le côté.
- **Le bâtiment.** À droite : pignon triangulaire, mur, et dedans — une horloge
  ronde (cadran à index, deux aiguilles, **halo**) et une porte cintrée à six
  carreaux. *Dans la capture, le mur et les carreaux sont des aplats de gris ;
  c'est précisément ce que le §4 interdit. Ils deviennent du grain.*
- **Le quai.** Une bande horizontale au-dessus des rails, soulignée d'un liseré.
- **Le panneau.** Cadre rectangulaire à **double trait** (un filet extérieur, un
  cadre intérieur), en-tête `PROCHAINS DÉPARTS` à gauche et l'heure à droite,
  filet de séparation, puis six lignes. La ligne active est **inversée** : fond
  clair, texte en couleur de fond.
- **La composition dans la scène** (seconde capture) : la loco à gauche, le
  réverbère vers le centre, le banc et la valise entre les deux, le bâtiment à
  droite, le panneau en bas à droite par-dessus le mur du bâtiment.

## 6. Ce qui est décidé

### 6.1 Le décor

Dans le canvas, dans le conteneur `decor` — donc recoloré par le shader et
reflété dans l'eau, comme les câbles.

- **Pièces** : réverbère (mât, lanterne, embase), banc, valise, bâtiment
  (pignon, mur, horloge, porte cintrée), bordure de quai.
- **Fabrication** : SVG dessinés à la main dans `ailleurs/`, au trait blanc,
  sur le modèle de `cables/poteau.svg` et des bouvreuils. Chargés en textures
  comme les bouvreuils (`Birds.ts` est le précédent : `fetch` du SVG, texture
  refaite au redimensionnement).
- **Le bâtiment n'a pas d'aplat.** Une arête au trait et une masse de grain qui
  s'éclaircit vers le sol, comme le massif. C'est ce qui le fait appartenir au
  site.
- **Les carreaux de la porte** : même règle. Du grain, pas du gris.
- **Plan** : le bâtiment se dessine **derrière le ciel**, comme le massif
  (§6 : le ciel passe devant la montagne). Son pignon monte dans la bande des
  étoiles (§5), et une étoile de voyageur doit pouvoir s'allumer devant son
  mur plutôt que disparaître derrière. *Appel du constructeur, à regarder dans
  la scène en mouvement avec Emmanuelle.*

### 6.2 Le faisceau du réverbère

**Ce n'est pas un cône peint.** C'est la poussière d'étoiles qui s'allume à
l'intérieur du cône : même matière que partout, et ça bouge tout seul.

Deux choses à vérifier en construisant, parce qu'elles peuvent rendre cette
promesse fausse :

- **La densité.** `Sky.ts` tire sa poussière à `DENSITE = 1/600` par pixel², et
  la réduit encore sur mobile. Un cône de ~200 × 400 px n'en contient
  qu'environ 130 points — l'ordre de grandeur de la maquette, mais sans
  marge. Le faisceau porte donc **sa propre population de grains**, de la même
  matière et du même grain, avec son propre plancher : il ne se contente pas
  d'éclairer ce qui passe par là.
- **Le voile du pied.** Il éteint la poussière en approchant des rails
  (`DEGRADE_HAUTEUR = 230`, `DEGRADE_OPACITE = 0.4`) — c'est-à-dire exactement
  le bas du cône, là où la maquette est la plus lumineuse. Le faisceau se
  dessine donc **devant le voile**, sur son propre plan.

Le réverbère et son faisceau sont **exemptés** de l'assombrissement du §6.3 —
voir la règle des lumières ci-dessous.

### 6.3 L'assombrissement à l'arrivée

C'est une règle neuve : jusqu'ici, rien dans la scène ne changeait selon la
gare. La scène *sait* où elle est (`Scene.setGare` existe depuis l'étape 3 et
`gagOuvert` le lit déjà) ; ce qui manque au pont `useScene`, c'est **`cible`**,
qu'il ne pousse pas encore.

- **S'assombrir, c'est fondre vers la couleur de fond**, pas baisser l'opacité.
  C'est déjà ce que calcule le shader de recoloration (`recolor.ts` : le noir
  *est* la couleur du fond). L'assombrissement suit donc l'œil : fond bleu
  nuit, gare assombrie en bleu nuit, jamais en gris.
- **Sur l'horloge du train** : ça descend pendant le freinage, ça remonte
  pendant le démarrage. `PHASE_FREINAGE` et `PHASE_ROULE` (`Train.ts`) sont les
  bornes.
- **Calculé à partir de l'état, pas déclenché par un événement.** Quatre cas
  cassent une version événementielle, et chacun doit marcher :
  1. **arrivée directe sur `/ailleurs`** (`poserGare`, lien partagé) : pas de
     freinage du tout, la scène doit être sombre dès la première image ;
  2. **mouvement réduit** (§11) : le train est à l'arrêt, il n'y a pas de phase
     de freinage ;
  3. **`partirVers` appelé pendant le freinage** : le voyage se redirige en
     vol, l'assombrissement doit s'inverser proprement ;
  4. **traversée de « ailleurs » sans arrêt** (de « là-haut » vers « ici ») :
     **pas d'assombrissement**. Il est lié à l'arrêt, pas au lieu.

  Donc une fonction de `(gare, enRoute, cible, phase de l'étape)`, lisible dans
  le magasin `voyage`.
- **Ne pas s'appuyer sur `legsParcourues`.** Ce compteur **recule d'une étape à
  chaque départ** (c'est documenté, et la vitesse de rotation du massif a été
  réglée *avec* ce recul : on ne le corrige pas). L'assombrissement y gagnerait
  un saut à l'instant précis où il doit commencer à se lever.
- **La règle : ce qui s'éteint, c'est tout ce qui n'est pas une lumière.**
  Trois sources restent allumées à pleine valeur — **le réverbère et son
  faisceau**, **les vitres allumées du train** (CONCEPT §6 : « les seules
  lumières de la scène, et ce sont des voyageurs » — les éteindre à la seule
  gare où le train s'arrête devant soi serait absurde) et **le panneau
  d'affichage**, cadre compris. Tout le reste descend : le massif, le quai, le
  banc, la valise, le bâtiment, les rails, le corps du train.

  *Emmanuelle a validé cette règle, en disant « pour le moment » : elle se
  regardera dans la scène et peut encore bouger.*

  Deux conséquences pour le constructeur :
  1. **La liste des exemptions est un ordre de plans, pas une liste d'objets.**
     L'assombrissement se fait par un voile noir plein cadre à l'intérieur de
     `decor` — le noir devient la couleur du fond sous le shader, c'est déjà ce
     que fait `voileDuPied`. Le **niveau z de ce voile *est* la liste des
     exemptions**. Il faut donc le concevoir avec l'ordre des plans du §6.1,
     pas l'ajouter après.
  2. **Le cadre du panneau est exempté, donc son texte DOM n'a pas à
     s'assombrir.** C'est ce qui évite le « panneau flottant » interdit au §4 :
     un texte lumineux dans un cadre évanoui. Le constructeur n'a donc **pas**
     besoin de publier un facteur d'assombrissement vers le DOM, comme
     `useScene` publie déjà `fond`. *Si la règle bouge, ce pont devient
     nécessaire : c'est le coût caché d'un changement d'avis ici.*
- **Le ciel des voyageurs descend moins que le reste.** Assez pour que le
  faisceau gagne, pas assez pour que les étoiles disparaissent. Le « moins » se
  règle dans la scène. Attention : le ciel est aujourd'hui *dans* `decor`, donc
  sous le même filtre — il lui faut son propre facteur.
- **Le dosage** — jusqu'où ça descend, en combien de temps, de combien le ciel
  descend moins — **n'est pas décidé ici.** Il se règle dans la scène en
  mouvement avec Emmanuelle, comme le grain du massif et la fumée. Le
  constructeur livre de quoi le pousser et le tirer en direct.

### 6.4 Les trois liens

Le formulaire de message est **supprimé**. Emmanuelle : « ça fait juste un
mailto ».

| Ligne | Ce qu'elle fait |
|---|---|
| `LINKEDIN` · `QUAI 1` | ouvre le profil dans un nouvel onglet |
| `CV` · `QUAI 2` | mène à `/ailleurs/cv`, une page du site (§6.8) — **plus aucun PDF** |
| `ÉCRIRE` · `EMBARQUEMENT` | ouvre un `mailto:` |

- **L'adresse est assemblée en JavaScript**, pas écrite en clair dans le HTML :
  les robots ramassent les `mailto:` des pages publiques. Attention : un `<a>`
  sans `href` ne prend pas le focus clavier — l'adresse se pose au montage ou à
  la prise de focus, pas au clic.
- **Le prix du `mailto:`, dit franchement** : quelqu'un qui lit son courrier
  dans un onglet, sans client par défaut sur sa machine, clique et il ne se
  passe rien de visible. C'est le seul endroit du site où on peut la joindre.
  Le constructeur **proposera** que l'adresse soit aussi lisible et copiable
  près de la ligne ; **Emmanuelle n'a pas tranché** ce point, il se regarde
  dans la scène.
- **Survol et focus** : la ligne s'inverse — fond clair, texte en couleur de
  fond —, comme la ligne `ÉCRIRE` de la maquette. C'est ce qui remplace
  l'oscillation des flèches du poteau.

### 6.5 Le panneau vivant

- **L'heure en haut à droite est la vraie heure.** L'horloge du bâtiment aussi.
- **Les trois départs blancs restent toujours « dans quelques minutes »**, à
  distance fixe de maintenant (+4, +11, +19 minutes dans la maquette). Décision
  d'Emmanuelle : *les trois façons de la joindre ne peuvent pas être parties.*
  Ils ne défilent jamais, ne s'éteignent jamais, ne changent jamais de quai.
- **Les lignes éteintes changent** — « juste pour faire semblant ». Tirées au
  sort dans le vivier ci-dessous, approuvé tel quel :

  ```
  L'ENFANCE        ANNULÉ          LE SOMMEIL      QUAI 4
  NULLE PART       SUPPRIMÉ        AVANT           SANS ARRÊT
  LE PRINTEMPS     À L'HEURE       LE SILENCE      À L'HEURE
  LA LUNE          RETARDÉ         LA MAISON       ANNULÉ
  DEMAIN           RETARDÉ         PLUS TARD       RETARDÉ
  LA MER           À L'HEURE       LE DÉBUT        TERMINUS
  ```

  *Ce qui n'est pas décidé : si elles se renouvellent aussi **pendant** un
  arrêt qui dure, ou seulement d'une arrivée à l'autre. Appel du constructeur,
  à montrer.*
- **Minuit** : les horaires passent minuit sans se casser.

### 6.6 Le cadre du panneau, et son texte

- **Le cadre** (l'armature, le trait du bord, le filet sous l'en-tête) est du
  décor : dans le canvas, il défile avec le quai, il est reflété dans l'eau.
- **Le texte** est du DOM, posé par-dessus, en JetBrains Mono. Il apparaît à
  l'arrivée et s'efface au départ, en dissolution comme tout le reste (§2).
- **« S'efface au départ » est un comportement neuf, pas un précédent à
  recopier.** Aujourd'hui l'URL change à l'instant du clic et `<RouterView />`
  détruit sur place le composant de la gare quittée : la sortie `dissoudre` de
  `GareIci.vue` n'anime jamais rien. Conséquences, qui sont des **appels du
  constructeur** :
  - le texte du panneau ne peut pas vivre dans `GareAilleurs.vue`. Il se place
    **hors des routes**, avec sa propre visibilité tirée du magasin `voyage` —
    c'est précisément pour ça que `RepliquesOiseaux.vue` est hors des routes ;
  - **le texte s'efface sur place pendant que son cadre s'en va**, et le fondu
    est court (de l'ordre d'une demi-seconde, à régler). On ne le fait pas
    suivre le cadre image par image : c'est exactement ce que le §5.2 a écarté.
    Le départ démarre en rampe douce (`avancement()`), donc le cadre n'a glissé
    que de peu quand le texte a fini de s'éteindre.
- **Au passage sans arrêt**, on voit donc défiler un panneau éteint.
- **Le texte doit tomber dans le cadre.** Il suit donc le `Frame` de la scène
  (`fitStage`). Le précédent est **`GareLaHaut.vue`**, qui importe `cadrageCiel`
  de `layout.ts` pour calculer de la géométrie de scène depuis Vue — et non
  `RepliquesOiseaux.vue`, qui est en `position: fixed` et ne lit jamais le
  `Frame`. À prévoir : `Scene.frameCourante` est privé et rien ne prévient Vue
  au redimensionnement ; ce pont est à construire. Conséquence à écrire
  dès maintenant même si le mobile est l'étape 5 : sur un petit écran le cadre
  rétrécit, et le texte avec lui, jusqu'à devenir illisible. Le constructeur
  laisse la porte ouverte (une taille plancher, ou un panneau qui se détache de
  son cadre sous `SEUIL_MOBILE`), il ne la règle pas.

### 6.7 La gare qui revient

La boucle fait quatre étapes ; « ailleurs » revient donc tous les quatre legs,
et son décor doit se replacer sans qu'on le voie sauter. **Le mécanisme existe
et il a déjà été débogué plusieurs fois** : c'est celui de l'île de câbles —
`distanceGare`, `solParEtape`, `solRestant`, `ancreSuivante` et
`RECUL_HORS_CHAMP` dans `cables.ts`, avec son propre compteur monotone
(`Scene.legsIle`).

- **Le constructeur généralise ce mécanisme** plutôt que de le recopier : deux
  îles, deux ancres, deux compteurs monotones, une seule géométrie.
- **La largeur passe.** Une étape pleine couvre `DEFILEMENT × ECHELLE_TRAIN ×
  DUREE_ETAPE` = 900 × 0,4 × 9 ≈ **3 240 px** de sol, pour un cadre de 2 320 px.
  `RECUL_HORS_CHAMP = 1.6` étape ≈ 5 180 px : une gare large de 2 000 px sort
  entièrement par la gauche bien avant que la suivante n'entre par la droite.
  La marge tient jusqu'à ~2 800 px de large. *À revérifier si le décor grossit.*
- **Le décor reste là quand le train traverse sans s'arrêter**, comme les
  poteaux de « plus loin ».

### 6.8 Le CV, écrit dans le site

**Ajouté en cours de cadrage, à la demande d'Emmanuelle** : « j'aimerais que
mon CV soit généré directement sur le site en HTML, dans le design du site ».
Il n'y a donc **plus de PDF à fournir**, et la décision ouverte §12.5 du
CONCEPT perd l'un de ses trois points.

#### La forme : la ligne

Choisie sur maquette parmi trois (la ligne, le panneau d'affichage, la page
classique). **Le parcours est une voie verticale, chaque entrée est un arrêt
dessus** : un filet vertical, un point par arrêt. Les postes sont de gros
points lumineux avec halo, les diplômes de petites haltes grises. C'est le
site qui parle, et ça se scanne quand même en dix secondes.

**Une seule voie, par date, postes et diplômes entrelacés** — ils l'étaient
déjà dans la vie (l'apprentissage et la licence se chevauchent). Ordre :

```
Lead Développeuse Front-End      manager.one                sept. 2023 → aujourd'hui
Développeuse Front-End           manager.one                oct. 2021 → août 2023
· Licence pro Développement Web  Université de Cergy-Pontoise      2020 → 2021
Apprentie développeuse full-stack SISTEMIC.IO · Clermont-Ferrand  août 2020 → sept. 2021
· DUT Informatique (accéléré)    Université Paris-Saclay           2019 → 2020
Vendeuse polyvalente             Courir · Desigual · Mellow Yellow 2016 → 2019
· L2 Sciences pour l'ingénieur   Université Clermont Auvergne · Prépa Polytech  2015 → 2019
```

Chaque arrêt porte **trois lignes et rien d'autre** : l'intitulé, le lieu, les
dates en mono. Les dates en petites capitales espacées, opacité faible.

#### Ce qu'Emmanuelle a retiré

Trois coupes successives, toutes les siennes, et qui vont toutes dans le même
sens — le §2 du CONCEPT, « pas d'égotrip » :

- **les descriptions de poste** : « on retire les descriptions de poste ». Plus
  une phrase sous aucun arrêt ;
- **les langues** (anglais B2 Cambridge, espagnol technique) : « pas la peine » ;
- **la liste d'outils / de technologies** : « on s'en fout ». *Lecture du
  rédacteur, à corriger si elle voulait dire autre chose* : le bloc disparaît
  entièrement. Le portfolio **est** la démonstration technique ; une liste de
  mots-clés à côté ne prouverait rien de plus.

Restent donc, sous la voie : **« hors de la voie »** — danses sociales en
compétition, peinture acrylique, piano, ukulélé — puis les coordonnées.

#### Ce qui ne doit pas y être

Le PDF de 2021 porte un **numéro de téléphone** et une **adresse postale**
(91 rue Benoit Malon, 94250 Gentilly). **Ils ne vont pas sur une page
publique indexable.** Appel du rédacteur, non contredit : on garde le mail et
`github.com/emmaZn` (confirmé à jour), rien d'autre.

#### Comment elle arrive

- **Route `/ailleurs/cv`**, partageable, comme les quatre gares (§3).
- **La gare reste derrière**, toujours assombrie ; la page s'écrit par-dessus
  en dissolution.
- **C'est le premier endroit du site où l'on fait défiler quelque chose.** Tout
  le reste tient en un écran et ne bouge qu'à la vitesse du train ; un CV est
  plus haut qu'un écran. Dit explicitement pour que ça ne surprenne personne :
  il y aura une molette, et il faut qu'elle ait l'air d'appartenir au site
  (pas de barre de défilement native criarde).
- **Retour** : on revient à `/ailleurs`. Le train n'a pas bougé — aller au CV
  n'est pas un voyage, la boucle à sens unique du §3 n'est pas concernée.

#### Les sources du contenu

Pour que personne n'invente : le contenu vient de la capture LinkedIn du
15 novembre (les deux postes manager.one, SISTEMIC.IO, les dates) et du PDF
`1631091992197.pdf` de 2021 (les trois formations, la vente, les loisirs).
**Ces deux sources sont hors du dépôt.** Le contenu du CV se fige donc dans un
module de données versionné (`src/contenu/cv.ts` ou équivalent), relu par
Emmanuelle, et non recopié d'après des fichiers qui ne seront plus là.

## 7. Ce qui se règle dans la scène, pas ici

Emmanuelle juge le mouvement en mouvement, jamais sur une capture. Le
constructeur livre ces réglages manœuvrables en direct et les lui montre :

- la profondeur de l'assombrissement, sa durée, et de combien le ciel descend
  moins ;
- la densité et la portée du faisceau ;
- la taille et la place du bâtiment, du banc, de la valise, du réverbère ;
- la densité du grain du bâtiment et son dégradé vers le sol.

Aucune de ces valeurs ne se « corrige » ensuite de sa propre initiative.

## 8. Ce que cette étape ne doit pas empêcher (étape 5)

- **Mobile** : voir §6.6. La frise se réduit déjà, le cadre rétrécit ; le
  panneau ne doit pas être construit d'une façon qui interdise de le détacher
  de son cadre sur petit écran.
- **Mouvement réduit** : l'assombrissement doit savoir exister sans freinage
  (§6.3), et se faire en fondu simple plutôt qu'en rampe.
- **Poids** : les SVG du décor sont du trait, ils ne pèsent rien ; ne pas
  cuire de séquence.

## 9. Ce qu'il manque encore, et qui n'est pas au constructeur

Décision ouverte §12.5 du CONCEPT. Le CV en sort (§6.8). Restent :

- **L'adresse mail.** Elle sert deux fois : derrière le `mailto:` d'ÉCRIRE et
  au bas du CV. Demandée deux fois, pas encore donnée. Le CV de 2021 porte
  `emmanuelle.zenou.rogala@gmail.com` — **c'est un bouchon, pas une
  décision** : on ne publie pas une adresse personnelle sur la foi d'un
  document vieux de cinq ans. À confirmer avant tout déploiement.
- **L'URL LinkedIn.**
- **Les deux captures du quai**, à déposer dans `ailleurs/`. Le Bureau
  d'Emmanuelle n'est pas lisible depuis l'outillage (macOS le refuse) : le
  §5.4 les décrit de mémoire, ce qui dépanne mais ne remplace pas son dessin.

On construit avec des bouchons. Rien n'attend, mais rien ne se déploie non plus
sans eux.

## 10. Mises à jour du CONCEPT à faire dans la même branche

Le CONCEPT est la référence du projet ; s'il décrit encore le poteau, il ment.

- **§4** : la ligne « on ne dessine **pas** de bâtiment de gare » tombe, et le
  tableau des gares : « ailleurs — élément propre : le quai et son panneau des
  départs ».
- **§4.4** : réécrit en entier (le poteau, le formulaire de message, l'oscillation
  des flèches disparaissent).
- **§2** : les lignes éteintes du panneau sont une **seconde touche**
  d'humour — mélancolique, pas drôle — à côté des oiseaux. À dire, puisque le §2
  promet qu'il n'y en a qu'une.
- **§3** : l'heure du panneau et celle de l'horloge sont la seule chose du site
  qui ne soit pas sur l'horloge du train.
- **§6** : l'ordre des plans gagne le bâtiment (derrière le ciel) et le faisceau
  (devant le voile) ; l'assombrissement à l'arrivée y est décrit.
- **§12.5** : le formulaire de message devient un `mailto:` ; **le PDF du CV
  disparaît** (le CV est une page du site, §6.8) ; l'adresse manque toujours.
- **§13** : l'étape 4 n'est plus « ici et ailleurs » mais « ailleurs » ; « les
  textes d'ici » en sortent, le CV y entre.
- **§3** (routes) : il existe désormais une route qui n'est pas une gare,
  `/ailleurs/cv`, et c'est le seul endroit du site où l'on fait défiler.
- **`README.md`**, ligne 168 : la phrase qui annonce « les textes d'« ici » et le
  poteau d'« ailleurs » » n'est plus vraie.

## 11. Laissé au constructeur

- Le dessin des SVG : proportions, nombre de lattes du banc, forme de la
  lanterne, dessin de l'horloge.
- La géométrie exacte du quai et la place de chaque pièce dans le cadre de
  2 320 px.
- La forme du tirage des lignes éteintes (graine, renouvellement).
- Le découpage en fichiers, sur le modèle de `cables.ts` / `CableLayer.ts`
  (géométrie pure d'un côté, dessin de l'autre — `purity.test.ts` interdit à
  `src/scene` de dépendre de Vue ou de Firebase).
- Les tests : les précédents sont `cables.test.ts`, `oiseaux.test.ts`,
  `dates.test.ts`. Le calcul des horaires et le passage de minuit s'y prêtent
  particulièrement.
