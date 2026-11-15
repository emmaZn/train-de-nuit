/**
 * La géométrie du quai de « ailleurs ».
 *
 * Pendant de `cables.ts` : des nombres et des fonctions pures, rien ne dessine.
 * La composition vient du §5.4 de la spec (maquette du 15 novembre) : loco à
 * gauche, réverbère vers le centre, banc et valise, bâtiment à droite, panneau
 * en bas à droite par-dessus le mur.
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
 * Le cadre de chaque dessin, tel que le `viewBox` de son SVG le porte.
 *
 * `fabriquerPiece` rasterise dans une boîte calculée depuis un ratio : une
 * pièce posée à un autre ratio que son dessin l'**étire**. Ces cadres sont donc
 * la source du ratio, et `quai.test.ts` les relit dans les fichiers.
 *
 * Tous sont à l'échelle 1 : un pixel de cadre vaut une unité de SVG.
 */
export const CADRES = {
  reverbere: { largeur: 80, hauteur: 560 },
  banc: { largeur: 280, hauteur: 140 },
  valise: { largeur: 96, hauteur: 80 },
  batiment: { largeur: 1040, hauteur: 500 },
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
 * 60 est un premier essai, décidé en regardant la scène tourner (réglage 1) :
 * la propriétaire demandera plus ou moins. Plus le décalage grandit, plus la
 * rame cache de la gare à l'arrêt — et c'est permis.
 */
export const DECALAGE_GARE = 60

/**
 * La largeur du bâtiment, en pixels de cadre — à l'échelle 1 de son dessin
 * (`CADRES.batiment`, `viewBox` de `batiment.svg`). Il s'**étire vers la
 * gauche** : son bord droit reste là où il était, et le mur passe derrière le
 * banc, la valise et le réverbère, qui se tiennent devant lui comme sur un vrai
 * quai. Un second réglage, indépendant de `DECALAGE_GARE`. Le changer demande
 * de refaire le dessin : le test des `viewBox` le rappelle.
 */
export const LARGEUR_BATIMENT = 1040

/** Le bord droit du bâtiment avant décalage : fixe, c'est lui qui ancre le mur. */
const BORD_DROIT_BATIMENT = 2220

export const PIECES = {
  reverbere: { x: 1290 - DECALAGE_GARE, pied: HORIZON, hauteur: 560 },
  // Banc et valise se tiennent **devant** le mur (le bâtiment passe derrière
  // eux, comme derrière le réverbère). La valise s'arrête avant la porte.
  banc: { x: 1480 - DECALAGE_GARE, pied: HORIZON, largeur: 280 },
  valise: { x: 1672 - DECALAGE_GARE, pied: HORIZON, largeur: 96 },
  batiment: {
    x: BORD_DROIT_BATIMENT - LARGEUR_BATIMENT - DECALAGE_GARE,
    pied: HORIZON,
    largeur: LARGEUR_BATIMENT,
    hauteur: 500,
  },
  // En bas à droite, accroché au mur et **débordant à sa droite**, jusque vers
  // le bord du cadre. La porte cintrée est posée entre la valise et lui :
  // les trois se voient côte à côte, aucun n'avale l'autre.
  panneau: { x: 1950 - DECALAGE_GARE, y: 640, largeur: 340, hauteur: 250 },
  quai: { y: HORIZON - 24, epaisseur: 24 },
} as const

/** Unités du SVG du bâtiment → pixels de cadre. */
const ECHELLE_BATIMENT = PIECES.batiment.largeur / CADRES.batiment.largeur

/** Le haut du bâtiment, d'où se comptent les `y` de son dessin. */
const SOMMET_BATIMENT = PIECES.batiment.pied - PIECES.batiment.hauteur

/**
 * La porte cintrée, en unités du SVG — **miroir du dessin**, à tenir à jour
 * avec lui. C'est ce qui permet de vérifier que le panneau ne la recouvre pas
 * sans avoir à rasteriser quoi que ce soit.
 */
export const PORTE_SVG = { x0: 565, x1: 675 } as const

/** L'horloge du pignon, en unités du SVG du bâtiment. */
export const HORLOGE_SVG = { x: 760, y: 120, rayon: 36 } as const

/** La porte cintrée, en pixels de cadre. */
export const PORTE = {
  x0: PIECES.batiment.x + PORTE_SVG.x0 * ECHELLE_BATIMENT,
  x1: PIECES.batiment.x + PORTE_SVG.x1 * ECHELLE_BATIMENT,
} as const

/**
 * L'horloge du bâtiment, en pixels de cadre.
 *
 * **Elle n'est pas dans le dessin** : cadran, halo et aiguilles se tracent au
 * rendu (`QuaiLayer.ts`), dans la racine allumée — c'est une des lumières de la
 * gare, et le SVG du bâtiment s'éteint. Le dessin n'en garde que la place.
 */
export const HORLOGE = {
  x: PIECES.batiment.x + HORLOGE_SVG.x * ECHELLE_BATIMENT,
  y: SOMMET_BATIMENT + HORLOGE_SVG.y * ECHELLE_BATIMENT,
  rayon: HORLOGE_SVG.rayon * ECHELLE_BATIMENT,
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
