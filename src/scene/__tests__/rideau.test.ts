import { describe, expect, it } from 'vitest'

import { HAUTEUR_FRISE, HORIZON, cadrageScene } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { HORLOGE } from '@/scene/quai'
import {
  BRAS,
  DEGAGEMENT_ECRAN,
  RIDEAU,
  horlogeTouchee,
  pointsBiseau,
  yPoseA,
  yRangeA,
} from '@/scene/rideau'

describe('la géométrie du rideau', () => {
  /**
   * Les fenêtres où les deux propriétés ont été trouvées en défaut : téléphones
   * (le décalage de `cadrageScene` y est de 60 px **d'écran**), et fenêtres
   * larges et basses (le cadre y est rogné en haut, jusque sous la frise).
   */
  const FENETRES: ReadonlyArray<readonly [number, number]> = [
    [320, 568], [390, 844], [600, 960], [768, 1024],
    [1440, 900], [1920, 600], [2560, 720], [3440, 800],
  ]

  // Le test compare en **pixels d'écran** : la frise et le bord de la fenêtre y
  // sont posés, et le rideau dans le cadre. Un seul nombre de cadre ne peut pas
  // dire « au-dessus de la fenêtre » : le rapport dépend de l'échelle.
  const ecranY = (frame: Frame, y: number) => frame.offsetY + y * frame.scale

  it.each(FENETRES)('range le rideau hors de la fenêtre à %i×%i', (w, h) => {
    const { frame } = cadrageScene(w, h)
    const bas = ecranY(frame, yRangeA(frame) + RIDEAU.hauteur)
    expect(bas).toBeLessThanOrEqual(-DEGAGEMENT_ECRAN + 1e-6)
  })

  it.each(FENETRES)('pose la plaque sous la frise, bandeau compris, à %i×%i', (w, h) => {
    const { frame } = cadrageScene(w, h)
    expect(ecranY(frame, yPoseA(frame))).toBeGreaterThanOrEqual(
      HAUTEUR_FRISE + DEGAGEMENT_ECRAN - 1e-6,
    )
    // On ne monte jamais plus haut que la cible : `yPoseA` ne fait que borner vers le bas.
    expect(yPoseA(frame)).toBeGreaterThanOrEqual(RIDEAU.yPose)
  })

  it('garde la plaque posée au-dessus de la gare', () => {
    // En pixels de cadre, le sol de la gare et la plaque partagent un repère.
    expect(RIDEAU.yPose + RIDEAU.hauteur).toBeLessThan(HORIZON)
    for (const [w, h] of FENETRES) {
      const { frame } = cadrageScene(w, h)
      expect(yPoseA(frame) + RIDEAU.hauteur, `${w}×${h}`).toBeLessThan(HORIZON)
    }
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
