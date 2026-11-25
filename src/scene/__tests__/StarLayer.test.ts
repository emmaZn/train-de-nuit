import { Container, Graphics } from 'pixi.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Stars } from '@/scene/StarLayer'
import { cadrageCiel } from '@/scene/layout'
import { ETOILES_MAX_BUREAU, limiteEtoiles, projeter, projeterAuCadrage } from '@/scene/stars'
import type { Trace } from '@/scene/types'

const JOUR = 86_400_000
const MAINTENANT = 1_800_000_000_000

// `Stars` reads the system clock when it places a star: freeze it, so the
// tests do not depend on the day they run.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(MAINTENANT)
})
afterEach(() => {
  vi.useRealTimers()
})

function trace(i: number, extra: Partial<Trace> = {}): Trace {
  return {
    id: `t${i}`,
    phrase: `phrase ${i}`,
    creeLe: MAINTENANT - i * 1000,
    x: (i % 10) / 10 + 0.05,
    y: (Math.floor(i / 10) % 10) / 10 + 0.05,
    ...extra,
  }
}

function monter(reducedMotion = false) {
  const parent = new Container()
  const stars = new Stars(parent, { reducedMotion })
  const racine = parent.children[0] as Container
  return { parent, stars, racine }
}

test('setStars pose chaque trace à la place que projeter donne', () => {
  const { stars, racine } = monter()
  const t = trace(0, { x: 0.25, y: 0.5 })
  stars.setStars([t], 1000, 800)
  const attendu = projeterAuCadrage({ x: 0.25, y: 0.5 }, 1000, 800)
  expect(racine.children).toHaveLength(1)
  expect(racine.children[0].x).toBeCloseTo(attendu.px)
  expect(racine.children[0].y).toBeCloseTo(attendu.py)
})

test('resize reprojette sans changer la place relative', () => {
  const { stars, racine } = monter()
  stars.setStars([trace(0, { x: 0.25, y: 0.5 })], 1000, 800)
  stars.resize(500, 1000)
  const attendu = projeterAuCadrage({ x: 0.25, y: 0.5 }, 500, 1000)
  expect(racine.children[0].x).toBeCloseTo(attendu.px)
  expect(racine.children[0].y).toBeCloseTo(attendu.py)
  // le test d'impact suit la nouvelle place
  expect(stars.hit(attendu.px, attendu.py)?.id).toBe('t0')
})

test('hit rend la trace sous le pointeur et null ailleurs', () => {
  const { stars } = monter()
  stars.setStars([trace(0, { x: 0.25, y: 0.5 })], 1000, 800)
  const { px, py } = projeterAuCadrage({ x: 0.25, y: 0.5 }, 1000, 800)
  expect(stars.hit(px + 3, py - 3)?.id).toBe('t0')
  expect(stars.hit(px + 200, py)).toBeNull()
})

test('setStars au-delà de la limite ne garde que les plus récentes', () => {
  const { stars, racine } = monter()
  const limite = limiteEtoiles(500)
  const traces = Array.from({ length: limite + 10 }, (_, i) => trace(i))
  stars.setStars(traces, 500, 800)
  expect(racine.children).toHaveLength(limite)
  const vieille = traces[traces.length - 1]
  const p = projeterAuCadrage(vieille, 500, 800)
  expect(stars.hit(p.px, p.py)?.id).not.toBe(vieille.id)
})

test('une arrivée au-delà de la limite éteint la plus ancienne en fondu', () => {
  const { stars, racine } = monter()
  const limite = limiteEtoiles(500)
  const traces = Array.from({ length: limite }, (_, i) => trace(i))
  stars.setStars(traces, 500, 800)
  const plusAncienne = racine.children[limite - 1]
  const neuve = trace(-1, { x: 0.97, y: 0.97 })
  stars.setStars([neuve, ...traces], 500, 800)
  // elle est encore là, mais en train de s'éteindre
  expect(racine.children).toHaveLength(limite + 1)
  expect(racine.children).toContain(plusAncienne)
  stars.update(0.1, MAINTENANT)
  const alphaMilieu = plusAncienne.alpha
  stars.update(0.1, MAINTENANT)
  expect(plusAncienne.alpha).toBeLessThan(alphaMilieu)
  stars.update(10, MAINTENANT)
  expect(racine.children).toHaveLength(limite)
  expect(racine.children).not.toContain(plusAncienne)
})

test('setStars est idempotent par id : une étoile déjà posée n’est ni redessinée ni réanimée', () => {
  const { stars, racine } = monter()
  const t = trace(0, { x: 0.3, y: 0.3 })
  stars.setStars([t], 1000, 800)
  const gfx = racine.children[0]
  stars.update(0.5, MAINTENANT)
  const alpha = gfx.alpha
  const x = gfx.x
  stars.setStars([{ ...t }, trace(1)], 1000, 800)
  expect(racine.children).toHaveLength(2)
  expect(racine.children[0]).toBe(gfx)
  expect(gfx.alpha).toBe(alpha)
  expect(gfx.x).toBe(x)
})

test('la limite du ciel est figée au chargement : tourner le téléphone n’éteint rien', () => {
  const { stars, racine } = monter()
  const traces = Array.from({ length: ETOILES_MAX_BUREAU + 10 }, (_, i) => trace(i))
  // Chargé en paysage : 844 px, donc la limite du bureau.
  stars.setStars(traces, 844, 390)
  expect(racine.children).toHaveLength(ETOILES_MAX_BUREAU)

  // Tourné en portrait : la limite ne se recalcule pas. Sinon soixante-dix
  // étoiles s'éteindraient, et reviendraient d'un coup au retour, sans fondu.
  stars.setStars(traces, 390, 844)
  stars.update(10, MAINTENANT)
  expect(racine.children).toHaveLength(ETOILES_MAX_BUREAU)
})

test('une étoile revenue pendant son extinction est rallumée au lieu de finir de s’éteindre', () => {
  const { stars, racine } = monter()
  const t = trace(0, { x: 0.25, y: 0.5 })
  stars.setStars([t], 1000, 800)
  const gfx = racine.children[0]

  // Elle sort de la limite : elle s'éteint en 1,2 s.
  stars.setStars([], 1000, 800)
  stars.update(0.3, MAINTENANT)
  // Elle revient en plein fondu.
  stars.setStars([t], 1000, 800)
  stars.update(10, MAINTENANT)

  expect(racine.children).toContain(gfx)
  const { px, py } = projeterAuCadrage({ x: 0.25, y: 0.5 }, 1000, 800)
  expect(stars.hit(px, py)?.id).toBe('t0')
})

test('fadeOut retire l’étoile de la cible des survols', () => {
  const { stars } = monter()
  stars.setStars([trace(0, { x: 0.25, y: 0.5 })], 1000, 800)
  const { px, py } = projeterAuCadrage({ x: 0.25, y: 0.5 }, 1000, 800)
  expect(stars.hit(px, py)?.id).toBe('t0')
  stars.fadeOut('t0')
  expect(stars.hit(px, py)).toBeNull()
})

test('en mouvement réduit, update ne fait pas scintiller', () => {
  const { stars, racine } = monter(true)
  stars.setStars([trace(0)], 1000, 800)
  const alpha = racine.children[0].alpha
  for (let i = 1; i <= 20; i++) stars.update(0.37, MAINTENANT)
  expect(racine.children[0].alpha).toBe(alpha)
})

test('en mouvement normal, update fait scintiller', () => {
  const { stars, racine } = monter(false)
  stars.setStars([trace(0)], 1000, 800)
  const vus = new Set<number>()
  for (let i = 1; i <= 20; i++) {
    stars.update(0.37, MAINTENANT + i * 370)
    vus.add(racine.children[0].alpha)
  }
  expect(vus.size).toBeGreaterThan(1)
})

test('une étoile ancienne est plus pâle qu’une neuve', () => {
  const { stars, racine } = monter(true)
  stars.setStars(
    [trace(0, { creeLe: MAINTENANT }), trace(1, { creeLe: MAINTENANT - 60 * JOUR })],
    1000,
    800,
  )
  stars.update(0, MAINTENANT)
  expect(racine.children[1].alpha).toBeLessThan(racine.children[0].alpha)
})

test('sur un format décalé, l’étoile se pose au cadrage de la scène', () => {
  const { stars, racine } = monter()
  stars.setStars([trace(0, { x: 0.25, y: 0.5 })], 1512, 771)
  const { decalage, echelle } = cadrageCiel(1512, 771)
  expect(decalage).toBeGreaterThan(0)
  const attendu = projeter({ x: 0.25, y: 0.5 }, 1512, 771, echelle, decalage)
  expect(racine.children[0].y).toBeCloseTo(attendu.py)
})

/**
 * De jour, une étoile est un point d'encre.
 *
 * Sa lueur est une pile d'anneaux à l'alpha décroissant — un dégradé radial
 * fait main, qui ne figurait dans aucune liste d'« entorses assumées » du
 * CONCEPT. Sur du papier, le négatif d'un dégradé blanc donne une tache ; il
 * reste donc le cœur, et la constellation se dessine à la plume.
 */
describe('les étoiles selon le mode', () => {
  function cercles(racine: Container): number {
    const gfx = racine.children[0] as Graphics | undefined
    return gfx ? gfx.context.instructions.length : 0
  }

  function uneEtoile(mode?: 'nuit' | 'jour') {
    const { stars, racine } = monter()
    if (mode) stars.setMode(mode)
    stars.setStars([trace(0)], 1200, 800)
    return { stars, racine }
  }

  it('porte sa lueur de nuit : les anneaux, le disque et le cœur', () => {
    expect(cercles(uneEtoile('nuit').racine)).toBeGreaterThan(5)
  })

  it('se réduit à son cœur de jour', () => {
    expect(cercles(uneEtoile('jour').racine)).toBe(1)
  })

  it('retrouve sa lueur en revenant à la nuit', () => {
    const { stars, racine } = uneEtoile('jour')
    stars.setMode('nuit')
    expect(cercles(racine)).toBeGreaterThan(5)
  })

  /** Le rayon du premier cercle tracé — de jour, le cœur et rien d'autre. */
  function rayon(racine: Container): number {
    const gfx = racine.children[0] as Graphics
    type Chemin = { action: string; data: number[] }
    const chemin = (
      gfx.context.instructions[0] as unknown as { data: { path: { instructions: Chemin[] } } }
    ).data.path.instructions.find((c) => c.action === 'circle')
    return chemin!.data[2]
  }

  function vieille(): Trace {
    return { ...trace(0), creeLe: MAINTENANT - 200 * JOUR }
  }

  /**
   * **Une étoile de jour doit se distinguer d'un grain de poussière.**
   *
   * De nuit, c'est sa lueur qui la détache : quatorze anneaux sur seize pixels
   * de portée. Réduite à son cœur d'un pixel, elle devenait exactement ce que
   * le ciel a déjà par milliers — Emmanuelle, le 25/11 : « les étoiles ne se
   * voient pas en thème light ». Sur du papier, ce qui remplace la lueur ne
   * peut pas être de la lumière : c'est de la **taille**.
   */
  it('fait de jour un point bien plus gros qu’un grain de poussière', () => {
    const { racine } = uneEtoile('jour')
    expect(rayon(racine)).toBeGreaterThanOrEqual(2)
  })

  it('garde de jour l’éclat dans la taille, pas seulement dans l’encre', () => {
    const { stars, racine } = monter()
    stars.setMode('jour')
    stars.setStars([trace(0)], 1200, 800)
    const neuve = rayon(racine)
    const autre = monter()
    autre.stars.setMode('jour')
    autre.stars.setStars([vieille()], 1200, 800)
    expect(neuve).toBeGreaterThan(rayon(autre.racine))
  })

  it('ne laisse jamais une étoile de jour tomber sous une encre lisible', () => {
    const { stars, racine } = monter()
    stars.setMode('jour')
    stars.setStars([vieille()], 1200, 800)
    for (let i = 0; i < 40; i += 1) stars.update(0.1, MAINTENANT)
    expect((racine.children[0] as Graphics).alpha).toBeGreaterThan(0.6)
  })

  it('ne touche pas à l’encre des étoiles de nuit', () => {
    const { stars, racine } = monter()
    stars.setStars([vieille()], 1200, 800)
    expect((racine.children[0] as Graphics).alpha).toBeLessThan(0.2)
  })

  it('pose une étoile neuve sans lueur quand il fait déjà jour', () => {
    const { stars, racine } = uneEtoile('jour')
    stars.setStars([trace(0), trace(1)], 1200, 800)
    expect(cercles(racine)).toBe(1)
  })
})
