import { GARES } from '@/stores/voyage'

import {
  ANCRE_FRISE,
  ANCRE_FRISE_MOBILE,
  DEGRADE_HAUTEUR,
  DUREE_ETAPE,
  MARGE_FRISE,
  MARGE_FRISE_MOBILE,
  ecartFrise,
  garesVisibles,
  DEGRADE_OPACITE,
  ECHELLE_MASSIF,
  ECHELLE_MONTAGNES,
  HORIZON,
  MOUNTAIN_SOURCE,
  ORTHO,
  STAGE,
  SWEEP_LEGS,
  bornesFenetre,
  cadreDegrade,
  cadreMontagnes,
  fenetreVisible,
  fitStage,
  toursMassif,
} from '@/scene/layout'

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

// Le massif n'est plus une image mais un rendu : le canvas qui le porte ne
// couvre que ce qu'on voit, borné à la voie. Couvrir tout le cadre coûterait
// 4800 px de large sur un téléphone en portrait, au-delà de la taille de
// texture que beaucoup de GPU mobiles acceptent.
test('sur un écran au format du cadre, la fenêtre prend toute la largeur', () => {
  const frame = fitStage(2320, 1217)
  const f = fenetreVisible(frame, 2320, 1217)
  expect(f.x).toBeCloseTo(0, 6)
  expect(f.width).toBeCloseTo(STAGE.width, 6)
})

test('la fenêtre s’arrête à la voie : le massif ne descend jamais plus bas', () => {
  const frame = fitStage(2320, 1217)
  const f = fenetreVisible(frame, 2320, 1217)
  expect(f.y + f.height).toBeCloseTo(HORIZON, 6)
})

test('en portrait, la fenêtre est bien plus étroite que le cadre', () => {
  const frame = fitStage(390, 844)
  const f = fenetreVisible(frame, 390, 844)
  expect(f.width).toBeLessThan(STAGE.width * 0.7)
  expect(f.width).toBeGreaterThan(0)
})

test('la fenêtre ne sort jamais du cadre, quel que soit l’écran', () => {
  for (const [w, h] of [[390, 844], [2320, 1217], [3840, 900], [1024, 1366], [1, 1]]) {
    const f = fenetreVisible(fitStage(w, h), w, h)
    expect(f.x).toBeGreaterThanOrEqual(0)
    expect(f.y).toBeGreaterThanOrEqual(0)
    expect(f.x + f.width).toBeLessThanOrEqual(STAGE.width + 1e-6)
    expect(f.y + f.height).toBeLessThanOrEqual(HORIZON + 1e-6)
    expect(f.width).toBeGreaterThan(0)
    expect(f.height).toBeGreaterThan(0)
  }
})

// Le frustum place le cadre Blender exactement là où la séquence était
// dessinée : on ne réinvente pas un cadrage, c'est ce qui avait désaligné le
// massif la dernière fois.
test('une fenêtre égale au cadre Blender redonne le frustum de Blender', () => {
  const c = cadreMontagnes(ECHELLE_MONTAGNES)
  const b = bornesFenetre(c, ECHELLE_MONTAGNES)
  const largeur = ORTHO / ECHELLE_MASSIF
  expect(b.right - b.left).toBeCloseTo(largeur, 6)
  expect(b.left).toBeCloseTo(-largeur / 2, 6)
  expect(b.top - b.bottom).toBeCloseTo((largeur * MOUNTAIN_SOURCE.height) / MOUNTAIN_SOURCE.width, 6)
})

test('une fenêtre deux fois plus large voit deux fois plus de scène', () => {
  const c = cadreMontagnes(ECHELLE_MONTAGNES)
  const etroit = bornesFenetre(c, ECHELLE_MONTAGNES)
  const large = bornesFenetre({ ...c, width: c.width * 2 }, ECHELLE_MONTAGNES)
  expect(large.right - large.left).toBeCloseTo((etroit.right - etroit.left) * 2, 6)
})

test('décaler la fenêtre vers la droite décale le frustum d’autant', () => {
  const c = cadreMontagnes(ECHELLE_MONTAGNES)
  const a = bornesFenetre(c, ECHELLE_MONTAGNES)
  const b = bornesFenetre({ ...c, x: c.x + 100 }, ECHELLE_MONTAGNES)
  const pas = (ORTHO / ECHELLE_MASSIF / c.width) * 100
  expect(b.left - a.left).toBeCloseTo(pas, 6)
  expect(b.right - a.right).toBeCloseTo(pas, 6)
})

// Le massif tourne à l'inverse de la marche : vu depuis un train qui va vers
// la droite, un relief lointain découvre peu à peu sa face gauche. Tourner
// dans l'autre sens donnerait un train qui recule — ce que CONCEPT.md §3
// interdit explicitement.
test('le massif tourne dans le sens inverse de la marche', () => {
  expect(toursMassif(1)).toBeLessThan(0)
  expect(toursMassif(4)).toBeLessThan(toursMassif(1))
})

test('à l’arrêt au départ, le massif est à son orientation d’origine', () => {
  expect(toursMassif(0)).toBeCloseTo(0, 12)
})

test('un tour complet demande SWEEP_LEGS étapes', () => {
  expect(Math.abs(toursMassif(SWEEP_LEGS))).toBeCloseTo(1, 6)
})

// « Lents, comme un souffle » (CONCEPT.md §6) : le massif met plusieurs tours
// de boucle à faire le sien, sinon il défile au lieu de se découvrir.
test('le massif met plusieurs boucles de train à faire un tour', () => {
  expect(SWEEP_LEGS / GARES.length).toBeGreaterThanOrEqual(2)
})

// Les deux réglages se multiplient : c'est leur produit qui donne la vitesse
// réellement vue. Le massif doit mettre plus d'une minute à faire son tour.
test('un tour de massif dure plus d’une minute', () => {
  expect(SWEEP_LEGS * DUREE_ETAPE).toBeGreaterThan(60)
})
