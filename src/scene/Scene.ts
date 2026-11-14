import gsap from 'gsap'
import { Application, BlurFilter, Container, FillGradient, Graphics, RenderTexture, Sprite } from 'pixi.js'
import type { Filter } from 'pixi.js'
import { loadManifest } from './assets'
import { Dissolve, grainsDePhrase, poigneeSansAnimation } from './Dissolve'
import type { Poignee } from './Dissolve'
import {
  DEGRADE_HAUTEUR,
  DEGRADE_OPACITE,
  DUREE_ETAPE,
  HORIZON,
  STAGE,
  cadrageScene,
  cadreDegrade,
} from './layout'
import type { Frame } from './layout'
import type { Relief } from './Relief'
import { DEFAUT, fondToHex } from './palette'
import { Sky } from './Sky'
import { Stars } from './StarLayer'
import type { Place } from './stars'
import { Train, avancement } from './Train'
import { createEmitter } from './events'
import type { Emitter, SceneEvents } from './events'
import { createRecolorFilter, hexToUnit, setRecolorFond } from './recolor'
import type { Manifest, Trace } from './types'

/** The reflection is rendered at half resolution: it is blurred anyway. */
const REFLET_RESOLUTION = 0.5
const REFLET_OPACITE = 0.16

/**
 * Pose le conteneur qui porte tout le décor. `frame` vient de `cadrageScene` :
 * son `offsetY` porte le décalage que `cretePx` ajoute après `fitStage`.
 */
export function poserMonde(noeud: Container, frame: Frame): void {
  noeud.scale.set(frame.scale)
  noeud.position.set(frame.offsetX, frame.offsetY)
}

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
  /** Les grains des phrases qui se défont : au-dessus de tout le reste. */
  private readonly dissous = new Container()
  private readonly dissolutions = new Set<Dissolve>()

  private sky: Sky | null = null
  private stars: Stars | null = null
  /** Kept so stars set before init, or between resizes, are not lost. */
  private traces: Trace[] = []
  private relief: Relief | null = null
  private train: Train | null = null
  private recolor: Filter | null = null

  private fond = DEFAUT as string
  private phase = 0
  private enRoute = false
  private etapesRestantes = 0
  /** Whole legs travelled; the fraction of the current one is `phase`. */
  private legsBase = 0
  /**
   * Ce que fait le train sur l'étape en cours. Figé à son début : une cible
   * redirigée en plein freinage changerait sinon le profil au milieu, et le
   * massif reculerait d'un cheveu.
   */
  private profil = { demarrage: false, freinage: false }
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

    // Stars live in screen space, behind the stage frame that covers the
    // viewport: a phone shows only a quarter of that frame's width.
    // La poussière aussi : elle ne se dessine que dans la région libre, qui
    // se mesure en pixels d'écran.
    this.sky = new Sky(this.app.stage)
    this.stars = new Stars(this.app.stage, { reducedMotion: this.reducedMotion })
    this.app.stage.addChild(this.monde, this.dissous)

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
    // Sans `await` : le chargement des assets ne doit retarder ni la couleur
    // mémorisée, ni le parallax, ni le premier cadrage.
    if (manifest) void this.peupler(manifest)
  }

  private async peupler(manifest: Manifest): Promise<void> {
    // L'ordre des plans se réserve d'abord, et en entier : le massif arrive
    // plus tard, mais sa place est prise. S'il ne peut pas se construire, le
    // voile et le train sont là quand même.
    const fondDuDecor = new Container()
    this.decor.addChild(fondDuDecor)
    // Entre le massif et le train : c'est ce qui détache le trait blanc.
    this.decor.addChild(this.voileDuPied())
    this.train = new Train(this.decor, manifest)

    // La boucle du train d'abord : c'est elle qu'on voit en arrivant.
    await this.train.load()

    let relief: Relief | null = null
    try {
      // Three n'est chargé qu'ici : il pèse 130 Ko compressés, dont la
      // couleur mémorisée, le parallax et le premier cadrage n'ont que faire.
      const { Relief } = await import('./Relief')
      relief = new Relief(fondDuDecor)
      this.relief = relief
      await relief.charger(manifest)
      // Le relief n'existait pas au premier cadrage : sans ce rappel, il
      // rendrait à la taille du cadre et non à celle de l'écran, c'est-à-dire
      // agrandi — précisément ce qu'on vient de supprimer.
      this.cadrer()
    } catch (erreur) {
      // Three demande WebGL 2 ; Pixi se contente de moins. La scène garde
      // alors sa voie et son train plutôt que de ne rien montrer — mais on
      // le dit : une retombée silencieuse cache un bug aussi bien qu'une
      // limite du navigateur.
      console.error('[scène] le massif n’a pas pu être construit :', erreur)
      relief?.detruire()
      this.relief = null
    }
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
    // `frame.offsetY` porte le décalage : `cretePx` l'ajoute après `fitStage`,
    // et c'est ce même conteneur qui porte massif, voile, rails et train.
    const { frame, decalage, echelle } = cadrageScene(width, height)
    poserMonde(this.monde, frame)

    this.sky?.resize(frame, width, height, width < 720, echelle, decalage)
    this.stars?.setStars(this.traces, width, height)
    this.stars?.resize(width, height)
    // La place d'une étoile est une fraction, sa cible des pixels : une
    // dissolution en cours doit suivre l'écran.
    for (const d of this.dissolutions) d.resize(width, height)
    this.relief?.cadrer(frame, width, height, this.app.renderer.resolution, echelle)

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

  /** The visitors' stars. Called again whenever the store changes. */
  setStars(traces: Trace[]): void {
    this.traces = traces
    if (!this.vivante) return
    const { width, height } = this.app.screen
    this.stars?.setStars(traces, width, height)
  }

  /**
   * La phrase se défait en grains (CONCEPT.md §4.3). L'écriture est déjà
   * partie : la poignée dit comment elle a fini — `land` allume l'étoile,
   * `revert` reforme la phrase —, et la première des deux l'emporte.
   *
   * **L'appelant doit toujours conclure**, par `land` ou par `revert` passé
   * son délai : une poignée abandonnée laisse ses grains à l'écran jusqu'au
   * `dispose` de la scène.
   *
   * `land` pose l'étoile lui-même. Le magasin qui pousse ensuite la même
   * trace par `setStars` ne la repose pas : `Stars.setStars` est idempotent
   * par `id`.
   */
  beginDissolve(phrase: string, from: DOMRect, place: Place): Poignee {
    const allumer = (trace: Trace) => {
      this.setStars([trace, ...this.traces.filter((t) => t.id !== trace.id)])
    }
    // Mouvement réduit, ou pas de WebGL : l'horloge de la scène ne tourne
    // pas, une dissolution animée ne finirait jamais. L'étoile se pose.
    if (!this.peutAnimer) return poigneeSansAnimation(allumer)

    const { width, height } = this.app.screen
    const dissolution = new Dissolve({
      depuis: from,
      place,
      parent: this.dissous,
      viewportW: width,
      viewportH: height,
      grains: grainsDePhrase(phrase, from),
      allumer,
    })
    this.dissolutions.add(dissolution)
    return dissolution
  }

  /** The pointer in CSS pixels: tells which star, if any, it is over. */
  setPointerPx(px: number, py: number): void {
    const trace = this.stars?.hit(px, py) ?? null
    this.emitter.emit('starHover', trace, px, py)
  }

  /**
   * The journey, as the store sees it. Called again whenever it changes, so a
   * target redirected in flight simply extends the number of legs left.
   */
  setVoyage(enRoute: boolean, etapesRestantes: number): void {
    if (enRoute && !this.enRoute) {
      this.phase = 0
      this.profil = { demarrage: true, freinage: etapesRestantes <= 1 }
    }
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

  /**
   * Part de l'étape déjà parcourue, en distance et non en temps. Tout ce qui
   * suit le train s'y accroche — le massif comme la frise — pour que la scène
   * entière démarre et s'arrête d'un seul mouvement.
   */
  private get avancementEtape(): number {
    return avancement(this.phase, this.profil.demarrage, this.profil.freinage)
  }

  /** Distance parcourue, en étapes : c'est elle qui fait tourner le massif. */
  get legsParcourues(): number {
    if (!this.enRoute) return this.legsBase
    return this.legsBase + this.avancementEtape
  }

  /** False without WebGL, and false when the visitor asked for less movement. */
  private get peutAnimer(): boolean {
    return this.vivante && !this.reducedMotion
  }

  setLegs(legs: number): void {
    this.legsBase = legs
    // Appelé par le store, hors rendu : on retient, on ne dessine pas.
    this.relief?.setLegs(this.legsParcourues)
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
        if (this.etapesRestantes <= 0) {
          // Dernière étape : la phase reste à 1, sans quoi la voie repartirait
          // à pleine vitesse le temps d'une image. La distance vaut donc déjà
          // `legsBase + 1` — l'incrémenter en plus compterait l'étape deux
          // fois, et le massif sauterait d'une étape entière sur une image.
          this.phase = 1
        } else {
          this.legsBase += 1
          this.phase = 0
          // Les gares de passage se franchissent à vitesse constante : le
          // train ne s'arrête qu'au terminus.
          this.profil = { demarrage: false, freinage: this.etapesRestantes <= 1 }
        }
        this.emitter.emit('arrived')
      } else {
        // La frise suit la distance, pas l'horloge : sans ça elle continuerait
        // de défiler à vitesse constante pendant que le train freine.
        this.emitter.emit('progress', this.avancementEtape)
      }
    }

    // Le massif tourne pendant l'étape, pas d'un cran à chaque gare.
    this.relief?.setLegs(this.legsParcourues)
    this.relief?.dessiner()
    this.sky?.update()
    this.stars?.update(dt, Date.now())
    for (const d of this.dissolutions) {
      d.update(dt)
      if (d.fini) this.dissolutions.delete(d)
    }
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
    this.relief?.detruire()
    this.train?.destroy()
    this.sky?.destroy()
    this.stars?.destroy()
    for (const d of this.dissolutions) d.destroy()
    this.dissolutions.clear()
    if (this.vivante) this.app.destroy(true, { children: true })
    this.vivante = false
  }
}
