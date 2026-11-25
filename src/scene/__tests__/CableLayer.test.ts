import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'

import {
  Cables,
  MARGE,
  POSITION_A_QUAI,
  POTEAUX,
  POTEAUX_SEULS,
  releverPoteau,
} from '@/scene/CableLayer'
import { FILS, POTEAU, TRAVEE, u } from '@/scene/cables'
import { cellule, cellulesClaires } from '@/scene/grain'
import { HORIZON, MONDE, STAGE, TETE_LOCO } from '@/scene/layout'

function cables(): Cables {
  return new Cables(new Container())
}

/**
 * jsdom n'a pas de contexte 2D : sans ce bouchon, toute la cuisson des
 * poteaux sort par sa première porte et n'est jamais exercée.
 */
function avecContexte2d(): { canevas: number[]; rendre: () => void } {
  const canevas: number[] = []
  const vrai = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    canevas.push(this.width)
    return {
      fillStyle: '',
      fillRect: () => {},
    } as unknown as CanvasRenderingContext2D
  } as unknown as HTMLCanvasElement['getContext']
  return { canevas, rendre: () => (HTMLCanvasElement.prototype.getContext = vrai) }
}

const CADRE = { scale: 1, offsetX: 0, offsetY: 0 }

describe('Cables', () => {
  it('tient deux travées environ, pas une ligne infinie', () => {
    // Une étape avec arrêt ne parcourt qu'une largeur de cadre de sol : au-delà
    // de deux travées, l'île déborderait sur « ici », qui n'est que du ciel.
    expect(cables().travees).toBe(2)
    expect(POTEAUX).toBe(3)
    expect(TRAVEE * (POTEAUX - 1)).toBeLessThan(STAGE.width)
  })

  it('place l’île sur la distance à la gare, pas sur une horloge', () => {
    const c = cables()
    c.placer(0)
    const quai = c.positionSur(0, 1.5).x
    c.placer(500)
    expect(c.positionSur(0, 1.5).x).toBeCloseTo(quai + 500)
    expect(c.decalage).toBeCloseTo(POSITION_A_QUAI + 500)
  })

  it('à quai, les fils sont dans le champ libre à droite du nez de la loco', () => {
    const c = cables()
    c.placer(0)
    const nez = TETE_LOCO * STAGE.width
    for (const u of [1.1, 1.5, 1.9]) {
      expect(c.positionSur(0, u).x).toBeGreaterThan(nez)
    }
  })

  it('l’île s’arrête à ses poteaux porteurs, sans poteau seul devant ni derrière', () => {
    // Les poteaux seuls annonçaient la gare avant les fils (CONCEPT.md §4.2 :
    // « un poteau isolé passe, puis les fils, puis les oiseaux »). Retirés le
    // 23 novembre 2026 sur demande d'Emmanuelle : celui d'avant se plantait en
    // plein écran à côté de la loco à « ici », celui d'après traversait le
    // formulaire à « là-haut », et ni l'un ni l'autre ne portait quoi que ce
    // soit. Le §4.2 ne dit donc plus ce que la scène fait.
    const c = cables()
    expect(POTEAUX_SEULS).toBe(0)
    expect(c.emprise.gauche).toBeCloseTo(0)
    expect(c.emprise.droite).toBe(TRAVEE * c.travees)
  })

  it('l’emprise commence et finit sur les poteaux porteurs, maintenant qu’ils sont seuls', () => {
    // Avant le 23/11 elle les débordait des deux côtés, de la travée d'un
    // poteau seul. Il n'y en a plus : elle coïncide avec eux.
    const c = cables()
    c.placer(0)
    expect(c.emprise.gauche).toBeCloseTo(c.positionSur(0, 0).x - c.decalage)
    expect(c.emprise.droite).toBeCloseTo(c.positionSur(0, c.travees).x - c.decalage)
  })

  it('une secousse écarte le fil de son repos, puis s’éteint', () => {
    const c = cables()
    c.placer(0)
    const repos = c.positionSur(0, 1.5).y
    c.secouer(0, 1.5, TRAVEE * 0.01)
    expect(c.positionSur(0, 1.5).y).not.toBeCloseTo(repos)
    for (let i = 0; i < 300; i += 1) c.avancer(1 / 60)
    expect(c.positionSur(0, 1.5).y).toBeCloseTo(repos)
  })

  it('ne secoue que la travée touchée', () => {
    const c = cables()
    c.placer(0)
    const voisine = c.positionSur(0, 0.5).y
    c.secouer(0, 1.5, TRAVEE * 0.01)
    expect(c.positionSur(0, 0.5).y).toBeCloseTo(voisine)
  })

  it('pose les oiseaux sur le fil : la hauteur rendue est la ligne plus la flèche', () => {
    const c = cables()
    c.placer(0)
    expect(c.positionSur(1, 1.5).y).toBeGreaterThan(FILS[1].y)
    expect(c.positionSur(1, 1.5).y).toBeLessThan(FILS[1].y + FILS[1].controle)
  })

  it('tient un `u` hors des travées sans sortir du tableau des secousses', () => {
    const c = cables()
    c.placer(0)
    expect(() => c.secouer(0, -3, 1)).not.toThrow()
    expect(() => c.secouer(0, 99, 1)).not.toThrow()
    expect(Number.isFinite(c.positionSur(0, 99).y)).toBe(true)
  })

  it('se range tout seul : le conteneur parent retrouve ses enfants vides', () => {
    const parent = new Container()
    const c = new Cables(parent)
    expect(parent.children.length).toBe(1)
    c.destroy()
    expect(parent.children.length).toBe(0)
  })
})

describe('POSITION_A_QUAI', () => {
  it('laisse la deuxième travée entière à droite du nez de la loco', () => {
    expect(POSITION_A_QUAI + TRAVEE).toBeGreaterThanOrEqual(TETE_LOCO * STAGE.width)
  })
})

describe('la cuisson des poteaux', () => {
  it('ne cuit qu’un poteau, et le repose autant de fois qu’il en faut', () => {
    const { canevas, rendre } = avecContexte2d()
    try {
      const parent = new Container()
      const c = new Cables(parent)
      c.cadrer(CADRE, 1)
      // Un seul canevas, et il tient un poteau — pas toute l'installation.
      expect(canevas).toHaveLength(1)
      expect(canevas[0]).toBeLessThan(TRAVEE)
      expect(c.poteauxPoses).toBe(POTEAUX + 2 * POTEAUX_SEULS)
    } finally {
      rendre()
    }
  })

  it('ne garde jamais deux textures de poteau : la précédente est détruite', () => {
    const { rendre } = avecContexte2d()
    try {
      const c = new Cables(new Container())
      c.cadrer(CADRE, 1)
      c.cadrer(CADRE, 2)
      c.cadrer(CADRE, 3)
      expect(c.texturesVivantes).toBe(1)
    } finally {
      rendre()
    }
  })
})

describe('avant de savoir où est la gare', () => {
  it('ne se montre pas : tant qu’on ne l’a pas placée, elle n’est nulle part', () => {
    // La scène tourne sa première image avant que Vue ne lui dise la gare.
    // Une île qui se pose quand même s'ancre à « distance zéro », c'est-à-dire
    // à quai — et les oiseaux apparaissent à « ici ».
    const c = new Cables(new Container())
    expect(c.placee).toBe(false)
  })

  it('se montre dès qu’on la place', () => {
    const c = new Cables(new Container())
    c.placer(0)
    expect(c.placee).toBe(true)
  })
})

describe('horsChamp', () => {
  // Les bornes sont celles du monde : le plateau n'atteint plus les bords de
  // l'écran depuis que la scène recule, et s'en servir ferait disparaître les
  // câbles alors qu'on les voit encore.
  it('dit vrai quand l’installation est entièrement sortie par la gauche', () => {
    const c = cables()
    expect(
      c.horsChamp(MONDE.x - (POTEAUX - 1 + POTEAUX_SEULS) * TRAVEE - POSITION_A_QUAI - 10),
    ).toBe(true)
  })

  it('dit vrai quand elle n’est pas encore entrée par la droite', () => {
    expect(cables().horsChamp(MONDE.x + MONDE.width + POTEAUX_SEULS * TRAVEE)).toBe(true)
  })

  it('les garde tant qu’elles sont dans les marges du monde', () => {
    // Juste au-delà de l'ancien bord du plateau : autrefois rejetées, et
    // pourtant à l'écran dès que la scène recule.
    expect(cables().horsChamp(STAGE.width + 10)).toBe(false)
  })

  it('dit faux dès qu’un seul poteau est à l’écran', () => {
    const c = cables()
    expect(c.horsChamp(0)).toBe(false)
    // Le premier poteau de l'île tout juste au bord droit suffit à nous
    // interdire de bouger. Avant le 23/11 c'était un poteau seul, et l'île
    // restait donc à l'écran une travée de plus.
    expect(c.horsChamp(STAGE.width - POSITION_A_QUAI)).toBe(false)
  })
})

describe('releverPoteau', () => {
  /** Le relevé tel que `cuirePoteau` le demande, à une résolution donnée. */
  function releve(k: number) {
    const largeur = Math.round(MARGE * 2 * k)
    const hauteur = Math.round((HORIZON - POTEAU.sommet + u(20)) * k)
    return releverPoteau(k, largeur, hauteur, cellule(k))
  }

  it('relève à la fois de la masse et du trait', () => {
    const r = releve(2)
    expect(r.masse.some((v) => v === 1)).toBe(true)
    expect(r.trait.some((v) => v === 1)).toBe(true)
    expect(r.blocs.length).toBeGreaterThan(0)
  })

  it('n’écrit que des cellules allumées ou éteintes, jamais entre les deux', () => {
    const r = releve(2)
    expect([...r.masse].every((v) => v === 0 || v === 1)).toBe(true)
    expect([...r.trait].every((v) => v === 0 || v === 1)).toBe(true)
  })

  it('garde le même quadrillage d’une résolution à l’autre', () => {
    // C'est ce qui permet au grain de ne pas se rebattre quand la fenêtre
    // change de taille : le bruit est tiré sur la cellule, pas sur le pixel.
    const a = releve(1)
    const b = releve(2)
    expect([b.colonnes, b.lignes]).toEqual([a.colonnes, a.lignes])
  })

  it('pose la même matière à 1× et à 2×', () => {
    const a = releve(1)
    const b = releve(2)
    expect([...cellulesClaires(b.trait, b.masse, b.colonnes, b.lignes)]).toEqual([
      ...cellulesClaires(a.trait, a.masse, a.colonnes, a.lignes),
    ])
  })

  it('pose les blocs de masse sur des pixels entiers', () => {
    // Un bord à la moitié d'un pixel sort lissé par la toile, donc à moitié
    // transparent : le mur laisserait passer les étoiles (décision 12.2).
    for (const b of releve(2).blocs) {
      expect(Number.isInteger(b.x) && Number.isInteger(b.y)).toBe(true)
      expect(Number.isInteger(b.largeur) && Number.isInteger(b.hauteur)).toBe(true)
    }
  })

  it('tient le poteau dans sa toile, marge comprise', () => {
    const k = 2
    const largeur = Math.round(MARGE * 2 * k)
    const hauteur = Math.round((HORIZON - POTEAU.sommet + u(20)) * k)
    for (const b of releverPoteau(k, largeur, hauteur, cellule(k)).blocs) {
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.y).toBeGreaterThanOrEqual(0)
      expect(b.x + b.largeur).toBeLessThanOrEqual(largeur)
      expect(b.y + b.hauteur).toBeLessThanOrEqual(hauteur)
    }
  })

  it('sème la matière dans la masse, et le trait en garde l’essentiel', () => {
    const r = releve(2)
    const claires = cellulesClaires(r.trait, r.masse, r.colonnes, r.lignes)
    let traitPose = 0
    let matiere = 0
    for (let i = 0; i < claires.length; i += 1) {
      if (!claires[i]) continue
      if (r.trait[i]) traitPose += 1
      else matiere += 1
    }
    const trait = r.trait.reduce((n, v) => n + v, 0)
    // Le trait respire — quelques cellules sautent — sans se pointiller.
    expect(traitPose).toBeLessThan(trait)
    expect(traitPose).toBeGreaterThan(trait * 0.9)
    // Et la masse n'est plus un aplat.
    expect(matiere).toBeGreaterThan(0)
  })
})
