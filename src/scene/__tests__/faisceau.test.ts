import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'

import { Faisceau, coneDuFaisceau, grainsDuFaisceau, nappesDuCone } from '@/scene/Faisceau'
import type { Cone } from '@/scene/Faisceau'
import { Quai } from '@/scene/QuaiLayer'
import { plansDuDecor } from '@/scene/Scene'
import { PIECES } from '@/scene/quai'
import { HORIZON, STAGE } from '@/scene/layout'
import type { Frame } from '@/scene/layout'

const cone = coneDuFaisceau(PIECES.reverbere)

/** Un triangle : sommet à la lanterne, base à `sommet.y + hauteur`. */
function aireDuCone(c: Cone): number {
  return ((c.base[1] - c.base[0]) * c.hauteur) / 2
}

/**
 * Un cheveu de tolérance, parce qu'un point du bord du cône y revient par un
 * aller-retour en virgule flottante : `nappesDuCone` calcule `y` depuis `t`,
 * on recalcule `t` depuis `y`, et les deux ne retombent pas toujours sur le
 * même dernier bit. L'écart mesuré vaut 2 × 10⁻¹³ pixel. Sans cette marge, le
 * test dit « hors du cône » d'un point qui est exactement dessus, et ce qu'il
 * garde — le cône ne déborde pas sur les rails — n'a rien à voir avec ça.
 */
const CHEVEU = 1e-9

function dansLeCone(c: Cone, g: { x: number; y: number }): boolean {
  const t = (g.y - c.sommet.y) / c.hauteur
  if (t < -CHEVEU || t > 1 + CHEVEU) return false
  const gauche = c.sommet.x + (c.base[0] - c.sommet.x) * t
  const droite = c.sommet.x + (c.base[1] - c.sommet.x) * t
  return g.x >= gauche - CHEVEU && g.x <= droite + CHEVEU
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
    // Le vrai cône, sur mobile, reste très au-dessus du plancher.
    expect(grainsDuFaisceau(cone, 1, true).length).toBeGreaterThan(100)
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

/**
 * Le cône peint (réglage 3). Ce qui se garde ici n'est pas la valeur des
 * réglages — ils sont faits pour bouger — mais les deux choses que la maquette
 * demande et qu'on ne verrait pas casser dans jsdom : il tient dans le cône, et
 * il s'éteint avant les rails.
 */
describe('le cône peint', () => {
  const nappes = nappesDuCone(cone)

  it('tient tout entier dans le cône, donc jamais sur les rails', () => {
    for (const nappe of nappes) {
      for (let i = 0; i < nappe.points.length; i += 2) {
        expect(dansLeCone(cone, { x: nappe.points[i], y: nappe.points[i + 1] })).toBe(true)
      }
    }
  })

  it('s’éteint vers le bas : la dernière tranche est plus pâle que la première', () => {
    const haut = nappes[0].alpha
    const bas = nappes[nappes.length - 1].alpha
    expect(haut).toBeGreaterThan(0)
    expect(bas).toBeGreaterThan(0)
    expect(bas).toBeLessThan(haut / 10)
  })

  it('se recouvre : plusieurs nappes par tranche, pour faire le dégradé latéral', () => {
    const parTranche = nappes.filter((n) => n.points[1] === nappes[0].points[1])
    expect(parTranche.length).toBeGreaterThan(1)
    // Elles partagent l'alpha de leur tranche : c'est le cumul qui éclaire l'axe.
    expect(new Set(parTranche.map((n) => n.alpha)).size).toBe(1)
  })
})

describe('le faisceau dans la scène', () => {
  const cadre: Frame = { scale: 0.5, offsetX: 0, offsetY: 0 }

  function poser(reducedMotion = false) {
    const decor = new Container()
    const plans = plansDuDecor(decor)
    const planQuai = new Container()
    plans.plateauFond.addChild(planQuai)
    const quai = new Quai(planQuai, plans.lumieres, reducedMotion)
    return { plans, quai }
  }

  it('se monte avec le réverbère, dans le groupe des lumières', () => {
    const { plans, quai } = poser()
    expect(quai.allume.parent).toBe(plans.lumieres)
    expect(quai.allume.children).toContain(quai.lumiere.groupe)
  })

  it('respire : l’opacité des couches bouge quand on l’anime', () => {
    const f = new Faisceau(new Container())
    f.cadrer(cadre, false)
    const avant = f.opacites
    f.animer(1.3)
    expect(f.opacites).not.toEqual(avant)
  })

  it('sous mouvement réduit, il ne respire pas : l’opacité ne bouge pas', () => {
    const f = new Faisceau(new Container(), true)
    f.cadrer(cadre, false)
    const avant = f.opacites
    f.animer(1.3)
    f.animer(2.1)
    expect(f.opacites).toEqual(avant)
  })

  it('sous mouvement réduit, il est pourtant là, visible et immobile', () => {
    const { quai } = poser(true)
    quai.cadrer(cadre, 1, false)
    quai.animer(1.3)
    const f = quai.lumiere
    expect(f.groupe.parent).toBe(quai.allume)
    expect(f.groupe.visible).toBe(true)
    expect(f.groupe.children.length).toBeGreaterThan(0)
    expect(f.opacites.every((a) => a > 0)).toBe(true)
    expect(f.groupe.children.some((c) => !c.destroyed)).toBe(true)
  })
})
