import { createRouter, createWebHistory } from 'vue-router'
import type { Router, RouterHistory } from 'vue-router'
import GareAilleurs from '@/components/gares/GareAilleurs.vue'
import GareIci from '@/components/gares/GareIci.vue'
import GareLaHaut from '@/components/gares/GareLaHaut.vue'
import GarePlusLoin from '@/components/gares/GarePlusLoin.vue'
import type { Gare } from '@/scene/types'
import { GARES, useVoyage } from '@/stores/voyage'

export function createAppRouter(history: RouterHistory = createWebHistory()): Router {
  return createRouter({
    history,
    routes: [
      { path: '/', redirect: '/ici' },
      { path: '/ici', name: 'ici', component: GareIci },
      { path: '/plus-loin', name: 'plus-loin', component: GarePlusLoin },
      { path: '/la-haut', name: 'la-haut', component: GareLaHaut },
      { path: '/ailleurs', name: 'ailleurs', component: GareAilleurs },
      { path: '/:chemin(.*)*', redirect: '/ici' },
    ],
  })
}

/**
 * The URL always changes at once; it is the train that takes time to arrive.
 * The very first navigation simply places the station — a shared link must not
 * play a journey the visitor never asked for. Every later one departs, and
 * because `partirVers` redirects a journey in flight instead of refusing it,
 * the URL and the target can never name two different stations.
 */
export function brancherVoyage(router: Router): void {
  let premiere = true
  router.afterEach((to) => {
    const gare = to.name as Gare
    if (!(GARES as readonly string[]).includes(gare)) return
    const voyage = useVoyage()
    if (premiere) {
      premiere = false
      voyage.poserGare(gare)
      return
    }
    voyage.partirVers(gare)
  })
}
