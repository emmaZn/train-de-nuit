/**
 * Le quai d'« ailleurs », dans la scène.
 *
 * La classe s'appelle `Quai` mais son fichier `QuaiLayer.ts` : sur macOS,
 * `Quai.ts` est le même fichier que `quai.ts`, qui porte la géométrie. C'est le
 * précédent de `cables.ts` / `CableLayer.ts` (CONCEPT.md §9).
 *
 * **Deux racines, une seule île.** La règle des lumières (spec §6.3) dit que ce
 * qui s'éteint, c'est tout ce qui n'est pas une lumière. Le banc, la valise, le
 * bâtiment et la bordure s'éteignent : ils vivent dans un groupe filtré. Le
 * réverbère, le cadre du panneau et l'horloge sont des lumières : ils vivent hors de tout
 * groupe filtré. Mais c'est un seul objet posé sur un seul sol, alors
 * `avancer()` pose la **même abscisse** sur les deux racines : elles défilent
 * d'un seul mouvement, et rien ne peut les désynchroniser.
 *
 * Les lumières se montent **entre le voile du pied et la rame**, et non après
 * les vitres : le quai est derrière le train par construction, et après les
 * vitres le réverbère lui passerait devant à chaque départ. La gare a le droit
 * de passer en partie derrière la rame (`DECALAGE_GARE`).
 *
 * Profondeur : le bâtiment est ajouté en premier à la racine éteinte, donc
 * **derrière** le banc, la valise et la bordure ; la racine allumée est au-dessus
 * de l'éteinte, donc le réverbère est devant le mur. Le bâtiment passe derrière
 * eux tous, ce qu'on a voulu.
 *
 * Les réglages marqués « provisoire » attendent la séance de réglage avec
 * Emmanuelle (spec §7) : taille et place des pièces, densité du grain. Ils sont
 * posés à vue, pas validés.
 */
import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import { HORIZON, STAGE } from './layout'
import type { Frame } from './layout'
import { CADRES, DEBUT_GARE, FIN_GARE, HORLOGE, PIECES } from './quai'
import { GRAIN_ECRAN, fabriquerPiece } from './poses'
import { Faisceau } from './Faisceau'

const GRIS = 0xededed
/** Le blanc plein des sources : plus clair que le gris du décor, c'est voulu. */
const BLANC = 0xffffff
/** Le noir du projet, celui que le shader de recoloration rend à la couleur du fond. */
const NOIR = 0x0b0b0c

/** Les pièces qui viennent d'un dessin. La bordure et le cadre se tracent ici. */
const PIECES_DESSINEES = ['reverbere', 'banc', 'valise', 'batiment'] as const
export type PieceDessinee = (typeof PIECES_DESSINEES)[number]

/**
 * Ce qui reste allumé. Les sources arrêtées par Emmanuelle sont le réverbère et
 * son faisceau, les vitres du train, le cadre du panneau des départs, et
 * l'horloge — celle-ci tracée en code (`horloge`), pas dessinée : son cadran
 * n'est plus dans `batiment.svg`.
 */
const ALLUMEES: readonly PieceDessinee[] = ['reverbere']

/** Le filet extérieur du panneau, et son cadre intérieur. PROVISOIRE (§7). */
const PANNEAU_FILET = 8

/**
 * Le cadran de l'horloge, en fractions de son rayon (celui du disque = 1).
 * Miroir de l'ancien dessin : graduations de 29 à 34 sur 36. PROVISOIRE (§7).
 */
const GRADUATION = { de: 29 / 36, a: 34 / 36 } as const

/* ----------------------------------------------------------------------------
 * Les trois sources de la gare sont des DÉGRADÉS (réglage 3).
 *
 * La maquette montre une lanterne blanche entourée d'une lueur, un cône plein
 * de lumière et une horloge à cadran blanc cerclée d'un halo. Les trois sont
 * des dégradés, donc des mi-teintes : c'est l'entorse à « blanc ou absent »
 * (CONCEPT §12.2) que la propriétaire avait déjà assumée pour le halo des
 * vitres du train (`Vitres.HALO_ALPHA`), et qu'elle étend ici. Elle s'arrête
 * aux sources : le mur, le banc, la valise, la bordure, le massif et la rame
 * restent blancs ou absents.
 *
 * Techniquement ce ne sont pas des dégradés de Pixi mais des **nappes** de
 * blanc translucide qui se recouvrent : un `FillGradient` se construit sur un
 * canvas 2D, que jsdom n'a pas, et les lumières disparaîtraient des tests.
 * L'alpha se cumule, et quelques dizaines de nappes se lisent comme un dégradé.
 * ------------------------------------------------------------------------- */

/**
 * Le corps vitré de la lanterne, en unités du SVG du réverbère — **miroir du
 * dessin**, à tenir à jour avec lui (même parti que `PORTE_SVG`). C'est le
 * trapèze `M24 48 L20 86 H60 L56 48` de `reverbere.svg`.
 *
 * Il est rempli **ici** et non dans le dessin : un `fill` dans un SVG part
 * dans la masse, que `fabriquerPiece` aplatit au noir du fond. Le réverbère
 * sortait donc en peigne de traits gris, et la maquette veut une lampe.
 */
const LANTERNE_SVG = { hautY: 48, basY: 86, hautDemi: 16, basDemi: 20, cx: 40 } as const

/**
 * La lueur autour de la lanterne : rayon en unités du SVG du réverbère, et
 * opacité d'**une** nappe. Les nappes se cumulent au centre — à 0,022 et 60
 * nappes, le cœur monte vers 0,74. **Le réglage de la luminosité du
 * lampadaire, c'est `alpha`** ; `rayon` dit jusqu'où la lueur porte.
 *
 * Le nombre de nappes, lui, n'est pas un réglage de goût : c'est la finesse
 * du dégradé. À 26 nappes de 0,05, les marches se voyaient en anneaux autour
 * de la lampe. PROVISOIRE (§7).
 */
const LUEUR = { rayon: 150, nappes: 60, alpha: 0.022 } as const

/**
 * Le halo de l'horloge : rayon en fractions du rayon du cadran, et opacité
 * d'une nappe. Il remplace les deux cercles de points de l'ancien dessin, qui
 * se lisaient comme un anneau et non comme un halo. **Le réglage de la
 * luminosité de l'horloge, c'est `alpha`** ; `nappes`, comme pour `LUEUR`,
 * n'est que la finesse du dégradé. PROVISOIRE (§7).
 */
export const HALO_HORLOGE = { rayon: 2.4, nappes: 48, alpha: 0.023 } as const

/**
 * Les deux pieds du panneau : écartement du bord du cadre, et largeur de chaque
 * pied (deux traits de cellules). Ils descendent jusqu'à `HORIZON`. PROVISOIRE (§7).
 */
const PANNEAU_PIED = { retrait: 40, largeur: 14 } as const

/** La hauteur de l'en-tête `PROCHAINS DÉPARTS`, sous laquelle court un filet. PROVISOIRE (§7). */
const PANNEAU_ENTETE = 56

/**
 * Les angles des deux aiguilles, en degrés. **0° = midi, sens horaire.**
 *
 * L'horloge du bâtiment est à la vraie heure. C'est, avec l'heure du panneau,
 * la seule chose du site qui ne soit pas sur l'horloge du train, et c'est
 * assumé. La petite aiguille avance avec les minutes (`× 0,5`), sinon elle
 * sauterait d'un douzième de tour à chaque heure pile.
 */
export function anglesHorloge(maintenant: Date): { heures: number; minutes: number } {
  const h = maintenant.getHours() % 12
  const m = maintenant.getMinutes()
  return { heures: h * 30 + m * 0.5, minutes: m * 6 }
}

/** Où se pose une pièce, en pixels de cadre, à l'arrêt. */
function boite(piece: PieceDessinee): {
  x: number
  y: number
  largeur: number
  hauteur: number
} {
  const cadre = CADRES[piece]
  const ratio = cadre.hauteur / cadre.largeur
  if (piece === 'batiment') {
    const p = PIECES.batiment
    return { x: p.x, y: p.pied - p.hauteur, largeur: p.largeur, hauteur: p.hauteur }
  }
  if (piece === 'reverbere') {
    const p = PIECES.reverbere
    const largeur = p.hauteur / ratio
    return { x: p.x - largeur / 2, y: p.pied - p.hauteur, largeur, hauteur: p.hauteur }
  }
  const p = PIECES[piece]
  const hauteur = p.largeur * ratio
  return { x: p.x - p.largeur / 2, y: p.pied - hauteur, largeur: p.largeur, hauteur }
}

/**
 * Un trait en cellules pleines, jamais lissé : le projet ne connaît pas les
 * mi-teintes (CONCEPT §2). C'est le `ligne()` de `CableLayer`, en repère de
 * cadre.
 */
function ligneCellules(
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

function rectCellules(
  g: Graphics,
  x: number,
  y: number,
  largeur: number,
  hauteur: number,
  cellule: number,
): void {
  ligneCellules(g, x, y, x + largeur, y, cellule)
  ligneCellules(g, x + largeur, y, x + largeur, y + hauteur, cellule)
  ligneCellules(g, x + largeur, y + hauteur, x, y + hauteur, cellule)
  ligneCellules(g, x, y + hauteur, x, y, cellule)
}

export class Quai {
  /** Ce qui s'éteint : banc, valise, bâtiment, bordure. */
  private readonly racineEteinte = new Container()
  /** Ce qui reste allumé : le réverbère, le faisceau, le cadre du panneau, l'horloge. */
  private readonly racineAllumee = new Container()

  private readonly bordure = new Graphics()
  private readonly cadran = new Graphics()
  private readonly cadrePanneau = new Graphics()
  /** La lanterne : sa lueur et son corps blanc, tracés en code, pas dessinés. */
  private readonly lanterne = new Graphics()
  private readonly faisceau: Faisceau

  private readonly svgs = new Map<PieceDessinee, string>()
  private readonly sprites = new Map<PieceDessinee, Sprite>()
  private readonly textures = new Map<PieceDessinee, Texture>()

  private parCadre = 1
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
   * `lumieres` est le groupe **non filtré**. Il vaut `parent` par défaut, ce
   * qui laisse construire un quai d'un seul tenant — c'est ce que font les
   * tests qui ne s'intéressent pas à l'assombrissement.
   */
  constructor(parent: Container, lumieres: Container = parent, reducedMotion = false) {
    parent.addChild(this.racineEteinte)
    lumieres.addChild(this.racineAllumee)
    this.racineEteinte.addChild(this.bordure)
    this.racineAllumee.addChild(this.cadrePanneau, this.cadran)
    // Le faisceau est dans la racine allumée : il suit l'île, et ne s'éteint pas.
    this.faisceau = new Faisceau(this.racineAllumee, reducedMotion)
    // La lanterne **après** le faisceau : c'est la source, rien ne passe
    // devant elle — sinon le sprite du réverbère, qui n'est que du trait.
    // Et jamais en tête de la racine allumée : `cadrePanneau` y reste premier.
    this.racineAllumee.addChild(this.lanterne)
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
    return this.svgs.size
  }

  /** La texture que porte une pièce, s'il y en a une. */
  texture(piece: PieceDessinee): Texture | null {
    return this.textures.get(piece) ?? null
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
    return distance + FIN_GARE < 0 || distance + DEBUT_GARE > STAGE.width
  }

  /**
   * Va chercher les dessins. Une pièce qui manque est sautée, jamais fatale :
   * la scène garde son quai et perd son banc, elle ne s'arrête pas — précédent
   * `Birds.charger`.
   */
  async charger(): Promise<void> {
    await Promise.all(
      PIECES_DESSINEES.map(async (piece) => {
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
   * **`nuit` ne sert toujours à rien ici**, et c'est voulu : les lumières du
   * quai — faisceau compris — ne s'éteignent pas, elles sont hors de tout
   * filtre, et le faisceau est aussi lumineux de jour que de nuit. Le paramètre
   * est gardé, préfixé, pour ne pas changer la signature de `avancer`.
   */
  avancer(distance: number, _nuit: number): void {
    this.racineEteinte.x = distance
    this.racineAllumee.x = distance
    if (!this.posee) {
      this.posee = true
      this.racineEteinte.visible = true
      this.racineAllumee.visible = true
    }
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
    this.tracerCadrePanneau()
    this.tracerLanterne()
    this.minuteTracee = -1
    this.tracerAiguilles()
  }

  /**
   * La lanterne : une lueur en nappes, puis le corps vitré en blanc plein.
   *
   * C'est la source de la gare, et elle doit être la chose la plus claire de
   * l'écran — d'où le blanc pur, et non le gris du décor. Voir `LANTERNE_SVG`
   * pour la raison qui interdit de la remplir dans son dessin.
   */
  private tracerLanterne(): void {
    const g = this.lanterne
    g.clear()
    const b = boite('reverbere')
    const k = b.largeur / CADRES.reverbere.largeur
    const px = (x: number) => b.x + x * k
    const py = (y: number) => b.y + y * k
    const cx = px(LANTERNE_SVG.cx)
    const cy = py((LANTERNE_SVG.hautY + LANTERNE_SVG.basY) / 2)
    // La lueur, du plus large au plus étroit : l'alpha se cumule vers le centre.
    for (let i = LUEUR.nappes; i >= 1; i -= 1) {
      g.circle(cx, cy, (LUEUR.rayon * k * i) / LUEUR.nappes).fill({
        color: BLANC,
        alpha: LUEUR.alpha,
      })
    }
    const { hautY, basY, hautDemi, basDemi, cx: c } = LANTERNE_SVG
    g.poly([
      px(c - hautDemi), py(hautY),
      px(c + hautDemi), py(hautY),
      px(c + basDemi), py(basY),
      px(c - basDemi), py(basY),
    ]).fill({ color: BLANC })
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
   * Le cadre du panneau, et ses deux pieds : double trait — un filet extérieur, un cadre
   * intérieur — et un filet sous l'en-tête. **Son intérieur n'est pas rempli** :
   * la nuit se voit au travers, et le texte du panneau est du DOM posé
   * par-dessus (spec §6.6).
   */
  private tracerCadrePanneau(): void {
    const g = this.cadrePanneau
    g.clear()
    const p = PIECES.panneau
    const c = this.cellule
    rectCellules(g, p.x, p.y, p.largeur, p.hauteur, c)
    rectCellules(
      g,
      p.x + PANNEAU_FILET,
      p.y + PANNEAU_FILET,
      p.largeur - 2 * PANNEAU_FILET,
      p.hauteur - 2 * PANNEAU_FILET,
      c,
    )
    const filet = p.y + PANNEAU_ENTETE
    ligneCellules(g, p.x + PANNEAU_FILET, filet, p.x + p.largeur - PANNEAU_FILET, filet, c)
    // Les pieds : même `Graphics`, donc même racine allumée que le cadre qu'ils
    // portent. Un pied éteint sous un cadre allumé casserait la jonction.
    for (const x0 of [p.x + PANNEAU_PIED.retrait, p.x + p.largeur - PANNEAU_PIED.retrait - PANNEAU_PIED.largeur]) {
      rectCellules(g, x0, p.y + p.hauteur, PANNEAU_PIED.largeur, HORIZON - (p.y + p.hauteur), c)
    }
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
    for (let i = HALO_HORLOGE.nappes; i >= 1; i -= 1) {
      g.circle(HORLOGE.x, HORLOGE.y, (HORLOGE.rayon * HALO_HORLOGE.rayon * i) / HALO_HORLOGE.nappes)
        .fill({ color: BLANC, alpha: HALO_HORLOGE.alpha })
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
    // qui n'arrive jamais. Le quai garde alors sa bordure et le cadre de son
    // panneau, qui sont des `Graphics` et ne coûtent pas de texture.
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
      else racine.addChild(sprite)
    }
    const b = boite(piece)
    sprite.texture = texture
    sprite.setSize(b.largeur, b.hauteur)
    sprite.position.set(b.x, b.y)
  }

  destroy(): void {
    this.detruite = true
    // Jamais `sprite.texture.destroy()` : au premier passage c'est la texture
    // vide partagée de Pixi, et la détruire fait tomber tout le rendu. On ne
    // détruit que celles qu'on a fabriquées.
    for (const texture of this.textures.values()) texture.destroy(true)
    this.textures.clear()
    this.sprites.clear()
    this.racineEteinte.destroy({ children: true })
    this.racineAllumee.destroy({ children: true })
  }
}
