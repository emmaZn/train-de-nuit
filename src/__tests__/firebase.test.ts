// This suite runs in jsdom with no emulator: importing the module must never
// open a connection. Firestore connects lazily, so the real SDK is safe here;
// App Check is mocked because it would otherwise start loading reCAPTCHA.
const initializeAppCheck = vi.fn()
const ReCaptchaV3Provider = vi.fn()
vi.mock('firebase/app-check', () => ({ initializeAppCheck, ReCaptchaV3Provider }))

// Real Firestore, with the emulator connection spied on to count calls.
const connectFirestoreEmulator = vi.fn()
vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  connectFirestoreEmulator,
}))

async function charger() {
  vi.resetModules()
  return import('@/firebase')
}

beforeEach(() => {
  initializeAppCheck.mockClear()
  ReCaptchaV3Provider.mockClear()
  connectFirestoreEmulator.mockClear()
  // The HMR guard lives on globalThis; start each test from a fresh page session.
  delete (globalThis as Record<string, unknown>).__trainDeNuitFirebase
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('surEmulateur est vrai quand aucune clé de projet réel n’est fournie', async () => {
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '')
  vi.stubEnv('VITE_FIREBASE_API_KEY', '')
  const { surEmulateur } = await charger()
  expect(surEmulateur()).toBe(true)
})

test('surEmulateur est faux quand une configuration réelle est fournie', async () => {
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'train-de-nuit-reel')
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'cle-reelle')
  const { surEmulateur } = await charger()
  expect(surEmulateur()).toBe(false)
})

test('nouvelId rend deux identifiants différents sans toucher au réseau', async () => {
  const fetchEspion = vi.fn()
  const socketEspion = vi.fn()
  vi.stubGlobal('fetch', fetchEspion)
  vi.stubGlobal('WebSocket', socketEspion)
  const { nouvelId } = await charger()
  const a = nouvelId()
  const b = nouvelId()
  expect(a).toMatch(/^[A-Za-z0-9]{20}$/)
  expect(b).not.toBe(a)
  expect(fetchEspion).not.toHaveBeenCalled()
  expect(socketEspion).not.toHaveBeenCalled()
})

test('l’émulateur n’est connecté qu’une fois même si le module est réévalué (rechargement à chaud)', async () => {
  await charger()
  await charger()
  expect(connectFirestoreEmulator).toHaveBeenCalledTimes(1)
  expect(connectFirestoreEmulator).toHaveBeenCalledWith(expect.anything(), '127.0.0.1', 8080)
})

test('l’émulateur n’est pas connecté avec une configuration réelle', async () => {
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'train-de-nuit-reel')
  await charger()
  expect(connectFirestoreEmulator).not.toHaveBeenCalled()
})

test('App Check ne s’initialise pas quand on est sur l’émulateur', async () => {
  vi.stubEnv('VITE_RECAPTCHA_KEY', 'cle-recaptcha')
  await charger()
  expect(initializeAppCheck).not.toHaveBeenCalled()
})

test('App Check s’initialise avec reCAPTCHA v3 sur un vrai projet doté d’une clé', async () => {
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'train-de-nuit-reel')
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'cle-reelle')
  vi.stubEnv('VITE_RECAPTCHA_KEY', 'cle-recaptcha')
  await charger()
  expect(ReCaptchaV3Provider).toHaveBeenCalledWith('cle-recaptcha')
  expect(initializeAppCheck).toHaveBeenCalledTimes(1)
})
