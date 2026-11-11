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

export const useTraces = defineStore('traces', {
  state: () => ({
    etoiles: [] as Trace[],
  }),
  actions: {
    /** One bounded read, no listener: approved traces, newest first. */
    async charger(viewportW: number): Promise<void> {
      const max = limiteEtoiles(viewportW)
      const miennes = loadMiennes()
      try {
        const res = await getDocs(
          query(
            collection(db, 'traces'),
            where('approuvee', '==', true),
            orderBy('creeLe', 'desc'),
            limit(max),
          ),
        )
        const distantes: Trace[] = []
        for (const d of res.docs) {
          const data = d.data()
          // Just written: the server stamp has not landed yet, so there is no
          // date to place it by. Skipped; the next read will have it.
          if (!data.creeLe) continue
          distantes.push({
            id: d.id,
            phrase: data.phrase,
            prenom: data.prenom,
            creeLe: data.creeLe.toMillis(),
            x: data.x,
            y: data.y,
          })
        }
        const parId = new Map<string, Trace>()
        for (const t of [...miennes, ...distantes]) parId.set(t.id, t)
        this.etoiles = [...parId.values()].sort(recentesDAbord).slice(0, max)
      } catch {
        // The sky is decoration: if it cannot be read, show only what we hold.
        this.etoiles = miennes.sort(recentesDAbord).slice(0, max)
      }
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
