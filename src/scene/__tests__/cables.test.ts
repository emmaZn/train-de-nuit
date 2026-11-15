import { describe, expect, it } from 'vitest'

import { HORIZON, STAGE } from '@/scene/layout'
import {
  ECHELLE_CABLE,
  FILS,
  POTEAU,
  TRAVEE,
  amortir,
  creux,
  distanceGare,
  yCadre,
  yFil,
} from '@/scene/cables'

describe('yCadre', () => {
  it('pose le pied des poteaux sur la ligne de rail', () => {
    expect(yCadre(586)).toBeCloseTo(HORIZON)
  })

  it('échelle le cadre 1280 du SVG sur celui de la scène', () => {
    expect(ECHELLE_CABLE).toBeCloseTo(STAGE.width / 1280)
    expect(TRAVEE).toBeCloseTo(620 * ECHELLE_CABLE)
  })

  it('met le sommet des poteaux au-dessus de leur épaule, et les deux au-dessus du rail', () => {
    expect(POTEAU.sommet).toBeLessThan(POTEAU.epaule)
    expect(POTEAU.epaule).toBeLessThan(HORIZON)
  })
})

describe('creux', () => {
  it('vaut la moitié du décalage du point de contrôle à mi-portée', () => {
    expect(creux(92, 0.5)).toBeCloseTo(46)
  })

  it('est nul aux deux poteaux', () => {
    expect(creux(92, 0)).toBeCloseTo(0)
    expect(creux(92, 1)).toBeCloseTo(0)
  })
})

describe('amortir', () => {
  it('éteint la secousse, sans jamais la relancer', () => {
    expect(amortir(9, 0.5)).toBeLessThan(9)
    expect(amortir(9, 0.5)).toBeGreaterThan(0)
  })

  it('éteint d’autant plus vite que l’image est longue', () => {
    expect(amortir(9, 0.5)).toBeLessThan(amortir(9, 0.1))
  })
})

describe('yFil', () => {
  it('au repos, le fil n’est que sa flèche', () => {
    const repos = { amplitude: 0, phase: 0 }
    expect(yFil(0, 0.5, repos, 3)).toBeCloseTo(FILS[0].y + creux(FILS[0].controle, 0.5))
  })

  it('secoué, il s’écarte de son repos', () => {
    const repos = { amplitude: 0, phase: 0 }
    const secoue = { amplitude: 9, phase: 0 }
    expect(yFil(0, 0.5, secoue, 0)).not.toBeCloseTo(yFil(0, 0.5, repos, 0))
  })

  it('ne bouge pas aux poteaux, même secoué : c’est là qu’il est attaché', () => {
    const secoue = { amplitude: 9, phase: 0 }
    expect(yFil(0, 0, secoue, 0)).toBeCloseTo(FILS[0].y)
    expect(yFil(0, 1, secoue, 0)).toBeCloseTo(FILS[0].y)
  })

  it('le fil du bas pend plus bas que celui du haut', () => {
    const repos = { amplitude: 0, phase: 0 }
    expect(yFil(1, 0.5, repos, 0)).toBeGreaterThan(yFil(0, 0.5, repos, 0))
  })
})

describe('distanceGare', () => {
  it('vaut zéro à quai', () => {
    expect(distanceGare(0, 0, 2273)).toBe(0)
  })

  it('vaut une étape de sol quand la gare est la prochaine', () => {
    expect(distanceGare(1, 0, 2273)).toBe(2273)
  })

  it('décroît avec l’avancement de l’étape', () => {
    expect(distanceGare(1, 0.5, 2273)).toBeCloseTo(1136.5)
  })

  it('devient négative une fois la gare dépassée', () => {
    expect(distanceGare(0, 0.5, 2273)).toBeLessThan(0)
  })
})
