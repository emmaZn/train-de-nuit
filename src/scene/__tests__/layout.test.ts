import { STAGE, fitStage } from '@/scene/layout'

test('le cadre de la scène est celui que partagent les assets du train', () => {
  expect(STAGE).toEqual({ width: 2320, height: 1217 })
})

// Review Focus #5 : viewport minuscule, redimensionnement, rotation mobile
test.each([
  [360, 400],
  [1, 1],
  [3840, 2160],
  [0, 0],
])('fitStage(%i, %i) donne une échelle finie et positive', (w, h) => {
  const frame = fitStage(w, h)
  expect(frame.scale).toBeGreaterThan(0)
  expect(Number.isFinite(frame.scale)).toBe(true)
  expect(Number.isFinite(frame.offsetX)).toBe(true)
  expect(Number.isFinite(frame.offsetY)).toBe(true)
})

test('le cadre couvre le viewport sans laisser de bande vide', () => {
  const { scale } = fitStage(1440, 900)
  expect(STAGE.width * scale).toBeGreaterThanOrEqual(1440)
  expect(STAGE.height * scale).toBeGreaterThanOrEqual(900)
})

test('le cadre est centré sur le viewport', () => {
  const { scale, offsetX } = fitStage(1440, 900)
  expect(offsetX).toBeCloseTo((1440 - STAGE.width * scale) / 2, 5)
})
