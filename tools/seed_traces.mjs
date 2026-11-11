// Seeds the local Firestore emulator with 200 approved traces, to judge the
// density of the sky by eye. Bypasses the security rules on purpose: they
// forbid `approuvee: true` and back-dated `creeLe` on create.
// Usage: start the emulator (`npm run emulators`), then `npm run seed`.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { addDoc, collection, Timestamp } from 'firebase/firestore'

const COUNT = 200
const HOUR = 3600 * 1000
const THREE_YEARS = 3 * 365 * 24 * HOUR

const PHRASES = [
  'Je n’ai pas dormi, mais le train oui.',
  'Bonne nuit à celle qui lit ça.',
  'Il y avait de la neige sur la vitre.',
  'Je pense à toi, quelque part là-bas.',
  'Un jour je prendrai le premier train.',
  'La lune suivait le wagon.',
  'Merci pour le voyage.',
  'On se retrouve à la prochaine gare ?',
  'Silence, puis le bruit des rails.',
  'J’ai laissé mon manteau au café, tant pis.',
  'Les montagnes respirent la nuit.',
  'Quelqu’un a allumé une étoile pour moi.',
  'Demain, tout recommence doucement.',
  'Le thé était encore chaud.',
  'À ceux qui veillent.',
  'Rien à dire, juste passer.',
  'Mon grand-père chantait dans les trains.',
  'Les lumières de la ville s’éloignent.',
  'Je reviendrai quand il fera jour.',
  'Il pleut sur la ligne, c’est joli.',
]
const PRENOMS = ['Camille', 'Noé', 'Inès', 'Léo', 'Sam', 'Yuki', 'Zoé', 'Malo']

const pick = (list) => list[Math.floor(Math.random() * list.length)]

const env = await initializeTestEnvironment({
  projectId: 'demo-train-de-nuit',
  firestore: { host: '127.0.0.1', port: 8080 },
})

try {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const traces = collection(ctx.firestore(), 'traces')
    const now = Date.now()
    for (let i = 0; i < COUNT; i++) {
      const trace = {
        phrase: pick(PHRASES),
        creeLe: Timestamp.fromMillis(now - HOUR - Math.random() * (THREE_YEARS - HOUR)),
        approuvee: true,
        x: Math.random(),
        y: Math.random(),
      }
      if (i % 3 === 0) trace.prenom = pick(PRENOMS)
      await addDoc(traces, trace)
    }
  })
  console.log(`Seeded ${COUNT} approved traces into demo-train-de-nuit (emulator).`)
} finally {
  await env.cleanup()
}
