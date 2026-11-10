import type { Trace } from './types'

type AnyListener = (...args: never[]) => void

export type SceneEvents = {
  /** Progress of the current leg, 0 to 1. */
  progress: (p: number) => void
  /**
   * Emitted at the end of every leg, so the timeline slides once per station
   * passed. It carries no station: the scene counts legs, the store holds where
   * we are.
   */
  arrived: () => void
  starHover: (trace: Trace | null, x: number, y: number) => void
  birdFell: (x: number, y: number) => void
}

export type Emitter<E extends Record<string, AnyListener>> = {
  /** Subscribe; the returned function unsubscribes. */
  on<K extends keyof E>(evt: K, cb: E[K]): () => void
  emit<K extends keyof E>(evt: K, ...args: Parameters<E[K]>): void
  clear(): void
}

export function createEmitter<E extends Record<string, AnyListener>>(): Emitter<E> {
  const listeners = new Map<keyof E, Set<AnyListener>>()

  return {
    on(evt, cb) {
      let set = listeners.get(evt)
      if (!set) {
        set = new Set()
        listeners.set(evt, set)
      }
      set.add(cb)
      return () => {
        set.delete(cb)
      }
    },
    emit(evt, ...args) {
      const set = listeners.get(evt)
      if (!set) return
      // Copy first: a listener may unsubscribe itself while we iterate.
      for (const cb of [...set]) {
        ;(cb as (...a: unknown[]) => void)(...args)
      }
    },
    clear() {
      listeners.clear()
    },
  }
}
