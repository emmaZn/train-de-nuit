import { mount } from '@vue/test-utils'
import EyeButton from '@/components/EyeButton.vue'
import { createPinia, setActivePinia } from 'pinia'

// Le bouton lit maintenant son libellé dans le dictionnaire, donc un magasin.
beforeEach(() => setActivePinia(createPinia()))

test('le bouton annonce ce qu’il fait aux lecteurs d’écran', () => {
  const wrapper = mount(EyeButton)
  expect(wrapper.get('button').attributes('aria-label')).toBe('Changer la couleur de la nuit')
})

test('un clic demande le jour quand on est de nuit', async () => {
  const wrapper = mount(EyeButton, { props: { mode: 'nuit' } })
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('change')?.[0]).toEqual(['jour'])
})

test('un clic demande la nuit quand on est de jour', async () => {
  const wrapper = mount(EyeButton, { props: { mode: 'jour' } })
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('change')?.[0]).toEqual(['nuit'])
})

test('l’œil est un bouton, pas une image cliquable', () => {
  const wrapper = mount(EyeButton)
  expect(wrapper.find('button').exists()).toBe(true)
})
