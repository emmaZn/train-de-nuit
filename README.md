# Train de nuit

Portfolio expérimental d'Emmanuelle Zenou, Front End Web Developer.

Un train roule de nuit, en boucle et toujours dans le même sens, à travers des montagnes de grain. Il s'arrête dans quatre gares. Les visiteurs y laissent une phrase qui devient une étoile.

Le cadrage complet — concept, direction artistique, architecture, étapes — est dans [`docs/CONCEPT.md`](docs/CONCEPT.md). **À lire avant de coder.** En cas de doute sur un choix visuel, on demande plutôt que d'inventer.

## Démarrer

```bash
npm install
npm run dev
```

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | vérification des types (`vue-tsc`) puis build de production |
| `npm test` | Vitest en mode veille |
| `npm run test:run` | Vitest une fois |

## Les assets

Les images sources sont **hors du dépôt**, dans `~/projet_zero/` : 160 PNG de montagnes (554 Mo) et six séquences de train (52 Mo). Le dépôt ne contient que leurs sorties WebP, dans `public/assets/` (≈ 17 Mo), décrites par `public/assets/manifest.json`.

Pour les régénérer :

```bash
python3 tools/build_assets.py --src ~/projet_zero --out public/assets
```

Options : `--mountain-width` (1280), `--train-scale` (0.5), `--quality` (80), `--jobs`, `--base` (`/assets`).

Deux mesures expliquent ce que fait ce script :

- **Les montagnes n'ont aucune couleur.** Tout leur relief est dans le canal alpha, sur un seul gris. On ne stocke donc que l'alpha, en WebP niveaux de gris : 46 Ko par image à 1280 px, contre 190 Ko en RGBA. Un shader refait l'opération inverse à l'affichage.
- **Les six séquences du train partagent le cadre 2320 × 1217 des rails.** Rogner chaque image sur sa propre boîte englobante casserait l'alignement entre images : le rognage utilise la boîte englobante **de la séquence entière**, et le manifeste en note l'origine.

Les chemins du manifeste sont **absolus** (`/assets/…`) : les gares sont servies sur `/ici`, `/plus-loin`, … et un chemin relatif serait résolu contre la route courante.

## L'organisation du code

```
src/
  scene/         TypeScript pur, aucun import de Vue (vérifié par un test)
  stores/        l'état du voyage
  composables/   le seul pont Vue ↔ scène
  components/    la frise, l'œil, les quatre gares
  router/        une route par gare
tools/           le pipeline d'assets, en Python
docs/            le cadrage et les plans d'implémentation
```

La scène ne connaît pas Vue : elle expose des méthodes, émet des événements, et `useScene` fait le pont. Vue tient l'état, les routes et toute la couche HTML.

Une seule règle gouverne les couleurs : **dans tous les assets, le noir devient la couleur du fond.** Le filtre WebGL de `src/scene/recolor.ts` l'applique partout, piloté par l'uniforme `uFond` que l'icône « œil » fait défiler.

## Où en est le projet

L'**étape 1** du §13 de `CONCEPT.md` est faite : squelette, scène, montagnes, voie, train qui démarre, roule, freine et s'arrête, reflet, frise en boucle et quatre routes, trajet toujours vers l'avant.

Restent les étapes 2 à 5 : le ciel des voyageurs et Firebase, les oiseaux de « plus loin », les textes d'« ici » et le poteau d'« ailleurs », puis les finitions.
