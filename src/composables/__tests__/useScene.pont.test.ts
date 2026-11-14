import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useScene } from '@/composables/useScene'
import { useTraces } from '@/stores/traces'
import type { Trace } from '@/scene/types'

/**
 * Le pont entre le store et le ciel. La vraie scène a besoin de WebGL : on la
 * remplace par une doublure qui note ce qu'on lui dit.
 */
const double = vi.hoisted(() => ({
  instance: null as null | Record<string, ReturnType<typeof vi.fn>>,
}))

vi.mock('@/scene/Scene', () => ({
  Scene: class {
    setStars = vi.fn()
    setPointerPx = vi.fn()
    setPointer = vi.fn()
    setFond = vi.fn()
    setVoyage = vi.fn()
    setLegs = vi.fn()
    dispose = vi.fn()
    on = vi.fn(() => () => {})
    init = vi.fn(async () => {})
    constructor() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      double.instance = this as unknown as Record<string, ReturnType<typeof vi.fn>>
    }
  },
}))
vi.mock('firebase/firestore', () => ({}))
vi.mock('@/firebase', () => ({ db: {}, nouvelId: () => 'id' }))

const trace = (id: string): Trace => ({ id, phrase: 'une phrase', creeLe: 1, x: 0.5, y: 0.5 })

function monter(charger: () => Promise<void> = async () => {}) {
  setActivePinia(createPinia())
  const traces = useTraces()
  const spy = vi.spyOn(traces, 'charger').mockImplementation(charger)
  const Hote = defineComponent({
    setup() {
      const canvas = ref(document.createElement('canvas'))
      useScene(canvas)
      return () => h('div')
    },
  })
  const wrapper = mount(Hote)
  return { traces, spy, wrapper }
}

afterEach(() => {
  double.instance = null
})

test('useScene charge les traces au montage et les descend par setStars', async () => {
  const { traces, spy } = monter(async () => {
    traces.etoiles = [trace('a')]
  })
  await flushPromises()
  expect(spy).toHaveBeenCalledTimes(1)
  expect(double.instance!.setStars).toHaveBeenLastCalledWith([trace('a')])
})

test('une étoile ajoutée au store après coup redescend par setStars', async () => {
  const { traces } = monter()
  await flushPromises()
  traces.confirmer(trace('tardive'))
  await nextTick()
  expect(double.instance!.setStars).toHaveBeenLastCalledWith([trace('tardive')])
})

test('pointermove transmet les coordonnées en pixels à la scène', async () => {
  monter()
  await flushPromises()
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: 120, clientY: 80 }))
  expect(double.instance!.setPointerPx).toHaveBeenCalledWith(120, 80)
  expect(double.instance!.setPointer).toHaveBeenCalled()
})

test('pointerdown révèle l’étoile touchée et un appui ailleurs la referme', async () => {
  monter()
  await flushPromises()
  window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 20 }))
  window.dispatchEvent(new MouseEvent('pointerdown', { clientX: 300, clientY: 400 }))
  // Une seule voie : la scène répond par `starHover`, étoile ou `null`.
  expect(double.instance!.setPointerPx.mock.calls).toEqual([
    [10, 20],
    [300, 400],
  ])
})

test('un échec de chargement laisse la scène démarrer quand même', async () => {
  monter(async () => {
    throw new Error('hors ligne')
  })
  await flushPromises()
  expect(double.instance!.init).toHaveBeenCalled()
  expect(double.instance!.setVoyage).toHaveBeenCalled()
})

test('la nuit se pose au fil du fondu de la scène, et non d’un coup', async () => {
  // CONCEPT §6 : la couleur est animée en douceur, ~1 s. Côté scène c'est un
  // tween GSAP ; si Vue écrivait `--fond` d'un coup, la tache de nuit du
  // formulaire basculerait en une image sur l'ancienne nuit encore en train de
  // fondre — un rectangle de la nouvelle couleur par-dessus l'ancienne.
  monter()
  await flushPromises()
  const scene = double.instance!
  const abonnement = scene.on.mock.calls.find((c) => c[0] === 'fond')
  expect(abonnement, 'useScene doit suivre le fondu de la scène').toBeDefined()
  ;(abonnement![1] as (hex: string) => void)('#1a120b')
  expect(document.documentElement.style.getPropertyValue('--fond')).toBe('#1a120b')
})
