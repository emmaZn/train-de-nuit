import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EtoilesListe from '@/components/EtoilesListe.vue'
import { useTraces } from '@/stores/traces'
import type { Trace } from '@/scene/types'

const MAINTENANT = new Date(2026, 10, 11, 12, 0, 0).getTime()

const trace = (id: string, extra: Partial<Trace> = {}): Trace => ({
  id,
  phrase: `Phrase ${id}`,
  creeLe: MAINTENANT - 86_400_000,
  x: 0.5,
  y: 0.5,
  ...extra,
})

function monter(etoiles: Trace[]) {
  setActivePinia(createPinia())
  useTraces().etoiles = etoiles
  return mount(EtoilesListe)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(MAINTENANT)
})
afterEach(() => vi.useRealTimers())

test('la liste masquée nomme chaque étoile récente, phrase et âge', () => {
  const wrapper = monter([
    trace('a', { phrase: 'Un soir de pluie', prenom: 'Léa' }),
    trace('b', { phrase: 'Rien à dire', creeLe: MAINTENANT - 3 * 86_400_000 }),
  ])
  const items = wrapper.findAll('li')
  expect(items).toHaveLength(2)
  expect(items[0]!.text()).toContain('Un soir de pluie')
  expect(items[0]!.text()).toContain('Léa')
  expect(items[0]!.text()).toContain('hier')
  expect(items[1]!.text()).toContain('Rien à dire')
  expect(items[1]!.text()).toContain('il y a 3 jours')
})

test('la liste est une liste nommée, que les lecteurs d’écran trouvent', () => {
  const wrapper = monter([trace('a')])
  // Safari/VoiceOver drop list semantics under `list-style: none` without it.
  expect(wrapper.get('ul').attributes('role')).toBe('list')
  expect(wrapper.get('ul').attributes('aria-label')).toBe('Étoiles laissées par les voyageurs')
  // Neither of these would leave it in the accessibility tree.
  expect(wrapper.find('[hidden]').exists()).toBe(false)
  expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false)
})

test('la liste est atteignable au clavier', () => {
  const wrapper = monter([trace('a')])
  expect(wrapper.get('ul').attributes('tabindex')).toBe('0')
})

test('sans étoile, il n’y a pas de liste à parcourir', () => {
  const wrapper = monter([])
  expect(wrapper.find('ul').exists()).toBe(false)
})

test('la liste est invisible à l’écran sans quitter l’arbre d’accessibilité', async () => {
  // jsdom does not load the component stylesheet: the rule is read from the source.
  const css = (await import('@/components/EtoilesListe.vue?raw')).default
  const bloc = (sel: string) => new RegExp(`${sel}\\s*\\{([^}]*)\\}`, 's').exec(css)?.[1] ?? ''
  const masque = bloc('\\.etoiles')
  expect(masque).toMatch(/clip:\s*rect\(0,\s*0,\s*0,\s*0\)/)
  expect(masque).toMatch(/width:\s*1px/)
  expect(masque).toMatch(/height:\s*1px/)
  expect(masque).toMatch(/overflow:\s*hidden/)
  expect(css).not.toMatch(/display:\s*none/)
  expect(css).not.toMatch(/visibility:\s*hidden/)
  // Reaching it by keyboard must make it visible, or focus lands on nothing.
  const visible = bloc('\\.etoiles:focus-within')
  expect(visible).toMatch(/clip:\s*auto/)
  expect(visible).toMatch(/height:\s*auto/)
  expect(visible).toMatch(/width:\s*min\(/)
  expect(visible).toMatch(/overflow:\s*auto/)
})
