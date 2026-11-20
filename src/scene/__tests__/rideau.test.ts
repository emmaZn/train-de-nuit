import { describe, expect, it } from 'vitest'

import { HAUTEUR_FRISE, HORIZON } from '@/scene/layout'
import { HORLOGE } from '@/scene/quai'
import { BRAS, RIDEAU, Y_RANGE, horlogeTouchee, pointsBiseau } from '@/scene/rideau'

describe('la géométrie du rideau', () => {
  it('range le rideau hors de la fenêtre, quelle que soit sa taille', () => {
    // Le haut de la scène n'est pas rogné : il est **descendu** de 9 à 60 px
    // selon l'écran (`cadrageScene`). Rangé, le filet du bas du rideau doit être
    // au-dessus de ce bord-là, pas du bord de la scène.
    expect(Y_RANGE + RIDEAU.hauteur).toBeLessThanOrEqual(-60)
  })

  it('pose la plaque sous la frise et au-dessus de la gare', () => {
    expect(RIDEAU.yPose).toBeGreaterThan(HAUTEUR_FRISE)
    expect(RIDEAU.yPose + RIDEAU.hauteur).toBeLessThan(HORIZON)
  })

  it('pose deux bras symétriques, dans la largeur de la plaque', () => {
    const g = RIDEAU.x + BRAS.retrait
    const d = RIDEAU.x + RIDEAU.largeur - BRAS.retrait
    expect(g).toBeGreaterThan(RIDEAU.x)
    expect(d).toBeLessThan(RIDEAU.x + RIDEAU.largeur)
    expect(d - g).toBeCloseTo(RIDEAU.largeur - 2 * BRAS.retrait, 6)
  })

  it('ouvre l’horloge au clic sur son halo, et pas à côté', () => {
    expect(horlogeTouchee(HORLOGE.x, HORLOGE.y)).toBe(true)
    expect(horlogeTouchee(HORLOGE.x + HORLOGE.rayon * 2.2, HORLOGE.y)).toBe(true)
    expect(horlogeTouchee(HORLOGE.x + HORLOGE.rayon * 3, HORLOGE.y)).toBe(false)
    // Une cible de 44 px d'écran au minimum : c'est le halo, pas le cadran.
    expect(HORLOGE.rayon * 2.4).toBeGreaterThanOrEqual(44 / 0.65)
  })
})

describe('pointsBiseau', () => {
  it('coupe les quatre coins et garde les extrêmes du rectangle', () => {
    const p = pointsBiseau(0, 0, 100, 60, 10)
    expect(p).toHaveLength(16)
    expect(p.slice(0, 4)).toEqual([10, 0, 90, 0])
    const xs = p.filter((_, i) => i % 2 === 0)
    const ys = p.filter((_, i) => i % 2 === 1)
    expect(Math.min(...xs)).toBe(0)
    expect(Math.max(...xs)).toBe(100)
    expect(Math.min(...ys)).toBe(0)
    expect(Math.max(...ys)).toBe(60)
    // Aucun sommet dans un coin : c'est ce que « biseauté » veut dire.
    for (const coin of [[0, 0], [100, 0], [100, 60], [0, 60]]) {
      for (let i = 0; i < 16; i += 2) {
        expect([p[i], p[i + 1]]).not.toEqual(coin)
      }
    }
  })

  it('rend le rectangle quand le biseau est nul', () => {
    const p = pointsBiseau(0, 0, 100, 60, 0)
    expect(new Set(p.filter((_, i) => i % 2 === 0))).toEqual(new Set([0, 100]))
    expect(new Set(p.filter((_, i) => i % 2 === 1))).toEqual(new Set([0, 60]))
  })
})
