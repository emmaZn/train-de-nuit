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

/** Le fût, commun à tous les modèles : masse au milieu, deux arêtes, une pointe. */
function fut(x: number, p: Pinceau, demi = POTEAU.demiFut): void {
  p.masse(x - demi, POTEAU.epaule, x + demi, HORIZON)
  p.ligne(x - demi, POTEAU.epaule, x - demi, HORIZON)
  p.ligne(x + demi, POTEAU.epaule, x + demi, HORIZON)
  p.ligne(x - demi, POTEAU.epaule, x, POTEAU.sommet)
  p.ligne(x, POTEAU.sommet, x + demi, POTEAU.epaule)
}

/** Les deux isolateurs d'un bras, posés dessus. */
function isolateurs(x: number, bras: (typeof POTEAU.bras)[number], p: Pinceau): void {
  for (const cote of [-1, 1]) {
    const ix = x + cote * bras.isolateurs
    p.plein(ix - u(2.5), bras.y - u(7), ix + u(2.5), bras.y)
  }
}

/**
 * Quatre façons de tenir deux fils à la même hauteur. Elles ne se départagent
 * pas en texte : elles se regardent, dans la scène.
 */
export const MODELES: { nom: string; dessiner: (x: number, p: Pinceau) => void }[] = [
  {
    nom: 'deux bras',
    dessiner(x, p) {
      fut(x, p)
      for (const bras of POTEAU.bras) {
        p.masse(x - bras.demi, bras.y, x + bras.demi, bras.y + bras.epaisseur)
        p.ligne(x - bras.demi, bras.y, x + bras.demi, bras.y)
        p.ligne(x - bras.demi, bras.y + bras.epaisseur, x + bras.demi, bras.y + bras.epaisseur)
        p.ligne(x - bras.demi, bras.y, x - bras.demi, bras.y + bras.epaisseur)
        p.ligne(x + bras.demi, bras.y, x + bras.demi, bras.y + bras.epaisseur)
        const pied = bras.y + bras.hauban
        p.ligne(x - bras.isolateurs + u(8), bras.y + bras.epaisseur, x - POTEAU.demiFut, pied)
        p.ligne(x + bras.isolateurs - u(8), bras.y + bras.epaisseur, x + POTEAU.demiFut, pied)
        isolateurs(x, bras, p)
      }
    },
  },
  {
    nom: 'treillis',
    dessiner(x, p) {
      // Deux montants qui s'écartent vers le bas, croisés de traverses : un
      // pylône plutôt qu'un poteau.
      const haut = POTEAU.demiFut
      const bas = u(14)
      const ecart = (y: number) =>
        haut + ((bas - haut) * (y - POTEAU.epaule)) / (HORIZON - POTEAU.epaule)
      p.masse(x - haut, POTEAU.epaule, x + haut, POTEAU.bras[1].y)
      for (const cote of [-1, 1]) {
        p.ligne(x + cote * haut, POTEAU.epaule, x + cote * bas, HORIZON)
      }
      p.ligne(x - haut, POTEAU.epaule, x, POTEAU.sommet)
      p.ligne(x, POTEAU.sommet, x + haut, POTEAU.epaule)
      const pas = (HORIZON - POTEAU.epaule) / 5
      for (let i = 0; i < 5; i += 1) {
        const a = POTEAU.epaule + i * pas
        const b = a + pas
        p.ligne(x - ecart(a), a, x + ecart(b), b)
        p.ligne(x + ecart(a), a, x - ecart(b), b)
      }
      for (const bras of POTEAU.bras) {
        p.ligne(x - bras.demi, bras.y, x + bras.demi, bras.y)
        p.ligne(x - bras.demi, bras.y, x - ecart(bras.y) , bras.y + bras.hauban)
        p.ligne(x + bras.demi, bras.y, x + ecart(bras.y), bras.y + bras.hauban)
        isolateurs(x, bras, p)
      }
    },
  },
  {
    nom: 'fin',
    dessiner(x, p) {
      // Un mât mince, sans bras : les fils se posent sur de courts tenons.
      fut(x, p, u(2))
      for (const bras of POTEAU.bras) {
        for (const cote of [-1, 1]) {
          const bout = x + cote * bras.isolateurs
          p.ligne(x + cote * u(2), bras.y + u(2), bout, bras.y + u(2))
        }
        isolateurs(x, bras, p)
      }
    },
  },
  {
    nom: 'haubané',
    dessiner(x, p) {
      // Un mât tenu par deux longs haubans jusqu'au sol, comme un mât de
      // bateau. Le plus graphique des quatre.
      fut(x, p, u(2.5))
      for (const cote of [-1, 1]) {
        p.ligne(x + cote * u(2.5), POTEAU.epaule + u(6), x + cote * u(46), HORIZON)
      }
      for (const bras of POTEAU.bras) {
        p.ligne(x - bras.demi, bras.y, x + bras.demi, bras.y)
        isolateurs(x, bras, p)
      }
    },
  },
]

export class Cables {
  private readonly racine = new Container()
  private readonly rangee = new Container()
  private readonly fils = new Graphics()
  private poteaux: Sprite | null = null
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
  private modele = 0

  constructor(parent: Container) {
    parent.addChild(this.racine)
    this.racine.addChild(this.rangee)
    this.rangee.addChild(this.fils)
    this.placer(0)
  }

  /** TEMPORAIRE : comparer les modèles de poteau dans la scène. À retirer. */
  setModele(index: number): void {
    const i = Math.max(0, Math.min(MODELES.length - 1, index))
    if (i === this.modele) return
    this.modele = i
    this.poteaux = this.cuirePoteaux(this.rangee, this.poteaux)
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

  /** La rangée se pose sur le sol qui reste à parcourir, pas sur l'horloge. */
  placer(distanceGare: number): void {
    this.rangee.x = POSITION_A_QUAI + distanceGare
  }

  cadrer(frame: Frame, resolution: number): void {
    const parCadre = frame.scale * resolution
    if (parCadre === this.parCadre && this.poteaux) return
    this.parCadre = parCadre
    this.poteaux = this.cuirePoteaux(this.rangee, this.poteaux)
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
   * Les poteaux ne bougent pas : on les cuit une fois, en points, et on les
   * repose. Sans contexte 2D — jsdom, ou un canvas trop grand — la rangée
   * garde ses fils plutôt que de tout arrêter.
   */
  private cuirePoteaux(parent: Container, ancien: Sprite | null): Sprite | null {
    const k = this.parCadre
    const marge = u(60) + POTEAUX_SEULS * TRAVEE
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
    /** Un petit bloc plein, en points serrés : un isolateur. */
    const plein = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.fillStyle = GRIS_CSS
      const pas = Math.max(1, GRAIN_ECRAN)
      for (let yy = py(y0); yy < py(y1); yy += pas) {
        for (let xx = px(x0); xx < px(x1); xx += pas) {
          ctx.fillRect(Math.round(xx), Math.round(yy), pas, pas)
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

    // Les poteaux seuls, de part et d'autre, n'ont pas de fils : ils annoncent
    // la gare et la referment.
    // Les poteaux seuls, de part et d'autre, n'ont pas de fils : ils annoncent
    // la gare et la referment.
    const pinceau: Pinceau = { masse, ligne, plein }
    for (let p = -POTEAUX_SEULS; p < POTEAUX + POTEAUX_SEULS; p += 1) {
      MODELES[this.modele].dessiner(p * TRAVEE, pinceau)
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
