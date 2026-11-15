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
import { brancherVoyage, createAppRouter } from '@/router'
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

vi.mock('@/composables/useScene', async (importOriginal) => {
  const { ref } = await import('vue')
  const reel = await importOriginal<typeof import('@/composables/useScene')>()
  return { ...reel, useScene: () => ({ scene: ref(null), fond: ref('#2E2313'), frame: ref(null), changerFond: () => {} }) }
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
    expect(PARCOURS).toHaveLength(7)
    expect(PARCOURS.filter((a) => a.halte)).toHaveLength(3)
    expect(PARCOURS[0].intitule).toBe('Lead Développeuse Front-End')
    expect(PARCOURS[6].intitule).toContain('L2 Sciences')
  })

  it('aucun arrêt ne porte de description', () => {
    for (const a of PARCOURS) expect(Object.keys(a)).toEqual(['intitule', 'lieu', 'depuis', 'jusqua', 'halte'])
  })

  it('les loisirs sont quatre', () => {
    expect(HORS_DE_LA_VOIE).toHaveLength(4)
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

  it('affiche trois lignes par arrêt, haltes marquées, et rien d’autre', async () => {
    const { wrapper } = await monter('/ailleurs/cv')
    const arrets = wrapper.findAll('.arret')
    expect(arrets).toHaveLength(7)
    expect(wrapper.findAll('.arret.halte')).toHaveLength(3)
    for (const a of arrets) expect(a.findAll('p')).toHaveLength(3)
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
