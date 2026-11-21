/**
 * Le hasard de la scène, et la matière d'un grain.
 *
 * Des nombres purs, rien d'autre : **aucun import de Pixi ici**. Ces deux-là
 * vivaient dans `Sky.ts`, qui dessine ; les modules en nombres purs qui s'en
 * servaient — les horaires, la neige — chargeaient donc Pixi pour un
 * générateur de dix lignes, et leurs tests avec. `Sky.ts` les ré-exporte, si
 * bien que rien de ce qui les lisait n'a changé de chemin.
 */

/** Un grain : une place, un rayon, une opacité. La matière de tout ce qui poudre. */
export type Grain = {
  x: number
  y: number
  /** Radius in pixels. */
  r: number
  /** Opacity, 0 to 1. */
  a: number
}

/** mulberry32: small, fast, and seeded — the same sky on every visit. */
export function alea(graine: number): () => number {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
