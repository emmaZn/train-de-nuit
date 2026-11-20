/**
 * Le rideau des départs : une plaque noire cernée de gris, pendue à deux bras
 * qui montent jusqu'au bord de l'écran, et qui descend ou se range d'un geste.
 *
 * Elle vit dans la **scène**, pas dans la gare : le plan que `Scene` lui donne
 * ne reçoit jamais d'abscisse, alors que tout ce qui est dans la racine du quai
 * voyage avec l'île. Ici, rien ne touche à `x` — seul `y` bouge.
 *
 * Le tracé obéit à « blanc ou absent » (CONCEPT §12.2) : deux couleurs pleines,
 * jamais de mi-teinte. Le noir du projet est ce que le filtre de recoloration
 * rend à la couleur du fond ; le gris est celui du décor. Le blanc pur est
 * réservé aux sources de lumière, et le rideau n'en est pas une.
 */
import gsap from 'gsap'
import { Container, Graphics } from 'pixi.js'
import { STAGE } from './layout'
import type { Frame } from './layout'
import { GRAIN_ECRAN } from './poses'
import { ligneCellules } from './QuaiLayer'
import { BISEAU, BRAS, RIDEAU, pointsBiseau, yPoseA, yRangeA } from './rideau'

const GRIS = 0xededed
const NOIR = 0x0b0b0c

/**
 * Durée et courbes : des réglages d'œil (spec §7), à reprendre en regardant la
 * scène. La descente dépasse un peu sa pose et s'y rassoit ; le rangement part
 * doucement et n'a pas besoin de rebond.
 */
const DUREE = 1.45
const COURBE_DESCENTE = 'back.out(1.1)'
const COURBE_REMONTEE = 'power2.inOut'

export class Rideau {
  private readonly racine = new Container()
  private readonly g = new Graphics()

  /**
   * Où en est la plaque, de 0 (rangée) à 1 (posée) — et un peu au-delà pendant
   * le dépassement. On interpole une **fraction** et non un `y` : la rangée et
   * la pose sont des fonctions du cadre, et une fenêtre qui se redimensionne
   * en pleine descente ne doit pas laisser la plaque viser un `y` périmé.
   */
  private readonly etat = { avancee: 0 }
  /** La seule tween vivante : `kill()` avant d'en créer une autre. */
  private tween: gsap.core.Tween | null = null
  private visee = false

  private cadre: Frame | null = null
  private parCadre = 0

  private readonly reducedMotion: boolean

  constructor(parent: Container, reducedMotion = false) {
    this.reducedMotion = reducedMotion
    this.racine.label = 'rideau'
    this.racine.addChild(this.g)
    parent.addChild(this.racine)
  }

  /** L'état **visé** : il change dès `baisser`, bien avant que la plaque arrive. */
  get baisse(): boolean {
    return this.visee
  }

  /**
   * La position courante du bord haut de la plaque, en pixels de cadre.
   * Avant le premier `cadrer` elle n'est nulle part : `NaN`, pas un zéro qui
   * ressemblerait à une vraie position.
   */
  get y(): number {
    if (!this.cadre) return Number.NaN
    const p = this.etat.avancee
    // Cette forme rend les bornes **exactes** à p = 0 et p = 1.
    return yRangeA(this.cadre) * (1 - p) + yPoseA(this.cadre) * p
  }

  baisser(): void {
    this.aller(true)
  }

  relever(): void {
    this.aller(false)
  }

  basculer(): void {
    this.aller(!this.visee)
  }

  cadrer(frame: Frame, resolution: number): void {
    this.cadre = frame
    const parCadre = frame.scale * resolution
    if (parCadre !== this.parCadre) {
      this.parCadre = parCadre
      this.tracer()
    }
    this.poser()
  }

  destroy(): void {
    this.tween?.kill()
    this.tween = null
    this.racine.destroy({ children: true })
  }

  private aller(baisse: boolean): void {
    this.visee = baisse
    this.tween?.kill()
    this.tween = null
    const but = baisse ? 1 : 0
    if (this.reducedMotion) {
      this.etat.avancee = but
      this.poser()
      return
    }
    // Même objet que la tween précédente : la nouvelle part d'où l'autre en était.
    this.tween = gsap.to(this.etat, {
      avancee: but,
      duration: DUREE,
      ease: baisse ? COURBE_DESCENTE : COURBE_REMONTEE,
      onUpdate: () => this.poser(),
      onComplete: () => {
        this.tween = null
      },
    })
  }

  private poser(): void {
    // Le tracé est en repère de plaque (haut à 0) : seul `y` se déplace.
    if (this.cadre) this.racine.y = this.y
  }

  /**
   * Le fond d'abord, puis tout le trait d'un seul `fill` gris : l'octogone et
   * les deux bras. Les bras montent bien au-delà du bord de la fenêtre ; c'est
   * le rognage qui les coupe, pas un calcul — la plaque peut être n'importe où
   * entre sa rangée et sa pose.
   */
  private tracer(): void {
    const g = this.g
    g.clear()
    // Le même plancher que le quai et les câbles : sous 1, le trait serait plus fin
    // que celui du décor, juste à côté, sur les écrans denses.
    const c = Math.max(1, GRAIN_ECRAN / this.parCadre)
    const { x, largeur, hauteur } = RIDEAU
    const sommets = pointsBiseau(x, 0, largeur, hauteur, BISEAU)

    g.poly(sommets).fill({ color: NOIR })

    for (let i = 0; i < sommets.length; i += 2) {
      const j = (i + 2) % sommets.length
      ligneCellules(g, sommets[i], sommets[i + 1], sommets[j], sommets[j + 1], c)
    }
    for (const bx of [x + BRAS.retrait, x + largeur - BRAS.retrait]) {
      // Un bras de `cellules` cellules de large, centré sur `bx`.
      for (let k = 0; k < BRAS.cellules; k += 1) {
        const dx = (k - (BRAS.cellules - 1) / 2) * c
        ligneCellules(g, bx + dx, 0, bx + dx, -STAGE.height, c)
      }
    }
    g.fill({ color: GRIS })
  }
}
