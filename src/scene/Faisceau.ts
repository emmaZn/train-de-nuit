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
 * train (`Vitres.HALO_ALPHA`) **aux deux dégradés de la gare** : ce cône et le
 * halo de l'horloge. (Il y en avait trois : le halo rond de la lanterne a été
 * retiré le 21 novembre 2026, et la lanterne est depuis un blanc plein, qui ne
 * fait pas de mi-teinte.) Elle s'arrête là : le mur, la bordure, le massif et
 * le train restent blancs ou absents.
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
import { coneDuFaisceau, pointDuCone } from './cone'
import type { Cone } from './cone'
import { CouchesQuiTombent } from './NeigeLayer'
import { floconsDuCone } from './neige'
import { GRAIN_ECRAN } from './poses'
import { PIECES } from './quai'
import { alea } from './Sky'
import type { Grain } from './Sky'

/** Un grain par ce nombre de pixels² : 4 fois la poussière du fond (`1/600`). PROVISOIRE (§7). */
const DENSITE = 1 / 150
/** CONCEPT.md §11 : moins de particules sur mobile — mais le faisceau reste plus dense que le fond. */
const FACTEUR_MOBILE = 0.6
/** Sous ce nombre, un faisceau ne se lit plus comme un faisceau. */
const PLANCHER = 40

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
    const { x, y, t } = pointDuCone(cone, suivant)
    grains.push({
      x,
      y,
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

/**
 * La graine de la neige du cône. **Pas la 11 de la poussière** : les deux
 * tirages consomment `alea` dans le même ordre, et avec la même graine chaque
 * flocon tomberait exactement sur un grain — la neige se lirait comme de la
 * poussière plus grasse, et sous mouvement réduit les deux seraient confondues.
 */
const GRAINE_NEIGE = 29

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
  /**
   * La neige du cône : les mêmes couches qui tombent que la neige libre
   * (`CouchesQuiTombent`), tirées sur le **rectangle englobant** du cône
   * (`floconsDuCone`) et retenues dans le triangle par le masque — c'est donc
   * le masque, et lui seul, qui fait le cône. Elle vit sous `racine`, donc
   * **s'éteint avec le réverbère** sans qu'`allumer` ait à la nommer, et reste
   * dans `lumieres`, hors de toute teinte de nuit.
   *
   * Le conteneur est immobile (ce sont les couches, dedans, qui descendent) :
   * c'est lui qui porte le masque. PROVISOIRE (§7) : densité et éclat à régler
   * à vue (voir `floconsDuCone`).
   */
  private readonly flocons: Container
  private readonly neigeDuCone: CouchesQuiTombent
  private readonly geometrie = coneDuFaisceau(PIECES.reverbere)
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
    for (const nappe of nappesDuCone(this.geometrie)) {
      this.cone.poly(nappe.points).fill({ color: 0xffffff, alpha: nappe.alpha })
    }
    for (let i = 0; i < COUCHES; i += 1) {
      const g = new Graphics()
      this.couches.push(g)
      this.racine.addChild(g)
    }
    const geometrie = this.geometrie
    this.flocons = new Container()
    // Elle commence absente, comme la neige libre : la nuit la fera venir.
    this.flocons.alpha = 0
    // Le masque est le polygone du cône. Il reste dans l'arbre, à côté de ce
    // qu'il découpe, et ne bouge pas : seules les couches de flocons tombent.
    const masque = new Graphics()
      .poly([
        geometrie.sommet.x, geometrie.sommet.y,
        geometrie.base[1], geometrie.sommet.y + geometrie.hauteur,
        geometrie.base[0], geometrie.sommet.y + geometrie.hauteur,
      ])
      .fill(0xffffff)
    this.racine.addChild(masque)
    this.flocons.mask = masque
    this.racine.addChild(this.flocons)
    this.neigeDuCone = new CouchesQuiTombent(this.flocons, reducedMotion)
    parent.addChild(this.racine)
  }

  /** La neige du cône, pour les tests : son conteneur, ses couches, ses flocons. */
  get neige() {
    const n = this.neigeDuCone
    return {
      racine: this.flocons,
      decalages: n.decalages,
      nombreDeFlocons: n.nombreDeFlocons,
      hauteurDeBouclage: n.hauteurDeBouclage,
    }
  }

  /** Le conteneur du faisceau, pour les tests de plan. */
  get groupe(): Container {
    return this.racine
  }

  /** L'opacité de chaque couche, pour les tests. */
  get opacites(): number[] {
    return this.couches.map((g) => g.alpha)
  }

  /**
   * Allume ou éteint le faisceau tout entier : le cône peint, sa poussière et
   * la neige qui y tombe. Un seul interrupteur, parce que tout cela vit dans
   * `racine` — ce qui est dans le faisceau s'éteint avec lui.
   *
   * On **cache**, on ne vide pas : les tracés sont posés une fois (le cône à la
   * construction, les grains au cadrage) et les refaire au rallumage coûterait
   * sans rien donner.
   */
  allumer(allume: boolean): void {
    this.racine.visible = allume
  }

  /**
   * La neige du cône **est** la nuit, comme celle du fond (`Neige.setNuit`) :
   * sa seule opacité, sans rampe à elle. Elle ne touche **pas** au cône peint,
   * qui est aussi lumineux de jour que de nuit — mais il ne neige pas dans le
   * faisceau d'une traversée sans arrêt. Une nuit qui n'est pas un nombre ne
   * passe pas : NaN effacerait la neige sans retour.
   */
  setNuit(nuit: number): void {
    if (!Number.isFinite(nuit)) return
    this.flocons.alpha = Math.min(1, Math.max(0, nuit))
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
    const grains = grainsDuFaisceau(this.geometrie, 11, mobile)
    grains.forEach((grain, i) => {
      this.couches[i % COUCHES]
        .circle(grain.x, grain.y, Math.max(grain.r, rMin))
        .fill({ color: 0xffffff, alpha: grain.a })
    })
    // La neige se boucle sur la hauteur du cône. Tirée en pixels de cadre, elle
    // ne dépend pas de l'échelle : seul son rayon plancher la suit.
    this.neigeDuCone.poser(
      floconsDuCone(this.geometrie, GRAINE_NEIGE, mobile),
      this.geometrie.hauteur,
      rMin,
    )
  }

  /** Ça bouge tout seul : chaque couche respire à son rythme, déphasée des autres. */
  animer(dt: number): void {
    // La neige a son propre mouvement réduit : posée, elle ne tombe pas.
    this.neigeDuCone.animer(dt)
    if (!this.anime) return
    this.horloge += dt
    this.couches.forEach((g, i) => {
      const onde = 0.5 + 0.5 * Math.sin(this.horloge * (0.6 + 0.35 * i) + i * 1.9)
      g.alpha = 1 - CREUX * onde
    })
  }
}
