# Train de nuit — concept et cadrage technique

> Portfolio expérimental d'Emmanuelle Zenou, Front End Web Developer.
> Ce fichier est la référence du projet : concept, contenu, direction artistique, architecture, étapes.
> À lire en entier avant de coder. En cas de doute sur un choix visuel, on demande plutôt que d'inventer.

---

## 1. En une phrase

Un train roule de nuit, en boucle et toujours dans le même sens, à travers des montagnes de grain. Il s'arrête dans quatre gares. Les visiteurs y laissent une phrase qui devient une étoile : le ciel est fait de tous ceux qui sont passés par ici.

## 2. Intentions

- **Poétique et mystérieux** : peu de mots, rien n'est expliqué, on découvre en voyant.
- **Pas d'égotrip** : le site parle très peu d'Emmanuelle. Le cœur, ce sont les voyageurs.
- **Une seule touche d'humour** : les oiseaux de « plus loin ». Elle fait contraste avec le reste.
- **Show-off** : la qualité des mouvements, du grain et des transitions *est* la vitrine.
- **Une seule matière** : nuit, grain, traits fins. Tout ce qui apparaît ou disparaît le fait par **dissolution** (grain qui se défait ou se condense).

Figma : https://www.figma.com/design/KY1E98tguDk9Rn0cD76Il4/Train-de-nuit-2026 

## 3. La navigation : une boucle à sens unique

```
ici  →  plus loin  →  là-haut  →  ailleurs  →  (ici …)
```

- Le train ne recule **jamais**. Pour aller à une gare « derrière », il fait le tour de la boucle vers l'avant (y compris avec le bouton retour du navigateur).
- **La frise** (en haut de l'écran) défile : la gare où l'on est reste toujours au même endroit. À chaque arrivée, toutes les gares glissent d'un cran vers la gauche. Celles qui sortent à gauche s'estompent, celles qui entrent à droite apparaissent en fondu.
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

Chaque gare tient en un écran et a **un seul élément qui lui est propre**. Le contenu apparaît quand le train est à quai et disparaît en fondu au départ.

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
  - ligne méta en mono 10,5 px : compteur `0 / 80` à gauche, `laisser ↵` à droite (Entrée suffit)
- **Animation à l'envoi** (~5 s) :
  1. le formulaire s'efface ;
  2. la phrase se défait **de gauche à droite** en grains qui se resserrent vers le centre du texte en s'éteignant ;
  3. **un seul grain** (avec un petit halo et une traîne) monte en courbe vers une place libre du ciel (~2,5 s) ;
  4. l'étoile s'allume avec un éclat (halo qui grossit puis se pose) : c'est la plus brillante du ciel ;
  5. le formulaire revient vide.
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
- Chaque phrase approuvée = une étoile. Les plus récentes brillent plus
- **Survol** : la phrase apparaît doucement à côté de l'étoile (Inter Light 14 px), puis une ligne mono 10 px : prénom (si donné). Elle s'efface quand on s'éloigne.
- Les étoiles très anciennes se fondent dans la poussière d'étoiles du fond.
- - Léger parallax
- Position d'une nouvelle étoile : une place libre (la plus éloignée des autres parmi ~40 tirages), dans la moitié haute du ciel, hors de la frise.
- Au lancement, le ciel est presque vide : les premiers visiteurs allument les premières étoiles.

## 6. Décor et mouvements

- **Fond** : nuit encre, `#151517` par défaut, avec une poussière d'étoiles. **La couleur de fond change** avec l'icône « œil » en haut à droite (voir « Couleur de fond variable » ci-dessous).
- **Montagnes** : nuage de points / grain. **Elles tournent légèrement quand le train avance**, comme un relief vu depuis un train en marche.
- **Train** : version **pleine** (il masque le décor derrière lui), et **son corps prend la couleur du fond**, quelle qu'elle soit. Les séquences restent donc générées avec un corps **noir** (`python3 outils/grain_train.py PTITRAIN_plein PTITRAIN_grain`, sans `--fond` ; `--vivant` pour un grain qui change à chaque image) : c'est le rendu qui remplace ce noir par la couleur du moment. Séquences : rouler, démarrer, s'arrêter. Il ralentit longuement à l'approche d'une gare, s'arrête, puis repart.
- **Reflet** : sous la voie, le décor et le train retournés et atténués.
- **Grain** : partout, la même matière que les montagnes.
- **Mouvements** : lents, comme un souffle. Pas d'à-coups mécaniques.
- **Typographie** : Inter (Light / Regular) pour les textes, JetBrains Mono pour les petites mentions (frise, compteurs, panneaux).
- **Couleur de fond variable** — règle unique : **dans tous les assets, le noir devient la couleur du fond.** Le train, les poteaux, le poteau indicateur, le corps des oiseaux (et la séquence des montagnes si elle est rendue sur fond noir) sont dessinés avec du noir ; au rendu, ce noir est remplacé par la couleur de fond courante.
  - En shader (PixiJS / Three.js) : `rgb = mix(uFond, texel.rgb, luminance(texel.rgb))`, alpha inchangé. Le noir devient le fond, le blanc reste blanc, les gris se mélangent.
  - En canvas 2D : sur un canvas hors écran, dessiner l'image, puis `globalCompositeOperation = 'lighten'` et remplir avec la couleur de fond, puis `'destination-in'` et redessiner l'image pour garder sa forme. Mettre en cache le résultat, recalculé seulement quand la couleur change.
  - La couleur est une seule variable (`--fond` côté CSS, `uFond` côté scène), animée en douceur (GSAP, ~1 s) quand on clique sur l'œil.
  - `--fond=#RRGGBB` dans `grain_train.py` ne sert que pour des exports statiques (Figma, image de partage).
- **L'icône « œil »** (en haut à droite, simple trait clair, sans fond de bouton) : chaque clic passe à la couleur suivante du cycle, en fondu (~1 s). Le choix est mémorisé pour la visite suivante (`localStorage`, avec repli silencieux s'il est indisponible). C'est un `<button>` avec `aria-label="Changer la couleur de la nuit"`. Palette proposée, à valider (toutes sombres, contraste > 12:1 avec le texte `#ececf0`) :

  | Nom | Couleur |
  |---|---|
  | vieille photo (par défaut) | `#2E2313` |
  | bleu nuit | `#141B2B` |
  | encre | `#151517` |
  | sapin | `#13241D` |
  | prune | `#261725` |

- **Couleurs** : fond `#2E2313` par défaut ; blanc légèrement grisé `#ececf0` pour le texte, opacités pour la hiérarchie (0.95 / 0.6 / 0.42 / 0.2), traits `#e6e6ea`, corps noirs `#0b0b0c`.

## 7. Assets disponibles

Tous dans `~/projet_zero/` (à copier ou convertir dans le dépôt, voir §10) :

| Dossier / fichier | Contenu |
|---|---|
| `montagne/0001.png … 0160.png` | **séquence de 160 images** des montagnes (~3,6 Mo chacune) |
| `PTITRAIN_blanc/` | traits blancs seuls, sans fond (non retenue) |
| `PTITRAIN_plein/` | **séquences du train retenues**, version pleine, corps noir (à passer au grain, sans `--fond`) : `01_rails`, `02_locomotive`, `03_wagon`, `04_start_locomotive`, `05_start_wagon`, `06_stop_locomotive`, `07_stop_wagon` |
| `PTITRAIN_grain_vivant/` | version pleine avec grain vivant, corps noir (utilisable telle quelle) |
| `outils/grain_train.py` | génère la version grain. Options : `--fond=#RRGGBB` (couleur du corps), `--vivant`. Gère aussi la version sans fond. Réglages en tête de fichier |
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
| Hébergement | **Vercel** ou **Netlify** |

Principe : **la scène ne connaît pas Vue**. Elle expose des méthodes et émet des événements ; un seul composable fait le pont. Vue gère l'état, les routes et toute la couche HTML (frise, textes, formulaires, poteau indicateur, bulles de survol).

## 9. Architecture

```
src/
  scene/                    ← TypeScript pur, aucun import de Vue
    Scene.ts                canvas, boucle de rendu, redimensionnement, grain global
    Mountains.ts            montagnes + rotation liée à la progression du train
    Sky.ts                  poussière d'étoiles + étoiles-voyageurs, éclat, survol
    Train.ts                sprite sheets (rouler / démarrer / s'arrêter) + reflet
    Birds.ts                câbles, bouvreuils, chute, envol (gare « plus loin »)
    Dissolve.ts             phrase → grains → un grain qui monte → étoile
    events.ts               petit émetteur d'événements typé
  stores/
    voyage.ts               gare actuelle, cible, progression, enRoute / aQuai
    traces.ts               phrases du ciel (lecture Firestore, ajout)
  composables/
    useScene.ts             le pont Vue ↔ scène
  components/
    NavFrise.vue            la frise en boucle
    StarTooltip.vue         la phrase au survol d'une étoile
    gares/
      GareIci.vue
      GarePlusLoin.vue      répliques des oiseaux (HTML), bouton clavier
      GareLaHaut.vue        formulaire « Laisser une trace ? »
      GareAilleurs.vue      poteau indicateur (SVG inline) + formulaire de message
  router/index.ts
  firebase.ts
  App.vue                   <canvas> + couche HTML par-dessus
public/
  assets/                   sprite sheets, séquence des montagnes, SVG, CV
```

Contrat de la scène (indicatif) :

```ts
class Scene {
  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean })
  travelTo(gare: Gare): Promise<void>      // départ, trajet, arrivée (timeline GSAP)
  setStars(traces: Trace[]): void
  addStar(trace: Trace, from: DOMRect): Promise<void>   // l'animation de dissolution
  on(evt: 'starHover', cb: (t: Trace | null, x: number, y: number) => void): void
  on(evt: 'birdFell', cb: (x: number, y: number) => void): void
  on(evt: 'progress', cb: (p: number) => void): void    // pour la frise
  dispose(): void
}
type Gare = 'ici' | 'plus-loin' | 'la-haut' | 'ailleurs'
```

Store du voyage :

```ts
{ gare: Gare, cible: Gare | null, enRoute: boolean, progression: number /* 0→1 */ }
```

## 10. Données (Firestore)

Collection `traces` :

```ts
{
  phrase: string      // 1 à 80 caractères
  prenom?: string     // 0 à 24 caractères
  creeLe: Timestamp   // serverTimestamp()
  approuvee: boolean  // false à la création ; Emmanuelle valide depuis la console
}
```

Règles (à affiner) :

```
match /traces/{id} {
  allow read: if resource.data.approuvee == true;
  allow create: if request.resource.data.approuvee == false
                && request.resource.data.phrase is string
                && request.resource.data.phrase.size() > 0
                && request.resource.data.phrase.size() <= 80
                && (!('prenom' in request.resource.data) || request.resource.data.prenom.size() <= 24)
                && request.resource.data.creeLe == request.time;
  allow update, delete: if false;
}
```

- **App Check** activé sur Firestore (reCAPTCHA) contre le spam.
- Modération : à la main dans la console au début. Option plus tard : notification par mail à chaque nouvelle phrase (nécessite le plan Blaze).
- Le visiteur voit **sa** nouvelle étoile tout de suite (côté client), même avant validation ; les autres la verront une fois approuvée.

## 11. Contraintes transverses

- **Mouvement réduit** (`prefers-reduced-motion`) : train à l'arrêt, gares en fondu, pas de dissolution (l'étoile apparaît simplement), pas de scintillement.
- **Mobile** : moins de particules, scène recadrée, frise réduite (gare actuelle + prochaine), formulaires pleine largeur avec une marge de 16 px.
- **Clavier** : la frise est une vraie navigation (`<nav>` + liens) ; focus visibles ; les étoiles récentes sont accessibles via une liste masquée visuellement.
- **Poids** : les séquences PNG sont trop lourdes en l'état (montagnes ~580 Mo). À convertir (voir §12) et à charger progressivement : la gare actuelle d'abord.
- **Textes** de l'interface en français ; code, noms de fichiers et commentaires techniques en anglais.

## 12. Décisions ouvertes

1. **Les montagnes : séquence existante ou 3D ?**
   - *A (recommandé pour commencer)* : utiliser la séquence `montagne/` (160 images), convertie en WebP/AVIF ~1600 px (quelques centaines de Ko par image), et choisir l'image affichée selon la progression du train. Rendu fidèle aux rendus actuels, aucun travail 3D.
   - *B* : reconstruire les montagnes en nuage de points avec **Three.js**, pour une vraie rotation continue et un grain en shader. Plus libre, mais plus de travail pour retrouver le rendu.
   - Conséquence sur le moteur : avec *A*, un **canvas 2D** ou **PixiJS** suffit ; **Three.js** n'est nécessaire qu'avec *B*.
2. ~~Le train~~ : **décidé** — version pleine avec grain, corps recoloré au rendu avec la couleur de fond. grain vivant.
3. ~~L'icône « œil »~~ : **décidé** — elle fait défiler un **cycle de couleurs de fond**, et rien d'autre. 
4. **CV** : fichier PDF à fournir. **LinkedIn** : URL à fournir. **Adresse de réception** des messages à fournir.
5. **Hébergeur** : Vercel ou Netlify.

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
