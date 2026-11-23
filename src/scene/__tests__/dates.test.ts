import { ageRelatif } from '../dates'
import { TEXTES } from '@/i18n/textes'

const FR = TEXTES.fr.age
const EN = TEXTES.en.age

// A fixed local "now": 15 June 2026, 14:00 local time.
const MAINTENANT = new Date(2026, 5, 15, 14, 0, 0).getTime()

test.each([
  [30_000, 'à l’instant'],
  [3 * 3600_000, 'aujourd’hui'],
])('ageRelatif %i ms rend %s', (ecoule, attendu) => {
  expect(ageRelatif(MAINTENANT - ecoule, MAINTENANT, FR)).toBe(attendu)
})

test('ageRelatif rend « hier » pour la veille au calendrier, pas pour 24 h pile', () => {
  // Yesterday at 23:50 is only 14 h 10 earlier, but it is yesterday.
  expect(ageRelatif(new Date(2026, 5, 14, 23, 50).getTime(), MAINTENANT, FR)).toBe('hier')
  // Exactly 24 h earlier falls on yesterday too.
  expect(ageRelatif(MAINTENANT - 24 * 3600_000, MAINTENANT, FR)).toBe('hier')
  // 39 h earlier is 23:00 the day before yesterday, not yesterday.
  expect(ageRelatif(MAINTENANT - 39 * 3600_000, MAINTENANT, FR)).toBe('il y a 2 jours')
})

test('ageRelatif rend « il y a 3 jours », « il y a 2 mois »', () => {
  expect(ageRelatif(new Date(2026, 5, 12, 9).getTime(), MAINTENANT, FR)).toBe('il y a 3 jours')
  expect(ageRelatif(new Date(2026, 3, 10, 9).getTime(), MAINTENANT, FR)).toBe('il y a 2 mois')
})

test('l’âge se dit aussi en anglais', () => {
  // Le module reste pur : c'est l'appelant qui apporte les mots.
  expect(ageRelatif(MAINTENANT - 30_000, MAINTENANT, EN)).toBe('just now')
  expect(ageRelatif(MAINTENANT - 24 * 3600_000, MAINTENANT, EN)).toBe('yesterday')
  expect(ageRelatif(MAINTENANT - 3 * 24 * 3600_000, MAINTENANT, EN)).toBe('3 days ago')
})
