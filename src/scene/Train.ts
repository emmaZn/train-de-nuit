import { Container, Sprite, Texture, TilingSprite } from 'pixi.js'
import { loadSequence, loadTexture } from './assets'
import { ECHELLE_TRAIN, HORIZON, STAGE } from './layout'
import type { Manifest, SequenceSpec, TrainSequence } from './types'

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

/**
 * How far the carriage overlaps the locomotive, in stage pixels, so the buffers
 * meet instead of leaving a gap. A visual value, to set by eye against the Figma.
 */
export const ATTELAGE = 70

/** Which sequence pairs with which, so a wagon is placed against its own loco. */
const LOCO_DE: Record<TrainSequence, TrainSequence> = {
  loco: 'loco',
  wagon: 'loco',
  'loco-start': 'loco-start',
  'wagon-start': 'loco-start',
  'loco-stop': 'loco-stop',
  'wagon-stop': 'loco-stop',
}

/**
 * Where the carriage goes, in stage pixels.
 *
 * The six sequences are six separate renders, and each vehicle was drawn at the
 * same place in the 2320x1217 frame — both bounding boxes start at x = 597. So
 * the recorded origin is not a position in a shared composition: placing both
 * there stacks the carriage on the locomotive, and its roof cuts a bar straight
 * across the boiler, above the chimney. The carriage is coupled behind instead.
 */
export function wagonX(loco: SequenceSpec, wagon: SequenceSpec): number {
  return loco.x - wagon.width + ATTELAGE
}

/** Left and right edge of the coupled train, in stage pixels at full size. */
export function emprise(loco: SequenceSpec, wagon: SequenceSpec): { gauche: number; droite: number } {
  return { gauche: wagonX(loco, wagon), droite: loco.x + loco.width }
}

/**
 * Where to place the scaled rolling stock. Two things must hold whatever the
 * scale: the wheels stay on the rail line, and the train stays centred in the
 * frame. A point at the rail line maps to itself; the middle of the train maps
 * to the middle of the stage.
 */
export function ancrageRame(
  loco: SequenceSpec,
  wagon: SequenceSpec,
  echelle: number,
): { x: number; y: number } {
  const { gauche, droite } = emprise(loco, wagon)
  return {
    x: STAGE.width / 2 - echelle * ((gauche + droite) / 2),
    y: HORIZON * (1 - echelle),
  }
}

/** Stage pixels the track scrolls through per second at full size. */
const DEFILEMENT = 900

export class Train {
  private readonly racine = new Container()
  /** Loco and carriage together: this is what the scale applies to. */
  private readonly rame = new Container()
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
    this.wagon.position.set(wagonX(spec.loco, spec.wagon), spec.wagon.y)
    this.loco.position.set(spec.loco.x, spec.loco.y)
    this.rame.addChild(this.wagon, this.loco)

    const ancre = ancrageRame(spec.loco, spec.wagon, ECHELLE_TRAIN)
    this.rame.scale.set(ECHELLE_TRAIN)
    this.rame.position.set(ancre.x, ancre.y)

    // La voie n'est pas dans la rame : elle garde la pleine largeur du cadre.
    this.racine.addChild(this.rame)
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
      // La voie suit l'échelle du train : des traverses à taille réelle sous
      // une locomotive réduite se verraient immédiatement.
      this.rails = new TilingSprite({
        texture: voie,
        width: STAGE.width,
        height: voieSpec.height * ECHELLE_TRAIN,
      })
      this.rails.position.set(0, HORIZON)
      this.rails.tileScale.set(ECHELLE_TRAIN / voieSpec.scale)
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
    // Le défilement suit l'échelle, sinon la voie paraîtrait filer deux fois
    // plus vite sous un train deux fois plus petit.
    if (this.rails) this.rails.tilePosition.x -= dt * DEFILEMENT * ECHELLE_TRAIN * vitesse
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
    const x = cle.startsWith('wagon') ? wagonX(this.manifest.train[LOCO_DE[cle]], spec) : spec.x
    sprite.position.set(x, spec.y)
    sprite.setSize(spec.width, spec.height)
  }

  destroy(): void {
    this.racine.destroy({ children: true })
  }
}
