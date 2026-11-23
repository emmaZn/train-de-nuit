import { readFileSync } from 'node:fs'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { defineComponent, h } from 'vue'
import { RouterView } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import App from '@/App.vue'

import CvLigne from '@/components/CvLigne.vue'
import GareAilleurs from '@/components/gares/GareAilleurs.vue'
import { HORS_DE_LA_VOIE, PARCOURS } from '@/contenu/cv'
import { TEXTES } from '@/i18n'
import { brancherVoyage, createAppRouter } from '@/router'
import { cadrageScene } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { yPoseA } from '@/scene/rideau'
import { useVoyage } from '@/stores/voyage'

async function monter(depart: string, chemin?: string) {
  setActivePinia(createPinia())
  const router = createAppRouter(createMemoryHistory())
  brancherVoyage(router)
  await router.push(depart)
  await router.isReady()
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
    attachTo: document.body,
    global: { plugins: [router] },
  })
  if (chemin) await router.push(chemin)
  await flushPromises()
  return { router, wrapper, voyage: useVoyage() }
}

/**
 * Ce que la scène dit à `PanneauDeparts` pour qu'il se pose : le cadre et la
 * position du rideau. Nuls par défaut — le texte ne s'affiche pas —, et
 * renseignés par le seul test qui a besoin de son lien « CV ».
 */
const faux = vi.hoisted(() => ({ frame: null as unknown, rideau: null as unknown }))

vi.mock('@/composables/useScene', async (importOriginal) => {
  const { ref } = await import('vue')
  const reel = await importOriginal<typeof import('@/composables/useScene')>()
  return { ...reel, useScene: () => ({ scene: ref(null), fond: ref('#2E2313'), frame: ref(faux.frame), rideau: ref(faux.rideau), changerFond: () => {} }) }
})

async function monterApp(chemin: string) {
  setActivePinia(createPinia())
  const router = createAppRouter(createMemoryHistory())
  brancherVoyage(router)
  await router.push(chemin)
  await router.isReady()
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('contenu du CV', () => {
  it('le CV ne porte ni téléphone ni adresse postale', () => {
    const source = readFileSync('src/contenu/cv.ts', 'utf8')
    expect(source).not.toMatch(/\d{10}|\d{2}[ .]\d{2}[ .]\d{2}[ .]\d{2}[ .]\d{2}/)
    expect(source).not.toMatch(/Gentilly|Benoit Malon|94250/)
    expect(source).not.toMatch(/@/)
  })

  it('les sept arrêts sont dans l’ordre des dates, du plus récent au plus ancien', () => {
    expect(PARCOURS.fr).toHaveLength(7)
    expect(PARCOURS.fr.filter((a) => a.halte)).toHaveLength(3)
    expect(PARCOURS.fr[0].intitule).toBe('Lead Développeuse Front-End')
    expect(PARCOURS.fr[6].intitule).toContain('L2 Sciences')
  })

  it('aucun arrêt ne porte de description', () => {
    for (const a of PARCOURS.fr) expect(Object.keys(a)).toEqual(['intitule', 'lieu', 'depuis', 'jusqua', 'halte'])
  })

  it('les loisirs sont quatre', () => {
    expect(HORS_DE_LA_VOIE.fr).toHaveLength(4)
  })
})

describe('CvLigne', () => {
  it('/ailleurs/cv ouvre le CV sans quitter la gare', async () => {
    const { wrapper } = await monter('/ici', '/ailleurs/cv')
    expect(wrapper.findComponent(GareAilleurs).exists()).toBe(true)
    expect(wrapper.findComponent(CvLigne).exists()).toBe(true)
  })

  it('/ailleurs seul n’ouvre pas le CV', async () => {
    const { wrapper } = await monter('/ailleurs')
    expect(wrapper.findComponent(GareAilleurs).exists()).toBe(true)
    expect(wrapper.findComponent(CvLigne).exists()).toBe(false)
  })

  it('un lien partagé sur /ailleurs/cv pose la gare « ailleurs » sans jouer de voyage', async () => {
    const { voyage, wrapper } = await monter('/ailleurs/cv')
    expect(voyage.gare).toBe('ailleurs')
    expect(voyage.enRoute).toBe(false)
    expect(wrapper.findComponent(CvLigne).exists()).toBe(true)
  })

  it('aller au CV depuis une autre gare fait partir le train vers « ailleurs »', async () => {
    const { voyage } = await monter('/ici', '/ailleurs/cv')
    expect(voyage.cible).toBe('ailleurs')
    expect(voyage.enRoute).toBe(true)
  })

  it('aller au CV depuis « ailleurs » n’est pas un voyage', async () => {
    const { voyage } = await monter('/ailleurs', '/ailleurs/cv')
    expect(voyage.enRoute).toBe(false)
    expect(voyage.gare).toBe('ailleurs')
  })

  it('le retour ramène à /ailleurs', async () => {
    const { wrapper, router } = await monter('/ailleurs/cv')
    await wrapper.find('a.retour').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/ailleurs')
  })

  /**
   * La feuille de route (22 novembre 2026) coupe en deux ce que la voie mêlait :
   * le **service** d'un côté, les **haltes** de l'autre, et trois colonnes par
   * ligne — période, poste, dépôt. Avant, c'était une seule liste de sept
   * arrêts à trois paragraphes chacun ; ce test disait cela, et il dit
   * maintenant la nouvelle forme. Ce qui ne change pas : tout le parcours est
   * là, rien n'est inventé en plus.
   */
  it('range le parcours en service et haltes, trois colonnes par ligne', async () => {
    const { wrapper } = await monter('/ailleurs/cv')
    const rangs = wrapper.findAll('.rang')
    expect(rangs).toHaveLength(7)
    expect(wrapper.findAll('.rang.halte')).toHaveLength(3)
    expect(wrapper.findAll('.service .rang')).toHaveLength(4)
    expect(wrapper.findAll('.haltes .rang')).toHaveLength(3)
    for (const r of rangs) {
      expect(r.find('.periode').exists()).toBe(true)
      expect(r.find('.intitule').exists()).toBe(true)
      expect(r.find('.depot').exists()).toBe(true)
    }
    expect(wrapper.text()).not.toMatch(/Gentilly|anglais|espagnol|Vue|TypeScript/i)
  })

  it('l’adresse mail est assemblée, jamais en clair dans le HTML', async () => {
    const { wrapper } = await monter('/ailleurs/cv')
    const mail = wrapper.find('a[href^="mailto:"]')
    expect(mail.exists()).toBe(true)
    expect(mail.attributes('href')).toMatch(/^mailto:[\w.]+@[\w.]+\.\w+$/)
    expect(wrapper.find('a[href*="github.com/emmaZn"]').exists()).toBe(true)
  })

  it('n’utilise aucune couleur en dur', () => {
    const source = readFileSync('src/components/CvLigne.vue', 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('le focus entre dans le CV à l’ouverture', async () => {
    const { wrapper } = await monter('/ailleurs/cv')
    expect(document.activeElement).toBe(wrapper.find('.cv').element)
  })

  /**
   * Fermer le CV ne doit pas lâcher le focus sur `<body>` : on y arrive depuis
   * « CV · QUAI 2 », et c'est là qu'on doit revenir. Sinon il faut retraverser
   * la frise, la gare, les répliques d'oiseaux et la liste d'étoiles.
   */
  it('rend le focus à ce qui l’avait avant, en se démontant', async () => {
    const { router } = await monter('/ailleurs')
    const depuis = document.createElement('button')
    document.body.appendChild(depuis)
    depuis.focus()
    await router.push('/ailleurs/cv')
    await flushPromises()
    expect(document.activeElement).not.toBe(depuis)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(document.activeElement).toBe(depuis)
    depuis.remove()
  })

  it('ne rend rien à un élément qui a quitté le document entre-temps', async () => {
    const { router } = await monter('/ailleurs')
    const depuis = document.createElement('button')
    document.body.appendChild(depuis)
    depuis.focus()
    await router.push('/ailleurs/cv')
    await flushPromises()
    depuis.remove()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/ailleurs')
  })

  /**
   * Le vrai parcours, et le vrai piège. Tant que le CV est ouvert, `App.vue`
   * pose `inert` sur les deux `.dessous` — dont celui qui porte le panneau des
   * départs, donc le lien « CV · QUAI 2 » par lequel on est arrivé. Dans un
   * navigateur, `focus()` sur un élément à l'ancêtre inerte **ne fait rien**,
   * en silence, et le focus retombe sur `<body>` : exactement le symptôme
   * qu'on corrige. jsdom, lui, ne fait pas respecter `inert` — regarder
   * `document.activeElement` ne prouverait donc rien. On regarde l'appel
   * lui-même : au moment où le focus est rendu, le lien ne doit plus avoir
   * d'ancêtre inerte.
   */
  it('rend le focus au lien du panneau, et hors de toute zone inerte', async () => {
    faux.frame = cadrageScene(1440, 900).frame
    faux.rideau = { y: yPoseA(faux.frame as Frame), baisse: true }
    const vraiFocus = HTMLElement.prototype.focus
    try {
      const { wrapper, router } = await monterApp('/ailleurs')
      const lien = wrapper.findAll('a').find((a) => a.text().includes('CV'))
      expect(lien, 'le panneau ne montre pas son lien CV').toBeTruthy()
      const cible = lien!.element as HTMLElement
      // On y arrive au clavier, depuis le lien : c'est lui qui a le focus.
      cible.focus()
      expect(document.activeElement).toBe(cible)
      await router.push('/ailleurs/cv')
      await flushPromises()
      expect(cible.closest('[inert]'), 'le lien devrait être inerte, CV ouvert').toBeTruthy()

      const appels: (Element | null)[] = []
      HTMLElement.prototype.focus = function (this: HTMLElement, o?: FocusOptions) {
        if (this === cible) appels.push(this.closest('[inert]'))
        return vraiFocus.call(this, o)
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()

      expect(appels, 'le focus n’a jamais été rendu au lien').toHaveLength(1)
      expect(appels[0], 'le focus a été rendu alors que le lien était encore inerte').toBeNull()
      expect(document.activeElement).toBe(cible)
    } finally {
      HTMLElement.prototype.focus = vraiFocus
      faux.frame = null
      faux.rideau = null
    }
  })

  /**
   * L'anneau visait `--trait` tant que le CV était un voile sombre. Sur la
   * feuille de route, `--trait` est presque blanc : il serait invisible sur le
   * papier. C'est donc l'encre de la feuille qu'il prend — mais c'est toujours
   * un **vrai anneau**, et non une opacité qui monte, ce que ce test garde.
   */
  it('« retour » porte un vrai anneau de focus, pas qu’une opacité', () => {
    const source = readFileSync('src/components/CvLigne.vue', 'utf8')
    const bloc = source.slice(source.indexOf('.retour:focus-visible'))
    expect(bloc.slice(0, bloc.indexOf('}'))).toMatch(/outline:\s*1px solid var\(--encre\)/)
  })

  /**
   * Le lien « retour » est en haut de la feuille : une fois qu'on a lu, il est
   * remonté hors de l'écran, et il fallait défiler pour sortir. La croix est
   * **fixe** — c'est tout son intérêt, et c'est ce que ce test garde.
   */
  it('la croix ferme le CV, où qu’on en soit dans la lecture', async () => {
    const { wrapper, router } = await monter('/ailleurs/cv')
    const croix = wrapper.find('button.fermer')
    expect(croix.exists()).toBe(true)
    await croix.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/ailleurs')
  })

  it('la croix suit la lecture au lieu de remonter hors de l’écran', () => {
    // Collante, et non fixée à la fenêtre : elle appartient au papier, et
    // redescend avec la fin de la feuille.
    const source = readFileSync('src/components/CvLigne.vue', 'utf8')
    const bloc = source.slice(source.indexOf('.fermer {'))
    expect(bloc.slice(0, bloc.indexOf('}'))).toMatch(/position:\s*sticky/)
  })

  it('la croix se nomme, pour qui ne la voit pas', async () => {
    const { wrapper } = await monter('/ailleurs/cv')
    expect(wrapper.find('button.fermer').attributes('aria-label')).toBe(TEXTES.fr.cv.fermer)
  })

  it('Échap ferme le CV et ramène à /ailleurs, comme « retour »', async () => {
    const { wrapper, router } = await monter('/ailleurs/cv')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/ailleurs')
    expect(wrapper.find('a.retour').exists()).toBe(false)
  })

  it('une autre touche ne ferme rien', async () => {
    const { router } = await monter('/ailleurs/cv')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/ailleurs/cv')
  })

  it('CV ouvert : frise, panneau, étoiles et œil sont inertes ; fermé : non', async () => {
    const { wrapper, router } = await monterApp('/ailleurs/cv')
    const dessous = () => wrapper.findAll('.dessous')
    expect(dessous()).toHaveLength(2)
    expect(dessous().every((d) => d.attributes('inert') !== undefined)).toBe(true)
    expect(dessous()[0].find('nav').exists()).toBe(true)
    expect(dessous()[1].find('button.oeil').exists()).toBe(true)
    await router.push('/ailleurs')
    await flushPromises()
    expect(dessous().every((d) => d.attributes('inert') === undefined)).toBe(true)
  })
})

test('le CV existe en anglais, au même nombre d’arrêts', () => {
  // La feuille de route numérote par rang : un arrêt de plus ou de moins dans
  // une langue décalerait toute la voie.
  expect(PARCOURS.en).toHaveLength(PARCOURS.fr.length)
  expect(PARCOURS.en.map((a) => a.halte)).toEqual(PARCOURS.fr.map((a) => a.halte))
  expect(PARCOURS.en.map((a) => a.depuis)).not.toEqual(PARCOURS.fr.map((a) => a.depuis))
  expect(PARCOURS.en[0].intitule).toBe('Lead Front-End Developer')
  expect(HORS_DE_LA_VOIE.en).toHaveLength(HORS_DE_LA_VOIE.fr.length)
})
