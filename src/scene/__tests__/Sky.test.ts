import { cadrageScene, regionCiel } from '@/scene/layout'
import { dustCount, makeDust, poussiereLibre } from '@/scene/Sky'

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

test('aucun grain de poussière ne tombe sous la crête, parallaxe comprise', () => {
  for (const [w, h] of [[1512, 771], [844, 390], [1440, 900]]) {
    const { frame, decalage, echelle } = cadrageScene(w, h)
    const libres = poussiereLibre(frame, w, h, false, echelle, decalage, 7)
    expect(libres.length).toBeGreaterThan(0)
    for (const g of libres) {
      const r = regionCiel(g.x, w, h, echelle, decalage)
      expect(g.y + g.r + 14 * frame.scale).toBeLessThanOrEqual(r.top + r.height)
    }
  }
})

test('le plancher tient après le filtre : un petit écran garde son ciel', () => {
  for (const [w, h, mobile] of [[390, 844, true], [844, 390, true]] as const) {
    const { frame, decalage, echelle } = cadrageScene(w, h)
    expect(poussiereLibre(frame, w, h, mobile, echelle, decalage, 7).length).toBeGreaterThanOrEqual(60)
  }
})

test('taille des grains : celle du cadre, mise à l’échelle de l’écran', () => {
  const { frame, decalage, echelle } = cadrageScene(1512, 771)
  for (const g of poussiereLibre(frame, 1512, 771, false, echelle, decalage, 7)) {
    expect(g.r).toBeGreaterThanOrEqual(0.4 * frame.scale - 1e-9)
    expect(g.r).toBeLessThanOrEqual(1.3 * frame.scale + 1e-9)
  }
})
