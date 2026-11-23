# L'écran d'attente

2026-11-23 · projet

## Intention

Emmanuelle, le 23 novembre : « il faudrait rajouter un loader / une animation
quand on arrive sur le site au premier chargement ». Puis, devant quatre
directions : **« on attend le train et la montagne surtout »**, et **« oui
essaie sur B »** — le ciel qui se peuple.

Devant la première version : « pour moi il faut plus d'étoiles pour faire la
densité du ciel étoilé », puis, aussitôt : **« pas celle de firestore, les
petites qui constellent tout le ciel »**.

## Ce qu'elle a tranché

1. **Le ciel de l'écran d'attente est celui de la scène.** Pas des étoiles
   inventées : la poussière de `Sky.ts`, aux mêmes places, aux mêmes rayons,
   aux mêmes opacités, semée par la même graine. Quand l'écran s'efface, rien
   ne bouge.
2. **Ce ne sont pas les étoiles-voyageuses** de Firestore — celles-là sont
   quelques dizaines dans une bande étroite, et le site est jeune.
3. **Le signal d'arrivée est le train et le massif**, pas le montage de Vue :
   l'écran tient jusqu'à ce que `Scene.peupler()` ait fini.

## Ce que j'ai tranché, et qu'elle a vu

- **Pas de durée minimale.** Prêt en 400 ms, l'écran part en 400 ms. Faire
  patienter quelqu'un pour lui montrer qu'on a travaillé, c'est du décor.
- **Le ciel ne respire pas.** Je l'avais annoncé — chaque grain à son rythme,
  pour qu'une attente longue ne vide pas le ciel. Avec le vrai ciel c'est
  faux : l'état final doit être **exactement** celui de la scène au moment du
  fondu, sinon la couture se voit. Il se peuple en 2,2 s, puis il tient.
- **Garde-fou à 12 s** (`ATTENTE_MAX`). Mieux vaut un site sans train qu'un
  ciel qui tourne devant un site qu'on ne verra jamais.
- **Le fondu dure 600 ms**, en CSS et dans `chargement.ts` : un test tient les
  deux ensemble.

## Buts

- Ce qu'on regarde en attendant est déjà le site. L'écran ne raconte pas
  l'attente, il la remplit avec la matière qui vient.
- L'écran se voit **avant** le moindre script d'application.
- Il ne reste jamais, quoi qu'il arrive à la scène.

## Non-buts

- Une barre, un pourcentage, un logo. Rien ne mesure l'attente.
- Le massif, le train, le quai, les étoiles-voyageuses : l'écran ne montre que
  le ciel.

## Contraintes

- **Le bundle ne peut pas servir.** Il dépasse 500 ko et importe Pixi ; un
  écran d'attente qui l'attend s'affiche quand il n'y a plus rien à attendre.
  Tout est donc en HTML, CSS et JavaScript nu dans `index.html`.
- **La recopie est inévitable, elle est donc tenue par un test.** `Sky.ts`
  expose `poussiereDeLaFenetre(w, h)` — le point unique où `cadrageScene` et
  `poussiereLibre` se rejoignent — et `src/__tests__/chargement.test.ts`
  exécute vraiment le script d'`index.html` pour comparer **grain par grain**
  sur six formats de fenêtre. Mêmes verrous pour la graine (`GRAINE_CIEL`) et
  pour les trois couleurs de `PALETTE`.
- **Pas de `requestAnimationFrame`.** Pendant ces deux secondes, le fil
  principal parse le bundle et monte Pixi : une boucle à l'image y gèle.
  Chaque réveil regarde l'heure et peint ce qui devrait être là.
- **Un canevas, pas 3 540 éléments.** C'est le nombre de grains sur un écran
  de bureau (315 sur un téléphone). En DOM, la page ramerait.

## Ce qui est décidé

### `index.html`

Deux scripts nus. Le premier, dans le `<head>`, pose la nuit avant le premier
pixel. Le second, après le `<div id="chargement">`, sème et peint.

La poussière est triée par opacité décroissante et posée selon
`(t / 2200)^(1/1.7)` : les plus vifs d'abord et vite, puis de plus en plus de
faibles, de plus en plus lentement — l'ordre dans lequel un œil s'habitue à la
nuit.

### `src/chargement.ts`

`retirerEcran(pret)` attend `Scene.pret`, pose `.parti`, et retire le nœud
après le fondu. `ATTENTE_MAX = 12_000`, `FONDU = 600`.

### `src/scene/Scene.ts`

`readonly pret: Promise<void>`, tenue dans **tous** les cas : pas de contexte
WebGL, pas de manifeste, fin de `peupler()`, et `dispose()`. Une promesse
abandonnée laisserait l'écran pour toujours, et le site derrière lui.

## Ce que ça fait tomber

- **`base.css` déclare `--fond: #2e2313`**, que `useScene` remplace par
  `#151517` de `palette.ts` au montage. Personne ne voyait ce virage : il
  arrivait sur une page vide. Devant l'écran d'attente il durerait une seconde
  et demie, alors le script du `<head>` pose la bonne nuit tout de suite.
  **`#2e2313` ne s'affiche donc plus jamais.** Vu et non contesté ; à rouvrir
  d'un mot.
- L'écran d'attente **ne suit pas `--fond`** mais `--nuit-attente`, que
  personne d'autre n'écrit : la scène réécrit `--fond` à chaque image pendant
  son fondu d'ouverture, et l'écran y changeait de couleur en plein chargement.

## Laissé au constructeur

- Les 2,2 s du peuplement et la courbe 1.7.
- Le pas de 60 ms entre deux réveils.

## Connu, non corrigé

Dans la scène, le voile du pied éteint les grains près des rails ; sur l'écran
d'attente ils sont pleins et s'atténuent pendant les 600 ms du fondu. Signalé,
à corriger seulement si elle le voit.

## Critère d'acceptation

Vu **au premier chargement**, au bureau et au téléphone, avec les trois nuits
de l'œil : le ciel doit se peupler, et ne pas bouger quand l'écran s'efface.
