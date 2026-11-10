import { recolorPixel } from '@/scene/recolor'

/** #2E2313, « vieille photo », la couleur de nuit par défaut. */
const FOND: [number, number, number] = [46, 35, 19]

test('le noir devient exactement la couleur du fond', () => {
  expect(recolorPixel([0, 0, 0], FOND)).toEqual(FOND)
})

test('le blanc reste blanc', () => {
  expect(recolorPixel([255, 255, 255], FOND)).toEqual([255, 255, 255])
})

test('un gris moyen se place entre le fond et le blanc', () => {
  const [r] = recolorPixel([128, 128, 128], FOND)
  expect(r).toBeGreaterThan(FOND[0])
  expect(r).toBeLessThan(255)
})

test('la règle vaut pour n’importe quelle couleur de nuit', () => {
  const encre: [number, number, number] = [21, 21, 23]
  expect(recolorPixel([0, 0, 0], encre)).toEqual(encre)
})
