/**
 * La géométrie du quai de « ailleurs ».
 *
 * Pendant de `cables.ts` : des nombres et des fonctions pures, rien ne dessine.
 * La composition vient du §5.4 de la spec (maquette du 15 novembre) : loco à
 * gauche, réverbère vers le centre, banc et valise, bâtiment à droite, panneau
 * en bas à droite par-dessus le mur.
 *
 * La rame est opaque et s'arrête le nez à `TETE_LOCO × STAGE.width`, en
 * s'allongeant vers l'arrière : elle occupe donc toute la moitié gauche du
 * cadre. Tout le quai se pose à droite de son nez, sans quoi une pièce serait
 * cachée derrière elle à l'arrêt. Le faisceau du réverbère, lui, déborde sur le
 * massif : il se construit à partir de `x`, `pied` et `hauteur`.
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
  batiment: { largeur: 560, hauteur: 500 },
} as const

export const PIECES = {
  reverbere: { x: 1290, pied: HORIZON, hauteur: 560 },
  // Banc et valise se tiennent entre le réverbère et le bâtiment (§5.4). Tous
  // deux ont reculé vers la gauche quand le bâtiment s'est élargi : la valise
  // serait sinon tombée pile devant la porte.
  banc: { x: 1480, pied: HORIZON, largeur: 280 },
  valise: { x: 1672, pied: HORIZON, largeur: 96 },
  batiment: { x: 1660, pied: HORIZON, largeur: 560, hauteur: 500 },
  // En bas à droite, accroché au mur et **débordant à sa droite**, jusque vers
  // le bord du cadre. À 340 px sur un bâtiment de 400, il avalait la porte
  // cintrée : il n'en restait que trente pixels. Le bâtiment s'est élargi, la
  // porte est passée dans sa partie gauche, et les deux se voient côte à côte.
  panneau: { x: 1950, y: 640, largeur: 340, hauteur: 250 },
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
export const PORTE_SVG = { x0: 85, x1: 195 } as const

/** L'horloge du pignon, en unités du SVG du bâtiment. */
export const HORLOGE_SVG = { x: 280, y: 120, rayon: 36 } as const

/** La porte cintrée, en pixels de cadre. */
export const PORTE = {
  x0: PIECES.batiment.x + PORTE_SVG.x0 * ECHELLE_BATIMENT,
  x1: PIECES.batiment.x + PORTE_SVG.x1 * ECHELLE_BATIMENT,
} as const

/**
 * L'horloge du bâtiment, en pixels de cadre.
 *
 * Ses **aiguilles ne sont pas dans le dessin** : elles se tracent au rendu, à
 * la vraie heure (`anglesHorloge`). Le SVG en portait un jeu fixe, retiré —
 * deux jeux d'aiguilles sur un même cadran, c'est le piège du double tracé que
 * le commentaire du grain signale déjà.
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
