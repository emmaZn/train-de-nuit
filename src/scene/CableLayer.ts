/**
 * Les câbles de « plus loin », dans la scène.
 *
 * Deux rangées à deux vitesses : une proche, une lointaine plus lente. De la
 * profondeur par le rythme, pas par la perspective — la scène n'a pas de point
 * de fuite, et en donner un aux câbles, qui ont le pied sur les rails, ferait
 * du train un autocollant (cadrage §5, approche A).
 *
 * La classe s'appelle `Cables` mais son fichier `CableLayer.ts` : sur macOS,
 * `Cables.ts` est le même fichier que `cables.ts`, qui porte la géométrie.
 * C'est le précédent de `stars.ts` / `StarLayer.ts` (CONCEPT.md §9).
 */
import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import { HORIZON } from './layout'
import type { Frame } from './layout'
import { FILS, POTEAU, TRAVEE, amortir, u, yFil } from './cables'
import type { Secousse } from './cables'

/** Trois poteaux : deux travées, à peine une largeur de cadre. */
export const POTEAUX = 3

/** Où se pose le premier poteau de la rangée proche, à l'arrêt. */
export const POSITION_A_QUAI = 60

/** La rangée lointaine est décalée : ses poteaux ne doublent pas les autres. */
export const POSITION_A_QUAI_LOIN = POSITION_A_QUAI + TRAVEE * 0.45

/** Ce que la rangée lointaine parcourt pour un pas de la rangée proche. */
export const FACTEUR_LOIN = 0.6

/** Et de combien elle est dessinée plus petite. */
export const ECHELLE_LOIN = 0.62

/** Sur quelle longueur les bouts de l'île se dissolvent, au lieu de se couper. */
export const DISSOLUTION = u(220)

/** Cellule de grain, en texels du rendu — celle du massif et de la terre. */
export const GRAIN_ECRAN = 1.5

const GRIS = 0xededed
const GRIS_CSS = '#EDEDED'
const NOIR = '#0b0b0c'

/** Un générateur déterministe : les mêmes câbles d'une visite à l'autre. */
function alea(graine: number): () => number {
  let s = graine >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export class Cables {
  private readonly racine = new Container()
  private readonly loin = new Container()
  private readonly proche = new Container()
  private readonly filsLoin = new Graphics()
  private readonly filsProche = new Graphics()
  private poteauxLoin: Sprite | null = null
  private poteauxProche: Sprite | null = null
  private textures: Texture[] = []

  /** Une secousse par fil et par travée : le fil voisin ne bouge pas. */
  private readonly secousses: Secousse[][] = FILS.map(() =>
    Array.from({ length: POTEAUX - 1 }, () => ({ amplitude: 0, phase: 0 })),
  )

  /** Un bruit tiré une fois : un bruit neuf à chaque image ferait bouillir les fils. */
  private readonly bruit: Float32Array[] = FILS.map((_, i) => {
    const r = alea(9001 + i * 131)
    return Float32Array.from({ length: 4096 }, () => r())
  })

  private horloge = 0
  private parCadre = 1

  constructor(parent: Container) {
    parent.addChild(this.racine)
    this.racine.addChild(this.loin, this.proche)
    this.loin.addChild(this.filsLoin)
    this.proche.addChild(this.filsProche)
    // Mise à l'échelle autour de la ligne de rail : le pied des poteaux
    // lointains reste posé dessus.
    this.loin.scale.set(ECHELLE_LOIN)
    this.loin.y = HORIZON * (1 - ECHELLE_LOIN)
    this.placer(0)
  }

  get travees(): number {
    return POTEAUX - 1
  }

  get decalages(): { proche: number; loin: number } {
    return { proche: this.proche.x, loin: this.loin.x }
  }

  /** Les deux rangées se posent sur le sol qui reste à parcourir, pas sur l'horloge. */
  placer(distanceGare: number): void {
    this.proche.x = POSITION_A_QUAI + distanceGare
    this.loin.x = POSITION_A_QUAI_LOIN + distanceGare * FACTEUR_LOIN
  }

  cadrer(frame: Frame, resolution: number): void {
    const parCadre = frame.scale * resolution
    if (parCadre === this.parCadre && this.poteauxProche) return
    this.parCadre = parCadre
    this.poteauxProche = this.cuirePoteaux(this.proche, this.poteauxProche)
    this.poteauxLoin = this.cuirePoteaux(this.loin, this.poteauxLoin)
  }

  avancer(dt: number): void {
    this.horloge += dt
    for (const ligne of this.secousses) {
      for (const s of ligne) s.amplitude = amortir(s.amplitude, dt)
    }
    this.dessinerFils(this.filsProche, 1)
    this.dessinerFils(this.filsLoin, ECHELLE_LOIN)
  }

  /** Quelle travée porte cette abscisse, sans jamais sortir du tableau. */
  private travee(abscisse: number): number {
    return Math.min(this.travees - 1, Math.max(0, Math.floor(abscisse)))
  }

  /** Où se pose un oiseau : `abscisse` continue, partie entière = travée. */
  positionSur(fil: number, abscisse: number): { x: number; y: number } {
    const t = abscisse - Math.floor(abscisse)
    return {
      x: this.proche.x + abscisse * TRAVEE,
      y: yFil(fil, t, this.secousses[fil][this.travee(abscisse)], this.horloge),
    }
  }

  secouer(fil: number, abscisse: number, force: number): void {
    const s = this.secousses[fil][this.travee(abscisse)]
    s.amplitude = Math.min(u(9), s.amplitude + force)
    // La phase repart du coup : la secousse commence à son maximum.
    s.phase = -this.horloge * 9
  }

  /**
   * Les fils sont redessinés à chaque image — c'est ce qui leur permet de
   * vibrer — en cellules tirées sur un bruit **fixe**. Les bouts de l'île se
   * dissolvent au lieu de se couper net : la langue du projet (CONCEPT §2).
   */
  private dessinerFils(g: Graphics, echelle: number): void {
    g.clear()
    const cellule = Math.max(1, GRAIN_ECRAN / (this.parCadre * echelle))
    const longueur = TRAVEE * this.travees
    for (let fil = 0; fil < FILS.length; fil += 1) {
      const bruit = this.bruit[fil]
      let i = 0
      for (let travee = 0; travee < this.travees; travee += 1) {
        const n = Math.max(8, Math.round(TRAVEE / cellule))
        for (let k = 0; k <= n; k += 1) {
          const t = k / n
          i = (i + 1) % bruit.length
          const x = (travee + t) * TRAVEE
          const bord = Math.min(x, longueur - x)
          const fondu = Math.min(1, Math.max(0, bord / DISSOLUTION))
          if (bruit[i] > FILS[fil].densite * fondu) continue
          const y = yFil(fil, t, this.secousses[fil][travee], this.horloge)
          g.rect(x - cellule / 2, y - cellule / 2, cellule, cellule)
        }
      }
    }
    g.fill({ color: GRIS })
  }

  /**
   * Les poteaux ne bougent pas : on les cuit une fois, en points, et on les
   * repose. Sans contexte 2D — jsdom, ou un canvas trop grand — la rangée
   * garde ses fils plutôt que de tout arrêter.
   */
  private cuirePoteaux(parent: Container, ancien: Sprite | null): Sprite | null {
    const k = this.parCadre
    const marge = u(60)
    const largeur = Math.round((TRAVEE * this.travees + marge * 2) * k)
    const hauteur = Math.round((HORIZON - POTEAU.sommet + u(20)) * k)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, largeur)
    canvas.height = Math.max(1, hauteur)
    const ctx = canvas.getContext('2d')
    if (!ctx) return ancien

    const px = (v: number) => (v + marge) * k
    const py = (v: number) => (v - POTEAU.sommet) * k
    const cellule = Math.max(1, GRAIN_ECRAN)

    const masse = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.fillStyle = NOIR
      ctx.fillRect(px(x0), py(y0), (x1 - x0) * k, (y1 - y0) * k)
    }
    const ligne = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.fillStyle = GRIS_CSS
      const n = Math.max(2, Math.ceil((Math.hypot(x1 - x0, y1 - y0) * k) / cellule))
      for (let i = 0; i <= n; i += 1) {
        const t = i / n
        ctx.fillRect(
          Math.round(px(x0 + (x1 - x0) * t)),
          Math.round(py(y0 + (y1 - y0) * t)),
          cellule,
          cellule,
        )
      }
    }

    for (let p = 0; p < POTEAUX; p += 1) {
      const x = p * TRAVEE
      masse(x - POTEAU.demiFut, POTEAU.epaule, x + POTEAU.demiFut, HORIZON)
      ligne(x - POTEAU.demiFut, POTEAU.epaule, x - POTEAU.demiFut, HORIZON)
      ligne(x + POTEAU.demiFut, POTEAU.epaule, x + POTEAU.demiFut, HORIZON)
      ligne(x - POTEAU.demiFut, POTEAU.epaule, x, POTEAU.sommet)
      ligne(x, POTEAU.sommet, x + POTEAU.demiFut, POTEAU.epaule)
      for (const bras of POTEAU.bras) {
        masse(x - bras.demi, bras.y, x + bras.demi, bras.y + bras.epaisseur)
        ligne(x - bras.demi, bras.y, x + bras.demi, bras.y)
        ligne(x - bras.demi, bras.y + bras.epaisseur, x + bras.demi, bras.y + bras.epaisseur)
      }
    }

    const texture = Texture.from(canvas)
    texture.source.scaleMode = 'nearest'
    this.textures.push(texture)
    const sprite = ancien ?? new Sprite()
    sprite.texture = texture
    sprite.setSize(largeur / k, hauteur / k)
    sprite.position.set(-marge, POTEAU.sommet)
    if (!ancien) parent.addChildAt(sprite, 0)
    return sprite
  }

  destroy(): void {
    // Jamais `sprite.texture.destroy()` : au premier passage c'est la texture
    // vide partagée de Pixi, et la détruire fait tomber tout le rendu.
    for (const t of this.textures) t.destroy(true)
    this.textures = []
    this.racine.destroy({ children: true })
  }
}
