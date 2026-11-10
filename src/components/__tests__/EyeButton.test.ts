import { mount } from '@vue/test-utils'
import EyeButton from '@/components/EyeButton.vue'

test('le bouton annonce ce qu’il fait aux lecteurs d’écran', () => {
  const wrapper = mount(EyeButton)
  expect(wrapper.get('button').attributes('aria-label')).toBe('Changer la couleur de la nuit')
})

test('un clic demande la couleur suivante du cycle', async () => {
  const wrapper = mount(EyeButton, { props: { fond: '#2E2313' } })
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('change')?.[0]).toEqual(['#141B2B'])
})

test('un clic sur la dernière couleur revient à la première', async () => {
  const wrapper = mount(EyeButton, { props: { fond: '#261725' } })
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('change')?.[0]).toEqual(['#2E2313'])
})

test('l’œil est un bouton, pas une image cliquable', () => {
  const wrapper = mount(EyeButton)
  expect(wrapper.find('button').exists()).toBe(true)
})
