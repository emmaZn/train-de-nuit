import {
  DEGRADE_HAUTEUR,
  DEGRADE_OPACITE,
  ECHELLE_MONTAGNES,
  HORIZON,
  STAGE,
  cadreDegrade,
  fitStage,
} from '@/scene/layout'
import { cadreMontagnes } from '@/scene/Mountains'

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

// Le voile qui éteint le pied des montagnes pour détacher le train.
test('le voile s’arrête exactement sur la ligne de voie', () => {
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.y + v.height).toBe(HORIZON)
})

test('le voile couvre toute la largeur du cadre', () => {
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.x).toBe(0)
  expect(v.width).toBe(STAGE.width)
})

test('le voile éteint le pied du massif, pas ses sommets', () => {
  const massif = cadreMontagnes(ECHELLE_MONTAGNES)
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.y).toBeGreaterThan(massif.y)
  expect(v.height).toBeLessThan(massif.height)
})

test('le voile reste dans le cadre', () => {
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.y).toBeGreaterThanOrEqual(0)
})

test('le voile s’efface vers le haut, il ne s’ouvre pas vers le bas', () => {
  // opacité pleine au ras de la voie, nulle en haut du voile
  expect(DEGRADE_OPACITE).toBeGreaterThan(0)
  expect(DEGRADE_OPACITE).toBeLessThanOrEqual(1)
})
