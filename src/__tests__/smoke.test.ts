import { mount } from '@vue/test-utils'
import App from '@/App.vue'

test('App se monte et contient le canvas de la scène', () => {
  const wrapper = mount(App)
  expect(wrapper.find('canvas.scene').exists()).toBe(true)
})
