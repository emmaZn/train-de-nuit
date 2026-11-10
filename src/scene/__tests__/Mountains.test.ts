import { SWEEP_LEGS, cadreMontagnes, mountainBlend, mountainFrame } from '@/scene/Mountains'
import { ECHELLE_MONTAGNES, HORIZON, STAGE } from '@/scene/layout'

const COUNT = 160

test('la première image est au départ', () => {
  expect(mountainFrame(0, COUNT)).toBe(0)
})

test('la passe aller se termine après un tour de boucle', () => {
  expect(mountainFrame(SWEEP_LEGS, COUNT)).toBe(COUNT - 1)
})

test('le retour repasse par les mêmes images en sens inverse', () => {
  expect(mountainFrame(SWEEP_LEGS + SWEEP_LEGS / (COUNT - 1), COUNT)).toBe(COUNT - 2)
})

test('le cycle complet fait deux tours de boucle et se referme sans saut', () => {
  expect(mountainFrame(2 * SWEEP_LEGS, COUNT)).toBe(0)
})

test('les demi-tours tombent sur un arrêt en gare', () => {
  // Un demi-tour n'a lieu qu'à un nombre entier d'étapes, donc jamais en marche.
  expect(Number.isInteger(SWEEP_LEGS)).toBe(true)
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

// Agrandir le massif : il grandit vers le haut et déborde symétriquement,
// mais son pied ne quitte jamais la ligne de voie.
test('le pied du massif reste sur la voie, quelle que soit l’échelle', () => {
  for (const e of [1, 1.15, 1.4]) {
    const c = cadreMontagnes(e)
    expect(c.y + c.height).toBeCloseTo(HORIZON, 6)
  }
})

test('le massif reste centré sur le cadre', () => {
  const c = cadreMontagnes(1.25)
  expect(c.x + c.width / 2).toBeCloseTo(STAGE.width / 2, 6)
})

test('à l’échelle 1 le massif remplit exactement la largeur du cadre', () => {
  const c = cadreMontagnes(1)
  expect(c.width).toBeCloseTo(STAGE.width, 6)
  expect(c.x).toBeCloseTo(0, 6)
})

test('agrandir le massif le fait déborder des deux côtés à parts égales', () => {
  const c = cadreMontagnes(1.2)
  expect(c.width).toBeGreaterThan(STAGE.width)
  expect(c.x).toBeLessThan(0)
  expect(c.x + c.width - STAGE.width).toBeCloseTo(-c.x, 6)
})

test('agrandir le massif le fait monter plus haut', () => {
  expect(cadreMontagnes(1.3).y).toBeLessThan(cadreMontagnes(1).y)
})

test('le massif ne sort pas par le haut du cadre à l’échelle retenue', () => {
  expect(cadreMontagnes(ECHELLE_MONTAGNES).y).toBeGreaterThanOrEqual(0)
})

// Le relief ne saute pas d'une image à l'autre : chaque image se fond dans la
// suivante, donc la douceur ne dépend plus de la cadence (CONCEPT.md §6,
// « pas d'à-coups mécaniques »).
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
    expect(m.suivant).toBeLessThan(COUNT)
    expect(m.suivant - m.index).toBeLessThanOrEqual(1)
  }
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

test('au demi-tour, la dernière image ne déborde pas', () => {
  const m = mountainBlend(SWEEP_LEGS, COUNT)
  expect(m.suivant).toBeLessThan(COUNT)
  expect(m.index).toBeLessThan(COUNT)
})
