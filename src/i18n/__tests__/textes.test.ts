import { expect, test } from 'vitest'
import { TEXTES } from '@/i18n/textes'

/** Toutes les clés d'un arbre, à plat : `cv.titre`, `age.jours`… */
function cles(o: unknown, prefixe = ''): string[] {
  if (typeof o !== 'object' || o === null) return [prefixe]
  return Object.entries(o).flatMap(([k, v]) => cles(v, prefixe ? `${prefixe}.${k}` : k))
}

test('les deux langues disent exactement les mêmes choses', () => {
  // `en: typeof fr` l'impose déjà à la compilation ; ce test le dit en rouge,
  // tout de suite, sans attendre un `vue-tsc`.
  expect(cles(TEXTES.en).sort()).toEqual(cles(TEXTES.fr).sort())
})

test('aucun texte n’est resté vide', () => {
  const vides = cles(TEXTES.fr)
    .concat(cles(TEXTES.en))
    .filter((chemin) => {
      const [langue, ...reste] = chemin.split('.')
      let v: unknown = TEXTES[langue as 'fr' | 'en'] ?? TEXTES
      for (const k of reste.length > 0 ? reste : chemin.split('.')) {
        v = (v as Record<string, unknown>)?.[k]
      }
      return v === ''
    })
  expect(vides).toEqual([])
})

test('les textes qui comptent sont vraiment traduits', () => {
  // Le piège d'un dictionnaire recopié : `en` compile, mais parle français.
  expect(TEXTES.en.laHaut.titre).not.toBe(TEXTES.fr.laHaut.titre)
  expect(TEXTES.en.ici.phrase).not.toBe(TEXTES.fr.ici.phrase)
  expect(TEXTES.en.frise.prochainArret).not.toBe(TEXTES.fr.frise.prochainArret)
  expect(TEXTES.en.cv.titre).not.toBe(TEXTES.fr.cv.titre)
  expect(TEXTES.en.age.hier).not.toBe(TEXTES.fr.age.hier)
})

test('les nombres se glissent dans les deux langues', () => {
  expect(TEXTES.fr.age.jours(3)).toBe('il y a 3 jours')
  expect(TEXTES.en.age.jours(3)).toBe('3 days ago')
})
