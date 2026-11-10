import { Container, Sprite, Texture, TilingSprite } from 'pixi.js'
import { loadSequence, loadTexture } from './assets'
import { STAGE } from './layout'
import type { Manifest, TrainSequence } from './types'

export type TrainState = 'arret' | 'demarrage' | 'roule' | 'freinage'

/** End of the start-up ramp, as a share of the leg. */
export const PHASE_ROULE = 0.2
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
  return phase >= 1 ? 'arret' : 'freinage'
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
      this.rails = new TilingSprite({
        texture: voie,
        width: STAGE.width,
        height: this.manifest.rails.height * 2,
      })
      // La voie se répète sur toute la largeur du cadre, à la hauteur mesurée.
      this.rails.position.set(0, this.manifest.rails.y)
      this.rails.tileScale.set(2, 2)
      this.racine.addChildAt(this.rails, 0)
    }

    // La boucle de roulement d'abord : c'est elle qu'on voit en arrivant.
    for (const cle of ['loco', 'wagon', 'loco-stop', 'wagon-stop', 'loco-start', 'wagon-start'] as const) {
      const textures = await loadSequence(this.manifest.train[cle])
      if (textures.length) this.sequences.set(cle, textures)
      if (cle === 'wagon') this.appliquer()
    }
    this.appliquer()
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
    sprite.position.set(spec.x, spec.y)
    const index =
      this.etat === 'arret'
        ? textures.length - 1
        : Math.min(textures.length - 1, Math.floor(this.image) % textures.length)
    sprite.texture = textures[index]
  }

  destroy(): void {
    this.racine.destroy({ children: true })
  }
}
