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
// `DEBUT_LIGNES_MS` et `DEBUT_ENTETE_MS` (`components/volets.ts`) sont calés sur
// cette durée et sur la courbe ci-dessous : le texte se pose pendant que la
// plaque finit de se rasseoir. Les changer ici sans eux désynchronise le tout.
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
  private echelleTracee = 0

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

  /**
   * `detache` : sous le seuil mobile, le panneau du DOM se pose sur la fenêtre
   * (et dessine ses propres bras) ; la plaque de scène ne se trace plus. Seul le
   * tracé s'éteint — l'objet garde son état et sa position, que la scène émet.
   */
  cadrer(frame: Frame, resolution: number, detache = false): void {
    this.racine.visible = !detache
    this.cadre = frame
    const parCadre = frame.scale * resolution
    // `scale` est dans la clé : le plancher du raster en dépend seul, et deux
    // couples (échelle, densité) de même produit n'ont pas le même pixel de raster.
    if (parCadre !== this.parCadre || frame.scale !== this.echelleTracee) {
      this.parCadre = parCadre
      this.echelleTracee = frame.scale
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
    // Trois planchers, en pixels de cadre. Les deux premiers sont ceux du quai et
    // des câbles : pas sous un pixel de cadre, pas sous le grain du décor.
    // Le troisième est celui du **raster** : le filtre de recoloration n'a pas de
    // `resolution`, il rastérise tout `decor` à un texel par pixel CSS, sans
    // anticrénelage, et un pixel de raster vaut `1 / frame.scale` pixels de
    // cadre — quelle que soit la densité de l'écran, que `parCadre` embarque.
    // Une cellule plus fine s'éteint dès qu'aucun centre de pixel ne tombe dedans,
    // et le filet va et vient avec la largeur de la fenêtre (0,75 px de raster
    // à 1512 px de large, dpr 2 : un bras et un bord de plaque disparus).
    const pixelRaster = 1 / (this.cadre?.scale ?? 1)
    const c = Math.max(1, pixelRaster, GRAIN_ECRAN / this.parCadre)
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
