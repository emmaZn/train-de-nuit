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

Les sources sont **hors du dépôt**, dans `~/projet_zero/`. Le dépôt ne contient que leurs
sorties, dans `public/assets/`, décrites par `public/assets/manifest.json` : la carte de
relief du massif, et les six séquences WebP du train.

```bash
python3 tools/build_assets.py --src ~/projet_zero --out public/assets \
  --carte montagne_hd/tramage/massif-carte.png \
  --train-src PTITRAIN_grain_blanc --train-scale 0.75
```

Options : `--carte` (aucune), `--train-src` (`PTITRAIN_grain_vivant`), `--train-scale` (0.5),

`--quality` (80), `--jobs`, `--base` (`/assets`), et pour la séquence de montagnes
— qui ne sert plus, voir plus bas — `--mountain-src` (aucune), `--mountain-step`,
`--mountain-width` (1918), `--mountain-lossless`.

`--train-src` peut désigner un dossier sans `01_rails` : la voie est alors prise dans
`PTITRAIN_grain_vivant`, la seule à en contenir une.

Les sources du train ne sont pas livrées telles quelles : `PTITRAIN_grain_blanc` se
fabrique depuis `PTITRAIN_plein`, et la voie depuis la seule qui en contienne une.

```bash
# le train : grain, mais trait laissé à pleine luminosité, au gris du massif
python3 outils/grain_train.py PTITRAIN_plein PTITRAIN_grain_blanc --trait=1,1 --gris=#EDEDED

# la voie : déjà grainée, et son grain est dans l'alpha ; la luminance ne
# portait que l'assombrissement, plafonné à 203. On l'aplatit au même gris.
python3 - <<'FIN'
import numpy as np
from PIL import Image
from pathlib import Path
a = np.array(Image.open('PTITRAIN_grain_vivant/01_rails/rails.png').convert('RGBA'))
a[..., :3] = np.where((a[..., 3] > 0)[..., None], 237, a[..., :3])
Path('PTITRAIN_grain_blanc/01_rails').mkdir(parents=True, exist_ok=True)
Image.fromarray(a).save('PTITRAIN_grain_blanc/01_rails/rails.png', optimize=True)
FIN
```

Sans `--trait`, l'outil assombrit chaque pixel du trait d'un facteur tiré entre 0,65 et
0,90 : le train devient gris et s'efface dans la montagne. Le massif n'allume jamais un
point à mi-teinte, et le train suit la même règle — blanc ou absent.

Trois mesures expliquent ce que fait ce script :

- **Le massif n'est plus une image.** Il était rendu dans Blender en 180 images de
  3840 × 944 (`blender/massif.py`), et même cette largeur-là était agrandie d'environ 1,4×
  sur un écran Retina — c'est ce qui le rendait brouillon. Il est maintenant calculé dans le
  navigateur (`src/scene/Massif.ts`), à la résolution réelle de l'écran, et tourne en continu
  au lieu d'avancer de 3,8 images par seconde.

  Pour régénérer malgré tout la séquence et comparer, ajouter :
  `--mountain-src montagne_hd/tramage/webp --mountain-width 3840 --mountain-lossless`.
- **`--carte` publie la carte de relief**, qui est tout ce dont le massif a besoin : c'est
  une grille déplacée par cette carte, pas un maillage sculpté. Un PNG 16 bits est ramené à
  8 bits par le navigateur, soit 256 niveaux au lieu de 65 536, et un relief lisse se
  couvrirait de marches ; la hauteur voyage donc sur deux canaux, l'octet fort dans le rouge
  et le faible dans le vert.
- **Les six séquences du train partagent le cadre 2320 × 1217 des rails.** Rogner chaque
  image sur sa propre boîte englobante casserait l'alignement entre images : le rognage
  utilise la boîte englobante **de la séquence entière**, et le manifeste en note l'origine.
- **`--train-scale 0.75` n'est pas un confort.** Le train est dessiné à `ECHELLE_TRAIN` du
  cadre, lui-même mis à l'échelle de l'écran : à 0.5, il était agrandi 1,68× sur un iPhone
  et 1,89× sur un 27 pouces 5K — le défaut même qui rendait le massif brouillon, invisible
  sur un MacBook où il tombe à 1,09×. À 0.75 le facteur ne dépasse plus 1,26×.

  Le prix est en poids, et le grain l'aggrave parce que le bruit ne compresse pas : les
  séquences du train passent de 9,8 à 15 Mo. C'est la tension propre à un grain **cuit** —
  le massif y échappe en se recalculant à la résolution de l'écran.

Les chemins du manifeste sont **absolus** (`/assets/…`) : les gares sont servies sur `/ici`,
`/plus-loin`, … et un chemin relatif serait résolu contre la route courante.

## Le massif

`src/scene/Massif.ts` est le portage en GLSL du rendu Blender : même grille 14 × 14 déplacée
de 3,1, même caméra orthographique presque à l'horizontale, même chaîne d'ombrage, et le
même « holdout » — un point éteint reste opaque pour la profondeur, ce qui fait qu'une crête
proche cache celles du fond.

Ce que le script Blender ne disait pas, parce que les options du rendu n'ont été notées
nulle part, a été retrouvé en comparant la densité de points avec la séquence, par blocs de
32 px : échelle 2/3, soleil `(-1, -0.5, 0.35)`, ombre 0.45, contraste 2.2. Le signe du
soleil est le réglage à ne pas perdre — l'inverser fait tomber la ressemblance de 0.76 à
0.18. Les tests figent ce qui peut se vérifier sans GPU.

`src/scene/Relief.ts` est le pont : Three calcule dans son propre canvas, Pixi le consomme
comme une texture ordinaire. C'est ce qui permet au reflet de le refléter, au filtre de
recoloration de le recolorer et à la poussière d'étoiles de rester derrière, sans rien
changer d'autre. Le canvas ne couvre que la partie visible du cadre, arrêtée à la voie :
couvrir tout le cadre demanderait plus de 4000 px de large sur un téléphone en portrait.

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

L'**étape 2** l'est aussi : le ciel des voyageurs et « là-haut ». Une phrase se défait en grains, un seul monte jusqu'à sa place et s'allume ; chaque étoile se lit au survol, à l'appui du doigt ou au clavier ; et le ciel, borné à 120 étoiles sur un bureau et 50 sur un téléphone, se lit en une seule requête Firestore.

Restent les étapes 3 à 5 : les oiseaux de « plus loin », les textes d'« ici » et le poteau d'« ailleurs », puis les finitions.

### Lancer le ciel en local

Le ciel parle à Firestore, mais jamais à la production pendant le développement : l'émulateur suffit.

```bash
npm run emulators    # l'émulateur Firestore
npm run seed         # sème 200 traces approuvées, pour juger du ciel plein
npm run test:rules   # les règles de sécurité, contre l'émulateur
```

L'émulateur est un programme Java : il faut **Java 21 ou plus** (la CLI Firebase v15 a retiré les versions antérieures). `mise.toml` l'épingle, comme Node : `mise install` suffit. Le projet s'appelle `demo-train-de-nuit`, et le préfixe `demo-` rend la production **inatteignable par construction** : ni le script de semis ni l'émulateur ne peuvent y écrire, quoi qu'on oublie de configurer.

### Passer au vrai projet

Le projet existe : **`train-de-nuit`**, créé le 14 novembre 2026, base Firestore en mode
natif. L'index composite et les règles y sont déjà déposés. Ce qui suit raconte comment on
y parle, et surtout où ça coince.

**La bascule tient à une seule variable.** `src/firebase.ts` ne regarde que
`VITE_FIREBASE_PROJECT_ID` : tant qu'elle est absente, l'application se connecte à
l'émulateur sous `demo-train-de-nuit` ; dès qu'elle porte un vrai identifiant, `npm run dev`
lui-même parle à la production. `.env.local` garde les cinq valeurs du projet, **commentées**,
précisément pour que ce basculement soit un geste conscient et non un oubli. Le fichier est
hors de git par la règle `*.local` ; `.env.example` en donne la liste.

**Le projet par défaut reste la démo.** `.firebaserc` déclare `demo-train-de-nuit` en
`default` et `train-de-nuit` sous l'alias `prod`. Ne pas faire `firebase use --add`, qui
ferait du vrai projet le défaut : `npm run emulators` lit ce même défaut, et l'émulateur
cesserait alors de tourner sous un identifiant `demo-`, qui est ce qui rend la production
inatteignable par construction. Pour déposer, on nomme la cible :

```bash
npx firebase deploy --only firestore:indexes --project prod
npx firebase deploy --only firestore:rules   --project prod
```

L'index n'est pas une précaution : la lecture du ciel croise `approuvee` et `creeLe`, ce que
l'émulateur accepte sans index et que la production refuse. Sans lui, le ciel marche en local
et reste noir en vrai.

**L'ordre compte.** Une base Firestore neuve en mode production refuse tout. Nos règles, elles,
ouvrent la création à n'importe quel visiteur — c'est leur rôle. Entre le dépôt des règles et
l'armement d'App Check, il existe donc une fenêtre où la collection est publiquement
inscriptible. On arme App Check **d'abord**, on dépose les règles **ensuite** : la base passe
de « fermée » à « ouverte et protégée » sans jamais traverser « ouverte à n'importe quel
script ».

#### App Check : le piège de la clé

La console ne propose plus le reCAPTCHA v3 classique — le champ est grisé et un bandeau
renvoie vers **Fraud Defense**, le nouveau nom de reCAPTCHA Enterprise. `src/firebase.ts`
utilise donc `ReCaptchaEnterpriseProvider`, et il n'y a pas d'autre chemin.

**La clé doit être créée depuis la page reCAPTCHA du projet lui-même**, c'est-à-dire
`console.cloud.google.com/security/recaptcha?project=train-de-nuit`. Une clé créée ailleurs —
depuis une autre page, un autre projet — fait échouer l'échange du jeton avec :

```
400 FAILED_PRECONDITION
Unable to call the reCAPTCHA Enterprise CreateAssessment method; ensure that the
reCAPTCHA Enterprise API is enabled and that the site key is from the same project
as the one containing this app.
```

Ce message coûte du temps, parce qu'il nomme **deux** causes et que la première est la plus
visible. On active l'API, on recommence, rien ne change ; on soupçonne la facturation, le
plan Blaze, le domaine `localhost`. C'était la seconde cause : la clé venait d'ailleurs.
Recréée depuis la page du projet, l'erreur devient aussitôt `403 App attestation failed` sur
un faux jeton — c'est-à-dire la bonne réponse, Firebase appelant enfin reCAPTCHA pour de bon.
**Aucun compte de facturation n'a été nécessaire : le projet est resté sur Spark.**

Un repère utile pour la prochaine fois : `400 FAILED_PRECONDITION` veut dire que Firebase n'a
même pas pu interroger reCAPTCHA, donc que le problème est la clé ou l'API ; `403 App
attestation failed` veut dire que la chaîne fonctionne et que c'est le jeton qui est refusé.

**Vérifié le 14 novembre 2026** par une écriture réelle depuis `localhost`, application des
règles armée sur Cloud Firestore : la phrase est arrivée dans la base avec `approuvee: false`.

L'onglet **API** de la page App Check est celui qui compte. Enregistrer l'application ne fait
que produire des jetons ; tant que l'application des règles n'y est pas armée pour Cloud
Firestore, personne ne les vérifie. Le mode non appliqué sert d'observation : les jetons sont
comptés, rien n'est refusé.

Dernier point, pour l'étape 5 : la clé a la **validation de domaine désactivée**, ce qui
autorise n'importe quel site à s'en servir. C'était commode pour travailler depuis
`localhost`. Le jour du déploiement, réactiver la validation et n'y lister que le vrai
domaine.
