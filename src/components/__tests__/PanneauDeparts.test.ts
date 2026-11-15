import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import PanneauDeparts from '@/components/PanneauDeparts.vue'
import { FRAME_KEY } from '@/composables/useScene'
import { fitStage } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { PIECES } from '@/scene/quai'
import { useVoyage } from '@/stores/voyage'

const ADRESSE = /[\w.]+@[\w.]+\.\w+/

function monter(etat: 'ailleurs' | 'ici' | 'enRoute' = 'ailleurs', frame: Frame | null = fitStage(1440, 900)) {
  setActivePinia(createPinia())
  const voyage = useVoyage()
  if (etat === 'ici') voyage.poserGare('ici')
  else {
    voyage.poserGare('ailleurs')
    if (etat === 'enRoute') voyage.partirVers('ici')
  }
  const cadre = ref<Frame | null>(frame)
  const wrapper = mount(PanneauDeparts, {
    attachTo: document.body,
    global: { provide: { [FRAME_KEY as symbol]: cadre } },
  })
  return { wrapper, cadre, voyage }
}

function lien(wrapper: ReturnType<typeof monter>['wrapper'], mot: string) {
  const a = wrapper.findAll('a').find((x) => x.text().includes(mot))
  if (!a) throw new Error(`pas de lien ${mot}`)
  return a
}

describe('PanneauDeparts', () => {
  it('n’affiche rien quand on n’est pas à « ailleurs »', () => {
    expect(monter('ici').wrapper.find('.panneau').exists()).toBe(false)
  })

  it('n’affiche rien quand le train traverse « ailleurs » sans s’arrêter', () => {
    expect(monter('enRoute').wrapper.find('.panneau').exists()).toBe(false)
  })

  it('affiche six lignes à quai, dont trois liens', () => {
    const { wrapper } = monter()
    expect(wrapper.findAll('.ligne')).toHaveLength(6)
    expect(wrapper.findAll('a')).toHaveLength(3)
  })

  it('met les trois liens avant les lignes éteintes', () => {
    const lignes = monter().wrapper.findAll('.ligne')
    expect(lignes.slice(0, 3).every((l) => l.element.tagName === 'A')).toBe(true)
    expect(lignes.slice(3).every((l) => l.element.tagName !== 'A')).toBe(true)
  })

  it('LINKEDIN s’ouvre dans un nouvel onglet', () => {
    const a = lien(monter().wrapper, 'LINKEDIN')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toContain('noopener')
  })

  it('CV mène à /ailleurs/cv', () => {
    expect(lien(monter().wrapper, 'CV').attributes('href')).toBe('/ailleurs/cv')
  })

  it('ÉCRIRE porte un href mailto dès le montage, pas au clic', () => {
    expect(lien(monter().wrapper, 'ÉCRIRE').attributes('href')).toMatch(/^mailto:/)
  })

  it('l’adresse n’apparaît pas en clair dans le source du composant', () => {
    const source = readFileSync('src/components/PanneauDeparts.vue', 'utf8')
    expect(source).not.toMatch(ADRESSE)
  })

  it('l’adresse n’apparaît pas en clair dans le texte rendu', () => {
    const { wrapper } = monter()
    expect(wrapper.text()).not.toMatch(ADRESSE)
    // Le href, lui, est un mailto: nécessaire : on regarde tout le reste.
    const html = wrapper.html().replace(/href="mailto:[^"]*"/, '')
    expect(html).not.toMatch(ADRESSE)
  })

  it('les trois liens prennent le focus clavier, dans l’ordre du DOM', () => {
    const { wrapper } = monter()
    const liens = wrapper.findAll('a')
    for (const a of liens) {
      expect(a.attributes('href')).toBeTruthy()
      expect(a.attributes('tabindex')).toBeUndefined()
    }
    expect(liens.map((a) => a.text()[0] === undefined ? '' : a.text())).toEqual([
      expect.stringContaining('LINKEDIN'),
      expect.stringContaining('CV'),
      expect.stringContaining('ÉCRIRE'),
    ])
  })

  it('le texte reste dans son cadre après un redimensionnement', async () => {
    const { wrapper, cadre } = monter()
    const place = () => {
      const s = (wrapper.find('.panneau').element as HTMLElement).style
      return { left: parseFloat(s.left), top: parseFloat(s.top), transform: s.transform }
    }
    const f1 = cadre.value as Frame
    expect(place().left).toBeCloseTo(f1.offsetX + PIECES.panneau.x * f1.scale)
    expect(place().top).toBeCloseTo(f1.offsetY + PIECES.panneau.y * f1.scale)
    const f2 = fitStage(800, 1000)
    cadre.value = f2
    await nextTick()
    expect(place().left).toBeCloseTo(f2.offsetX + PIECES.panneau.x * f2.scale)
    expect(place().top).toBeCloseTo(f2.offsetY + PIECES.panneau.y * f2.scale)
    expect(place().transform).toContain(String(f2.scale))
  })

  it('n’affiche rien tant que le cadre de la scène n’est pas connu', () => {
    expect(monter('ailleurs', null).wrapper.find('.panneau').exists()).toBe(false)
  })

  it('s’efface quand le train repart', async () => {
    const { wrapper, voyage } = monter()
    voyage.partirVers('ici')
    await nextTick()
    // Sous le Transition factice des tests, le retrait est immédiat.
    expect(wrapper.find('.panneau').exists()).toBe(false)
  })
})
