import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { brancherVoyage, createAppRouter } from '@/router'
import { GARES, useVoyage } from '@/stores/voyage'

async function demarrer(chemin = '/') {
  setActivePinia(createPinia())
  const router = createAppRouter(createMemoryHistory())
  brancherVoyage(router)
  await router.push(chemin)
  await router.isReady()
  await flushPromises()
  return { router, voyage: useVoyage() }
}

test('la racine redirige vers ici', async () => {
  const { router } = await demarrer('/')
  expect(router.currentRoute.value.path).toBe('/ici')
})

test.each(GARES)('la route /%s existe', async (gare) => {
  const { router } = await demarrer(`/${gare}`)
  expect(router.currentRoute.value.name).toBe(gare)
})

test('une route inconnue retombe sur ici', async () => {
  const { router } = await demarrer('/gare-de-lyon')
  expect(router.currentRoute.value.path).toBe('/ici')
})

// Review Focus #6 : lien partagé ouvert dans un onglet neuf
test('ouvrir directement /la-haut pose la gare sans jouer de voyage', async () => {
  const { voyage } = await demarrer('/la-haut')
  expect(voyage.gare).toBe('la-haut')
  expect(voyage.enRoute).toBe(false)
  expect(voyage.cible).toBe(null)
})

// Review Focus #1 : le cœur de la spec — le train ne recule jamais
test('le retour navigateur vers une gare passée déclenche un trajet vers l’avant', async () => {
  const { router, voyage } = await demarrer('/ici')

  await router.push('/plus-loin')
  await flushPromises()
  voyage.finirEtape() // le train fait l'étape et arrive
  expect(voyage.gare).toBe('plus-loin')

  router.back() // vers /ici
  await flushPromises()

  expect(voyage.cible).toBe('ici')
  expect(voyage.enRoute).toBe(true)
  // trois étapes vers l'avant, pas un retour en arrière
  expect(voyage.etapesRestantes).toBe(3)
})

// Review Focus #2 : clics répétés — l'URL ne doit jamais désigner une autre gare que la cible
test('après deux clics rapides, l’URL et la cible désignent la même gare', async () => {
  const { router, voyage } = await demarrer('/ici')

  await router.push('/la-haut')
  await router.push('/ailleurs')
  await flushPromises()

  expect(voyage.cible).toBe('ailleurs')
  expect(router.currentRoute.value.name).toBe('ailleurs')
})

test('le train ne repart pas quand on reclique la gare où il est à quai', async () => {
  const { router, voyage } = await demarrer('/ici')
  await router.push('/ici')
  await flushPromises()
  expect(voyage.enRoute).toBe(false)
})
