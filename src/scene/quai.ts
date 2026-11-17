/**
 * La géométrie du quai de « ailleurs ».
 *
 * Pendant de `cables.ts` : des nombres et des fonctions pures, rien ne dessine.
 * La composition vient du §5.4 de la spec (maquette du 15 novembre) : loco à
 * gauche, réverbère vers le centre, banc et valise, bâtiment à droite, panneau
 * en bas à droite par-dessus le mur. Le bâtiment n'est plus un mur mais la
 * gare entière dessinée par la propriétaire, marquise de quai comprise : celle-
 * ci part vers la gauche et passe **au-dessus** du banc et du réverbère, qui
 * se tiennent devant elle.
 *
 * La rame est opaque et s'arrête le nez à `TETE_LOCO × STAGE.width`, en
 * s'allongeant vers l'arrière : elle occupe toute la moitié gauche du cadre.
 * La gare avait d'abord été posée tout entière à droite de son nez ; la
 * propriétaire l'a décalée vers la gauche (`DECALAGE_GARE`) en acceptant que le
 * réverbère, voire le banc, passent derrière la rame à l'arrêt. C'est voulu.
 * Le faisceau du réverbère déborde sur le massif : il se construit à partir de
 * `x`, `pied` et `hauteur`.
 *
 * Convention : `x` est le centre de la pièce, sauf pour le bâtiment et le
 * panneau, où c'est le bord gauche. `pied` est le `y` du sol de la pièce.
 */
import { HORIZON } from './layout'

/**
 * Le cadre de chaque dessin, en pixels de cadre à l'échelle 1.
 *
 * Une pièce posée à un autre rapport que son dessin l'**étire** — la porte
 * cintrée devient un ovale, l'horloge une ellipse. Ces cadres sont donc la
 * source du rapport, et `quai.test.ts` les confronte aux fichiers servis :
 * au `viewBox` pour le banc et la valise, qui sont des SVG, aux dimensions de
 * l'image pour le bâtiment et le réverbère, qui sont des PNG déjà grainés
 * (`IMAGES`).
 *
 * Les deux cadres d'image ne valent **pas** les dimensions de leur fichier :
 * ils restent à l'échelle du cadre, parce que c'est en unités de cadre que se
 * lisent la lueur de la lanterne (`LUEUR.rayon`) et le sommet du faisceau.
 * Seul leur rapport doit suivre l'image.
 */
export const CADRES = {
  reverbere: { largeur: 80, hauteur: 560 },
  banc: { largeur: 280, hauteur: 140 },
  valise: { largeur: 96, hauteur: 80 },
  batiment: { largeur: 1316, hauteur: 500 },
} as const

/**
 * La taille des deux images servies, en pixels de leur fichier.
 *
 * Elles ne servent qu'à une chose : vérifier que le cadre ci-dessus est au
 * rapport de l'image, et convertir les repères relevés **sur le dessin** (la
 * porte, le trou d'horloge) en pixels de cadre. `quai.test.ts` les relit dans
 * les en-têtes PNG.
 */
export const IMAGES = {
  batiment: { largeur: 1745, hauteur: 663 },
  reverbere: { largeur: 108, hauteur: 756 },
} as const

/**
 * De combien toute la gare est décalée vers la gauche, en pixels de cadre.
 *
 * **Le seul nombre à changer** pour la déplacer : réverbère, banc, valise,
 * bâtiment, panneau et bordure (celle-ci suit `DEBUT_GARE` / `FIN_GARE`) en
 * dérivent tous, du même déplacement, donc la composition interne ne bouge pas.
 * Les abscisses de `PIECES` sont écrites à la place d'origine (gare entière à
 * droite du nez de la loco), moins ce décalage.
 *
 * **La borne** : toute la gare doit tenir dans `bandeCommuneGare()` (layout.ts)
 * moins `MARGE_GARE` de chaque côté. Le cadre de 2320 est rogné par la
 * fenêtre — de 192 à 2128 à 1432×900, de 349 à 1971 en 4:3 — et la bande que
 * tous les formats de `FORMATS_GARE` voient va de 349 à 1971. La gare (de
 * `DEBUT_GARE` à `FIN_GARE`) en fait 1386 : elle y entre avec 236 px de
 * jeu au total. `quai.test.ts` le vérifie : déplacer la gare au-delà casse un
 * test, pas seulement l'œil. Le décalage ne se règle donc plus à vue en
 * dehors de cette borne ; en deçà, la rame cache de la gare à l'arrêt, permis.
 *
 * 60 (réglage 1) laissait le panneau sortir à droite du champ : 360 ancre la
 * fin de la gare à 1930, marge de 40 sous le bord de la bande.
 */
export const DECALAGE_GARE = 360

/**
 * La largeur du bâtiment, en pixels de cadre — à l'échelle 1 de son dessin
 * (`CADRES.batiment`). Il s'**étire vers la gauche** : son bord droit reste là
 * où il était, et le mur passe derrière le banc, la valise et le réverbère,
 * qui se tiennent devant lui comme sur un vrai quai. Un second réglage,
 * indépendant de `DECALAGE_GARE`. Le changer demande de refaire le dessin : le
 * test des rapports le rappelle.
 *
 * **Passée de 1040 à 1316 avec le nouveau dessin, et ce n'est pas un réglage
 * de goût.** Le dessin de la propriétaire n'est pas un mur : c'est une gare
 * entière, avec une marquise de quai qui part vers la gauche. Son rapport est
 * de 0,380 (663 / 1745) là où l'ancien était de 0,481. On a gardé la
 * **hauteur** — 500 px, la présence du bâtiment dans le cadre et la place de
 * l'horloge dans la bande des étoiles —, donc la largeur suit le rapport. La
 * tenir à 1040 aurait rabaissé la gare à 395 px de haut.
 */
export const LARGEUR_BATIMENT = 1316

/** Le bord droit du bâtiment avant décalage : fixe, c'est lui qui ancre le mur. */
const BORD_DROIT_BATIMENT = 2220

export const PIECES = {
  // 490 = 560 × 0,875 : réduit de 12,5 % (réglage 4). `hauteur` est la hauteur
  // **posée** ; le dessin reste mesuré dans `CADRES.reverbere`, et lanterne,
  // lueur et sommet du faisceau en suivent l'échelle (`hauteur / CADRES…`).
  reverbere: { x: 1290 - DECALAGE_GARE, pied: HORIZON, hauteur: 490 },
  // Banc et valise se tiennent **devant** le mur (le bâtiment passe derrière
  // eux, comme derrière le réverbère). La valise ne cache plus le pied de la
  // porte : celle-ci est au milieu du **corps de gare**, pas du cadre, depuis
  // que la marquise occupe le tiers gauche du dessin.
  banc: { x: 1480 - DECALAGE_GARE, pied: HORIZON, largeur: 280 },
  valise: { x: 1672 - DECALAGE_GARE, pied: HORIZON, largeur: 96 },
  batiment: {
    x: BORD_DROIT_BATIMENT - LARGEUR_BATIMENT - DECALAGE_GARE,
    pied: HORIZON,
    largeur: LARGEUR_BATIMENT,
    hauteur: 500,
  },
  // En bas à droite, **sur deux pieds** qui descendent jusqu'au rail
  // (`tracerCadrePanneau`), débordant à droite du mur jusque vers le bord du
  // cadre. La porte reste à sa gauche : il ne la recouvre pas.
  panneau: { x: 1950 - DECALAGE_GARE, y: 640, largeur: 340, hauteur: 250 },
  quai: { y: HORIZON - 24, epaisseur: 24 },
} as const

/** Pixels de l'image du bâtiment → pixels de cadre. */
const ECHELLE_BATIMENT = PIECES.batiment.largeur / IMAGES.batiment.largeur

/** Le haut du bâtiment, d'où se comptent les `y` de son dessin. */
const SOMMET_BATIMENT = PIECES.batiment.pied - PIECES.batiment.hauteur

/**
 * La porte cintrée, en pixels de l'image — **relevée sur le dessin**, à tenir
 * à jour avec lui. C'est ce qui permet de vérifier que le panneau ne la
 * recouvre pas sans avoir à rasteriser quoi que ce soit.
 *
 * Elle n'est plus au milieu de la pièce : la marquise de quai occupe tout le
 * tiers gauche de l'image, et la porte est au milieu du **corps de gare**, pas
 * du cadre. Elle est en revanche exactement sous l'horloge, et c'est ce que le
 * test affirme désormais.
 */
export const PORTE_IMAGE = { x0: 1097, x1: 1283 } as const

/**
 * Le trou d'horloge du pignon, en pixels de l'image du bâtiment.
 *
 * Mesuré sur le cadran que le dessin portait, et que `preparer_ailleurs.py`
 * efface : c'est le dessinateur qui a choisi la place, la scène vient s'y
 * poser. Le rayon est celui du cercle extérieur du cadran.
 */
export const HORLOGE_IMAGE = { x: 1188, y: 221, rayon: 38 } as const

/** La porte cintrée, en pixels de cadre. */
export const PORTE = {
  x0: PIECES.batiment.x + PORTE_IMAGE.x0 * ECHELLE_BATIMENT,
  x1: PIECES.batiment.x + PORTE_IMAGE.x1 * ECHELLE_BATIMENT,
} as const

/**
 * L'horloge du bâtiment, en pixels de cadre.
 *
 * **Elle n'est pas dans le dessin** : cadran, halo et aiguilles se tracent au
 * rendu (`QuaiLayer.ts`), dans la racine allumée — c'est une des lumières de la
 * gare, et l'image du bâtiment s'éteint. Le dessin n'en garde que la place.
 *
 * Le dessin de la propriétaire, lui, en portait une, aiguilles figées. Elle
 * est effacée à la fabrication de l'asset et **c'est la nôtre qui vient se
 * poser dans son trou** (`HORLOGE_IMAGE`) : la gare a une place d'horloge
 * choisie par le dessinateur, c'est elle qui a raison.
 */
export const HORLOGE = {
  x: PIECES.batiment.x + HORLOGE_IMAGE.x * ECHELLE_BATIMENT,
  y: SOMMET_BATIMENT + HORLOGE_IMAGE.y * ECHELLE_BATIMENT,
  rayon: HORLOGE_IMAGE.rayon * ECHELLE_BATIMENT,
} as const

/** Demi-largeur de l'embase du réverbère, pour que la gare ait un bord gauche. */
const DEMI_EMBASE = CADRES.reverbere.largeur / 2

const bords = [
  PIECES.reverbere.x - DEMI_EMBASE,
  PIECES.banc.x - PIECES.banc.largeur / 2,
  PIECES.valise.x - PIECES.valise.largeur / 2,
  PIECES.batiment.x,
  PIECES.panneau.x,
]
const fins = [
  PIECES.reverbere.x + DEMI_EMBASE,
  PIECES.banc.x + PIECES.banc.largeur / 2,
  PIECES.valise.x + PIECES.valise.largeur / 2,
  PIECES.batiment.x + PIECES.batiment.largeur,
  // Le panneau dépasse le mur : sans lui l'emprise serait sous-estimée, et la
  // gare serait réputée sortie du champ alors qu'on en voit encore le coin.
  PIECES.panneau.x + PIECES.panneau.largeur,
]

/** Le bord gauche de la gare, en pixels de cadre, à l'arrêt. */
export const DEBUT_GARE: number = Math.min(...bords)

/** Le bord droit de la gare, en pixels de cadre, à l'arrêt. */
export const FIN_GARE: number = Math.max(...fins)

/** Largeur totale occupée par la gare, en pixels de cadre. */
export const LARGEUR_GARE: number = FIN_GARE - DEBUT_GARE
