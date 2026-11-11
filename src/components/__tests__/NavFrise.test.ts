import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { RouterLink, createMemoryHistory } from 'vue-router'
import NavFrise from '@/components/NavFrise.vue'
import { createAppRouter } from '@/router'
import { useVoyage } from '@/stores/voyage'

async function monter() {
  setActivePinia(createPinia())
  const router = createAppRouter(createMemoryHistory())
  await router.push('/ici')
  await router.isReady()
  const voyage = useVoyage()
  const wrapper = mount(NavFrise, { global: { plugins: [router] } })
  return { wrapper, voyage, router }
}

test('la gare courante porte la mention À QUAI', async () => {
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="a-quai"]').text()).toContain('À QUAI')
})

test('la gare suivante porte la mention PROCHAIN ARRÊT', async () => {
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="prochain"]').text()).toContain('PROCHAIN ARRÊT')
})

test('la gare à quai est celle où l’on est', async () => {
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="a-quai"]').attributes('data-gare')).toBe('ici')
})

test('les gares déjà franchies sont marquées passées', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.finirEtape()
  await wrapper.vm.$nextTick()
  expect(wrapper.findAll('[data-etat="passee"]').length).toBeGreaterThan(0)
})

test('en route, aucune gare n’est à quai', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('la-haut')
  await wrapper.vm.$nextTick()
  expect(wrapper.find('[data-etat="a-quai"]').exists()).toBe(false)
})

test('en route, PROCHAIN ARRÊT désigne la cible, pas une gare traversée', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('ailleurs') // trois étapes : on traverse plus-loin et là-haut
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[data-etat="prochain"]').attributes('data-gare')).toBe('ailleurs')
})

test('la frise est une vraie navigation, au clavier comme à la souris', async () => {
  const { wrapper } = await monter()
  expect(wrapper.find('nav').exists()).toBe(true)
  expect(wrapper.findAllComponents(RouterLink).length).toBeGreaterThan(1)
})

// La frise suit le train pendant tout le trajet, au lieu de sauter d'un cran
// une fois arrivee.
test('la frise glisse en continu pendant le trajet', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.setProgression(0.5)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('.piste').attributes('style')).toContain('--legs: 0.5')
})

test('la frise avance avec la progression, sans a-coup', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  const positions: string[] = []
  for (const p of [0, 0.25, 0.5, 0.75]) {
    voyage.setProgression(p)
    await wrapper.vm.$nextTick()
    positions.push(wrapper.get('.piste').attributes('style') ?? '')
  }
  expect(new Set(positions).size).toBe(4)
})

test('a quai, la frise se pose sur un cran entier', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.finirEtape()
  await wrapper.vm.$nextTick()
  expect(wrapper.get('.piste').attributes('style')).toContain('--legs: 1')
})

test('le marqueur ne se deplace plus : c est la frise qui defile sous lui', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.setProgression(0.5)
  await wrapper.vm.$nextTick()
  expect(wrapper.html()).not.toContain('--avancee')
})

test('le marqueur n’apparaît qu’en route', async () => {
  const { wrapper } = await monter()
  expect(wrapper.find('[data-role="marqueur"]').exists()).toBe(false)
})
