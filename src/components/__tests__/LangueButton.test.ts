import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, test } from 'vitest'
import LangueButton from '@/components/LangueButton.vue'
import { useLangue } from '@/i18n'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

test('les deux langues sont proposées, et la courante est marquée', () => {
  const w = mount(LangueButton)
  const boutons = w.findAll('button')
  expect(boutons.map((b) => b.text())).toEqual(['FR', 'EN'])
  expect(boutons[0].attributes('aria-pressed')).toBe('true')
  expect(boutons[1].attributes('aria-pressed')).toBe('false')
})

test('un clic change la langue du site', async () => {
  const w = mount(LangueButton)
  await w.findAll('button')[1].trigger('click')
  expect(useLangue().langue).toBe('en')
  expect(w.findAll('button')[1].attributes('aria-pressed')).toBe('true')
})

test('chaque bouton dit où il mène, dans la langue qu’il propose', () => {
  // Un visiteur anglophone doit comprendre le bouton « EN » avant de cliquer :
  // sa promesse est donc toujours en anglais, et celle de « FR » en français.
  const w = mount(LangueButton)
  const boutons = w.findAll('button')
  expect(boutons[0].attributes('title')).toBe('Lire le site en français')
  expect(boutons[1].attributes('title')).toBe('Read this site in English')
})

test('le groupe se présente aux lecteurs d’écran', () => {
  const w = mount(LangueButton)
  expect(w.find('[role="group"]').attributes('aria-label')).toBe('Langue du site')
})
