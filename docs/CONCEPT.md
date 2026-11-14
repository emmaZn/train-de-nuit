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
- **Une seule touche d'humour** : les oiseaux de « plus loin ». Elle fait contraste avec le reste.
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
- **Routes** : une par gare, pour des liens partageables : `/ici`, `/plus-loin`, `/la-haut`, `/ailleurs`.

## 4. Les gares

Chaque gare tient en un écran et a **un seul élément qui lui est propre**. Le contenu apparaît quand le train est à quai et disparaît en fondu au départ. On ne dessine **pas** de bâtiment de gare.

| Gare | Élément propre | Rôle |
|---|---|---|
| **ici** | rien que le ciel | le départ |
| **plus loin** | câbles électriques + bouvreuils | la récréation, on découvre qui elle est |
| **là-haut** | formulaire + étoile | laisser une trace |
| **ailleurs** | poteau indicateur | la retrouver ailleurs (contact) |

### 4.1 ici

```
Emmanuelle Zenou
Front End Web Developer

Chaque étoile est quelqu'un qui est passé par ici.
```

Le nom et le titre sont en haut à gauche (comme sur la maquette). La phrase apparaît doucement, une seule fois par arrêt.

### 4.2 plus loin — les oiseaux

- Deux poteaux électriques et deux niveaux de fils (asset `cables/cables-scene.svg`, aligné sur un cadre 1280 × 832, pied des poteaux sur les rails, **derrière** la loco).
- Les câbles n'existent **qu'à cette gare** :
  - **à l'approche** : un poteau isolé passe, puis les fils, puis les oiseaux posés dessus ;
  - **au départ** : les oiseaux s'envolent tous ensemble (cycle de vol en 4 images), puis les poteaux sortent de l'écran.
- **Le gag** (façon dessin animé, personne n'est blessé) : on clique sur un oiseau →
  1. le câble vibre, l'oiseau tombe tout droit en se retournant ;
  2. il atterrit sur le dos (`bouvreuil-sonne`), petit nuage de grain, trois petites étoiles tournent au-dessus de sa tête ;
  3. sa réplique apparaît au-dessus de lui (Inter Light 15 px), puis se dissout (~2,8 s, plus pour les longues) ;
  4. il se relève et s'envole en arc vers une place libre du câble, **loin de la souris** ; le câble vibre quand il se pose.
- **Répliques**, dans l'ordre, quel que soit l'oiseau cliqué :
  1. « Je suis dev web front. »
  2. « J'aime la peinture. »
  3. « J'aime photographier les animaux. »
  4. « Et photographier les étoiles. »
  5. « Et je danse. » *(l'oiseau fait une pirouette sur le câble avant de tomber)*
  6. « Et j'essaie de rendre ma mère fière. »
  7. « Aïe. »
  8. « Encore ? »
  9. « Hé ! »
  10. « Vous vous amusez bien ? »
  11. « Je vais le dire au chat. »
  12. « Si vous voulez lui parler, c'est ailleurs. »
  13. « Vous feriez mieux d'aller laisser une phrase, là-haut. »
  14. « … » *(l'oiseau se relève et vous fixe ~2 s avant de repartir)*
  - ensuite, au hasard : « aïe », « encore ? », « pfff », « hé ! »
- Accessibilité : un bouton visible au focus clavier « faire tomber un oiseau » ; les répliques sont annoncées (`aria-live="polite"`).

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

### 4.4 ailleurs — le poteau indicateur

- Asset `ailleurs/panneau-ailleurs.svg` (cadre 1280 × 832, pied sur les rails à droite du train). Trois flèches, texte JetBrains Mono 12 px espacé :
  - `LINKEDIN →` ouvre le profil (nouvel onglet)
  - `← CV` télécharge le CV (PDF)
  - `ÉCRIRE →` affiche au-dessus du poteau le formulaire de message ; la flèche active passe en blanc (fond clair, texte noir)
- **Formulaire de message** (même langage que « là-haut ») : `Un message ?`, adresse mail, message, `fermer` / `envoyer ↵`. Ce message est **privé** (il arrive par mail), contrairement à la phrase de « là-haut » qui est publique.
- Au survol, une flèche oscille légèrement, comme un panneau en bois dans le vent.
- C'est la dernière gare : le prochain arrêt est « ici ».

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
- **L'ordre des plans** : le massif, puis **le ciel** — poussière et étoiles-voyageuses ensemble —, puis le voile du pied, les rails et le train. Le ciel passe donc **devant la montagne** : son grain continue sur le flanc au lieu de s'arrêter net sur la silhouette, qui laissait le massif en masse noire au milieu d'un ciel dense. La poussière couvre tout l'écran **jusqu'à la voie**, et le voile du pied, qui passe devant elle, l'éteint doucement en approchant des rails. Sous la voie il n'y a plus de ciel : le reflet ne renvoie ni la poussière ni les étoiles — il renverrait le même grain une seconde fois, et des sosies d'étoiles qui ne répondent à rien.
- **Montagnes** : nuage de points / grain. **Elles tournent légèrement quand le train avance**, comme un relief vu depuis un train en marche. Le massif n'est plus une séquence d'images mais un rendu calculé dans le navigateur, depuis la carte de relief (voir §12.1) : la rotation est continue et le grain reste net sur tous les écrans. **Elles tournent avec la distance parcourue, pas avec le temps** : le relief démarre et s'arrête donc avec le train, au lieu de tourner à vitesse constante pendant qu'il freine.
- **Train** : version **pleine** (il masque le décor derrière lui), et **son corps prend la couleur du fond**, quelle qu'elle soit. Les séquences sont donc prises avec un corps **noir** — `PTITRAIN_grain_blanc`, c'est-à-dire `PTITRAIN_plein` passée au grain avec le trait laissé à pleine luminosité : c'est le rendu qui remplace ce noir par la couleur du moment. La rame est une locomotive et **deux wagons**, attelés tampons contre tampons. Séquences : rouler, démarrer, s'arrêter. Il ralentit longuement à l'approche d'une gare — le freinage prend près de la moitié de l'étape, deux fois plus que le démarrage — s'arrête, puis repart. Les images des roues y avancent avec la **distance** et non avec le temps : elles ralentissent donc avec le sol au lieu de tourner à plein régime jusqu'à se figer.
- **Reflet** : sous la voie, le décor et le train retournés et atténués.
- **Grain** : partout, la même matière que les montagnes.
- **Mouvements** : lents, comme un souffle. Pas d'à-coups mécaniques — la vitesse du train monte et descend en courbe douce, pas en ligne droite, pour que l'accélération elle-même ne saute pas aux transitions.
- **Typographie** : Inter (Light / Regular) pour les textes, JetBrains Mono pour les petites mentions (frise, compteurs, panneaux).
- **Couleur de fond variable** — règle unique : **dans tous les assets, le noir devient la couleur du fond.** Le train, les poteaux, le poteau indicateur et le corps des oiseaux sont dessinés avec du noir ; au rendu, ce noir est remplacé par la couleur de fond courante.
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
| `PTITRAIN_grain_blanc/` | **séquences retenues** : `PTITRAIN_plein` passée au grain avec `--trait=1,1 --gris=#EDEDED`. Contient aussi `01_rails`, dont le grain vit dans l'alpha : on y aplatit la luminance au même gris. Les deux commandes sont dans le README du dépôt |
| `outils/grain_train.py` | génère la version grain. Sans `--trait`, il assombrit chaque pixel du trait (0,65–0,90) : le train devient gris et s'efface dans la montagne. `--trait=1,1 --gris=#EDEDED` applique la règle du massif |
| `PTITRAIN_grain_vivant/` | version pleine avec grain vivant, corps noir (non retenue ; on y prend seulement `01_rails`, la seule voie disponible) |
| `oiseaux/bouvreuil-*.svg / .png` | 8 poses : `perche`, `perche-vers-la-gauche`, `perche-ebouriffe`, `sonne`, `vol-1-ailes-hautes` → `vol-4-ailes-repliees` (cycle de vol 1→2→3→4). SVG viewBox 120 × 90, pattes à `y = 82` |
| `cables/cables-scene.svg / .png`, `cables/poteau.svg` | poteaux + fils, cadre 1280 × 832 |
| `ailleurs/panneau-ailleurs.svg` | poteau indicateur, cadre 1280 × 832, une flèche = un groupe (`fleche-linkedin`, `fleche-cv`, `fleche-ecrire`) |
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
| Message privé | **Resend** (fonction serverless de l'hébergeur) ou formulaires Netlify |
| Hébergement | **Vercel** ou **Netlify** |

Principe : **la scène ne connaît pas Vue**. Elle expose des méthodes et émet des événements ; un seul composable fait le pont. Vue gère l'état, les routes et toute la couche HTML (frise, textes, formulaires, poteau indicateur, bulles de survol).

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
    Birds.ts                câbles, bouvreuils, chute, envol (gare « plus loin »)
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
    EtoilesListe.vue        la liste des étoiles, masquée visuellement
    gares/
      GareIci.vue
      GarePlusLoin.vue      répliques des oiseaux (HTML), bouton clavier
      GareLaHaut.vue        formulaire « Laisser une trace ? »
      GareAilleurs.vue      poteau indicateur (SVG inline) + formulaire de message
  router/index.ts
  firebase.ts
  App.vue                   <canvas> + couche HTML par-dessus
public/
  assets/                   sprite sheets du train, carte de relief, SVG, CV
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
5. **CV** : fichier PDF à fournir. **LinkedIn** : URL à fournir. **Adresse de réception** des messages à fournir.
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
4. **ici et ailleurs**
   - Textes d'ici ; poteau indicateur, formulaire de message, envoi par mail.
5. **Finitions**
   - Mouvement réduit, mobile, clavier, poids des assets, métadonnées et image de partage.
