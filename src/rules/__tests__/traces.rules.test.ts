import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
// Chemin relatif : la configuration des tests de règles n'a pas l'alias `@`.
import { ETOILES_MAX_BUREAU, ETOILES_MAX_MOBILE } from '../../scene/stars'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-train-de-nuit',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await env.clearFirestore()
})

const valid = () => ({
  phrase: 'a'.repeat(80),
  creeLe: serverTimestamp(),
  approuvee: false,
  x: 0.5,
  y: 0.5,
})
const db = () => env.unauthenticatedContext().firestore()
const create = (data: Record<string, unknown>) => addDoc(collection(db(), 'traces'), data)

async function seed(id: string, approuvee: boolean) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'traces', id), {
      phrase: 'bonsoir', creeLe: Timestamp.now(), approuvee, x: 0.1, y: 0.2,
    })
  })
}

describe('traces rules', () => {
  test('une trace non approuvée est illisible', async () => {
    await seed('t1', false)
    await assertFails(getDoc(doc(db(), 'traces', 't1')))
  })
  test('une trace approuvée est lisible', async () => {
    await seed('t1', true)
    await assertSucceeds(getDoc(doc(db(), 'traces', 't1')))
  })
  test('création acceptée : phrase de 80 caractères, prenom absent, approuvee false, x et y dans 0..1', async () => {
    await assertSucceeds(create(valid()))
  })
  test('création refusée : phrase vide', async () => {
    await assertFails(create({ ...valid(), phrase: '' }))
  })
  test('création refusée : phrase de 81 caractères', async () => {
    await assertFails(create({ ...valid(), phrase: 'a'.repeat(81) }))
  })
  test('création refusée : prenom de 25 caractères', async () => {
    await assertFails(create({ ...valid(), prenom: 'a'.repeat(25) }))
  })
  test('création refusée : approuvee true', async () => {
    await assertFails(create({ ...valid(), approuvee: true }))
  })
  test('création refusée : creeLe fourni à la main au lieu de request.time', async () => {
    await assertFails(create({ ...valid(), creeLe: Timestamp.fromDate(new Date('2020-01-01')) }))
  })
  test('création refusée : x hors de 0..1', async () => {
    await assertFails(create({ ...valid(), x: 1.5 }))
  })
  test('création refusée : y absent', async () => {
    const { y: _y, ...rest } = valid()
    await assertFails(create(rest))
  })
  test('création refusée : un champ inconnu en plus', async () => {
    await assertFails(create({ ...valid(), extra: 1 }))
  })
  // Review Focus #3 — le compteur du formulaire comptera pareil (Tâche 7)
  test('création acceptée : 80 caractères comptés en points de code, accents, ’ et emoji compris', async () => {
    const phrase = 'é’😀'.repeat(26) + 'ab' // 28 * ... = 80 code points
    if ([...phrase].length !== 80) throw new Error('fixture is not 80 code points')
    await assertSucceeds(create({ ...valid(), phrase, prenom: '😀'.repeat(24) }))
  })
  test('création refusée : une phrase faite uniquement d’espaces', async () => {
    await assertFails(create({ ...valid(), phrase: '   ' }))
  })
  /* ---- La requête du ciel : la seule lecture de la production ---- */

  /** `charger()` mot pour mot : approuvées, les plus récentes d'abord, bornées. */
  const requeteDuCiel = (n: number) =>
    getDocs(
      query(
        collection(db(), 'traces'),
        where('approuvee', '==', true),
        orderBy('creeLe', 'desc'),
        limit(n),
      ),
    )

  test('la requête du ciel passe, bornée à 120 (grand écran)', async () => {
    await seed('t1', true)
    await assertSucceeds(requeteDuCiel(ETOILES_MAX_BUREAU))
  })

  test('la requête du ciel passe aussi bornée à 50 (téléphone)', async () => {
    await seed('t1', true)
    await assertSucceeds(requeteDuCiel(ETOILES_MAX_MOBILE))
  })

  test('une requête sans borne est refusée, même sur les approuvées', async () => {
    await seed('t1', true)
    // Le §8 promet que le site ne télécharge jamais plus de N phrases : sans
    // borne dans les règles, un client lit toute la collection d'un coup.
    await assertFails(
      getDocs(
        query(collection(db(), 'traces'), where('approuvee', '==', true), orderBy('creeLe', 'desc')),
      ),
    )
  })

  test('une requête bornée au-delà de 120 est refusée', async () => {
    await seed('t1', true)
    await assertFails(requeteDuCiel(ETOILES_MAX_BUREAU + 1))
  })

  test('lire la collection entière, sans filtre, est refusé', async () => {
    await seed('t1', true)
    await seed('t2', false)
    await assertFails(getDocs(collection(db(), 'traces')))
  })

  test('la borne des règles est celle du ciel, et non un nombre à part', async () => {
    const regles = readFileSync('firestore.rules', 'utf8')
    expect(regles).toContain(`request.query.limit <= ${ETOILES_MAX_BUREAU}`)
  })

  test('mise à jour et suppression toujours refusées', async () => {
    await seed('t1', true)
    await assertFails(updateDoc(doc(db(), 'traces', 't1'), { phrase: 'autre' }))
    await assertFails(deleteDoc(doc(db(), 'traces', 't1')))
  })
})
