import gsap from 'gsap'
import { Container, Graphics } from 'pixi.js'
import { projeter } from './stars'
import type { Place } from './stars'
import type { Trace } from './types'

/**
 * Les cinq temps du §4.3 : 3,5 s en tout, dont 2,5 s de montée. Le temps 1
 * (le formulaire s'efface) et le temps 5 (il revient vide) sont au DOM ;
 * la scène tient les temps 2, 3 et 4.
 */
export const DUREE_DEFAIT = 0.6
export const DUREE_MONTEE = 2.5
export const DUREE_ECLAT = 0.4
export const DUREE_TOTALE = DUREE_DEFAIT + DUREE_MONTEE + DUREE_ECLAT

/** La police et la taille du formulaire (§4.3, `--police-texte` en Light). */
const POLICE = "300 17px 'Inter', system-ui, sans-serif"
/** Un pixel sur deux, dans les deux sens : assez dense, quatre fois moins lourd. */
const PAS = 2
/** En deçà, c'est l'anticrénelage du bord d'une lettre, pas de l'encre. */
const SEUIL = 90

const RAYON_GRAIN = 0.9
const RAYON_VOYAGEUR = 1.7
const RAYON_HALO_VOYAGEUR = 5
const RAYON_HALO_FINAL = 22
/** Part de la dissolution que les grains de droite attendent avant de partir. */
const ETALEMENT = 0.45
/** Ce que les grains parcourent vers le centre : 1 en ferait un point unique. */
const SERRAGE = 0.86
/** Ce que le nœud garde d'éclat pendant l'attente : jamais un ciel vide. */
const ECLAT_NOEUD = 0.5
/** Nombre de grains fantômes derrière celui qui monte. */
const TRAINE = 6
/** Écart, en part de montée, entre deux grains de la traîne. */
const PAS_TRAINE = 0.035
/** Part de la montée pendant laquelle les grains restés en bas s'effacent. */
const EXTINCTION_RESTE = 0.12

export type Grain = { x: number; y: number; a: number }

/** De quoi placer les grains sur l'écran : un `DOMRect` en est un. */
export type Rect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>

/**
 * **Il faut appeler `land` ou `revert`.** Une poignée abandonnée laisse le
 * nœud de grains à l'écran, sa timeline en vie et la dissolution dans la
 * scène : c'est le §9 qui l'exige, l'appelant doit toujours conclure, au pire
 * par `revert` passé son délai. La première des deux l'emporte ; la seconde
 * est sans effet et rend la même fin, déjà tenue.
 */
export type Poignee = {
  /** L'écriture a abouti : le grain monte, l'étoile s'allume. */
  land(trace: Trace): Promise<void>
  /** L'écriture a échoué : les grains se reforment en phrase. */
  revert(): Promise<void>
}

/**
 * Fonction pure : un tampon alpha devient des grains. Testable sans canvas.
 *
 * `alpha` porte les octets RGBA d'un `ImageData` — la forme que rend
 * `getImageData` — et seul l'octet alpha de chaque pixel est lu. Faire le pas
 * de quatre ici plutôt que dans la rastérisation réduit au minimum la seule
 * part non testable du fichier : celle qui touche au canvas.
 */
export function grainsDepuisAlpha(
  alpha: Uint8ClampedArray,
  w: number,
  h: number,
  pas: number,
  seuil: number,
): Grain[] {
  // Un pas nul ou négatif ferait une boucle sans fin.
  const saut = Math.max(1, Math.floor(pas))
  const grains: Grain[] = []
  for (let y = 0; y < h; y += saut) {
    for (let x = 0; x < w; x += saut) {
      const v = alpha[(y * w + x) * 4 + 3]
      if (v > seuil) grains.push({ x, y, a: v / 255 })
    }
  }
  return grains
}

/**
 * La phrase dessinée hors écran, puis relue en grains. C'est la seule part du
 * fichier qu'aucun test ne couvre : jsdom n'a pas de canvas, et un faux
 * canvas ne prouverait rien. Sans contexte 2D, la dissolution se joue sans
 * grains plutôt que de ne pas se jouer.
 */
export async function grainsDePhrase(phrase: string, depuis: Rect): Promise<Grain[]> {
  try {
    // `document.fonts` manque à jsdom comme aux navigateurs anciens : sans
    // elle, on rastérise tout de suite avec la police de repli.
    await document.fonts?.ready
  } catch {
    // Une police qui ne charge pas ne vaut pas de perdre la phrase.
  }
  const w = Math.max(1, Math.ceil(depuis.width))
  const h = Math.max(1, Math.ceil(depuis.height))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  ctx.font = POLICE
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(phrase, 0, h / 2)
  return grainsDepuisAlpha(ctx.getImageData(0, 0, w, h).data, w, h, PAS, SEUIL)
}

/**
 * La poignée du mouvement réduit, et celle des navigateurs sans WebGL : rien
 * ne s'anime, l'étoile se pose, et la première des deux fins l'emporte.
 */
export function poigneeSansAnimation(allumer: (trace: Trace) => void): Poignee {
  let tenue = false
  return {
    async land(trace: Trace): Promise<void> {
      if (tenue) return
      tenue = true
      allumer(trace)
    },
    async revert(): Promise<void> {
      tenue = true
    },
  }
}

export type DissolveOptions = {
  /** Où la phrase se tient à l'écran, en pixels CSS. */
  depuis: Rect
  /** La place libre que l'étoile prendra. */
  place: Place
  /** Les grains vivent là : espace écran, au-dessus du reste. */
  parent: Container
  viewportW: number
  viewportH: number
  /** Les grains de la phrase ; une liste vide est une réponse valable. */
  grains: Promise<Grain[]>
  /** Allume l'étoile : c'est la scène qui sait où va une trace. */
  allumer: (trace: Trace) => void
}

type Phase = 'defait' | 'attente' | 'montee' | 'reforme' | 'fini'

/** Lissage d'entrée et de sortie, pour que les grains ne partent pas d'un bloc. */
function douceur(p: number): number {
  return p * p * (3 - 2 * p)
}

/**
 * Une phrase qui se défait en grains, et le grain qui monte (§4.3).
 *
 * La timeline GSAP est créée en pause et avancée depuis `update` : la scène
 * n'a qu'une horloge, celle de Pixi, et une dissolution ne peut pas dériver
 * de la frise ni du train. C'est aussi ce qui donne gratuitement la
 * reformation : la même timeline jouée à l'envers.
 *
 * L'attente n'est pas un détail : l'écriture part à l'appui sur Entrée et la
 * dissolution ne l'attend pas. Si l'écriture est la plus lente, les grains
 * convergés patientent jusqu'à `land` ou `revert` ; si elle est la plus
 * rapide, la montée se joue quand même.
 */
export class Dissolve implements Poignee {
  private readonly opts: DissolveOptions
  private readonly tl: gsap.core.Timeline
  private readonly etat = { defait: 0, montee: 0, eclat: 0 }
  private readonly gfx = new Graphics()
  private readonly cible: { x: number; y: number }
  private readonly finie: Promise<void>
  private resoudre: () => void = () => {}

  private grains: Grain[] = []
  private centre: { x: number; y: number }
  private controle: { x: number; y: number }
  private gauche = 0
  private largeur: number

  private phase: Phase = 'defait'
  private issue: 'land' | 'revert' | null = null
  private trace: Trace | null = null
  private allumee = false

  constructor(opts: DissolveOptions) {
    this.opts = opts
    const vise = projeter(opts.place, opts.viewportW, opts.viewportH)
    this.cible = { x: vise.px, y: vise.py }
    this.centre = {
      x: opts.depuis.left + opts.depuis.width / 2,
      y: opts.depuis.top + opts.depuis.height / 2,
    }
    this.largeur = Math.max(1, opts.depuis.width)
    this.controle = this.controleVers(this.centre)
    this.finie = new Promise<void>((r) => {
      this.resoudre = r
    })

    opts.parent.addChild(this.gfx)
    // `lazy: false` : la timeline est avancée à la main, hors du ticker GSAP,
    // et un rendu différé ne serait jamais rattrapé.
    this.tl = gsap
      .timeline({ paused: true })
      .to(this.etat, { defait: 1, duration: DUREE_DEFAIT, ease: 'power2.in', lazy: false })
      .to(this.etat, { montee: 1, duration: DUREE_MONTEE, ease: 'power2.inOut', lazy: false })
      .to(this.etat, { eclat: 1, duration: DUREE_ECLAT, ease: 'power2.out', lazy: false })

    void opts.grains.then((g) => this.recevoir(g)).catch(() => {})
  }

  /** Vraie dès que la dissolution a joué sa fin : la scène peut l'oublier. */
  get fini(): boolean {
    return this.phase === 'fini'
  }

  land(trace: Trace): Promise<void> {
    if (this.issue === null) {
      this.issue = 'land'
      this.trace = trace
      if (this.phase === 'attente') this.phase = 'montee'
    }
    // Le second appel rend la même fin : elle se tient, elle ne pend pas.
    return this.finie
  }

  revert(): Promise<void> {
    if (this.issue === null) {
      this.issue = 'revert'
      if (this.phase === 'attente') this.phase = 'reforme'
    }
    return this.finie
  }

  update(dt: number): void {
    switch (this.phase) {
      case 'defait': {
        this.tl.time(Math.min(this.tl.time() + dt, DUREE_DEFAIT))
        this.dessiner()
        if (this.tl.time() >= DUREE_DEFAIT) this.phase = this.suite()
        return
      }
      case 'attente':
        // Le nœud de grains patiente : rien ne bouge, rien n'est à redessiner.
        return
      case 'montee': {
        this.tl.time(Math.min(this.tl.time() + dt, DUREE_TOTALE))
        if (!this.allumee && this.tl.time() >= DUREE_DEFAIT + DUREE_MONTEE) this.poserEtoile()
        this.dessiner()
        if (this.tl.time() >= DUREE_TOTALE) this.destroy()
        return
      }
      case 'reforme': {
        this.tl.time(Math.max(this.tl.time() - dt, 0))
        this.dessiner()
        if (this.tl.time() <= 0) this.destroy()
        return
      }
      default:
        return
    }
  }

  /**
   * L'écran a changé de taille : la place vise des pixels, pas une fraction.
   * Sur un téléphone, Entrée referme le clavier — la fenêtre change donc de
   * taille à l'instant même où la dissolution commence, et sans ce rappel le
   * grain se poserait là où l'étoile ne sera pas.
   */
  resize(viewportW: number, viewportH: number): void {
    if (this.phase === 'fini') return
    const vise = projeter(this.opts.place, viewportW, viewportH)
    this.cible.x = vise.px
    this.cible.y = vise.py
    this.controle = this.controleVers(this.centre)
    this.dessiner()
  }

  /** Idempotent : la fin se tient une fois, qu'elle vienne du temps ou de la scène. */
  destroy(): void {
    this.phase = 'fini'
    this.tl.kill()
    if (!this.gfx.destroyed) this.gfx.destroy()
    this.resoudre()
  }

  private suite(): Phase {
    if (this.issue === 'land') return 'montee'
    if (this.issue === 'revert') return 'reforme'
    return 'attente'
  }

  private poserEtoile(): void {
    this.allumee = true
    if (this.trace) this.opts.allumer(this.trace)
  }

  private recevoir(grains: Grain[]): void {
    if (grains.length === 0) return
    // Passé la convergence, le centre et la courbe sont en service : les
    // réécrire ferait sauter le grain en plein vol.
    if (this.phase !== 'defait' && this.phase !== 'attente') return
    this.grains = grains
    let xmin = Infinity
    let xmax = -Infinity
    let ymin = Infinity
    let ymax = -Infinity
    for (const g of grains) {
      if (g.x < xmin) xmin = g.x
      if (g.x > xmax) xmax = g.x
      if (g.y < ymin) ymin = g.y
      if (g.y > ymax) ymax = g.y
    }
    this.gauche = xmin
    this.largeur = Math.max(1, xmax - xmin)
    // Le centre du texte, pas celui du champ : l'encre peut n'en occuper
    // qu'un bout.
    this.centre = {
      x: this.opts.depuis.left + (xmin + xmax) / 2,
      y: this.opts.depuis.top + (ymin + ymax) / 2,
    }
    this.controle = this.controleVers(this.centre)
    // L'attente ne redessine rien d'elle-même. Sans ce rappel, des grains
    // arrivés après la convergence — police lente, première visite — ne
    // paraîtraient qu'à la montée, et l'attente montrerait un ciel vide.
    if (this.phase === 'attente') this.dessiner()
  }

  /** Le point de contrôle qui courbe la montée : droit d'abord, penché ensuite. */
  private controleVers(depart: { x: number; y: number }): { x: number; y: number } {
    return {
      x: depart.x + (this.cible.x - depart.x) * 0.12,
      y: depart.y - (depart.y - this.cible.y) * 0.78,
    }
  }

  /** Où en est un grain : ceux de droite partent après ceux de gauche. */
  private avancement(grain: Grain): number {
    const u = Math.min(1, Math.max(0, (grain.x - this.gauche) / this.largeur))
    const p = (this.etat.defait - u * ETALEMENT) / (1 - ETALEMENT)
    return Math.min(1, Math.max(0, p))
  }

  /** La courbe du grain qui monte, de la phrase à sa place dans le ciel. */
  private courbe(u: number): { x: number; y: number } {
    const t = Math.min(1, Math.max(0, u))
    const m = 1 - t
    return {
      x: m * m * this.centre.x + 2 * m * t * this.controle.x + t * t * this.cible.x,
      y: m * m * this.centre.y + 2 * m * t * this.controle.y + t * t * this.cible.y,
    }
  }

  private dessiner(): void {
    if (this.gfx.destroyed) return
    const g = this.gfx
    g.clear()
    const { montee, eclat } = this.etat

    // Temps 2 : la phrase se défait de gauche à droite, les grains se
    // resserrent vers le centre en s'éteignant — sans jamais s'éteindre tout
    // à fait, sinon l'attente ne montrerait rien. Ils ne s'effacent qu'au
    // décollage du grain élu.
    const reste = 1 - douceur(Math.min(1, montee / EXTINCTION_RESTE))
    if (reste > 0) {
      for (const grain of this.grains) {
        const p = this.avancement(grain)
        const ox = this.opts.depuis.left + grain.x
        const oy = this.opts.depuis.top + grain.y
        const k = SERRAGE * douceur(p)
        const a = grain.a * (1 - (1 - ECLAT_NOEUD) * p) * reste
        if (a <= 0.01) continue
        g.circle(ox + (this.centre.x - ox) * k, oy + (this.centre.y - oy) * k, RAYON_GRAIN).fill({
          color: 0xffffff,
          alpha: a,
        })
      }
    }

    // Temps 3 : un seul grain monte en courbe, avec son halo et sa traîne.
    if (montee > 0) {
      const tete = this.courbe(montee)
      g.circle(tete.x, tete.y, RAYON_HALO_VOYAGEUR).fill({ color: 0xffffff, alpha: 0.12 })
      for (let i = TRAINE; i >= 0; i--) {
        const p = this.courbe(montee - i * PAS_TRAINE)
        g.circle(p.x, p.y, i === 0 ? RAYON_VOYAGEUR : RAYON_GRAIN).fill({
          color: 0xffffff,
          alpha: 0.9 * (1 - i / (TRAINE + 1)),
        })
      }
    }

    // Temps 4 : le halo grossit puis se pose, pendant que l'étoile s'allume.
    if (eclat > 0) {
      g.circle(this.cible.x, this.cible.y, 2 + RAYON_HALO_FINAL * eclat).fill({
        color: 0xffffff,
        alpha: 0.45 * (1 - eclat),
      })
    }
  }
}
