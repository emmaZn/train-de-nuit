import { defineStore } from 'pinia'
import { markRaw } from 'vue'
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
/** What the form plays before a star lights: the grain's rise, awaited. */
export type Poseur = (t: Trace) => Promise<void> | void

const recentesDAbord = (a: Trace, b: Trace) => b.creeLe - a.creeLe

/** Union by id, newest first; the first list to name an id wins. */
function fusionner(...listes: Trace[][]): Trace[] {
  const par = new Map<string, Trace>()
  for (const liste of listes) for (const t of liste) if (!par.has(t.id)) par.set(t.id, t)
  return [...par.values()].sort(recentesDAbord)
}

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
    /**
     * The stars confirmed during this page session. Local storage holds them
     * too, but it falls silent when it fails — private window, blocked
     * cookies — and the sky must not depend on that: see `charger`.
     */
    confirmees: [] as Trace[],
    /**
     * The write that left and has not settled. It lives here and not in the
     * form because it outlives it: the visitor may leave « là-haut » and come
     * back while it flies, and the form that comes back must re-attach to it
     * instead of drawing a second id.
     */
    envoi: null as Envoi | null,
    /**
     * A sentence that left and whose fate could not be confirmed, kept whole.
     * Here too because the form may be gone when the answer comes, and a
     * sentence is never lost without saying so.
     */
    nonConfirmee: null as Trace | null,
    /**
     * What the form on screen does before the star lights — the grain's rise.
     * Null when no form is mounted, and then the star lights at once.
     */
    poseur: null as Poseur | null,
  }),
  actions: {
    /** One bounded read, no listener: approved traces, newest first. */
    async charger(viewportW: number): Promise<void> {
      const max = limiteEtoiles(viewportW)
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
      // Read AFTER the await, never before: a star confirmed while the query
      // was in flight would otherwise be wiped out by its answer — and the
      // send animation lasts 3,5 s, so a read slower than that is enough.
      // Local storage alone would not do: in a private window `saveMienne`
      // fails silently and the star would still be erased.
      const miennes = fusionner(loadMiennes(), this.confirmees).slice(0, max)
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

    /**
     * Sends a sentence, or hands back the one already in flight. The rules
     * refuse any update, so a second write would not correct the first: it
     * would leave a second document to moderate. `b` is therefore ignored
     * while a write is pending — that is the whole point.
     */
    envoyer(b: Brouillon): Envoi {
      if (this.envoi) return this.envoi
      // `markRaw`: Pinia would wrap the pair in a reactive proxy, and the
      // identity checks below — the guard against settling a write twice —
      // would compare a proxy with the raw object and never match.
      const envoi = markRaw(this.ecrire(b))
      this.envoi = envoi
      // The one and only handler on this write, and it belongs to the store:
      // a handler held by the form would write into dead refs once the form
      // is unmounted, and nothing would say the sentence was refused.
      void envoi.promesse.then(
        async () => {
          if (this.envoi !== envoi) return
          // The grain rises first. `confirmer` alone would light the star two
          // and a half seconds too early, in mid-flight.
          await this.poseur?.(envoi.trace)
          this.envoi = null
          this.confirmer(envoi.trace)
          this.nonConfirmee = null
        },
        () => {
          if (this.envoi !== envoi) return
          this.envoi = null
          this.nonConfirmee = envoi.trace
        },
      )
      return envoi
    },

    /** The form on screen takes charge of the rise; on unmount it stands down. */
    suivre(p: Poseur): void {
      this.poseur = p
    },

    oublier(p: Poseur): void {
      // By identity: during a route change the new form registers before the
      // old one unmounts, and the old one must not unregister the new.
      if (this.poseur === p) this.poseur = null
    },

    /** Says — or stops saying — that a sentence's fate could not be confirmed. */
    signaler(t: Trace | null): void {
      this.nonConfirmee = t
    },

    /** The write is confirmed: only now does the star become the visitor's own. */
    confirmer(t: Trace): void {
      this.etoiles = [t, ...this.etoiles.filter((e) => e.id !== t.id)]
      this.confirmees = [t, ...this.confirmees.filter((e) => e.id !== t.id)]
      saveMienne(t)
    },
  },
})
