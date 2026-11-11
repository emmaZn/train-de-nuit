import { Container, Graphics } from 'pixi.js'
import { aHalo, amplitudeScintillement, eclat, etoileSous, limiteEtoiles, projeter } from './stars'
import type { EtoilePosee } from './stars'
import type { Trace } from './types'

const JOUR_MS = 86_400_000
/** Pointer reach around a star, in CSS pixels. */
const RAYON_SURVOL = 14
/** A star put out by the limit fades over this many seconds. */
const DUREE_EXTINCTION = 1.2
const RAYON_ETOILE = 2.2
const RAYON_HALO = 9

type Posee = {
  trace: Trace
  px: number
  py: number
  gfx: Graphics
  eclat: number
  /** Twinkle phase and speed, fixed per star so each one has its own pulse. */
  phase: number
  vitesse: number
  /** Seconds left while fading out; null while the star is alive. */
  extinction: number | null
}

/** Hash of the id into 0..1, so a star twinkles the same way on every visit. */
function graine(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return (h >>> 0) / 4294967296
}

/**
 * The travellers' stars, in screen space: no parallax, so a star you aim at
 * stays where the hit test believes it is.
 */
export class Stars {
  private readonly racine = new Container()
  private readonly posees = new Map<string, Posee>()
  private readonly reducedMotion: boolean
  private largeur = 0
  private hauteur = 0
  private horloge = 0
  private maintenant = Date.now()

  constructor(parent: Container, opts: { reducedMotion: boolean }) {
    this.reducedMotion = opts.reducedMotion
    parent.addChild(this.racine)
  }

  /**
   * Idempotent by id: a star already placed is left alone. Keeps the newest
   * ones up to the limit; a placed star that falls out of it is faded out.
   */
  setStars(traces: Trace[], viewportW: number, viewportH: number): void {
    this.largeur = viewportW
    this.hauteur = viewportH
    const gardees = [...traces]
      .sort((a, b) => b.creeLe - a.creeLe)
      .slice(0, limiteEtoiles(viewportW))
    const ids = new Set(gardees.map((t) => t.id))

    for (const id of this.posees.keys()) if (!ids.has(id)) this.fadeOut(id)
    for (const trace of gardees) {
      if (!this.posees.has(trace.id)) this.poser(trace)
    }
  }

  resize(viewportW: number, viewportH: number): void {
    this.largeur = viewportW
    this.hauteur = viewportH
    for (const e of this.posees.values()) this.placer(e)
  }

  /** The trace under the pointer, or null. Emits nothing: the scene decides. */
  hit(px: number, py: number): Trace | null {
    const vivantes: EtoilePosee[] = []
    for (const e of this.posees.values()) if (e.extinction === null) vivantes.push(e)
    return etoileSous(px, py, vivantes, RAYON_SURVOL)
  }

  update(dt: number, maintenant: number): void {
    this.maintenant = maintenant
    this.horloge += dt
    for (const [id, e] of this.posees) {
      if (e.extinction !== null) {
        e.extinction -= dt
        if (e.extinction <= 0) {
          e.gfx.destroy()
          this.posees.delete(id)
          continue
        }
        e.gfx.alpha = this.alphaDe(e) * (e.extinction / DUREE_EXTINCTION)
        continue
      }
      e.eclat = this.eclatDe(e.trace)
      e.gfx.alpha = this.alphaDe(e)
    }
  }

  /** Puts a star out, gradually. It stops being a hover target at once. */
  fadeOut(id: string): void {
    const e = this.posees.get(id)
    if (e && e.extinction === null) e.extinction = DUREE_EXTINCTION
  }

  destroy(): void {
    this.posees.clear()
    this.racine.destroy({ children: true })
  }

  private eclatDe(trace: Trace): number {
    return eclat(Math.max(0, (this.maintenant - trace.creeLe) / JOUR_MS))
  }

  /** Base brightness, dimmed by the twinkle unless motion is reduced. */
  private alphaDe(e: Posee): number {
    if (this.reducedMotion) return e.eclat
    const amplitude = amplitudeScintillement(e.eclat)
    const onde = 0.5 + 0.5 * Math.sin(this.horloge * e.vitesse + e.phase)
    return e.eclat * (1 - amplitude * onde)
  }

  private poser(trace: Trace): void {
    const g = graine(trace.id)
    const e: Posee = {
      trace,
      px: 0,
      py: 0,
      gfx: new Graphics(),
      eclat: this.eclatDe(trace),
      phase: g * Math.PI * 2,
      vitesse: 0.8 + graine(trace.id + '~') * 1.6,
      extinction: null,
    }
    if (aHalo(e.eclat)) e.gfx.circle(0, 0, RAYON_HALO).fill({ color: 0xffffff, alpha: 0.15 })
    e.gfx.circle(0, 0, RAYON_ETOILE).fill({ color: 0xffffff })
    e.gfx.alpha = this.alphaDe(e)
    this.placer(e)
    this.racine.addChild(e.gfx)
    this.posees.set(trace.id, e)
  }

  private placer(e: Posee): void {
    const { px, py } = projeter(e.trace, this.largeur, this.hauteur)
    e.px = px
    e.py = py
    e.gfx.position.set(px, py)
  }
}
