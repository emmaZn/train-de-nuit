import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'

// jsdom n'a pas de WebGL : la scène ne peut pas s'initialiser ici. Ce qu'on
// vérifie, c'est que la couche HTML se monte autour d'elle.
vi.mock('@/composables/useScene', async () => {
  const { ref } = await import('vue')
  return {
    useScene: () => ({ scene: ref(null), fond: ref('#2E2313'), changerFond: () => {} }),
  }
})

async function monter() {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/ici')
  await router.isReady()
  return mount(App, { global: { plugins: [createPinia(), router] } })
}

test('App se monte et contient le canvas de la scène', async () => {
  const wrapper = await monter()
  expect(wrapper.find('canvas.scene').exists()).toBe(true)
})

test('App pose l’icône œil par-dessus la scène', async () => {
  const wrapper = await monter()
  expect(wrapper.find('button[aria-label="Changer la couleur de la nuit"]').exists()).toBe(true)
})

test('la gare ici affiche son nom et sa phrase', async () => {
  const wrapper = await monter()
  expect(wrapper.text()).toContain('Emmanuelle Zenou')
  expect(wrapper.text()).toContain('Chaque étoile est quelqu\'un qui est passé par ici.')
})

test('App pose la frise des gares par-dessus la scène', async () => {
  const wrapper = await monter()
  expect(wrapper.find('nav.frise').exists()).toBe(true)
  expect(wrapper.get('[data-etat="a-quai"]').attributes('data-gare')).toBe('ici')
})
