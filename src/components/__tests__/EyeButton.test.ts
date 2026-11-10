import { mount } from '@vue/test-utils'
import EyeButton from '@/components/EyeButton.vue'
import { PALETTE } from '@/scene/palette'

test('le bouton annonce ce qu’il fait aux lecteurs d’écran', () => {
  const wrapper = mount(EyeButton)
  expect(wrapper.get('button').attributes('aria-label')).toBe('Changer la couleur de la nuit')
})

test('un clic demande la couleur suivante du cycle', async () => {
  const wrapper = mount(EyeButton, { props: { fond: PALETTE[0] } })
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('change')?.[0]).toEqual([PALETTE[1]])
})

test('un clic sur la dernière couleur revient à la première', async () => {
  const wrapper = mount(EyeButton, { props: { fond: PALETTE[PALETTE.length - 1] } })
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('change')?.[0]).toEqual([PALETTE[0]])
})

test('l’œil est un bouton, pas une image cliquable', () => {
  const wrapper = mount(EyeButton)
  expect(wrapper.find('button').exists()).toBe(true)
})
