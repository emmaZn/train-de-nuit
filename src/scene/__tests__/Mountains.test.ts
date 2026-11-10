import { SWEEP_LEGS, mountainFrame } from '@/scene/Mountains'

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
