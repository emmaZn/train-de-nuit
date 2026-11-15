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

export const PIECES = {
  reverbere: { x: 1290, pied: HORIZON, hauteur: 560 },
  banc: { x: 1560, pied: HORIZON, largeur: 280 },
  valise: { x: 1790, pied: HORIZON, largeur: 96 },
  batiment: { x: 1900, pied: HORIZON, largeur: 400, hauteur: 500 },
  // En bas à droite, à cheval sur le mur : sa base reste au-dessus des rails.
  panneau: { x: 1930, y: 640, largeur: 340, hauteur: 250 },
  quai: { y: HORIZON - 24, epaisseur: 24 },
} as const

/** Demi-largeur de l'embase du réverbère, pour que la gare ait un bord gauche. */
const DEMI_EMBASE = 40

const bords = [
  PIECES.reverbere.x - DEMI_EMBASE,
  PIECES.banc.x - PIECES.banc.largeur / 2,
  PIECES.valise.x - PIECES.valise.largeur / 2,
  PIECES.batiment.x,
]
const fins = [
  PIECES.reverbere.x + DEMI_EMBASE,
  PIECES.banc.x + PIECES.banc.largeur / 2,
  PIECES.valise.x + PIECES.valise.largeur / 2,
  PIECES.batiment.x + PIECES.batiment.largeur,
]

/** Largeur totale occupée par la gare, en pixels de cadre. */
export const LARGEUR_GARE: number = Math.max(...fins) - Math.min(...bords)
