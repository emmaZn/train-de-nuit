import { Container, Filter, GlProgram, Sprite, Texture, defaultFilterVert } from 'pixi.js'
import { loadSequence } from './assets'
import { ECHELLE_MONTAGNES, HORIZON, MOUNTAIN_SOURCE, STAGE } from './layout'
import type { Manifest } from './types'

/**
 * One full sweep of the sequence per complete loop of the four stations.
 * The sequence does not loop — between the 160th frame and the 1st the alpha
 * jumps by 23.8 where consecutive frames differ by 0.8 — so it is walked back
 * and forth. An integer number of legs means both turnarounds fall on a stop
 * at a station, never while the train is moving.
 */
export const SWEEP_LEGS = 4

/**
 * Index of the mountain frame for a distance travelled, counted in legs
 * (one leg = one station to the next), fractional and unbounded.
 */
export function mountainFrame(legs: number, count: number): number {
  if (count <= 1) return 0
  const last = count - 1
  const position = ((legs / SWEEP_LEGS) % 2 + 2) % 2
  const brut = position * last
  const plie = brut <= last ? brut : 2 * last - brut
  return Math.min(last, Math.max(0, Math.round(plie)))
}

/**
 * The pipeline stores only the alpha of each mountain frame, as luminance.
 * This filter does the inverse: luminance back to alpha, over the single grey
 * the source actually holds. It runs before the recolor filter.
 */
const FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;

void main(void)
{
    float a = texture(uTexture, vTextureCoord).r;
    finalColor = vec4(vec3(${(196 / 255).toFixed(6)}) * a, a);
}
`

export function createMountainFilter(): Filter {
  return new Filter({
    glProgram: GlProgram.from({
      vertex: defaultFilterVert,
      fragment: FRAGMENT,
      name: 'mountain-alpha',
    }),
  })
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
  private readonly sprite = new Sprite()
  private readonly textures: (Texture | undefined)[] = []
  private readonly count: number
  private readonly spec: Manifest['mountains']
  private legs = 0

  constructor(parent: Container, manifest: Manifest) {
    this.spec = manifest.mountains
    this.count = this.spec.count
    this.textures.length = this.count

    this.cadrer()
    parent.addChild(this.sprite)
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

  /** Shows the wanted frame, or the closest one already loaded. */
  private montrer(): void {
    const voulu = mountainFrame(this.legs, this.count)
    for (let ecart = 0; ecart < this.count; ecart += 1) {
      const texture = this.textures[voulu - ecart] ?? this.textures[voulu + ecart]
      if (texture) {
        this.sprite.texture = texture
        // La taille est réappliquée après chaque texture : la poser une fois
        // sur un sprite encore vide ne survit pas au premier échange.
        this.cadrer()
        return
      }
    }
  }

  private cadrer(): void {
    const c = cadreMontagnes(ECHELLE_MONTAGNES)
    this.sprite.position.set(c.x, c.y)
    this.sprite.setSize(c.width, c.height)
  }

  destroy(): void {
    this.sprite.destroy()
  }
}
