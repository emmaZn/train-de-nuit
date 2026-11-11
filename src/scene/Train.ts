import { Container, Sprite, Texture, TilingSprite } from 'pixi.js'
import { loadSequence, loadTexture } from './assets'
import { DUREE_ETAPE, ECHELLE_TRAIN, HORIZON, STAGE, TETE_LOCO } from './layout'
import type { Manifest, SequenceSpec, TrainSequence } from './types'

export type TrainState = 'arret' | 'demarrage' | 'roule' | 'freinage'

/** Images per second of the sprite sequences. */
export const FPS = 24

/**
 * Longueur des séquences de démarrage et de freinage, en images.
 *
 * Elle vit ici mais appartient aux assets : un test la confronte au
 * manifeste, pour qu'il casse si le pipeline en produit d'autres plutôt que
 * de laisser la valeur mentir en silence.
 */
export const IMAGES_TRANSITION = 43

/**
 * Fin de la montée en vitesse, en part d'étape : exactement le temps que dure
 * la séquence de démarrage.
 *
 * Les deux étaient figées à 0.3 et 0.7, ce qui tombait juste pour une étape
 * de 6 s. Allonger l'étape laissait alors les roues immobiles sur la dernière
 * image pendant que la voie défilait encore.
 */
export const PHASE_ROULE = IMAGES_TRANSITION / FPS / DUREE_ETAPE

/**
 * Début du freinage. « Il ralentit longuement à l'approche d'une gare »
 * (CONCEPT.md §6) : il dure **deux fois** la séquence d'arrêt.
 *
 * La rotation d'une roue est proportionnelle à la distance, pas au temps. Au
 * freinage ses images avancent donc avec la vitesse, ce qui les fait ralentir
 * puis s'immobiliser avec le train. À vitesse décroissante il faut deux fois
 * plus de temps pour consommer les 43 images — et c'est tant mieux, c'est ce
 * qui donne un ralentissement qu'on sent venir.
 */
export const PHASE_FREINAGE = 1 - (2 * IMAGES_TRANSITION) / FPS / DUREE_ETAPE

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

/**
 * Adoucit une rampe : à plat aux deux bouts, sans angle au milieu.
 *
 * La vitesse montait et descendait en ligne droite, donc son profil était un
 * trapèze : l'accélération sautait d'un coup à chaque transition. C'est
 * exactement l'à-coup mécanique que CONCEPT.md §6 refuse.
 *
 * `6t⁵ - 15t⁴ + 10t³` plutôt que `3t² - 2t³` : la pente **et** sa dérivée
 * s'annulent aux deux bouts, ce qui rend le départ et l'arrêt bien plus
 * sensibles. Son aire vaut ½ comme l'autre, donc une étape couvre la même
 * distance et le massif ne prend aucun retard.
 */
export function adoucir(t: number): number {
  const x = borne(t)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** 0 to 1. Drives how fast the track scrolls under the train. */
export function trainSpeed(state: TrainState, phase: number): number {
  if (state === 'arret') return 0
  if (state === 'demarrage') return adoucir(phase / PHASE_ROULE)
  if (state === 'roule') return 1
  return adoucir((1 - phase) / (1 - PHASE_FREINAGE))
}

/** Aire sous la rampe adoucie, de 0 à u. */
function aire(u: number): number {
  const x = borne(u)
  return x ** 6 - 3 * x ** 5 + 2.5 * x ** 4
}

/**
 * Distance parcourue depuis le début de l'étape, en part de l'étape.
 *
 * C'est l'intégrale de la vitesse, ramenée à 1 sur une étape entière. Le
 * massif tourne avec elle et non avec le temps : sans quoi il tournerait déjà
 * à pleine vitesse quand le train est encore à l'arrêt, et continuerait
 * quand il s'est arrêté. L'adoucissement de la vitesse ne se verrait pas.
 *
 * `demarrage` et `freinage` disent si l'étape en comporte : une étape de
 * passage se fait à vitesse constante, le train ne s'arrête qu'au terminus.
 */
export function avancement(phase: number, demarrage: boolean, freinage: boolean): number {
  const p = borne(phase)
  const montee = demarrage ? PHASE_ROULE : 0
  const descente = freinage ? 1 - PHASE_FREINAGE : 0
  const plein = 1 - montee - descente
  const total = montee / 2 + plein + descente / 2
  if (total <= 0) return p

  let d = montee * aire(montee > 0 ? p / montee : 0)
  if (p > montee) d += Math.min(p, montee + plein) - montee
  if (p > montee + plein && descente > 0) d += descente * (0.5 - aire((1 - p) / descente))
  return borne(d / total)
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

/** Nombre de wagons attelés derrière la locomotive. Une valeur d'œil. */
export const WAGONS = 2

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
export function wagonX(loco: SequenceSpec, wagon: SequenceSpec, rang = 1): number {
  return loco.x - rang * (wagon.width - ATTELAGE)
}

/** Left and right edge of the coupled train, in stage pixels at full size. */
export function emprise(
  loco: SequenceSpec, wagon: SequenceSpec, wagons = 1,
): { gauche: number; droite: number } {
  return { gauche: wagonX(loco, wagon, wagons), droite: loco.x + loco.width }
}

/**
 * Where to place the scaled rolling stock. Two things must hold whatever the
 * scale and however long the train: the wheels stay on the rail line, and the
 * head of the locomotive stays put. A point at the rail line maps to itself;
 * the nose lands at TETE_LOCO of the frame.
 */
export function ancrageRame(
  loco: SequenceSpec,
  wagon: SequenceSpec,
  echelle: number,
  wagons = 1,
): { x: number; y: number } {
  const { droite } = emprise(loco, wagon, wagons)
  return {
    x: STAGE.width * TETE_LOCO - echelle * droite,
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
  /** Du plus proche de la locomotive au plus éloigné. */
  private readonly wagons = Array.from({ length: WAGONS }, () => new Sprite())
  private rails: TilingSprite | null = null
  private readonly sequences = new Map<TrainSequence, Texture[]>()
  private readonly manifest: Manifest
  private etat: TrainState = 'arret'
  private image = 0

  constructor(parent: Container, manifest: Manifest) {
    this.manifest = manifest
    const spec = manifest.train
    this.wagons.forEach((wagon, i) => {
      wagon.position.set(wagonX(spec.loco, spec.wagon, i + 1), spec.wagon.y)
    })
    this.loco.position.set(spec.loco.x, spec.loco.y)
    // Du fond vers l'avant : les tampons se recouvrent dans le bon sens.
    this.rame.addChild(...[...this.wagons].reverse(), this.loco)

    const ancre = ancrageRame(spec.loco, spec.wagon, ECHELLE_TRAIN, WAGONS)
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
    // Au freinage, les images suivent la distance et non le temps : la roue
    // ralentit avec le sol au lieu de tourner à plein régime jusqu'à se figer.
    const cadence = this.etat === 'freinage' ? vitesse : 1
    // Le grain est vivant : la boucle tourne même à l'arrêt, mais sans défilement.
    this.image += dt * FPS * cadence
    // Le défilement suit l'échelle, sinon la voie paraîtrait filer deux fois
    // plus vite sous un train deux fois plus petit.
    if (this.rails) this.rails.tilePosition.x -= dt * DEFILEMENT * ECHELLE_TRAIN * vitesse
    this.appliquer()
  }

  private appliquer(): void {
    const [cleLoco, cleWagon] = sequenceFor(this.etat)
    this.poser(this.loco, cleLoco)
    // Les wagons partagent leur séquence et leur image : des voitures
    // identiques, dont les roues tournent ensemble.
    this.wagons.forEach((wagon, i) => this.poser(wagon, cleWagon, i + 1))
  }

  private poser(sprite: Sprite, cle: TrainSequence, rang = 1): void {
    const textures = this.sequences.get(cle)
    if (!textures || !textures.length) return
    const spec = this.manifest.train[cle]
    const boucle = cle === 'loco' || cle === 'wagon'
    sprite.texture = textures[frameIndex(this.etat, this.image, textures.length, boucle)]
    // Le fichier est réduit ; on le redessine à sa taille dans le cadre.
    const x = cle.startsWith('wagon')
      ? wagonX(this.manifest.train[LOCO_DE[cle]], spec, rang)
      : spec.x
    sprite.position.set(x, spec.y)
    sprite.setSize(spec.width, spec.height)
  }

  destroy(): void {
    this.racine.destroy({ children: true })
  }
}
