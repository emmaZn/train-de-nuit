/**
 * Le faisceau du réverbère de « ailleurs » (spec §6.2).
 *
 * **Un cône peint, et de la poussière dessus.** La poussière — des points
 * pleins, de la même matière que `Sky.ts` — est ce qui fait vivre le faisceau,
 * et elle ne bouge pas d'un pouce. Mais seule, elle ne faisait pas de cône :
 * la maquette en montre un, large et plein de lumière, et quelques grains
 * épars le long du mât n'en sont pas un.
 *
 * Le cône est donc **un dégradé**, donc des mi-teintes. C'est l'entorse à
 * « blanc ou absent » (CONCEPT §12.2), étendue au réglage 3 des vitres du
 * train (`Vitres.HALO_ALPHA`) **aux trois sources de la gare** : la lueur de
 * la lanterne, ce cône, et le halo de l'horloge. Elle s'arrête là : le mur, le
 * banc, la valise, la bordure, le massif et le train restent blancs ou absents.
 *
 * Il est peint en nappes de blanc translucide qui se recouvrent — pas un
 * dégradé de Pixi : un `FillGradient` se construit sur un canvas 2D, que jsdom
 * n'a pas, et le faisceau disparaîtrait des tests. Des nappes, elles, se
 * cumulent en alpha et se lisent comme un dégradé.
 *
 * Il porte **sa propre population**, il n'éclaire pas celle du fond : la
 * poussière à `1/600` par pixel² ne met qu'une centaine de points dans un cône
 * de cette taille, sans marge, et elle est encore réduite sur mobile.
 *
 * Il se monte dans la racine **allumée** du quai, donc dans `lumieres` : hors
 * de toute teinte d'assombrissement, et **devant** le voile du pied du massif — qui,
 * sans cela, éteindrait le bas du cône, là où il est le plus lumineux. Rien
 * n'est à reconstruire ici : c'est l'ordre des plans (`plansDuDecor`).
 *
 * Les réglages marqués « provisoire » attendent la séance avec Emmanuelle
 * (spec §7 : « la densité et la portée du faisceau »).
 */
import { Container, Graphics } from 'pixi.js'
import type { Frame } from './layout'
import { GRAIN_ECRAN } from './poses'
import { PIECES } from './quai'
import { alea } from './Sky'
import type { Grain } from './Sky'

export type Point = { x: number; y: number }

/** Le cône, en pixels de cadre, depuis la lanterne. */
export type Cone = {
  sommet: Point
  /** Les abscisses des deux coins de la base, à `sommet.y + hauteur`. */
  base: [number, number]
  hauteur: number
}

/**
 * D'où part le faisceau, en unités du cadre du réverbère : le **haut** du
 * corps vitré, qui court de 108 à 164 (`LANTERNE` dans `QuaiLayer.ts`). La
 * lanterne se tient donc dans la pointe du cône, là où il est le plus clair —
 * c'est ce qui la pose comme la source.
 *
 * Passé de 48 à 108 avec le lampadaire de la propriétaire : son dessin porte
 * une flèche et un toit au-dessus de la lanterne, là où l'ancien SVG avait
 * presque tout de suite le verre. Le sommet du cône **suit la lanterne**,
 * sinon il partirait du vide au-dessus d'elle.
 */
const HAUT_LANTERNE = 108
/** Le cadre du dessin : 560 unités de haut, posées à `piece.hauteur` pixels. */
const HAUTEUR_SVG = 560

/**
 * Demi-ouverture de la base, en pixels de cadre : **la largeur du faisceau**.
 * Elle commande le cône peint **et** la population de poussière, qui garde sa
 * densité — élargir le faisceau ne l'éclaircit pas, il en met simplement sur
 * plus de surface. Passée de 170 à 230 au réglage 3 : la maquette montre un
 * cône large. PROVISOIRE (§7) : à régler à vue.
 */
const DEMI_BASE = 230
/** De combien le cône s'arrête au-dessus du sol, en pixels. PROVISOIRE (§7) : à régler à vue. */
const GARDE_AU_SOL = 36

/** Un grain par ce nombre de pixels² : 4 fois la poussière du fond (`1/600`). PROVISOIRE (§7). */
const DENSITE = 1 / 150
/** CONCEPT.md §11 : moins de particules sur mobile — mais le faisceau reste plus dense que le fond. */
const FACTEUR_MOBILE = 0.6
/** Sous ce nombre, un faisceau ne se lit plus comme un faisceau. */
const PLANCHER = 40

export function coneDuFaisceau(piece: typeof PIECES.reverbere): Cone {
  const sommet = {
    x: piece.x,
    y: piece.pied - piece.hauteur + (HAUT_LANTERNE * piece.hauteur) / HAUTEUR_SVG,
  }
  return {
    sommet,
    base: [piece.x - DEMI_BASE, piece.x + DEMI_BASE],
    hauteur: piece.pied - GARDE_AU_SOL - sommet.y,
  }
}

/**
 * Les grains du faisceau : un tirage stable (`graine`), uniforme sur la surface
 * du cône — la profondeur se tire en racine carrée, sinon le sommet, plus
 * étroit, serait plus dense que la base.
 *
 * Plus lumineux vers le bas, comme la maquette : le bas du cône est la partie
 * qui se détache du massif.
 */
export function grainsDuFaisceau(cone: Cone, graine: number, mobile: boolean): Grain[] {
  const aire = ((cone.base[1] - cone.base[0]) * cone.hauteur) / 2
  const brut = aire * DENSITE * (mobile ? FACTEUR_MOBILE : 1)
  const nombre = Math.max(PLANCHER, Math.round(brut))
  const suivant = alea(graine)
  const grains: Grain[] = []
  for (let i = 0; i < nombre; i += 1) {
    const t = Math.sqrt(suivant())
    const u = suivant()
    const gauche = cone.sommet.x + (cone.base[0] - cone.sommet.x) * t
    const droite = cone.sommet.x + (cone.base[1] - cone.sommet.x) * t
    grains.push({
      x: gauche + (droite - gauche) * u,
      y: cone.sommet.y + cone.hauteur * t,
      r: 0.5 + suivant() * 1.2,
      a: (0.3 + suivant() * 0.5) * (0.55 + 0.45 * t),
    })
  }
  return grains
}

/* ---- Le cône peint. Les quatre réglages sont PROVISOIRES (§7), posés à vue
 *      sur la scène qui tourne, en regardant la maquette à côté. ---- */

/**
 * Opacité d'**une** nappe au sommet du cône. Elles se recouvrent : sur l'axe,
 * les `CONE_NAPPES` se cumulent — à 0,045 et 24 nappes, le cœur du cône monte
 * à environ 0,67, le bord reste à 0,045. C'est ce cumul qui fait le dégradé
 * latéral. **Le réglage de la luminosité du faisceau, c'est ce nombre.**
 * À 0,02 le cône ne se lisait plus sur le mur du bâtiment ; à 0,08 il lavait
 * le grain du massif.
 */
const CONE_ALPHA = 0.045
/**
 * Combien de nappes, de l'axe vers le bord : plus il y en a, plus le cœur est
 * clair — et plus le dégradé est fin. À six nappes, le cumul se voyait en
 * bandes à l'écran ; c'est le pas d'alpha (`CONE_ALPHA`) qui doit rester
 * petit, pas le nombre de nappes.
 */
const CONE_NAPPES = 24
/** En combien de tranches le cône se découpe en profondeur : la finesse du dégradé vertical. */
const CONE_BANDES = 28
/**
 * Jusqu'où le cône descend clair avant de s'éteindre : l'opacité suit
 * `1 - t^CONE_TENUE`, nulle à la base. Plus grand, plus il tient bas. À 2, il
 * mourait vers la moitié du mât ; la maquette le fait descendre sur le quai.
 */
const CONE_TENUE = 3

/**
 * Les nappes du cône : pour chaque tranche de profondeur, un trapèze par
 * nappe, du plus étroit au plus large. Pur calcul, pour que le dessin reste
 * une boucle lisible — et pour pouvoir le vérifier sans rastériser.
 */
export type NappeDuCone = { points: number[]; alpha: number }

export function nappesDuCone(cone: Cone): NappeDuCone[] {
  const nappes: NappeDuCone[] = []
  const bord = (t: number, large: number, cote: 0 | 1) =>
    cone.sommet.x + (cone.base[cote] - cone.sommet.x) * t * large
  for (let b = 0; b < CONE_BANDES; b += 1) {
    const t0 = b / CONE_BANDES
    const t1 = (b + 1) / CONE_BANDES
    const t = (t0 + t1) / 2
    const alpha = CONE_ALPHA * (1 - t ** CONE_TENUE)
    if (alpha <= 0) continue
    const y0 = cone.sommet.y + cone.hauteur * t0
    const y1 = cone.sommet.y + cone.hauteur * t1
    for (let n = 0; n < CONE_NAPPES; n += 1) {
      const large = (n + 1) / CONE_NAPPES
      nappes.push({
        points: [
          bord(t0, large, 0), y0,
          bord(t0, large, 1), y0,
          bord(t1, large, 1), y1,
          bord(t1, large, 0), y1,
        ],
        alpha,
      })
    }
  }
  return nappes
}

/** Les couches respirent chacune à leur rythme : quelques `Graphics`, pas un par grain. */
const COUCHES = 4
/** De combien une couche s'éteint au creux de sa respiration. */
const CREUX = 0.45

export class Faisceau {
  private readonly racine = new Container()
  /**
   * Le cône peint, **sous** la poussière et hors des couches qui respirent :
   * il est immobile, de jour comme de nuit, en mouvement réduit comme ailleurs.
   * C'est la masse de lumière ; la poussière, elle, est ce qui vit dedans.
   */
  private readonly cone = new Graphics()
  private readonly couches: Graphics[] = []
  private horloge = 0
  private echelle = 0
  private mobile: boolean | null = null

  /** Sous mouvement réduit, le faisceau reste allumé mais ne respire pas (CONCEPT §11). */
  private readonly anime: boolean

  constructor(parent: Container, reducedMotion = false) {
    this.anime = !reducedMotion
    // Le cône ne dépend que de la géométrie du quai : une fois tracé, il ne
    // bouge plus — ni avec l'échelle, ni avec l'écran.
    this.racine.addChild(this.cone)
    for (const nappe of nappesDuCone(coneDuFaisceau(PIECES.reverbere))) {
      this.cone.poly(nappe.points).fill({ color: 0xffffff, alpha: nappe.alpha })
    }
    for (let i = 0; i < COUCHES; i += 1) {
      const g = new Graphics()
      this.couches.push(g)
      this.racine.addChild(g)
    }
    parent.addChild(this.racine)
  }

  /** Le conteneur du faisceau, pour les tests de plan. */
  get groupe(): Container {
    return this.racine
  }

  /** L'opacité de chaque couche, pour les tests. */
  get opacites(): number[] {
    return this.couches.map((g) => g.alpha)
  }

  /** Retrace les grains quand l'échelle ou la taille de l'écran change — pas avant. */
  cadrer(frame: Frame, mobile: boolean): void {
    if (frame.scale === this.echelle && mobile === this.mobile) return
    this.echelle = frame.scale
    this.mobile = mobile
    // Jamais plus petit qu'un demi-grain d'écran : un point de moins d'un pixel
    // se lisserait en mi-teinte, et le projet n'en allume pas.
    const rMin = GRAIN_ECRAN / 2 / frame.scale
    for (const g of this.couches) g.clear()
    const grains = grainsDuFaisceau(coneDuFaisceau(PIECES.reverbere), 11, mobile)
    grains.forEach((grain, i) => {
      this.couches[i % COUCHES]
        .circle(grain.x, grain.y, Math.max(grain.r, rMin))
        .fill({ color: 0xffffff, alpha: grain.a })
    })
  }

  /** Ça bouge tout seul : chaque couche respire à son rythme, déphasée des autres. */
  animer(dt: number): void {
    if (!this.anime) return
    this.horloge += dt
    this.couches.forEach((g, i) => {
      const onde = 0.5 + 0.5 * Math.sin(this.horloge * (0.6 + 0.35 * i) + i * 1.9)
      g.alpha = 1 - CREUX * onde
    })
  }
}
