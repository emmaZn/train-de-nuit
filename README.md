# Train de nuit

Portfolio expérimental d'Emmanuelle Zenou, Front End Web Developer.

Un train roule de nuit, en boucle et toujours dans le même sens, à travers des montagnes de grain. Il s'arrête dans quatre gares. Les visiteurs y laissent une phrase qui devient une étoile.

Le cadrage complet — concept, direction artistique, architecture, étapes — est dans [`docs/CONCEPT.md`](docs/CONCEPT.md). **À lire avant de coder.** En cas de doute sur un choix visuel, on demande plutôt que d'inventer.

## Démarrer

Le projet tourne sur **Node 24**. La version est épinglée dans `mise.toml` : avec [mise](https://mise.jdx.dev), entrer dans le dossier suffit, et `mise install` la pose si elle manque. Sans mise, `package.json` déclare l'exigence dans `engines`.

Node 24 n'est pas un caprice : c'est la seule ligne que toutes les dépendances acceptent. Vitest 5 exclut Node 25, jsdom 29 exclut Node 20.

```bash
mise install    # si besoin
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

Les images sources sont **hors du dépôt**, dans `~/projet_zero/` : 160 PNG de montagnes (554 Mo) et six séquences de train (52 Mo). Le dépôt ne contient que leurs sorties WebP, dans `public/assets/` (≈ 20 Mo), décrites par `public/assets/manifest.json`.

Pour les régénérer :

```bash
python3 tools/build_assets.py --src ~/projet_zero --out public/assets
```

Options : `--mountain-width` (1600), `--train-scale` (0.5), `--quality` (80), `--jobs`, `--base` (`/assets`).

Deux mesures expliquent ce que fait ce script :

- **Les montagnes n'ont aucune couleur.** Tout leur relief est dans le canal alpha, sur un seul gris. On ne stocke donc que l'alpha, en WebP niveaux de gris : 75 Ko par image à 1600 px, contre 190 Ko en RGBA à la même largeur. Un shader refait l'opération inverse à l'affichage.

  La source ne fait que 1918 px de large, alors que le massif s'affiche sur plus de 3500 px sur un écran Retina : il reste donc un étirement d'environ 1,9×. Le seul vrai remède serait de re-rendre la séquence source plus grande.
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
