import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import CommandeReverbere from '@/components/CommandeReverbere.vue'
import { FRAME_KEY, SCENE_KEY } from '@/composables/useScene'
import { RAYON_SURVOL } from '@/scene/StarLayer'
import { cadrageCiel, cadrageScene, regionCiel } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { cibleReverbere } from '@/scene/quai'
import { projeter } from '@/scene/stars'
import { useVoyage } from '@/stores/voyage'

const SOURCE = readFileSync('src/components/CommandeReverbere.vue', 'utf8')

/** Une règle du CSS du composant, lue dans sa source — comme pour le panneau. */
function regle(selecteur: string): string {
  const i = SOURCE.indexOf(`${selecteur} {`)
  if (i < 0) throw new Error(`pas de règle ${selecteur}`)
  return SOURCE.slice(i, SOURCE.indexOf('}', i))
}

type Etat = 'ailleurs' | 'ici' | 'enRoute'

/**
 * Le composant monté comme `App.vue` le monte : la scène et le cadre sont
 * fournis, le magasin dit où l'on est. La scène est réduite à ce que le bouton
 * lui demande — l'état du réverbère, qu'elle émet, et le geste, qu'elle prend.
 */
function monter(etat: Etat = 'ailleurs', largeur = 1512, hauteur = 771) {
  setActivePinia(createPinia())
  const voyage = useVoyage()
  if (etat === 'ici') voyage.poserGare('ici')
  else {
    voyage.poserGare('ailleurs')
    if (etat === 'enRoute') voyage.partirVers('ici')
  }
  window.innerWidth = largeur
  window.innerHeight = hauteur
  const frame = ref<Frame | null>(cadrageScene(largeur, hauteur).frame)
  let dire: ((allume: boolean) => void) | null = null
  const scene = {
    reverbereAllume: true,
    basculerReverbere: vi.fn(),
    on: (_evt: string, cb: (allume: boolean) => void) => {
      dire = cb
      return () => {
        dire = null
      }
    },
  }
  const wrapper = mount(CommandeReverbere, {
    attachTo: document.body,
    global: {
      provide: { [FRAME_KEY as symbol]: frame, [SCENE_KEY as symbol]: ref(scene) },
    },
  })
  return {
    wrapper,
    frame,
    scene,
    voyage,
    dire: async (allume: boolean) => {
      dire?.(allume)
      await nextTick()
    },
  }
}

const bouton = (w: ReturnType<typeof monter>['wrapper']) => w.find('.commande-reverbere')

/** La boîte que le composant pose en ligne, en pixels d'écran. */
function boite(el: HTMLElement) {
  const n = (v: string) => Number.parseFloat(v)
  const x0 = n(el.style.left)
  const y0 = n(el.style.top)
  return { x0, y0, x1: x0 + n(el.style.width), y1: y0 + n(el.style.height) }
}

describe('CommandeReverbere', () => {
  it('n’existe pas ailleurs qu’à « ailleurs »', () => {
    expect(bouton(monter('ici').wrapper).exists()).toBe(false)
  })

  it('n’existe pas tant que la scène n’a pas cadré', () => {
    const { wrapper, frame } = monter()
    expect(bouton(wrapper).exists()).toBe(true)
    frame.value = null
    return nextTick().then(() => {
      expect(bouton(wrapper).exists()).toBe(false)
    })
  })

  /**
   * Le bouton est la cible de la scène, pas une boîte à lui : même fonction,
   * même échelle. Et il fait 44 px d'écran **à toute échelle** — un plancher
   * d'accessibilité (WCAG 2.5.5), vérifié aux largeurs où la cible à taille de
   * cadre tombait dessous.
   */
  it('se pose sur la cible de la scène, et fait 44 px d’écran à toute échelle', () => {
    for (const [largeur, hauteur] of [
      [1512, 771],
      [1280, 720],
      [1024, 768],
      [390, 844],
      [844, 390],
    ] as Array<[number, number]>) {
      const { wrapper } = monter('ailleurs', largeur, hauteur)
      const f = cadrageScene(largeur, hauteur).frame
      const c = cibleReverbere(f.scale)
      const b = boite(bouton(wrapper).element as HTMLElement)
      expect(b.x0).toBeCloseTo(f.offsetX + c.x0 * f.scale, 3)
      expect(b.y0).toBeCloseTo(f.offsetY + c.y0 * f.scale, 3)
      expect(b.y1).toBeCloseTo(f.offsetY + c.y1 * f.scale, 3)
      expect(b.x1 - b.x0).toBeGreaterThanOrEqual(44)
      wrapper.unmount()
    }
  })

  /**
   * `aria-pressed` porte l'état — pressé = allumé, comme un interrupteur
   * enfoncé — et le **nom reste fixe**. Un nom qui changerait avec lui
   * s'annoncerait « Éteindre le réverbère, non pressé », qui se contredit.
   * C'est l'idiome du dépôt : la commande de l'horloge porte `aria-expanded`
   * avec un nom fixe.
   */
  it('dit l’état par `aria-pressed` seul, sous un nom qui ne bouge pas', async () => {
    const { wrapper, dire } = monter()
    expect(bouton(wrapper).attributes('aria-pressed')).toBe('true')
    expect(bouton(wrapper).attributes('aria-label')).toBe('Réverbère')
    await dire(false)
    expect(bouton(wrapper).attributes('aria-pressed')).toBe('false')
    expect(bouton(wrapper).attributes('aria-label')).toBe('Réverbère')
  })

  it('bascule au clic, une fois', async () => {
    const { wrapper, scene } = monter()
    await bouton(wrapper).trigger('click')
    expect(scene.basculerReverbere).toHaveBeenCalledTimes(1)
  })

  /**
   * `useScene` écoute `pointerdown` sur `window` et `clicPx` bascule déjà le
   * réverbère sur l'aire du mât — que ce bouton couvre. Sans `.stop`, l'appui
   * basculerait une fois par la scène et une fois par le `click` : c'est le
   * défaut corrigé le 20 novembre sur la commande de l'horloge.
   */
  it('retient l’appui : la scène ne bascule pas deux fois', async () => {
    const { wrapper } = monter()
    const vus: Event[] = []
    const ecoute = (e: Event) => vus.push(e)
    window.addEventListener('pointerdown', ecoute)
    try {
      ;(bouton(wrapper).element as HTMLElement).dispatchEvent(
        new window.Event('pointerdown', { bubbles: true, cancelable: true }),
      )
      expect(vus).toHaveLength(0)
    } finally {
      window.removeEventListener('pointerdown', ecoute)
    }
  })

  /**
   * Un bouton `disabled` reste touché par le test de survol et **avale**
   * l'événement sans le laisser remonter. Le mât est une bande haute de
   * ~210 px d'écran posée à la place d'arrêt ; le train parti, la gare défile
   * mais la bande reste, et elle mangerait les clics pendant toute l'étape.
   * `pointer-events: none` est la seule chose qui l'en empêche.
   */
  /**
   * Seul l'**appui** est retenu. `useScene` écoute aussi `pointermove` sur
   * `window`, et c'est lui qui ouvre la bulle d'une étoile : le laisser passer
   * est ce qui fait qu'une étoile posée par-dessus le mât se lit encore.
   */
  it('laisse passer le survol : la bulle d’une étoile s’ouvre par-dessus le mât', () => {
    const { wrapper } = monter()
    const vus: Event[] = []
    const ecoute = (e: Event) => vus.push(e)
    window.addEventListener('pointermove', ecoute)
    try {
      ;(bouton(wrapper).element as HTMLElement).dispatchEvent(
        new window.Event('pointermove', { bubbles: true }),
      )
      expect(vus).toHaveLength(1)
    } finally {
      window.removeEventListener('pointermove', ecoute)
    }
  })

  it('est désactivé en route, et ne touche plus rien', () => {
    const { wrapper } = monter('enRoute')
    expect(bouton(wrapper).attributes('disabled')).toBeDefined()
    expect(regle('.commande-reverbere:disabled')).toMatch(/pointer-events:\s*none/)
  })

  it('reste atteignable au clavier : il n’est ni masqué ni retiré', () => {
    const { wrapper } = monter()
    expect(bouton(wrapper).attributes('type')).toBe('button')
    expect(regle('.commande-reverbere:focus-visible')).toMatch(/outline/)
  })
})

/**
 * **La mesure** (étape 6 de la tâche) : la cible ne doit pas manger les bulles
 * des étoiles.
 *
 * jsdom n'a pas `document.elementFromPoint` et ne pose aucune boîte : on le
 * reconstruit sur ce que le composant écrit vraiment — la boîte `position:
 * fixed` posée en ligne, et l'état `disabled`, que le CSS rend intouchable
 * (règle vérifiée plus haut). C'est un succédané du test du navigateur, et il
 * est nommé comme tel ; ce qu'il mesure, lui, est exact : la place de toutes
 * les étoiles de la colonne du bouton, par le même `projeter` que la scène.
 */
function elementSous(x: number, y: number): Element | null {
  const touchables = [...document.body.querySelectorAll<HTMLButtonElement>('button')].filter(
    (el) => !el.disabled,
  )
  // Le dernier du DOM est au-dessus, à `z-index` égal.
  for (let i = touchables.length - 1; i >= 0; i -= 1) {
    const b = boite(touchables[i])
    if (!Number.isFinite(b.x0) || !Number.isFinite(b.y0)) continue
    if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return touchables[i]
  }
  return null
}

describe('la cible du réverbère et les étoiles', () => {
  /**
   * Des fenêtres ordinaires **et** des fenêtres basses, qui sont le cas serré :
   * la bande des étoiles part d'une frise à hauteur fixe (96 px) et `regionCiel`
   * la coince juste sous elle dès que la crête sort du haut, tandis que le mât,
   * lui, **monte** avec l'`offsetY` négatif du cadrage. Les deux se rapprochent
   * donc quand la fenêtre s'aplatit — voir le test du croisement plus bas.
   */
  const ECRANS: Array<[number, number]> = [
    [1512, 771],
    [1920, 1080],
    [1440, 900],
    [1280, 960],
    [1280, 720],
    [1024, 768],
    [2560, 1440],
    [2560, 600],
    [1920, 500],
    [1600, 500],
    [768, 1024],
    [390, 844],
    [844, 390],
    [932, 430],
  ]

  it('le succédané d’`elementFromPoint` trouve bien le bouton sur le mât', () => {
    const { wrapper } = monter()
    const el = bouton(wrapper).element as HTMLElement
    const b = boite(el)
    expect(elementSous((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2)).toBe(el)
    expect(elementSous(b.x0 - 2, (b.y0 + b.y1) / 2)).toBeNull()
  })

  it('aucune place d’étoile de sa colonne ne tombe sur le bouton', () => {
    for (const [largeur, hauteur] of ECRANS) {
      const { wrapper } = monter('ailleurs', largeur, hauteur)
      const el = bouton(wrapper).element as HTMLElement
      const b = boite(el)
      const { decalage, echelle } = cadrageCiel(largeur, hauteur)
      for (const px of [b.x0, (b.x0 + b.x1) / 2, b.x1]) {
        for (let u = 0; u <= 1.0001; u += 0.05) {
          const place = { x: px / largeur, y: u }
          const pose = projeter(place, largeur, hauteur, echelle, decalage)
          // Le pointeur atteint une étoile jusqu'à `RAYON_SURVOL` autour d'elle.
          for (const dy of [-RAYON_SURVOL, 0, RAYON_SURVOL]) {
            expect(elementSous(pose.px, pose.py + dy)).not.toBe(el)
          }
        }
      }
      wrapper.unmount()
    }
  })

  /**
   * **La borne, dite en clair.** Le brief annonçait que les deux bandes se
   * croisent ; à la mesure, elles ne se croisent **pas** sur une fenêtre
   * ordinaire — il reste 233 px à 1512 × 771, 24 px au plus serré des écrans
   * ci-dessus. Elles finissent par se croiser sur une fenêtre très basse
   * (moins de ~436 px de haut à 1512 de large), et là le mât prend le clic
   * d'une étoile. C'est le même arbitrage des deux côtés — `clicPx` consulte
   * lui aussi le réverbère avant les étoiles —, et le survol, lui, passe
   * toujours : la bulle s'ouvre (test plus haut).
   *
   * Ce test garde la borne : si un réglage faisait descendre le mât ou monter
   * la crête, il tomberait avant que le défaut n'arrive sur un écran réel.
   */
  it('ne croise la bande des étoiles que sur une fenêtre très basse', () => {
    const bas = (W: number, H: number) => {
      const { frame } = cadrageScene(W, H)
      const { decalage, echelle } = cadrageCiel(W, H)
      // La même colonne que le test ci-dessus, et le plus bas de ses trois bords.
      let etoiles = -Infinity
      const c = cibleReverbere(frame.scale)
      for (const cadre of [c.x0, (c.x0 + c.x1) / 2, c.x1]) {
        const r = regionCiel(frame.offsetX + cadre * frame.scale, W, H, echelle, decalage)
        etoiles = Math.max(etoiles, r.top + r.height + RAYON_SURVOL)
      }
      return { etoiles, mat: frame.offsetY + c.y0 * frame.scale }
    }
    const haute = bas(1512, 436)
    expect(haute.mat).toBeGreaterThan(haute.etoiles)
    const rase = bas(1512, 435)
    expect(rase.mat).toBeLessThan(rase.etoiles)
  })
})

describe('App.vue', () => {
  const app = readFileSync('src/App.vue', 'utf8')

  it('monte la commande du réverbère', () => {
    expect(app).toContain('<CommandeReverbere />')
  })

  /**
   * Avant le panneau des départs : les deux boîtes `fixed` sont au même
   * `z-index`, et c'est l'ordre du gabarit qui décide. Le panneau posé croise
   * le mât ; monté après, il garde ses liens au-dessus du bouton.
   */
  it('le monte avant le panneau des départs', () => {
    const commande = app.indexOf('<CommandeReverbere />')
    const panneau = app.indexOf('<PanneauDeparts />')
    expect(commande).toBeGreaterThan(0)
    expect(panneau).toBeGreaterThan(0)
    expect(commande).toBeLessThan(panneau)
  })
})
