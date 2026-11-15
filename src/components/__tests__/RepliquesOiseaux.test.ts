import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import RepliquesOiseaux from '@/components/RepliquesOiseaux.vue'
import { REPLIQUES, variante } from '@/components/repliques'
import { SCENE_KEY } from '@/composables/useScene'
import type { Scene } from '@/scene/Scene'

/** Une scène réduite à ce dont la couche se sert : `birdFell` et deux appels. */
function fausseScene() {
  let ecouteur: (() => void) | null = null
  const scene = {
    on: vi.fn((evt: string, cb: () => void) => {
      if (evt === 'birdFell') ecouteur = cb
      return vi.fn()
    }),
    faireTomberUnOiseau: vi.fn(() => true),
    setProchaineVariante: vi.fn(),
  }
  return { scene, tomber: () => ecouteur?.() }
}

function monter() {
  const { scene, tomber } = fausseScene()
  const wrapper = mount(RepliquesOiseaux, {
    global: { provide: { [SCENE_KEY as symbol]: ref(scene as unknown as Scene) } },
  })
  return { wrapper, scene, tomber }
}

describe('RepliquesOiseaux', () => {
  it('ne dit rien tant qu’aucun oiseau n’est tombé', () => {
    expect(monter().wrapper.findAll('.replique')).toHaveLength(0)
  })

  it('affiche la phrase quand un oiseau tombe', async () => {
    const { wrapper, tomber } = monter()
    tomber()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.replique').text()).toBe(REPLIQUES[0])
  })

  it('n’en montre qu’une : une nouvelle chute remplace la précédente', async () => {
    const { wrapper, tomber } = monter()
    tomber()
    tomber()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.replique')).toHaveLength(1)
    expect(wrapper.find('.replique').text()).toBe(REPLIQUES[1])
  })

  it('annonce les phrases : la couche est une zone aria-live polie', () => {
    expect(monter().wrapper.find('[aria-live="polite"]').exists()).toBe(true)
  })

  it('le bouton clavier fait tomber un oiseau sans en viser un', async () => {
    const { wrapper, scene } = monter()
    await wrapper.find('button').trigger('click')
    expect(scene.faireTomberUnOiseau).toHaveBeenCalledOnce()
  })

  it('annonce à la scène la variante de la prochaine réplique, avant tout clic', () => {
    const { scene } = monter()
    expect(scene.setProchaineVariante).toHaveBeenLastCalledWith(variante(REPLIQUES[0]))
  })

  it('pousse la variante suivante après chaque chute', () => {
    const { scene, tomber } = monter()
    for (let i = 0; i < 4; i += 1) tomber()
    // Quatre dites : la prochaine est « Et je danse. », qui pirouette.
    expect(REPLIQUES[4]).toBe('Et je danse.')
    expect(scene.setProchaineVariante).toHaveBeenLastCalledWith({
      pirouette: true,
      regard: false,
    })
  })
})

describe('la place de la couche', () => {
  const app = readFileSync('src/App.vue', 'utf8')

  it('vit dans App.vue, hors de la route', () => {
    // L'URL change à l'instant du clic sur une autre gare, bien avant que le
    // train ne bouge : dans une gare, le composant serait détruit au milieu
    // d'une phrase.
    expect(app).toContain('<RepliquesOiseaux />')
    expect(app).toContain('<RouterView />')
  })

  it('n’est montée par aucune gare', () => {
    for (const gare of ['GareIci', 'GarePlusLoin', 'GareLaHaut', 'GareAilleurs']) {
      const source = readFileSync(`src/components/gares/${gare}.vue`, 'utf8')
      expect(source, gare).not.toContain('RepliquesOiseaux')
    }
  })
})
