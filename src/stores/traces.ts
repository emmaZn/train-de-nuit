import { defineStore } from 'pinia'
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db, nouvelId } from '@/firebase'
import { limiteEtoiles } from '@/scene/stars'
import type { Trace } from '@/scene/types'
import { loadMiennes, saveMienne } from './traces-locales'

export type Brouillon = { phrase: string; prenom?: string; x: number; y: number }
export type Envoi = { trace: Trace; promesse: Promise<void> }

const recentesDAbord = (a: Trace, b: Trace) => b.creeLe - a.creeLe

/** Remote data is not trusted: anything malformed yields null. */
function versTrace(id: string, data: Record<string, unknown>): Trace | null {
  const creeLe = data.creeLe as { toMillis?: unknown } | null | undefined
  if (!creeLe || typeof creeLe.toMillis !== 'function') return null
  const ms: unknown = creeLe.toMillis()
  if (
    typeof ms !== 'number' ||
    typeof data.phrase !== 'string' ||
    typeof data.x !== 'number' ||
    typeof data.y !== 'number' ||
    (data.prenom !== undefined && typeof data.prenom !== 'string')
  )
    return null
  return {
    id,
    phrase: data.phrase,
    ...(data.prenom !== undefined ? { prenom: data.prenom } : {}),
    creeLe: ms,
    x: data.x,
    y: data.y,
  }
}

export const useTraces = defineStore('traces', {
  state: () => ({
    etoiles: [] as Trace[],
  }),
  actions: {
    /** One bounded read, no listener: approved traces, newest first. */
    async charger(viewportW: number): Promise<void> {
      const max = limiteEtoiles(viewportW)
      const miennes = loadMiennes()
      const distantes: Trace[] = []
      try {
        const res = await getDocs(
          query(
            collection(db, 'traces'),
            where('approuvee', '==', true),
            orderBy('creeLe', 'desc'),
            limit(max),
          ),
        )
        for (const d of res.docs) {
          const t = versTrace(d.id, d.data())
          // Invalid (or not yet stamped by the server): skip this one document,
          // never the whole sky.
          if (t) distantes.push(t)
        }
      } catch {
        // The sky is decoration: if it cannot be read, show only what we hold.
      }
      // The visitor's own stars are always kept; only the remote ones are cut,
      // to what room is left.
      const ids = new Set(miennes.map((t) => t.id))
      const autres = distantes
        .filter((t) => !ids.has(t.id))
        .sort(recentesDAbord)
        .slice(0, Math.max(0, max - miennes.length))
      this.etoiles = [...miennes, ...autres].sort(recentesDAbord)
    },

    /**
     * The id is generated before the network, so the trace exists at once; the
     * promise is the write itself. Written once: the rules refuse any update.
     */
    ecrire(b: Brouillon): Envoi {
      const id = nouvelId()
      const trace: Trace = {
        id,
        phrase: b.phrase,
        ...(b.prenom ? { prenom: b.prenom } : {}),
        creeLe: Date.now(),
        x: b.x,
        y: b.y,
      }
      const promesse = setDoc(doc(db, 'traces', id), {
        phrase: b.phrase,
        ...(b.prenom ? { prenom: b.prenom } : {}),
        x: b.x,
        y: b.y,
        approuvee: false,
        creeLe: serverTimestamp(),
      })
      return { trace, promesse }
    },

    /** The write is confirmed: only now does the star become the visitor's own. */
    confirmer(t: Trace): void {
      this.etoiles = [t, ...this.etoiles.filter((e) => e.id !== t.id)]
      saveMienne(t)
    },
  },
})
