# Le monde s'élargit — conception

24 novembre 2026. Branche `scene-sur-telephone`.

## Ce qu'on veut

Emmanuelle a ouvert le site en ligne sur son téléphone. Trois remarques :

1. la texture de la montagne est « horrible » — sur mobile seulement, « ok » sur
   l'ordinateur ;
2. en portrait, il faut **tout réduire** pour qu'on voie plus de la scène et la
   locomotive ;
3. on devrait pouvoir **glisser** pour changer de gare.

Ce document ne traite que le **cadrage** (le point 2), parce que c'est lui qui
commande les deux autres : le grain se juge à la distance définitive, et le
glissement est indépendant.

En cours de réglage, elle a voulu la même réduction **sur l'ordinateur**, et a
posé une contrainte ferme en voyant les bords apparaître :

> **« je veux pas de coupage »**

C'est cette phrase qui fait le travail : la réduction est facile, c'est
l'absence de bord qui coûte.

## Ce qu'elle a tranché, sur rendus

Jugé sur des rendus réels à taille d'appareil, à `ici`, train à quai.

| | portrait 412 × 915 | paysage 1480 × 690 |
|---|---|---|
| recul de la scène | **0,5** | **0,8** |
| taille propre du massif | **× 1,3** | × 1 (inchangé) |
| descente de la voie | **140 px** | 20 px (inchangé) |

Deux choses restent ouvertes et lui reviennent :

- **le nez du train** (`TETE_LOCO`), qu'elle veut « reculer légèrement ». À
  régler au curseur une fois le cadrage posé, parce que sa bonne place dépend
  de ce qu'on voit autour — et parce qu'il entraîne le quai, le réverbère et
  les câbles avec lui ;
- **le grain du massif**, chantier suivant.

## Non-buts

- **Ne pas** toucher au grain du massif ici. Le recul ne change pas la taille
  de ses points : `GRAIN_ECRAN` se compte en pixels d'écran physiques. La
  montagne rétrécit, ses points non — c'est pour ça qu'elle paraît mieux
  dessinée, et c'est aussi pourquoi le problème de son téléphone **n'est pas
  réglé par ce chantier**.
- **Ne pas** déplacer les objets du monde. Le quai, les poteaux, le réverbère
  restent où ils sont : c'est le monde qui s'élargit autour d'eux, pas eux qui
  s'écartent.
- **Ne pas** inventer de contenu dans les marges. Ce qui s'y étend y était
  déjà : la voie, la terre, le massif, le ciel.

## Anti-but

Un bord visible. Si un seul plan continu s'arrête avant le bord de l'écran, à
n'importe quel format, le travail est raté — même si tout le reste est juste.

## Les approches

**A. Ne reculer qu'en portrait.** Gratuit : en portrait la scène reste deux
fois plus large que le téléphone même réduite de moitié, donc aucun bord
n'apparaît. Mais l'ordinateur ne bouge pas, et elle l'a demandé.

**B. Reculer partout et accepter les bandes.** Rejeté par elle, en regardant :
la voie s'arrête sur une ligne verticale franche.

**C. Élargir le monde, puis reculer partout.** Retenu. Les trois plans qui se
coupaient — la voie, la terre, la montagne — sont déjà faits pour s'étendre :
les deux premiers sont des bandes qui se répètent, la troisième est dessinée
bien plus large que ce qu'on en montre. Il ne s'agit pas de les réinventer,
mais de lever la limite de 2320 px qu'on leur a imposée à trois endroits.

## Comment

**Un monde plus grand que le plateau.** `STAGE` reste le système de
coordonnées : tout y est ancré, rien ne bouge. On ajoute autour une marge
fixe — latérale et haute — qui définit l'étendue des plans continus. Fixe, et
non déduite du viewport : un sprite répété dont l'origine suit la fenêtre
ferait sauter la phase des traverses à chaque redimensionnement.

**L'échelle est plafonnée par cette marge.** Le recul ne s'applique que
jusqu'au point où la fenêtre visible tient encore dans le monde. C'est ce qui
rend l'anti-but vrai *par construction* plutôt que par vigilance.

**Le recul varie continûment avec le format**, interpolé entre ses deux
ancres sur le rapport largeur/hauteur. Pas de seuil : `cadrageCiel` résout déjà
son échelle « sans aucun seuil de format », et un seuil ferait sauter le train
de moitié pendant qu'on redimensionne une fenêtre. Une tablette en portrait
fait 768 px de large — au-dessus de `SEUIL_MOBILE` — et doit pourtant être
traitée comme un portrait.

**La signature devient une butée.** La descente de la voie ne peut pas passer
sous elle. Sa hauteur est recopiée depuis `Signature.vue` dans une constante,
tenue par un test, comme `LARGEUR_MENTION_MOBILE`.

### Ce qui doit s'élargir

- la voie (`Train.ts`) et la terre (`cadreTerre`), déjà répétées ;
- le massif : lever le bornage de `fenetreVisible` ;
- le voile du pied (`cadreDegrade`) — sinon le pied de la montagne reste clair
  au-delà de l'ancien bord et dessine une couture verticale ;
- le reflet (`Scene.ts`) : la texture, le sprite **et** le masque ;
- la poussière du ciel (`Sky.ts`) et les étoiles (`stars.ts`), semées sur le
  plateau et donc absentes des marges — et surtout absentes de **tout le haut
  de l'écran** en portrait, où le stage ne commence qu'à 370 px du bord ;
- l'écran d'attente d'`index.html`, qui redessine ce ciel en JavaScript nu
  avant que le bundle n'existe, et qu'un test tient grain par grain.

### Ce qui doit suivre sans s'élargir

- le rejet hors champ du quai (`QuaiLayer`) et des câbles (`CableLayer`), qui
  se mesure contre `STAGE.width` : sinon ils disparaissent alors qu'ils sont
  encore à l'écran ;
- la queue du train, maintenant visible : il faut qu'elle finisse sur un wagon
  entier, pas sur une fin de sprite qu'on n'avait jamais vue.

## Comment on saura

Un test parcourt une grille de formats — 360×800, 412×915, 768×1024, 915×412,
1280×720, 1512×860, 2560×1080 — et exige, pour chacun, que l'étendue de chaque
plan continu contienne la fenêtre visible. C'est l'anti-but, écrit.

Puis les quatre gares rendues aux formats extrêmes, et un voyage complet.

## Ce qui est à moi

Les valeurs intermédiaires de l'interpolation, la taille des marges, et
l'ordre des travaux. Je lui montre un rendu de tablette en portrait, qui est le
format qu'aucune de ses deux ancres ne décrit.

---

## Où en est le chantier — 24 novembre 2026, fin de séance

**Fait, et tenu par les tests :**

- le monde (`MONDE`, marges 420 / 1200 / 320) et le recul interpolé entre les
  deux ancres, avec le plancher qui interdit à la fenêtre de sortir du monde ;
- la voie, la terre, le voile du pied, le reflet (texture, sprite, masque et
  rendu décalé), la poussière du ciel et l'écran d'attente d'`index.html` ;
- les rejets hors champ du quai et des câbles, mesurés sur le monde ;
- la cible de l'horloge, qui ne descend plus sous 44 px d'écran — comme le
  réverbère le faisait déjà ;
- les bras du panneau, qui montaient jusqu'au plateau et s'arrêtaient en l'air
  depuis le recul ;
- les constats de croisement réverbère / étoiles, recalculés (ils se sont
  éloignés : le croisement est encore moins atteignable qu'avant).

**Reste à faire :**

1. deux tests de `PanneauDeparts` : la fenêtre « trop étroite pour la plaque »
   à 800 × 1000 ne l'est plus (il faut en trouver une qui le soit encore), et
   `horsDeLaFenetre` juge sur le bord haut de la fenêtre alors que le décalage
   l'a déplacé — à relire, c'est peut-être un vrai défaut et pas un test ;
2. le test de grille « pas de coupure » existe pour le cadrage ; il manque
   celui qui vérifie l'étendue de **chaque plan continu** ;
3. vérifier à l'œil les quatre gares et un voyage complet, aux formats
   extrêmes — rien n'a encore été regardé autrement qu'à `ici`, à quai ;
4. lui montrer un rendu de tablette en portrait (768 × 1024), format
   qu'aucune de ses deux ancres ne décrit : elle y aurait un recul de 0,55 ;
5. puis **le nez du train** (`TETE_LOCO`), au curseur, dans le cadrage posé ;
6. puis le grain du massif, puis le glissement entre gares.

Commité en `6ac5b1b`.

---

## Le lendemain — 25 novembre 2026

Le cadrage posé, elle a jugé trois choses de plus sur des rendus réels.

**Le nez du train** (`TETE_LOCO`, qui valait 0,56 partout) devient le
quatrième réglage à vivre entre les deux ancres : **0,53 en portrait, 0,50 en
paysage**. C'est le premier qui déplace un objet du plateau et non le cadre,
d'où `Train.cadrer`, que `Scene.cadrer` appelle à chaque redimensionnement et
dès la première image. Ce qui doit rester dégagé devant la rame se vérifie
désormais contre `TETE_LOCO_MAX`, et non contre un format. Commité en
`11638d3`.

**L'ancre paysage reprise**, au vu du premier rendu large : « il faut que
l'horizon soit plus bas et que le massif soit légèrement plus grand ». Choisie
parmi quatre versions rendues à 1480 × 690 : **descente 70 px** (contre 20) et
**massif × 1,25** (contre 1). Le recul n'a pas bougé.

**La butée de la signature est réelle, et mesurée.** À 85 px de descente, le
pied de page vient se poser sur le reflet : 70 est à peu près le maximum que
ce format supporte. La tache qui détache le texte a été resserrée dans la
foulée, à sa demande — `inset: -14px -56px` au lieu de `-22px -76px`.

**Les trois remarques sont traitées.** Le cadrage (`6ac5b1b`, `0183d6f`), puis
le grain du massif — dont la cause n'était pas la taille des points mais la
**densité de l'écran** : le rendu suivait le `devicePixelRatio`, si bien que le
même grain valait 0,75 px de CSS sur son Mac et 0,50 sur son téléphone
(`13fe95a`). Puis le glissement entre gares (`6b7…`, ci-dessous). Entre-temps
elle a demandé et obtenu : tout le site en mono, les phrases des bouvreuils
dans la plaque d'« ici », des aplats noir et blanc sur la montagne, un voile du
pied deux fois plus haut, et des fenêtres de train qu'on peut éteindre au
doigt.

**Reste :** un voyage complet aux formats extrêmes n'a toujours pas été
regardé, et `partage.png` a encore de l'Inter cuit dedans.
