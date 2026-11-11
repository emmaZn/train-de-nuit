import { Container, Filter, GlProgram, Sprite, Texture, UniformGroup, defaultFilterVert } from 'pixi.js'
import { loadSequence } from './assets'
import { ECHELLE_MONTAGNES, HORIZON, MOUNTAIN_CONTENU, MOUNTAIN_SOURCE, STAGE } from './layout'
import type { Manifest } from './types'

/**
 * How many legs one full turn of the range takes. Higher turns it more slowly:
 * at 8 a full rotation spans two complete loops of the four stations, so the
 * relief drifts rather than spins.
 *
 * The sequence loops — the 180th frame leads into the 1st exactly as any frame
 * leads into the next — so it is walked in one direction, forever, like the
 * train. No turnaround, nothing to hide at a station.
 */
export const SWEEP_LEGS = 8

/**
 * How much of one mountain frame dissolves into the next, 0 to 1.
 *
 * Not a blend: a *dissolve*. Blending two frames of a point cloud shows both
 * sets at half opacity and ghosts every point. Cutting instead makes all the
 * points jump at once, every 267 ms — a hole in the motion. The shader picks
 * one frame or the other per pixel, on a stable draw: each point keeps its
 * full opacity and switches at its own moment, so the change is spread
 * through time instead of landing all at once.
 */
export const FONDU_MONTAGNES = 1

export function fonduApplique(melange: number): number {
  return melange * FONDU_MONTAGNES
}

/** The single grey every point of the source holds. */
const GRIS = 237 / 255

/**
 * Continuous position in the sequence, 0 to count, going round. Fractional on
 * purpose: it is what makes the relief drift instead of step.
 */
function position(legs: number, count: number): number {
  if (count <= 1) return 0
  const tour = (((legs / SWEEP_LEGS) % 1) + 1) % 1
  return tour * count
}

/**
 * Index of the mountain frame for a distance travelled, counted in legs
 * (one leg = one station to the next), fractional and unbounded.
 */
export function mountainFrame(legs: number, count: number): number {
  if (count <= 1) return 0
  return Math.floor(position(legs, count)) % count
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
 * A turn takes 48 s for 180 frames — under 4 frames a second — so showing one
 * frame at a time reads as a slideshow, which §6 rules out ("pas d'à-coups
 * mécaniques"). Dissolving each frame into the next decouples smoothness from
 * frame rate: the relief drifts evenly however slowly the sequence is walked.
 */
export function mountainBlend(legs: number, count: number): Melange {
  if (count <= 1) return { index: 0, suivant: 0, melange: 0 }
  const p = position(legs, count)
  const index = Math.floor(p) % count
  // La derniere image se fond dans la premiere : la sequence boucle.
  return { index, suivant: (index + 1) % count, melange: p - Math.floor(p) }
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

/* Tirage stable par pixel d'ecran : c'est lui qui etale la bascule. */
float grain(vec2 p)
{
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void)
{
    vec4 texel = texture(uTexture, vTextureCoord);
    // Dissolution, pas melange : chaque pixel prend l'une OU l'autre image,
    // donc un point garde toute son opacite au lieu de se dedoubler.
    float a = grain(gl_FragCoord.xy) < uMelange ? texel.g : texel.r;
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

type Cadre = { x: number; y: number; width: number; height: number }

/** How many stage pixels one pixel of the source frame covers. */
function facteurMontagnes(echelle: number): number {
  return (STAGE.width / MOUNTAIN_SOURCE.width) * echelle
}

/**
 * Where the massif itself lands on the stage — not its image. Whatever the
 * scale, its foot rests on the rail line and it stays centred: growing it
 * makes it climb higher and spill off both sides, never lift off the ground.
 */
export function cadreMassif(echelle: number): Cadre {
  const f = facteurMontagnes(echelle)
  const width = (MOUNTAIN_CONTENU.right - MOUNTAIN_CONTENU.left) * f
  const height = (MOUNTAIN_CONTENU.bottom - MOUNTAIN_CONTENU.top) * f
  return { x: (STAGE.width - width) / 2, y: HORIZON - height, width, height }
}

/**
 * Where the whole source frame goes, so the massif inside it lands exactly
 * where `cadreMassif` says. The sprite is drawn from this, the massif is what
 * we reason about.
 */
export function cadreMontagnes(echelle: number): Cadre {
  const f = facteurMontagnes(echelle)
  const massif = cadreMassif(echelle)
  return {
    x: massif.x - MOUNTAIN_CONTENU.left * f,
    y: massif.y - MOUNTAIN_CONTENU.top * f,
    width: MOUNTAIN_SOURCE.width * f,
    height: MOUNTAIN_SOURCE.height * f,
  }
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
    const fondu = this.textures[suivant] ? fonduApplique(melange) : 0

    this.courante.texture = a
    this.suivante.texture = fondu > 0 ? (this.textures[suivant] ?? a) : a
    setMountainMelange(this.filtre, fondu)
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
