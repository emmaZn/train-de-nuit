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
