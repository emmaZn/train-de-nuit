import { COULEURS, DEFAUT, MODES, autreMode, fondToHex, loadMode, saveMode } from '@/scene/palette'
import type { Mode } from '@/scene/palette'

/**
 * Ces tests ne figent aucune couleur au hasard : les deux modes sont un choix
 * visuel qu'Emmanuelle a tranché le 25/11 (spec `2026-11-25-mode-jour-design`).
 * Ils tiennent le comportement de la bascule et la seule contrainte dure du
 * cadrage — que le texte reste lisible dans les deux modes.
 */
function luminance(hex: string): number {
  // Le même analyseur que la scène, pas une copie : une copie lirait la forme
  // courte autrement, et ce test validerait une couleur qu'on ne verra jamais.
  const n = fondToHex(hex)
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

test('il y a exactement deux modes', () => {
  expect([...MODES]).toEqual(['nuit', 'jour'])
})

test('chaque couleur est un hexadécimal, en forme courte ou longue', () => {
  for (const mode of MODES) {
    for (const couleur of Object.values(COULEURS[mode])) {
      expect(couleur).toMatch(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    }
  }
})

// Le piège : parseInt lit « abc » comme 0x000abc. Seuls les gris y échappent,
// ce qui laisserait passer #000 et trahirait toutes les autres.
test('la forme courte vaut exactement sa forme longue', () => {
  expect(fondToHex('#000')).toBe(fondToHex('#000000'))
  expect(fondToHex('#abc')).toBe(fondToHex('#aabbcc'))
  expect(fondToHex('#2f1b0c')).toBe(0x2f1b0c)
})

// L'inversion est à 100 % : le trait d'un mode est le fond de l'autre.
test("l'encre sert deux fois : sol de la nuit, trait du jour", () => {
  expect(COULEURS.jour.trait.toLowerCase()).toBe(COULEURS.nuit.fond.toLowerCase())
})

test.each([...MODES])('%s garde le texte lisible', (mode) => {
  expect(contraste(COULEURS[mode].texte, COULEURS[mode].fond)).toBeGreaterThan(12)
})

test('part en nuit quand rien n’est stocké', () => {
  expect(loadMode()).toBe('nuit')
})

test('le défaut est la nuit', () => {
  expect(DEFAUT).toBe('nuit')
})

test('relit le mode stocké', () => {
  saveMode('jour')
  expect(loadMode()).toBe('jour')
})

// Review Focus #2 : une valeur de l'ancienne palette, sous l'ancienne clé ou non.
test('retombe en nuit sur une valeur inconnue', () => {
  localStorage.setItem('train-de-nuit:mode', '#000')
  expect(loadMode()).toBe('nuit')
})

test('ignore l’ancienne clé de la palette', () => {
  localStorage.setItem('train-de-nuit:fond', '#1a120b')
  expect(loadMode()).toBe('nuit')
})

// Review Focus #1 : navigation privée, cookies bloqués, quota dépassé
test('retombe en nuit quand le stockage lève', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied')
  })
  expect(loadMode()).toBe('nuit')
})

test('n’écrit rien et ne lève pas quand le stockage lève', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('QuotaExceeded')
  })
  expect(() => saveMode('jour')).not.toThrow()
})

test('bascule dans les deux sens', () => {
  expect(autreMode('nuit')).toBe('jour')
  expect(autreMode('jour')).toBe('nuit')
})

test('un mode inconnu bascule vers le jour', () => {
  expect(autreMode('brouillard' as Mode)).toBe('jour')
})
