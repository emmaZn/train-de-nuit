import { Container, Filter, GlProgram, Sprite, Texture, UniformGroup, defaultFilterVert } from 'pixi.js'
import { loadSequence } from './assets'
import { ECHELLE_MONTAGNES, HORIZON, MOUNTAIN_SOURCE, STAGE } from './layout'
import type { Manifest } from './types'

/**
 * How many legs one full sweep of the sequence takes. Higher turns the range
 * more slowly: at 8 it takes two complete loops of the four stations, so the
 * relief drifts rather than spins.
 *
 * The sequence does not loop — between the 160th frame and the 1st the alpha
 * jumps by 23.8 where consecutive frames differ by 0.8 — so it is walked back
 * and forth. An integer number of legs keeps both turnarounds on a stop at a
 * station, never while the train is moving.
 */
export const SWEEP_LEGS = 8

/** The single grey every opaque pixel of the source holds. */
const GRIS = 196 / 255

/**
 * Continuous position in the sequence, 0 to count-1, walking back and forth.
 * Fractional on purpose: it is what makes the relief drift instead of step.
 */
function position(legs: number, count: number): number {
  if (count <= 1) return 0
  const last = count - 1
  const tour = (((legs / SWEEP_LEGS) % 2) + 2) % 2
  const brut = tour * last
  return Math.min(last, Math.max(0, brut <= last ? brut : 2 * last - brut))
}

/**
 * Index of the mountain frame for a distance travelled, counted in legs
 * (one leg = one station to the next), fractional and unbounded.
 */
export function mountainFrame(legs: number, count: number): number {
  return Math.round(position(legs, count))
}

export type Melange = {
  /** Frame currently showing. */
  index: number
  /** The one it is dissolving into. */
  suivant: number
  /** How far along, 0 to 1. */
  melange: number
}

/**
 * The two frames to show at once, and how much of the second.
 *
 * A sweep takes 48 s for 160 frames — 3.3 frames a second — so showing one
 * frame at a time reads as a slideshow, which §6 rules out ("pas d'à-coups
 * mécaniques"). Dissolving each frame into the next decouples smoothness from
 * frame rate: the relief drifts evenly however slowly the sequence is walked.
 */
export function mountainBlend(legs: number, count: number): Melange {
  const p = position(legs, count)
  const index = Math.min(count - 1, Math.floor(p))
  return { index, suivant: Math.min(count - 1, index + 1), melange: p - index }
}

/**
 * The pipeline stores only the alpha of each mountain frame, as luminance.
 * This filter does the inverse — luminance back to alpha, over the single grey
 * the source holds — and blends the two frames on the way.
 *
 * The two frames arrive in two channels: the container below holds two
 * additive sprites, one tinted red and one tinted green, so the red channel
 * carries the current frame and the green the next. That keeps a single
 * texture sampler and the ordinary filter plumbing.
 */
const FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uMelange;

void main(void)
{
    vec4 texel = texture(uTexture, vTextureCoord);
    float a = mix(texel.r, texel.g, uMelange);
    finalColor = vec4(vec3(${GRIS.toFixed(6)}) * a, a);
}
`

const groupes = new WeakMap<Filter, UniformGroup>()

export function createMountainFilter(): Filter {
  const uniforms = new UniformGroup({ uMelange: { value: 0, type: 'f32' } })
  const filter = new Filter({
    glProgram: GlProgram.from({
      vertex: defaultFilterVert,
      fragment: FRAGMENT,
      name: 'mountain-blend',
    }),
    resources: { mountainUniforms: uniforms },
  })
  groupes.set(filter, uniforms)
  return filter
}

export function setMountainMelange(filter: Filter, melange: number): void {
  const uniforms = groupes.get(filter)
  if (!uniforms) return
  uniforms.uniforms.uMelange = melange
  uniforms.update()
}

/**
 * Where the mountain band goes, in stage pixels. Whatever the scale, its foot
 * rests on the rail line and the range stays centred: growing it makes it
 * climb higher and spill off both sides, never lift off the ground.
 */
export function cadreMontagnes(echelle: number): {
  x: number
  y: number
  width: number
  height: number
} {
  const facteur = (STAGE.width / MOUNTAIN_SOURCE.width) * echelle
  const width = MOUNTAIN_SOURCE.width * facteur
  const height = MOUNTAIN_SOURCE.height * facteur
  return { x: (STAGE.width - width) / 2, y: HORIZON - height, width, height }
}

export class Mountains {
  private readonly racine = new Container()
  /** Writes the current frame into the red channel. */
  private readonly courante = new Sprite()
  /** Writes the next one into the green channel. */
  private readonly suivante = new Sprite()
  private readonly filtre = createMountainFilter()
  private readonly textures: (Texture | undefined)[] = []
  private readonly count: number
  private readonly spec: Manifest['mountains']
  private legs = 0

  constructor(parent: Container, manifest: Manifest) {
    this.spec = manifest.mountains
    this.count = this.spec.count
    this.textures.length = this.count

    for (const [sprite, teinte] of [
      [this.courante, 0xff0000],
      [this.suivante, 0x00ff00],
    ] as const) {
      sprite.tint = teinte
      sprite.blendMode = 'add'
      this.racine.addChild(sprite)
    }

    this.racine.filters = [this.filtre]
    this.cadrer()
    parent.addChild(this.racine)
  }

  /** Loads the whole sequence, showing each frame as it arrives. */
  async load(): Promise<void> {
    await loadSequence(this.spec, {
      onFrame: (index, texture) => {
        this.textures[index - 1] = texture
        this.montrer()
      },
    })
  }

  setLegs(legs: number): void {
    this.legs = legs
    this.montrer()
  }

  /** The wanted frame, or the closest one already loaded. */
  private proche(voulu: number): Texture | undefined {
    for (let ecart = 0; ecart < this.count; ecart += 1) {
      const texture = this.textures[voulu - ecart] ?? this.textures[voulu + ecart]
      if (texture) return texture
    }
    return undefined
  }

  private montrer(): void {
    const { index, suivant, melange } = mountainBlend(this.legs, this.count)
    const a = this.proche(index)
    if (!a) return
    // Tant que la suivante n'est pas chargée, on reste sur la courante plutôt
    // que de faire disparaître le relief dans un fondu vers rien.
    const b = this.textures[suivant] ?? a

    this.courante.texture = a
    this.suivante.texture = b
    setMountainMelange(this.filtre, this.textures[suivant] ? melange : 0)
    this.cadrer()
  }

  private cadrer(): void {
    const c = cadreMontagnes(ECHELLE_MONTAGNES)
    for (const sprite of [this.courante, this.suivante]) {
      sprite.position.set(c.x, c.y)
      sprite.setSize(c.width, c.height)
    }
  }

  destroy(): void {
    this.racine.destroy({ children: true })
  }
}
