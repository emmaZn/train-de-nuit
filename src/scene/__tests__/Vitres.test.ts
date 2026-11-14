import { describe, expect, it } from 'vitest'

import {
  ALLUMEES,
  AMPLITUDE,
  BOITES,
  DENSITE_BAS,
  DENSITE_HAUT,
  EXTINCTION,
  GRAIN_ECRAN,
  HALO_ALPHA,
  MARGE,
  PAS_SEUIL,
  PERIODE_REDESSIN,
  RETRAIT,
  alea,
  cadreVitre,
  densiteVisee,
  seuilVacillement,
} from '@/scene/Vitres'

describe('seuilVacillement', () => {
  it('ne descend jamais en dessous de l’amplitude annoncée, ni au-dessus de 1', () => {
    for (let t = 0; t < 400; t += 0.17) {
      for (const phase of [0, 1.7, 5.1, 11.9]) {
        const v = seuilVacillement(t, phase)
        expect(v).toBeGreaterThanOrEqual(1 - AMPLITUDE - 1e-9)
        expect(v).toBeLessThanOrEqual(1 + 1e-9)
      }
    }
  })

  it('n’éteint jamais une vitre : le vacillement n’est pas un clignotement', () => {
    expect(1 - AMPLITUDE).toBeGreaterThan(0.5)
  })

  it('désynchronise deux vitres', () => {
    const a = seuilVacillement(3, 0)
    const b = seuilVacillement(3, 1.7)
    expect(Math.abs(a - b)).toBeGreaterThan(PAS_SEUIL)
  })

  it('ne se répète pas sur une étape : les deux périodes sont incommensurables', () => {
    // Si les deux ondes se refermaient ensemble, le battement reviendrait.
    expect((1.37 / 0.9) % 1).toBeGreaterThan(0.1)
  })

  it('à amplitude nulle, la vitre est fixe', () => {
    expect(seuilVacillement(42, 3, 0)).toBe(1)
  })

  it('est déterministe', () => {
    expect(seuilVacillement(7.5, 2.1)).toBe(seuilVacillement(7.5, 2.1))
  })
})

describe('densiteVisee', () => {
  const largeur = 200
  const hauteur = 300
  const marge = 40

  it('éclaire le bas de la vitre plus que le haut : la lampe est en bas', () => {
    const haut = densiteVisee(marge, largeur / 2, largeur, hauteur, marge)
    const bas = densiteVisee(hauteur - marge - 1, largeur / 2, largeur, hauteur, marge)
    expect(haut).toBeCloseTo(DENSITE_HAUT, 6)
    expect(bas).toBeCloseTo(DENSITE_BAS, 6)
  })

  it('monte sans à-coup du haut vers le bas', () => {
    let precedent = -1
    for (let y = marge; y < hauteur - marge; y += 1) {
      const d = densiteVisee(y, largeur / 2, largeur, hauteur, marge)
      expect(d).toBeGreaterThanOrEqual(precedent)
      precedent = d
    }
  })

  it('ne pose aucun point hors de la vitre : le halo est un dégradé, pas du grain', () => {
    expect(densiteVisee(marge - 1, largeur / 2, largeur, hauteur, marge)).toBe(0)
    expect(densiteVisee(hauteur - marge, largeur / 2, largeur, hauteur, marge)).toBe(0)
    expect(densiteVisee(hauteur / 2, marge - 1, largeur, hauteur, marge)).toBe(0)
    expect(densiteVisee(hauteur / 2, largeur - marge, largeur, hauteur, marge)).toBe(0)
  })

  it('reste une densité, entre 0 et 1', () => {
    for (let y = 0; y < hauteur; y += 7) {
      const d = densiteVisee(y, largeur / 2, largeur, hauteur, marge)
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThanOrEqual(1)
    }
  })
})

describe('cadreVitre', () => {
  it('rentre dans la boîte et laisse sa place au halo', () => {
    const [x0, y0, x1, y1] = BOITES[0]
    const c = cadreVitre(BOITES[0])
    expect(c.x).toBe(x0 + RETRAIT - MARGE)
    expect(c.y).toBe(y0 + RETRAIT - MARGE)
    expect(c.largeur).toBe(x1 - x0 + 1 - 2 * RETRAIT + 2 * MARGE)
    expect(c.hauteur).toBe(y1 - y0 + 1 - 2 * RETRAIT + 2 * MARGE)
  })

  it('garde une vitre non vide une fois le retrait appliqué', () => {
    for (const b of BOITES) {
      expect(b[2] - b[0] + 1 - 2 * RETRAIT).toBeGreaterThan(0)
      expect(b[3] - b[1] + 1 - 2 * RETRAIT).toBeGreaterThan(0)
    }
  })
})

describe('les vitres d’un wagon', () => {
  it('sont six, de gauche à droite et sans chevauchement', () => {
    expect(BOITES).toHaveLength(6)
    for (let i = 1; i < BOITES.length; i += 1) {
      expect(BOITES[i][0]).toBeGreaterThan(BOITES[i - 1][2])
    }
  })

  it('ne sont pas toutes allumées, et pas les mêmes d’un wagon à l’autre', () => {
    expect(ALLUMEES).toHaveLength(2)
    for (const motif of ALLUMEES) {
      expect(motif).toHaveLength(BOITES.length)
      expect(motif.some((v) => v)).toBe(true)
      expect(motif.some((v) => !v)).toBe(true)
    }
    expect(ALLUMEES[0]).not.toEqual(ALLUMEES[1])
  })
})

describe('alea', () => {
  it('donne la même suite pour la même graine', () => {
    const a = alea(7)
    const b = alea(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('reste dans [0, 1[', () => {
    const r = alea(99)
    for (let i = 0; i < 500; i += 1) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('les réglages', () => {
  it('garde le grain du massif', () => {
    expect(GRAIN_ECRAN).toBe(1.5)
  })

  it('ne redessine pas plus de quinze fois par seconde', () => {
    expect(1 / PERIODE_REDESSIN).toBeLessThanOrEqual(15 + 1e-9)
  })

  it('laisse passer plusieurs extinctions dans une visite, sans en faire un clignotant', () => {
    expect(EXTINCTION.min).toBeGreaterThan(4)
    expect(EXTINCTION.max).toBeGreaterThan(EXTINCTION.min)
  })

  it('assume un halo visible : c’est l’entorse à « blanc ou absent »', () => {
    expect(HALO_ALPHA).toBeGreaterThan(0)
    expect(HALO_ALPHA).toBeLessThanOrEqual(1)
  })
})
