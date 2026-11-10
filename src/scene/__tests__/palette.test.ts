import { DEFAUT, PALETTE, loadFond, nextFond, saveFond } from '@/scene/palette'

/**
 * Ces tests ne figent aucune couleur : la palette est un choix visuel
 * qu'Emmanuelle règle (CONCEPT.md §6, « à valider »). Ils vérifient le
 * comportement du cycle et la seule contrainte dure du cadrage — que le texte
 * reste lisible sur chaque couleur de nuit.
 */
const TEXTE = '#ececf0'

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  const canal = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255)
}

function contraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (clair + 0.05) / (sombre + 0.05)
}

afterEach(() => {
  vi.restoreAllMocks()
  try {
    localStorage.clear()
  } catch {
    /* indisponible : rien à nettoyer */
  }
})

test('la palette a de quoi tourner', () => {
  expect(PALETTE.length).toBeGreaterThanOrEqual(2)
})

test('chaque couleur est un hexadécimal à six chiffres', () => {
  for (const couleur of PALETTE) expect(couleur).toMatch(/^#[0-9a-fA-F]{6}$/)
})

// CONCEPT.md §6 : « toutes sombres, contraste > 12:1 avec le texte #ececf0 »
test.each(PALETTE)('%s garde le texte lisible', (couleur) => {
  expect(contraste(TEXTE, couleur)).toBeGreaterThan(12)
})

test('le défaut est la première couleur du cycle', () => {
  expect(DEFAUT).toBe(PALETTE[0])
})

test('le cycle avance d’une couleur', () => {
  expect(nextFond(PALETTE[0])).toBe(PALETTE[1])
})

test('le cycle boucle sur la première couleur', () => {
  expect(nextFond(PALETTE[PALETTE.length - 1])).toBe(PALETTE[0])
})

test('une couleur inconnue retombe sur le défaut', () => {
  expect(nextFond('#abcdef')).toBe(DEFAUT)
})

test('loadFond rend ce qui a été enregistré', () => {
  saveFond(PALETTE[1])
  expect(loadFond()).toBe(PALETTE[1])
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
  expect(() => saveFond(PALETTE[1])).not.toThrow()
})
