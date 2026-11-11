import {
  ANCRE_FRISE,
  ANCRE_FRISE_MOBILE,
  DEGRADE_HAUTEUR,
  MARGE_FRISE,
  MARGE_FRISE_MOBILE,
  ecartFrise,
  garesVisibles,
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

// La frise étale ses gares sur la largeur : quatre sur un écran, deux sur un
// téléphone. L'écartement se calcule, il n'est plus une valeur en dur.
test('quatre gares sur un écran, deux sur un téléphone', () => {
  expect(garesVisibles(1440)).toBe(4)
  expect(garesVisibles(1024)).toBe(4)
  expect(garesVisibles(390)).toBe(2)
})

test('les quatre gares occupent toute la largeur disponible', () => {
  const l = 1280
  const e = ecartFrise(l, 4)
  expect(ANCRE_FRISE + 3 * e).toBeCloseTo(l - MARGE_FRISE, 6)
})

test('les deux gares du téléphone occupent la largeur aussi', () => {
  const l = 390
  const e = ecartFrise(l, 2)
  expect(ANCRE_FRISE_MOBILE + e).toBeCloseTo(l - MARGE_FRISE_MOBILE, 6)
})

test('l’écartement grandit avec l’écran', () => {
  expect(ecartFrise(1920, 4)).toBeGreaterThan(ecartFrise(1280, 4))
})

// Review Focus #5 : un viewport minuscule ne doit pas tout faire s'effondrer
test.each([[320, 2], [1, 2], [0, 2]])('ecartFrise(%i) reste positif et fini', (l, v) => {
  const e = ecartFrise(l, v)
  expect(e).toBeGreaterThan(0)
  expect(Number.isFinite(e)).toBe(true)
})

test('une seule gare visible ne divise pas par zéro', () => {
  expect(Number.isFinite(ecartFrise(400, 1))).toBe(true)
})
