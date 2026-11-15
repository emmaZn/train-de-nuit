import gsap from 'gsap'
import {
  Application,
  Container,
  FillGradient,
  Graphics,
  RenderTexture,
  Sprite,
  Texture,
} from 'pixi.js'
import { ColorMatrixFilter } from 'pixi.js'
import type { Filter } from 'pixi.js'
import { loadManifest } from './assets'
import { Birds } from './Birds'
import { Cables } from './CableLayer'
import { Quai } from './QuaiLayer'
import { ancreSuivante, legsDeLIle, solRestant } from './cables'
import { Terre } from './Terre'
import { Vitres } from './Vitres'
import { Fumee } from './Fumee'
import { GRAIN_ECRAN as REFLET_GRAIN, creerMasque } from './reflet'
import { Dissolve, grainsDePhrase, poigneeSansAnimation } from './Dissolve'
import type { Poignee } from './Dissolve'
import {
  DEGRADE_HAUTEUR,
  DEGRADE_OPACITE,
  DUREE_ETAPE,
  HORIZON,
  NUIT_CIEL,
  NUIT_PROFONDEUR,
  opaciteVoile,
  STAGE,
  ECHELLE_TRAIN,
  cadrageScene,
  versCadre,
  cadreDegrade,
} from './layout'
import type { Frame } from './layout'
import type { Relief } from './Relief'
import { DEFAUT, fondToHex } from './palette'
import { Sky } from './Sky'
import { Stars } from './StarLayer'
import type { Place } from './stars'
import { DEFILEMENT, Train, WAGONS, avancement, wagonX } from './Train'
import { createEmitter } from './events'
import type { Emitter, SceneEvents } from './events'
import { nuitDeLaGare } from './nuit'
import { createRecolorFilter, hexToUnit, setRecolorFond } from './recolor'
import { forwardSteps } from './types'
import type { Gare, Manifest, Trace } from './types'

// Le reflet est rendu à la taille du cadre : au demi, l'agrandissement
// rééchantillonnait son grain binaire en gris.
/**
 * Le reflet est rendu à la taille du cadre. Au demi, l'agrandissement
 * rééchantillonnait son grain binaire en gris — le défaut même que le masque
 * de `reflet.ts` existe pour éviter.
 */
const REFLET_RESOLUTION = 1

/**
 * Pose le conteneur qui porte tout le décor. `frame` vient de `cadrageScene` :
 * son `offsetY` porte le décalage que `cretePx` ajoute après `fitStage`.
 */
export function poserMonde(noeud: Container, frame: Frame): void {
  noeud.scale.set(frame.scale)
  noeud.position.set(frame.offsetX, frame.offsetY)
}

/**
 * Le contre-transport du ciel. Le ciel se mesure en pixels d'écran — c'est ce
 * que croient la place d'une étoile et son test de survol — mais il vit
 * maintenant dans `decor`, qui porte le cadre. Ceci annule `poserMonde` : un
 * enfant posé en (px, py) retombe sur le pixel d'écran (px, py).
 */
export function poserCiel(noeud: Container, frame: Frame): void {
  const k = 1 / frame.scale
  noeud.scale.set(k)
  noeud.position.set(-frame.offsetX * k, -frame.offsetY * k)
}

/** Un groupe qui s'assombrit : son conteneur, et le filtre qui le fait descendre. */
function groupeSombre(label: string): { groupe: Container; filtre: ColorMatrixFilter } {
  const groupe = new Container()
  groupe.label = label
  const filtre = new ColorMatrixFilter()
  // Éteint tant que la nuit est nulle : pas de passe de rendu en plein jour.
  filtre.enabled = false
  groupe.filters = [filtre]
  return { groupe, filtre }
}

/**
 * L'ordre des plans du décor, du fond vers l'avant : le massif, puis le ciel,
 * puis le **fond du plateau** (voile du pied, câbles, décor éteint du quai),
 * puis les **lumières**, puis le plateau (rails et train, terre, oiseaux),
 * puis les vitres. Le ciel passe donc **devant** la montagne et **derrière**
 * le train (CONCEPT.md §6).
 *
 * Toutes les places se réservent ici, en entier et tout de suite : le massif
 * arrive bien plus tard, et le ciel ne doit pas glisser devant lui en
 * attendant.
 *
 * **La règle des lumières** (spec §6.3) : ce qui s'éteint, c'est tout ce qui
 * n'est pas une lumière. Le massif, le ciel et les deux moitiés du plateau
 * portent chacun un filtre de luminance — il isole son groupe, ce qu'un
 * rectangle noir plein cadre ne ferait pas : il assombrirait aussi tout ce qui
 * est dessiné dessous. Le filtre de recoloration est sur `decor`, donc il
 * passe après : descendre vers le noir, c'est descendre vers la couleur du
 * fond. Le ciel reçoit `NUIT_CIEL` (le plus léger), les autres
 * `NUIT_PROFONDEUR`.
 *
 * **Où vont les lumières.** Ce commentaire a d'abord dit « après `vitres` » :
 * c'était faux, et le quai l'a montré. Le plateau porte la rame, donc tout ce
 * qui est monté après `vitres` se dessine **devant le train** — le réverbère
 * lui serait passé par-dessus à chaque départ d'« ailleurs ». Le plateau est
 * donc coupé en deux, et `lumieres` se glisse entre les deux moitiés : hors de
 * tout filtre, **devant** le voile du pied (spec §6.2, pour le faisceau de la
 * tâche 6) et **derrière** la rame. Les **vitres**, elles, appartiennent à la
 * rame et restent après elle.
 */
export function plansDuDecor(decor: Container): {
  massif: Container
  ciel: Container
  plateauFond: Container
  lumieres: Container
  plateau: Container
  vitres: Container
  nuit: {
    massif: ColorMatrixFilter
    ciel: ColorMatrixFilter
    plateauFond: ColorMatrixFilter
    plateau: ColorMatrixFilter
  }
} {
  const massif = groupeSombre('massif')
  const ciel = groupeSombre('ciel')
  const plateauFond = groupeSombre('plateau-fond')
  const lumieres = new Container()
  lumieres.label = 'lumieres'
  const plateau = groupeSombre('plateau')
  const vitres = new Container()
  vitres.label = 'vitres'
  decor.addChild(massif.groupe, ciel.groupe, plateauFond.groupe, lumieres, plateau.groupe, vitres)
  return {
    massif: massif.groupe,
    ciel: ciel.groupe,
    plateauFond: plateauFond.groupe,
    lumieres,
    plateau: plateau.groupe,
    vitres,
    nuit: {
      massif: massif.filtre,
      ciel: ciel.filtre,
      plateauFond: plateauFond.filtre,
      plateau: plateau.filtre,
    },
  }
}

/** Pose la nuit (0 à 1) sur les groupes filtrés : luminance = 1 - opacité du voile. */
export function appliquerNuit(plans: ReturnType<typeof plansDuDecor>, nuit: number): void {
  const regler = (f: ColorMatrixFilter, max: number) => {
    const luminance = 1 - opaciteVoile(nuit, max)
    f.enabled = luminance < 1
    f.brightness(luminance, false)
  }
  regler(plans.nuit.massif, NUIT_PROFONDEUR)
  regler(plans.nuit.ciel, NUIT_CIEL)
  regler(plans.nuit.plateauFond, NUIT_PROFONDEUR)
  regler(plans.nuit.plateau, NUIT_PROFONDEUR)
}

export type SceneOptions = { reducedMotion: boolean }

/**
 * Où une île est accrochée sur la ligne, et où elle est posée à l'écran.
 *
 * Les deux îles — les câbles de « plus loin », le quai d'« ailleurs » — ont
 * chacune la leur, et la même mécanique les déplace (spec §6.7 : deux ancres,
 * deux compteurs, une seule géométrie).
 */
type Ile = { ancre: number | null; distance: number | null }

export class Scene {
  private readonly canvas: HTMLCanvasElement
  private readonly reducedMotion: boolean
  private readonly app = new Application()
  private readonly emitter: Emitter<SceneEvents> = createEmitter<SceneEvents>()

  /** Everything that lives in the 2320x1217 stage frame. */
  private readonly monde = new Container()
  /** Mountains and train together: this is what the reflection mirrors. */
  private readonly decor = new Container()
  /**
   * Le massif, puis le ciel — poussière et étoiles-voyageuses. Le ciel est
   * dans `decor` pour partager son filtre de recoloration et passer sous le
   * voile du pied ; il sort du reflet, lui, à chaque image (`rendreReflet`).
   */
  private readonly plans = plansDuDecor(this.decor)
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
  /** La terre sous les rails : devant le reflet, devant le train. */
  private terre: Terre | null = null
  /** Les vitres allumées des wagons : dans `plans.vitres`, au-dessus du plateau assombri. */
  private vitres: Vitres | null = null
  /** La fumée de la locomotive. */
  private fumee: Fumee | null = null

  /** Les câbles et les bouvreuils de « plus loin ». */
  private cables: Cables | null = null
  private oiseaux: Birds | null = null
  /** Le quai d'« ailleurs » : la seconde île. */
  private quai: Quai | null = null
  private frameCourante: Frame | null = null

  /** Où le train est, ou d'où il part : le gag n'existe qu'à « plus loin ». */
  private gare: Gare = 'ici'

  /** À quel leg l'île de câbles est accrochée, et où est la prochaine. */
  private prochainPlusLoin: number | null = null
  /** Et de même pour le quai d'« ailleurs » : deux îles, deux ancres (spec §6.7). */
  private prochainAilleurs: number | null = null

  /**
   * Les étapes franchies, pour l'île de câbles **seule**.
   *
   * `legsParcourues` recule d'une étape à chaque départ — la phase reste à 1
   * à l'arrêt et la remettre à zéro efface l'étape finie. Le massif tourne
   * avec ce recul depuis toujours, et sa vitesse a été réglée à l'œil ainsi :
   * la corriger changerait un réglage validé. L'île, elle, a besoin d'un
   * compte qui ne revient jamais en arrière, et le tient de son côté.
   */
  private legsIle = 0

  /**
   * Le même compte, pour le quai — **monotone et à lui**.
   *
   * Deux îles, deux compteurs (spec §6.7). Ils avancent au même rythme
   * aujourd'hui, et c'est tant mieux : ce qui compte est qu'aucune des deux ne
   * dépende du compteur de l'autre, ni de `legsParcourues` qui recule d'une
   * étape à chaque départ.
   */
  private legsQuai = 0

  /**
   * Où chaque île est posée, en pixels de cadre devant sa gare.
   *
   * **Elle ne se recalcule pas.** Une île est une chose posée sur le sol :
   * une fois placée, elle suit le sol et rien d'autre. On ne la replace que
   * lorsqu'elle est entièrement hors de l'écran — c'est-à-dire quand personne
   * ne la regarde. Toute estimation se révise ; celle-ci ne se révise qu'à
   * l'abri des regards.
   */
  private readonly ilePlusLoin: Ile = { ancre: null, distance: null }
  private readonly ileAilleurs: Ile = { ancre: null, distance: null }
  /** Le grain qui retire des points au reflet, au lieu de le rendre pâle. */
  private readonly refletMasque = new Sprite()

  private fond = DEFAUT as string
  private phase = 0
  private enRoute = false
  private etapesRestantes = 0
  /** Où va le voyage : l'assombrissement la lit pour savoir si « ailleurs » est le terme. */
  private cible: Gare | null = null
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

    // Le ciel se mesure en pixels d'écran — un téléphone ne voit qu'un quart
    // de la largeur du cadre —, mais il se dessine entre le massif et le
    // train : `poserCiel` annule le cadre pour lui, et le reste du décor ne
    // change pas de repère.
    this.sky = new Sky(this.plans.ciel)
    this.stars = new Stars(this.plans.ciel, { reducedMotion: this.reducedMotion })
    this.app.stage.addChild(this.monde, this.dissous)

    this.refletSprite.scale.y = -1
    this.refletSprite.mask = this.refletMasque
    this.monde.addChild(this.refletMasque, this.refletSprite, this.decor)
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
    // Les places du massif et du ciel sont déjà prises (`plansDuDecor`) : ce
    // qu'on ajoute ici vient devant eux. S'il ne peut pas se construire, le
    // voile et le train sont là quand même.
    const fondDuDecor = this.plans.massif
    // Devant le ciel, et donc devant le massif : c'est ce qui détache le
    // trait blanc, et c'est aussi ce qui éteint la poussière près des rails.
    this.plans.plateauFond.addChild(this.voileDuPied())
    // Les câbles passent **derrière** la rame et les oiseaux **devant** : sinon
    // la chute traverse la silhouette du train et l'oiseau disparaît à
    // mi-course (cadrage §7.14).
    const planCables = new Container()
    this.plans.plateauFond.addChild(planCables)
    // Le quai d'« ailleurs » : son décor éteint au fond du plateau, ses
    // lumières — le réverbère, le cadre du panneau — dans `lumieres`, donc
    // devant le voile du pied et derrière la rame.
    const planQuai = new Container()
    this.plans.plateauFond.addChild(planQuai)
    this.quai = new Quai(planQuai, this.plans.lumieres)
    void this.quai.charger()
    this.train = new Train(this.plans.plateau, manifest)
    // Devant la voie et devant le train : c'est le sol sur lequel il roule.
    this.terre = new Terre(this.plans.plateau)
    const planOiseaux = new Container()
    this.plans.plateau.addChild(planOiseaux)
    this.cables = new Cables(planCables)
    this.oiseaux = new Birds(planOiseaux, this.cables, { reducedMotion: this.reducedMotion })
    this.oiseaux.surChute = () => this.emitter.emit('birdFell')
    void this.oiseaux.charger()
    this.cadrer()

    // La boucle du train d'abord : c'est elle qu'on voit en arrivant.
    await this.train.load()

    // Les vitres sont posées par-dessus les wagons, à leur place : elles suivent
    // son échelle et sa place sans rien avoir à recalculer.
    const spec = manifest.train
    const positions = Array.from({ length: WAGONS }, (_, i) =>
      wagonX(spec.loco, spec.wagon, i + 1),
    )
    // Hors du plateau filtré, donc allumées : le plan `vitres` prend la place
    // et l'échelle de la rame, qui ne bougent plus une fois posées.
    const rame = this.train.rameContainer
    this.plans.vitres.scale.copyFrom(rame.scale)
    this.plans.vitres.position.copyFrom(rame.position)
    this.vitres = new Vitres(this.plans.vitres, manifest, positions, this.reducedMotion)
    // La fumée vit dans la rame : la cheminée est à ses coordonnées
    // du cadre source, et l'échelle du train s'applique toute seule.
    // La fumée sort de la cheminée, donc elle vit dans la rame elle aussi.
    this.fumee = new Fumee(this.train.rameContainer, this.reducedMotion)
    this.cadrer()

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
  /**
   * La plus grande texture que le GPU accepte : c'est elle qui décide au bout
   * de combien de temps la bande de terre se répète. Au repli de 4096 texels,
   * le motif revient toutes les neuf secondes — soit une fois par étape.
   */
  private tailleMaxTexture(): number {
    const gl = (this.app.renderer as unknown as { gl?: WebGL2RenderingContext }).gl
    const max = gl?.getParameter(gl.MAX_TEXTURE_SIZE)
    return typeof max === 'number' && max > 0 ? Math.min(max, 16384) : 4096
  }

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
    const { frame, echelle } = cadrageScene(width, height)
    this.frameCourante = frame
    poserMonde(this.monde, frame)
    // Le ciel vit dans le décor mais compte en pixels d'écran : son
    // contre-transport se refait à chaque cadrage, comme celui du monde.
    poserCiel(this.plans.ciel, frame)

    this.sky?.resize(frame, width, height, width < 720)
    this.stars?.setStars(this.traces, width, height)
    this.stars?.resize(width, height)
    // La place d'une étoile est une fraction, sa cible des pixels : une
    // dissolution en cours doit suivre l'écran.
    for (const d of this.dissolutions) d.resize(width, height)
    this.relief?.cadrer(frame, width, height, this.app.renderer.resolution, echelle)
    // Le grain de la terre se mesure en texels du rendu : il se refait quand
    // le cadre ou la densité de pixels change.
    this.terre?.cadrer(frame, this.app.renderer.resolution, this.tailleMaxTexture())
    this.cables?.cadrer(frame, this.app.renderer.resolution)
    this.quai?.cadrer(frame, this.app.renderer.resolution)
    this.oiseaux?.cadrer(frame, this.app.renderer.resolution, width)
    this.vitres?.cadrer(frame, this.app.renderer.resolution)
    this.fumee?.cadrer(frame, this.app.renderer.resolution)

    this.refletTexture?.destroy(true)
    this.refletTexture = RenderTexture.create({
      width: Math.round(STAGE.width * REFLET_RESOLUTION),
      height: Math.round(HORIZON * REFLET_RESOLUTION),
    })
    // Au plus proche voisin : agrandi, un grain binaire doit le rester.
    this.refletTexture.source.scaleMode = 'nearest'
    this.refletSprite.texture = this.refletTexture
    this.refletSprite.width = STAGE.width
    this.refletSprite.height = HORIZON

    // Le masque de grain, à la densité de pixels de l'écran.
    const k = frame.scale * this.app.renderer.resolution
    const cellule = Math.max(1, Math.round(REFLET_GRAIN * this.app.renderer.resolution))
    this.refletMasque.texture?.destroy(true)
    const masque = Texture.from(
      creerMasque(
        Math.round(STAGE.width * k),
        Math.round(HORIZON * k),
        cellule,
        k,
      ),
    )
    masque.source.scaleMode = 'nearest'
    this.refletMasque.texture = masque
    this.refletMasque.setSize(STAGE.width, HORIZON)
    this.refletMasque.position.set(0, HORIZON)
    // Retourné sous la voie : le pied du décor touche son reflet.
    this.refletSprite.position.set(0, HORIZON * 2)
  }

  resize(): void {
    this.cadrer()
  }

  /**
   * Un clic, en pixels CSS. Rend `true` s'il a touché un oiseau — l'appelant
   * sait alors qu'il ne doit pas aussi ouvrir la bulle d'une étoile.
   */
  clicPx(px: number, py: number): boolean {
    const f = this.frameCourante
    if (!f || !this.oiseaux || !this.gagOuvert) return false
    const cadre = versCadre(px, py, f)
    return this.oiseaux.cliquer(cadre.x, cadre.y)
  }

  /**
   * Quelle gare le train vient de quitter — ou celle où il est à quai. La
   * scène n'en a besoin que pour savoir où est « plus loin » sur la ligne ;
   * elle ne lit aucun magasin.
   */
  setGare(gare: Gare): void {
    this.gare = gare
    this.prochainPlusLoin = this.legsIle + forwardSteps(gare, 'plus-loin')
    this.prochainAilleurs = this.legsQuai + forwardSteps(gare, 'ailleurs')
  }

  /**
   * Le gag n'est ouvert qu'à quai, et qu'à « plus loin ».
   *
   * Ailleurs, un visiteur au clavier brûlerait les quatorze phrases ordonnées
   * sans rien voir tomber ; en marche, l'oiseau visé n'est plus là quand la
   * chute se jouerait (cadrage §7.6).
   */
  get gagOuvert(): boolean {
    return !this.enRoute && this.gare === 'plus-loin'
  }

  /**
   * Le chemin du clavier : faire tomber un oiseau sans en viser un.
   *
   * Sans WebGL il n'y a pas d'oiseau à faire tomber — mais la réplique sort
   * quand même. C'est le seul endroit du site où l'on apprend qui est
   * Emmanuelle : le contenu est le but, la chute est le plaisir. La scène a
   * déjà ce réflexe ailleurs (`beginDissolve` sans animation, le rattrapage de
   * `setVoyage`).
   */
  faireTomberUnOiseau(): boolean {
    if (!this.gagOuvert) return false
    if (!this.oiseaux) {
      this.emitter.emit('birdFell')
      return true
    }
    return this.oiseaux.faireTomberUn()
  }

  /**
   * Ce que la prochaine chute doit jouer. Vue le pousse en avance, parce que
   * la pirouette part avant que la phrase ne soit choisie (cadrage §7.7).
   */
  setProchaineVariante(v: { pirouette: boolean; regard: boolean }): void {
    if (this.oiseaux) this.oiseaux.variante = v
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
  setVoyage(enRoute: boolean, etapesRestantes: number, cible: Gare | null = null): void {
    if (enRoute && !this.enRoute) {
      this.phase = 0
      this.profil = { demarrage: true, freinage: etapesRestantes <= 1 }
    }
    this.enRoute = enRoute
    this.etapesRestantes = etapesRestantes
    this.cible = cible

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
  /** Le compte de l'île, fraction comprise : il ne revient jamais en arrière. */
  private get legsIleParcourues(): number {
    return legsDeLIle(this.legsIle, this.phase, this.avancementEtape)
  }

  /** Le même, pour le quai : son propre compteur, jamais celui des câbles. */
  private get legsQuaiParcourues(): number {
    return legsDeLIle(this.legsQuai, this.phase, this.avancementEtape)
  }

  /**
   * Où une île se pose, cette image-ci. Partagé par les deux : le sol qui reste
   * jusqu'à sa gare, et non une position absolue — le sol parcouru n'est pas le
   * même selon qu'on y arrive en une étape ou en deux (cadrage §7.12).
   *
   * L'ancre ne change qu'une fois l'île sortie du champ : sinon le décor se
   * téléporterait de l'autre côté de la boucle au changement de gare. Et on ne
   * replace l'île que si personne ne peut la voir bouger : jamais posée, ancre
   * changée, ou entièrement hors champ. Sinon elle suit le sol, et rien que le
   * sol.
   */
  private suivreIle(
    ile: Ile,
    prochain: number,
    parcouru: number,
    horsChamp: (distance: number) => boolean,
    dt: number,
  ): void {
    const ancreAvant = ile.ancre
    ile.ancre = ancreSuivante(ile.ancre, prochain, parcouru)
    const restant = ile.ancre - parcouru
    const estimation =
      restant > 0
        ? solRestant(
            restant,
            this.etapesRestantes,
            // À l'arrêt, l'étape à venir n'est pas encore décidée : on la
            // prend telle qu'elle sera au départ.
            this.enRoute ? this.profil : { demarrage: true, freinage: true },
          )
        : null

    const posee = ile.distance
    const posable = posee === null || ile.ancre !== ancreAvant || horsChamp(posee)
    if (posable && estimation !== null) {
      ile.distance = estimation
    } else {
      ile.distance = (posee ?? 0) - dt * DEFILEMENT * ECHELLE_TRAIN * (this.train?.vitesse ?? 0)
    }
  }

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
        // Vue écoute pour écrire `--fond` au même rythme : tout ce qui est en
        // CSS — la tache de nuit du formulaire, celle de la bulle — fond avec
        // la scène au lieu de sauter d'une image.
        this.emitter.emit('fond', '#' + couleur.toString(16).padStart(6, '0'))
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
        this.legsIle += 1
        this.legsQuai += 1
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
    // Même horloge que la voie, à la distance et non au temps.
    this.terre?.avancer(dt, this.train?.vitesse ?? 0)
    // Les deux îles se calent sur le sol qui reste jusqu'à leur gare.
    // Rien avant de savoir d'où l'on part : sinon la toute première image
    // ancre l'île à « distance zéro », c'est-à-dire à quai, où qu'on soit.
    if (this.prochainPlusLoin !== null) {
      this.suivreIle(
        this.ilePlusLoin,
        this.prochainPlusLoin,
        this.legsIleParcourues,
        (d) => this.cables?.horsChamp(d) ?? true,
        dt,
      )
      this.cables?.placer(this.ilePlusLoin.distance ?? 0)
    }
    if (this.prochainAilleurs !== null) {
      this.suivreIle(
        this.ileAilleurs,
        this.prochainAilleurs,
        this.legsQuaiParcourues,
        (d) => this.quai?.horsChamp(d) ?? true,
        dt,
      )
    }
    this.cables?.avancer(dt)
    this.oiseaux?.avancer(dt)
    // Le vacillement suit l'horloge et non la distance : une lampe ne s'arrête
    // pas quand le train s'arrête.
    this.vitres?.update(dt)
    const nuit = this.assombrir()
    // Le quai suit le sol comme les câbles, et lit la nuit : ses lumières ne
    // s'éteignent pas, mais le halo de sa lanterne monte avec elle.
    // Rien tant qu'on ne sait pas d'où l'on part : une île posée quand même
    // s'ancrerait à « distance zéro », c'est-à-dire à quai, où qu'on soit.
    if (this.ileAilleurs.distance !== null) {
      this.quai?.avancer(this.ileAilleurs.distance, nuit)
    }
    // La fumée dérive avec la vitesse, pas avec l'horloge.
    this.fumee?.update(dt, this.train?.vitesse ?? 0)
    this.rendreReflet()
  }

  /**
   * La nuit de la gare, lue dans l'état du voyage, devient la luminance des
   * groupes filtrés. Rendue aussi telle quelle : le quai en a besoin, et la
   * relire d'ailleurs la ferait diverger d'une image.
   */
  private assombrir(): number {
    const nuit = nuitDeLaGare({
      gare: this.gare,
      cible: this.cible,
      enRoute: this.enRoute,
      phase: this.phase,
      derniereEtape: this.etapesRestantes <= 1,
      reducedMotion: this.reducedMotion,
    })
    appliquerNuit(this.plans, nuit)
    return nuit
  }

  /**
   * Le reflet ne prend pas le ciel. L'eau renvoie le massif et le train —
   * les choses solides. La poussière, elle, couvre déjà tout l'écran, reflet
   * compris : la renvoyer y dessinerait une seconde fois le même grain,
   * retourné. Et les étoiles-voyageuses y laisseraient des sosies qui ne
   * répondent à rien, juste sous la voie — précisément la zone que
   * `regionCiel` leur interdit pour qu'on ne les y cherche pas.
   */
  private rendreReflet(): void {
    if (!this.refletTexture) return
    this.plans.ciel.visible = false
    this.decor.scale.set(REFLET_RESOLUTION)
    this.app.renderer.render({ container: this.decor, target: this.refletTexture, clear: true })
    this.decor.scale.set(1)
    this.plans.ciel.visible = true
  }

  dispose(): void {
    this.oiseaux?.destroy()
    this.cables?.destroy()
    this.quai?.destroy()
    this.fumee?.destroy()
    this.vitres?.destroy()
    this.terre?.destroy()
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
