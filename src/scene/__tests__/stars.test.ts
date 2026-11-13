import { ECHELLE_MONTAGNES, HAUTEUR_FRISE, SEUIL_MOBILE, regionCiel } from '../layout'
import {
  ETOILES_MAX_BUREAU,
  ETOILES_MAX_MOBILE,
  aHalo,
  amplitudeScintillement,
  eclat,
  etoileSous,
  limiteEtoiles,
  projeter,
  tirerPlace,
  type EtoilePosee,
} from '../stars'
import type { Trace } from '../types'

function trace(id: string, x = 0, y = 0): Trace {
  return { id, phrase: 'une phrase', creeLe: 0, x, y }
}

/** A tiny seeded generator, same family as the one in Sky.ts. */
function graine(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

test('limiteEtoiles rend 50 au-dessous de SEUIL_MOBILE et 120 au-dessus', () => {
  expect(limiteEtoiles(SEUIL_MOBILE - 1)).toBe(ETOILES_MAX_MOBILE)
  expect(limiteEtoiles(SEUIL_MOBILE)).toBe(ETOILES_MAX_BUREAU)
  expect(ETOILES_MAX_MOBILE).toBe(50)
  expect(ETOILES_MAX_BUREAU).toBe(120)
})

test('eclat(0) vaut 1 et décroît avec l’âge', () => {
  expect(eclat(0)).toBe(1)
  expect(eclat(10)).toBeLessThan(eclat(5))
  expect(eclat(5)).toBeLessThan(eclat(0))
})

test('eclat ne descend jamais sous 0.16, même à dix ans', () => {
  expect(eclat(3650)).toBe(0.16)
})

test('aHalo est vrai au-dessus de 0.55 et faux en dessous', () => {
  expect(aHalo(0.56)).toBe(true)
  expect(aHalo(0.55)).toBe(false)
  expect(aHalo(0.3)).toBe(false)
})

test('amplitudeScintillement vaut 0.12 à éclat nul et 0.47 à éclat plein', () => {
  expect(amplitudeScintillement(0)).toBeCloseTo(0.12)
  expect(amplitudeScintillement(1)).toBeCloseTo(0.47)
})

// Review Focus #5 — téléphone en paysage
test.each([
  [1440, 900],
  [844, 390],
  [390, 844],
])('projeter ne pose jamais une étoile sous la frise (%i x %i)', (w, h) => {
  for (const y of [0, 0.5, 1]) {
    expect(projeter({ x: 0.5, y }, w, h, ECHELLE_MONTAGNES, 0).py).toBeGreaterThanOrEqual(HAUTEUR_FRISE)
  }
})

test('projeter rend la même place relative quelle que soit la fenêtre', () => {
  const a = projeter({ x: 0.25, y: 0.5 }, 1000, 800, ECHELLE_MONTAGNES, 0)
  const b = projeter({ x: 0.25, y: 0.5 }, 2000, 800, ECHELLE_MONTAGNES, 0)
  expect(a.px / 1000).toBeCloseTo(b.px / 2000)
  expect(a.py).toBeGreaterThan(HAUTEUR_FRISE)
})

test('les bornes 0 et 1 tombent dans la région, pas à côté', () => {
  const r = regionCiel(700, 1512, 771, 2.153, 11)
  expect(projeter({ x: 700 / 1512, y: 0 }, 1512, 771, 2.153, 11).py).toBeCloseTo(r.top, 0)
  expect(projeter({ x: 700 / 1512, y: 1 }, 1512, 771, 2.153, 11).py).toBeCloseTo(r.top + r.height, 0)
})

test('tirerPlace tombe dans la bande 0..1 sur les deux axes', () => {
  const alea = graine(1)
  for (let i = 0; i < 50; i++) {
    const p = tirerPlace([], alea)
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThanOrEqual(1)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThanOrEqual(1)
  }
})

test('tirerPlace s’éloigne des places déjà prises', () => {
  const prises = [{ x: 0.5, y: 0.5 }]
  // Average distance over many draws: far better than a blind draw would give
  // only if the farthest of 40 candidates is kept.
  const distance = (p: { x: number; y: number }) => Math.hypot(p.x - 0.5, p.y - 0.5)
  let avecChoix = 0
  let sansChoix = 0
  for (let s = 1; s <= 30; s++) {
    avecChoix += distance(tirerPlace(prises, graine(s)))
    sansChoix += distance(tirerPlace(prises, graine(s), 1))
  }
  expect(avecChoix).toBeGreaterThan(sansChoix)
  expect(avecChoix / 30).toBeGreaterThan(0.45)
})

test('tirerPlace pèse x par le rapport : à distance normalisée égale, pas à distance écran égale', () => {
  const prises = [{ x: 0.5, y: 0.5 }]
  // Two candidates at the same normalised distance (0.1) from the taken place.
  const tirages = () => {
    const suite = [0.6, 0.5, 0.5, 0.6]
    let i = 0
    return () => suite[i++]
  }
  // Wide band (10x): the x offset is far on screen, the y offset is not.
  expect(tirerPlace(prises, tirages(), 2, 10)).toEqual({ x: 0.6, y: 0.5 })
  // Tall band (0.1x): the y offset is the far one.
  expect(tirerPlace(prises, tirages(), 2, 0.1)).toEqual({ x: 0.5, y: 0.6 })
})

test('tirerPlace est déterministe à alea égal', () => {
  const prises = [{ x: 0.2, y: 0.3 }]
  expect(tirerPlace(prises, graine(7))).toEqual(tirerPlace(prises, graine(7)))
})

const posees: EtoilePosee[] = [
  { trace: trace('a'), px: 100, py: 100 },
  { trace: trace('b'), px: 110, py: 100 },
  { trace: trace('c'), px: 500, py: 500 },
]

test('etoileSous rend l’étoile la plus proche dans le rayon', () => {
  expect(etoileSous(108, 100, posees, 20)?.id).toBe('b')
  expect(etoileSous(101, 100, posees, 20)?.id).toBe('a')
})

test('etoileSous rend null quand rien n’est dans le rayon', () => {
  expect(etoileSous(300, 300, posees, 20)).toBeNull()
})

test('etoileSous rend null sur une liste vide', () => {
  expect(etoileSous(0, 0, [], 20)).toBeNull()
})
