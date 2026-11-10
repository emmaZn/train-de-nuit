import { Container, Sprite, Texture, TilingSprite } from 'pixi.js'
import { loadSequence, loadTexture } from './assets'
import { STAGE } from './layout'
import type { Manifest, TrainSequence } from './types'

export type TrainState = 'arret' | 'demarrage' | 'roule' | 'freinage'

/** End of the start-up ramp, as a share of the leg: 1.8 s, the 43 frames at 24 fps. */
export const PHASE_ROULE = 0.3
/** « Il ralentit longuement à l'approche d'une gare » (CONCEPT.md §6). */
export const PHASE_FREINAGE = 0.7

/** Images per second of the sprite sequences. */
const FPS = 24

function borne(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/**
 * The state the train should be in. Called only while a journey is underway,
 * which is why `arret` leaves immediately. Only the last leg brakes: the train
 * runs through the stations in between.
 */
export function nextTrainState(state: TrainState, phase: number, derniereEtape: boolean): TrainState {
  if (state === 'arret') return 'demarrage'
  if (state === 'demarrage') return phase >= PHASE_ROULE ? 'roule' : 'demarrage'
  if (state === 'roule') return derniereEtape && phase >= PHASE_FREINAGE ? 'freinage' : 'roule'
  // Le freinage n'a de sens que sur la dernière étape : si la cible est
  // redirigée pendant qu'il freine, le train doit repartir.
  if (!derniereEtape) return 'roule'
  return phase >= 1 ? 'arret' : 'freinage'
}

/**
 * Which image of a sequence to show. Rolling loops; starting and braking are
 * played once and hold on their last image — wrapping them would pop the train
 * back to the start of its braking in the middle of a stop.
 */
export function frameIndex(state: TrainState, image: number, count: number, boucle: boolean): number {
  if (count <= 0) return 0
  if (state === 'arret') return count - 1
  const entier = Math.max(0, Math.floor(image))
  return boucle ? entier % count : Math.min(count - 1, entier)
}

/** 0 to 1. Drives how fast the track scrolls under the train. */
export function trainSpeed(state: TrainState, phase: number): number {
  if (state === 'arret') return 0
  if (state === 'demarrage') return borne(phase / PHASE_ROULE)
  if (state === 'roule') return 1
  return borne((1 - phase) / (1 - PHASE_FREINAGE))
}

export function sequenceFor(state: TrainState): [TrainSequence, TrainSequence] {
  if (state === 'demarrage') return ['loco-start', 'wagon-start']
  if (state === 'roule') return ['loco', 'wagon']
  // À l'arrêt, le train reste sur la dernière image de la séquence d'arrêt.
  return ['loco-stop', 'wagon-stop']
}

/** Stage pixels the track scrolls through per second at full speed. */
const DEFILEMENT = 900

export class Train {
  private readonly racine = new Container()
  private readonly loco = new Sprite()
  private readonly wagon = new Sprite()
  private rails: TilingSprite | null = null
  private readonly sequences = new Map<TrainSequence, Texture[]>()
  private readonly manifest: Manifest
  private etat: TrainState = 'arret'
  private image = 0

  constructor(parent: Container, manifest: Manifest) {
    this.manifest = manifest
    const spec = manifest.train
    // Chaque séquence est replacée à l'origine de sa bbox d'union : c'est ce qui
    // reconstitue la composition d'origine du cadre 2320 x 1217.
    this.wagon.position.set(spec.wagon.x, spec.wagon.y)
    this.loco.position.set(spec.loco.x, spec.loco.y)
    this.racine.addChild(this.wagon, this.loco)
    parent.addChild(this.racine)
  }

  get container(): Container {
    return this.racine
  }

  get state(): TrainState {
    return this.etat
  }

  async load(): Promise<void> {
    const voie = await loadTexture(this.manifest.rails.path)
    if (voie) {
      const voieSpec = this.manifest.rails
      this.rails = new TilingSprite({
        texture: voie,
        width: STAGE.width,
        height: voieSpec.height,
      })
      // La voie se répète sur toute la largeur du cadre ; la texture est
      // remise à l'échelle du cadre, puisqu'elle a été réduite à l'export.
      this.rails.position.set(0, voieSpec.y)
      this.rails.tileScale.set(1 / voieSpec.scale)
      this.racine.addChildAt(this.rails, 0)
    }

    // La séquence d'arrêt d'abord : le train est à quai quand on arrive, et
    // `sequenceFor('arret')` ne demande qu'elle. Charger la boucle en premier
    // laissait le train invisible le temps de 64 images.
    for (const paire of [
      ['loco-stop', 'wagon-stop'],
      ['loco', 'wagon'],
      ['loco-start', 'wagon-start'],
    ] as const) {
      await Promise.all(
        paire.map(async (cle) => {
          const textures = await loadSequence(this.manifest.train[cle], {
            onFrame: () => this.appliquer(),
          })
          if (textures.length) this.sequences.set(cle, textures)
        }),
      )
      this.appliquer()
    }
  }

  update(dt: number, phase: number, derniereEtape: boolean, enRoute: boolean): void {
    const suivant = enRoute ? nextTrainState(this.etat, phase, derniereEtape) : 'arret'
    if (suivant !== this.etat) {
      this.etat = suivant
      this.image = 0
    }

    const vitesse = trainSpeed(this.etat, phase)
    // Le grain est vivant : la boucle tourne même à l'arrêt, mais sans défilement.
    this.image += dt * FPS
    if (this.rails) this.rails.tilePosition.x -= dt * DEFILEMENT * vitesse
    this.appliquer()
  }

  private appliquer(): void {
    const [cleLoco, cleWagon] = sequenceFor(this.etat)
    this.poser(this.loco, cleLoco)
    this.poser(this.wagon, cleWagon)
  }

  private poser(sprite: Sprite, cle: TrainSequence): void {
    const textures = this.sequences.get(cle)
    if (!textures || !textures.length) return
    const spec = this.manifest.train[cle]
    const boucle = cle === 'loco' || cle === 'wagon'
    sprite.texture = textures[frameIndex(this.etat, this.image, textures.length, boucle)]
    // Le fichier est réduit ; on le redessine à sa taille dans le cadre.
    sprite.position.set(spec.x, spec.y)
    sprite.setSize(spec.width, spec.height)
  }

  destroy(): void {
    this.racine.destroy({ children: true })
  }
}
