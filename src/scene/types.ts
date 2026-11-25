/** The four stations of the loop, in travel order. */
export type Gare = 'ici' | 'plus-loin' | 'la-haut' | 'ailleurs'

/** The six train sequences produced by tools/build_assets.py. */
export type TrainSequence =
  | 'loco'
  | 'wagon'
  | 'loco-start'
  | 'wagon-start'
  | 'loco-stop'
  | 'wagon-stop'

/** A sentence left by a visitor, shown as a star. Used from step 2 onwards. */
export type Trace = {
  id: string
  phrase: string
  prenom?: string
  creeLe: number
  /** Place in the sky band, both 0..1 (see bandeCiel in layout.ts). */
  x: number
  y: number
}

/**
 * One image sequence, described entirely in pixels of the 2320x1217 stage
 * frame: `x` and `y` are the origin of the union bounding box, `width` and
 * `height` its size. `scale` is what the pipeline applied to the files, so a
 * tiling texture can be scaled back up. `path` holds `{i}`, a placeholder for
 * a four-digit index.
 */
export type SequenceSpec = {
  count: number
  x: number
  y: number
  width: number
  height: number
  scale: number
  path: string
}

/** The rails are a single image, so they carry no frame count. */
export type RailsSpec = Omit<SequenceSpec, 'count'>

export type Manifest = {
  stage: { width: number; height: number }
  /** La carte de relief, dont le massif est calculé. */
  carte?: { path: string; width: number; height: number; max: number }
  rails: RailsSpec
  train: Record<TrainSequence, SequenceSpec>
}

/**
 * La boucle, dans l'ordre du voyage. Elle vit ici et non dans le magasin :
 * la scène en a besoin pour savoir où est « plus loin » sur la ligne, et la
 * scène ne connaît pas Vue (CONCEPT.md §8). Le magasin la réexporte.
 */
export const GARES = ['ici', 'plus-loin', 'la-haut', 'ailleurs'] as const

/** Combien d'étapes vers l'avant. Reculer, c'est faire tout le tour. */
export function forwardSteps(from: Gare, to: Gare): number {
  return (GARES.indexOf(to) - GARES.indexOf(from) + GARES.length) % GARES.length
}

export function gareSuivante(gare: Gare): Gare {
  return GARES[(GARES.indexOf(gare) + 1) % GARES.length]
}

/**
 * La gare d'avant sur la ligne.
 *
 * Le train, lui, ne recule jamais : y aller lui fait faire presque le tour,
 * comme le fait déjà un clic sur la gare passée de la frise. C'est la ligne
 * qui est circulaire, pas la marche.
 */
export function garePrecedente(gare: Gare): Gare {
  return GARES[(GARES.indexOf(gare) + GARES.length - 1) % GARES.length]
}
