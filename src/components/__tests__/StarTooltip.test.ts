import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import StarTooltip from '@/components/StarTooltip.vue'
import { SCENE_KEY } from '@/composables/useScene'
import type { Scene } from '@/scene/Scene'
import type { Trace } from '@/scene/types'

type Hover = (trace: Trace | null, x: number, y: number) => void

const MAINTENANT = new Date(2026, 10, 11, 12, 0, 0).getTime()

const trace = (extra: Partial<Trace> = {}): Trace => ({
  id: 'a',
  phrase: 'Je pense à toi depuis le quai',
  prenom: 'Léa',
  creeLe: MAINTENANT - 3 * 86_400_000,
  x: 0.5,
  y: 0.5,
  ...extra,
})

/** A scene reduced to what the bubble uses: a `starHover` subscription. */
function fausseScene() {
  let ecouteur: Hover | null = null
  const off = vi.fn()
  const scene = {
    on: vi.fn((evt: string, cb: Hover) => {
      if (evt === 'starHover') ecouteur = cb
      return off
    }),
  } as unknown as Scene
  return { scene, off, survol: (...a: Parameters<Hover>) => ecouteur?.(...a) }
}

function monter(scene: Scene | null = null) {
  const ref_ = ref<Scene | null>(scene)
  const wrapper = mount(StarTooltip, { global: { provide: { [SCENE_KEY as symbol]: ref_ } } })
  return { wrapper, ref_ }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(MAINTENANT)
  Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
})
afterEach(() => vi.useRealTimers())

test('la bulle montre la phrase en Inter Light 14 px et la ligne mono 10 px', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 300)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[data-role="phrase"]').text()).toBe('Je pense à toi depuis le quai')
  // jsdom does not load the component stylesheet: the typography is read from the source.
  const css = (await import('@/components/StarTooltip.vue?raw')).default
  const bloc = (sel: string) => new RegExp(`\\.${sel}\\s*\\{([^}]*)\\}`, 's').exec(css)?.[1] ?? ''
  const phrase = bloc('phrase')
  expect(phrase).toMatch(/font-family:\s*var\(--police-texte\)/)
  expect(phrase).toMatch(/font-weight:\s*300/)
  expect(phrase).toMatch(/font-size:\s*14px/)
  const mention = bloc('mention')
  expect(mention).toMatch(/font-family:\s*var\(--police-mono\)/)
  expect(mention).toMatch(/font-size:\s*10px/)
})

test('la ligne mono joint le prénom et l’âge relatif par « · »', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 300)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[data-role="mention"]').text()).toBe('Léa · il y a 3 jours')
})

test('sans prénom, la ligne mono ne montre que l’âge', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace({ prenom: undefined }), 300, 300)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[data-role="mention"]').text()).toBe('il y a 3 jours')
})

// Review Focus #5
test('près du bord droit, la bulle reste dans l’écran', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 300)
  await wrapper.vm.$nextTick()
  expect((wrapper.get('[data-role="bulle"]').element as HTMLElement).style.left).toBe('314px')
  survol(trace({ id: 'b' }), 950, 300)
  await wrapper.vm.$nextTick()
  // 1000 - 16 margin - 240 width
  expect((wrapper.get('[data-role="bulle"]').element as HTMLElement).style.left).toBe('744px')
})

test('sur un téléphone, une étoile au milieu ne fait déborder la bulle d’aucun côté', async () => {
  Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 187, 300)
  await wrapper.vm.$nextTick()
  const left = parseFloat((wrapper.get('[data-role="bulle"]').element as HTMLElement).style.left)
  expect(left).toBeGreaterThanOrEqual(16)
  expect(left + 240).toBeLessThanOrEqual(375 - 16)
})

test('près du bord gauche, la bulle garde sa marge', async () => {
  Object.defineProperty(window, 'innerWidth', { value: 300, configurable: true })
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 2, 300)
  await wrapper.vm.$nextTick()
  const left = parseFloat((wrapper.get('[data-role="bulle"]').element as HTMLElement).style.left)
  expect(left).toBeGreaterThanOrEqual(16)
  expect(left + 268).toBeLessThanOrEqual(300)
})

test('près du bord haut, la bulle passe au-dessous du point', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 300)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[data-role="bulle"]').attributes('data-sens')).toBe('dessus')
  survol(trace({ id: 'b' }), 300, 20)
  await wrapper.vm.$nextTick()
  const bulle = wrapper.get('[data-role="bulle"]')
  expect(bulle.attributes('data-sens')).toBe('dessous')
  expect((bulle.element as HTMLElement).style.top).toBe('34px')
})

test('la bulle disparaît quand starHover rend null', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 300)
  await wrapper.vm.$nextTick()
  expect(wrapper.find('[data-role="bulle"]').exists()).toBe(true)
  survol(null, 600, 600)
  await wrapper.vm.$nextTick()
  expect(wrapper.find('[data-role="bulle"]').exists()).toBe(false)
})

test('la bulle reste posée quand la même étoile est survolée de pixel en pixel', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 300)
  await wrapper.vm.$nextTick()
  const avant = wrapper.get('[data-role="bulle"]').element
  survol(trace(), 303, 301)
  await wrapper.vm.$nextTick()
  const apres = wrapper.get('[data-role="bulle"]')
  expect(apres.element).toBe(avant)
  expect((apres.element as HTMLElement).style.left).toBe('314px')
})

test('des null en rafale ne font rien quand aucune bulle n’est montrée', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(null, 1, 1)
  survol(null, 2, 2)
  await wrapper.vm.$nextTick()
  expect(wrapper.find('[data-role="bulle"]').exists()).toBe(false)
})

test('la scène arrive après le montage : la bulle s’y abonne alors, et s’en détache au démontage', async () => {
  const { scene, off } = fausseScene()
  const { wrapper, ref_ } = monter(null)
  expect(scene.on).not.toHaveBeenCalled()
  ref_.value = scene
  await wrapper.vm.$nextTick()
  expect(scene.on).toHaveBeenCalledWith('starHover', expect.any(Function))
  wrapper.unmount()
  expect(off).toHaveBeenCalled()
})

test('la bulle ne prend ni le pointeur ni l’attention des lecteurs d’écran', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 300)
  await wrapper.vm.$nextTick()
  // The hidden list carries the same sentences: the bubble would only repeat them.
  expect(wrapper.get('[data-role="bulle"]').attributes('aria-hidden')).toBe('true')
})

test('sous la frise, la bulle descend au lieu de traverser la navigation', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 200)
  await wrapper.vm.$nextTick()
  const bulle = wrapper.get('[data-role="bulle"]')
  expect(bulle.attributes('data-sens')).toBe('dessous')
  expect((bulle.element as HTMLElement).style.top).toBe('214px')
})

test('assez bas, la bulle repasse au-dessus du point', async () => {
  const { scene, survol } = fausseScene()
  const { wrapper } = monter(scene)
  survol(trace(), 300, 248)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[data-role="bulle"]').attributes('data-sens')).toBe('dessus')
})
