import { dustCount, makeDust } from '@/scene/Sky'

// Review Focus #5 : viewport minuscule, rotation mobile
test.each([
  [360, 400],
  [1, 1],
  [3840, 2160],
])('dustCount(%i, %i) rend un entier strictement positif', (w, h) => {
  const n = dustCount(w, h, false)
  expect(Number.isInteger(n)).toBe(true)
  expect(n).toBeGreaterThan(0)
})

test('le mobile reçoit moins de poussière que le bureau à surface égale', () => {
  expect(dustCount(1440, 900, true)).toBeLessThan(dustCount(1440, 900, false))
})

test('un grand écran reçoit plus de poussière qu’un petit', () => {
  expect(dustCount(2560, 1440, false)).toBeGreaterThan(dustCount(640, 480, false))
})

test('makeDust est déterministe à graine égale', () => {
  expect(makeDust(50, 7, 800, 600)).toEqual(makeDust(50, 7, 800, 600))
})

test('deux graines différentes donnent deux ciels différents', () => {
  expect(makeDust(50, 7, 800, 600)).not.toEqual(makeDust(50, 8, 800, 600))
})

test('tous les grains tombent dans le viewport', () => {
  for (const grain of makeDust(300, 3, 800, 600)) {
    expect(grain.x).toBeGreaterThanOrEqual(0)
    expect(grain.x).toBeLessThanOrEqual(800)
    expect(grain.y).toBeGreaterThanOrEqual(0)
    expect(grain.y).toBeLessThanOrEqual(600)
  }
})

test('la poussière couvre tout le ciel, bande de la frise comprise', () => {
  // CONCEPT.md §6 : la poussière est partout. C'est la place d'une étoile-voyageuse
  // (§5, étape 2) qui évite la frise, pas le fond.
  expect(makeDust(400, 1, 1440, 900).some((grain) => grain.y < 64)).toBe(true)
})

test('makeDust rend exactement le nombre de grains demandé', () => {
  expect(makeDust(123, 5, 800, 600)).toHaveLength(123)
})
