import {
  FONDU_MONTAGNES,
  SWEEP_LEGS,
  cadreMassif,
  cadreMontagnes,
  fonduApplique,
  mountainBlend,
  mountainFrame,
} from '@/scene/Mountains'
import { ECHELLE_MONTAGNES, HORIZON, STAGE } from '@/scene/layout'

const COUNT = 180

test('la première image est au départ', () => {
  expect(mountainFrame(0, COUNT)).toBe(0)
})

// La séquence boucle : la 180e image enchaîne sur la 1re comme n'importe
// quelle autre. Le relief tourne donc toujours dans le même sens, comme le
// train, au lieu de faire demi-tour.
test('un tour complet ramène à la première image', () => {
  expect(mountainFrame(SWEEP_LEGS, COUNT)).toBe(0)
  expect(mountainFrame(2 * SWEEP_LEGS, COUNT)).toBe(0)
})

test('le relief tourne toujours dans le même sens', () => {
  const pas = SWEEP_LEGS / COUNT
  let precedent = mountainFrame(0, COUNT)
  for (let i = 1; i < COUNT; i += 1) {
    const actuel = mountainFrame(i * pas, COUNT)
    expect(actuel).toBeGreaterThanOrEqual(precedent)
    precedent = actuel
  }
})

test('à mi-tour on est à la moitié de la séquence', () => {
  expect(mountainFrame(SWEEP_LEGS / 2, COUNT)).toBe(COUNT / 2)
})

test('l’index reste dans les bornes pour une distance quelconque', () => {
  for (const legs of [0.3, 7.77, 1234.5, 999]) {
    const i = mountainFrame(legs, COUNT)
    expect(Number.isInteger(i)).toBe(true)
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(COUNT)
  }
})

test('la séquence avance quand le train avance', () => {
  expect(mountainFrame(1, COUNT)).toBeGreaterThan(mountainFrame(0.5, COUNT))
})

test('une séquence d’une seule image ne divise jamais par zéro', () => {
  expect(mountainFrame(3.7, 1)).toBe(0)
})

// Chaque image se fond dans la suivante : la douceur ne dépend plus de la
// cadence (CONCEPT.md §6, « pas d'à-coups mécaniques »).
test('au départ, on est pile sur la première image', () => {
  const m = mountainBlend(0, COUNT)
  expect(m.index).toBe(0)
  expect(m.melange).toBeCloseTo(0, 6)
})

test('le mélange reste toujours entre 0 et 1', () => {
  for (const legs of [0, 0.37, 1.5, 7.77, 1234.5]) {
    const m = mountainBlend(legs, COUNT)
    expect(m.melange).toBeGreaterThanOrEqual(0)
    expect(m.melange).toBeLessThan(1)
  }
})

test('les deux images encadrent la position et restent dans les bornes', () => {
  for (const legs of [0.3, 3.3, 9.9, 100.1]) {
    const m = mountainBlend(legs, COUNT)
    expect(m.index).toBeGreaterThanOrEqual(0)
    expect(m.index).toBeLessThan(COUNT)
    expect(m.suivant).toBeGreaterThanOrEqual(0)
    expect(m.suivant).toBeLessThan(COUNT)
  }
})

test('la dernière image se fond dans la première, sans saut', () => {
  const juste_avant = SWEEP_LEGS - SWEEP_LEGS / COUNT / 2
  const m = mountainBlend(juste_avant, COUNT)
  expect(m.index).toBe(COUNT - 1)
  expect(m.suivant).toBe(0)
})

test('le relief avance sans à-coup : un petit pas de temps donne un petit pas de mélange', () => {
  const pas = 0.001
  let precedent = mountainBlend(1, COUNT)
  for (let i = 1; i <= 200; i += 1) {
    const actuel = mountainBlend(1 + i * pas, COUNT)
    const saut =
      actuel.index === precedent.index
        ? Math.abs(actuel.melange - precedent.melange)
        : Math.abs(actuel.melange + 1 - precedent.melange)
    expect(saut).toBeLessThan(0.2)
    precedent = actuel
  }
})

// Le cadrage. Ce qui compte, c'est le massif lui-même, pas le bord de son
// image : la source laisse 37 % de ciel vide au-dessus du sommet, et cadrer
// sur l'image empêcherait de l'agrandir bien avant qu'il ne touche le haut.
test('le pied du massif se pose sur la voie, quelle que soit l’échelle', () => {
  for (const e of [1, 1.4, 1.8, 2.2]) {
    const m = cadreMassif(e)
    expect(m.y + m.height).toBeCloseTo(HORIZON, 6)
  }
})

test('le massif est centré sur le cadre', () => {
  const m = cadreMassif(1.8)
  expect(m.x + m.width / 2).toBeCloseTo(STAGE.width / 2, 6)
})

test('le massif est plus étroit que son image', () => {
  expect(cadreMassif(1.8).width).toBeLessThan(cadreMontagnes(1.8).width)
})

test('à l’échelle 1, c’est l’image qui fait la largeur du cadre', () => {
  expect(cadreMontagnes(1).width).toBeCloseTo(STAGE.width, 6)
})

test('agrandir fait grandir le massif et le fait monter', () => {
  expect(cadreMassif(2).width).toBeGreaterThan(cadreMassif(1.4).width)
  expect(cadreMassif(2).y).toBeLessThan(cadreMassif(1.4).y)
})

test('le sommet reste dans le cadre à l’échelle retenue', () => {
  expect(cadreMassif(ECHELLE_MONTAGNES).y).toBeGreaterThanOrEqual(0)
})

test('le massif couvre au moins la largeur du cadre', () => {
  expect(cadreMassif(ECHELLE_MONTAGNES).width).toBeGreaterThanOrEqual(STAGE.width)
})

// Sur un nuage de points, on dissout : chaque pixel prend l'une OU l'autre
// image, donc un point garde toute son opacité au lieu de se dédoubler.
test('la dissolution est active et bornée', () => {
  expect(FONDU_MONTAGNES).toBeGreaterThan(0)
  expect(FONDU_MONTAGNES).toBeLessThanOrEqual(1)
})

test('la bascule suit la position entre les deux images', () => {
  for (const m of [0, 0.25, 0.5, 0.99]) {
    expect(fonduApplique(m)).toBeCloseTo(m * FONDU_MONTAGNES, 6)
    expect(fonduApplique(m)).toBeLessThanOrEqual(1)
  }
})
