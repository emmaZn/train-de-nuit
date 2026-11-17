# Train de nuit — concept et cadrage technique

> Portfolio expérimental d'Emmanuelle Zenou, Front End Web Developer.
> Ce fichier est la référence du projet : concept, contenu, direction artistique, architecture, étapes.
> À lire en entier avant de coder. En cas de doute sur un choix visuel, on demande plutôt que d'inventer.

Figma : https://www.figma.com/design/KY1E98tguDk9Rn0cD76Il4/Train-de-nuit-2026

---

## 1. En une phrase

Un train roule de nuit, en boucle et toujours dans le même sens, à travers des montagnes de grain. Il s'arrête dans quatre gares. Les visiteurs y laissent une phrase qui devient une étoile : le ciel est fait de tous ceux qui sont passés par ici.

## 2. Intentions

- **Poétique et mystérieux** : peu de mots, rien n'est expliqué, on découvre en voyant.
- **Pas d'égotrip** : le site parle très peu d'Emmanuelle. Le cœur, ce sont les voyageurs.
- **Deux touches d'humour, pas plus** : les oiseaux de « plus loin », qui font contraste avec le reste, et les lignes éteintes du panneau des départs d'« ailleurs » (`L'ENFANCE — ANNULÉ`, `NULLE PART — SUPPRIMÉ`). Ces lignes sont une seconde touche d'humour, à côté des oiseaux : mélancolique plutôt que drôle.
- **Show-off** : la qualité des mouvements, du grain et des transitions *est* la vitrine.
- **Une seule matière** : nuit, grain, traits fins. Tout ce qui apparaît ou disparaît le fait par **dissolution** (grain qui se défait ou se condense).

## 3. La navigation : une boucle à sens unique

```
ici  →  plus loin  →  là-haut  →  ailleurs  →  (ici …)
```

- Le train ne recule **jamais**. Pour aller à une gare « derrière », il fait le tour de la boucle vers l'avant (y compris avec le bouton retour du navigateur).
- **La frise** (en haut de l'écran) défile **en continu** pendant le trajet, et non d'un cran à chaque arrivée : le repère de la gare courante reste fixe à gauche, et les gares glissent sous lui **à la distance parcourue** par le train : la frise accélère et ralentit donc avec lui, comme le massif. Tout ce qui bouge dans la scène est sur la même horloge. Les quatre gares occupent la largeur sur desktop, deux au plus sur mobile. Celles qui sortent à gauche s'estompent, celles qui entrent à droite apparaissent en fondu.
- **États d'une gare dans la frise** :

| État | Rendu |
|---|---|
| passée | petit point plein, opacité 0.3 |
| à quai | point plein + halo, label plus grand, mention `À QUAI` (mono, 9 px, espacé) |
| prochain arrêt | anneau + point central + halo, mention `PROCHAIN ARRÊT` |
| à venir | anneau vide, opacité 0.7, fondu vers le bord droit |

- **En route** : un marqueur (point + halo + petite icône de loco au-dessus) avance sur la ligne entre la gare quittée et la suivante. Le trajet parcouru est un trait plein qui s'efface vers la gauche ; la voie à venir est plus pâle et se fond à droite.
- **Rien d'autre ne montre l'heure** : l'heure du panneau des départs d'« ailleurs » et celle de l'horloge du bâtiment sont la vraie heure ; un panneau de gare qui n'est pas à l'heure n'est pas un panneau de gare. Le mouvement du monde — frise, massif, décor, assombrissement — suit la distance parcourue ; seuls les vacillements — vitres, faisceau, étoiles, fumée à quai — vont à l'horloge.
- **Routes** : une par gare, pour des liens partageables : `/ici`, `/plus-loin`, `/la-haut`, `/ailleurs`. Plus **une route qui n'est pas une gare** : `/ailleurs/cv`, imbriquée sous « ailleurs » — l'URL dit ce que l'écran montre, une gare avec quelque chose d'ouvert dedans. Aller au CV n'est pas un voyage : le train ne bouge pas, la boucle à sens unique n'est pas concernée. C'est aussi **le seul endroit du site où l'on fait défiler quelque chose** : tout le reste tient en un écran.

## 4. Les gares

Chaque gare tient en un écran et a **un seul élément qui lui est propre**. Le contenu apparaît quand le train est à quai et disparaît en fondu au départ. « ailleurs » est la seule qui ait un décor à elle : un quai de nuit (§4.4). Les autres n'ont pas de bâtiment de gare.

| Gare | Élément propre | Rôle |
|---|---|---|
| **ici** | rien que le ciel | le départ |
| **plus loin** | câbles électriques + bouvreuils | la récréation, on découvre qui elle est |
| **là-haut** | formulaire + étoile | laisser une trace |
| **ailleurs** | le quai et son panneau des départs | la retrouver ailleurs (contact, CV) |

### 4.1 ici

```
Emmanuelle Zenou
Front End Web Developer

Chaque étoile est quelqu'un qui est passé par ici.
```

Le nom et le titre sont en haut à gauche (comme sur la maquette). La phrase apparaît doucement, une seule fois par arrêt.

### 4.2 plus loin — les oiseaux

- **Une rangée de poteaux et deux fils.** Une seconde rangée, plus lente et
  plus petite, a été essayée puis retirée : posée sur la même ligne de rail,
  ses fils tombaient plus bas que les autres et les croisaient — cohérent, mais
  ça se lisait comme de l'encombrement, pas comme de la distance.
- **Quelques poteaux seuls, sans fils, avant et après.** Un poteau isolé passe,
  puis les fils, puis les oiseaux : la gare s'annonce au lieu de surgir, et un
  dernier poteau la referme après le départ.
- L'asset `cables/cables-scene.svg` sert de **mesures**, pas de texture : on
  redessine sa géométrie en points, c'est ce qui permet au fil de vibrer.
- Les câbles n'existent **qu'à cette gare**, derrière la rame — mais ils y sont
  **toujours**, y compris quand le train traverse sans s'arrêter : les poteaux
  défilent alors à pleine vitesse et les oiseaux restent posés.
- **Neuf places à la fois** sur les fils. Ils y **vivent** : toutes les 3 à 8 secondes
  l'un d'eux se retourne, fait un pas sur le fil — le fil vibre quand il se
  repose — ou s'ébouriffe.
- **Le gag** (façon dessin animé, personne n'est blessé) : on clique sur un
  oiseau →
  1. le fil vibre, et **sa réplique paraît aussitôt, en haut de l'écran au
     centre** — toujours au même endroit, une seule à la fois ;
  2. il tombe en culbutant et se plante dans la terre sous les rails : on n'en
     voit plus qu'une **bosse**, deux pattes dépassant du ventre, et trois
     petites étoiles qui tournent au-dessus ;
  3. **il ne se relève pas, et plus rien ne le déplace** — ni lui-même, ni le
     passage du train ;
  4. un autre bouvreuil arrive en vol et prend la place libre. On peut
     recommencer indéfiniment : les fils ne se vident jamais et les bosses
     s'accumulent.
- **La gare ne se réinitialise jamais.** On revient après un tour de boucle et
  les bosses d'avant sont là : la terre s'encombre au fil de la visite, et c'est
  le but.
- **Répliques**, dans l'ordre, quel que soit l'oiseau cliqué :
  1. « Je suis dev web front. »
  2. « J'aime la peinture. »
  3. « J'aime photographier les animaux. »
  4. « Et photographier les étoiles. »
  5. « Et je danse. » *(l'oiseau fait une pirouette sur le fil avant de tomber)*
  6. « Et j'essaie de rendre ma mère fière. »
  7. « Aïe. »
  8. « Encore ? »
  9. « Hé ! »
  10. « Vous vous amusez bien ? »
  11. « Je vais le dire au chat. »
  12. « Si vous voulez lui parler, c'est ailleurs. »
  13. « Vous feriez mieux d'aller laisser une phrase, là-haut. »
  14. « … » *(il reste au sol plus longtemps avant la fin de sa séquence)*
  - ensuite, au hasard : « aïe », « encore ? », « pfff », « hé ! »
- Accessibilité : un bouton visible au focus clavier « faire tomber un oiseau » ;
  les répliques sont annoncées (`aria-live="polite"`). Elles vivent **hors des
  routes** : l'URL change à l'instant du clic sur une autre gare, bien avant que
  le train ne bouge, et dans une gare le composant serait détruit au milieu
  d'une phrase.

### 4.3 là-haut — laisser une trace

- **Formulaire** (à droite, dans le ciel, sans cadre) :
  - titre `Laisser une trace ?` (Inter Light 17 px)
  - champ phrase, 80 caractères max, placeholder `une phrase, un mot, une pensée…`, simple trait dessous qui s'éclaire au focus
  - champ prénom facultatif, plus petit : `un prénom, si vous voulez`
  - ligne méta en mono 10,5 px : compteur `0 / 80` à gauche, `laisser ↵` à droite : un vrai bouton, qu'un doigt peut atteindre, et que le clavier double (Entrée suffit)
- **Animation à l'envoi** (~3,5 s) :
  1. le formulaire s'efface ;
  2. la phrase se défait **de gauche à droite** en grains qui se resserrent vers le centre du texte en s'éteignant ;
  3. **un seul grain** (avec un petit halo et une traîne) monte en courbe vers une place libre du ciel (~2,5 s) ;
  4. l'étoile s'allume avec un éclat (halo qui grossit puis se pose) : c'est la plus brillante du ciel ;
  5. le formulaire revient vide.
- **Tant qu'un envoi n'est pas réglé**, les deux champs sont en `readonly` : c'est ce qui garantit que le texte enregistré est celui qu'on a vu se défaire, et non une version retouchée entre-temps. Le prix est à dire franchement : hors ligne, l'écriture reste en attente, et les champs peuvent rester verrouillés tant que l'onglet vit. On a préféré cela à une phrase affichée qui ne serait pas celle qui part.
- Rien n'annonce ce qui va se passer : on comprend en le voyant.

### 4.4 ailleurs — le quai et le panneau des départs

Le cadrage prévoyait un poteau indicateur à trois flèches et un formulaire de message. **Le poteau est abandonné** : il donnait trois liens plantés sur un piquet, et rien d'autre à faire que cliquer. À la place, un **lieu** — un quai de gare de nuit, où l'on s'arrête lire les départs comme on le fait vraiment, et où les trois liens se trouvent sans que rien les annonce (le §2 le demande partout).

- **Le quai.** Un réverbère, un banc, une valise, un grand bâtiment à pignon et la bordure du quai au-dessus des rails. Le bâtiment est large : il court **derrière** le banc, la valise et le réverbère, qui se tiennent devant lui comme sur un vrai quai. Son pignon et sa porte sont centrés ; l'horloge est dans le pignon. Tout est au trait blanc ; les formes sont dessinées à la main en SVG (`public/assets/ailleurs/`), comme les bouvreuils. Les cotes et les places vivent dans `src/scene/quai.ts` et se règlent encore : ce document ne les fige pas.
- **Pas d'aplat, du grain.** Le site n'allume jamais un point à mi-teinte (§12.2) : la masse du bâtiment est du grain, pas du gris. Le rastériseur n'a pas de trame — il **aplatit** une masse au noir du fond au lieu de la tramer — donc ce grain est dessiné **dans le SVG du bâtiment** (un commentaire XML y explique pourquoi). Il est provisoire, et dépend de la résolution.
- **Quatre lumières.** À « ailleurs », la scène s'assombrit (§6) ; ce qui reste allumé, c'est ce qui est une lumière : **le réverbère et son faisceau**, **les vitres du train**, **le cadre du panneau** et **l'horloge** du bâtiment. Le réverbère est la source.
- **Le faisceau** est un **cône peint**, avec de la **poussière d'étoiles qui s'allume dedans** — même matière que partout, avec sa propre population de grains (celle du ciel y serait trop rare). Il déborde sur le massif derrière, et il passe devant le voile du pied. Il n'a d'abord été que de la poussière, pour ne pas allumer de mi-teinte ; à l'écran il n'y avait pas de cône, et la maquette en montre un.
- **Les trois sources sont des dégradés** (réglage 3). La lueur autour de la lanterne, le cône du faisceau et le halo de l'horloge sont des dégradés, donc des mi-teintes : c'est l'**entorse** à « blanc ou absent » (§12.2) que la propriétaire avait déjà assumée pour le halo des vitres du train, étendue aux lumières de la gare. **Elle s'arrête aux sources** — le mur, le banc, la valise, la bordure, le massif et la rame restent blancs ou absents. La lanterne et le cadran de l'horloge, eux, sont des **blancs pleins**, tracés au rendu et non dans les SVG : un `fill` dans un dessin part dans la masse, que le rastériseur aplatit au noir du fond.
- **Le panneau des départs**, à droite, **sur deux pieds plantés sur le quai** (il n'est pas accroché au mur du bâtiment) :

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

  - **Les trois premières lignes sont les trois façons de la joindre** :
    - `LINKEDIN` ouvre le profil dans un nouvel onglet ;
    - `CV` mène à `/ailleurs/cv` (§4.5) — plus aucun PDF ;
    - `ÉCRIRE` ouvre un `mailto:`. Il n'y a **pas de formulaire de message** : « ça fait juste un mailto ». L'adresse est assemblée en JavaScript au montage, jamais écrite en clair dans le HTML (les robots ramassent les `mailto:`). Le prix, dit franchement : sans client mail par défaut, on clique et rien de visible ne se passe.
  - **Au survol et au focus clavier**, la ligne s'inverse : fond clair, texte en couleur de fond.
  - **Elles ne partent jamais** : toujours « dans quelques minutes » (+4, +11 et +19 minutes de maintenant). Les trois façons de la joindre ne peuvent pas être parties.
  - **Les trois dernières sont éteintes** et changent à chaque arrivée, tirées d'un vivier fixe (`src/scene/horaires.ts`) — « juste pour faire semblant ». Les destinations ne changent pas pendant l'arrêt, pour ne pas distraire. Les horaires passent minuit sans se casser.
- **Le cadre est du décor, le texte est du contenu.** Le cadre du panneau est dans le canvas : il défile avec le quai, il est reflété dans l'eau. Le texte est du DOM, en JetBrains Mono, posé dessus : le focus clavier, la sélection, le lecteur d'écran et le `mailto:` ne se réimplémentent pas à la main. Il vit **hors des routes**, comme les répliques des oiseaux, et s'efface **sur place** au départ pendant que son cadre s'en va. Au passage sans arrêt, on voit donc défiler un panneau éteint.
- **La gare qui revient.** « ailleurs » revient tous les quatre trajets et son décor se replace sans qu'on le voie sauter : c'est le mécanisme de l'île de câbles, généralisé à deux îles. Le décor reste là quand le train traverse sans s'arrêter.
- **Les étoiles derrière le bâtiment sont cachées** tant que le bâtiment est à l'écran : le bâtiment se dessine devant le ciel. Le coût est posé et accepté.
- **Mobile.** Sur petit écran, le cadre rétrécit et le texte avec lui, jusqu'à devenir illisible. Ce n'est pas réglé : étape 5.
- C'est la dernière gare : le prochain arrêt est « ici ».

### 4.5 ailleurs / cv — le CV, écrit dans le site

Le CV est une **page du site**, dans son design, pas un PDF. Il s'ouvre **dans la gare** : on ne quitte pas « ailleurs », la gare reste derrière, assombrie, son réverbère allumé et son train à quai, et le CV s'écrit par-dessus en dissolution et se referme de même. Arriver directement sur `/ailleurs/cv` pose la gare assombrie, CV ouvert. Le retour mène à `/ailleurs`.

- **La forme : une ligne.** Une voie verticale, chaque entrée est un arrêt dessus : un filet, un point par arrêt. Les postes sont de gros points lumineux avec halo, les diplômes de petites haltes. **Une seule voie, par date, postes et diplômes entrelacés** — ils l'étaient dans la vie.
- **Trois lignes par arrêt et rien d'autre** : l'intitulé, le lieu, les dates en mono.
- **Ce qu'Emmanuelle a retiré**, dans le sens du §2 (« pas d'égotrip ») : les descriptions de poste, les langues, la liste d'outils — le portfolio *est* la démonstration technique. Restent, sous la voie, « hors de la voie » (ses passions) puis les coordonnées.
- **Ce qui n'y est pas** : ni numéro de téléphone ni adresse postale. La page est publique et indexable. On garde le mail et GitHub.
- **Le contenu** est figé dans un module versionné, `src/contenu/cv.ts` : ses sources (une capture LinkedIn, un PDF de 2021) sont hors du dépôt.
- **Il défile**, avec une barre fine aux couleurs de la palette plutôt que la barre native.

## 5. Le ciel des voyageurs

- Présent **partout**, tout le temps. Les étoiles se survolent depuis n'importe quelle gare.
- Chaque phrase approuvée = une étoile. Les plus récentes brillent plus :

```ts
// âge en jours
const eclat = Math.max(0.16, Math.exp(-age / 18))   // 1 = neuve, 0.16 = très ancienne
```

**Chaque** étoile porte une lueur, pas seulement les récentes : des anneaux
concentriques dont l'opacité retombe, pour que le bord se dissolve au lieu de
finir net. C'est la **portée** de la lueur qui suit l'éclat, pas seulement son
opacité — une étoile pâle est un point **plus petit**, jamais une tache plus
large et plus délavée. Sans ça les anciennes se fondaient les unes dans les
autres. (L'ancienne règle, « halo seulement au-dessus de 0,55 », ne vaut plus.)

```ts
// scintillement d'amplitude 0.12 + 0.35 * eclat
```

- **Survol** : la phrase apparaît doucement à côté de l'étoile (Inter Light 14 px), puis une ligne mono 10 px : prénom (si donné) · âge relatif (`à l'instant`, `aujourd'hui`, `hier`, `il y a 3 jours`, `il y a 2 mois`). Elle s'efface quand on s'éloigne.
- **Le ciel a une capacité** : au plus 120 étoiles sur un écran de bureau, 50 sur un téléphone. Les plus anciennes le quittent, et c'est la lecture qui tranche — elle ne ramène que les plus récentes. Une étoile ancienne ne s'éteint pas : elle s'estompe jusqu'à l'éclat plancher (0,16), puis, quand le ciel est plein, elle cède sa place à une plus récente.
- Position d'une nouvelle étoile : une place libre (la plus éloignée des autres parmi ~40 tirages), dans la moitié haute du ciel, hors de la frise. **La place se tire une seule fois, à la création**, puis voyage avec la trace (`x`, `y`) : tout le monde voit l'étoile au même endroit, et la phrase qui se défait monte vers la place où elle s'allumera vraiment.
- **Repère des coordonnées** : `x` est normalisé sur la largeur de la fenêtre ; `y` sur la **bande du ciel**, 0 juste sous la frise, 1 à mi-hauteur de la fenêtre. La frise est une bande fixe de 116 px, qui mange 30 % d'un téléphone en paysage : normaliser sur la hauteur entière aurait glissé des étoiles derrière elle.
- Au lancement, le ciel est presque vide : les premiers visiteurs allument les premières étoiles.

## 6. Décor et mouvements

- **Fond** : nuit encre, `#151517` par défaut, avec une poussière d'étoiles. **La couleur de fond change** avec l'icône « œil » en haut à droite (voir « Couleur de fond variable » ci-dessous).
- **L'ordre des plans** : le massif, puis **le ciel** — poussière et étoiles-voyageuses ensemble —, puis le **fond du plateau** (le voile du pied, les câbles de « plus loin », le décor éteint du quai d'« ailleurs »), puis les **lumières**, puis le **plateau** (les rails, le train, la terre, les oiseaux), puis les vitres. Le ciel passe donc **devant la montagne** : son grain continue sur le flanc au lieu de s'arrêter net sur la silhouette, qui laissait le massif en masse noire au milieu d'un ciel dense. La poussière couvre tout l'écran **jusqu'à la voie**, et le voile du pied, qui passe devant elle, l'éteint doucement en approchant des rails — sans l'éteindre tout à fait : le pied du massif doit rester visible derrière la rame, sans quoi le train, n'ayant plus rien à masquer, flotte dans un trou au lieu d'y découper une silhouette. Sous la voie il n'y a plus de ciel : le reflet ne renvoie ni la poussière ni les étoiles — il renverrait le même grain une seconde fois, et des sosies d'étoiles qui ne répondent à rien.
  - **Le décor du quai** (le bâtiment, le banc, la valise, la bordure) est dans le fond du plateau : devant le ciel, derrière la rame. Le bâtiment cache donc les étoiles qui tombent derrière lui, et n'a pas de poussière sur son mur : une maison est pleine, une montagne ne l'est pas.
  - **Les lumières** — le réverbère et son faisceau, le cadre du panneau, l'horloge — sont dans leur propre plan, **devant le voile du pied** (qui sinon éteindrait le bas du faisceau) et **derrière la rame** (sinon le réverbère lui passerait par-dessus à chaque départ). Les vitres du train, elles, appartiennent à la rame et restent après elle.
- **L'assombrissement à l'arrivée.** À « ailleurs », la scène s'assombrit pour faire ressortir le faisceau du réverbère ; au départ, elle se rallume.
  - **S'assombrir, c'est fondre vers la couleur de fond**, jamais vers le gris : le noir *est* la couleur du fond (règle ci-dessous), donc l'assombrissement suit l'œil. Il se fait par **une teinte (`Container.tint`) posée sur chaque plan qui s'éteint** — le massif, le ciel, et plan par plan ce qui peuple le plateau — et **pas par un voile noir plein cadre**, qui aurait assombri aussi tout ce qui est dessiné dessous, lumières comprises. La teinte isole son sous-arbre, sans passe plein écran. Elle se multiplie en descendant : aucune lumière n'a d'ancêtre teinté, et c'est à cette condition que les **vitres allumées** restent dans la rame. Le ciel descend moins que le reste : assez pour que le faisceau gagne, pas assez pour que les étoiles disparaissent.
  - **Ce qui s'éteint, c'est tout ce qui n'est pas une lumière.** Les quatre lumières restent à pleine valeur. Le reste descend : le massif, le quai, le banc, la valise, le bâtiment, les rails, le corps du train. La liste des exemptions est donc **un ordre de plans, pas une liste d'objets**. La propriétaire a validé cette règle « pour le moment » : elle se regarde dans la scène et peut encore bouger.
  - **Sur l'horloge du train** : ça descend pendant le freinage, ça remonte pendant le démarrage — jamais sur une minuterie à part.
  - **Calculé à partir de l'état du voyage, pas déclenché par un événement** (`nuit.ts`) : arrivée directe sur `/ailleurs` (lien partagé) → sombre dès la première image ; mouvement réduit → un basculement net, sans rampe ; traverser « ailleurs » sans s'arrêter → **pas d'assombrissement** : il est lié à l'arrêt, pas au lieu.
  - Le dosage — jusqu'où ça descend, en combien de temps — se règle dans la scène en mouvement, pas sur une capture.
- **Montagnes** : nuage de points / grain. **Elles tournent légèrement quand le train avance**, comme un relief vu depuis un train en marche. Le massif n'est plus une séquence d'images mais un rendu calculé dans le navigateur, depuis la carte de relief (voir §12.1) : la rotation est continue et le grain reste net sur tous les écrans. **Elles tournent avec la distance parcourue, pas avec le temps** : le relief démarre et s'arrête donc avec le train, au lieu de tourner à vitesse constante pendant qu'il freine.
- **Train** : version **pleine** (il masque le décor derrière lui), et **son corps prend la couleur du fond**, quelle qu'elle soit. Les séquences sont donc prises avec un corps **noir** — `PTITRAIN_grain_blanc`, c'est-à-dire `PTITRAIN_plein` passée au grain avec le trait laissé à pleine luminosité : c'est le rendu qui remplace ce noir par la couleur du moment. La rame est une locomotive et **deux wagons**, attelés tampons contre tampons. Séquences : rouler, démarrer, s'arrêter. Il ralentit longuement à l'approche d'une gare — le freinage prend près de la moitié de l'étape, deux fois plus que le démarrage — s'arrête, puis repart. Les images des roues y avancent avec la **distance** et non avec le temps : elles ralentissent donc avec le sol au lieu de tourner à plein régime jusqu'à se figer.
- **Les vitres** : les wagons roulent **fenêtres allumées** — avec, à « ailleurs », le réverbère, le cadre du panneau et l'horloge, ce sont les seules lumières de la scène, et ce sont les seules qui soient des voyageurs. Elles ne sont pas cuites dans les images : les deux wagons partagent leurs textures et s'allumeraient donc à l'identique, alors qu'ici chacun a son motif, et **toutes ne sont pas allumées**. Posées au rendu, leur grain se calcule aussi à la densité de pixels de l'écran, au lieu de traverser les deux réductions qui le salissaient. Chaque vitre **vacille** lentement — un seul champ aléatoire tiré une fois, dont le seuil monte et descend, comme le massif ; un bruit neuf à chaque image la ferait bouillir — et de temps en temps l'une d'elles s'éteint ou se rallume. **La cabine du conducteur reste éteinte** : une vitre allumée derrière son dos effacerait ses traits blancs. Autour de chaque vitre, une lueur : c'est **la seule entorse assumée** à « blanc ou absent », un dégradé et non du grain, choisie à l'œil contre un halo en points.
- **La terre** : quelques grains sous les rails, pour que le train repose sur quelque chose au lieu de flotter au bord du reflet. **Rien n'y est rempli** — seulement des points blancs à pleine luminance, dont la densité s'éteint vers le bas, en paquets le long de la voie plutôt qu'en voile uniforme. Comme rien n'est opaque, elle se pose sur le haut du reflet et en adoucit la couture au lieu de le recouvrir. Elle file à la vitesse **exacte** de la voie — elle est à la même distance — et à la distance, pas au temps : elle démarre, freine et s'arrête avec le train. Son grain se mesure en **texels du rendu**, comme celui du massif, et non en pixels de la source comme celui du train : il garde donc la même taille quelles que soient la fenêtre et la densité de pixels de l'écran.
- **La fumée** : des **bouffées** rondes sortent de la cheminée l'une après l'autre, enflent, se couchent en arrière selon la vitesse du train, puis se referment. À quai le panache monte droit en se balançant ; en marche il s'étale en chapelet sur les wagons. Chaque bouffée est faite de quelques lobes **tirés une fois à sa naissance** et portés ensuite sans rien retirer au hasard : elle garde sa forme en grandissant au lieu de bouillonner. Elle est de la **couleur du fond**, comme le corps du train : elle cache la montagne au lieu de s'ajouter à son grain. Les images de la locomotive portaient une fumée **dessinée**, qui montait et s'effaçait sur la boucle ; elle est retirée à la fabrication des assets — celle-ci suit la vitesse, l'autre ne le pouvait pas.
- **Reflet** : sous la voie, le décor et le train retournés. **Atténué par la densité, pas par l'opacité** : le reflet est rendu à pleine force et un masque de grain lui retire des points, de plus en plus en descendant. Ce qui reste garde sa luminance — blanc ou absent — et l'eau se défait en s'éloignant au lieu de pâlir. Il était auparavant à 16 % d'opacité et flouté : la bande occupait 18 % de la hauteur de l'écran pour 0,4 % de couverture, et son atténuation fabriquait exactement les mi-teintes que le projet refuse. La bande sous la voie reste **de la couleur du fond**, comme le reste de la nuit : on a essayé de l'assombrir, mais cela ne fait que donner plus de contraste aux points, qui ressortent alors trop en bas. Ce sont l'extinction du reflet et le **grisement de ses points** qui vident le bas de l'écran : ils se raréfient en descendant, et ce qui reste s'éteint vers le fond. C'est la seule mi-teinte assumée ici — des points aussi blancs tout en bas que contre la voie ressortaient trop.
- **Grain** : partout, la même matière que les montagnes.
- **Mouvements** : lents, comme un souffle. Pas d'à-coups mécaniques — la vitesse du train monte et descend en courbe douce, pas en ligne droite, pour que l'accélération elle-même ne saute pas aux transitions.
- **Typographie** : Inter (Light / Regular) pour les textes, JetBrains Mono pour les petites mentions (frise, compteurs, panneau des départs).
- **Couleur de fond variable** — règle unique : **dans tous les assets, le noir devient la couleur du fond.** Le train, les poteaux, le quai d'« ailleurs » et le corps des oiseaux sont dessinés avec du noir ; au rendu, ce noir est remplacé par la couleur de fond courante.
  - En shader (PixiJS / Three.js) : `rgb = mix(uFond, texel.rgb, luminance(texel.rgb))`, alpha inchangé. Le noir devient le fond, le blanc reste blanc, les gris se mélangent.
  - En canvas 2D : sur un canvas hors écran, dessiner l'image, puis `globalCompositeOperation = 'lighten'` et remplir avec la couleur de fond, puis `'destination-in'` et redessiner l'image pour garder sa forme. Mettre en cache le résultat, recalculé seulement quand la couleur change.
  - La couleur est une seule variable (`--fond` côté CSS, `uFond` côté scène), animée en douceur (GSAP, ~1 s) quand on clique sur l'œil.
  - `--fond=#RRGGBB` dans `grain_train.py` ne sert que pour des exports statiques (Figma, image de partage).
- **L'icône « œil »** (en haut à droite, simple trait clair, sans fond de bouton) : chaque clic passe à la couleur suivante du cycle, en fondu (~1 s). Le choix est mémorisé pour la visite suivante (`localStorage`, avec repli silencieux s'il est indisponible). C'est un `<button>` avec `aria-label="Changer la couleur de la nuit"`. Palette validée (toutes sombres, contraste > 12:1 avec le texte `#ececf0`) :

  Le cycle est celui de `src/scene/palette.ts`, qui fait foi :

  | Nom | Couleur |
  |---|---|
  | encre (par défaut) | `#151517` |
  | noir | `#000` |
  | vieille photo | `#2f1b0c` |

- **Couleurs** : fond `#151517` par défaut ; blanc légèrement grisé `#ececf0` pour le texte, opacités pour la hiérarchie (0.95 / 0.6 / 0.42 / 0.2), traits `#e6e6ea`, corps noirs `#0b0b0c`.

## 7. Assets disponibles

Tous dans `~/projet_zero/` (à copier ou convertir dans le dépôt, voir §10) :

| Dossier / fichier | Contenu |
|---|---|
| `montagne_hd/tramage/massif-carte.png` | **la carte de relief, 1536 × 1536 en 16 bits** : c'est elle, et elle seule, qui sert aujourd'hui. Le massif en est une grille déplacée |
| `montagne_hd/tramage/webp/` | séquence de 180 images (3840 × 944) rendue depuis cette carte — référence de calage, plus utilisée à l'affichage |
| `montagne/0001.png … 0160.png` | première séquence, remplacée |
| `blender/erosion.py`, `blender/massif.py` | fabriquent la carte, puis la rendent. `massif.py` est la source du portage GLSL |
| `PTITRAIN_blanc/` | traits blancs seuls, sans fond (non retenue) |
| `PTITRAIN_plein/` | source du train, version pleine, corps noir : `02_locomotive`, `03_wagon`, `04_start_locomotive`, `05_start_wagon`, `06_stop_locomotive`, `07_stop_wagon` |
| `PTITRAIN_grain_corps/` | **séquences retenues** : `PTITRAIN_plein` passée au grain avec `--trait=1,1 --gris=#EDEDED --corps=0.05,0.01 --trous=0.08 --coupe=492`. Le corps y reçoit une matière — des points à pleine luminance dont seule la densité varie, du toit vers le bas — et le trait est moins troué. Contient aussi `01_rails`, repris de `PTITRAIN_grain_blanc`. Les commandes sont dans le README du dépôt |
| `PTITRAIN_grain_blanc/` | l'étape d'avant : même chose sans `--corps` ni `--trous`, corps vide. Garde la seule `01_rails` au bon gris |
| `outils/grain_train.py` | génère la version grain. Sans `--trait`, il assombrit chaque pixel du trait (0,65–0,90) : le train devient gris et s'efface dans la montagne. `--trait=1,1 --gris=#EDEDED` applique la règle du massif |
| `PTITRAIN_grain_vivant/` | version pleine avec grain vivant, corps noir (non retenue ; on y prend seulement `01_rails`, la seule voie disponible) |
| `oiseaux/bouvreuil-*.svg / .png` | les 8 poses d'origine, **plus utilisées** : dessinées pour l'aplat et la couleur, elles perdaient leur œil en passant au trait |
| `public/assets/oiseaux/*.svg` | **les cinq poses retenues**, redessinées pour la ligne : `perche`, `perche-ebouriffe`, `sonne`, `vol-haut`, `vol-bas`. Profil strict, silhouette fermée remplie de `#0b0b0c` qui masse comme le train, rien à l'intérieur hors des marques qui portent un sens. Celle qui regarde à gauche est la même, retournée au rendu. viewBox 120 × 90 |
| `cables/cables-scene.svg / .png`, `cables/poteau.svg` | poteaux + fils, cadre 1280 × 832. Sert de **mesures**, pas de texture : la scène en relit la géométrie et la redessine en points |
| `ailleurs/panneau-ailleurs.svg` | le poteau indicateur, **abandonné** (voir §4.4) : on ne s'en sert plus |
| `public/assets/ailleurs/*.svg` | le quai d'« ailleurs », dessiné pour le projet : `reverbere`, `banc`, `valise`, `batiment`. Au trait blanc ; le grain du bâtiment est dans son SVG |
| `rails.png` | la voie |

Références visuelles :
- Figma « Portfolio 2025 » : écran de la gare « ici » (node `220:28`, **référence actuelle** : fond brun ; le train y est encore sans fond, la version retenue est pleine avec le corps couleur du fond), `MacBook Air - 2` (première scène), `Nav C – boucle défilante`, `Là-haut · 1` et `Là-haut · 2`, et l'écran « plus loin » fait par Emmanuelle.
- Prototypes animés (privés, sur le compte claude.ai d'Emmanuelle) : « Là-haut » (formulaire + grain qui monte) et « Plus loin » (oiseaux).

## 8. Stack

| Besoin | Choix |
|---|---|
| Projet | **Vue 3 + Vite + TypeScript** |
| État du voyage | **Pinia** |
| Gares / liens | **Vue Router** (une route par gare) |
| Rendu animé (« la scène ») | un `<canvas>` plein écran, piloté en TypeScript pur — moteur à choisir, voir §12 |
| Timelines | **GSAP** |
| Utilitaires | **VueUse** (`usePreferredReducedMotion`, `useMouse`, `useRafFn`) |
| Phrases du ciel | **Firebase** : Firestore + règles de sécurité + **App Check** (reCAPTCHA), plan gratuit Spark |
| Message privé | un `mailto:` : rien à héberger |
| Hébergement | **Vercel** ou **Netlify** |

Principe : **la scène ne connaît pas Vue**. Elle expose des méthodes et émet des événements ; un seul composable fait le pont. Vue gère l'état, les routes et toute la couche HTML (frise, textes, formulaires, panneau des départs, CV, bulles de survol).

## 9. Architecture

```
src/
  scene/                    ← TypeScript pur, aucun import de Vue
    Scene.ts                canvas, boucle de rendu, redimensionnement, grain global
    Massif.ts               le massif en Three.js : grille déplacée, tramage en shader
    Relief.ts               le pont Three → Pixi, et le cadrage du massif sur la scène
    Sky.ts                  poussière d'étoiles
    StarLayer.ts            les étoiles-voyageurs (classe `Stars`) : éclat, survol. Pas `Stars.ts` :
                            sur macOS il entrerait en collision avec `stars.ts`
    stars.ts                limite du ciel, éclat, tirage de la place (fonctions pures)
    Train.ts                sprite sheets (rouler / démarrer / s'arrêter) + reflet
    Terre.ts                les grains sous les rails, pavés et défilant avec la voie
    Vitres.ts               les fenêtres allumées des wagons, leur vacillement et leur lueur
    Fumee.ts                les bouffées de la cheminée
    quai.ts                 la géométrie du quai d'« ailleurs » : cadres, places, décalage (fonctions pures)
    QuaiLayer.ts            le quai dans la scène (classe `Quai`) : décor éteint, lumières, horloge
    Faisceau.ts             le faisceau du réverbère : sa propre poussière
    horaires.ts             les départs du panneau : vrais, éteints, passage de minuit (fonctions pures)
    nuit.ts                 l'assombrissement à l'arrivée, calculé depuis l'état du voyage (fonction pure)
    reflet.ts               le masque de grain du reflet, et l'assombrissement de l'eau
    cables.ts               la géométrie des câbles : mesures, flèche, vibration (fonctions pures)
    CableLayer.ts           la rangée dans la scène (classe `Cables`). Pas `Cables.ts` :
                            sur macOS il entrerait en collision avec `cables.ts`
    oiseaux.ts              les choix des bouvreuils : places libres, gestes (fonctions pures)
    poses.ts                les cinq poses et leur passage au grain
    Birds.ts                les bouvreuils : vie sur le fil, chute, bosses, arrivées
    Dissolve.ts             phrase → grains → un grain qui monte → étoile
    events.ts               petit émetteur d'événements typé
  stores/
    voyage.ts               gare actuelle, cible, progression, enRoute / aQuai
    traces.ts               phrases du ciel (une lecture bornée, écriture, confirmation)
  composables/
    useScene.ts             le pont Vue ↔ scène
  components/
    NavFrise.vue            la frise en boucle
    StarTooltip.vue         la phrase au survol (ou à l'appui) d'une étoile
    PanneauDeparts.vue      le texte du panneau d'« ailleurs », **hors des routes** lui aussi
    CvLigne.vue             le CV, route imbriquée `/ailleurs/cv`
    RepliquesOiseaux.vue    les répliques des bouvreuils et le bouton clavier, **hors des
                            routes** : une phrase doit survivre au départ du train
    EtoilesListe.vue        la liste des étoiles, masquée visuellement
    gares/
      GareIci.vue
      GarePlusLoin.vue      répliques des oiseaux (HTML), bouton clavier
      GareLaHaut.vue        formulaire « Laisser une trace ? »
      GareAilleurs.vue      coquille : le CV s'ouvre dedans
  contenu/
    liens.ts                LinkedIn, mail (assemblé au montage), page du CV — bouchons
    cv.ts                   le parcours : données seules
  router/index.ts
  firebase.ts
  App.vue                   <canvas> + couche HTML par-dessus
public/
  assets/                   sprite sheets du train, carte de relief, SVG
```

Contrat de la scène (indicatif) :

```ts
class Scene {
  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean })
  travelTo(gare: Gare): Promise<void>      // départ, trajet, arrivée (timeline GSAP)
  setStars(traces: Trace[]): void
  setPointerPx(px: number, py: number): void            // pixels CSS : quelle étoile, s'il y en a une
  beginDissolve(phrase: string, from: DOMRect, place: Place): Poignee
  on(evt: 'starHover', cb: (t: Trace | null, x: number, y: number) => void): void
  on(evt: 'birdFell', cb: (x: number, y: number) => void): void
  on(evt: 'progress', cb: (p: number) => void): void    // pour la frise
  dispose(): void
}
type Gare = 'ici' | 'plus-loin' | 'la-haut' | 'ailleurs'

// La poignée rendue par beginDissolve. `land` et `revert` sont terminaux et
// s'excluent : l'un ou l'autre, une seule fois.
type Poignee = {
  land(trace: Trace): Promise<void>   // le grain atteint sa place, l'étoile s'allume
  revert(): Promise<void>             // l'envoi a échoué : la phrase se recompose (inutile de l'attendre)
}
```

`addStar` n'existe plus : la dissolution commence **avant** que l'on sache si l'écriture réussira, et ne peut donc pas porter la trace. La poignée sépare ce qui se joue tout de suite (la phrase se défait) de ce qui attend l'issue (l'étoile). L'appelant doit **attendre `land` avant `confirmer`** : l'étoile ne devient « la sienne » dans le store qu'une fois allumée. Si la poignée est déjà partie en `revert` quand l'écriture finit par réussir, c'est le store, que `useScene` surveille, qui fait entrer l'étoile dans le ciel.

Store du voyage :

```ts
{ gare: Gare, cible: Gare | null, enRoute: boolean, progression: number /* 0→1 */ }
// ordre de la boucle : ['ici', 'plus-loin', 'la-haut', 'ailleurs']
// aller de A à B = toujours avancer : ici → plus-loin → … jusqu'à B
```

## 10. Données (Firestore)

Collection `traces` :

```ts
{
  phrase: string      // 1 à 80 caractères (points de code, pas unités UTF-16)
  prenom?: string     // 0 à 24 caractères
  x: number           // 0 à 1, sur la largeur de la fenêtre
  y: number           // 0 à 1, sur la bande du ciel (voir §5)
  creeLe: Timestamp   // serverTimestamp()
  approuvee: boolean  // false à la création ; Emmanuelle valide depuis la console
}
```

Règles (le fichier de référence est `firestore.rules`, testé par `npm run test:rules`) :

```
match /traces/{id} {
  allow read: if resource.data.approuvee == true;
  allow create: if request.resource.data.keys().hasOnly(['phrase','prenom','creeLe','approuvee','x','y'])
                && request.resource.data.phrase.matches('(?s).{1,80}')
                && request.resource.data.x >= 0 && request.resource.data.x <= 1
                && request.resource.data.y >= 0 && request.resource.data.y <= 1
                && request.resource.data.approuvee == false
                && request.resource.data.creeLe == request.time;   // et le reste, voir le fichier
  allow update, delete: if false;
}
```

- **La longueur se borne par `matches`, pas par `size()`** : `size()` compte des unités UTF-16, où un émoji pèse 2, alors que le formulaire compte des points de code. Avec `size() <= 80`, une phrase de 80 points de code contenant un émoji serait refusée. `.` en RE2 vaut un point de code : 80 passent toujours, 81 jamais.
- **Les champs inconnus sont refusés** (`hasOnly`) ; **`update` et `delete` le sont toujours** : une trace s'écrit une fois.
- **La lecture est une seule requête bornée** — `approuvee == true`, `creeLe` décroissant, `limit(N)` avec N la capacité du ciel (§5) — qui demande un **index composite** (`firestore.indexes.json`). **Aucun abonnement en direct** : une phrase approuvée pendant une visite s'allume au chargement suivant. C'est voulu : le ciel est un décor, pas un flux, et un écouteur ouvert coûterait une lecture par modification pour un gain que personne ne verrait.
- **App Check** activé sur Firestore (reCAPTCHA) contre le spam.
- Modération : à la main dans la console au début. Option plus tard : notification par mail à chaque nouvelle phrase (nécessite le plan Blaze).
- Le visiteur voit **sa** nouvelle étoile tout de suite (côté client), même avant validation ; les autres la verront une fois approuvée.

## 11. Contraintes transverses

- **Mouvement réduit** (`prefers-reduced-motion`) : train à l'arrêt, gares en fondu, pas de dissolution (l'étoile apparaît simplement), pas de scintillement.
- **Mobile** : moins de particules, scène recadrée, frise réduite (gare actuelle + prochaine), formulaires pleine largeur avec une marge de 16 px.
- **Appui au doigt** : sur un écran tactile, il n'y a pas de survol. Un appui sur une étoile en révèle la phrase, un appui ailleurs la referme.
- **Clavier** : la frise est une vraie navigation (`<nav>` + liens) ; focus visibles ; les étoiles récentes sont accessibles via une liste masquée visuellement.
- **Poids** : réglé pour les montagnes — le massif ne pèse plus que sa carte de relief (3 Mo) au lieu d'une séquence. Les séquences du train sont converties en WebP et chargées progressivement : la gare actuelle d'abord.
- **Textes** de l'interface en français ; code, noms de fichiers et commentaires techniques en anglais (sauf les noms de gares).

## 12. Décisions ouvertes

1. ~~Les montagnes : séquence existante ou 3D ?~~ : **décidé — B**. On a d'abord fait *A*
   (la séquence en WebP, choisie selon la progression), et le massif restait brouillon :
   même rendue en 3840 px, l'image était agrandie d'environ 1,4× sur un écran Retina, et la
   rotation avançait par paliers de 3,8 images par seconde.
   Le massif est donc **calculé dans le navigateur avec Three.js**, en portant le modèle
   d'ombrage de `blender/massif.py` en GLSL. Les deux moteurs cohabitent : Three calcule le
   massif dans son canvas, **PixiJS** le consomme comme une texture et garde tout le reste
   (reflet, recoloration, voie, train, ciel).
   Reste ouvert : **la taille du grain à l'écran**, seul réglage visuel qui n'a pas de bonne
   réponse objective.
2. ~~Le train~~ : **décidé** — grain **blanc**, corps recoloré au rendu avec la couleur de
   fond. Le grain par défaut de l'outil assombrit chaque pixel du trait (`LINE_MIN/MAX
   = 0.65–0.90`), ce qui faisait disparaître le train dans la montagne et défaisait le
   dégradé de pied. Le massif n'allume jamais un point à mi-teinte : on lui applique la
   même règle, blanc ou absent.
3. ~~La voie en 3D ?~~ : **non**. La scène n'a aucune perspective — caméra orthographique,
   train strictement de profil : de vrais rails fuiraient vers un point de fuite et
   jureraient. Et la voie ne fait que 20 px de haut, trop peu pour un tramage. Elle reste
   une bande 2D qui défile, grainée comme le reste.
4. ~~L'icône « œil »~~ : **décidé** — elle fait défiler un **cycle de couleurs de fond**, et rien d'autre. Palette validée (§6).
5. **Contact** : le formulaire de message est devenu un `mailto:`, et **le PDF du CV disparaît** — le CV est une page du site (§4.5). Restent deux choses, **qui manquent toujours** : **l'adresse mail** (derrière `ÉCRIRE` et au bas du CV) et **l'URL LinkedIn**. Elles sont des **bouchons** dans `src/contenu/liens.ts` — l'adresse est celle d'un CV de 2021, pas une décision — et **rien ne se déploie sans elles**.
6. **Hébergeur** : Vercel ou Netlify.

## 13. Étapes

Chaque étape se termine par une version qui tourne et qu'Emmanuelle valide avant de passer à la suivante.

1. **Squelette**
   - Vite + Vue + TS + Pinia + Router + GSAP, structure du §9.
   - Canvas plein écran, fond, poussière d'étoiles, montagnes (décision 12.1), voie, train qui roule, ralentit et s'arrête, reflet.
   - Frise en boucle et routes des 4 gares ; trajet toujours vers l'avant.
   - *Fini quand* : on clique sur une gare de la frise, le train fait le trajet, la frise glisse, l'URL change.
2. **là-haut + le ciel**
   - Firebase (projet, règles, App Check), lecture des traces, éclat selon l'âge, survol.
   - Formulaire et animation de dissolution → étoile.
3. **plus loin**
   - Câbles (arrivée / départ), bouvreuils, chutes, répliques, envols.
4. **ailleurs**
   - Le quai, le réverbère et son faisceau, le panneau des départs vivant, l'assombrissement à l'arrivée, les trois liens (LinkedIn, CV, `mailto:`), et le CV écrit dans le site (`/ailleurs/cv`).
   - Les textes d'« ici » en sortent : « ici c'est bon, pas besoin de faire quoi que ce soit pour le moment ».
5. **Finitions**
   - Mouvement réduit, mobile, clavier, poids des assets, métadonnées et image de partage.
