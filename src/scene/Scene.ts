import gsap from 'gsap'
import { Application, BlurFilter, Container, FillGradient, Graphics, RenderTexture, Sprite } from 'pixi.js'
import type { Filter } from 'pixi.js'
import { loadManifest } from './assets'
import { DEGRADE_HAUTEUR, DEGRADE_OPACITE, HORIZON, STAGE, cadreDegrade, fitStage } from './layout'
import { Mountains } from './Mountains'
import { DEFAUT, fondToHex } from './palette'
import { Sky } from './Sky'
import { Train } from './Train'
import { createEmitter } from './events'
import type { Emitter, SceneEvents } from './events'
import { createRecolorFilter, hexToUnit, setRecolorFond } from './recolor'
import type { Manifest } from './types'

/** Seconds per leg. « Lents, comme un souffle » (CONCEPT.md §6). */
const DUREE_ETAPE = 6
/** The reflection is rendered at half resolution: it is blurred anyway. */
const REFLET_RESOLUTION = 0.5
const REFLET_OPACITE = 0.16

export type SceneOptions = { reducedMotion: boolean }

export class Scene {
  private readonly canvas: HTMLCanvasElement
  private readonly reducedMotion: boolean
  private readonly app = new Application()
  private readonly emitter: Emitter<SceneEvents> = createEmitter<SceneEvents>()

  /** Everything that lives in the 2320x1217 stage frame. */
  private readonly monde = new Container()
  /** Mountains and train together: this is what the reflection mirrors. */
  private readonly decor = new Container()
  private readonly refletSprite = new Sprite()
  private refletTexture: RenderTexture | null = null

  private sky: Sky | null = null
  private mountains: Mountains | null = null
  private train: Train | null = null
  private recolor: Filter | null = null

  private fond = DEFAUT as string
  private phase = 0
  private enRoute = false
  private etapesRestantes = 0
  /** Whole legs travelled; the fraction of the current one is `phase`. */
  private legsBase = 0
  private dernierSaut = -1
  private vivante = false

  constructor(canvas: HTMLCanvasElement, opts: SceneOptions) {
    this.canvas = canvas
    this.reducedMotion = opts.reducedMotion
  }

  on<K extends keyof SceneEvents>(evt: K, cb: SceneEvents[K]): () => void {
    return this.emitter.on(evt, cb)
  }

  /**
   * Never throws. Without WebGL, or without a manifest, the page keeps the CSS
   * background instead of showing a black canvas.
   */
  async init(): Promise<void> {
    try {
      await this.app.init({
        canvas: this.canvas,
        backgroundColor: fondToHex(this.fond),
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        resizeTo: window,
      })
    } catch {
      return
    }

    this.vivante = true
    this.recolor = createRecolorFilter(fondToHex(this.fond))

    this.app.stage.addChild(this.monde)
    this.sky = new Sky(this.monde)

    this.refletSprite.scale.y = -1
    this.refletSprite.alpha = REFLET_OPACITE
    this.refletSprite.filters = [new BlurFilter({ strength: 3 })]
    this.monde.addChild(this.refletSprite, this.decor)
    this.decor.filters = [this.recolor]

    this.cadrer()
    // `resizeTo: window` reporte le redimensionnement à un requestAnimationFrame :
    // lire `app.screen` depuis un écouteur `resize` du document donne toujours
    // les dimensions d'avant. C'est le renderer qui dit quand il a changé.
    this.app.renderer.on('resize', () => this.cadrer())
    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000))

    const manifest = await loadManifest()
    // Sans `await` : 396 images ne doivent pas retarder la couleur mémorisée,
    // le parallax ni le premier cadrage.
    if (manifest) void this.peupler(manifest)
  }

  private async peupler(manifest: Manifest): Promise<void> {
    // Les montagnes portent leur propre conteneur et leur propre filtre :
    // c'est lui qui fond chaque image dans la suivante.
    this.mountains = new Mountains(this.decor, manifest)
    // Entre le massif et le train : c'est ce qui détache le trait blanc.
    this.decor.addChild(this.voileDuPied())
    this.train = new Train(this.decor, manifest)

    // La boucle du train d'abord : c'est elle qu'on voit en arrivant.
    await this.train.load()
    await this.mountains.load()
  }

  /**
   * The veil that puts out the foot of the range. Drawn in black, so the
   * recolor filter above turns it into the colour of the night — it follows
   * the eye like everything else.
   */
  private voileDuPied(): Graphics {
    const c = cadreDegrade(DEGRADE_HAUTEUR)
    const degrade = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      textureSpace: 'local',
      colorStops: [
        { offset: 0, color: 'rgba(0,0,0,0)' },
        { offset: 1, color: `rgba(0,0,0,${DEGRADE_OPACITE})` },
      ],
    })
    return new Graphics().rect(c.x, c.y, c.width, c.height).fill(degrade)
  }

  /** Scale and centre the stage frame over the viewport. */
  private cadrer(): void {
    if (!this.vivante) return
    const { width, height } = this.app.screen
    const frame = fitStage(width, height)
    for (const noeud of [this.monde]) {
      noeud.scale.set(frame.scale)
      noeud.position.set(frame.offsetX, frame.offsetY)
    }

    this.sky?.resize(STAGE.width, STAGE.height, width < 720)

    this.refletTexture?.destroy(true)
    this.refletTexture = RenderTexture.create({
      width: Math.round(STAGE.width * REFLET_RESOLUTION),
      height: Math.round(HORIZON * REFLET_RESOLUTION),
    })
    this.refletSprite.texture = this.refletTexture
    this.refletSprite.width = STAGE.width
    this.refletSprite.height = HORIZON
    // Retourné sous la voie : le pied du décor touche son reflet.
    this.refletSprite.position.set(0, HORIZON * 2)
  }

  resize(): void {
    this.cadrer()
  }

  /** The pointer, normalised to -1…1, for the sky parallax. */
  setPointer(x: number, y: number): void {
    if (this.reducedMotion) return
    this.sky?.setPointer(x, y)
  }

  /**
   * The journey, as the store sees it. Called again whenever it changes, so a
   * target redirected in flight simply extends the number of legs left.
   */
  setVoyage(enRoute: boolean, etapesRestantes: number): void {
    if (enRoute && !this.enRoute) this.phase = 0
    this.enRoute = enRoute
    this.etapesRestantes = etapesRestantes

    // Sans rendu animé — mouvement réduit (CONCEPT.md §11) ou pas de WebGL —
    // l'étape est franchie aussitôt. Sinon `arrived` ne partirait jamais, le
    // voyage ne finirait pas, et la gare n'arriverait jamais à quai.
    // Sans rendu animé, on ne relance le rattrapage que lorsque l'état a
    // vraiment changé : sinon un simple rappel consommerait une étape.
    if (enRoute && !this.peutAnimer && this.dernierSaut !== etapesRestantes) {
      this.dernierSaut = etapesRestantes
      queueMicrotask(() => this.emitter.emit('arrived'))
    }
    if (!enRoute) this.dernierSaut = -1
  }

  /** Distance travelled in legs, fractional: what the mountains turn with. */
  get legsParcourues(): number {
    return this.legsBase + (this.enRoute ? this.phase : 0)
  }

  /** False without WebGL, and false when the visitor asked for less movement. */
  private get peutAnimer(): boolean {
    return this.vivante && !this.reducedMotion
  }

  setLegs(legs: number): void {
    this.legsBase = legs
    this.mountains?.setLegs(this.legsParcourues)
  }

  /** Fades the colour of the night over about a second (CONCEPT.md §6). */
  setFond(hex: string): void {
    const depart = hexToUnit(fondToHex(this.fond))
    const arrivee = hexToUnit(fondToHex(hex))
    this.fond = hex
    const etat = { t: 0 }
    gsap.to(etat, {
      t: 1,
      duration: this.reducedMotion ? 0 : 1,
      ease: 'power1.inOut',
      onUpdate: () => {
        const melange = depart.map((c, i) => c + (arrivee[i] - c) * etat.t)
        const couleur =
          (Math.round(melange[0] * 255) << 16) |
          (Math.round(melange[1] * 255) << 8) |
          Math.round(melange[2] * 255)
        if (this.recolor) setRecolorFond(this.recolor, couleur)
        if (this.vivante) this.app.renderer.background.color = couleur
      },
    })
  }

  private tick(dt: number): void {
    if (!this.vivante) return

    if (this.enRoute && this.peutAnimer) {
      this.phase += dt / DUREE_ETAPE
      if (this.phase >= 1) {
        // La scène décompte elle-même : le store ne la rafraîchit qu'au tick
        // suivant, et s'en remettre à lui ferait franchir deux étapes d'affilée.
        this.etapesRestantes = Math.max(0, this.etapesRestantes - 1)
        this.legsBase += 1
        // Sur la dernière étape la phase reste à 1 : la remettre à zéro
        // relancerait la voie à pleine vitesse le temps d'une image.
        this.phase = this.etapesRestantes <= 0 ? 1 : 0
        this.emitter.emit('arrived')
      } else {
        this.emitter.emit('progress', this.phase)
      }
    }

    // Les montagnes tournent pendant l'étape, pas d'un cran à chaque gare.
    this.mountains?.setLegs(this.legsParcourues)
    this.sky?.update()
    this.train?.update(dt, this.phase, this.etapesRestantes <= 1, this.enRoute)
    this.rendreReflet()
  }

  private rendreReflet(): void {
    if (!this.refletTexture) return
    this.decor.scale.set(REFLET_RESOLUTION)
    this.app.renderer.render({ container: this.decor, target: this.refletTexture, clear: true })
    this.decor.scale.set(1)
  }

  dispose(): void {
    this.emitter.clear()
    this.refletTexture?.destroy(true)
    this.mountains?.destroy()
    this.train?.destroy()
    this.sky?.destroy()
    if (this.vivante) this.app.destroy(true, { children: true })
    this.vivante = false
  }
}
