import { DEFAUT, PALETTE, loadFond, nextFond, saveFond } from '@/scene/palette'

afterEach(() => {
  vi.restoreAllMocks()
  try {
    localStorage.clear()
  } catch {
    /* indisponible : rien à nettoyer */
  }
})

test('la palette est celle du cadrage, dans l’ordre', () => {
  expect(PALETTE).toEqual(['#2E2313', '#141B2B', '#151517', '#13241D', '#261725'])
  expect(DEFAUT).toBe('#2E2313')
})

test('le cycle avance d’une couleur', () => {
  expect(nextFond('#2E2313')).toBe('#141B2B')
})

test('le cycle boucle sur la première couleur', () => {
  expect(nextFond('#261725')).toBe('#2E2313')
})

test('une couleur inconnue retombe sur le défaut', () => {
  expect(nextFond('#abcdef')).toBe('#2E2313')
})

test('loadFond rend ce qui a été enregistré', () => {
  saveFond('#13241D')
  expect(loadFond()).toBe('#13241D')
})

test('loadFond rend le défaut quand la valeur stockée n’est pas dans la palette', () => {
  localStorage.setItem('train-de-nuit:fond', '#000000')
  expect(loadFond()).toBe(DEFAUT)
})

// Review Focus #4 : navigation privée, cookies bloqués, quota dépassé
test('loadFond rend le défaut quand localStorage lève', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied')
  })
  expect(loadFond()).toBe(DEFAUT)
})

test('saveFond ne lève pas quand le quota est dépassé', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('QuotaExceeded')
  })
  expect(() => saveFond('#141B2B')).not.toThrow()
})
