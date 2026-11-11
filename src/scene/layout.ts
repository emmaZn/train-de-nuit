/** The frame every train asset is drawn in: rails, locomotive and wagon share it. */
export const STAGE = { width: 2320, height: 1217 } as const

export type Frame = {
  scale: number
  offsetX: number
  offsetY: number
}

/**
 * Fit the stage frame over the viewport: it covers it entirely and is centred,
 * so no empty band ever shows. A zero dimension is treated as 1, which keeps
 * the scale finite on a viewport that has not been measured yet.
 */
export function fitStage(viewportW: number, viewportH: number): Frame {
  const width = Math.max(viewportW, 1)
  const height = Math.max(viewportH, 1)
  const scale = Math.max(width / STAGE.width, height / STAGE.height)
  return {
    scale,
    offsetX: (width - STAGE.width * scale) / 2,
    offsetY: (height - STAGE.height * scale) / 2,
  }
}

/**
 * Stage y of the rail line: every asset standing on the track — mountains
 * behind, poles, the signpost — is placed against it. Measured on rails.png.
 */
export const HORIZON = 921

/**
 * Source frame of the mountain band, before the pipeline resizes it. Only its
 * aspect ratio matters here: the band is always drawn STAGE.width wide, times
 * ECHELLE_MONTAGNES.
 */
export const MOUNTAIN_SOURCE = { width: 3840, height: 944 } as const

/**
 * How much smaller the train is drawn than its source frame.
 *
 * CONCEPT.md §6 wants it « environ 3 fois plus petit que les PNG ». A visual
 * value: the track and the scroll speed follow it, so changing this one number
 * keeps the whole rolling stock consistent.
 */
export const ECHELLE_TRAIN = 0.44

/**
 * How much bigger than the frame the mountain range is drawn.
 *
 * 1 fits its width exactly; above that it climbs higher and spills off both
 * sides, which is what a nearer ridge does. A visual value, like the train's.
 */
export const ECHELLE_MONTAGNES = 1.4

/**
 * How far left of the middle of the frame the train sits, in stage pixels.
 *
 * The locomotive faces right, so leaving room ahead of it reads as a train
 * arriving rather than one parked in the middle. A visual value; it is applied
 * after the scale, so shrinking the train never drifts it back to the centre.
 */
export const DECALAGE_RAME = -200

/**
 * Height of the veil that puts out the foot of the mountain range, in stage
 * pixels, measured up from the rail line. It is what the train's white line
 * stands out against.
 */
export const DEGRADE_HAUTEUR = 380

/** How far the veil closes at the rail line, 0 to 1. */
export const DEGRADE_OPACITE = 0.9

/**
 * The band the veil covers: full frame width, resting on the rail line and
 * fading out upwards. Drawn in black, so the project's one rule turns it into
 * the colour of the night, whatever that colour is.
 */
export function cadreDegrade(hauteur: number): {
  x: number
  y: number
  width: number
  height: number
} {
  return { x: 0, y: HORIZON - hauteur, width: STAGE.width, height: hauteur }
}

/* ---- La frise ---- */

/** Au-dessous de cette largeur, on est sur un téléphone (CONCEPT.md §11). */
export const SEUIL_MOBILE = 720

/** Où se tient la gare à quai, depuis le bord gauche. */
export const ANCRE_FRISE = 120
export const ANCRE_FRISE_MOBILE = 24

/** Ce qu'on garde à droite, pour que la dernière mention ait sa place. */
export const MARGE_FRISE = 150
export const MARGE_FRISE_MOBILE = 110

/** Écartement minimal : en dessous, deux gares se chevaucheraient. */
const ECART_MINIMUM = 80

/**
 * Combien de gares la frise étale sur la largeur : quatre sur un écran, deux
 * sur un téléphone, où il n'y a de place que pour celle où l'on est et la
 * suivante.
 */
export function garesVisibles(largeur: number): number {
  return largeur < SEUIL_MOBILE ? 2 : 4
}

/**
 * Écart entre deux gares, pour que `visibles` gares occupent exactement la
 * largeur, de l'ancre jusqu'à la marge de droite.
 */
export function ecartFrise(largeur: number, visibles: number): number {
  const mobile = largeur < SEUIL_MOBILE
  const ancre = mobile ? ANCRE_FRISE_MOBILE : ANCRE_FRISE
  const marge = mobile ? MARGE_FRISE_MOBILE : MARGE_FRISE
  const intervalles = Math.max(1, visibles - 1)
  return Math.max(ECART_MINIMUM, (largeur - ancre - marge) / intervalles)
}
