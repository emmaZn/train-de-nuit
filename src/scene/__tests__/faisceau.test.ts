import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'

import { Faisceau, coneDuFaisceau, grainsDuFaisceau } from '@/scene/Faisceau'
import type { Cone } from '@/scene/Faisceau'
import { Quai } from '@/scene/QuaiLayer'
import { plansDuDecor } from '@/scene/Scene'
import { PIECES } from '@/scene/quai'
import { HORIZON, STAGE } from '@/scene/layout'

const cone = coneDuFaisceau(PIECES.reverbere)

/** Un triangle : sommet à la lanterne, base à `sommet.y + hauteur`. */
function aireDuCone(c: Cone): number {
  return ((c.base[1] - c.base[0]) * c.hauteur) / 2
}

function dansLeCone(c: Cone, g: { x: number; y: number }): boolean {
  const t = (g.y - c.sommet.y) / c.hauteur
  if (t < 0 || t > 1) return false
  const gauche = c.sommet.x + (c.base[0] - c.sommet.x) * t
  const droite = c.sommet.x + (c.base[1] - c.sommet.x) * t
  return g.x >= gauche && g.x <= droite
}

describe('la géométrie du faisceau', () => {
  it('part de la lanterne, au-dessus du pied du réverbère', () => {
    expect(cone.sommet.x).toBe(PIECES.reverbere.x)
    expect(cone.sommet.y).toBeGreaterThan(PIECES.reverbere.pied - PIECES.reverbere.hauteur)
    expect(cone.sommet.y).toBeLessThan(PIECES.reverbere.pied)
  })

  it('descend jusqu’au quai sans passer sous la voie', () => {
    expect(cone.sommet.y + cone.hauteur).toBeLessThanOrEqual(HORIZON)
  })

  it('s’ouvre vers le bas, de part et d’autre du mât, et tient dans le cadre', () => {
    expect(cone.base[0]).toBeLessThan(cone.sommet.x)
    expect(cone.base[1]).toBeGreaterThan(cone.sommet.x)
    expect(cone.base[0]).toBeGreaterThanOrEqual(0)
    expect(cone.base[1]).toBeLessThanOrEqual(STAGE.width)
  })
})

describe('les grains du faisceau', () => {
  it('le faisceau porte sa propre population, plus dense que la poussière du fond', () => {
    const aire = aireDuCone(cone)
    expect(grainsDuFaisceau(cone, 1, false).length).toBeGreaterThan(aire / 600)
  })

  it('même sur mobile, il reste plus dense que la poussière du fond', () => {
    const aire = aireDuCone(cone)
    expect(grainsDuFaisceau(cone, 1, true).length).toBeGreaterThan(aire / 600)
  })

  it('le faisceau garde un plancher de grains sur mobile', () => {
    const minuscule: Cone = { sommet: { x: 100, y: 0 }, base: [95, 105], hauteur: 10 }
    expect(grainsDuFaisceau(minuscule, 1, true).length).toBeGreaterThanOrEqual(40)
    expect(grainsDuFaisceau(cone, 1, true).length).toBeGreaterThan(0)
  })

  it('tous les grains tombent dans le cône', () => {
    for (const mobile of [false, true]) {
      for (const g of grainsDuFaisceau(cone, 1, mobile)) expect(dansLeCone(cone, g)).toBe(true)
    }
  })

  it('le tirage est stable : même graine, mêmes grains', () => {
    expect(grainsDuFaisceau(cone, 3, false)).toEqual(grainsDuFaisceau(cone, 3, false))
    expect(grainsDuFaisceau(cone, 3, false)).not.toEqual(grainsDuFaisceau(cone, 4, false))
  })

  it('les grains sont de la même matière que la poussière : opacité et rayon dans ses bornes hautes', () => {
    for (const g of grainsDuFaisceau(cone, 1, false)) {
      expect(g.a).toBeGreaterThan(0)
      expect(g.a).toBeLessThanOrEqual(1)
      expect(g.r).toBeGreaterThan(0)
      expect(g.r).toBeLessThanOrEqual(2)
    }
  })

  it('le bas du cône est plus lumineux que le haut', () => {
    const grains = grainsDuFaisceau(cone, 1, false)
    const moyenne = (liste: typeof grains) => liste.reduce((s, g) => s + g.a, 0) / liste.length
    const milieu = cone.sommet.y + cone.hauteur / 2
    expect(moyenne(grains.filter((g) => g.y > milieu))).toBeGreaterThan(
      moyenne(grains.filter((g) => g.y <= milieu)),
    )
  })
})

describe('le faisceau dans la scène', () => {
  function poser() {
    const decor = new Container()
    const plans = plansDuDecor(decor)
    const planQuai = new Container()
    plans.plateauFond.addChild(planQuai)
    const quai = new Quai(planQuai, plans.lumieres)
    return { plans, quai }
  }

  it('se monte avec le réverbère, dans le groupe des lumières', () => {
    const { plans, quai } = poser()
    expect(quai.allume.parent).toBe(plans.lumieres)
    expect(quai.allume.children.length).toBeGreaterThan(1)
  })

  it('ne s’anime pas sans casser, et accepte un cadrage', () => {
    const parent = new Container()
    const f = new Faisceau(parent)
    f.cadrer({ scale: 0.5, offsetX: 0, offsetY: 0 } as never, false)
    expect(() => f.animer(0.016)).not.toThrow()
    expect(parent.children.length).toBe(1)
  })
})
