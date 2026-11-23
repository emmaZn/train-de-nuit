# Étape 5 — relevé d'avant-chantier

2026-11-23 · relevé, pas une spec

Le §13 du CONCEPT donne six chantiers à l'étape 5 : « mouvement réduit,
mobile, clavier, poids des assets, métadonnées et image de partage ». Une
partie a été faite en chemin pendant les étapes 2 à 4, sans être cochée nulle
part. Ce document dit **ce qui est déjà là et ce qui ne l'est pas**, mesuré le
23 novembre 2026 au soir, juste après la clôture de l'étape 4.

Il ne décide de rien. Les chiffres sont à revérifier avant d'y toucher : ils
vieillissent.

**Les chantiers « mouvement réduit », « clavier » et « mobile » ont été menés
dans la nuit du 23 au 24 novembre 2026.** Voir les sections datées en fin de
document ; les §1, §2 et §3 ci-dessous sont laissés tels qu'ils ont été écrits.
Leurs alertes se sont révélées fausses toutes les trois fois, et les vrais
défauts n'y figuraient pas.

## 1. Mouvement réduit — largement fait, trois trous à vérifier

`prefers-reduced-motion` est lu une fois dans `useScene`, passé à `Scene`, et
redescendu : **27 fichiers** le consultent, dont `Birds`, `Faisceau`, `Fumee`,
`NeigeLayer`, `QuaiLayer`, `StarLayer`, `Vitres`, `nuit` et `rideau`. Les
composants Vue ont leurs propres gardes CSS.

Trois couches animent **sans consulter le réglage**. À regarder une par une,
ce ne sont pas forcément trois défauts :

- **`Dissolve.ts`** — la phrase qui se défait en étoile. C'est la plus longue
  animation du site et la plus chargée en mouvement ; c'est le trou le plus
  probable.
- **`Sky.ts`** — le parallaxe de la poussière, 14 px de course, un lissage à
  0,02 par image. Lent, mais continu et lié au pointeur.
- **`Relief.ts`** — son `update()` est à lire avant de conclure.

## 2. Mobile — fait par morceaux, rien de systématique

Ce qui existe : `SEUIL_MOBILE = 720` sert de bascule dans la scène (nombre de
grains, d'étoiles, ancrage de la frise, échelle du quai), et **neuf composants
portent des media queries** — `GareIci`, `GareLaHaut`, `GareAilleurs`,
`PanneauDeparts`, `CvLigne`, `NavFrise`, `StarTooltip`, `VoletTexte`,
`Signature`.

Ce qui n'existe nulle part :

- **Aucun `env(safe-area-inset-*)`** dans tout le projet. Sur un iPhone à
  encoche, la frise et les commandes touchent les barres système.
- **Aucun `100dvh`** ni gestion de la barre d'URL mobile, qui se rétracte au
  défilement et change la hauteur de la fenêtre — donc le cadrage de la scène,
  donc la bande des étoiles.
- Rien sur le **toucher long**, le **pincement**, ni le rebond de défilement.

## 3. Clavier — bon état, deux questions ouvertes

Chaque commande est un vrai `<button>` ou un `<a>`, et **tous portent un
`:focus-visible` visible** : l'œil, le FR/EN, les gares de la frise, les
commandes du panneau, la croix du panneau, les liens du CV, sa croix, les
oiseaux. Le CV prend le focus à l'ouverture (`tabindex="-1"` sur le conteneur)
et le rend en partant ; Échap le ferme. La liste des étoiles est atteignable
(`tabindex="0"`), le champ de « là-haut » répond à Entrée.

Reste à trancher :

- **L'ordre de tabulation n'a jamais été parcouru en entier**, d'une gare à
  l'autre. Personne n'a vérifié ce que ça donne quand le panneau des départs
  est baissé, ou quand une bulle d'étoile est ouverte.
- **Rien ne piège le focus** dans le CV ni dans le panneau : on peut tabuler
  derrière, dans une page qu'on ne voit pas.

## 4. Poids des assets — le vrai chantier

```
public/assets          17 Mo   248 fichiers
  └ train              14 Mo   la séquence du train
  └ massif-carte.png  2,6 Mo
  └ ailleurs            40 ko
  └ oiseaux             20 ko
dist (après build)     26 Mo
```

Le train pèse **à lui seul 82 % des assets**. Le bundle JavaScript dépasse
500 ko et Vite le dit à chaque build. Rien n'a encore été tenté : ni format
moderne, ni atlas, ni chargement différé par gare.

À noter, parce que ça change la cible : l'écran d'attente posé ce soir tient
**4,2 ko gzippés** et s'affiche avant tout le reste. Le poids des assets ne
décide donc plus de la première image, seulement du moment où le train arrive
— mesuré à **1,4 s** en local, cache chaud.

## 5. Métadonnées — rien du tout

`index.html` ne porte que `charset` et `viewport`. Il manque :

- `<meta name="description">`
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`)
- Twitter Card
- `<link rel="canonical">`
- `robots`, et la question de savoir si le site doit être indexé

Le `<title>` existe (« Train de nuit ») et **ne suit pas la langue** : il reste
français quand le site passe en anglais. L'attribut `lang`, lui, a été corrigé
le 23 novembre (commit `44690e7`).

**`hreflang` a été écarté ce soir**, et pour une raison qui vaut encore : la
langue vit dans le `localStorage`, il n'y a qu'une seule URL par page. Rendre
les deux langues adressables (`/en/...` ou `?lang=en`) est un chantier à part,
qu'Emmanuelle n'a pas voulu ouvrir.

## 6. Image de partage — rien

Pas de fichier, pas de balise. Le favicon existe (`favicon.svg` 825 o,
`apple-touch-icon.png` 578 o, une étoile et son halo), mais une image de
partage, c'est 1200 × 630 et un tout autre cadrage.

La question à trancher avant de la fabriquer : **une image fixe, ou une
capture de la scène ?** Le site a tout ce qu'il faut pour se dessiner
lui-même — le grain, le massif, le train — et une image cuite à la recette de
`grain.ts` serait plus juste qu'une capture d'écran. C'est le même geste que
le favicon.

## Hors liste, mais à savoir avant de commencer

- **`base.css` déclare `--fond: #2e2313`** quand `palette.ts` prend `#151517`.
  Le script de tête d'`index.html` pose désormais la bonne nuit avant le
  premier pixel, donc `#2e2313` ne s'affiche plus jamais. Le doublon reste
  dans le code. Vu et non contesté le 23 novembre.
- **La séquence du massif n'existe plus** (dit dans `layout.ts`), mais son
  cadre `MOUNTAIN_SOURCE` reste parce qu'il place le massif sur la scène.
  Ne pas le prendre pour un reste à nettoyer.

## Vérifié le 23 novembre 2026 — chantier « mouvement réduit »

Les trois alertes du §1 ont été reprises une par une. **Aucune des trois n'est
un défaut.** Les fichiers ne lisent effectivement pas le réglage, mais `Scene`
les tient en amont, et c'est le bon endroit : une couche qui ignore le réglage
mais qu'on n'appelle jamais ne bouge pas.

- `Dissolve` — `Scene.ts:962` : `if (!this.peutAnimer) return
  poigneeSansAnimation(allumer)`. La phrase ne se défait pas, l'étoile s'allume
  d'un coup. C'est mot pour mot ce que demande le §11 du CONCEPT.
- `Sky` — `Scene.setPointer` (`Scene.ts:931`) repart aussitôt sous le réglage,
  et `Sky.pointeur` part de `{ x: 0, y: 0 }` : la racine du ciel ne quitte
  jamais sa place, son lissage à 0,02 tourne sur une cible immobile.
- `Relief` — `dessiner()` sort tant que `legs` n'a pas changé, et sous le
  réglage le train ne roule pas (`tick` est gardé par `peutAnimer`). Le massif
  ne tourne qu'au saut d'une gare à l'autre.

Le reste du §11 était déjà tenu : train à l'arrêt, étape franchie d'un coup
(`Scene.ts:1054`, l'arrivée part en microtâche), pas de scintillement.

### Les deux seuls défauts, corrigés le même soir

1. **`Birds.lacher()` secouait le fil avant sa garde.** L'oiseau restait sage
   sur son fil — c'est le §14, « le contenu est le but, la chute est le
   plaisir » — et le fil tremblait quand même. La secousse est passée dans la
   garde.
2. **`RepliquesOiseaux.vue` faisait monter la réplique de 6 px.** Le seul
   déplacement du DOM que rien ne gardait. Une recette de rechange,
   `paraitre-sur-place`, ne fait plus que le fondu.

### Trois choses mesurées au passage

- **Les oiseaux n'arrivent jamais en volant sous ce réglage.** Une place ne se
  libère que lorsqu'un oiseau quitte le fil, et la seule façon d'en quitter un
  est de tomber — ce que la garde empêche. `surLesFils()` reste donc au complet
  et `avancer()` n'ajoute personne. Mesuré en comparant les deux réglages après
  un clic : en marche normale la rangée passe de neuf à dix oiseaux et le fil
  reçoit les trois secousses attendues — le clic, le pas, l'atterrissage ; sous
  mouvement réduit elle reste à neuf et le fil ne reçoit rien. **Le vol
  d'arrivée n'est pas joignable sous ce réglage** : il n'y a rien à y garder.
  (Une première mesure, faite en faisant défiler la scène sans clic, ne prouvait
  rien : elle ne déclenchait aucune arrivée **dans aucun des deux réglages**.)
- **Le train ne scintille pas à l'arrêt.** Son compteur d'images continue de
  tourner — « le grain est vivant » —, mais `frameIndex` épingle l'état `arret`
  à la dernière image de la séquence (`count - 1`) : l'image affichée ne change
  pas. Vérifié : 42 pour un compteur à 0, 10, 100 ou 1000.
- **L'île ne glisse pas après le saut.** `suivreIle` ne déplace l'île qu'au
  prorata de `train.vitesse`, et cette vitesse vaut 0 à l'arrêt comme au premier
  instant du démarrage. Poteaux, fils, oiseaux et quai sont posés d'un coup à
  leur place, et n'avancent plus.

### La frise : tranché le 23 novembre — elle glisse encore

Les gardes du DOM ne coupent pas les fondus, elles les raccourcissent à 0,2 s —
et c'est juste : un fondu n'est pas un mouvement, et le §11 en demande, « gares
en fondu ». Mais **`NavFrise` n'est pas dans ce cas** : sa garde porte sur
`transition: transform`, c'est-à-dire sur le **glissement** de la piste, qui
dure donc encore 0,2 s au lieu de 1,2 s. Et le `font-size 1.2s` de la gare
courante (ligne 191) n'est gardé par rien.

**Décidé : on garde le glissement court.** 0,2 s est sous le seuil où l'on lit
un déplacement, et le couper net ferait perdre le lien entre la gare qu'on
quitte et celle où l'on arrive. La garde a donc été étendue aux trois
transitions de la frise — la piste qui glisse, les gares qui s'éteignent, le
libellé qui grandit — qui partent maintenant ensemble.

C'est cohérent avec ce que ces transitions sont : elles **ne servent qu'aux
sauts**. En route, `.piste` passe en `transition: none` et c'est la scène qui
la déplace à chaque image. Elles n'existent que pour qui ne voit pas la scène
bouger — mouvement réduit, ou pas de WebGL.

### Su et non corrigé

Le réglage est lu **une seule fois, au montage** (`useScene.ts:110`,
`PanneauDeparts.vue:216`). Le changer dans le système pendant une visite ne
fait rien tant qu'on ne recharge pas la page. Ça ne gêne personne en usage
réel — on règle son système avant d'ouvrir un site, pas pendant — mais il faut
le savoir pour vérifier : **recharger après avoir coché la case.**

### Fini quand

Emmanuelle active « Réduire les animations » dans Réglages › Accessibilité ›
Affichage, **recharge**, et fait le tour : un voyage entre deux gares, un clic
sur un oiseau, une phrase envoyée depuis « là-haut », le panneau des départs
baissé, le CV ouvert. Rien ne doit bouger tout seul, et le site doit rester
entier — le train est là, les textes s'affichent, les phrases répondent.

## Vérifié le 23 novembre 2026 — chantier « clavier »

Parcouru à la tabulation sur la page qui tourne, les quatre gares, panneau des
départs ouvert et CV ouvert. Les deux trous annoncés au §3 n'en sont pas ; le
vrai défaut n'y était pas.

### Ce que le §3 annonçait, et qui va bien

- **Le CV piège le focus, correctement.** `App.vue` pose `inert` sur ses deux
  boîtes dès que la route est `cv`, et `GareAilleurs` ne rend rien d'autre que
  le CV : il ne reste donc rien de focalisable au dehors. Mesuré : le cycle
  fait quatre arrêts — fermer, retour à la gare, l'adresse, GitHub — et
  revient au premier. Le focus entre dans le conteneur à l'ouverture et
  retourne au lien d'où il venait à la fermeture.
- **Le panneau des départs n'en piège pas, et c'est écrit.**
  `PanneauDeparts.vue:381` : « Ce n'est pas un piège : rien ne retient Tab ».
  C'est un panneau de gare, `role="region"`, pas une boîte de dialogue. Sa
  croix est bien dans la tabulation, juste après la frise et avant les trois
  lignes.
- **L'ordre est bon partout ailleurs** : la frise, puis ce qui appartient à la
  gare, puis la liste des étoiles, l'œil, FR/EN. À « là-haut » le formulaire
  s'intercale dans son ordre de lecture — la phrase, le prénom, « laisser ».

### Le défaut, qui ne se lisait pas dans le code

**La frise offrait six arrêts pour quatre gares.** La fenêtre compte six
entrées (`AVANT = 1`, `APRES = 4`) et la boucle quatre gares : deux y
figuraient donc deux fois, même nom, même adresse. Relevé à « ici » :

```
ailleurs · ici À QUAI · plus loin PROCHAIN ARRÊT · là-haut · ailleurs · ici
```

À l'œil ce sont les deux bords tenus de la boucle — sans eux la frise aurait
une fin. Au clavier et au lecteur d'écran, c'étaient deux destinations
fantômes, impossibles à distinguer des vraies.

**Corrigé** : les copies qui débordent de part et d'autre du tour complet
(`decalage < 0` ou `>= GARES.length`) restent dessinées mais passent en
`aria-hidden` et `tabindex="-1"`. La gare à quai reste offerte, même si c'est
la page courante : c'est elle qui porte « À QUAI ».

Vérifié après coup sur la page qui tourne :

```
ici À QUAI · plus loin PROCHAIN ARRÊT · là-haut · ailleurs
  · liste des étoiles · œil · FR · EN
```

Huit arrêts, une gare chacun, dans l'ordre du voyage.

### Su et non corrigé

Un `<div></div>` vide apparaît dans la tabulation de toutes les pages. Il
n'est pas du site : rien dans `src` ni dans `index.html` n'ajoute de nœud à
`body`. C'est l'extension du navigateur qui s'en sert pendant la mesure — à ne
pas confondre avec un défaut au prochain passage.

## Vérifié dans la nuit du 23 au 24 novembre 2026 — chantier « mobile »

Mesuré sur la page qui tourne, dans des cadres aux vraies tailles — 375 × 667,
390 × 844, 430 × 932, plus l'iPhone couché et l'iPad portrait.

### Les deux manques du §2 n'en sont pas

- **Le `dvh` ne sert à rien ici.** `base.css` pose `overflow: hidden` : le
  document ne défile jamais. Or la barre d'URL d'iOS ne se rétracte que sur un
  défilement **du document** — le CV, lui, défile dans sa propre boîte. La
  hauteur de la fenêtre ne bouge donc pas, et il n'y a rien à convertir.
- **Les encoches ne sont pas touchées.** Le `<meta viewport>` ne porte pas
  `viewport-fit=cover` : iOS garde la page **dans** la zone sûre et
  `env(safe-area-inset-*)` vaut zéro. Les bandes sont déjà à la couleur de la
  nuit, posées par le `html { background }` du script de tête. Passer sous
  l'encoche serait un **choix** — et il faudrait alors `env()` sur la frise,
  les commandes, la signature et le bas du CV. Non demandé, non fait.
- **L'appui au doigt était déjà fait**, et le commentaire de `useScene` le dit
  mieux que le §11 : « a finger never moves over a star before it lands: the
  touch is the whole gesture ». Un appui qui ne touche rien referme la bulle.

### Le défaut : la frise amputait la gare suivante

Le masque de la frise efface tout ce qui passe `margeVoieDroite` — la place de
l'œil et du FR/EN, 130 px — et commence à l'effacer `fonduFrise` plus tôt. Sur
un écran de 390 il ne restait donc que 250 px lisibles. Or la gare suivante
commençait à 206 et « PROCHAIN ARRÊT » finissait à 305 : **les deux tiers de
la mention étaient invisibles**, à 375, 390 et 430.

Trois pistes ont été rendues côte à côte sur la page qui tourne :

- **A** — descendre les commandes en bas de l'écran. Marchait, mais l'œil et le
  FR/EN venaient se serrer contre la signature.
- **B** — resserrer l'écart. Faisait apparaître une **troisième** gare, coupée
  à son tour : le §11 ne veut que la gare à quai et la suivante.
- **C** — mention courte et léger resserrement. **Choisi.**

Donc, à partir de maintenant :

- `t.frise.prochainCourt` — « PROCHAIN », « NEXT » — remplace la mention
  longue **sous `SEUIL_MOBILE`**, et seulement là.
- `ecartFrise` **plafonne** l'écart sur téléphone par la place qui reste :
  `largeur − margeVoieDroite − fonduFrise − ancre − LARGEUR_MENTION_MOBILE`.
  Ce n'est pas un réglage à l'œil, c'est une contrainte de place. Le plafond ne
  mord que là où il le faut : au-delà de 420 px environ, l'étalement est déjà
  sous le plafond et rien ne change.

Le resserrement de 5 % d'Emmanuelle (24 novembre, « 5 % disons ») reste la
règle partout où il y a la place. Deux tests de `layout` l'étendaient au
téléphone : ils ont été réécrits, pas supprimés.

Mesuré après coup : « PROCHAIN » finit **8 px avant le début du fondu**, aux
trois largeurs.

### L'iPhone couché — tranché le 24 novembre

`SEUIL_MOBILE` ne regarde que la **largeur**. Un téléphone couché — 844 × 390 —
reçoit donc toute la mise en page de bureau dans 390 px de hauteur. L'iPad
portrait (768 × 1024) est dans le même cas et s'en sort : son cadrage recadre
fort à l'horizontale sans rien casser. Le couché, lui, avait un vrai défaut :
**la signature tombait sur le corps de la loco**, tenue par sa tache de nuit —
un nuage noir posé sur le train.

Emmanuelle, devant les images : « on peut enlever le nuage noir derrière le
texte, et descendre le texte plus bas ». Quatre états ont été rendus à
844 × 390, et le troisième a été retenu.

Ce que les images ont appris, et qui n'était pas évident : **les deux moitiés
vont ensemble**. Sans la tache mais à `--marge-ecran` du bas, la ligne
disparaît dans le grain de la loco — c'est précisément pourquoi la tache
existait. Il a fallu descendre de 40 à 16 px pour qu'elle retrouve la bande
sombre sous le reflet, où elle se lit sans rien derrière elle. Seize et non
six : six la colle au bord, et la barre d'accueil de l'iPhone est là.

La garde est un `@media (max-height: 480px)`, et elle ne touche qu'au pied de
page. **Partout ailleurs la tache reste** : en portrait et sur un écran, la
ligne tombe sur le reflet et c'est elle qui la tient. La recette elle-même ne
bouge pas — ses arrêts sont ceux de la bulle, à la virgule, et un test les
compare.

La plaque de « ici », elle, n'a pas été touchée : la proposition d'en retirer
le fond puis de la descendre a été essayée et écartée — en paysage le seul
endroit sombre est celui où elle est déjà, et plus bas la phrase traverse la
crête éclairée du massif, puis le train.
