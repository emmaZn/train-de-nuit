import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, shallowRef } from 'vue'
import GareLaHaut from '@/components/gares/GareLaHaut.vue'
import { SCENE_KEY } from '@/composables/useScene'
import type { Scene } from '@/scene/Scene'
import { ECHELLE_MONTAGNES, regionCiel } from '@/scene/layout'
import { tirerPlace } from '@/scene/stars'
import type { Place } from '@/scene/stars'
import { useTraces } from '@/stores/traces'
import { useVoyage } from '@/stores/voyage'
import { loadMiennes } from '@/stores/traces-locales'

/**
 * Le formulaire de « là-haut », branché sur le vrai magasin : Firestore seul
 * est bouché. Les quatre chemins du réseau se jouent donc sur de vraies
 * écritures — nombre de `setDoc`, contenu du document, stockage local — et
 * non sur des promesses que le test se serait fabriquées.
 */

const m = vi.hoisted(() => {
  let n = 0
  return {
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    limit: vi.fn((v: number) => ({ limit: v })),
    where: vi.fn((...a: unknown[]) => ({ where: a })),
    orderBy: vi.fn((...a: unknown[]) => ({ orderBy: a })),
    query: vi.fn((...a: unknown[]) => ({ query: a })),
    collection: vi.fn((_db: unknown, nom: string) => ({ collection: nom })),
    doc: vi.fn((_db: unknown, nom: string, id: string) => ({ path: `${nom}/${id}` })),
    serverTimestamp: vi.fn(() => ({ __sentinel: 'serverTimestamp' })),
    // Un compteur, pas une constante : deux écritures se verraient à deux ids.
    nouvelId: vi.fn(() => `trace-${++n}`),
  }
})

vi.mock('firebase/firestore', () => m)
vi.mock('@/firebase', () => ({ db: {}, nouvelId: m.nouvelId }))
vi.mock('@/scene/stars', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/scene/stars')>()
  return { ...reel, tirerPlace: vi.fn(reel.tirerPlace) }
})

/** Le délai du §9, en dur : si le composant l'allonge, ces tests le disent. */
const DELAI = 10_000
/** Le §6.9 mot pour mot : jamais « ça n'est pas parti ». */
const MESSAGE = "on n'a pas pu confirmer"
/** Le délai du composant avant de remplir une région live fraîchement insérée. */
const DELAI_REGION = 120

type Differe = { promesse: Promise<void>; resoudre: () => void; rejeter: () => void }

function differer(): Differe {
  let resoudre!: () => void
  let rejeter!: () => void
  const promesse = new Promise<void>((ok, ko) => {
    resoudre = () => ok()
    rejeter = () => ko(new Error('offline'))
  })
  return { promesse, resoudre, rejeter }
}

type FaussePoignee = {
  land: ReturnType<typeof vi.fn>
  revert: ReturnType<typeof vi.fn>
  /** Joue la fin de l'animation : `land` et `revert` ne rendent la main qu'ici. */
  finir: () => void
}

/**
 * Une scène dont la poignée ne se règle qu'à la main. C'est ce qui rend
 * visible le seul ordre qui compte : `confirmer` après que `land` a rendu la
 * main, et non à l'appel de `land`.
 */
function fausseScene() {
  const poignees: FaussePoignee[] = []
  const beginDissolve = vi.fn((_phrase: string, _depuis: DOMRect, _place: Place) => {
    const { promesse, resoudre } = differer()
    const poignee: FaussePoignee = {
      land: vi.fn(() => promesse),
      revert: vi.fn(() => promesse),
      finir: resoudre,
    }
    poignees.push(poignee)
    return poignee
  })
  return { beginDissolve, poignees }
}

let ecriture: Differe

/** Ce qui est posé sur le document, et qu'il faut retirer quoi qu'il arrive. */
const attaches: Array<{ unmount: () => void }> = []

/**
 * `attache` branche le composant sur le document : jsdom n'applique
 * l'algorithme de soumission qu'à un formulaire connecté, et un clic sur le
 * bouton ne lèverait rien sur un arbre détaché. Le démontage est pris en
 * charge par l'`afterEach` : une assertion qui tombe ne laisse rien derrière.
 */
function monter(avecScene = true, attache = false) {
  const scene = fausseScene()
  const wrapper = mount(GareLaHaut, {
    ...(attache ? { attachTo: document.body } : {}),
    global: {
      provide: {
        [SCENE_KEY]: shallowRef(avecScene ? (scene as unknown as Scene) : null),
      },
    },
  })
  if (attache) attaches.push(wrapper)
  const champ = wrapper.get('[data-champ="phrase"]')
  const valeur = () => (champ.element as HTMLInputElement).value
  const ligne = () => wrapper.find('[data-role="dit"]')
  return { wrapper, scene, champ, valeur, ligne, traces: useTraces() }
}

/** Laisse passer les microtâches sans laisser filer le délai de dix secondes. */
async function souffler(): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await vi.advanceTimersByTimeAsync(0)
    await nextTick()
  }
}

async function passerLeDelai(): Promise<void> {
  await vi.advanceTimersByTimeAsync(DELAI)
  await nextTick()
}

/**
 * Le temps que la ligne se remplisse quand elle vient d'être insérée pleine
 * (remontage, retour à quai) : le composant attend un vrai tour de boucle pour
 * qu'une aide technique voie la région exister avant son texte.
 */
async function poserLaLigne(): Promise<void> {
  await vi.advanceTimersByTimeAsync(DELAI_REGION)
  await nextTick()
}

/** Le document tel qu'il part chez Firestore. */
function documentEcrit(appel = 0): Record<string, unknown> {
  return m.setDoc.mock.calls[appel][1] as Record<string, unknown>
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.useFakeTimers()
  setActivePinia(createPinia())
  m.getDocs.mockResolvedValue({ docs: [] })
  ecriture = differer()
  m.setDoc.mockReturnValue(ecriture.promesse)
})

afterEach(() => {
  // Démonté ici et pas en fin de test : une assertion qui tombe laisserait
  // sinon son DOM sur `document.body`, et le test suivant hériterait de deux
  // formulaires.
  while (attaches.length) attaches.pop()?.unmount()
  // Toute écriture laissée en l'air est réglée, sinon sa promesse survit au test.
  ecriture.resoudre()
  vi.useRealTimers()
})

/* ---- La copie du §4.3 ---- */

test('le formulaire porte les libellés et placeholders exacts du §4.3', () => {
  const { wrapper, champ } = monter()
  expect(wrapper.get('h2').text()).toBe('Laisser une trace ?')
  expect(champ.attributes('placeholder')).toBe('une phrase, un mot, une pensée…')
  expect(wrapper.get('[data-champ="prenom"]').attributes('placeholder')).toBe(
    'un prénom, si vous voulez',
  )
  expect(wrapper.get('.meta').text()).toContain('laisser ↵')
})

test('le compteur affiche 0 / 80 au départ', () => {
  const { wrapper } = monter()
  expect(wrapper.get('[data-role="compteur"]').text()).toBe('0 / 80')
})

/* ---- Review Focus #3 : on compte comme les règles ---- */

test('le compteur compte en points de code : un emoji compte pour 1', async () => {
  const { wrapper, champ } = monter()
  // Une étoile filante pèse deux unités UTF-16 : `length` en dirait deux.
  await champ.setValue('🌠')
  expect(wrapper.get('[data-role="compteur"]').text()).toBe('1 / 80')
  await champ.setValue('élan 🌠')
  expect(wrapper.get('[data-role="compteur"]').text()).toBe('6 / 80')
})

test('au-delà de 80 points de code, la saisie est bornée et laisser ↵ refuse', async () => {
  const { wrapper, champ, valeur } = monter()
  await champ.setValue('🌠'.repeat(85))
  expect([...valeur()].length).toBe(80)
  expect(wrapper.get('[data-role="compteur"]').text()).toBe('80 / 80')

  // Le champ est plein : le point de code suivant ne change pas le modèle, donc
  // Vue ne repose rien. C'est là que le surplus reste à l'écran s'il n'est pas
  // réécrit à la main.
  await champ.setValue(`${'🌠'.repeat(80)}🌠`)
  expect([...valeur()].length).toBe(80)
  expect(wrapper.get('[data-role="compteur"]').text()).toBe('80 / 80')

  await champ.trigger('keydown.enter')
  // Le surplus n'est jamais parti : la base refuserait 81 points de code.
  expect([...(documentEcrit().phrase as string)].length).toBe(80)
})

test('le prénom est borné aux 24 points de code que les règles acceptent', async () => {
  const { wrapper, champ } = monter()
  const prenom = wrapper.get('[data-champ="prenom"]')
  await prenom.setValue('🌠'.repeat(30))
  expect([...(prenom.element as HTMLInputElement).value].length).toBe(24)

  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  expect([...(documentEcrit().prenom as string)].length).toBe(24)
})

test('une phrase faite d’espaces n’est pas envoyable', async () => {
  const { champ, scene } = monter()
  await champ.setValue('    ')
  await champ.trigger('keydown.enter')
  expect(m.setDoc).not.toHaveBeenCalled()
  expect(scene.beginDissolve).not.toHaveBeenCalled()
})

/* ---- Review Focus #1 : deux appuis, une seule trace ---- */

test('Entrée pressée deux fois n’écrit qu’une seule trace', async () => {
  const { champ } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  await champ.trigger('keydown.enter')
  await souffler()
  expect(m.setDoc).toHaveBeenCalledTimes(1)
  expect(m.nouvelId).toHaveBeenCalledTimes(1)
})

test('Entrée pendant l’animation ne relance pas la dissolution', async () => {
  const { champ, scene } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  ecriture.resoudre()
  await souffler()
  // La montée dure encore : `land` n'a pas rendu la main.
  await champ.trigger('keydown.enter')
  await souffler()
  expect(scene.beginDissolve).toHaveBeenCalledTimes(1)
  expect(m.setDoc).toHaveBeenCalledTimes(1)
})

/* ---- Le branchement : la place, et la police ---- */

test('la place tirée part dans le document et dans la dissolution, à l’identique', async () => {
  const { champ, scene } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  const doc = documentEcrit()
  expect(scene.beginDissolve.mock.calls[0][0]).toBe('une phrase')
  expect(scene.beginDissolve.mock.calls[0][2]).toEqual({ x: doc.x, y: doc.y })
})

test('la place se tire dans le rapport de la bande de ciel, pas dans le carré', async () => {
  window.innerWidth = 1280
  window.innerHeight = 800
  const { champ } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  const appel = vi.mocked(tirerPlace).mock.calls[0]
  // Le quatrième argument : sans lui, 17 px de haut pèsent autant que 72 de large.
  expect(appel[3]).toBe(1280 / regionCiel(640, 1280, 800, ECHELLE_MONTAGNES, 0).height)
  expect(appel[3]).toBeGreaterThan(1)
})

test('le champ phrase porte exactement la police que la dissolution rastérise', () => {
  const gare = readFileSync('src/components/gares/GareLaHaut.vue', 'utf8')
  const dissolve = readFileSync('src/scene/Dissolve.ts', 'utf8')
  const base = readFileSync('src/styles/base.css', 'utf8')
  const police = dissolve.match(/const POLICE = "([^"]+)"/)?.[1]
  const famille = base.match(/--police-texte:\s*([^;]+);/)?.[1].trim()
  const champ = gare.match(/\.phrase\s*\{[^}]*font:\s*([^;]+);/)?.[1].trim()
  // Un grain tombe là où la lettre était : les deux polices ne peuvent pas diverger.
  expect(champ).toBe('300 17px var(--police-texte)')
  expect(police).toBe(`300 17px ${famille}`)
})

/* ---- Review Focus #2 : les quatre chemins du réseau ---- */

test('succès : la dissolution part avant la réponse, puis l’étoile se pose et le champ se vide', async () => {
  const { champ, scene, valeur, traces } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')

  // 1. L'écran n'attend pas le réseau : la phrase se défait tout de suite.
  expect(scene.beginDissolve).toHaveBeenCalledTimes(1)
  expect(m.setDoc).toHaveBeenCalledTimes(1)
  expect(traces.etoiles).toEqual([])

  // 2. L'écriture aboutit : la montée commence, l'étoile n'est pas encore posée.
  ecriture.resoudre()
  await souffler()
  expect(scene.poignees[0].land).toHaveBeenCalledTimes(1)
  expect(traces.etoiles).toEqual([])
  expect(loadMiennes()).toEqual([])
  expect(valeur()).toBe('une phrase')

  // 3. Le grain se pose : alors seulement l'étoile est au visiteur.
  scene.poignees[0].finir()
  await souffler()
  expect(traces.etoiles.map((e) => e.phrase)).toEqual(['une phrase'])
  expect(loadMiennes()).toHaveLength(1)
  expect(valeur()).toBe('')
})

test('échec : les grains se reforment, le champ garde le texte, une ligne mono s’affiche', async () => {
  const { champ, scene, valeur, ligne, traces } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  ecriture.rejeter()
  await souffler()

  expect(scene.poignees[0].revert).toHaveBeenCalledTimes(1)
  expect(scene.poignees[0].land).not.toHaveBeenCalled()
  expect(valeur()).toBe('une phrase')
  expect(ligne().text()).toBe(MESSAGE)
  expect(traces.etoiles).toEqual([])
  expect(loadMiennes()).toEqual([])
})

test('après un échec, un second Entrée repart sur un document neuf', async () => {
  const { champ, scene, traces } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  ecriture.rejeter()
  await souffler()

  // Rien n'a été écrit : se rattacher à une promesse déjà rompue figerait le
  // formulaire, et le visiteur ne pourrait plus rien laisser.
  ecriture = differer()
  m.setDoc.mockReturnValue(ecriture.promesse)
  await champ.trigger('keydown.enter')
  await souffler()
  expect(m.setDoc).toHaveBeenCalledTimes(2)
  expect(m.nouvelId).toHaveBeenCalledTimes(2)

  ecriture.resoudre()
  await souffler()
  scene.poignees[1].finir()
  await souffler()
  expect(traces.etoiles).toHaveLength(1)
})

test('délai dépassé : la ligne dit « on n’a pas pu confirmer », le texte reste dans le champ', async () => {
  const { champ, scene, valeur, ligne, traces } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  await passerLeDelai()

  expect(scene.poignees[0].revert).toHaveBeenCalledTimes(1)
  expect(ligne().text()).toBe("on n'a pas pu confirmer")
  // Jamais « ça n'est pas parti » : l'écriture, elle, continue.
  expect(ligne().text()).not.toContain('parti')
  expect(valeur()).toBe('une phrase')
  expect(traces.etoiles).toEqual([])
  expect(loadMiennes()).toEqual([])
})

test('succès tardif après le délai : l’étoile se pose, le champ se vide, rien n’est écrit deux fois', async () => {
  const { champ, scene, valeur, ligne, traces } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  await passerLeDelai()

  ecriture.resoudre()
  await souffler()

  // Plus de phrase à l'écran : l'étoile se pose sans dissolution.
  expect(scene.beginDissolve).toHaveBeenCalledTimes(1)
  expect(scene.poignees[0].land).not.toHaveBeenCalled()
  expect(traces.etoiles.map((e) => e.phrase)).toEqual(['une phrase'])
  expect(loadMiennes()).toHaveLength(1)
  expect(valeur()).toBe('')
  // La ligne est toujours dans le DOM (région live) : c'est son texte qui part.
  expect(ligne().text()).toBe('')
  expect(m.setDoc).toHaveBeenCalledTimes(1)
  expect(m.nouvelId).toHaveBeenCalledTimes(1)
})

test('après le délai, un second Entrée n’écrit aucun second document', async () => {
  const { champ, scene, traces } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  await passerLeDelai()

  await champ.trigger('keydown.enter')
  await souffler()
  // La phrase se défait de nouveau, mais sur le même document et la même place.
  expect(m.setDoc).toHaveBeenCalledTimes(1)
  expect(m.nouvelId).toHaveBeenCalledTimes(1)
  expect(scene.beginDissolve).toHaveBeenCalledTimes(2)
  expect(scene.beginDissolve.mock.calls[1][2]).toEqual(scene.beginDissolve.mock.calls[0][2])

  // Et c'est la seconde poignée qui conclut l'écriture.
  ecriture.resoudre()
  await souffler()
  expect(scene.poignees[1].land).toHaveBeenCalledTimes(1)
  expect(traces.etoiles).toEqual([])
  scene.poignees[1].finir()
  await souffler()
  expect(traces.etoiles).toHaveLength(1)
  expect(m.setDoc).toHaveBeenCalledTimes(1)
})

test('aucun des quatre chemins n’écrit dans le stockage local sans confirmation', async () => {
  // 1. Succès, avant que le grain se pose.
  {
    const { champ, traces } = monter()
    await champ.setValue('une phrase')
    await champ.trigger('keydown.enter')
    ecriture.resoudre()
    await souffler()
    expect(loadMiennes()).toEqual([])
    expect(traces.etoiles).toEqual([])
  }
  // 2. Échec immédiat.
  {
    ecriture = differer()
    m.setDoc.mockReturnValue(ecriture.promesse)
    setActivePinia(createPinia())
    const { champ } = monter()
    await champ.setValue('une phrase')
    await champ.trigger('keydown.enter')
    ecriture.rejeter()
    await souffler()
    expect(loadMiennes()).toEqual([])
  }
  // 3. Délai dépassé, sans suite.
  {
    ecriture = differer()
    m.setDoc.mockReturnValue(ecriture.promesse)
    setActivePinia(createPinia())
    const { champ } = monter()
    await champ.setValue('une phrase')
    await champ.trigger('keydown.enter')
    await passerLeDelai()
    expect(loadMiennes()).toEqual([])
  }
  // 4. Délai dépassé, puis l'écriture qui traîne encore.
  {
    ecriture = differer()
    m.setDoc.mockReturnValue(ecriture.promesse)
    setActivePinia(createPinia())
    const { champ } = monter()
    await champ.setValue('une phrase')
    await champ.trigger('keydown.enter')
    await passerLeDelai()
    await souffler()
    expect(loadMiennes()).toEqual([])
  }
})

/* ---- Les bords ---- */

test('sans scène, la phrase part et l’étoile se pose quand même', async () => {
  const { champ, valeur, traces } = monter(false)
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  ecriture.resoudre()
  await souffler()
  expect(traces.etoiles.map((e) => e.phrase)).toEqual(['une phrase'])
  expect(loadMiennes()).toHaveLength(1)
  expect(valeur()).toBe('')
})

test('la gare démontée conclut sa dissolution au lieu d’abandonner ses grains', async () => {
  const { wrapper, champ, scene } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  wrapper.unmount()
  expect(scene.poignees[0].revert).toHaveBeenCalledTimes(1)
})

test('la gare démontée n’abandonne pas son minuteur', async () => {
  const { wrapper, champ } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  expect(vi.getTimerCount()).toBe(1)
  // Un minuteur orphelin écrirait dans des références mortes, sans rien dire.
  wrapper.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

/* ---- Le texte montré est le texte enregistré ---- */

test('tant que l’écriture n’est pas réglée, les deux champs sont en lecture seule', async () => {
  const { wrapper, champ } = monter()
  const prenom = wrapper.get('[data-champ="prenom"]')
  await champ.setValue('une phrase')
  expect(champ.attributes('readonly')).toBeUndefined()

  await champ.trigger('keydown.enter')
  expect(champ.attributes('readonly')).toBeDefined()
  expect(prenom.attributes('readonly')).toBeDefined()

  // Le délai ne règle rien : l'écriture court toujours, et un texte corrigé
  // ici ne partirait jamais — c'est `envoi.trace.phrase` qui se redéfait.
  await passerLeDelai()
  expect(champ.attributes('readonly')).toBeDefined()
  expect(prenom.attributes('readonly')).toBeDefined()

  ecriture.resoudre()
  await souffler()
  expect(champ.attributes('readonly')).toBeUndefined()
  expect(prenom.attributes('readonly')).toBeUndefined()
})

test('pendant la montée du grain, les deux champs restent verrouillés', async () => {
  const { wrapper, champ, scene } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  ecriture.resoudre()
  await souffler()

  // L'écriture est acceptée, mais le champ ne se videra qu'au bout de la
  // montée : entre les deux, il serait modifiable pour rien.
  expect(champ.attributes('readonly')).toBeDefined()
  expect(wrapper.get('[data-champ="prenom"]').attributes('readonly')).toBeDefined()

  scene.poignees[0].finir()
  await souffler()
  expect(champ.attributes('readonly')).toBeUndefined()
})

test('un échec rend aussitôt les deux champs au visiteur', async () => {
  const { wrapper, champ } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  ecriture.rejeter()
  await souffler()
  expect(champ.attributes('readonly')).toBeUndefined()
  expect(wrapper.get('[data-champ="prenom"]').attributes('readonly')).toBeUndefined()
})

test('Entrée rend la main au clavier, mais seulement une fois le champ mesuré', async () => {
  const { champ } = monter()
  const el = champ.element as HTMLInputElement
  const mesure = vi.spyOn(el, 'getBoundingClientRect')
  const rendre = vi.spyOn(el, 'blur')
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')

  expect(rendre).toHaveBeenCalledTimes(1)
  // Sur un téléphone, le clavier qui se referme redimensionne la fenêtre :
  // mesurer après coup prendrait le champ déjà déplacé.
  expect(mesure.mock.invocationCallOrder[0]).toBeLessThan(rendre.mock.invocationCallOrder[0])
})

/* ---- « laisser ↵ » est un vrai bouton : au doigt comme au clavier ---- */

test('le doigt peut laisser une trace sans clavier', async () => {
  const { wrapper, champ, scene } = monter(true, true)
  const bouton = wrapper.get('[data-role="laisser"]')
  expect(bouton.element.tagName).toBe('BUTTON')
  expect(bouton.text()).toBe('laisser ↵')

  await champ.setValue('une phrase')
  await bouton.trigger('click')
  expect(m.setDoc).toHaveBeenCalledTimes(1)
  expect(scene.beginDissolve).toHaveBeenCalledTimes(1)
})

test('après le délai, le bouton rattache l’envoi en cours au lieu d’en écrire un second', async () => {
  const { wrapper, champ, scene, traces } = monter(true, true)
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  await passerLeDelai()

  // Le champ est en lecture seule et sans le focus : sur un téléphone, le
  // clavier ne remonte pas. Sans ce bouton, plus aucun geste n'est possible.
  expect(champ.attributes('readonly')).toBeDefined()
  await wrapper.get('[data-role="laisser"]').trigger('click')
  expect(m.setDoc).toHaveBeenCalledTimes(1)
  expect(scene.beginDissolve).toHaveBeenCalledTimes(2)

  ecriture.resoudre()
  await souffler()
  scene.poignees[1].finir()
  await souffler()
  expect(traces.etoiles).toHaveLength(1)
})

/* ---- L’écriture survit au formulaire ---- */

test('le formulaire remonté reprend l’envoi en cours au lieu d’en écrire un second', async () => {
  const premier = monter()
  await premier.champ.setValue('une phrase')
  await premier.champ.trigger('keydown.enter')
  await passerLeDelai()
  // Le visiteur quitte « là-haut » pendant que l'écriture vole.
  premier.wrapper.unmount()

  const second = monter()
  await souffler()
  // Il revient : la phrase est là, et le champ est toujours verrouillé — c'est
  // cette écriture-là qui court, et c'est elle qu'on redéfera.
  expect(second.valeur()).toBe('une phrase')
  expect(second.champ.attributes('readonly')).toBeDefined()

  // Il la retape et renvoie : les règles interdisent l'`update`, un second
  // identifiant laisserait un doublon à modérer.
  await second.champ.setValue('une phrase')
  await second.champ.trigger('keydown.enter')
  await souffler()
  expect(m.setDoc).toHaveBeenCalledTimes(1)
  expect(m.nouvelId).toHaveBeenCalledTimes(1)
})

test('un refus arrivé après le démontage se dit au formulaire suivant', async () => {
  const premier = monter()
  await premier.champ.setValue('une phrase')
  await premier.champ.trigger('keydown.enter')
  premier.wrapper.unmount()

  // Refusée alors que plus personne n'est à l'écran.
  ecriture.rejeter()
  await souffler()

  const second = monter()
  await souffler()
  expect(second.valeur()).toBe('une phrase')
  // La région est insérée muette, puis remplie : une aide technique doit la
  // voir exister avant que son texte arrive.
  expect(second.ligne().text()).toBe('')
  await poserLaLigne()
  expect(second.ligne().text()).toBe(MESSAGE)
  expect(second.champ.attributes('readonly')).toBeUndefined()
  expect(second.traces.etoiles).toEqual([])
  expect(loadMiennes()).toEqual([])
})

test('un succès arrivé après le démontage allume quand même l’étoile', async () => {
  const { wrapper, champ, traces } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  wrapper.unmount()

  // Sans formulaire à l'écran, il n'y a pas de grain à faire monter : l'étoile
  // s'allume tout de suite, et c'est bien une écriture confirmée.
  ecriture.resoudre()
  await souffler()
  expect(traces.etoiles.map((e) => e.phrase)).toEqual(['une phrase'])
  expect(loadMiennes()).toHaveLength(1)
})

/* ---- Rien ne se perd en silence ---- */

test('le champ plein refuse la lettre tapée au milieu, au lieu de couper la fin', async () => {
  const { champ, valeur } = monter()
  const plein = `${'a'.repeat(79)}z`
  await champ.setValue(plein)
  expect(valeur()).toBe(plein)

  // Le visiteur pose le curseur au milieu et tape une lettre de plus.
  const el = champ.element as HTMLInputElement
  el.value = `${'a'.repeat(40)}X${'a'.repeat(39)}z`
  el.setSelectionRange(41, 41)
  await champ.trigger('input')

  // Couper par la fin aurait mangé le « z » — pas le « X » qu'on vient de
  // taper — et renvoyé le curseur au bout, sans rien dire.
  expect(valeur()).toBe(plein)
  expect(el.selectionStart).toBe(40)
})

test('dans une suite de lettres identiques, le curseur ne saute pas non plus à la fin', async () => {
  const { champ, valeur } = monter()
  // Quatre-vingts fois la même lettre : rien ne distingue l'endroit de la
  // saisie, et une comparaison gourmande par le début croirait que le visiteur
  // tapait au bout.
  const plein = 'a'.repeat(80)
  await champ.setValue(plein)

  const el = champ.element as HTMLInputElement
  el.value = 'a'.repeat(81)
  el.setSelectionRange(41, 41)
  await champ.trigger('input')

  expect(valeur()).toBe(plein)
  expect(el.selectionStart).toBe(40)
})

test('un collage qui déborde est rogné sur lui-même, pas sur la fin de la phrase', async () => {
  const { champ, valeur } = monter()
  // 79 points de code : il reste une place, et le visiteur en colle deux.
  const presquePlein = `${'a'.repeat(78)}z`
  await champ.setValue(presquePlein)

  const el = champ.element as HTMLInputElement
  el.value = `${'a'.repeat(40)}XY${'a'.repeat(38)}z`
  el.setSelectionRange(42, 42)
  await champ.trigger('input')

  // Le « X » entre, le « Y » reste dehors, et le « z » de la fin ne bouge pas.
  expect(valeur()).toBe(`${'a'.repeat(40)}X${'a'.repeat(38)}z`)
  expect([...valeur()].length).toBe(80)
  expect(el.selectionStart).toBe(41)
})

test('la ligne qui dit le souci est en place avant d’avoir quelque chose à dire', async () => {
  const { champ, ligne } = monter()
  expect(ligne().exists()).toBe(true)
  expect(ligne().attributes('aria-live')).toBe('polite')
  expect(ligne().text()).toBe('')
  const region = ligne().element

  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  ecriture.rejeter()
  await souffler()

  // Le même élément, rempli après coup : une région live insérée en même temps
  // que son texte n'est souvent pas annoncée, et c'est le seul canal par lequel
  // un lecteur d'écran apprend qu'une phrase n'a pas pu être confirmée.
  expect(ligne().element).toBe(region)
  expect(ligne().text()).toBe(MESSAGE)
})

test('la ligne réinsérée au retour à quai arrive muette, puis se remplit', async () => {
  const { wrapper, champ, ligne } = monter()
  await champ.setValue('une phrase')
  await champ.trigger('keydown.enter')
  ecriture.rejeter()
  await souffler()
  expect(ligne().text()).toBe(MESSAGE)

  // Le train repart : le formulaire — et sa région live avec lui — quitte le
  // DOM, puisque le `<p>` vit sous le `v-if` du formulaire.
  const voyage = useVoyage()
  voyage.partirVers('ailleurs')
  await nextTick()
  expect(wrapper.find('[data-role="dit"]').exists()).toBe(false)

  // Et revient à quai : la région est réinsérée vide, puis remplie.
  while (voyage.enRoute) voyage.finirEtape()
  await souffler()
  expect(ligne().exists()).toBe(true)
  // Aucun nombre de microtâches ne la remplit — `nextTick` se règle dans la
  // tâche qui insère, et l'arbre d'accessibilité se construit après elle.
  expect(ligne().text()).toBe('')
  await poserLaLigne()
  expect(ligne().text()).toBe(MESSAGE)
})

/* ---- La gare n’est à l’écran qu’une fois le train à quai ---- */

test('en route, le formulaire n’est pas à l’écran', async () => {
  const { wrapper } = monter()
  useVoyage().partirVers('ailleurs')
  await nextTick()
  expect(wrapper.find('[data-champ="phrase"]').exists()).toBe(false)
})
