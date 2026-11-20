import gsap from 'gsap'
import { Container, Graphics } from 'pixi.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Rideau } from '@/scene/RideauLayer'
import { fitStage } from '@/scene/layout'
import { plansDuDecor } from '@/scene/Scene'
import { yPoseA, yRangeA } from '@/scene/rideau'

const NOIR = 0x0b0b0c
const GRIS = 0xededed

/** Une fenêtre ordinaire, et le nombre de pixels d'écran par pixel de cadre. */
const CADRE = fitStage(1440, 900)
const PAR_CADRE = 0.62

/**
 * Avance la timeline globale de GSAP sans attendre le temps réel. Le second
 * argument est `suppressEvents = false` : par défaut le réglage du temps coupe
 * les `onUpdate`, et la plaque ne suivrait plus son interpolation.
 */
function avancerGsap(secondes: number): void {
  gsap.globalTimeline.time(gsap.globalTimeline.time() + secondes, false)
}

/** Les passes de remplissage du `Graphics`, dans l'ordre où elles ont été émises. */
function tracesDe(r: Rideau): { data: { style: { color: number; alpha: number } } }[] {
  const g = (r as unknown as { g: Graphics }).g
  return g.context.instructions.filter((i) => i.action === 'fill') as never
}

const vivants: Rideau[] = []
function nouveau(reducedMotion?: boolean, parent = new Container()): Rideau {
  const r = new Rideau(parent, reducedMotion)
  vivants.push(r)
  return r
}
afterEach(() => {
  for (const r of vivants.splice(0)) r.destroy()
})

describe('Rideau', () => {
  it('démarre rangé, hors de la fenêtre', () => {
    const r = nouveau()
    r.cadrer(CADRE, PAR_CADRE)
    expect(r.baisse).toBe(false)
    expect(r.y).toBe(yRangeA(CADRE))
  })

  it('ne dessine rien avant son premier cadrage', () => {
    const r = nouveau()
    expect(tracesDe(r)).toHaveLength(0)
  })

  it('baisse jusqu’à sa position posée, et relève jusqu’à la rangée', () => {
    const r = nouveau()
    r.cadrer(CADRE, PAR_CADRE)
    r.baisser()
    expect(r.baisse).toBe(true)
    avancerGsap(2)
    expect(r.y).toBeCloseTo(yPoseA(CADRE), 1)
    r.relever()
    expect(r.baisse).toBe(false)
    avancerGsap(2)
    expect(r.y).toBeCloseTo(yRangeA(CADRE), 1)
  })

  /** Deux clics rapides : la seconde timeline repart d'où la première en était. */
  it('ne laisse pas deux timelines se disputer la plaque', () => {
    const r = nouveau()
    r.cadrer(CADRE, PAR_CADRE)
    r.baisser()
    avancerGsap(0.4)
    const aMiCourse = r.y
    expect(aMiCourse).toBeGreaterThan(yRangeA(CADRE))
    r.relever()
    avancerGsap(0.05)
    expect(r.y).toBeLessThan(aMiCourse)
    avancerGsap(2)
    expect(r.y).toBeCloseTo(yRangeA(CADRE), 1)
  })

  it('sans animations, se pose d’un coup', () => {
    const r = nouveau(true)
    r.cadrer(CADRE, PAR_CADRE)
    r.baisser()
    expect(r.y).toBe(yPoseA(CADRE))
    r.relever()
    expect(r.y).toBe(yRangeA(CADRE))
  })

  it('suit le cadre quand la fenêtre change en pleine descente', () => {
    const r = nouveau()
    r.cadrer(CADRE, PAR_CADRE)
    r.baisser()
    avancerGsap(2)
    const etroit = fitStage(390, 800)
    r.cadrer(etroit, PAR_CADRE)
    expect(r.y).toBeCloseTo(yPoseA(etroit), 1)
  })

  it('n’allume rien à mi-teinte : deux couleurs pleines et pas d’autres', () => {
    const r = nouveau()
    r.cadrer(CADRE, PAR_CADRE)
    const passes = tracesDe(r)
    // Un `Graphics` vide passerait ce test à vide : il en faut au moins deux.
    expect(passes.length).toBeGreaterThanOrEqual(2)
    for (const passe of passes) {
      expect(passe.data.style.alpha).toBe(1)
      expect([NOIR, GRIS]).toContain(passe.data.style.color)
    }
  })

  it('pose le fond avant tout trait', () => {
    const r = nouveau()
    r.cadrer(CADRE, PAR_CADRE)
    const passes = tracesDe(r)
    expect(passes.length).toBeGreaterThanOrEqual(2)
    expect(passes[0].data.style.color).toBe(NOIR)
    expect(passes[passes.length - 1].data.style.color).toBe(GRIS)
  })

  it('se redessine quand le grain change, et pas autrement', () => {
    const r = nouveau()
    r.cadrer(CADRE, PAR_CADRE)
    const g = (r as unknown as { g: Graphics }).g
    const retrace = vi.spyOn(g, 'clear')
    r.cadrer(CADRE, PAR_CADRE)
    expect(retrace).not.toHaveBeenCalled()
    r.cadrer(CADRE, 1.24)
    expect(retrace).toHaveBeenCalledTimes(1)
  })

  it('ne reçoit jamais d’abscisse : le plan de la scène ne le fait pas voyager', () => {
    const decor = new Container()
    const plans = plansDuDecor(decor)
    const r = nouveau(false, plans.rideau)
    r.cadrer(CADRE, PAR_CADRE)
    r.baisser()
    avancerGsap(2)
    expect(plans.rideau.x).toBe(0)
    expect(plans.rideau.children[0].x).toBe(0)
  })

  it('se monte dans le décor, au-dessus des lumières et sous le plateau', () => {
    const decor = new Container()
    const plans = plansDuDecor(decor)
    const rang = (c: Container) => decor.children.indexOf(c)
    expect(rang(plans.rideau)).toBeGreaterThan(rang(plans.lumieres))
    expect(rang(plans.rideau)).toBeLessThan(rang(plans.plateau))
    expect(plans.nuit.profond).not.toContain(plans.rideau)
  })

  it('ne laisse plus de tween derrière lui une fois détruit', () => {
    const r = new Rideau(new Container())
    r.cadrer(CADRE, PAR_CADRE)
    r.baisser()
    r.destroy()
    expect(() => avancerGsap(2)).not.toThrow()
  })
})
