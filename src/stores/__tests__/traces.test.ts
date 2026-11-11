import { createPinia, setActivePinia } from 'pinia'
import { useTraces } from '@/stores/traces'
import { loadMiennes } from '@/stores/traces-locales'

const m = vi.hoisted(() => ({
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  limit: vi.fn((n: number) => ({ limit: n })),
  where: vi.fn((...a: unknown[]) => ({ where: a })),
  orderBy: vi.fn((...a: unknown[]) => ({ orderBy: a })),
  query: vi.fn((...a: unknown[]) => ({ query: a })),
  collection: vi.fn((_db: unknown, name: string) => ({ collection: name })),
  doc: vi.fn((_db: unknown, name: string, id: string) => ({ path: `${name}/${id}` })),
  serverTimestamp: vi.fn(() => ({ __sentinel: 'serverTimestamp' })),
}))

vi.mock('firebase/firestore', () => m)
vi.mock('@/firebase', () => ({ db: {}, nouvelId: () => 'nouvel-id' }))

const snap = (id: string, creeLe: number | null, extra: object = {}) => ({
  id,
  data: () => ({
    phrase: `phrase ${id}`,
    x: 0.5,
    y: 0.5,
    creeLe: creeLe === null ? null : { toMillis: () => creeLe },
    ...extra,
  }),
})

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setActivePinia(createPinia())
  m.getDocs.mockResolvedValue({ docs: [] })
  m.setDoc.mockResolvedValue(undefined)
})

test('charger demande 120 sur grand écran et 50 sur téléphone', async () => {
  const s = useTraces()
  await s.charger(1280)
  expect(m.limit).toHaveBeenLastCalledWith(120)
  await s.charger(390)
  expect(m.limit).toHaveBeenLastCalledWith(50)
})

test('charger ne demande que les approuvées, les plus récentes d’abord', async () => {
  await useTraces().charger(1280)
  expect(m.where).toHaveBeenCalledWith('approuvee', '==', true)
  expect(m.orderBy).toHaveBeenCalledWith('creeLe', 'desc')
})

test('charger trie par date décroissante et n’en garde pas plus que la limite', async () => {
  const docs = Array.from({ length: 60 }, (_, i) => snap(`d${i}`, i * 10))
  m.getDocs.mockResolvedValue({ docs })
  const s = useTraces()
  await s.charger(390)
  expect(s.etoiles).toHaveLength(50)
  const dates = s.etoiles.map((e) => e.creeLe)
  expect(dates).toEqual([...dates].sort((a, b) => b - a))
  expect(s.etoiles[0].id).toBe('d59')
})

test('charger fusionne ses propres étoiles locales et dédoublonne par id', async () => {
  localStorage.setItem(
    'train-de-nuit:mes-traces',
    JSON.stringify([
      { id: 'a', phrase: 'locale a', creeLe: 5, x: 0.1, y: 0.1 },
      { id: 'mienne', phrase: 'en attente', creeLe: 50, x: 0.2, y: 0.2 },
    ]),
  )
  m.getDocs.mockResolvedValue({ docs: [snap('a', 5), snap('b', 20)] })
  const s = useTraces()
  await s.charger(1280)
  expect(s.etoiles.map((e) => e.id)).toEqual(['mienne', 'b', 'a'])
})

test('charger ignore un document dont le creeLe n’est pas encore posé', async () => {
  m.getDocs.mockResolvedValue({ docs: [snap('a', null), snap('b', 20)] })
  const s = useTraces()
  await s.charger(1280)
  expect(s.etoiles.map((e) => e.id)).toEqual(['b'])
})

test('charger rend une liste vide, sans lever, quand la requête échoue', async () => {
  m.getDocs.mockRejectedValue(new Error('offline'))
  const s = useTraces()
  await expect(s.charger(1280)).resolves.toBeUndefined()
  expect(s.etoiles).toEqual([])
})

test('ecrire rend tout de suite une trace avec un id, avant que l’écriture aboutisse', () => {
  m.setDoc.mockReturnValue(new Promise(() => {})) // never settles
  const { trace } = useTraces().ecrire({ phrase: 'salut', x: 0.3, y: 0.4 })
  expect(trace).toMatchObject({ id: 'nouvel-id', phrase: 'salut', x: 0.3, y: 0.4 })
  expect(typeof trace.creeLe).toBe('number')
})

test('ecrire pose approuvee: false et creeLe en serverTimestamp', () => {
  useTraces().ecrire({ phrase: 'salut', prenom: 'Em', x: 0.3, y: 0.4 })
  expect(m.setDoc).toHaveBeenCalledTimes(1)
  const [ref, data] = m.setDoc.mock.calls[0]
  expect(ref).toEqual({ path: 'traces/nouvel-id' })
  expect(data).toEqual({
    phrase: 'salut',
    prenom: 'Em',
    x: 0.3,
    y: 0.4,
    approuvee: false,
    creeLe: { __sentinel: 'serverTimestamp' },
  })
})

test('ecrire n’envoie pas de prénom absent (Firestore refuse undefined)', () => {
  useTraces().ecrire({ phrase: 'salut', x: 0.3, y: 0.4 })
  expect(m.setDoc.mock.calls[0][1]).not.toHaveProperty('prenom')
})

test('ecrire écrit une seule fois, et la promesse suit l’écriture', async () => {
  m.setDoc.mockRejectedValue(new Error('denied'))
  const { promesse } = useTraces().ecrire({ phrase: 'salut', x: 0.3, y: 0.4 })
  await expect(promesse).rejects.toThrow('denied')
  expect(m.setDoc).toHaveBeenCalledTimes(1)
})

test('confirmer ajoute l’étoile à la liste et au stockage local', () => {
  const s = useTraces()
  const { trace } = s.ecrire({ phrase: 'salut', x: 0.3, y: 0.4 })
  s.confirmer(trace)
  expect(s.etoiles).toContainEqual(trace)
  expect(loadMiennes()).toEqual([trace])
})

test('une étoile non confirmée n’est jamais écrite dans le stockage local', async () => {
  const s = useTraces()
  const { promesse } = s.ecrire({ phrase: 'salut', x: 0.3, y: 0.4 })
  await promesse
  expect(loadMiennes()).toEqual([])
  expect(s.etoiles).toEqual([])
})
