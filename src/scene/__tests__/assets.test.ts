import { framePath, loadManifest } from '@/scene/assets'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('framePath remplit l’index sur quatre chiffres', () => {
  expect(framePath('assets/mountains/{i}.webp', 7)).toBe('assets/mountains/0007.webp')
})

test('framePath ne tronque pas un index à quatre chiffres', () => {
  expect(framePath('assets/mountains/{i}.webp', 160)).toBe('assets/mountains/0160.webp')
})

test('loadManifest rend le manifeste quand tout va bien', async () => {
  const manifeste = { stage: { width: 2320, height: 1217 } }
  vi.stubGlobal('fetch', () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(manifeste) }),
  )
  await expect(loadManifest()).resolves.toEqual(manifeste)
})

// Review Focus #3 : réseau coupé, manifeste introuvable
test('loadManifest rend null au lieu de lever quand le fetch échoue', async () => {
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))
  await expect(loadManifest()).resolves.toBeNull()
})

test('loadManifest rend null sur une réponse 404', async () => {
  vi.stubGlobal('fetch', () => Promise.resolve({ ok: false, status: 404 }))
  await expect(loadManifest()).resolves.toBeNull()
})

test('loadManifest rend null sur un JSON illisible', async () => {
  vi.stubGlobal('fetch', () =>
    Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('bad json')) }),
  )
  await expect(loadManifest()).resolves.toBeNull()
})
