import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createMemoryHistory } from 'vue-router'
import { useScene } from '@/composables/useScene'
import { createAppRouter } from '@/router'
import { cadrageScene } from '@/scene/layout'
import { HORLOGE } from '@/scene/quai'
import { useTraces } from '@/stores/traces'
import { useVoyage } from '@/stores/voyage'
import { COULEURS } from '@/scene/palette'
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
    clicPx = vi.fn(() => false)
    setPointer = vi.fn()
    setMode = vi.fn()
    setVoyage = vi.fn()
    setGare = vi.fn()
    setLegs = vi.fn()
    dispose = vi.fn()
    on = vi.fn(() => () => {})
    init = vi.fn(async () => {})
    pret = Promise.resolve()
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
  let rideau: ReturnType<typeof useScene>['rideau']
  const Hote = defineComponent({
    setup() {
      const canvas = ref(document.createElement('canvas'))
      rideau = useScene(canvas).rideau
      return () => h('div')
    },
  })
  // Le routeur, comme `App.vue` le pose : `useScene` demande la route pour
  // savoir si le CV est ouvert, et sans routeur `useRoute()` ne rend rien.
  const router = createAppRouter(createMemoryHistory())
  const wrapper = mount(Hote, { global: { plugins: [router] } })
  return { traces, spy, wrapper, router, rideau: rideau! }
}

/** Le cas d'un navigateur qui ne pose pas de canevas : il n'y aura pas de scène. */
function monterSansCanevas() {
  setActivePinia(createPinia())
  vi.spyOn(useTraces(), 'charger').mockImplementation(async () => {})
  const Hote = defineComponent({
    setup() {
      useScene(ref(null))
      return () => h('div')
    },
  })
  const router = createAppRouter(createMemoryHistory())
  return mount(Hote, { global: { plugins: [router] } })
}

afterEach(() => {
  // Un test de cette suite remplace `Storage.prototype.setItem` : sans cette
  // ligne, la doublure survivait aux suivants et leur rendait un stockage mort.
  vi.restoreAllMocks()
  double.instance = null
  // `remettreEcran` repose un écran : sans ce nettoyage il survit au test
  // suivant, dont le `retirerEcran` le retrouve.
  document.querySelector('#chargement')?.remove()
  const racine = document.documentElement
  delete racine.dataset.mode
  for (const token of ['--fond', '--texte', '--trait']) racine.style.removeProperty(token)
  try {
    localStorage.clear()
  } catch {
    /* indisponible : rien à nettoyer */
  }
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

/**
 * **Le CV ouvert, l'appui ne traverse pas.**
 *
 * `CvLigne` est `position: fixed; inset: 0; z-index: 20` et vit **hors** des
 * deux `.dessous` : tant qu'il est ouvert, chaque `pointerdown` le vise, et le
 * chemin de l'événement ne passe plus par `.panneau` — dont le `stopPropagation`
 * est la seule chose qui ferme encore cette route depuis que `clicPx` a perdu sa
 * garde de couverture. Sans cette garde-ci, un appui au milieu du CV tombait sur
 * l'horloge (que la tâche 1 a mise au centre de la scène, donc de la fenêtre) et
 * baissait le panneau derrière le voile ; un peu à droite, il éteignait la lampe.
 *
 * La garde est ici et non dans `Scene` : la scène ne connaît pas les routes.
 * C'est la forme de `PanneauDeparts.surEchap`.
 */
test('le CV ouvert, un appui ne descend pas jusqu’à la scène', async () => {
  const { router } = monter()
  await flushPromises()
  // L'horloge, en pixels d'écran : le point que le visiteur a sous le pouce.
  const { frame } = cadrageScene(window.innerWidth, window.innerHeight)
  const px = frame.offsetX + HORLOGE.x * frame.scale
  const py = frame.offsetY + HORLOGE.y * frame.scale

  window.dispatchEvent(new MouseEvent('pointerdown', { clientX: px, clientY: py }))
  expect(double.instance!.clicPx).toHaveBeenCalledTimes(1)

  await router.push('/ailleurs/cv')
  await nextTick()
  window.dispatchEvent(new MouseEvent('pointerdown', { clientX: px, clientY: py }))
  expect(double.instance!.clicPx).toHaveBeenCalledTimes(1)
  // Et la bulle d'une étoile ne se ferme pas non plus : rien ne descend.
  expect(double.instance!.setPointerPx).toHaveBeenCalledTimes(1)

  // Le CV refermé, la route reprend.
  await router.push('/ailleurs')
  await nextTick()
  window.dispatchEvent(new MouseEvent('pointerdown', { clientX: px, clientY: py }))
  expect(double.instance!.clicPx).toHaveBeenCalledTimes(2)
})

test('un échec de chargement laisse la scène démarrer quand même', async () => {
  monter(async () => {
    throw new Error('hors ligne')
  })
  await flushPromises()
  expect(double.instance!.init).toHaveBeenCalled()
  expect(double.instance!.setVoyage).toHaveBeenCalled()
})

test('le mode se pose sur la racine quand la scène le dit', async () => {
  // Les trois tokens, et `data-mode` que lit le CSS : c'est le pont qui les
  // écrit, parce que la scène ne connaît pas le DOM.
  monter()
  await flushPromises()
  const scene = double.instance!
  const abonnement = scene.on.mock.calls.find((c) => c[0] === 'mode')
  expect(abonnement, 'useScene doit suivre le mode de la scène').toBeDefined()
  ;(abonnement![1] as (mode: string) => void)('jour')
  const racine = document.documentElement
  expect(racine.dataset.mode).toBe('jour')
  expect(racine.style.getPropertyValue('--fond')).toBe(COULEURS.jour.fond)
  expect(racine.style.getPropertyValue('--texte')).toBe(COULEURS.jour.texte)
  expect(racine.style.getPropertyValue('--trait')).toBe(COULEURS.jour.trait)
})

// Review Focus #3 : sans canevas il n'y a jamais de scène, et pourtant la page
// doit porter les couleurs du mode retenu.
test('pose les couleurs du mode même sans canevas', async () => {
  localStorage.setItem('train-de-nuit:mode', 'jour')
  monterSansCanevas()
  await flushPromises()
  const racine = document.documentElement
  expect(racine.dataset.mode).toBe('jour')
  expect(racine.style.getPropertyValue('--fond')).toBe(COULEURS.jour.fond)
  expect(racine.style.getPropertyValue('--trait')).toBe(COULEURS.jour.trait)
})

test('un clic qui touche un oiseau n’ouvre pas aussi la bulle d’une étoile', async () => {
  await monter()
  const scene = double.instance!
  scene.clicPx.mockReturnValue(true)
  window.dispatchEvent(new PointerEvent('pointerdown', { clientX: 12, clientY: 34 }))
  await nextTick()
  expect(scene.clicPx).toHaveBeenCalledWith(12, 34)
  expect(scene.setPointerPx).not.toHaveBeenCalled()
})

test('dit à la scène quelle gare le train vient de quitter', async () => {
  await monter()
  const scene = double.instance!
  expect(scene.setGare).toHaveBeenCalledWith('ici')
  useVoyage().gare = 'plus-loin'
  await nextTick()
  expect(scene.setGare).toHaveBeenLastCalledWith('plus-loin')
})

test('le rideau est inconnu tant que la scène n’a rien émis, puis suit ce qu’elle émet', async () => {
  const { rideau } = monter()
  await flushPromises()
  expect(rideau.value).toBeNull()

  const abonnement = double.instance!.on.mock.calls.find((c) => c[0] === 'rideau')
  expect(abonnement, 'useScene doit suivre le rideau de la scène').toBeDefined()
  const emettre = abonnement![1] as (y: number, baisse: boolean) => void
  emettre(-120, false)
  expect(rideau.value).toEqual({ y: -120, baisse: false })
  emettre(340, true)
  expect(rideau.value).toEqual({ y: 340, baisse: true })
})

/**
 * La bascule de mode : on écrit le choix, l'écran d'attente remonte, et la page
 * recharge. Elle recharge parce qu'un fondu d'une seconde entre la nuit et le
 * papier passerait par un gris plat plein écran — et parce que les deux modes
 * n'ont pas le même jeu d'images du train, qu'il vaut mieux demander d'emblée.
 */
describe('la bascule de mode', () => {
  function monterAvecRecharge() {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    })
    setActivePinia(createPinia())
    vi.spyOn(useTraces(), 'charger').mockImplementation(async () => {})
    let basculer: (m: 'nuit' | 'jour') => void
    const Hote = defineComponent({
      setup() {
        basculer = useScene(ref(document.createElement('canvas'))).basculerMode
        return () => h('div')
      },
    })
    const router = createAppRouter(createMemoryHistory())
    mount(Hote, { global: { plugins: [router] } })
    return { reload, basculer: basculer! }
  }

  test('écrit le mode, puis recharge', async () => {
    const { reload, basculer } = monterAvecRecharge()
    await flushPromises()
    await basculer('jour')
    expect(localStorage.getItem('train-de-nuit:mode')).toBe('jour')
    expect(reload).toHaveBeenCalledOnce()
  })

  // Review Focus #1 : stockage bloqué. Le mode n'est pas retenu, mais la page
  // recharge quand même — sinon le clic ne fait rien du tout.
  test('recharge même si le stockage lève', async () => {
    const { reload, basculer } = monterAvecRecharge()
    await flushPromises()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceeded')
    })
    await basculer('jour')
    expect(reload).toHaveBeenCalledOnce()
  })

  // L'écran qui remonte doit être de la couleur où l'on va, pas de celle d'où
  // l'on vient : sinon le rechargement coupe d'une couleur à l'autre.
  // Entrée maintenue sur l'œil : le clic part plusieurs fois avant que l'écran
  // d'attente ne couvre le bouton. Une seule bascule doit aboutir.
  test('ne recharge qu’une fois même si on bascule deux fois de suite', async () => {
    const { reload, basculer } = monterAvecRecharge()
    await flushPromises()
    await Promise.all([basculer('jour'), basculer('nuit')])
    expect(reload).toHaveBeenCalledOnce()
    expect(localStorage.getItem('train-de-nuit:mode')).toBe('jour')
  })

  test('remonte l’écran dans la couleur du mode visé', async () => {
    const { basculer } = monterAvecRecharge()
    await flushPromises()
    await basculer('jour')
    expect(document.documentElement.style.getPropertyValue('--nuit-attente')).toBe(
      COULEURS.jour.fond,
    )
  })
})
