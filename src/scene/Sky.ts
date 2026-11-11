import { Container, Graphics } from 'pixi.js'

export type Grain = {
  x: number
  y: number
  /** Radius in pixels. */
  r: number
  /** Opacity, 0 to 1. */
  a: number
}

/** One grain per this many square pixels. */
const DENSITE = 1 / 9000
/** Below this, a small viewport would end up with an empty sky. */
const PLANCHER = 60
/** CONCEPT.md §11: fewer particles on mobile. */
const FACTEUR_MOBILE = 0.35

export function dustCount(viewportW: number, viewportH: number, mobile: boolean): number {
  const surface = Math.max(viewportW, 1) * Math.max(viewportH, 1)
  const brut = surface * DENSITE * (mobile ? FACTEUR_MOBILE : 1)
  return Math.max(PLANCHER, Math.round(brut))
}

/** mulberry32: small, fast, and seeded — the same sky on every visit. */
function alea(graine: number): () => number {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeDust(count: number, seed: number, w: number, h: number): Grain[] {
  const suivant = alea(seed)
  const grains: Grain[] = []
  for (let i = 0; i < count; i += 1) {
    grains.push({
      x: suivant() * w,
      y: suivant() * h,
      r: 0.4 + suivant() * 0.9,
      a: 0.06 + suivant() * 0.3,
    })
  }
  return grains
}

/** How far the dust lags behind the pointer, in pixels. */
const PARALLAX = 14

export class Sky {
  private readonly racine = new Container()
  private readonly grains = new Graphics()
  private cible = { x: 0, y: 0 }
  private readonly seed: number

  constructor(parent: Container, seed = 7) {
    this.seed = seed
    this.racine.addChild(this.grains)
    parent.addChild(this.racine)
  }

  resize(width: number, height: number, mobile: boolean): void {
    this.grains.clear()
    for (const grain of makeDust(dustCount(width, height, mobile), this.seed, width, height)) {
      this.grains.circle(grain.x, grain.y, grain.r).fill({ color: 0xffffff, alpha: grain.a })
    }
  }

  /** `x` and `y` are the pointer position, normalised to -1…1. */
  setPointer(x: number, y: number): void {
    this.cible = { x: -x * PARALLAX, y: -y * PARALLAX }
  }

  update(): void {
    // Lent, comme un souffle : on s'approche de la cible sans jamais l'atteindre d'un coup.
    this.racine.x += (this.cible.x - this.racine.x) * 0.02
    this.racine.y += (this.cible.y - this.racine.y) * 0.02
  }

  destroy(): void {
    this.racine.destroy({ children: true })
  }
}
