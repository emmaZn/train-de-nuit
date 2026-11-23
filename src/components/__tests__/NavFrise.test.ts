import { readFileSync } from 'node:fs'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { RouterLink, createMemoryHistory } from 'vue-router'
import NavFrise from '@/components/NavFrise.vue'
import { createAppRouter } from '@/router'
import { useVoyage } from '@/stores/voyage'
import { ANCRE_FRISE, ANCRE_FRISE_MOBILE, ecartFrise, garesVisibles } from '@/scene/layout'

async function monter() {
  setActivePinia(createPinia())
  const router = createAppRouter(createMemoryHistory())
  await router.push('/ici')
  await router.isReady()
  const voyage = useVoyage()
  const wrapper = mount(NavFrise, { global: { plugins: [router] } })
  return { wrapper, voyage, router }
}

test('la gare courante porte la mention À QUAI', async () => {
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="a-quai"]').text()).toContain('À QUAI')
})

test('la gare suivante porte la mention PROCHAIN ARRÊT', async () => {
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="prochain"]').text()).toContain('PROCHAIN ARRÊT')
})

test('la gare à quai est celle où l’on est', async () => {
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="a-quai"]').attributes('data-gare')).toBe('ici')
})

test('les gares déjà franchies sont marquées passées', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.finirEtape()
  await wrapper.vm.$nextTick()
  expect(wrapper.findAll('[data-etat="passee"]').length).toBeGreaterThan(0)
})

test('en route, aucune gare n’est à quai', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('la-haut')
  await wrapper.vm.$nextTick()
  expect(wrapper.find('[data-etat="a-quai"]').exists()).toBe(false)
})

test('en route, PROCHAIN ARRÊT désigne la cible, pas une gare traversée', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('ailleurs') // trois étapes : on traverse plus-loin et là-haut
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[data-etat="prochain"]').attributes('data-gare')).toBe('ailleurs')
})

test('la frise est une vraie navigation, au clavier comme à la souris', async () => {
  const { wrapper } = await monter()
  expect(wrapper.find('nav').exists()).toBe(true)
  expect(wrapper.findAllComponents(RouterLink).length).toBeGreaterThan(1)
})

// La frise suit le train pendant tout le trajet, au lieu de sauter d'un cran
// une fois arrivee.
test('la frise glisse en continu pendant le trajet', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.setProgression(0.5)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('.piste').attributes('style')).toContain('--legs: 0.5')
})

test('la frise avance avec la progression, sans a-coup', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  const positions: string[] = []
  for (const p of [0, 0.25, 0.5, 0.75]) {
    voyage.setProgression(p)
    await wrapper.vm.$nextTick()
    positions.push(wrapper.get('.piste').attributes('style') ?? '')
  }
  expect(new Set(positions).size).toBe(4)
})

test('a quai, la frise se pose sur un cran entier', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.finirEtape()
  await wrapper.vm.$nextTick()
  expect(wrapper.get('.piste').attributes('style')).toContain('--legs: 1')
})

test('le marqueur ne se deplace plus : c est la frise qui defile sous lui', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.setProgression(0.5)
  await wrapper.vm.$nextTick()
  expect(wrapper.html()).not.toContain('--avancee')
})

test('le marqueur n’apparaît qu’en route', async () => {
  const { wrapper } = await monter()
  expect(wrapper.find('[data-role="marqueur"]').exists()).toBe(false)
})

// Le branchement : la frise doit vraiment poser l'écartement calculé sur le DOM.
test('la frise étale ses gares sur la largeur de l’écran', async () => {
  window.innerWidth = 1280
  const { wrapper } = await monter()
  const style = wrapper.get('nav.frise').attributes('style') ?? ''
  expect(style).toContain(`--ecart: ${ecartFrise(1280, garesVisibles(1280))}px`)
  expect(style).toContain(`--ancre: ${ANCRE_FRISE}px`)
})

test('sur un téléphone, la frise se resserre et ne vise plus que deux gares', async () => {
  window.innerWidth = 390
  const { wrapper } = await monter()
  const style = wrapper.get('nav.frise').attributes('style') ?? ''
  expect(garesVisibles(390)).toBe(2)
  expect(style).toContain(`--ecart: ${ecartFrise(390, 2)}px`)
  expect(style).toContain(`--ancre: ${ANCRE_FRISE_MOBILE}px`)
  window.innerWidth = 1024
})

test('la frise suit un redimensionnement', async () => {
  window.innerWidth = 1280
  const { wrapper } = await monter()
  const avant = wrapper.get('nav.frise').attributes('style')
  window.innerWidth = 1920
  window.dispatchEvent(new Event('resize'))
  await wrapper.vm.$nextTick()
  expect(wrapper.get('nav.frise').attributes('style')).not.toBe(avant)
  window.innerWidth = 1024
})

/**
 * Décidé le 23 novembre 2026 : sous mouvement réduit la frise **glisse
 * encore**, mais trop vite pour qu'on y lise un voyage — 0,2 s au lieu de
 * 1,2 s. La couper net ferait perdre le lien entre la gare qu'on quitte et
 * celle où l'on arrive. Les trois transitions de la frise partent ensemble :
 * la piste qui glisse, les gares qui s'éteignent, le libellé qui grandit.
 */
test('en mouvement réduit, les trois transitions de la frise sont raccourcies ensemble', () => {
  const source = readFileSync('src/components/NavFrise.vue', 'utf8')
  const garde = source.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\n\}\n/)
  for (const regle of ['.piste', '.voie', '.libelle']) {
    expect(garde?.[0], regle).toContain(regle)
  }
  expect(garde?.[0]).toMatch(/transition-duration:\s*0\.2s/)
})

/**
 * Relevé au clavier le 23 novembre 2026, sur la page qui tourne : la frise
 * offrait **six arrêts pour quatre gares**. La fenêtre est plus large que la
 * boucle — six entrées, quatre gares — donc deux gares y figurent deux fois,
 * sous le même nom et vers la même adresse. À l'œil, c'est la boucle qui
 * continue des deux côtés ; au clavier et au lecteur d'écran, c'étaient deux
 * destinations fantômes.
 *
 * Les copies restent dessinées — sans elles, la frise aurait un bord — mais
 * elles sortent de la tabulation et de l'arbre d'accessibilité.
 */
test('la frise n’offre qu’un lien par gare, les copies restent décoratives', async () => {
  const { wrapper } = await monter()
  const liens = wrapper.findAll('a.gare')
  expect(liens).toHaveLength(6)

  const offerts = liens.filter((l) => l.attributes('aria-hidden') !== 'true')
  expect(offerts.map((l) => l.attributes('href'))).toEqual([
    '/ici',
    '/plus-loin',
    '/la-haut',
    '/ailleurs',
  ])

  // Un nœud `aria-hidden` qui garde un enfant focalisable est une faute : le
  // lecteur d'écran ne l'annonce pas, le clavier l'atteint quand même.
  for (const copie of liens.filter((l) => l.attributes('aria-hidden') === 'true')) {
    expect(copie.attributes('tabindex')).toBe('-1')
  }
})

test('la gare à quai reste offerte, même si c’est la page courante', async () => {
  const { wrapper } = await monter()
  const quai = wrapper.get('[data-etat="a-quai"]')
  expect(quai.attributes('aria-hidden')).toBeUndefined()
  expect(quai.attributes('tabindex')).toBeUndefined()
})
