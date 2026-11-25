import type { Frame } from './layout'
import type { Mode } from './palette'
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
  /**
   * Le mode du site, quand la scène vient de le prendre. Vue s'en sert pour
   * écrire `--fond`, `--texte`, `--trait` et `data-mode` sur la racine : la
   * scène ne connaît pas le DOM, et tout ce qui est en CSS suit le même mode.
   */
  mode: (mode: Mode) => void
  /**
   * Le cadre de la scène, à chaque recadrage (redimensionnement compris). Ce
   * qui est en DOM mais posé *dans* la scène en tire sa place : `offset +
   * position × scale`. `App.vue` le passe par `FRAME_KEY` et `PanneauDeparts` le
   * lit — avec `rideau` ci-dessous — pour poser le texte des départs sur la plaque
   * et la commande du rideau sur l'horloge.
   */
  frame: (frame: Frame) => void
  /**
   * Où est le rideau des départs : `y` est son bord haut en pixels de cadre
   * (comme `frame`), `baisse` l'état **visé** — il change dès le clic, bien
   * avant que la plaque arrive.
   *
   * Émis à chaque image où `y` change et une fois à chaque changement d'état.
   * **`y` est toujours un nombre fini** : le texte du DOM — les trois seuls
   * liens du site — se pose sur ce qu'on émet ici, et un `NaN` l'enverrait
   * nulle part. Un rideau qui n'a pas encore de cadre ne dit donc rien.
   */
  rideau: (y: number, baisse: boolean) => void
  /**
   * Le réverbère d'« ailleurs » est-il allumé ? Émis à chaque changement, et
   * seulement alors : le clic du canvas, le bouton du DOM, et le rallumage
   * d'office quand la gare quitte le champ — c'est ce dernier que le DOM ne
   * peut pas deviner, et sans lequel `aria-pressed` mentirait au retour.
   */
  reverbere: (allume: boolean) => void
  starHover: (trace: Trace | null, x: number, y: number) => void
  /**
   * Un oiseau vient d'être lâché. Sans coordonnées : la réplique paraît
   * toujours au même endroit, en haut au centre (cadrage §7.7).
   */
  birdFell: () => void
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
