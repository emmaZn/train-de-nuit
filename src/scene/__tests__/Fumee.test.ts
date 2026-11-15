import { describe, expect, it } from 'vitest'

import {
  CHEMINEE,
  DUREE,
  FERMETURE,
  LOBES,
  POINTS,
  RAYON,
  TAUX_ARRET,
  TAUX_VITESSE,
  avancer,
  fermeture,
  morte,
  naitre,
  rayon,
} from '@/scene/Fumee'

/** Un générateur sans surprise, pour que les tests ne dépendent pas du hasard. */
function tirage(valeurs: number[]): () => number {
  let i = 0
  return () => valeurs[i++ % valeurs.length]
}

describe('naitre', () => {
  it('sort de la cheminée', () => {
    const b = naitre(tirage([0.5]))
    expect(b.x).toBeCloseTo(CHEMINEE.x, 6)
    expect(b.y).toBe(CHEMINEE.y)
  })

  it('monte : la fumée ne tombe pas', () => {
    expect(naitre(tirage([0.3, 0.7]))?.vy).toBeLessThan(0)
  })

  it('a ses lobes et ses points, tirés une fois pour toutes', () => {
    const b = naitre(tirage([0.1, 0.6, 0.3, 0.9]))
    expect(b.lobes).toHaveLength(LOBES)
    expect(b.points).toHaveLength(POINTS)
  })

  it('garde ses points dans la bouffée', () => {
    const b = naitre(tirage([0.05, 0.42, 0.91, 0.27]))
    for (const p of b.points) expect(Math.hypot(p.dx, p.dy)).toBeLessThanOrEqual(1)
  })

  it('sait si elle naît à quai ou en marche', () => {
    expect(naitre(tirage([0.5]), 0).repos).toBe(1)
    expect(naitre(tirage([0.5]), 1).repos).toBe(0)
    expect(naitre(tirage([0.5]), 0.25).repos).toBeCloseTo(0.75, 10)
  })

  it('est déterministe à tirage égal', () => {
    const a = naitre(tirage([0.2, 0.8, 0.4]))
    const b = naitre(tirage([0.2, 0.8, 0.4]))
    expect(a).toEqual(b)
  })
})

describe('fermeture', () => {
  const b = naitre(tirage([0.5]))

  it('reste pleine la plus grande partie de sa vie', () => {
    expect(fermeture({ ...b, age: 0 })).toBe(1)
    expect(fermeture({ ...b, age: b.duree * (1 - FERMETURE) })).toBe(1)
  })

  it('se referme jusqu’à rien', () => {
    expect(fermeture({ ...b, age: b.duree })).toBeCloseTo(0, 6)
  })

  it('se referme sans à-coup', () => {
    let precedent = 1
    for (let t = 1 - FERMETURE; t <= 1; t += 0.02) {
      const f = fermeture({ ...b, age: b.duree * t })
      expect(f).toBeLessThanOrEqual(precedent + 1e-9)
      precedent = f
    }
  })
})

describe('rayon', () => {
  const b = naitre(tirage([0.5]))

  it('part de la taille annoncée', () => {
    expect(rayon({ ...b, age: 0 })).toBeCloseTo(RAYON, 6)
  })

  it('enfle, puis se referme', () => {
    const jeune = rayon({ ...b, age: b.duree * 0.2 })
    const milieu = rayon({ ...b, age: b.duree * 0.6 })
    const fin = rayon({ ...b, age: b.duree })
    expect(milieu).toBeGreaterThan(jeune)
    expect(fin).toBeCloseTo(0, 6)
  })
})

describe('avancer', () => {
  it('part en arrière d’autant que le train va vite', () => {
    const lent = naitre(tirage([0.5]), 0)
    const vif = naitre(tirage([0.5]), 1)
    avancer(lent, 0.5, 0)
    avancer(vif, 0.5, 1)
    expect(vif.x).toBeLessThan(lent.x - 100)
  })

  it('monte droit à quai, aux remous près', () => {
    const b = naitre(tirage([0.5]), 0)
    const x0 = b.x
    avancer(b, 0.2, 0)
    expect(b.y).toBeLessThan(CHEMINEE.y)
    expect(Math.abs(b.x - x0)).toBeLessThan(20)
  })

  it('meurt au bout de sa vie, jamais avant', () => {
    const b = naitre(tirage([0.5]))
    avancer(b, b.duree * 0.9, 0)
    expect(morte(b)).toBe(false)
    avancer(b, b.duree * 0.2, 0)
    expect(morte(b)).toBe(true)
  })
})

describe('les réglages', () => {
  it('reste une poignée de bouffées : c’est ce qui la distingue d’une nuée', () => {
    expect(TAUX_ARRET + TAUX_VITESSE).toBeLessThan(10)
    expect((TAUX_ARRET + TAUX_VITESSE) * DUREE).toBeLessThan(40)
  })

  it('fume plus vite quand le train tire', () => {
    expect(TAUX_VITESSE).toBeGreaterThan(0)
  })
})
