# Les deux plaques

2026-11-24 · projet · étape 2 et 5

## Intention

Emmanuelle, le 24 novembre : « je trouve que le formulaire là-haut et le texte
de "ici" manquent de cohérence visuelle et de poésie avec le style très
poétique de mon site ».

Sept propositions plus tard, la seule qui ait pris : **une plaque**. Les deux
gares qu'elle trouve justes — « les oiseaux et la gare » — ont un **objet** ;
« ici » et « là-haut » n'en ont aucun, et leur texte est posé à même le ciel.

## Ce qu'elle a tranché

1. **Une plaque pour « ici »**, en haut à gauche, 536 px — pas la version
   plantée sur le quai à l'échelle du train. « ok nice pour ici ».
2. **Le même objet pour « là-haut »** : le formulaire devient une plaque,
   centré, 550 px, là où elle l'avait posé le 23.
3. **Tout en mono**, y compris le formulaire. J'avais déconseillé le mono
   (« la voix de l'appareil ») ; elle a raison contre moi — **une plaque est un
   objet de la gare, pas une parole de voyageur**.
4. **Pas de biseau** : cadre à angles droits, contrairement aux coins coupés du
   panneau des départs. (Lu de « pas de bizot » ; si la lecture était mauvaise,
   c'est le seul point à reprendre.)
5. **Le cadre cuit au grain**, à la recette de `src/scene/grain.ts`.
6. **`LIGNE DE NUIT · SANS TERMINUS`** comme mention, validé séparément : c'est
   vrai, la boucle n'a pas de fin.
7. **Le titre devient « Laisser une étoile ? »**, au lieu de « Laisser une
   trace ? ».

## Ce que ça fait tomber

- **Deux des trois taches de nuit disparaissent** : celle du formulaire (spec
  du 14/11) et celle du mot de « ici » (23/11). Un fond opaque remplace un
  dégradé, et avec lui l'arête qu'il laissait sur le grain.
- **Celle du pied de page reste**, et celle de la bulle d'étoile aussi : ni
  l'un ni l'autre n'est une plaque, et les priver de leur tache les rendrait
  illisibles sur le train et sur le massif. La dérogation du 13/11 tient pour
  eux.
- **L'anti-but « pas de cadre » du §2 ne vaut plus pour ces deux blocs.** Il
  visait l'habillage d'interface ; ici le cadre est l'objet. C'est le même
  raisonnement qui a donné le cartouche du panneau des départs le 20/11.
- Le §4.3 décrit « un formulaire sans cadre » et le titre « Laisser une
  trace ? » : **il ne décrit plus la scène**.

## Buts

- Les deux gares ont un objet, de la même famille, et leur texte en fait partie.
- La lisibilité vient du fond de l'objet, nulle part d'une tache.
- Le cadre est de la même matière que le reste du site.

## Non-buts

- La bulle d'étoile, le panneau des départs, la frise, le pied de page.
- L'altitude : `612 m` est mon nombre, vu et non contesté. À changer d'un mot.

## Contraintes

- **Le fond de la plaque suit l'œil.** Il se prend sur `var(--fond)` en CSS et
  non dans le canevas, sinon il faudrait redessiner à chaque changement de
  couleur de nuit.
- **Le cadre est dessiné dans un canevas**, pas en `border` : un trait CSS est
  la seule chose du site qui ne soit pas du grain.
- **`Dissolve.ts` et le champ doivent changer ensemble.** `POLICE` rastérise la
  phrase ; un test compare cette constante à la déclaration de `.phrase`. En
  mono, les deux passent à `400 15px 'JetBrains Mono'`.
- Le mono coûte des caractères : le champ de 502 px rend **55 signes sur 80**,
  contre 68 en Inter 17 px. Elle l'a su en validant.

## Ce qui est décidé

### Un composant partagé

`src/components/PlaqueGrainee.vue` : un cadre cuit au grain, dessiné dans un
`<canvas>` dimensionné sur son contenu par un `ResizeObserver`. Il ne dessine
**que le cadre** : le fond opaque est du CSS, pour suivre `--fond`.

Quatre segments droits, cellule de `CELLULE_CADRE` pixels de cadre, `TROUS` de
trous, la couleur prise sur `--trait`. Les valeurs viennent de `grain.ts` et ne
sont pas redéclarées.

### « ici »

La plaque remplace `.mot` : `top: 212px`, `left: var(--marge-ecran)`, 536 px.
La phrase en mono 16 px à `--fort`, la mention
`ALT. 612 M · LIGNE DE NUIT · SANS TERMINUS` en mono 10 px à `--faible`.
**« Bienvenue » disparaît.** Ce n'est pas une demande explicite : c'est ce
qu'elle a validé en disant « nice » devant une plaque qui n'en portait pas. La
mention prend sa fonction d'ouverture, et deux lignes de service au-dessus
d'une phrase de deux lignes feraient trop. À remettre d'un mot.

### « là-haut »

Le formulaire entre dans la même plaque : centré, 550 px, `top: 204px`. Titre
« Laisser une étoile ? » en mono 15 px, champs en mono 15 et 13 px, ligne méta
en mono 11 px. Les traits sous les champs restent — ce sont eux qui disent
qu'on écrit.

## Laissé au constructeur

- La hauteur exacte des deux plaques, qui suit leur contenu.
- Le comportement au téléphone : la plaque de « ici » passe en pleine largeur
  moins les marges ; celle de « là-haut » garde ses règles de 720 px et de
  480 px de hauteur.
- Faut-il élargir le champ de « là-haut » à 770 px pour relire les 80 signes :
  **non tranché**, elle a validé 550.

## Critère d'acceptation

Vu **en mouvement** sur `/ici` et `/la-haut`, au bureau et au téléphone, avec
les deux fonds que l'œil propose — le fond de la plaque doit suivre.
