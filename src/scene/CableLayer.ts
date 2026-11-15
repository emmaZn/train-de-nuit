/**
 * Les câbles de « plus loin », dans la scène.
 *
 * Une seule rangée. La deuxième, plus lente et plus petite, a été construite
 * puis retirée : posée sur la même ligne de rail, ses fils tombaient **plus
 * bas** que ceux de la rangée proche et les croisaient. C'était cohérent — un
 * poteau plus court sur le même sol a ses fils plus bas — mais ça se lisait
 * comme de l'encombrement, pas comme de la distance.
 *
 * Ce qui reste de l'idée : quelques **poteaux seuls**, sans fils, avant et
 * après l'île. Un poteau isolé passe, puis les fils, puis les oiseaux : la gare
 * s'annonce au lieu de surgir (CONCEPT.md §4.2).
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

/** Où se pose le premier poteau porteur de fils, à l'arrêt. */
export const POSITION_A_QUAI = 60

/**
 * Combien de poteaux seuls, sans fils, de chaque côté de l'île.
 *
 * Un de chaque côté, et pas deux : la boucle fait quatre étapes de sol, et
 * l'installation doit pouvoir sortir entièrement par la gauche **avant** que
 * la suivante n'entre par la droite. À deux poteaux seuls, les deux fenêtres
 * se chevauchent et l'île devrait sauter sous les yeux du visiteur.
 */
export const POTEAUX_SEULS = 1

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

/** De quoi dessiner un poteau sans savoir sur quoi on dessine. */
export type Pinceau = {
  /** Un bloc de la couleur du fond : c'est lui qui éteint la montagne. */
  masse: (x0: number, y0: number, x1: number, y1: number) => void
  /** Un trait en points. */
  ligne: (x0: number, y0: number, x1: number, y1: number) => void
  /** Un petit bloc plein et clair : un isolateur. */
  plein: (x0: number, y0: number, x1: number, y1: number) => void
}

/**
 * Un isolateur de près : une tige, une cloche plus large, un chapeau.
 *
 * C'est la pièce qui dit « ligne électrique » plus sûrement que le poteau
 * lui-même — mais il faut qu'elle ait une silhouette, pas juste un bloc.
 */
function isolateurDetaille(ix: number, base: number, p: Pinceau): void {
  p.ligne(ix, base, ix, base - u(8))
  p.plein(ix - u(3.5), base - u(11), ix + u(3.5), base - u(8))
  p.plein(ix - u(2), base - u(13), ix + u(2), base - u(11))
}

/** Le fût, en tronc de cône : plus large au pied qu'au sommet. */
function futEffile(x: number, p: Pinceau, haut: number, bas: number): void {
  const tranches = 7
  const pas = (HORIZON - POTEAU.epaule) / tranches
  for (let i = 0; i < tranches; i += 1) {
    const y = POTEAU.epaule + i * pas
    const demi = haut + ((bas - haut) * i) / tranches
    p.masse(x - demi, y, x + demi, y + pas + 1)
  }
  for (const cote of [-1, 1]) {
    p.ligne(x + cote * haut, POTEAU.epaule, x + cote * bas, HORIZON)
  }
  p.ligne(x - haut, POTEAU.epaule, x, POTEAU.sommet)
  p.ligne(x, POTEAU.sommet, x + haut, POTEAU.epaule)
}

/**
 * Le poteau, dessiné une fois pour toutes.
 *
 * Trois autres modèles ont été comparés dans la scène — un treillis, un mât
 * fin, un mât haubané — et c'est celui-ci qu'Emmanuelle a retenu, « avec plus
 * de détail, de réalisme ». D'où le fût en tronc de cône, les échelons en
 * quinconce, les isolateurs en trois pièces, la boulonnerie et le pied élargi :
 * ce sont ces petites choses qui font un poteau et non une croix.
 */
export function dessinerPoteau(x: number, p: Pinceau): void {
  const haut = POTEAU.demiFut
  const bas = POTEAU.demiFut * 1.6
  futEffile(x, p, haut, bas)

  // Les échelons, en quinconce : de quoi monter réparer la ligne. C'est
  // le détail qui donne l'échelle du poteau.
  const demiA = (y: number) =>
    haut + ((bas - haut) * (y - POTEAU.epaule)) / (HORIZON - POTEAU.epaule)
  for (let y = POTEAU.bras[1].y + u(26), i = 0; y < HORIZON - u(24); y += u(26), i += 1) {
    const cote = i % 2 === 0 ? -1 : 1
    p.ligne(x + cote * demiA(y), y, x + cote * (demiA(y) + u(9)), y)
  }

  for (const bras of POTEAU.bras) {
    const bd = bras.y + bras.epaisseur
    p.masse(x - bras.demi, bras.y, x + bras.demi, bd)
    p.ligne(x - bras.demi, bras.y, x + bras.demi, bras.y)
    p.ligne(x - bras.demi, bd, x + bras.demi, bd)
    p.ligne(x - bras.demi, bras.y, x - bras.demi, bd)
    p.ligne(x + bras.demi, bras.y, x + bras.demi, bd)

    // Les deux jambes de force, et leur boulon sur le fût.
    const pied = bras.y + bras.hauban
    for (const cote of [-1, 1]) {
      p.ligne(x + cote * (bras.isolateurs - u(8)), bd, x + cote * demiA(pied), pied)
      p.plein(x + cote * demiA(pied) - u(2), pied - u(2), x + cote * demiA(pied) + u(2), pied + u(2))
    }

    // La boulonnerie qui tient le bras au fût.
    p.plein(x - u(6), bras.y + u(1), x - u(3), bd - u(1))
    p.plein(x + u(3), bras.y + u(1), x + u(6), bd - u(1))

    for (const cote of [-1, 1]) {
      isolateurDetaille(x + cote * bras.isolateurs, bras.y, p)
    }
  }

  // Le pied, là où le bois entre dans le ballast : un peu plus large.
  p.masse(x - bas - u(2), HORIZON - u(10), x + bas + u(2), HORIZON)
  p.ligne(x - bas - u(2), HORIZON - u(10), x + bas + u(2), HORIZON - u(10))
}

export class Cables {
  private readonly racine = new Container()
  private readonly rangee = new Container()
  private readonly fils = new Graphics()
  private readonly poteaux: Sprite[] = []
  private texturePoteau: Texture | null = null

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
  private posee = false

  constructor(parent: Container) {
    parent.addChild(this.racine)
    this.racine.addChild(this.rangee)
    this.rangee.addChild(this.fils)
    this.rangee.x = POSITION_A_QUAI
    // Tant qu'on ne sait pas où est la gare, l'île n'est nulle part : la scène
    // tourne sa première image avant que Vue ne lui dise d'où l'on part, et
    // une île qui se pose quand même s'ancre à quai — à « ici ».
    this.racine.visible = false
  }

  /** Combien de poteaux sont posés sur la ligne. */
  get poteauxPoses(): number {
    return this.poteaux.length
  }

  /** Combien de textures de poteau sont encore vivantes. Jamais plus d'une. */
  get texturesVivantes(): number {
    return this.texturePoteau ? 1 : 0
  }

  get travees(): number {
    return POTEAUX - 1
  }

  get decalage(): number {
    return this.rangee.x
  }

  /** Jusqu'où s'étend l'installation, poteaux seuls compris, en repère d'île. */
  get emprise(): { gauche: number; droite: number } {
    return {
      gauche: -POTEAUX_SEULS * TRAVEE,
      droite: (POTEAUX - 1 + POTEAUX_SEULS) * TRAVEE,
    }
  }

  /** A-t-on dit à l'île où elle était ? */
  get placee(): boolean {
    return this.posee
  }

  /** La rangée se pose sur le sol qui reste à parcourir, pas sur l'horloge. */
  placer(distanceGare: number): void {
    this.rangee.x = POSITION_A_QUAI + distanceGare
    this.posee = true
    this.racine.visible = true
  }

  cadrer(frame: Frame, resolution: number): void {
    const parCadre = frame.scale * resolution
    if (parCadre === this.parCadre && this.poteaux.length) return
    this.parCadre = parCadre
    this.cuirePoteau()
  }

  avancer(dt: number): void {
    this.horloge += dt
    for (const ligne of this.secousses) {
      for (const s of ligne) s.amplitude = amortir(s.amplitude, dt)
    }
    this.dessinerFils()
  }

  /** Quelle travée porte cette abscisse, sans jamais sortir du tableau. */
  private travee(abscisse: number): number {
    return Math.min(this.travees - 1, Math.max(0, Math.floor(abscisse)))
  }

  /** Où se pose un oiseau : `abscisse` continue, partie entière = travée. */
  positionSur(fil: number, abscisse: number): { x: number; y: number } {
    const t = abscisse - Math.floor(abscisse)
    return {
      x: this.rangee.x + abscisse * TRAVEE,
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
  private dessinerFils(): void {
    const g = this.fils
    g.clear()
    const cellule = Math.max(1, GRAIN_ECRAN / this.parCadre)
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
   * On ne cuit **qu'un seul poteau**, et on le repose autant de fois qu'il en
   * faut.
   *
   * Cuire toute l'installation d'un coup donnait une texture de douze mille
   * pixels de large en retina — des dizaines de mégaoctets, refaits à chaque
   * redimensionnement, et refusés par la carte au-delà de sa taille maximale.
   * Un poteau fait quelques dizaines de kilo-octets, et le nombre de poteaux
   * ne coûte plus rien à régler.
   *
   * Sans contexte 2D — jsdom, ou un canvas trop grand — la rangée garde ses
   * fils plutôt que de tout arrêter.
   */
  private cuirePoteau(): void {
    const k = this.parCadre
    const marge = u(70)
    const largeur = Math.round(marge * 2 * k)
    const hauteur = Math.round((HORIZON - POTEAU.sommet + u(20)) * k)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, largeur)
    canvas.height = Math.max(1, hauteur)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const px = (v: number) => (v + marge) * k
    const py = (v: number) => (v - POTEAU.sommet) * k
    const cellule = Math.max(1, GRAIN_ECRAN)

    const masse = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.fillStyle = NOIR
      ctx.fillRect(px(x0), py(y0), (x1 - x0) * k, (y1 - y0) * k)
    }
    const plein = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.fillStyle = GRIS_CSS
      for (let yy = py(y0); yy < py(y1); yy += cellule) {
        for (let xx = px(x0); xx < px(x1); xx += cellule) {
          ctx.fillRect(Math.round(xx), Math.round(yy), cellule, cellule)
        }
      }
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

    dessinerPoteau(0, { masse, ligne, plein })

    const texture = Texture.from(canvas)
    texture.source.scaleMode = 'nearest'

    while (this.poteaux.length < POTEAUX + 2 * POTEAUX_SEULS) {
      const sprite = new Sprite()
      sprite.anchor.set(0, 0)
      this.poteaux.push(sprite)
      this.rangee.addChildAt(sprite, 0)
    }
    this.poteaux.forEach((sprite, i) => {
      sprite.texture = texture
      sprite.setSize(largeur / k, hauteur / k)
      sprite.position.set((i - POTEAUX_SEULS) * TRAVEE - marge, POTEAU.sommet)
    })

    // L'ancienne n'est détruite qu'une fois la neuve montée partout : une
    // texture encore portée par un sprite ferait tomber tout le rendu.
    this.texturePoteau?.destroy(true)
    this.texturePoteau = texture
  }

  destroy(): void {
    // Jamais `sprite.texture.destroy()` : au premier passage c'est la texture
    // vide partagée de Pixi, et la détruire fait tomber tout le rendu. On ne
    // détruit que celle qu'on a fabriquée.
    this.texturePoteau?.destroy(true)
    this.texturePoteau = null
    this.poteaux.length = 0
    this.racine.destroy({ children: true })
  }
}
