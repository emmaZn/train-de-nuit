import { SEUIL_MOBILE, regionCiel } from './layout'
import type { Trace } from './types'

export const ETOILES_MAX_BUREAU = 120
export const ETOILES_MAX_MOBILE = 50

/** A place in the sky band, both axes 0..1. */
export type Place = { x: number; y: number }

/** A star once projected on screen. */
export type EtoilePosee = { trace: Trace; px: number; py: number }

/** How many stars the sky keeps: fewer on a phone. */
export function limiteEtoiles(viewportW: number): number {
  return viewportW < SEUIL_MOBILE ? ETOILES_MAX_MOBILE : ETOILES_MAX_BUREAU
}

/** Brightness by age in days: 1 when new, fading, never below 0.16. */
export function eclat(ageJours: number): number {
  return Math.max(0.16, Math.exp(-ageJours / 18))
}

/** Only the bright stars carry a halo. */
export function aHalo(e: number): boolean {
  return e > 0.55
}

/** The brighter the star, the more it twinkles. */
export function amplitudeScintillement(e: number): number {
  return 0.12 + 0.35 * e
}

/** Stored place to screen pixels: x over the width, y over the free region under that column. */
export function projeter(
  place: Place,
  viewportW: number,
  viewportH: number,
  echelle: number,
  decalage: number,
): { px: number; py: number } {
  const px = place.x * viewportW
  const region = regionCiel(px, viewportW, viewportH, echelle, decalage)
  return { px, py: region.top + place.y * region.height }
}

/**
 * Where a new star goes: of `tirages` random candidates, the one farthest from
 * every taken place (best candidate). `alea` is injected to stay deterministic.
 *
 * Places are normalised, but a unit in x is much longer on screen than a unit
 * in y: `rapport` (band width over band height, in pixels) weights x so that
 * « far » means far on screen. The default 1 measures in the normalised square.
 */
export function tirerPlace(
  prises: Place[],
  alea: () => number,
  tirages = 40,
  rapport = 1,
): Place {
  let meilleure: Place = { x: alea(), y: alea() }
  let distanceMax = plusProche(meilleure, prises, rapport)
  for (let i = 1; i < tirages; i++) {
    const candidate = { x: alea(), y: alea() }
    const d = plusProche(candidate, prises, rapport)
    if (d > distanceMax) {
      meilleure = candidate
      distanceMax = d
    }
  }
  return meilleure
}

function plusProche(p: Place, prises: Place[], rapport: number): number {
  let min = Infinity
  for (const q of prises) min = Math.min(min, Math.hypot((p.x - q.x) * rapport, p.y - q.y))
  return min
}

/** The star nearest the pointer, if one lies within `rayon` pixels. */
export function etoileSous(
  px: number,
  py: number,
  posees: EtoilePosee[],
  rayon: number,
): Trace | null {
  let trouvee: Trace | null = null
  let distanceMin = rayon
  for (const e of posees) {
    const d = Math.hypot(e.px - px, e.py - py)
    if (d <= distanceMin) {
      trouvee = e.trace
      distanceMin = d
    }
  }
  return trouvee
}
