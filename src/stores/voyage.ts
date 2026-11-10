import { defineStore } from 'pinia'
import type { Gare } from '@/scene/types'

/** The loop, in travel order. The train never goes back (CONCEPT.md §3). */
export const GARES = ['ici', 'plus-loin', 'la-haut', 'ailleurs'] as const

/** How many legs forward, 0 to 3. Going "back" means going all the way round. */
export function forwardSteps(from: Gare, to: Gare): number {
  return (GARES.indexOf(to) - GARES.indexOf(from) + GARES.length) % GARES.length
}

export function gareSuivante(gare: Gare): Gare {
  return GARES[(GARES.indexOf(gare) + 1) % GARES.length]
}

export const useVoyage = defineStore('voyage', {
  state: () => ({
    gare: 'ici' as Gare,
    cible: null as Gare | null,
    enRoute: false,
    /** Progress of the current leg, 0 to 1. */
    progression: 0,
    /** Legs travelled since the beginning; drives the mountains. */
    legs: 0,
  }),

  getters: {
    etapesRestantes: (state): number =>
      state.cible ? forwardSteps(state.gare, state.cible) : 0,
  },

  actions: {
    /** First navigation, or a shared link: the station is simply where we are. */
    poserGare(gare: Gare) {
      this.gare = gare
      this.cible = null
      this.enRoute = false
      this.progression = 0
    },

    /**
     * Called while already travelling, this redirects the journey in flight
     * rather than queueing a second one: the URL and the target can then never
     * name two different stations.
     */
    partirVers(cible: Gare) {
      if (!this.enRoute && cible === this.gare) return
      this.cible = cible
      if (!this.enRoute) {
        this.enRoute = true
        this.progression = 0
      }
    },

    setProgression(p: number) {
      this.progression = Math.min(1, Math.max(0, p))
    },

    /** End of one leg: the timeline slides one notch per station passed. */
    finirEtape() {
      if (!this.enRoute) return
      this.gare = gareSuivante(this.gare)
      this.legs += 1
      this.progression = 0
      if (this.gare === this.cible) {
        this.enRoute = false
        this.cible = null
      }
    },
  },
})
