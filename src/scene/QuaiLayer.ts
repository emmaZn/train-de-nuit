/**
 * Le quai d'« ailleurs », dans la scène.
 *
 * La classe s'appelle `Quai` mais son fichier `QuaiLayer.ts` : sur macOS,
 * `Quai.ts` est le même fichier que `quai.ts`, qui porte la géométrie. C'est le
 * précédent de `cables.ts` / `CableLayer.ts` (CONCEPT.md §9).
 *
 * **Deux racines, une seule île.** La règle des lumières (spec §6.3) dit que ce
 * qui s'éteint, c'est tout ce qui n'est pas une lumière. Le bâtiment et la
 * bordure s'éteignent : ils vivent dans un plan que la nuit teinte. Le
 * réverbère et l'horloge sont des lumières : ils vivent dans une branche
 * qu'aucune teinte n'atteint — ni elle, ni aucun de ses ancêtres. Mais c'est un
 * seul objet posé sur un seul sol, alors `avancer()` pose la **même abscisse**
 * sur les deux racines : elles défilent d'un seul mouvement, et rien ne peut
 * les désynchroniser.
 *
 * Les lumières se montent **entre le voile du pied et la rame**, et non après
 * les vitres : le quai est derrière le train par construction, et après les
 * vitres le réverbère lui passerait devant à chaque départ. La gare a le droit
 * de passer en partie derrière la rame (`DECALAGE_GARE`).
 *
 * Profondeur : le bâtiment est ajouté en premier à la racine éteinte, donc
 * **derrière** la bordure ; la racine allumée est au-dessus de l'éteinte, donc
 * le réverbère est devant le mur. Le bâtiment passe derrière eux tous, ce
 * qu'on a voulu.
 *
 * Les réglages marqués « provisoire » attendent la séance de réglage avec
 * Emmanuelle (spec §7) : taille et place des pièces, densité du grain. Ils sont
 * posés à vue, pas validés.
 */
import gsap from 'gsap'
import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import { MONDE } from './layout'
import type { Frame } from './layout'
import {
  CADRES,
  DEBUT_GARE,
  FIN_GARE,
  HALO_HORLOGE,
  HORLOGE,
  LANTERNE,
  PIECES,
  reverbereTouche,
} from './quai'
import { loadTexture } from './assets'
import { GRAIN_ECRAN, fabriquerPiece } from './poses'
import { Faisceau } from './Faisceau'
import { horlogeTouchee } from './rideau'
import type { Mode } from './palette'

const GRIS = 0xededed
/** Le blanc plein des sources : plus clair que le gris du décor, c'est voulu. */
const BLANC = 0xffffff
/** Le noir du projet, celui que le shader de recoloration rend à la couleur du fond. */
const NOIR = 0x0b0b0c

/**
 * Les pièces qui viennent d'un dessin. La bordure et le cadre se tracent ici.
 *
 * Le banc et la valise en sont sortis le 20 novembre 2026, avec la porte du
 * dessin sur laquelle ils étaient calés (voir `quai.ts`). Les deux pièces qui
 * restent viennent toutes deux d'une **image** : la cuisson des SVG
 * (`fabriquerPiece`, `svgs`, `textures`, la recuisson au recadrage) ne sert
 * donc plus personne tant qu'elles ne reviennent pas. On la garde entière —
 * c'est elle qu'il faudrait réécrire sinon — mais plus aucun test ne la
 * traverse : c'est le prix de ce retrait, et il est volontaire.
 */
const PIECES_DESSINEES = ['reverbere', 'batiment'] as const
export type PieceDessinee = (typeof PIECES_DESSINEES)[number]

/**
 * Les deux pièces qui viennent d'une **image déjà grainée**, et non d'un SVG.
 *
 * Le bâtiment et le réverbère étaient les deux seules pièces qu'un modèle
 * avait dessinées à la main, en écrivant des coordonnées SVG à l'aveugle. La
 * propriétaire a fourni ses deux dessins ; ils sont passés au grain du projet
 * par `outils/preparer_ailleurs.py` puis `outils/grain_train.py`, exactement
 * comme les images du train.
 *
 * Elles ne passent donc **pas** par `fabriquerPiece` : il sépare masse et
 * trait d'un SVG, rasterise et quantifie en cellules de grain — tout ce qui
 * est déjà cuit dans le PNG. Elles se chargent comme une texture, comme les
 * WebP du train (`Train.charger`). Deux conséquences qui ne sont pas des
 * détails : leur grain ne dépend plus de `parCadre`, donc le mur ne s'éteint
 * plus sous 0,6 (spec §4) ; et leurs textures appartiennent au cache
 * d'`Assets`, donc on ne les détruit pas — voir `destroy`.
 */
const PIECES_IMAGE = ['batiment', 'reverbere'] as const
type PieceImage = (typeof PIECES_IMAGE)[number]

function vientDUneImage(piece: PieceDessinee): piece is PieceImage {
  return (PIECES_IMAGE as readonly string[]).includes(piece)
}

/**
 * Ce qui reste allumé. Les sources arrêtées par Emmanuelle sont le réverbère et
 * son faisceau, les vitres du train, et l'horloge — celle-ci tracée en code (`horloge`), pas dessinée : le cadran
 * second dessin n'en porte pas, et le premier avait le sien effacé à la
 * fabrication de l'image (`preparer_ailleurs.py`).
 */
const ALLUMEES: readonly PieceDessinee[] = ['reverbere']

/**
 * Le cadran de l'horloge, en fractions de son rayon (celui du disque = 1).
 * Miroir de l'ancien dessin : graduations de 29 à 34 sur 36. PROVISOIRE (§7).
 */
const GRADUATION = { de: 29 / 36, a: 34 / 36 } as const

/* ----------------------------------------------------------------------------
 * Deux sources de la gare sont des DÉGRADÉS (réglage 3).
 *
 * La maquette montre un cône plein de lumière et une horloge à cadran blanc
 * cerclée d'un halo (la lanterne, elle, est un corps blanc plein : plus de
 * halo rond autour d'elle). Ce sont des dégradés, donc des mi-teintes : c'est l'entorse à « blanc ou absent »
 * (CONCEPT §12.2) que la propriétaire avait déjà assumée pour le halo des
 * vitres du train (`Vitres.HALO_ALPHA`), et qu'elle étend ici. Elle s'arrête
 * aux sources : le mur, la bordure, le massif et la rame restent blancs ou
 * absents.
 *
 * Techniquement ce ne sont pas des dégradés de Pixi mais des **nappes** de
 * blanc translucide qui se recouvrent : un `FillGradient` se construit sur un
 * canvas 2D, que jsdom n'a pas, et les lumières disparaîtraient des tests.
 * L'alpha se cumule, et quelques dizaines de nappes se lisent comme un dégradé.
 * ------------------------------------------------------------------------- */

/**
 * Les angles des deux aiguilles, en degrés. **0° = midi, sens horaire.**
 *
 * L'horloge du bâtiment est à la vraie heure. C'est, avec l'heure du rideau,
 * la seule chose du site qui ne soit pas sur l'horloge du train, et c'est
 * assumé. La petite aiguille avance avec les minutes (`× 0,5`), sinon elle
 * sauterait d'un douzième de tour à chaque heure pile.
 */
export function anglesHorloge(maintenant: Date): { heures: number; minutes: number } {
  const h = maintenant.getHours() % 12
  const m = maintenant.getMinutes()
  return { heures: h * 30 + m * 0.5, minutes: m * 6 }
}

/**
 * Où se pose une pièce, en pixels de cadre, à l'arrêt.
 *
 * Il y avait une troisième branche, celle des pièces posées par leur centre et
 * leur largeur — le banc et la valise. Elle est tombée avec eux (`quai.ts`) :
 * TypeScript la voit désormais inatteignable et refuse de compiler. Elle
 * revient avec eux.
 */
function boite(piece: PieceDessinee): {
  x: number
  y: number
  largeur: number
  hauteur: number
} {
  if (piece === 'batiment') {
    const p = PIECES.batiment
    return { x: p.x, y: p.pied - p.hauteur, largeur: p.largeur, hauteur: p.hauteur }
  }
  const p = PIECES.reverbere
  const cadre = CADRES.reverbere
  const largeur = p.hauteur / (cadre.hauteur / cadre.largeur)
  return { x: p.x - largeur / 2, y: p.pied - p.hauteur, largeur, hauteur: p.hauteur }
}

/**
 * Un trait en cellules pleines, jamais lissé : le projet ne connaît pas les
 * mi-teintes (CONCEPT §2). C'est le `ligne()` de `CableLayer`, en repère de
 * cadre.
 */
export function ligneCellules(
  g: Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cellule: number,
): void {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / cellule))
  for (let i = 0; i <= n; i += 1) {
    const t = i / n
    g.rect(x0 + (x1 - x0) * t - cellule / 2, y0 + (y1 - y0) * t - cellule / 2, cellule, cellule)
  }
}

/**
 * Le battement : deux pulsations du halo de l'horloge, la montée vive et la
 * descente lente, puis plus rien. C'est le seul rattrapage de la découverte —
 * le rideau ne descend pas de lui-même, et rien d'autre ne signale que les
 * trois liens existent. Deux et pas davantage : un halo qui bat sans fin se
 * lit comme une alerte, et l'on cesse de le voir. Durées et `ECLAT_SURVOL`
 * sont des réglages d'œil. PROVISOIRE (§7).
 */
const BATTEMENT = { pulsations: 2, montee: 0.45, descente: 0.9 } as const

/** Ce que le pointeur allume : moins que le pic d'un battement, qui doit se distinguer. */
const ECLAT_SURVOL = 0.7

/**
 * Combien de secondes met la lumière du réverbère à venir, et à partir.
 *
 * Les deux diffèrent exprès : un filament s'allume plus vite qu'il ne meurt —
 * l'allumage est un seuil franchi, l'extinction une chaleur qui retombe. Une
 * seule durée pour les deux donnait un interrupteur, pas une lampe.
 *
 * PROVISOIRE (§7) : à régler à vue avec la propriétaire, comme le reste des
 * nombres de la gare.
 */
export const DUREE_ALLUMAGE = 0.18
export const DUREE_EXTINCTION = 0.38

export class Quai {
  /** Ce qui s'éteint : le bâtiment et la bordure. */
  private readonly racineEteinte = new Container()
  /** Ce qui reste allumé : le réverbère, le faisceau, l'horloge et son halo de battement. */
  private readonly racineAllumee = new Container()

  private readonly bordure = new Graphics()
  private readonly cadran = new Graphics()
  /**
   * Un second halo, sous le cadran, dont **l'opacité d'objet** porte le
   * battement et le survol — le tracé, lui, ne change pas. C'est une source de
   * lumière : elle a droit au dégradé, comme le halo qu'elle double.
   */
  private readonly halo = new Graphics()
  /** La lanterne : son corps blanc, tracé en code, pas dessiné. */
  private readonly corpsLanterne = new Graphics()
  private readonly faisceau: Faisceau

  private readonly svgs = new Map<PieceDessinee, string>()
  private readonly sprites = new Map<PieceDessinee, Sprite>()
  /** Les textures **cuites ici**, qu'on détruit : celles des pièces en SVG. */
  private readonly textures = new Map<PieceDessinee, Texture>()
  /**
   * Les textures venues d'`Assets`, qu'on **ne détruit pas** : elles sont
   * partagées par le cache, et les détruire laisserait la prochaine scène —
   * un changement de route, un rechargement à chaud — sur une texture morte.
   * `Train.destroy` fait de même : il démonte sans toucher aux textures.
   */
  private readonly images = new Map<PieceImage, Texture>()

  private parCadre = 1
  /**
   * L'échelle du cadre, telle que le dernier `cadrer` l'a donnée. Elle ne sert
   * qu'à la cible du réverbère, qui doit tenir 44 px d'**écran** à toute
   * échelle (`cibleReverbere`). 1 par défaut : un quai qui n'a pas encore été
   * cadré rend alors la cible la plus étroite, celle de l'emprise du dessin —
   * jamais plus large qu'il ne faut.
   */
  private echelleCadre = 1
  private posee = false
  private detruite = false
  /**
   * Le numéro de la cuisson en cours. Deux cuissons peuvent se chevaucher — un
   * cadrage pendant un chargement, à la même échelle —, et la seconde doit
   * annuler la première, sinon la texture de la première fuit : plus personne
   * ne la porte et rien ne la détruit.
   */
  private cuisson = 0
  /** La minute déjà tracée : les aiguilles ne se redessinent qu'au changement. */
  private minuteTracee = -1

  /**
   * Le réverbère est-il allumé ? C'est un **jouet**, pas un réglage : il
   * s'éteint d'un clic, se rallume d'un second, et la gare quittée il est
   * rallumé (`avancer`). Rien n'en est retenu d'une visite à l'autre.
   */
  private lampeAllumee = true

  /**
   * Le mode du site. De jour, **on dessine l'objet, pas la lumière** : le mât,
   * le corps de la lanterne, le cadran et ses aiguilles, le cadre du panneau
   * restent ; le cône, le halo du cadran et le battement s'en vont.
   */
  private mode: Mode = 'nuit'

  private readonly reducedMotion: boolean
  /** L'opacité du battement : une valeur que GSAP anime, et que `poserEclat` lit. */
  private readonly pulsation = { a: 0 }
  private battement: gsap.core.Timeline | null = null
  /**
   * La clarté de la lumière du réverbère, de 0 à 1. **Un seul nombre pour deux
   * objets** — le faisceau et le corps de la lanterne —, parce qu'ils sont la
   * même lumière et qu'ils doivent fondre du même pas (voir `poserClarte`).
   */
  private readonly clarte = { v: 1 }
  /** La seule tween de clarté vivante : `kill()` avant d'en créer une autre. */
  private fondu: gsap.core.Tween | null = null
  private survole = false

  /**
   * `lumieres` est le groupe **non teinté**. Il vaut `parent` par défaut, ce
   * qui laisse construire un quai d'un seul tenant — c'est ce que font les
   * tests qui ne s'intéressent pas à l'assombrissement.
   */
  constructor(parent: Container, lumieres: Container = parent, reducedMotion = false) {
    this.reducedMotion = reducedMotion
    parent.addChild(this.racineEteinte)
    lumieres.addChild(this.racineAllumee)
    this.racineEteinte.addChild(this.bordure)
    // Sous le cadran : le disque blanc recouvre le halo, et les aiguilles qu'il
    // porte restent des creux.
    this.racineAllumee.addChild(this.halo, this.cadran)
    this.halo.alpha = 0
    // Une fois : le halo ne dépend pas du grain, et `redessiner` se refait au cadrage.
    this.tracerEclat()
    // Le faisceau est dans la racine allumée : il suit l'île, et ne s'éteint pas.
    this.faisceau = new Faisceau(this.racineAllumee, reducedMotion)
    // La lanterne **après** le faisceau : c'est la source, rien ne passe
    // devant elle — sinon le sprite du réverbère, qui n'est que du trait.
    this.racineAllumee.addChild(this.corpsLanterne)
    // Tant qu'on ne sait pas où est la gare, l'île n'est nulle part : la scène
    // tourne sa première image avant que Vue ne lui dise d'où l'on part, et
    // une île qui se pose quand même s'ancre à quai — à « ailleurs ».
    this.racineEteinte.visible = false
    this.racineAllumee.visible = false
    this.redessiner()
  }

  /** La racine éteinte, pour les tests de plan. */
  get eteint(): Container {
    return this.racineEteinte
  }

  /** L'horloge entière (disque, halo, aiguilles), pour les tests de plan. */
  get horloge(): Graphics {
    return this.cadran
  }

  /** Le halo du battement et du survol, pour les tests de plan. */
  get eclat(): Graphics {
    return this.halo
  }

  /** La lanterne (corps blanc), pour les tests de plan. */
  get lanterne(): Graphics {
    return this.corpsLanterne
  }

  /** La racine allumée, pour les tests de plan. */
  get allume(): Container {
    return this.racineAllumee
  }

  /** L'abscisse de l'île. Les deux racines la partagent, toujours. */
  get x(): number {
    return this.racineEteinte.x
  }

  /** Combien de dessins ont été trouvés. Une pièce manquante est sautée. */
  get piecesChargees(): number {
    return this.svgs.size + this.images.size
  }

  /** La texture que porte une pièce, s'il y en a une. */
  texture(piece: PieceDessinee): Texture | null {
    return this.textures.get(piece) ?? this.images.get(piece as PieceImage) ?? null
  }

  /**
   * Le point `(x, y)`, en pixels de cadre, est-il sur l'horloge **là où elle
   * est dessinée** ?
   *
   * `horlogeTouchee` compare à la place d'arrêt, et l'horloge défile avec l'île :
   * c'est ici qu'on retranche l'abscisse de l'île, parce que c'est ici qu'on la
   * connaît. Tant que l'île n'est pas posée elle n'est pas visible, et ne répond
   * à personne.
   */
  horlogeTouchee(x: number, y: number): boolean {
    return this.posee && horlogeTouchee(x - this.x, y, this.echelleCadre)
  }

  /**
   * Le point `(x, y)`, en pixels de cadre, est-il sur le réverbère **là où il
   * est dessiné** ? Même détour que `horlogeTouchee` : la cible est écrite à la
   * place d'arrêt (`cibleReverbere`) et le mât défile avec l'île, donc on
   * retranche ici l'abscisse de l'île, parce que c'est ici qu'on la connaît.
   *
   * L'échelle vient du dernier cadrage : la cible tient 44 px d'écran à toute
   * échelle, et c'est le quai qui connaît la sienne.
   *
   * Elle répond encore quand le mât défile : c'est `Scene.basculerReverbere`
   * qui tient la règle d'arrêt (spec §3), comme pour le rideau — le quai dit
   * où est la lampe, pas quand on a le droit d'y toucher.
   */
  reverbereTouche(x: number, y: number): boolean {
    return this.posee && reverbereTouche(x - this.x, y, this.echelleCadre)
  }

  /** Le réverbère est-il allumé ? Vrai au départ, et de retour à chaque gare. */
  get allumeReverbere(): boolean {
    return this.lampeAllumee
  }

  /** Un clic l'éteint, un second le rallume — à l'arrêt : la règle est dans `Scene`. */
  basculerReverbere(): void {
    this.allumerReverbere(!this.lampeAllumee, true)
  }

  /**
   * Pose la clarté courante sur les **deux** porteurs de la lumière, qui vivent
   * dans deux fichiers : le faisceau (cône, poussière, neige) et le corps de la
   * lanterne. Un seul endroit où ils se rejoignent, pour qu'ils ne dérivent pas.
   */
  private poserClarte(): void {
    // Visible tant qu'on est allumé **ou** qu'il reste de la clarté : le premier
    // terme couvre le début d'un allumage, où la clarté vaut encore zéro ; le
    // second, la fin d'une extinction, où l'état est déjà faux.
    const visible = this.lampeAllumee || this.clarte.v > 0
    this.faisceau.setClarte(this.clarte.v, visible)
    this.corpsLanterne.alpha = this.clarte.v
    this.corpsLanterne.visible = visible
  }

  /**
   * Allume ou éteint : on **cache** la lumière, on ne l'efface pas.
   *
   * Le faisceau entier part d'un coup — son cône, sa poussière et sa neige —
   * parce que c'est un seul conteneur. La lanterne, elle, perd sa
   * visibilité et garde son tracé : `redessiner` repasse dessus à chaque
   * cadrage, et une lanterne éteinte par un `clear()` se rallumerait au premier
   * redimensionnement.
   */
  private allumerReverbere(allume: boolean, enFondu = false): void {
    this.lampeAllumee = allume
    // Une seule tween vivante : la tuer avant d'en poser une autre fait repartir
    // la suivante de la clarté **courante**, sans saut, si l'on rebascule en
    // plein fondu. C'est la forme qu'a déjà `Rideau`.
    this.fondu?.kill()
    this.fondu = null
    const but = allume ? 1 : 0
    // Sans fondu : le rallumage du retour, qui se joue hors de l'écran, et le
    // mouvement réduit (CONCEPT §11), où rien ne bouge.
    if (!enFondu || this.reducedMotion) {
      this.clarte.v = but
      this.poserClarte()
      return
    }
    this.fondu = gsap.to(this.clarte, {
      v: but,
      duration: allume ? DUREE_ALLUMAGE : DUREE_EXTINCTION,
      ease: 'power2.out',
      onUpdate: () => this.poserClarte(),
      onComplete: () => {
        this.fondu = null
      },
    })
    // Tout de suite, sans attendre la première mise à jour de GSAP : c'est ce
    // qui fait apparaître la lampe au geste et non une image plus tard.
    this.poserClarte()
  }

  /** Le battement est-il en cours ? Il s'arrête de lui-même, ou quand on l'apaise. */
  get bat(): boolean {
    return this.battement !== null
  }

  /**
   * Lance les deux pulsations, en repartant de zéro si elles étaient en cours.
   * Sous `prefers-reduced-motion`, rien : un halo qui pulse est un mouvement.
   */
  battre(): void {
    if (this.reducedMotion) return
    this.apaiser()
    const { pulsations, montee, descente } = BATTEMENT
    const ligne = gsap.timeline({
      onComplete: () => {
        this.battement = null
      },
    })
    for (let i = 0; i < pulsations; i += 1) {
      ligne.to(this.pulsation, { a: 1, duration: montee, ease: 'sine.out', onUpdate: () => this.poserEclat() })
      ligne.to(this.pulsation, { a: 0, duration: descente, ease: 'sine.inOut', onUpdate: () => this.poserEclat() })
    }
    this.battement = ligne
  }

  /** Coupe le battement net : la timeline est tuée, pas seulement masquée. */
  apaiser(): void {
    this.battement?.kill()
    this.battement = null
    this.pulsation.a = 0
    this.poserEclat()
  }

  /**
   * Le pointeur est-il sur l'horloge ? Il n'éteint jamais un battement en cours :
   * l'éclat est le plus fort des deux.
   */
  /**
   * Le mode du site, descendu sur les deux pièces qui portent une lueur ici —
   * le halo du battement et le faisceau — et sur le tracé de l'horloge, qui
   * porte le sien en propre.
   */
  setMode(mode: Mode): void {
    if (mode === this.mode) return
    this.mode = mode
    this.faisceau.setMode(mode)
    this.tracerEclat()
    // Les aiguilles ne se retracent qu'au changement de minute : on force,
    // sinon le halo du cadran resterait celui de l'autre mode jusqu'à la
    // minute suivante.
    this.minuteTracee = -1
    this.tracerAiguilles()
  }

  eclairer(survole: boolean): void {
    this.survole = survole
    this.poserEclat()
  }

  private poserEclat(): void {
    this.halo.alpha = Math.max(this.pulsation.a, this.survole ? ECLAT_SURVOL : 0)
  }

  /** A-t-on dit à l'île où elle était ? */
  get placee(): boolean {
    return this.posee
  }

  /**
   * L'installation est-elle entièrement hors de l'écran, à cette distance ?
   *
   * C'est la seule question qui autorise à la **replacer** : tant qu'un coin du
   * quai est visible, elle ne peut plus que suivre le sol, sans quoi elle saute
   * sous les yeux (spec §6.7).
   */
  horsChamp(distance: number): boolean {
    // Les bornes sont celles du monde, pas du plateau : depuis que la scène
    // recule, le plateau n'atteint plus les bords de l'écran, et la gare y
    // disparaîtrait alors qu'on la voit encore.
    return distance + FIN_GARE < MONDE.x || distance + DEBUT_GARE > MONDE.x + MONDE.width
  }

  /**
   * Va chercher les dessins. Une pièce qui manque est sautée, jamais fatale :
   * la scène garde son quai et perd son réverbère, elle ne s'arrête pas — précédent
   * `Birds.charger`.
   */
  async charger(): Promise<void> {
    await Promise.all(
      PIECES_DESSINEES.map(async (piece) => {
        if (vientDUneImage(piece)) {
          const texture = await loadTexture(`/assets/ailleurs/${piece}.png`)
          if (!texture) {
            // Sans cela le visiteur verrait l'horloge et son halo flotter là où
            // était le pignon, sans que personne n'ait rien su.
            console.warn(`Quai : /assets/ailleurs/${piece}.png n'a pas chargé, la pièce est absente.`)
          } else if (!this.detruite) {
            // `nearest`, comme les pièces cuites ici — et pour la même raison.
            // Le filtrage linéaire **fabrique des mi-teintes** : réduite de
            // moitié, une image en blanc-ou-absent sort en gris, le trait pâlit
            // et le grain du mur s'éteint. C'est le défaut qu'on vient
            // corriger, et il revient par la carte graphique si on le laisse.
            // Au plus près, un texel allumé reste allumé, un texel éteint reste
            // éteint, et la pièce ne porte jamais que ses deux valeurs.
            texture.source.scaleMode = 'nearest'
            this.images.set(piece, texture)
            this.poser(piece, texture)
          }
          return
        }
        try {
          const reponse = await fetch(`/assets/ailleurs/${piece}.svg`)
          if (reponse.ok) this.svgs.set(piece, await reponse.text())
        } catch {
          /* une pièce manquante n'arrête pas la scène */
        }
      }),
    )
    await this.refaireTextures()
  }

  cadrer(frame: Frame, resolution: number, mobile = false): void {
    // Avant la sortie anticipée : la cible du réverbère suit l'échelle, même
    // quand il n'y a plus rien à retracer.
    this.echelleCadre = frame.scale
    this.faisceau.cadrer(frame, mobile)
    const parCadre = frame.scale * resolution
    if (parCadre === this.parCadre && this.sprites.size) return
    this.parCadre = parCadre
    this.redessiner()
    if (this.svgs.size) void this.refaireTextures()
  }

  /**
   * Appelée à chaque image : `distance` est le sol restant jusqu'à l'arrêt,
   * `nuit` va de 0 (plein jour) à 1 (gare au plus sombre).
   *
   * Les deux racines prennent la même abscisse — c'est ce qui fait qu'une île
   * coupée en deux plans reste une seule chose posée sur un seul sol.
   *
   * **`nuit` n'éclaire que la neige du faisceau.** Les lumières du quai —
   * faisceau compris — ne s'éteignent pas, aucune teinte ne les atteint, et le
   * cône peint est aussi lumineux de jour que de nuit. Mais il ne neige dans le
   * faisceau qu'à « ailleurs » : `Faisceau.setNuit` pose `nuit` sur les seuls
   * flocons, comme `Neige.setNuit` le fait pour ceux du fond.
   */
  avancer(distance: number, nuit: number): void {
    this.faisceau.setNuit(nuit)
    this.racineEteinte.x = distance
    this.racineAllumee.x = distance
    if (!this.posee) {
      this.posee = true
      this.racineEteinte.visible = true
      this.racineAllumee.visible = true
    }
    // Le réverbère est un jouet : la gare sortie du champ, il est rallumé.
    // C'est **ici** et non dans `horsChamp`, qui est une question et doit le
    // rester : `suivreIle` ne la pose pas toutes les images (elle est derrière
    // deux `||`), et une question qui change l'état ne répondrait pas toujours.
    // `avancer` est le moment où le quai apprend où il est : personne ne peut
    // voir la lampe se rallumer, elle est hors de l'écran.
    if (!this.lampeAllumee && this.horsChamp(distance)) this.allumerReverbere(true)
    this.tracerAiguilles()
  }

  /** Le faisceau, pour les tests de plan. */
  get lumiere(): Faisceau {
    return this.faisceau
  }

  /** Le faisceau respire tout seul : appelée à chaque image, avec le temps écoulé. */
  animer(dt: number): void {
    this.faisceau.animer(dt)
  }

  /* ------------------------------------------------------------- dessins */

  private get cellule(): number {
    return Math.max(1, GRAIN_ECRAN / this.parCadre)
  }

  private redessiner(): void {
    this.tracerBordure()
    this.tracerLanterne()
    this.minuteTracee = -1
    this.tracerAiguilles()
  }

  /**
   * La lanterne : le corps vitré en blanc plein, sans halo autour.
   *
   * C'est la source de la gare, et elle doit être la chose la plus claire de
   * l'écran — d'où le blanc pur, et non le gris du décor. Voir `LANTERNE`
   * pour la raison qui interdit de la remplir dans son dessin.
   */
  private tracerLanterne(): void {
    const g = this.corpsLanterne
    g.clear()
    const b = boite('reverbere')
    const k = b.largeur / CADRES.reverbere.largeur
    const px = (x: number) => b.x + x * k
    const py = (y: number) => b.y + y * k
    const { hautY, basY, hautDemi, basDemi, cx: c } = LANTERNE
    g.poly([
      px(c - hautDemi), py(hautY),
      px(c + hautDemi), py(hautY),
      px(c + basDemi), py(basY),
      px(c - basDemi), py(basY),
    ]).fill({ color: BLANC })
  }

  /**
   * Le halo qui bat : les mêmes nappes que celui de l'horloge, tracées une fois.
   * Ce qui varie, c'est l'opacité de l'objet — voir `halo`. Au plus fort il
   * double la lueur, sans rien tracer de plus que ce que l'horloge trace déjà.
   */
  private tracerEclat(): void {
    const g = this.halo
    g.clear()
    // De jour, il n'y a pas de battement : la lueur s'en va, l'horloge reste.
    if (this.mode === 'jour') return
    for (let i = HALO_HORLOGE.nappes; i >= 1; i -= 1) {
      g.circle(HORLOGE.x, HORLOGE.y, (HORLOGE.rayon * HALO_HORLOGE.rayon * i) / HALO_HORLOGE.nappes)
        .fill({ color: BLANC, alpha: HALO_HORLOGE.alpha })
    }
  }

  /** La bande du quai au-dessus des rails, soulignée d'un liseré (§5.4). */
  private tracerBordure(): void {
    const g = this.bordure
    g.clear()
    const q = PIECES.quai
    const c = this.cellule
    ligneCellules(g, DEBUT_GARE, q.y, FIN_GARE, q.y, c)
    ligneCellules(g, DEBUT_GARE, q.y + q.epaisseur, FIN_GARE, q.y + q.epaisseur, c)
    g.fill({ color: GRIS })
  }

  /**
   * L'horloge entière, dans la racine **allumée** : halo, cadran blanc,
   * graduations et aiguilles à la vraie heure.
   *
   * Le halo est un dégradé en nappes (voir `HALO_HORLOGE`), et le cadran un
   * **disque blanc plein** : la maquette en montre un, l'ancien anneau de
   * points n'en faisait pas un. Graduations et aiguilles passent donc au
   * **noir du projet**, celui que le shader rend à la couleur du fond : sur un
   * cadran blanc, elles sont des creux, et du gris sur du blanc ne se verrait
   * pas. C'est la règle « blanc ou absent » appliquée à l'envers, pas levée.
   *
   * Le cadran ne change qu'avec le cadrage et les aiguilles qu'à la minute,
   * mais tout se trace d'un seul `Graphics` : une minute, quelques centaines
   * de cellules.
   */
  private tracerAiguilles(): void {
    const maintenant = new Date()
    const minute = maintenant.getMinutes()
    if (minute === this.minuteTracee) return
    this.minuteTracee = minute

    const g = this.cadran
    g.clear()
    const { heures, minutes } = anglesHorloge(maintenant)
    const c = this.cellule
    const sur = (angle: number, longueur: number) => {
      const r = (angle * Math.PI) / 180
      return { x: HORLOGE.x + Math.sin(r) * longueur, y: HORLOGE.y - Math.cos(r) * longueur }
    }
    // Le halo, du plus large au plus étroit : l'alpha se cumule vers le cadran.
    // De jour il n'est pas tracé — c'est un dégradé, et sur du papier un
    // dégradé blanc rendu en négatif ne donne qu'un pâté.
    if (this.mode !== 'jour') {
      for (let i = HALO_HORLOGE.nappes; i >= 1; i -= 1) {
        g.circle(HORLOGE.x, HORLOGE.y, (HORLOGE.rayon * HALO_HORLOGE.rayon * i) / HALO_HORLOGE.nappes)
          .fill({ color: BLANC, alpha: HALO_HORLOGE.alpha })
      }
    }
    // Le cadran : un disque blanc plein, sur lequel tout le reste se creuse.
    g.circle(HORLOGE.x, HORLOGE.y, HORLOGE.rayon).fill({ color: BLANC })

    for (let k = 0; k < 12; k += 1) {
      const a = sur(k * 30, HORLOGE.rayon * GRADUATION.de)
      const b = sur(k * 30, HORLOGE.rayon * GRADUATION.a)
      ligneCellules(g, a.x, a.y, b.x, b.y, c)
    }
    for (const [angle, part] of [
      [heures, 0.55],
      [minutes, 0.85],
    ] as const) {
      const f = sur(angle, HORLOGE.rayon * part)
      ligneCellules(g, HORLOGE.x, HORLOGE.y, f.x, f.y, c)
    }
    g.fill({ color: NOIR })
  }

  /* ------------------------------------------------------------ textures */

  /**
   * On fabrique tout avant de rien détruire : `fabriquerPiece` rend la main au
   * rendu, et une texture détruite encore montée fait tomber tout Pixi. Mêmes
   * trois chemins dégradés que `Birds.refaireTextures` : un cadrage qui en
   * double un autre, un démontage au milieu, et une pièce qui échoue.
   *
   * Sur ce dernier, on s'écarte de `Birds`, qui abandonne la fournée entière
   * dès qu'une pose manque — un oiseau a besoin de **toutes** ses poses. Les
   * pièces du quai sont indépendantes : on échange donc **pièce par pièce**, et
   * celle qui a échoué garde sa texture d'avant. La détruire quand même
   * laisserait son sprite sur une texture morte, qui fait tomber tout le rendu.
   */
  private async refaireTextures(): Promise<void> {
    // Sans contexte 2D — jsdom, ou un canvas refusé par la carte — il n'y a
    // rien à cuire, et `fabriquerPiece` attendrait le chargement d'une image
    // qui n'arrive jamais. Le quai garde alors sa bordure, son horloge et sa
    // lanterne, qui sont des `Graphics` et ne coûtent pas de texture.
    if (!document.createElement('canvas').getContext('2d')) return

    const jeton = (this.cuisson += 1)
    const faites = new Map<PieceDessinee, HTMLCanvasElement>()
    for (const piece of PIECES_DESSINEES) {
      const svg = this.svgs.get(piece)
      if (!svg) continue
      const cadre = CADRES[piece]
      const canvas = await fabriquerPiece(
        svg,
        boite(piece).largeur,
        cadre.hauteur / cadre.largeur,
        this.parCadre,
      )
      if (canvas) faites.set(piece, canvas)
    }
    if (this.detruite || jeton !== this.cuisson) return

    const remplacees: Texture[] = []
    for (const [piece, canvas] of faites) {
      const texture = Texture.from(canvas)
      texture.source.scaleMode = 'nearest'
      const ancienne = this.textures.get(piece)
      this.textures.set(piece, texture)
      this.poser(piece, texture)
      // Seule l'ancienne d'une pièce **effectivement remplacée** meurt, et
      // seulement une fois la neuve montée sur son sprite.
      if (ancienne) remplacees.push(ancienne)
    }
    for (const texture of remplacees) texture.destroy(true)
  }

  private poser(piece: PieceDessinee, texture: Texture): void {
    let sprite = this.sprites.get(piece)
    if (!sprite) {
      sprite = new Sprite()
      sprite.anchor.set(0, 0)
      this.sprites.set(piece, sprite)
      const racine = ALLUMEES.includes(piece) ? this.racineAllumee : this.racineEteinte
      // Le bâtiment passe derrière les petites pièces : c'est le fond du quai.
      if (piece === 'batiment') racine.addChildAt(sprite, 0)
      // Le réverbère passe **sous** la lanterne : son dessin garde le verre en
      // creux (voir `LANTERNE`), et c'est le blanc tracé ici qui le remplit.
      // Au-dessus, le mât et le toit de la lampe masqueraient la lanterne, qui
      // est la source — un lampadaire éteint devant sa propre lampe.
      else if (piece === 'reverbere') racine.addChildAt(sprite, racine.getChildIndex(this.corpsLanterne))
      else racine.addChild(sprite)
    }
    const b = boite(piece)
    sprite.texture = texture
    sprite.setSize(b.largeur, b.hauteur)
    sprite.position.set(b.x, b.y)
  }

  destroy(): void {
    this.detruite = true
    this.battement?.kill()
    this.battement = null
    this.fondu?.kill()
    this.fondu = null
    // Jamais `sprite.texture.destroy()` : au premier passage c'est la texture
    // vide partagée de Pixi, et la détruire fait tomber tout le rendu. On ne
    // détruit que celles qu'on a fabriquées.
    for (const texture of this.textures.values()) texture.destroy(true)
    this.textures.clear()
    // Celles d'`Assets` ne sont pas à nous : on les lâche, on ne les tue pas.
    this.images.clear()
    this.sprites.clear()
    this.racineEteinte.destroy({ children: true })
    this.racineAllumee.destroy({ children: true })
  }
}
