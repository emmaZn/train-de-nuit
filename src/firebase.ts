import { getApp, getApps, initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { collection, connectFirestoreEmulator, doc, getFirestore } from 'firebase/firestore'

// The single Firebase entry point of the client. Without real configuration
// (no VITE_FIREBASE_* variables) we are on the local emulator, which is how
// everything runs in this step.
const env = import.meta.env
const projectId: string | undefined = env.VITE_FIREBASE_PROJECT_ID || undefined

const config = projectId
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId,
      appId: env.VITE_FIREBASE_APP_ID,
    }
  : { projectId: 'demo-train-de-nuit' }

export function surEmulateur(): boolean {
  return !projectId
}

// Vite re-executes modules on hot reload, but the Firebase app (and the
// emulator connection, which throws if made twice) outlives them: remember
// what was already done on globalThis.
const FLAG = '__trainDeNuitFirebase'
const state = ((globalThis as Record<string, unknown>)[FLAG] ??= {
  emulatorConnected: false,
  appCheckStarted: false,
}) as { emulatorConnected: boolean; appCheckStarted: boolean }

const app = getApps().length ? getApp() : initializeApp(config)

export const db = getFirestore(app)

if (surEmulateur()) {
  if (!state.emulatorConnected) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    state.emulatorConnected = true
  }
} else if (env.VITE_RECAPTCHA_KEY && !state.appCheckStarted) {
  initializeAppCheck(app, {
    // Fraud Defense, the new name of reCAPTCHA Enterprise: it is what the
    // Firebase console offers now, and its keys are not the classic v3 ones.
    provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_KEY),
    isTokenAutoRefreshEnabled: true,
  })
  state.appCheckStarted = true
}

// The id exists before the write: a re-send after a timeout reuses the same
// document instead of creating a second one. Generated locally, no network.
export function nouvelId(): string {
  return doc(collection(db, 'traces')).id
}
