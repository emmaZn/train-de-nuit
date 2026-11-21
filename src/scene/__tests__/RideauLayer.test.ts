import { readFileSync } from 'node:fs'
import gsap from 'gsap'
import { Container, Graphics } from 'pixi.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Rideau } from '@/scene/RideauLayer'
import { fitStage } from '@/scene/layout'
import { plansDuDecor } from '@/scene/Scene'
import { yPoseA, yRangeA } from '@/scene/rideau'

const NOIR = 0x0b0b0c
const GRIS = 0xededed

/**
 * Une fenêtre ordinaire. `PAR_CADRE` est passé comme `resolution` : le nombre
 * de pixels de rendu par pixel d'écran, **pas** l'échelle du cadre. Le grain par
 * cadre réel est donc `CADRE.scale * PAR_CADRE` (0,74 × 0,62 ≈ 0,46 ici).
 */
const CADRE = fitStage(1440, 900)
const PAR_CADRE = 0.62

/**
 * Avance la timeline globale de GSAP sans attendre le temps réel. `time()`
 * laisse passer les `onUpdate` ; c'est `seek()` qui les supprime par défaut.
 */
function avancerGsap(secondes: number): void {
  gsap.globalTimeline.time(gsap.globalTimeline.time() + secondes)
}

/** Le côté, en pixels de cadre, de la première cellule de trait du rideau. */
function celluleDe(r: Rideau): number {
  const g = (r as unknown as { g: Graphics }).g
  const trait = g.context.instructions.filter((i) => i.action === 'fill')[1] as never as {
    data: { path: { shapePath: { shapePrimitives: { shape: { width: number } }[] } } }
  }
  return trait.data.path.shapePath.shapePrimitives[0].shape.width
}

/** Les passes de remplissage du `Graphics`, dans l'ordre où elles ont été émises. */
type Passe = {
  data: {
    style: { color: number; alpha: number }
    path: { shapePath: { shapePrimitives: unknown[] } }
  }
}
function tracesDe(r: Rideau): Passe[] {
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
  // Sous le seuil mobile le panneau du DOM se détache : la scène ne dessine plus
  // la plaque, mais l'objet continue d'exister et d'émettre sa position.
  it('éteint son tracé, et seulement lui, quand le rendu est détaché', () => {
    const parent = new Container()
    const r = nouveau(false, parent)
    const racine = parent.children[0]
    r.cadrer(CADRE, PAR_CADRE)
    expect(racine.visible).toBe(true)
    r.cadrer(CADRE, PAR_CADRE, true)
    expect(racine.visible).toBe(false)
    // L'objet vit : il se baisse, et sa position reste un vrai nombre.
    r.baisser()
    expect(r.baisse).toBe(true)
    expect(Number.isFinite(r.y)).toBe(true)
    // Et le tracé revient avec la fenêtre large.
    r.cadrer(CADRE, PAR_CADRE, false)
    expect(racine.visible).toBe(true)
  })

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
    // Deux fenêtres dont `yPoseA` diffère : sur 1440×900 le plancher de 340
    // s'applique, sur 2560×720 non — sinon le test comparerait 340 à 340.
    const large = fitStage(2560, 720)
    expect(yPoseA(large)).not.toBeCloseTo(yPoseA(CADRE), 0)
    const r = nouveau()
    r.cadrer(CADRE, PAR_CADRE)
    r.baisser()
    avancerGsap(0.4)
    const p = (r.y - yRangeA(CADRE)) / (yPoseA(CADRE) - yRangeA(CADRE))
    expect(p).toBeGreaterThan(0.2)
    expect(p).toBeLessThan(0.95)
    r.cadrer(large, PAR_CADRE)
    expect(r.y).toBeCloseTo(yRangeA(large) * (1 - p) + yPoseA(large) * p, 6)
    avancerGsap(2)
    expect(r.y).toBeCloseTo(yPoseA(large), 1)
  })

  it('ne descend jamais sous la cellule du décor, même sur un écran dense', () => {
    const r = nouveau()
    // 390×844 à dpr 3 : grain par cadre ≈ 2,08, la cellule brute vaudrait 0,72.
    const tel = fitStage(390, 844)
    r.cadrer(tel, 3)
    expect(celluleDe(r)).toBeGreaterThanOrEqual(1)
    r.cadrer(CADRE, 1)
    expect(celluleDe(r)).toBeCloseTo(1.5 / CADRE.scale, 6)
  })

  /**
   * Le décor est rastérisé à **un texel par pixel CSS** (le filtre de
   * recoloration n'a pas de `resolution`), quelle que soit la densité de
   * l'écran : un pixel de raster vaut `1 / frame.scale` pixels de cadre. Une
   * cellule plus fine ne s'allume que si un centre de pixel y tombe, et le filet
   * va et vient avec la largeur de la fenêtre. Le plancher se garde donc en
   * pixels de **raster**, pas de cadre.
   */
  it('garde sa cellule à un pixel de raster au moins, sur toute fenêtre et toute densité', () => {
    for (const [l, h] of [[1511, 771], [1512, 771], [1440, 900], [390, 844], [2560, 1440]]) {
      for (const dpr of [1, 2, 3]) {
        const cadre = fitStage(l, h)
        const r = nouveau()
        r.cadrer(cadre, dpr)
        expect(celluleDe(r) * cadre.scale, `${l}×${h} dpr ${dpr}`).toBeGreaterThanOrEqual(1 - 1e-9)
      }
    }
  })

  it('retrace quand le pixel de raster change, même si `parCadre` reste le même', () => {
    // Même produit échelle × densité (un changement de moniteur, un zoom) :
    // le pixel de raster, lui, passe de 2 à 4 pixels de cadre.
    const r = nouveau()
    r.cadrer({ ...CADRE, scale: 0.5 }, 2)
    r.cadrer({ ...CADRE, scale: 0.25 }, 4)
    expect(celluleDe(r) * 0.25).toBeGreaterThanOrEqual(1 - 1e-9)
  })

  it('n’allume rien à mi-teinte : deux couleurs pleines et pas d’autres', () => {
    const r = nouveau()
    r.cadrer(CADRE, PAR_CADRE)
    const passes = tracesDe(r)
    // Un `Graphics` vide passerait ce test à vide : il en faut au moins deux.
    expect(passes.length).toBeGreaterThanOrEqual(2)
    // Un `fill()` sur un chemin vide émet quand même une passe : on exige de la géométrie.
    for (const passe of passes) {
      expect(passe.data.path.shapePath.shapePrimitives.length).toBeGreaterThan(0)
    }
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
    expect(passes[0].data.path.shapePath.shapePrimitives.length).toBeGreaterThan(0)
    expect(passes[passes.length - 1].data.path.shapePath.shapePrimitives.length).toBeGreaterThan(100)
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
    const etat = (r as unknown as { etat: object }).etat
    expect(gsap.getTweensOf(etat)).toHaveLength(1)
    r.destroy()
    expect(gsap.getTweensOf(etat)).toHaveLength(0)
  })

  it('est construit par la scène avant le manifeste, donc toujours cadré', () => {
    const src = readFileSync('src/scene/Scene.ts', 'utf8')
    const debut = src.indexOf('this.sky = new Sky')
    const cadrage = src.indexOf('this.cadrer()', debut)
    const pose = src.indexOf('new Rideau(')
    expect(debut).toBeGreaterThan(0)
    expect(pose).toBeGreaterThan(debut)
    expect(pose).toBeLessThan(cadrage)
  })
})
