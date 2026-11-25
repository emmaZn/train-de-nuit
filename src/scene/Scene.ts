import gsap from 'gsap'
import {
  Application,
  Container,
  FillGradient,
  Graphics,
  Matrix,
  RenderTexture,
  Sprite,
  Texture,
} from 'pixi.js'
import type { Filter } from 'pixi.js'
import { loadManifest } from './assets'
import { Birds } from './Birds'
import { Cables } from './CableLayer'
import { Quai } from './QuaiLayer'
import { Rideau } from './rideau'
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
  MONDE,
  NUIT_PROFONDEUR,
  opaciteVoile,
  ECHELLE_TRAIN,
  cadrageScene,
  versCadre,
  cadreDegrade,
  SEUIL_MOBILE,
} from './layout'
import type { Frame } from './layout'
import type { Relief } from './Relief'
import { COULEURS, DEFAUT, fondToHex } from './palette'
import { Sky } from './Sky'
import { Stars } from './StarLayer'
import type { Place } from './stars'
import { DEFILEMENT, Train, WAGONS, avancement, enMarche, wagonX } from './Train'
import { createEmitter } from './events'
import type { Emitter, SceneEvents } from './events'
import { Neige } from './NeigeLayer'
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

/** Un plan du décor : un conteneur nommé, pour qu'un test puisse le dire. */
function plan(label: string): Container {
  const groupe = new Container()
  groupe.label = label
  return groupe
}

/**
 * Ce que la nuit assombrit, et de combien.
 *
 * **Des porteurs, et non un conteneur par groupe.** Un filtre isolait son
 * groupe ; `Container.tint` isole de même — Pixi v8 l'hérite par sous-arbre et
 * l'applique à la couleur de sommet de chaque renderable, sans cible de rendu
 * intermédiaire, donc sans passe. Mais il se **multiplie** en descendant : un
 * enfant ne peut pas défaire la teinte de son parent (0x8c8c8c × 0xffffff =
 * 0x8c8c8c). Exempter les vitres, c'est donc n'en teindre **aucun ancêtre** —
 * et comme elles vivent au milieu de la rame, entre le corps des wagons et la
 * fumée, la teinte descend sur les trois bandes au lieu de couvrir le plateau
 * d'un bloc.
 *
 * `profond` rassemble ce qui descend à `NUIT_PROFONDEUR` : le massif, le fond
 * du plateau, et tout ce que `peupler` monte dans le plateau sauf les vitres.
 * `ciel` descend à `NUIT_CIEL`, plus légèrement.
 */
export type Nuit = { profond: Container[]; ciel: Container[] }

export type Plans = {
  massif: Container
  ciel: Container
  plateauFond: Container
  lumieres: Container
  plateau: Container
  neige: Container
  nuit: Nuit
}

/**
 * L'ordre des plans du décor, du fond vers l'avant : le massif, puis le ciel,
 * puis le **fond du plateau** (voile du pied, câbles, décor éteint du quai),
 * puis les **lumières**, puis le plateau (rails, train, vitres, fumée, terre,
 * oiseaux), puis la **neige**, qui tombe devant tout, rame comprise (spec §6).
 * Le ciel passe donc **devant** la montagne et **derrière** le train
 * (CONCEPT.md §6).
 *
 * Toutes les places se réservent ici, en entier et tout de suite : le massif
 * arrive bien plus tard, et le ciel ne doit pas glisser devant lui en
 * attendant.
 *
 * **La règle des lumières** (spec §6.3) : ce qui s'éteint, c'est tout ce qui
 * n'est pas une lumière. Le massif, le ciel et le fond du plateau portent leur
 * teinte ici ; ce qui peuple le plateau porte la sienne, plan par plan, parce
 * que les vitres allumées sont au milieu de la rame (voir `Nuit`). Le filtre
 * de recoloration est sur `decor`, donc il passe après : descendre vers le
 * noir, c'est descendre vers la couleur du fond.
 *
 * **Où vont les lumières.** Ce commentaire a d'abord dit « après `vitres` » :
 * c'était faux, et le quai l'a montré. Le plateau porte la rame, donc tout ce
 * qui est monté après lui se dessine **devant le train** — le réverbère lui
 * serait passé par-dessus à chaque départ d'« ailleurs ». Le plateau est donc
 * coupé en deux, et `lumieres` se glisse entre les deux moitiés : hors de
 * toute teinte, **devant** le voile du pied (spec §6.2, pour le faisceau de la
 * tâche 6) et **derrière** la rame.
 */
export function plansDuDecor(decor: Container): Plans {
  const massif = plan('massif')
  const ciel = plan('ciel')
  const plateauFond = plan('plateau-fond')
  const lumieres = plan('lumieres')
  const plateau = plan('plateau')
  // La neige passe devant la rame, comme la neige le fait — et elle n'entre
  // dans aucune liste de `nuit` : elle est blanche, la teinte la grisaillerait.
  const neige = plan('neige')
  decor.addChild(massif, ciel, plateauFond, lumieres, plateau, neige)
  return {
    massif,
    ciel,
    plateauFond,
    lumieres,
    plateau,
    neige,
    // Le plateau n'est pas là : ses porteurs s'inscrivent dans `peupler`,
    // un par un (`planSombre`), parce que les vitres sont au milieu.
    nuit: { profond: [massif, plateauFond], ciel: [ciel] },
  }
}

/**
 * Prépare le décor pour le reflet, rend, et **remet tout en place** : les
 * plans que l'eau ne renvoie pas et l'échelle du reflet.
 *
 * Le ciel en sort parce que sa poussière couvre déjà le reflet et s'y
 * dessinerait une seconde fois, retournée ; la neige, parce que des flocons
 * retournés **monteraient** dans l'eau au lieu d'y tomber.
 *
 * Tout ce qui est posé ici est défait dans le même `finally` : un rendu qui
 * jette laisserait sinon le décor à l'échelle du reflet pour le reste de la
 * session — une avarie pire que celle dont on se garde.
 *
 * C'est une fonction, et non six lignes dans `rendreReflet`, pour que ce qui
 * en sort se vérifie sans WebGL.
 */
export function horsDuReflet(
  plans: Plans,
  decor: Container,
  echelle: number,
  rendre: () => void,
  aussi: Container[] = [],
): void {
  // `aussi` : ce qui sort du reflet sans que son plan en sorte — la neige du
  // faisceau, qui vit dans `lumieres` à côté du cône peint (lui se reflète).
  const caches = [plans.ciel, plans.neige, ...aussi]
  const avant = caches.map((c) => c.visible)
  for (const plan of caches) plan.visible = false
  decor.scale.set(echelle)
  try {
    rendre()
  } finally {
    decor.scale.set(1)
    caches.forEach((plan, i) => {
      plan.visible = avant[i]
    })
  }
}

/** La teinte d'une nuit donnée : un gris qui multiplie vers le noir. */
export function grisDeNuit(nuit: number, max: number): number {
  const luminance = 1 - opaciteVoile(nuit, max)
  const canal = Math.round(Math.min(1, Math.max(0, luminance)) * 255)
  return (canal << 16) | (canal << 8) | canal
}

/** Pose la nuit (0 à 1) sur les porteurs : teinte = 1 - opacité du voile. */
export function appliquerNuit(plans: { nuit: Nuit }, nuit: number): void {
  const teindre = (porteurs: Container[], max: number) => {
    const gris = grisDeNuit(nuit, max)
    for (const porteur of porteurs) porteur.tint = gris
  }
  teindre(plans.nuit.profond, NUIT_PROFONDEUR)
  teindre(plans.nuit.ciel, NUIT_CIEL)
}

/**
 * Un plan qui s'assombrit, créé et **inscrit d'un seul geste**.
 *
 * Le plateau ne porte pas de teinte (voir `Nuit`) : ce qu'on y monte sans
 * passer par ici resterait allumé en pleine nuit. C'est le prix de l'exemption
 * des vitres, et c'est pour ça que la création et l'inscription ne se séparent
 * pas.
 */
export function planSombre(plans: Plans, parent: Container, label: string): Container {
  const plan = new Container()
  plan.label = label
  parent.addChild(plan)
  plans.nuit.profond.push(plan)
  return plan
}

/**
 * Le train sur le plateau, et ce qu'il donne à la nuit.
 *
 * Ses deux porteurs — la voie et le corps de la rame — existent dès la
 * construction, bien avant les textures : un lien partagé vers « ailleurs »
 * est sombre dès la première image, et les rails arrivent au bout d'un `await`.
 */
export function monterLeTrain(
  plans: Plans,
  manifest: Manifest,
  viewportW: number,
  viewportH: number,
): Train {
  const train = new Train(plans.plateau, manifest, viewportW, viewportH)
  plans.nuit.profond.push(...train.sombres)
  return train
}

/**
 * Les trois bandes de la rame, dans cet ordre : le **corps** des wagons
 * (teinté par `Train`), les **vitres** allumées, la **fumée**.
 *
 * C'est l'ordre d'avant cette étape, et il n'aurait jamais dû changer. Les
 * bouffées sont de la couleur du fond et leur métier est de **masquer** ce
 * qu'elles traversent (CONCEPT.md §6) : passées derrière les vitres, elles s'en
 * laissaient transpercer. Les vitres, elles, n'ont rien à recopier de la rame —
 * elles en héritent la place et l'échelle — et ce sont les seules de la scène à
 * ne porter aucune teinte, ni sur elles ni sur un ancêtre.
 */
export function monterLaRame(
  plans: Plans,
  train: Train,
  manifest: Manifest,
  reducedMotion: boolean,
): { vitres: Vitres; fumee: Fumee } {
  const spec = manifest.train
  const positions = Array.from({ length: WAGONS }, (_, i) => wagonX(spec.loco, spec.wagon, i + 1))
  const rame = train.rameContainer
  const vitres = new Vitres(rame, manifest, positions, reducedMotion)
  // La fumée sort de la cheminée, donc elle vit dans la rame elle aussi.
  // Elle n'est pas une lumière : elle porte sa teinte.
  const fumee = new Fumee(planSombre(plans, rame, 'fumee'), reducedMotion)
  return { vitres, fumee }
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
  /** La neige d'« ailleurs » : devant la rame, et hors du reflet. */
  private neige: Neige | null = null
  /** Kept so stars set before init, or between resizes, are not lost. */
  private traces: Trace[] = []
  private relief: Relief | null = null
  private train: Train | null = null
  private recolor: Filter | null = null
  /** La terre sous les rails : devant le reflet, devant le train. */
  private terre: Terre | null = null
  /** Les vitres allumées des wagons : dans la rame, et seules à n'être pas teintées. */
  private vitres: Vitres | null = null
  /** La fumée de la locomotive. */
  private fumee: Fumee | null = null

  /** Les câbles et les bouvreuils de « plus loin ». */
  private cables: Cables | null = null
  private oiseaux: Birds | null = null
  /** Le quai d'« ailleurs » : la seconde île. */
  private quai: Quai | null = null
  /**
   * Le rideau des départs : à la scène, pas à la gare. Il ne dessine plus rien
   * — la plaque est en DOM (spec §4) — et ne tient qu'un état et une position,
   * que la scène émet. La gare qui défile ne l'emporte donc pas : il n'a pas
   * d'abscisse du tout.
   */
  private rideau: Rideau | null = null
  /** Ce que le rideau a dit en dernier : on ne répète pas une position qui n'a pas changé. */
  private rideauEmis: { y: number; baisse: boolean } | null = null
  /** Le dernier état du réverbère dit à Vue : on ne répète pas ce qu'on a déjà dit. */
  private reverbereEmis: boolean | null = null
  private frameCourante: Frame | null = null

  /**
   * Le visiteur a-t-il trouvé le rideau ? Le battement de l'horloge n'existe que
   * pour le lui apprendre : il se tait dès le premier geste, par l'horloge ou
   * par le bouton du DOM, et ne revient pas.
   */
  private rideauTrouve = false
  /** Le train est-il à quai devant l'horloge — pour ne battre qu'à l'**arrêt**, pas à chaque rappel. */
  private arretDevantHorloge = false

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

  private fond = COULEURS[DEFAUT].fond as string
  private phase = 0
  /**
   * L'arrivée du voyage en cours a-t-elle déjà été annoncée ?
   *
   * Au terminus, `tick` épingle `phase` à 1 pour que la voie ne reparte pas à
   * pleine vitesse — et la condition qui annonce l'arrivée est justement
   * `phase >= 1`. Sans ce drapeau elle reste vraie à chaque image, et chaque
   * image ajoute une étape fantôme à `legsIle` et `legsQuai`. Le store répond
   * de façon asynchrone, donc la boucle tournait le temps de quelques images à
   * chaque arrêt : les îles dérivaient, et les scènes se décalaient au fil des
   * tours. Remis à faux quand la rame s'ébranle (`setVoyage`).
   */
  private arriveeAnnoncee = false
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

  /**
   * Tenue quand **le train et le massif sont posés** — ce que l'écran de
   * chargement attend, et rien d'autre : ni les oiseaux, ni le quai, ni les
   * étoiles des voyageurs, qui arrivent après sans qu'on les voie manquer.
   *
   * Elle est tenue **dans tous les cas**, y compris quand il n'y a rien à
   * charger : pas de WebGL, pas de manifeste, ou la gare démontée en cours de
   * route. Une promesse abandonnée laisserait le loader sur l'écran pour
   * toujours, et le site derrière lui.
   */
  readonly pret: Promise<void>
  private tenirPret: () => void = () => {}

  constructor(canvas: HTMLCanvasElement, opts: SceneOptions) {
    this.canvas = canvas
    this.reducedMotion = opts.reducedMotion
    this.pret = new Promise<void>((resoudre) => {
      this.tenirPret = resoudre
    })
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
      // Pas de contexte : il n'y aura ni train ni massif, mais le site existe.
      this.tenirPret()
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
    // Dès ici, avant le `cadrer()` qui la trace : elle doit exister quand Vue
    // dira la gare, juste après cet `init()`, parce que c'est `setGare` qui
    // pose sa nuit — un lien partagé vers « ailleurs » neige alors sur sa toute
    // première image, sans attendre un tick.
    this.neige = new Neige(this.plans.neige, this.reducedMotion)
    // Il n'attend pas le manifeste : construit ici, il est cadré par le
    // `cadrer()` qui suit, et sa position n'est jamais indéfinie.
    this.rideau = new Rideau(this.reducedMotion)
    this.app.stage.addChild(this.monde, this.dissous)

    this.refletSprite.scale.y = -1
    this.refletSprite.mask = this.refletMasque
    this.monde.addChild(this.refletMasque, this.refletSprite, this.decor)
    this.decor.filters = [this.recolor]

    this.cadrer()
    // La nuit de ce que la scène sait **aujourd'hui** : elle ne sait pas encore
    // où elle est — Vue ne dit la gare qu'après cet `await init()` —, donc ce
    // calcul rend zéro, et ce n'est pas lui qui tient la neige d'un lien
    // partagé vers « ailleurs ». Ce sont `setGare` et `setVoyage`, qui
    // assombrissent chacun en finissant : la nuit est pleine dès qu'ils sont
    // dits, avant le premier tick. Ce rappel-ci pose la teinte des porteurs qui
    // viennent de naître, comme `peupler` le fait pour les siens.
    this.assombrir()
    // `resizeTo: window` reporte le redimensionnement à un requestAnimationFrame :
    // lire `app.screen` depuis un écouteur `resize` du document donne toujours
    // les dimensions d'avant. C'est le renderer qui dit quand il a changé.
    this.app.renderer.on('resize', () => this.cadrer())
    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000))

    const manifest = await loadManifest()
    // Sans `await` : le chargement des assets ne doit retarder ni la couleur
    // mémorisée, ni le parallax, ni le premier cadrage. C'est `pret` qui dit
    // quand le train et le massif sont là, à qui veut l'attendre.
    if (manifest) void this.peupler(manifest)
    // Rien à peupler : personne ne tiendra la promesse à notre place.
    else this.tenirPret()
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
    // lumières — le réverbère et l'horloge — dans `lumieres`, donc
    // devant le voile du pied et derrière la rame.
    const planQuai = new Container()
    this.plans.plateauFond.addChild(planQuai)
    this.quai = new Quai(planQuai, this.plans.lumieres, this.reducedMotion)
    void this.quai.charger()
    // Le plateau lui-même ne porte pas de teinte (voir `Nuit`) : chaque plan
    // qui s'assombrit s'inscrit en naissant, par `planSombre`.
    const ecran = this.app.screen
    this.train = monterLeTrain(this.plans, manifest, ecran.width, ecran.height)
    // Devant la voie et devant le train : c'est le sol sur lequel il roule.
    this.terre = new Terre(planSombre(this.plans, this.plans.plateau, 'terre'))
    const planOiseaux = planSombre(this.plans, this.plans.plateau, 'oiseaux')
    this.cables = new Cables(planCables)
    this.oiseaux = new Birds(planOiseaux, this.cables, { reducedMotion: this.reducedMotion })
    this.oiseaux.surChute = () => this.emitter.emit('birdFell')
    void this.oiseaux.charger()
    // Un plan qui vient de s'inscrire est encore blanc : sur un lien partagé
    // vers « ailleurs », la terre se montrerait en pleine lumière le temps
    // d'une image avant que le prochain tick ne la teinte.
    this.assombrir()
    this.cadrer()

    // Le massif part **en même temps** que le train : ils ne se gênent pas, et
    // l'écran d'attente les attend tous les deux. Chargé après, il ajoutait sa
    // seconde à la leur pour rien.
    const massif = this.chargerLeMassif(manifest, fondDuDecor)

    // Ce qu'on voit à quai, et rien de plus : la voie et deux images. Les six
    // séquences entières arrivent plus bas, l'écran déjà effacé.
    await this.train.poserAQuai()

    // Les vitres et la fumée se posent dans la rame, à leur place : elles en
    // suivent l'échelle et la position sans rien avoir à recalculer.
    const rame = monterLaRame(this.plans, this.train, manifest, this.reducedMotion)
    this.vitres = rame.vitres
    this.fumee = rame.fumee
    this.assombrir()
    this.cadrer()

    await massif

    // Le train est posé plus haut, le massif juste au-dessus : c'est ici, et
    // nulle part ailleurs, que l'écran de chargement a le droit de s'effacer.
    // Le `catch` du massif passe par ici lui aussi — sans WebGL il n'y a pas
    // de massif, mais il y a un train, et le site vaut mieux qu'un écran
    // d'attente.
    this.tenirPret()

    // Et maintenant seulement, les six séquences. Sans `await` : plus
    // personne ne les attend, et le train ne repartira pas avant qu'elles ne
    // soient là (`enMarche`).
    void this.train.chargerLesSequences()
  }

  /**
   * Le massif, de son import jusqu'à sa carte de relief. Rendu comme une
   * promesse pour qu'il descende du réseau pendant que le train descend du
   * sien ; `peupler` l'attend juste avant d'effacer l'écran.
   */
  private async chargerLeMassif(manifest: Manifest, fondDuDecor: Container): Promise<void> {
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
    this.emitter.emit('frame', frame)
    poserMonde(this.monde, frame)
    // Le ciel vit dans le décor mais compte en pixels d'écran : son
    // contre-transport se refait à chaque cadrage, comme celui du monde.
    poserCiel(this.plans.ciel, frame)

    this.sky?.resize(frame, width, height, width < SEUIL_MOBILE)
    // La neige se trace en pixels de cadre, sur la part du cadre que l'écran
    // montre : elle ne se retrace qu'ici, jamais à l'image.
    this.neige?.cadrer(frame, width, height, width < SEUIL_MOBILE)
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
    this.quai?.cadrer(frame, this.app.renderer.resolution, width < SEUIL_MOBILE)
    // Le nez de la locomotive ne se pose pas au même endroit selon le format :
    // la rame est le seul objet du plateau qui bouge avec la fenêtre.
    this.train?.cadrer(width, height)
    this.rideau?.cadrer(frame)
    // Le cadre change `y` sans que le rideau ait bougé : le texte doit le savoir.
    this.emettreRideau()
    this.oiseaux?.cadrer(frame, this.app.renderer.resolution, width)
    this.vitres?.cadrer(frame, this.app.renderer.resolution)
    this.fumee?.cadrer(frame, this.app.renderer.resolution)

    this.refletTexture?.destroy(true)
    this.refletTexture = RenderTexture.create({
      // Toute la largeur du monde : ce qui se reflète, c'est ce qu'on voit,
      // et on voit maintenant au-delà du plateau.
      width: Math.round(MONDE.width * REFLET_RESOLUTION),
      height: Math.round(HORIZON * REFLET_RESOLUTION),
    })
    // Au plus proche voisin : agrandi, un grain binaire doit le rester.
    this.refletTexture.source.scaleMode = 'nearest'
    this.refletSprite.texture = this.refletTexture
    this.refletSprite.width = MONDE.width
    this.refletSprite.height = HORIZON

    // Le masque de grain, à la densité de pixels de l'écran.
    const k = frame.scale * this.app.renderer.resolution
    const cellule = Math.max(1, Math.round(REFLET_GRAIN * this.app.renderer.resolution))
    this.refletMasque.texture?.destroy(true)
    const masque = Texture.from(
      creerMasque(
        Math.round(MONDE.width * k),
        Math.round(HORIZON * k),
        cellule,
        k,
      ),
    )
    masque.source.scaleMode = 'nearest'
    this.refletMasque.texture = masque
    this.refletMasque.setSize(MONDE.width, HORIZON)
    this.refletMasque.position.set(MONDE.x, HORIZON)
    // Retourné sous la voie : le pied du décor touche son reflet.
    this.refletSprite.position.set(MONDE.x, HORIZON * 2)
  }

  resize(): void {
    this.cadrer()
  }

  /**
   * Un clic, en pixels CSS. Rend `true` s'il a pris le clic — l'horloge, qui
   * commande le rideau, le réverbère, ou un oiseau — : l'appelant sait alors
   * qu'il ne doit pas aussi ouvrir la bulle d'une étoile.
   *
   * L'horloge passe avant le réverbère, qui passe avant les oiseaux : chacun
   * rend la main au suivant quand il n'est pas visé.
   *
   * **Plus aucune garde de couverture ici**, et c'est la fin d'un défaut daté.
   * La plaque a quitté le canvas : elle est en DOM, à `z-index: 15`, devant tout
   * ce que la scène dessine. Un appui qui tombe dessus ne parvient donc plus
   * jusqu'à `window`, parce que le panneau est `pointer-events: auto` et que son
   * `pointerdown` arrête la propagation — un seul geste qui ferme les deux
   * routes : celle de ce `clicPx`, et celle du bouton transparent du réverbère,
   * que la pile du DOM met désormais **sous** le panneau. (Le `pointermove`, lui,
   * passe : voir `setPointerPx`.) Cliquer sur une ligne
   * éteinte du tableau n'éteint plus un faisceau dont les deux tiers sont en
   * pleine vue. Une boîte de couverture côté canvas, elle, serait fausse : le
   * panneau se centre sur la fenêtre, il n'est plus à une abscisse de cadre.
   */
  clicPx(px: number, py: number): boolean {
    const f = this.frameCourante
    if (!f) return false
    const cadre = versCadre(px, py, f)
    if (this.quai?.horlogeTouchee(cadre.x, cadre.y)) {
      this.basculerRideau()
      return true
    }
    if (this.reverbereVise(cadre.x, cadre.y)) {
      this.basculerReverbere()
      return true
    }
    // Cliquer à côté de la plaque la referme (22 novembre 2026, demande de la
    // propriétaire). Sa place dans l'ordre dit tout :
    //
    // — **après** l'horloge et le réverbère, qui gardent la main. La spec §5
    //   veut qu'on puisse éteindre la lampe tableau baissé, et les deux tiers
    //   bas de son mât sont dégagés sous la plaque ; passer avant la lui
    //   volerait.
    // — **avant** les oiseaux : un clic ne fait qu'une chose, et le tableau est
    //   devant eux. Un oiseau visible à côté de la plaque ne tombe donc pas, il
    //   referme le tableau — et redevient cliquable aussitôt après.
    //
    // Seulement **baissé** : pendant la remontée il n'y a plus rien à fermer, et
    // un second appui rebaisserait la plaque qu'on vient de renvoyer.
    if (this.rideau?.baisse) {
      this.basculerRideau()
      return true
    }
    if (this.gagOuvert && this.oiseaux?.cliquer(cadre.x, cadre.y)) return true
    // Les fenêtres du train, en dernier. Elles sont basses et à gauche, loin de
    // tout le reste, mais l'ordre a un sens : les oiseaux passent **devant** la
    // rame (voir l'ordre des plans), donc un oiseau posé devant un wagon se
    // laisse cliquer avant le carreau qu'il cache.
    // `toucher` rend l'indice de la vitre, qui peut valoir zéro : on compare
    // donc à `null` et non au vrai-faux, et `!=` prend l'absence de vitres.
    return this.vitres?.toucher(cadre.x, cadre.y, f.scale) != null
  }

  /**
   * Baisse le rideau, ou le relève : le geste de l'horloge, et celui du bouton
   * du DOM — le même, pour que le clavier n'ait pas un rideau à lui.
   */
  basculerRideau(): void {
    if (!this.rideau) return
    // La règle, en son seul endroit — l'horloge et le bouton du DOM passent tous
    // deux ici : le rideau ne se baisse qu'à l'arrêt, et se relève toujours. Le
    // tableau des départs appartient à l'arrêt ; la gare s'en va avec son horloge,
    // et une plaque baissée en route resterait vide, sans moyen de la relever.
    if (!this.rideau.baisse && this.enRoute) return
    // Il l'a trouvé, par quelque chemin que ce soit : le battement n'a plus à le dire.
    this.rideauTrouve = true
    this.quai?.apaiser()
    this.rideau.basculer()
    // L'état change tout de suite, la plaque seulement après : le texte n'a pas
    // à attendre la prochaine image pour savoir où il va.
    this.emettreRideau()
  }

  /** L'état **visé** du rideau : il change dès le geste, bien avant que la plaque arrive. */
  get rideauBaisse(): boolean {
    return this.rideau?.baisse ?? false
  }

  /**
   * Le clic vise-t-il le réverbère ? Un prédicat à lui seul, et une sortie
   * franche dans `clicPx` : la route de la lampe doit se lire et se déplacer
   * sans toucher à celle de l'horloge.
   */
  private reverbereVise(x: number, y: number): boolean {
    return this.quai?.reverbereTouche(x, y) ?? false
  }

  /**
   * Éteint le réverbère, ou le rallume : le geste du clic sur le mât, et celui
   * du bouton du DOM — le même, pour que le clavier n'ait pas une lampe à lui.
   *
   * **Seulement à l'arrêt** (spec §3), comme le rideau. Ce code a d'abord eu
   * une règle à lui — « la lampe répond là où elle est, même en marche » — et
   * c'était une lampe pour la souris seule : le bouton du DOM, lui, est
   * `disabled` dès le départ du train. Deux règles pour un seul geste, c'est
   * précisément ce que la phrase ci-dessus interdit. La garde est donc la même
   * des deux côtés, et le charme d'une lampe qu'on éteint en s'en allant cède à
   * la cohérence.
   *
   * `clicPx` rend quand même `true` quand l'appui a touché le mât : il a visé
   * la lampe, il n'a pas à ouvrir aussi la bulle d'une étoile — c'est ce que
   * fait déjà l'horloge en marche.
   */
  basculerReverbere(): void {
    if (this.enRoute) return
    this.quai?.basculerReverbere()
    this.emettreReverbere()
  }

  /** Le réverbère est-il allumé ? Sans quai — sans WebGL — il l'est. */
  get reverbereAllume(): boolean {
    return this.quai?.allumeReverbere ?? true
  }

  /** Dit l'état du réverbère, s'il a changé depuis la dernière fois. */
  private emettreReverbere(): void {
    if (!this.quai) return
    const allume = this.quai.allumeReverbere
    if (this.reverbereEmis === allume) return
    this.reverbereEmis = allume
    this.emitter.emit('reverbere', allume)
  }

  /** Le battement de l'horloge est-il en cours ? */
  get horlogeBat(): boolean {
    return this.quai?.bat ?? false
  }

  /**
   * Dit où est le rideau, s'il y a quelque chose de neuf à dire.
   *
   * **Jamais un `y` qui ne soit pas un nombre** — voir `SceneEvents['rideau']` :
   * c'est ici, au seul point d'émission, que cela se garde. Aujourd'hui le
   * rideau est cadré dans la foulée de sa construction et `y` est toujours
   * fini ; c'est vrai par l'ordre des appels, et ça ne tient plus le jour où
   * quelqu'un le change.
   */
  private emettreRideau(): void {
    const r = this.rideau
    if (!r) return
    const y = r.y
    if (!Number.isFinite(y)) return
    const baisse = r.baisse
    if (this.rideauEmis?.y === y && this.rideauEmis.baisse === baisse) return
    this.rideauEmis = { y, baisse }
    this.emitter.emit('rideau', y, baisse)
  }

  /**
   * Le battement s'arme quand le train **vient de s'arrêter** à la gare qui a
   * l'horloge, et seulement alors : à une autre, l'horloge est hors de l'écran
   * et l'unique rappel serait dépensé pour rien. C'est un front, pas un état —
   * le magasin répète ce qu'il sait à chaque changement, et deux rappels de
   * suite ne doivent pas relancer deux pulsations.
   *
   * Appelée par `setGare` et par `setVoyage` : le magasin les annonce dans un
   * ordre qu'on ne tient pas, et l'arrêt n'existe qu'une fois les deux dits.
   */
  private armerLeBattement(): void {
    const arrete = !this.enRoute && this.gare === 'ailleurs'
    if (!arrete) {
      // Plus d'arrêt devant l'horloge — le train repart, ou s'arrête ailleurs :
      // dans les deux cas elle n'est plus à l'écran, et les pulsations qui
      // restaient n'ont plus rien à montrer.
      if (this.arretDevantHorloge) this.quai?.apaiser()
      this.arretDevantHorloge = false
      return
    }
    // Sans quai, rien à faire battre : on ne compte pas l'arrêt, le prochain pourra.
    if (!this.quai || this.arretDevantHorloge) return
    this.arretDevantHorloge = true
    if (!this.rideauTrouve) this.quai.battre()
  }

  /**
   * Quelle gare le train vient de quitter — ou celle où il est à quai. La
   * scène n'en a besoin que pour savoir où est « plus loin » sur la ligne ;
   * elle ne lit aucun magasin.
   *
   * Elle finit par `assombrir()` : la nuit est une fonction de l'état, et
   * l'état vient de changer. C'est **ici** que se tient la garantie « plein
   * dès la première image » d'un lien partagé vers « ailleurs » — `init` ne
   * pouvait pas la tenir, il passe avant que Vue n'ait dit la gare.
   */
  setGare(gare: Gare): void {
    this.gare = gare
    this.armerLeBattement()
    this.prochainPlusLoin = this.legsIle + forwardSteps(gare, 'plus-loin')
    this.prochainAilleurs = this.legsQuai + forwardSteps(gare, 'ailleurs')
    this.assombrir()
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
    const f = this.frameCourante
    const cadre = f ? versCadre(px, py, f) : null
    // Plus de garde de couverture : la plaque est en DOM, et une boîte calculée
    // ici serait fausse — le panneau se centre sur la fenêtre, il n'est plus à
    // une abscisse de cadre. Le survol traverse donc : la bulle d'une étoile
    // recouverte peut s'ouvrir derrière la plaque, qui est à `z-index: 15` et la
    // cache. C'est assumé — le panneau n'arrête que l'**appui**, parce que
    // `setPointer` (la parallaxe du ciel) voyage sur le même `pointermove` et
    // qu'un ciel figé au survol du panneau se verrait bien davantage.
    this.quai?.eclairer(cadre !== null && this.quai.horlogeTouchee(cadre.x, cadre.y))
    // Le curseur dit ce qui se clique. Les oiseaux sont dessinés dans le
    // canvas, donc rien ne le dit à leur place — l'horloge et le réverbère,
    // eux, ont chacun leur bouton du DOM qui porte son propre curseur. Même
    // question que `clicPx`, `gagOuvert` compris : un doigt de souris sur un
    // oiseau qui ne répond pas serait une promesse en l'air.
    this.canvas.style.cursor =
      cadre !== null && this.gagOuvert && (this.oiseaux?.survole(cadre.x, cadre.y) ?? false)
        ? 'pointer'
        : ''
    this.emitter.emit('starHover', this.stars?.hit(px, py) ?? null, px, py)
  }

  /**
   * Ferme la bulle d'une étoile, s'il y en a une d'ouverte, pour un appui qui
   * n'a rien pris.
   *
   * « A tap that hits nothing closes the bubble » : c'est la règle de
   * `setPointerPx`, et elle vaut aussi pour l'appui qui tombe sur le panneau des
   * départs — sauf que celui-là est arrêté avant `window` (il est en DOM, devant
   * tout), et doit donc le dire lui-même. Sans ça la bulle reste ouverte sous la
   * plaque et réapparaît quand le panneau remonte.
   *
   * **Pas `setPointerPx` à sa place** : la scène ne sait plus ce que la plaque
   * couvre, et `stars.hit` y trouverait une étoile *sous* le panneau — on
   * ouvrirait une bulle au lieu d'en fermer une. Dire « rien » est plus court et
   * plus vrai.
   */
  fermerBulleEtoile(px: number, py: number): void {
    this.emitter.emit('starHover', null, px, py)
  }

  /**
   * The journey, as the store sees it. Called again whenever it changes, so a
   * target redirected in flight simply extends the number of legs left.
   *
   * Elle finit par `assombrir()`, comme `setGare` : la nuit se lit dans l'état
   * du voyage, et il vient de changer. C'est l'autre moitié de la garantie —
   * la scène est à sa nuit dès qu'elle sait où elle est, sans attendre un tick.
   */
  setVoyage(enRoute: boolean, etapesRestantes: number, cible: Gare | null = null): void {
    if (enRoute && !this.enRoute) {
      // Le rideau remonte quand la rame s'ébranle : le texte ne vit qu'à « ailleurs »
      // à quai, et une plaque vide qui suivrait le train partout couvrirait le
      // ciel et le survol des étoiles, sans moyen de la relever.
      if (this.rideau?.baisse) {
        this.rideau.relever()
        this.emettreRideau()
      }
      this.phase = 0
      // La rame s'ébranle : l'arrivée du voyage précédent est oubliée, et
      // celle-ci pourra s'annoncer à son tour.
      this.arriveeAnnoncee = false
      this.profil = { demarrage: true, freinage: etapesRestantes <= 1 }
    }
    this.enRoute = enRoute
    this.etapesRestantes = etapesRestantes
    this.cible = cible
    this.armerLeBattement()

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
    this.assombrir()
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

  /**
   * Le train roule-t-il vraiment ? Il est en route selon l'URL, **et** il a
   * ses images (`enMarche`). Entre les deux, il reste à quai : le monde
   * attend avec lui plutôt que de le faire glisser, roues figées.
   */
  private get roule(): boolean {
    return enMarche(this.enRoute, this.train ? this.train.complet : null)
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

    const enMarche = this.roule
    if (enMarche && this.peutAnimer) {
      this.phase += dt / DUREE_ETAPE
      // `!this.arriveeAnnoncee` : au terminus la phase reste **épinglée** à 1
      // (voir plus bas), si bien que `phase >= 1` resterait vraie à chaque
      // image. Sans ce drapeau, l'arrivée se réannonçait en boucle et chaque
      // image ajoutait une étape à `legsIle` et `legsQuai` — les deux
      // compteurs qui placent les îles. Le store répond de façon asynchrone,
      // donc la boucle tournait quelques images à chaque arrivée : les scènes
      // dérivaient un peu par arrêt, et visiblement au bout de deux tours.
      if (this.phase >= 1 && !this.arriveeAnnoncee) {
        // La scène décompte elle-même : le store ne la rafraîchit qu'au tick
        // suivant, et s'en remettre à lui ferait franchir deux étapes d'affilée.
        this.etapesRestantes = Math.max(0, this.etapesRestantes - 1)
        if (this.etapesRestantes <= 0) {
          // Dernière étape : la phase reste à 1, sans quoi la voie repartirait
          // à pleine vitesse le temps d'une image. La distance vaut donc déjà
          // `legsBase + 1` — l'incrémenter en plus compterait l'étape deux
          // fois, et le massif sauterait d'une étape entière sur une image.
          this.phase = 1
          // Épinglée : c'est ce drapeau, et lui seul, qui empêche la condition
          // d'être vraie de nouveau à l'image suivante.
          this.arriveeAnnoncee = true
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
    // Rien ne se reconstruit : on ne déplace que les racines des couches.
    this.neige?.animer(dt)
    for (const d of this.dissolutions) {
      d.update(dt)
      if (d.fini) this.dissolutions.delete(d)
    }
    this.train?.update(dt, this.phase, this.etapesRestantes <= 1, enMarche)
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
    // Le quai suit le sol comme les câbles. La nuit lui est passée mais ses
    // lumières, faisceau compris, ne s'éteignent pas : elles sont dans `lumieres`.
    // Rien tant qu'on ne sait pas d'où l'on part : une île posée quand même
    // s'ancrerait à « distance zéro », c'est-à-dire à quai, où qu'on soit.
    if (this.ileAilleurs.distance !== null) {
      this.quai?.avancer(this.ileAilleurs.distance, nuit)
    }
    // Le quai rallume le réverbère de lui-même quand la gare quitte le champ :
    // c'est le seul changement que le DOM ne peut pas deviner, et sans lui
    // `aria-pressed` resterait à « non pressé » sur une lampe allumée au retour.
    this.emettreReverbere()
    // Le faisceau respire de lui-même, posé ou non : il est caché avec l'île.
    this.quai?.animer(dt)
    // Ce que GSAP a fait de la plaque depuis l'image d'avant. Si son rappel passe
    // après celui de Pixi, le texte a au pire une image de retard sur le rendu :
    // l'ordre des deux n'est garanti par rien ici.
    this.emettreRideau()
    // La fumée dérive avec la vitesse, pas avec l'horloge.
    this.fumee?.update(dt, this.train?.vitesse ?? 0)
    this.rendreReflet()
  }

  /**
   * La nuit de la gare, lue dans l'état du voyage, devient la teinte des
   * porteurs. Rendue aussi telle quelle : le quai en a besoin, et la relire
   * d'ailleurs la ferait diverger d'une image.
   */
  private assombrir(): number {
    const nuit = nuitDeLaGare({
      gare: this.gare,
      cible: this.cible,
      enRoute: this.enRoute,
      phase: this.phase,
      derniereEtape: this.etapesRestantes <= 1,
      // Ce qui sépare « reparti d'« ailleurs » » de « vient de passer devant
      // sans s'arrêter » : les deux états sont sinon identiques.
      demarrage: this.profil.demarrage,
      reducedMotion: this.reducedMotion,
    })
    appliquerNuit(this.plans, nuit)
    // L'opacité de la neige **est** la nuit, sans rampe à elle : elle n'est
    // là qu'à « ailleurs », pleine dès la première image d'un lien partagé,
    // et absente d'une traversée sans arrêt.
    this.neige?.setNuit(nuit)
    return nuit
  }

  /**
   * Le reflet ne prend ni le ciel ni la neige. L'eau renvoie le massif et le train —
   * les choses solides. La poussière, elle, couvre déjà tout l'écran, reflet
   * compris : la renvoyer y dessinerait une seconde fois le même grain,
   * retourné. Et les étoiles-voyageuses y laisseraient des sosies qui ne
   * répondent à rien, juste sous la voie — précisément la zone que
   * `regionCiel` leur interdit pour qu'on ne les y cherche pas.
   *
   * La neige en sort pour une autre raison : l'eau retourne ce qu'on lui
   * donne, et des flocons retournés **monteraient** dans le reflet au lieu
   * d'y tomber.
   */
  private rendreReflet(): void {
    const cible = this.refletTexture
    if (!cible) return
    // La neige du faisceau sort du reflet elle aussi, et elle seule : le cône
    // peint est immobile et se reflète correctement.
    const neigeDuFaisceau = this.quai ? [this.quai.lumiere.neige.racine] : []
    horsDuReflet(
      this.plans,
      this.decor,
      REFLET_RESOLUTION,
      () => {
        // La texture commence au bord gauche du monde, pas à celui du
        // plateau : le décor y entre décalé d'autant.
        this.app.renderer.render({
          container: this.decor,
          target: cible,
          clear: true,
          transform: new Matrix().translate(-MONDE.x * REFLET_RESOLUTION, 0),
        })
      },
      neigeDuFaisceau,
    )
  }

  dispose(): void {
    // Le loader attend `pret` : démontée avant d'avoir chargé, la scène le
    // laisserait sur l'écran pour toujours.
    this.tenirPret()
    this.oiseaux?.destroy()
    this.cables?.destroy()
    this.quai?.destroy()
    this.rideau?.destroy()
    this.fumee?.destroy()
    this.vitres?.destroy()
    this.terre?.destroy()
    this.emitter.clear()
    this.refletTexture?.destroy(true)
    this.relief?.detruire()
    this.train?.destroy()
    this.sky?.destroy()
    this.stars?.destroy()
    this.neige?.destroy()
    for (const d of this.dissolutions) d.destroy()
    this.dissolutions.clear()
    if (this.vivante) this.app.destroy(true, { children: true })
    this.vivante = false
  }
}
