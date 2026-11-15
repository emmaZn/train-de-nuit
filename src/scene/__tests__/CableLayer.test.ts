import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'

import { Cables, POSITION_A_QUAI, POTEAUX, POTEAUX_SEULS } from '@/scene/CableLayer'
import { FILS, TRAVEE } from '@/scene/cables'
import { STAGE, TETE_LOCO } from '@/scene/layout'

function cables(): Cables {
  return new Cables(new Container())
}

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

  it('des poteaux seuls annoncent la gare avant les fils, et la referment après', () => {
    // « Pour que ça ne surgisse pas de nulle part » : un poteau isolé passe,
    // puis les fils, puis les oiseaux (CONCEPT.md §4.2).
    const c = cables()
    expect(POTEAUX_SEULS).toBeGreaterThan(0)
    expect(c.emprise.gauche).toBeLessThan(0)
    expect(c.emprise.droite).toBeGreaterThan(TRAVEE * c.travees)
  })

  it('les fils ne vont que d’un poteau de l’île à l’autre, jamais jusqu’aux poteaux seuls', () => {
    const c = cables()
    c.placer(0)
    expect(c.emprise.gauche).toBeLessThan(c.positionSur(0, 0).x - c.decalage)
    expect(c.emprise.droite).toBeGreaterThan(c.positionSur(0, c.travees).x - c.decalage)
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
