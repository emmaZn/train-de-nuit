import { loadMiennes, saveMienne } from '@/stores/traces-locales'
import type { Trace } from '@/scene/types'

const t: Trace = { id: 'a', phrase: 'bonne nuit', prenom: 'Em', creeLe: 1000, x: 0.25, y: 0.75 }

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

test('loadMiennes rend [] quand localStorage est absent', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(loadMiennes()).toEqual([])
})

test('loadMiennes rend [] sur un JSON invalide, sans lever', () => {
  localStorage.setItem('train-de-nuit:mes-traces', '{pas du json')
  expect(loadMiennes()).toEqual([])
})

test('loadMiennes ignore une entrée sans x ou sans y', () => {
  const { x: _x, ...sansX } = t
  const { y: _y, ...sansY } = { ...t, id: 'b' }
  localStorage.setItem(
    'train-de-nuit:mes-traces',
    JSON.stringify([sansX, sansY, { ...t, id: 'c' }]),
  )
  expect(loadMiennes().map((m) => m.id)).toEqual(['c'])
})

test('saveMienne ne lève pas quand le quota est dépassé', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError')
  })
  expect(() => saveMienne(t)).not.toThrow()
})

test('saveMienne puis loadMiennes rend la trace, x et y compris', () => {
  saveMienne(t)
  expect(loadMiennes()).toEqual([t])
})
