import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouterLink, createMemoryHistory } from 'vue-router'

import PanneauDeparts from '@/components/PanneauDeparts.vue'
import { ALPHABET, DEBUT_ENTETE_MS, DEBUT_LIGNES_MS, ECART_LIGNES_MS, PAS_MS } from '@/components/volets'
import { FRAME_KEY, RIDEAU_KEY, SCENE_KEY } from '@/composables/useScene'
import type { EtatRideau } from '@/composables/useScene'
import { HAUTEUR_FRISE, cadrageScene } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { HALO_HORLOGE, HORLOGE, cibleReverbere } from '@/scene/quai'
import { BRAS, RIDEAU, horlogeTouchee, yPoseA, yRangeA } from '@/scene/rideau'
import { VIVIER, departsReels } from '@/scene/horaires'
import { createAppRouter } from '@/router'
import { CV } from '@/contenu/liens'
import { useVoyage } from '@/stores/voyage'

const ADRESSE = /[\w.]+@[\w.]+\.\w+/

/**
 * La gouttière du panneau, en pixels d'écran, lue dans la source du composant :
 * c'est la seule mesure d'écran de la plaque, et un nombre recopié ici
 * laisserait le panneau toucher les bords sans que rien ne le dise.
 */
const GOUTTIERE = Number(
  /const GOUTTIERE = (\d+)/.exec(readFileSync('src/components/PanneauDeparts.vue', 'utf8'))![1],
)

/**
 * jsdom n'a pas `matchMedia` : le réglage du visiteur est un stub, dont on
 * garde les écouteurs pour pouvoir le faire changer en cours de route.
 */
type Ecouteur = (e: { matches: boolean }) => void
let ecouteurs: Ecouteur[] = []
function stubReducedMotion(reduit: boolean) {
  ecouteurs = []
  const mq = {
    matches: reduit,
    addEventListener: (_: string, f: Ecouteur) => ecouteurs.push(f),
    removeEventListener: (_: string, f: Ecouteur) => { ecouteurs = ecouteurs.filter((x) => x !== f) },
  }
  vi.stubGlobal('matchMedia', (q: string) => ({ ...mq, media: q, matches: reduit && q.includes('reduce') }))
  return mq
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/**
 * Le cadre tel que la scène le donne en production : `cadrageScene`, qui
 * **descend** le haut de la scène (20 px d'écran sur bureau, 60 sur mobile).
 * `fitStage` seul a un `offsetY` nul à ces fenêtres, et un test posé dessus ne
 * verrait pas un texte décalé de ce retrait.
 */
const cadreDe = (largeur: number, hauteur: number): Frame => cadrageScene(largeur, hauteur).frame

type Options = {
  frame?: Frame | null
  /** Absent : le rideau est posé. `null` : la scène n'a rien émis. */
  rideau?: EtatRideau | null
  /**
   * La largeur de la fenêtre. Elle construit le cadre par `cadreDe` (hauteur 900)
   * sauf si `frame` est donné, et pose `window.innerWidth` : le cadre ne porte
   * pas la largeur de la fenêtre, le composant la lit là.
   */
  largeur?: number
}

/**
 * Le texte a deux sources, et la scène les donne toutes deux : le cadre
 * (l'échelle) et la position du rideau. Chacune peut manquer sans que l'autre
 * manque, et le composant doit se taire dans les deux cas.
 */
function monter(etat: 'ailleurs' | 'ici' | 'enRoute' = 'ailleurs', options: Options = {}) {
  setActivePinia(createPinia())
  const voyage = useVoyage()
  if (etat === 'ici') voyage.poserGare('ici')
  else {
    voyage.poserGare('ailleurs')
    if (etat === 'enRoute') voyage.partirVers('ici')
  }
  // Toujours posée, pour qu'un test sous le seuil ne déteigne pas sur le suivant.
  const largeur = options.largeur ?? 1440
  window.innerWidth = largeur
  const frame = options.frame === undefined ? cadreDe(largeur, 900) : options.frame
  const cadre = ref<Frame | null>(frame)
  const posee = frame ? { y: yPoseA(frame), baisse: true } : null
  const rideau = ref<EtatRideau | null>(options.rideau === undefined ? posee : options.rideau)
  // La scène, réduite à ce que le panneau lui demande : la règle du rideau vit
  // chez elle, et la bulle d'étoile aussi.
  const scene = { basculerRideau: vi.fn(), fermerBulleEtoile: vi.fn() }
  const wrapper = mount(PanneauDeparts, {
    attachTo: document.body,
    global: {
      // CV est un RouterLink : pas de rechargement de la page, la scène ne repart pas.
      plugins: [createAppRouter(createMemoryHistory())],
      provide: { [FRAME_KEY as symbol]: cadre, [RIDEAU_KEY as symbol]: rideau, [SCENE_KEY as symbol]: ref(scene) },
    },
  })
  return { wrapper, cadre, rideau, voyage, scene }
}

function lien(wrapper: ReturnType<typeof monter>['wrapper'], mot: string) {
  const a = wrapper.findAll('a').find((x) => x.text().includes(mot))
  if (!a) throw new Error(`pas de lien ${mot}`)
  return a
}

describe('PanneauDeparts', () => {
  // Le rideau est posé : seul le lieu peut cacher le texte.
  it('n’affiche rien quand on n’est pas à « ailleurs »', () => {
    expect(monter('ici').wrapper.find('.panneau').exists()).toBe(false)
  })

  // Le train est parti, la scène a rangé le rideau : il ne reste rien à lire.
  // Ce qui garde ici est la position rangée, pas `enRoute` — un rideau encore
  // baissé en route doit, lui, survivre (voir « laisse le rideau remonter »).
  it('n’affiche rien quand le train traverse « ailleurs » et que la scène a rangé le rideau', () => {
    const frame = cadreDe(1440, 900)
    const { wrapper } = monter('enRoute', { rideau: { y: yRangeA(frame), baisse: false } })
    expect(wrapper.find('.panneau').exists()).toBe(false)
  })

  it('affiche cinq lignes à quai, dont trois liens', () => {
    const { wrapper } = monter()
    expect(wrapper.findAll('.ligne')).toHaveLength(5)
    expect(wrapper.findAll('a')).toHaveLength(3)
  })

  it('ne répète pas une destination éteinte', () => {
    const { wrapper } = monter()
    const mots = wrapper.findAll('.eteint').map((l) => l.text())
    expect(mots).toHaveLength(2)
    expect(new Set(mots).size).toBe(mots.length)
  })

  it('met les trois liens avant les lignes éteintes', () => {
    const lignes = monter().wrapper.findAll('.ligne')
    // Sans cela, `every` sur une liste vide serait vrai.
    expect(lignes).toHaveLength(5)
    expect(lignes.slice(0, 3).every((l) => l.element.tagName === 'A')).toBe(true)
    expect(lignes.slice(3).every((l) => l.element.tagName !== 'A')).toBe(true)
  })

  it('LINKEDIN s’ouvre dans un nouvel onglet', () => {
    const a = lien(monter().wrapper, 'LINKEDIN')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toContain('noopener')
  })

  /**
   * `href === '/ailleurs/cv'` passerait aussi pour un `<a>` nu — et un `<a>`
   * nu veut dire rechargement complet de la page, donc scène qui repart de
   * zéro, train rendu à « ici », fond remis au défaut. C'est le composant qui
   * doit être un `RouterLink`, pas seulement l'adresse qui doit être la bonne.
   */
  it('CV est un RouterLink vers /ailleurs/cv, pas un <a> nu', () => {
    const { wrapper } = monter()
    const liens = wrapper.findAllComponents(RouterLink)
    const cv = liens.find((l) => l.text().includes('CV'))
    expect(cv, 'aucun RouterLink ne porte CV').toBeTruthy()
    expect(cv!.props('to')).toBe(CV)
    expect(lien(wrapper, 'CV').attributes('href')).toBe('/ailleurs/cv')
  })

  it('LINKEDIN et ÉCRIRE restent des <a>, eux : ils sortent du site', () => {
    const { wrapper } = monter()
    const routes = wrapper.findAllComponents(RouterLink).map((l) => l.text())
    // Le seul RouterLink est le CV : sans lui la liste serait vide et rien ne serait gardé.
    expect(routes).toHaveLength(1)
    expect(routes[0]).toContain('CV')
    // `lien()` ne cherche que parmi les <a> : il prouve que les deux existent, pas leur nature.
    // La nature est gardée par la longueur de `routes`, ci-dessus.
    lien(wrapper, 'LINKEDIN')
    lien(wrapper, 'ÉCRIRE')
  })

  /**
   * Au retrait, le panneau s'efface sur place pendant une demi-seconde. Cliquer
   * `CV` pendant ce fondu poussait `/ailleurs/cv`, dont
   * l'`afterEach` appelle `partirVers('ailleurs')` sur un train déjà en
   * marche : il le redirigeait, et l'envoyait faire tout le tour de la boucle.
   */
  it('les liens ne sont plus cliquables pendant le fondu du retrait', () => {
    expect(regle('.dissoudre-leave-active .reel')).toMatch(/pointer-events:\s*none/)
  })

  it('ÉCRIRE porte un href mailto dès le montage, pas au clic', () => {
    expect(lien(monter().wrapper, 'ÉCRIRE').attributes('href')).toMatch(/^mailto:/)
  })

  it('l’adresse n’apparaît pas en clair dans le source du composant', () => {
    // `liens.ts` est le fichier où l'adresse vit vraiment : on le garde aussi.
    for (const f of ['src/components/PanneauDeparts.vue', 'src/contenu/liens.ts']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(ADRESSE)
    }
  })

  it('l’adresse n’apparaît pas en clair dans le texte rendu', () => {
    const { wrapper } = monter()
    expect(wrapper.findAll('.ligne')).toHaveLength(5)
    expect(wrapper.text()).not.toMatch(ADRESSE)
    // Le href, lui, est un mailto: nécessaire : on regarde tout le reste.
    expect(wrapper.html()).toMatch(/href="mailto:[^"]*"/)
    const html = wrapper.html().replace(/href="mailto:[^"]*"/, '')
    expect(html).not.toMatch(ADRESSE)
  })

  it('les trois liens prennent le focus clavier, dans l’ordre du DOM', () => {
    const { wrapper } = monter()
    const liens = wrapper.findAll('a')
    expect(liens).toHaveLength(3)
    for (const a of liens) {
      expect(a.attributes('href')).toBeTruthy()
      expect(a.attributes('tabindex')).toBeUndefined()
    }
    for (const a of liens) {
      ;(a.element as HTMLElement).focus()
      expect(document.activeElement).toBe(a.element)
    }
    expect(liens.map((a) => a.text())).toEqual([
      expect.stringContaining('LINKEDIN'),
      expect.stringContaining('CV'),
      expect.stringContaining('ÉCRIRE'),
    ])
  })

  describe('les volets', () => {
    const posee = () => {
      vi.useFakeTimers()
      const f = cadreDe(1440, 900)
      return monter('ailleurs', { rideau: { y: yPoseA(f), baisse: true } })
    }
    const avancer = async (ms: number) => {
      vi.advanceTimersByTime(ms)
      await nextTick()
    }
    /**
     * L'état d'une cellule : sans couche elle est posée ; avec, elle est
     * blanche tant que son premier volet n'est pas parti.
     */
    const etat = (cellule: Element) => {
      const couche = cellule.querySelector('[data-volets]')
      if (!couche) return 'posee'
      const g = [...couche.querySelectorAll('[data-g]')].map((x) => x.getAttribute('data-g'))
      return g.every((x) => x === ' ') ? 'blanche' : 'tourne'
    }
    /** Les états des trois cellules de la ligne `i`. */
    const ligne = (wrapper: ReturnType<typeof monter>['wrapper'], i: number) => {
      const cellules = [...wrapper.findAll('.ligne')[i].element.children]
      expect(cellules).toHaveLength(3)
      return cellules.map(etat)
    }

    it('garde les trois href du premier au dernier tour de volet', async () => {
      const { wrapper } = posee()
      // Du montage jusqu'à la dernière lettre posée, par pas d'un quart de seconde.
      const fin = DEBUT_LIGNES_MS + 4 * ECART_LIGNES_MS + 20 * PAS_MS
      let tours = 0
      let vusTourner = 0
      for (let t = 0; t <= fin + 1000; t += 250) {
        expect(wrapper.findAll('a[href]'), `à ${t} ms`).toHaveLength(3)
        expect(wrapper.findAllComponents(RouterLink)).toHaveLength(1)
        expect(wrapper.get('a[href^="mailto:"]').attributes('href')).toMatch(/^mailto:/)
        // Le vrai texte des trois liens est là, lisible, à chaque instant.
        const textes = wrapper.findAll('a').map((a) => a.text())
        expect(textes[0]).toContain('LINKEDIN')
        expect(textes[1]).toContain('CV')
        expect(textes[2]).toContain('ÉCRIRE')
        if (wrapper.find('[data-volets]').exists()) vusTourner++
        tours++
        await avancer(250)
      }
      // Garde contre la boucle à vide : on a bien vu tourner, puis s'arrêter.
      expect(tours).toBeGreaterThan(10)
      expect(vusTourner).toBeGreaterThan(5)
      expect(wrapper.find('[data-volets]').exists()).toBe(false)
    })

    it('ne montre aucune lettre qui tourne à un lecteur d’écran', async () => {
      const { wrapper } = posee()
      let couchesVues = 0
      for (let t = 0; t < 40; t++) {
        for (const couche of wrapper.findAll('[data-volets]')) {
          couchesVues++
          expect(couche.attributes('aria-hidden')).toBe('true')
          // Les glyphes ne sont pas du texte : ni `textContent`, ni recherche, ni copie.
          expect(couche.text()).toBe('')
        }
        // Chaque morceau de vrai texte est lisible : aucun ancêtre n'est caché.
        for (const vrai of wrapper.findAll('[data-vrai]')) {
          expect(vrai.element.closest('[aria-hidden="true"]')).toBeNull()
        }
        await avancer(100)
      }
      // Sans couche à contrôler, la boucle ci-dessus n'aurait rien vérifié.
      expect(couchesVues).toBeGreaterThan(40)
    })

    it('pose le texte de haut en bas : chaque ligne part après la précédente, ses trois cellules ensemble', async () => {
      const { wrapper } = posee()
      await avancer(DEBUT_LIGNES_MS - PAS_MS)
      for (let i = 0; i < 5; i++) {
        // Trois couches par ligne, toutes encore blanches : une cellule déjà posée n'en a plus.
        expect(ligne(wrapper, i), `ligne ${i} avant le départ`).toEqual(['blanche', 'blanche', 'blanche'])
      }
      await avancer(3 * PAS_MS)
      for (let k = 0; k < 5; k++) {
        // La ligne k vient de partir : toutes ses cellules, et celles des lignes d'avant ;
        // celles d'après attendent encore leur écart.
        for (let i = 0; i < 5; i++) {
          const attendu = i <= k ? ['posee', 'tourne'] : ['blanche']
          for (const e of ligne(wrapper, i)) expect(attendu, `ligne ${i} à l'instant de la ligne ${k}`).toContain(e)
        }
        // La ligne k tourne vraiment (ou vient de se poser) : jamais blanche.
        expect(ligne(wrapper, k)).not.toContain('blanche')
        if (k < 4) await avancer(ECART_LIGNES_MS)
      }
    })

    it('pose l’en-tête avant les lignes, titre et heure ensemble', async () => {
      const { wrapper } = posee()
      await avancer(DEBUT_ENTETE_MS + 3 * PAS_MS)
      const entete = [...wrapper.get('.entete').element.children].map(etat)
      expect(entete).toHaveLength(2)
      expect(entete.every((e) => e === 'tourne')).toBe(true)
      for (let i = 0; i < 5; i++) expect(ligne(wrapper, i)).toEqual(['blanche', 'blanche', 'blanche'])
    })

    it('ne couvre que des caractères que le tambour porte', () => {
      const { wrapper } = posee()
      const caracteres = new Set(wrapper.findAll('[data-vrai]').map((v) => v.text()).join(''))
      // `text()` rogne les blancs ; l'inventaire n'en reste pas moins non vide.
      expect(caracteres.size).toBeGreaterThan(15)
      expect(wrapper.findAll('[data-vrai]').length).toBeGreaterThanOrEqual(17)
      expect([...caracteres].filter((c) => !ALPHABET.includes(c))).toEqual([])
    })

    it('fige les volets quand on a demandé moins d’animations', () => {
      stubReducedMotion(true)
      const { wrapper } = posee()
      expect(wrapper.find('[data-volets]').exists()).toBe(false)
      expect(wrapper.find('[data-vrai]').exists()).toBe(true)
      expect(wrapper.get('.ligne').text()).toContain('LINKEDIN')
      expect(vi.getTimerCount()).toBe(1)
    })

    it('tourne quand on n’a rien demandé', () => {
      stubReducedMotion(false)
      expect(posee().wrapper.find('[data-volets]').exists()).toBe(true)
    })

    it('se fige si le visiteur demande moins d’animations en cours de route', async () => {
      stubReducedMotion(false)
      const { wrapper } = posee()
      expect(wrapper.find('[data-volets]').exists()).toBe(true)
      expect(ecouteurs).toHaveLength(1)
      for (const f of ecouteurs) f({ matches: true })
      await nextTick()
      expect(wrapper.find('[data-volets]').exists()).toBe(false)
    })

    // Le visiteur qui avait demandé moins d'animations, puis qui lève le réglage
    // rideau baissé : le tableau doit se poser, pas rester blanc pour de bon.
    it('se met à tourner, puis se pose, si le visiteur lève la demande en cours de route', async () => {
      stubReducedMotion(true)
      const { wrapper } = posee()
      expect(wrapper.find('[data-volets]').exists()).toBe(false)
      for (const f of ecouteurs) f({ matches: false })
      await nextTick()
      expect(wrapper.findAll('[data-volets]')).toHaveLength(17)
      await avancer(5000)
      expect(wrapper.find('[data-volets]').exists()).toBe(false)
      expect(wrapper.findAll('.tourne')).toHaveLength(0)
      expect(wrapper.findAll('a[href]')).toHaveLength(3)
    })

    it('rend son écouteur au démontage', () => {
      stubReducedMotion(false)
      const { wrapper } = posee()
      expect(ecouteurs).toHaveLength(1)
      wrapper.unmount()
      expect(ecouteurs).toHaveLength(0)
    })

    it('rejoue ses volets à chaque descente du rideau', async () => {
      const { wrapper, rideau } = posee()
      await avancer(10_000)
      expect(wrapper.find('[data-volets]').exists()).toBe(false)
      const f = cadreDe(1440, 900)
      rideau.value = { y: yRangeA(f), baisse: false }
      await nextTick()
      expect(wrapper.find('.panneau').exists()).toBe(false)
      rideau.value = { y: yPoseA(f), baisse: true }
      await nextTick()
      expect(wrapper.find('[data-volets]').exists()).toBe(true)
    })

    // Le fondu d'entrée de 1,2 s se jouait pendant la descente de 1,45 s et
    // faisait fondre le texte sur la plaque : ce sont les volets, désormais,
    // qui font entrer le texte. Le fondu de sortie, lui, protège le CV (voir plus haut).
    it('ne fond plus à l’entrée, les volets la font', () => {
      expect(source()).not.toMatch(/dissoudre-enter/)
      expect(source()).toMatch(/dissoudre-leave-active \.reel/)
    })
  })

  /**
   * La place du texte est celle de la plaque : `offset + position × scale`, avec
   * la position que la scène **émet** — pas `RIDEAU.yPose`. Deux positions et
   * deux cadres, pour qu'aucune constante ne puisse passer pour la bonne.
   */
  const place = (wrapper: ReturnType<typeof monter>['wrapper']) => {
    const s = (wrapper.get('.panneau').element as HTMLElement).style
    return { left: parseFloat(s.left), top: parseFloat(s.top), width: s.width, height: s.height, transform: s.transform }
  }

  it('se pose sur la position que la scène émet, pas sur une constante', async () => {
    const f = cadreDe(1440, 900)
    const { wrapper, rideau } = monter('ailleurs', { rideau: { y: 120, baisse: true } })
    expect(place(wrapper).top).toBeCloseTo(f.offsetY + 120 * f.scale)
    // La plaque descend : le texte la suit, image par image.
    rideau.value = { y: 200, baisse: true }
    await nextTick()
    expect(place(wrapper).top).toBeCloseTo(f.offsetY + 200 * f.scale)
    expect(200 * f.scale).not.toBeCloseTo(RIDEAU.yPose * f.scale)
  })

  it('le texte reste dans son cadre après un redimensionnement', async () => {
    const f1 = cadreDe(1440, 900)
    // Le haut de la scène est descendu : sans ce retrait le test ne verrait pas `offsetY`.
    expect(f1.offsetY).toBeGreaterThan(0)
    const { wrapper, cadre, rideau } = monter()
    const y = (rideau.value as EtatRideau).y
    // Centré sur la **fenêtre**, pas posé à une abscisse de cadre : c'est ce qui
    // le fait tomber sur l'horloge, qui est au milieu de la scène.
    expect(place(wrapper).left).toBeCloseTo((1440 - RIDEAU.largeur * f1.scale) / 2)
    expect(place(wrapper).top).toBeCloseTo(f1.offsetY + y * f1.scale)
    expect(place(wrapper).transform).toBe(`scale(${f1.scale})`)
    // Le texte garde sa taille de cadre et c'est la transformation qui l'échelonne :
    // largeur et hauteur sont celles du rideau, jamais multipliées.
    expect(place(wrapper).width).toBe(`${RIDEAU.largeur}px`)
    expect(place(wrapper).height).toBe(`${RIDEAU.hauteur}px`)

    // Une fenêtre trop étroite pour la plaque à cette échelle : c'est la fenêtre
    // moins ses deux gouttières qui décide, et la plaque reste centrée dessus.
    const f2 = cadreDe(800, 1000)
    expect(f2.offsetY).toBeGreaterThan(0)
    expect(RIDEAU.largeur * f2.scale).toBeGreaterThan(800 - 2 * GOUTTIERE)
    cadre.value = f2
    window.innerWidth = 800
    // La scène recadre le rideau dans la foulée : `y` suit le nouveau cadre.
    rideau.value = { y: yPoseA(f2), baisse: true }
    await nextTick()
    expect(place(wrapper).left).toBeCloseTo(GOUTTIERE)
    expect(parseFloat(place(wrapper).width) * f2.scale).toBeCloseTo(800 - 2 * GOUTTIERE)
    expect(place(wrapper).top).toBeCloseTo(f2.offsetY + yPoseA(f2) * f2.scale)
    expect(place(wrapper).transform).toBe(`scale(${f2.scale})`)
    expect(f2.scale).not.toBeCloseTo(f1.scale)
  })

  // Le texte est posé par son coin haut-gauche puis mis à l'échelle : sans
  // cette origine, `scale()` le rétrécit autour de son centre et le coin se décale.
  it('met le texte à l’échelle depuis son coin haut-gauche', () => {
    expect(regle('.panneau')).toMatch(/transform-origin:\s*0 0\s*;/)
  })

  it('n’affiche rien tant que la scène n’a pas émis la position du rideau', () => {
    expect(monter('ailleurs', { rideau: null }).wrapper.find('.panneau').exists()).toBe(false)
  })

  it('ne se pose pas sans cadre, même si le rideau est là', () => {
    const { wrapper } = monter('ailleurs', { frame: null, rideau: { y: RIDEAU.yPose, baisse: true } })
    expect(wrapper.find('.panneau').exists()).toBe(false)
  })

  it('apparaît dès que la scène baisse le rideau, avant que la plaque ne soit arrivée', async () => {
    const f = cadreDe(1440, 900)
    const { wrapper, rideau } = monter('ailleurs', { rideau: { y: yRangeA(f), baisse: false } })
    expect(wrapper.find('.panneau').exists()).toBe(false)
    // Le geste : `baisse` passe à vrai, la plaque est encore toute rangée.
    rideau.value = { y: yRangeA(f), baisse: true }
    await nextTick()
    expect(wrapper.find('.panneau').exists()).toBe(true)
    expect(wrapper.get('.panneau').classes()).not.toContain('remonte')
  })

  /**
   * Le visiteur part en laissant le rideau baissé : il doit remonter, et ses
   * liens cesser d'être cliquables pendant ce temps-là. Ici la scène n'a pas
   * encore répondu au départ — `baisse` est encore vrai — et c'est `enRoute`
   * qui fait la remontée.
   */
  it('laisse le rideau remonter au départ au lieu de disparaître d’un coup', async () => {
    const f = cadreDe(1440, 900)
    const { wrapper, voyage } = monter('ailleurs', { rideau: { y: yPoseA(f), baisse: true } })
    expect(wrapper.get('.panneau').classes()).not.toContain('remonte')
    voyage.partirVers('ici')
    await nextTick()
    expect(wrapper.find('.panneau').exists()).toBe(true)
    expect(wrapper.get('.panneau').classes()).toContain('remonte')
  })

  it('remonte aussi quand c’est la scène qui a relevé le rideau, plaque encore en vue', async () => {
    const f = cadreDe(1440, 900)
    const milieu = (yPoseA(f) + yRangeA(f)) / 2
    const { wrapper, voyage, rideau } = monter('ailleurs', { rideau: { y: yPoseA(f), baisse: true } })
    voyage.partirVers('ici')
    rideau.value = { y: milieu, baisse: false }
    await nextTick()
    expect(wrapper.find('.panneau').exists()).toBe(true)
    expect(wrapper.get('.panneau').classes()).toContain('remonte')
  })

  // Sans départ : un clic sur l'horloge relève le rideau, et les liens ne sont
  // pas plus cliquables pour autant — ils s'en vont avec la plaque.
  it('remonte aussi à quai quand le visiteur range le rideau', async () => {
    const f = cadreDe(1440, 900)
    const { wrapper, rideau } = monter('ailleurs', { rideau: { y: yPoseA(f), baisse: true } })
    rideau.value = { y: (yPoseA(f) + yRangeA(f)) / 2, baisse: false }
    await nextTick()
    expect(wrapper.get('.panneau').classes()).toContain('remonte')
  })

  /**
   * `pointer-events: none` ne ferme ni la tabulation ni l'Entrée : pendant la
   * remontée les liens sont retirés du parcours, pas seulement du pointeur.
   *
   * Mais `inert` est posé sur les **lignes**, qui portent les trois seuls
   * focalisables, et **jamais sur la plaque** : un nœud `inert` cesse d'être visé
   * par le pointeur, exactement comme `pointer-events: none`. Une plaque inerte
   * aurait laissé, pendant les 1,45 s de la remontée, tout appui qui tombe
   * dessus filer jusqu'à `window` — donc jusqu'à `Scene.clicPx`, qui aurait
   * éteint le réverbère qu'elle recouvre encore (la lampe n'a pas de règle
   * d'arrêt) ou rebaissé le rideau sur l'horloge. jsdom ne modélise ni le test
   * de survol ni `inert` : cette garde est **structurelle**, elle tient la place
   * de l'attribut, pas son effet.
   */
  it('rend les lignes inertes pendant la remontée, et laisse la plaque dans le chemin du pointeur', async () => {
    const f = cadreDe(1440, 900)
    const { wrapper, rideau } = monter('ailleurs', { rideau: { y: yPoseA(f), baisse: true } })
    expect(wrapper.get('.lignes').attributes('inert')).toBeUndefined()
    expect(wrapper.get('.panneau').attributes('inert')).toBeUndefined()
    rideau.value = { y: (yPoseA(f) + yRangeA(f)) / 2, baisse: false }
    await nextTick()
    expect(wrapper.get('.lignes').attributes('inert')).toBeDefined()
    expect(wrapper.get('.panneau').attributes('inert')).toBeUndefined()
  })

  it('s’efface une fois que la plaque est sortie de la fenêtre', async () => {
    const f = cadreDe(1440, 900)
    const { wrapper, voyage, rideau } = monter('ailleurs', { rideau: { y: yPoseA(f), baisse: true } })
    voyage.partirVers('ici')
    rideau.value = { y: yRangeA(f) + 30, baisse: false }
    await nextTick()
    expect(wrapper.find('.panneau').exists()).toBe(true)
    rideau.value = { y: yRangeA(f), baisse: false }
    await nextTick()
    // Sous le Transition factice des tests, le retrait est immédiat.
    expect(wrapper.find('.panneau').exists()).toBe(false)
  })

  /*
   * Les deux gardes qui suivent lisent le **source** et non la boîte rendue :
   * `@vue/test-utils` sous jsdom n'injecte pas les styles `scoped` du SFC, et
   * jsdom ne met de toute façon rien en page. `getComputedStyle` rendrait vide,
   * et un test qui l'interroge passerait quoi qu'on écrive.
   */
  const source = () => readFileSync('src/components/PanneauDeparts.vue', 'utf8')
  const regle = (nom: string) => {
    const texte = source()
    const i = texte.indexOf(`${nom} {`)
    // Une règle absente ferait lire le dernier caractère du fichier : on le dit.
    expect(i, `pas de règle ${nom}`).toBeGreaterThanOrEqual(0)
    return texte.slice(i, texte.indexOf('}', i))
  }
  /**
   * Cinq lignes dans la hauteur du cadre, et pas de vide sous la dernière.
   * jsdom ne met rien en page, donc on ne peut pas le mesurer — le panneau
   * **déclare** son budget en trois propriétés et le test fait l'addition.
   * C'est une limite : il garde le budget déclaré, pas la hauteur réellement
   * rendue — une ligne dont la `height` serait fixée ailleurs ne le trompe pas
   * moins.
   *
   * Il n'y a qu'**une** marge dans l'addition, celle du bas : celle du haut est
   * annulée par la marge négative du bandeau, qui affleure le bord du cadre.
   * L'addition en comptait deux, et surestimait le contenu de quatorze pixels —
   * c'est ce qui laissait le cadre traîner sous la dernière ligne sans que rien
   * ne le dise.
   */
  it('tient dans la hauteur du cadre, sans vide sous la dernière ligne', () => {
    const px = (prop: string) => {
      const m = new RegExp(`${prop}:\\s*([\\d.]+)px`).exec(source())
      expect(m, `pas de ${prop} en pixels`).not.toBeNull()
      return Number(m![1])
    }
    const contenu = px('--entete') + 5 * px('--ligne') + px('--marge')
    expect(contenu).toBeLessThanOrEqual(RIDEAU.hauteur)
    expect(RIDEAU.hauteur - contenu).toBeLessThanOrEqual(4)
  })

  /**
   * Les points de conduite entre la destination et le quai, comme sur un
   * indicateur imprimé. Ce sont des points **dessinés** et non une chaîne de
   * caractères : un `content: '......'` serait lu à voix haute par un lecteur
   * d'écran, sur chacune des cinq lignes, entre la destination et son statut.
   */
  it('conduit la destination au quai par des points dessinés, pas écrits', () => {
    const regleApres = regle('.ligne > span:nth-child(2)::after')
    expect(regleApres).toContain("content: ''")
    expect(regleApres).toMatch(/radial-gradient/)
  })

  it('ne met aucun point dans le texte lu des lignes', () => {
    const { wrapper } = monter()
    const lignes = wrapper.findAll('.ligne')
    expect(lignes).toHaveLength(5)
    for (const ligne of lignes) {
      expect(ligne.text()).not.toMatch(/\.\./)
    }
  })

  /** Le filet pointillé a été retiré : plus rien ne coupe la liste en deux. */
  it('ne coupe plus la liste par un filet', () => {
    expect(source()).not.toMatch(/dotted/)
  })


  /**
   * Pendant la remontée, les trois liens ne reçoivent plus le pointeur. Même
   * bug que le fondu du départ ci-dessus, sur une durée plus longue : cliquer
   * `CV` sur une plaque qui s'en va poussait `/ailleurs/cv` sur un train déjà
   * en marche. La règle est plus spécifique que `.reel { pointer-events: auto }`.
   */
  it('coupe le pointeur des trois liens pendant la remontée', () => {
    expect(regle('.remonte .reel')).toMatch(/pointer-events:\s*none/)
  })

  /**
   * Les points de conduite doivent être **pleins ou absents**, comme tout le
   * reste du décor : deux butées écartées de 0,2 px feraient de chaque point un
   * petit dégradé, c'est-à-dire la mi-teinte que la décision 12.2 refuse — et
   * cette fois écrite à la main, pas laissée à l'anticrénelage.
   */
  it('dessine ses points à butées franches, sans rampe', () => {
    const apres = regle('.ligne > span:nth-child(2)::after')
    const butees = /radial-gradient\(circle, currentColor ([\d.]+)px, transparent ([\d.]+)px\)/.exec(apres)
    expect(butees, 'les deux butées du dégradé').not.toBeNull()
    expect(Number(butees![1])).toBe(Number(butees![2]))
  })

  it('creuse son en-tête dans un bandeau plein, aux couleurs du thème', () => {
    const entete = regle('.entete')
    expect(entete).toContain('background: var(--texte)')
    expect(entete).toContain('color: var(--fond)')
    // L'œil fait tourner trois couleurs de nuit : rien de figé ne doit traîner.
    expect(entete).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('le bandeau va d’un bord intérieur à l’autre, malgré la marge du panneau', () => {
    // Le retrait latéral est déclaré **une fois**, et le bandeau l'annule avec
    // la même variable : deux nombres qui s'accordent aujourd'hui pourraient
    // diverger demain sans que rien ne le dise.
    expect(regle('.panneau')).toMatch(/--creux:\s*[\d.]+px/)
    const entete = regle('.entete')
    expect(entete).toContain('margin-left: calc(-1 * var(--creux))')
    expect(entete).toContain('margin-right: calc(-1 * var(--creux))')
    expect(entete).toContain('padding-left: var(--creux)')
  })
})

/**
 * La commande clavier du rideau : un bouton posé sur l'horloge du canvas. Les
 * trois seuls liens du site vivent sur le panneau ; sans lui, personne ne les
 * atteint sans souris.
 */
describe('PanneauDeparts — la commande du rideau', () => {
  const source = () => readFileSync('src/components/PanneauDeparts.vue', 'utf8')
  const regle = (nom: string) => {
    const texte = source()
    const i = texte.indexOf(`${nom} {`)
    expect(i, `pas de règle ${nom}`).toBeGreaterThanOrEqual(0)
    return texte.slice(i, texte.indexOf('}', i))
  }
  const commande = (wrapper: ReturnType<typeof monter>['wrapper']) => wrapper.get('[data-commande]')

  it('offre une commande focalisable qui nomme le panneau', () => {
    const bouton = commande(monter().wrapper)
    expect(bouton.attributes('aria-label')).toMatch(/départs/i)
  })

  /**
   * Le bouton et la région du panneau portent le **même nom** — c'est le texte
   * d'Emmanuelle, et on n'y touche pas. Rien ne disait pour autant au lecteur
   * d'écran que l'un commande l'autre : `aria-expanded` donne l'état,
   * `aria-controls` dit de quoi c'est l'état.
   *
   * Il n'est posé que quand la région est là : rideau rangé, le panneau est retiré
   * du DOM (ses liens avec lui), et un renvoi vers un `id` absent ne renseigne
   * personne. L'`id` est cherché **dans le montage** : ces tests attachent au
   * document sans démonter, et un panneau d'un test précédent traîne encore.
   */
  it('dit quelle région elle commande, tant que cette région est là', async () => {
    const f = cadreDe(1440, 900)
    const { wrapper, rideau } = monter('ailleurs', { frame: f, rideau: { y: yPoseA(f), baisse: true } })
    const region = wrapper.get('[role="region"]')
    const id = region.attributes('id')
    expect(id, 'la région du panneau n’a pas d’id').toBeTruthy()
    expect(commande(wrapper).attributes('aria-controls')).toBe(id)
    // Le nom, lui, ne change pas : il est le même des deux côtés, et c'est voulu.
    expect(region.attributes('aria-label')).toBe('Prochains départs')

    rideau.value = { y: yRangeA(f), baisse: false }
    await nextTick()
    expect(wrapper.find('[role="region"]').exists()).toBe(false)
    expect(commande(wrapper).attributes('aria-controls')).toBeUndefined()
  })

  // Un `<button>` n'a pas d'attribut `tabindex` : on éprouve le focus lui-même.
  it('prend le focus clavier à quai, pas en route', () => {
    const bouton = commande(monter().wrapper).element as HTMLElement
    bouton.focus()
    expect(document.activeElement).toBe(bouton)
    bouton.blur()
    const enRoute = commande(monter('enRoute').wrapper).element as HTMLElement
    enRoute.focus()
    expect(document.activeElement).toBe(document.body)
  })

  // Entrée et Espace déclenchent `click` sur un vrai bouton : un `@keydown.enter`
  // de plus ferait deux bascules, le rideau descendrait et remonterait aussitôt.
  it('est un vrai bouton, donc Entrée et Espace le déclenchent', () => {
    const bouton = commande(monter().wrapper)
    expect(bouton.element.tagName).toBe('BUTTON')
    expect(bouton.attributes('type')).toBe('button')
  })

  it('bascule le rideau au clic, par la scène', async () => {
    const { wrapper, scene } = monter()
    await commande(wrapper).trigger('click')
    expect(scene.basculerRideau).toHaveBeenCalled()
  })

  /**
   * `useScene` écoute `pointerdown` sur `window` et appelle `clicPx`, qui bascule
   * le rideau si l'appui tombe sur l'horloge — et le bouton couvre exactement
   * cette aire. Sans `.stop`, un appui fait deux bascules (appui puis `click`) :
   * le rideau descend et remonte aussitôt. `window` imite `surAppui` ici.
   */
  it('ne bascule qu’une fois pour un appui de souris suivi de son clic', async () => {
    const { wrapper, scene } = monter()
    const surAppui = () => scene.basculerRideau()
    window.addEventListener('pointerdown', surAppui)
    try {
      const bouton = commande(wrapper)
      await bouton.trigger('pointerdown')
      await bouton.trigger('click')
    } finally {
      window.removeEventListener('pointerdown', surAppui)
    }
    expect(scene.basculerRideau).toHaveBeenCalledTimes(1)
  })

  it('ne bascule pas sur une touche : le clic natif du bouton suffit', async () => {
    const { wrapper, scene } = monter()
    await commande(wrapper).trigger('keydown', { key: 'Enter' })
    await commande(wrapper).trigger('keydown', { key: ' ' })
    expect(scene.basculerRideau).not.toHaveBeenCalled()
  })

  it('dit l’état du rideau, et le suit', async () => {
    const { wrapper, rideau } = monter('ailleurs', { rideau: { y: 10, baisse: true } })
    expect(commande(wrapper).attributes('aria-expanded')).toBe('true')
    rideau.value = { y: -400, baisse: false }
    await nextTick()
    expect(commande(wrapper).attributes('aria-expanded')).toBe('false')
  })

  it('garde le même nom quel que soit l’état', async () => {
    const { wrapper, rideau } = monter('ailleurs', { rideau: { y: 10, baisse: true } })
    const avant = commande(wrapper).attributes('aria-label')
    rideau.value = { y: -400, baisse: false }
    await nextTick()
    expect(commande(wrapper).attributes('aria-label')).toBe(avant)
  })

  // C'est quand la plaque est rangée qu'on a besoin de la commande.
  it('existe rideau rangé, quand le panneau est absent', async () => {
    const frame = cadreDe(1440, 900)
    const { wrapper, scene } = monter('ailleurs', { rideau: { y: yRangeA(frame), baisse: false } })
    expect(wrapper.find('.panneau').exists()).toBe(false)
    await commande(wrapper).trigger('click')
    expect(scene.basculerRideau).toHaveBeenCalledTimes(1)
  })

  it('n’existe pas hors d’« ailleurs »', () => {
    expect(monter('ici').wrapper.find('[data-commande]').exists()).toBe(false)
  })

  it('n’existe pas tant que le cadre manque', () => {
    expect(monter('ailleurs', { frame: null }).wrapper.find('[data-commande]').exists()).toBe(false)
  })

  /**
   * La transition, sur **un seul** montage : deux composants montés côte à côte
   * disaient que deux états rendent deux boutons, jamais que le même bouton suit
   * le train. Or c'est là qu'était le défaut — `voyage.gare` reste « ailleurs »
   * tout le temps de l'étape qui suit le départ (jusqu'au premier `finirEtape`,
   * ≈ 9 s), et la commande restait à l'écran sans répondre.
   */
  it('se désactive au départ et se réactive à l’arrivée, sans changer de bouton', async () => {
    const { wrapper, voyage, scene } = monter()
    const bouton = () => wrapper.get('[data-commande]')
    const noeud = bouton().element
    expect(bouton().attributes('disabled')).toBeUndefined()

    voyage.partirVers('ici')
    await nextTick()
    // La gare ne change qu'à la fin de l'étape : le bouton est encore là, inerte.
    expect(voyage.gare).toBe('ailleurs')
    expect(bouton().element).toBe(noeud)
    expect(bouton().attributes('disabled')).toBeDefined()

    // Étape faite : on n'est plus « ailleurs », la commande n'a plus rien à commander.
    voyage.finirEtape()
    await nextTick()
    expect(voyage.gare).toBe('ici')
    expect(wrapper.find('[data-commande]').exists()).toBe(false)

    // Le tour de la boucle, jusqu'à revenir à quai à « ailleurs ».
    voyage.partirVers('ailleurs')
    for (let i = 0; i < 3; i++) voyage.finirEtape()
    await nextTick()
    expect([voyage.gare, voyage.enRoute]).toEqual(['ailleurs', false])
    expect(bouton().attributes('disabled')).toBeUndefined()
    await bouton().trigger('click')
    expect(scene.basculerRideau).toHaveBeenCalledTimes(1)
  })

  /**
   * Un bouton `disabled` reste touché par le test de survol du navigateur et
   * **avale** l'événement sans le laisser remonter. En rendu attaché la commande
   * est un disque invisible de ~103 px posé à la **place d'arrêt** de l'horloge ;
   * le train parti, la gare défile mais le disque reste, et pendant toute l'étape
   * un trou invisible mangeait les clics — donc les bulles des étoiles qui y
   * tombaient. Désactivée, elle laisse passer.
   *
   * Source et non boîte rendue : jsdom n'injecte pas les styles `scoped` et ne
   * fait aucun test de survol (voir les deux gardes plus haut). Aucune des règles
   * qui suivent — `.commande.visible`, `.commande.sur-bandeau` — ne parle du
   * pointeur : rien ne vient l'écraser.
   */
  it('laisse passer les clics quand elle est désactivée', () => {
    expect(regle('.commande:disabled')).toMatch(/pointer-events:\s*none/)
  })

  /**
   * La souris et le clavier doivent viser la même chose : l'aire du bouton est
   * celle de `horlogeTouchee`, vue par l'écran. On remonte du style du bouton
   * au repère du cadre, et on interroge la fonction du canvas au ras du bord.
   */
  it('couvre exactement la cible de l’horloge du canvas, panneau rangé', () => {
    const f = cadreDe(1440, 900)
    const { wrapper } = monter('ailleurs', { frame: f, rideau: { y: yRangeA(f), baisse: false } })
    const s = (commande(wrapper).element as HTMLElement).style
    const largeur = parseFloat(s.width)
    expect(parseFloat(s.height)).toBeCloseTo(largeur)
    const centreX = (parseFloat(s.left) + largeur / 2 - f.offsetX) / f.scale
    const centreY = (parseFloat(s.top) + largeur / 2 - f.offsetY) / f.scale
    expect(centreX).toBeCloseTo(HORLOGE.x)
    expect(centreY).toBeCloseTo(HORLOGE.y)
    const rayon = largeur / 2 / f.scale
    expect(rayon).toBeCloseTo(HORLOGE.rayon * HALO_HORLOGE.rayon)
    // Au ras du bord, dans les quatre directions : dedans d'un côté, dehors de l'autre.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      expect(horlogeTouchee(centreX + dx * (rayon - 0.05), centreY + dy * (rayon - 0.05))).toBe(true)
      expect(horlogeTouchee(centreX + dx * (rayon + 0.05), centreY + dy * (rayon + 0.05))).toBe(false)
    }
    // En diagonale : à 0,8 rayon sur chaque axe on est à ~1,13 rayon du centre,
    // hors du disque mais dans la boîte englobante qu'une cible carrée accepterait.
    const d = rayon * 0.8
    expect(horlogeTouchee(centreX + d, centreY + d)).toBe(false)
    expect(horlogeTouchee(centreX + (rayon - 0.05) * Math.SQRT1_2, centreY + (rayon - 0.05) * Math.SQRT1_2)).toBe(true)
    // Le bouton est rond comme la cible, pas un carré aux coins en trop.
    expect(regle('.commande')).toMatch(/border-radius:\s*50%/)
  })

  it('suit le cadre quand la fenêtre change, posée sur l’horloge', async () => {
    const f = cadreDe(1440, 900)
    const { wrapper, cadre } = monter('ailleurs', { frame: f, rideau: { y: yRangeA(f), baisse: false } })
    const avant = parseFloat((commande(wrapper).element as HTMLElement).style.width)
    cadre.value = cadreDe(900, 700)
    await nextTick()
    expect(parseFloat((commande(wrapper).element as HTMLElement).style.width)).not.toBeCloseTo(avant)
  })

  // Transparente, mais jamais retirée de la tabulation.
  it('est invisible sans quitter la tabulation, et se voit au focus', () => {
    const r = regle('.commande')
    expect(r).toMatch(/position:\s*fixed/)
    expect(r).toMatch(/cursor:\s*pointer/)
    expect(r).toMatch(/background:\s*transparent/)
    expect(r).toMatch(/border:\s*0|border:\s*none/)
    expect(source()).not.toMatch(/\.commande[^{]*\{[^}]*(display:\s*none|visibility:\s*hidden)/)
    expect(regle('.commande:focus-visible')).toMatch(/outline:\s*[^;]*\S/)
    expect(regle('.commande:focus-visible')).not.toMatch(/outline:\s*(none|0)/)
  })
})


/**
 * Le panneau a quitté le canvas : il n'y a plus qu'un rendu, celui du DOM, et
 * c'est lui qui porte la plaque — à l'échelle du cadre, centré sur la fenêtre,
 * devant la frise et sous le CV.
 *
 * Les quatre premières gardes sont celles de la spec §4 ; la cinquième est le
 * Review Focus nº 1, le redimensionnement en pleine descente.
 */
describe('PanneauDeparts — la plaque est le panneau', () => {
  const source = () => readFileSync('src/components/PanneauDeparts.vue', 'utf8')
  const regle = (nom: string) => {
    const texte = source()
    const i = texte.indexOf(`${nom} {`)
    expect(i, `pas de règle ${nom}`).toBeGreaterThanOrEqual(0)
    return texte.slice(i, texte.indexOf('}', i))
  }
  /** Les déclarations d'une règle, commentaires retirés. */
  const declarations = (nom: string) => regle(nom).replace(/\/\*[\s\S]*?\*\//g, '')

  /** La boîte du panneau **à l'écran** : le style en ligne est en pixels de cadre, l'échelle est dans le `transform`. */
  const boite = (wrapper: ReturnType<typeof monter>['wrapper']) => {
    const s = (wrapper.get('.panneau').element as HTMLElement).style
    const echelle = /^scale\(([\d.]+)\)$/.exec(s.transform)
    expect(echelle, `le panneau n’est pas mis à l’échelle du cadre : « ${s.transform} »`).not.toBeNull()
    const e = Number(echelle![1])
    const gauche = parseFloat(s.left)
    const haut = parseFloat(s.top)
    return {
      echelle: e,
      gauche,
      haut,
      droite: gauche + parseFloat(s.width) * e,
      bas: haut + parseFloat(s.height) * e,
    }
  }

  /** La cible de l'horloge, en pixels d'écran : le halo, celui que `horlogeTouchee` teste. */
  const cibleHorloge = (f: Frame) => {
    const r = HORLOGE.rayon * HALO_HORLOGE.rayon * f.scale
    return {
      gauche: f.offsetX + HORLOGE.x * f.scale - r,
      droite: f.offsetX + HORLOGE.x * f.scale + r,
      haut: f.offsetY + HORLOGE.y * f.scale - r,
      bas: f.offsetY + HORLOGE.y * f.scale + r,
    }
  }

  /**
   * Toutes les tailles, et pas seulement les trois du bureau : c'est sous le
   * seuil mobile que l'ancien rendu de 220 px cessait de couvrir l'horloge, et
   * au-delà de 1920 qu'il y aurait cessé s'il avait été promu tel quel.
   */
  const TOUTES: ReadonlyArray<readonly [number, number]> = [
    [320, 568], [390, 844], [430, 932], [719, 500], [1024, 768],
    [1512, 771], [1920, 1080], [2560, 1440], [3440, 800],
  ]

  it.each(TOUTES)('le panneau couvre la cible de l’horloge à %i × %i', (w, h) => {
    const f = cadreDe(w, h)
    const { wrapper } = monter('ailleurs', { frame: f, largeur: w, rideau: { y: yPoseA(f), baisse: true } })
    const p = boite(wrapper)
    const c = cibleHorloge(f)
    expect(p.gauche, 'bord gauche').toBeLessThanOrEqual(c.gauche)
    expect(p.droite, 'bord droit').toBeGreaterThanOrEqual(c.droite)
    expect(p.haut, 'bord haut').toBeLessThanOrEqual(c.haut)
    expect(p.bas, 'bord bas').toBeGreaterThanOrEqual(c.bas)
  })

  it.each(TOUTES)('le panneau tient entre deux gouttières à %i × %i', (w, h) => {
    const f = cadreDe(w, h)
    const { wrapper } = monter('ailleurs', { frame: f, largeur: w, rideau: { y: yPoseA(f), baisse: true } })
    const p = boite(wrapper)
    expect(p.gauche).toBeGreaterThanOrEqual(0)
    expect(w - p.droite).toBeGreaterThanOrEqual(0)
    // Centré sur la fenêtre : c'est ce qui le fait tomber sur l'horloge, qui est
    // au milieu de la scène, donc au milieu de la fenêtre à toute taille.
    expect(p.gauche).toBeCloseTo(w - p.droite, 6)
  })

  /**
   * « Un canvas ne peut jamais passer devant un élément du DOM » : la frise en
   * est un, et c'est toute la raison de cette tâche. Les deux nombres sont lus
   * dans leurs sources, jamais recopiés.
   */
  it('le panneau passe devant la frise', () => {
    const frise = /z-index:\s*(\d+)/.exec(readFileSync('src/components/NavFrise.vue', 'utf8'))
    expect(frise, 'pas de z-index dans NavFrise').not.toBeNull()
    const panneau = /z-index:\s*(\d+)/.exec(declarations('.panneau'))
    expect(panneau, 'le panneau ne déclare pas de z-index').not.toBeNull()
    expect(Number(panneau![1])).toBeGreaterThan(Number(frise![1]))
  })

  it('le panneau reste sous le CV', () => {
    const cv = /z-index:\s*(\d+)/.exec(readFileSync('src/components/CvLigne.vue', 'utf8'))
    expect(cv, 'pas de z-index dans CvLigne').not.toBeNull()
    const panneau = /z-index:\s*(\d+)/.exec(declarations('.panneau'))
    expect(Number(panneau![1])).toBeLessThan(Number(cv![1]))
  })

  /** Et sa commande passe devant lui, sinon le panneau la recouvrirait. */
  it('la commande du panneau passe devant le panneau, et reste sous le CV', () => {
    const cv = Number(/z-index:\s*(\d+)/.exec(readFileSync('src/components/CvLigne.vue', 'utf8'))![1])
    const panneau = Number(/z-index:\s*(\d+)/.exec(declarations('.panneau'))![1])
    // Sur le bandeau, et là seulement : posée sur l'horloge elle est un disque
    // invisible en plein ciel, qu'un `z-index` ferait passer devant les bulles.
    expect(declarations('.commande')).not.toMatch(/z-index/)
    const commande = /z-index:\s*(\d+)/.exec(declarations('.commande.sur-bandeau'))
    expect(commande, 'la commande posée sur le bandeau ne déclare pas de z-index').not.toBeNull()
    expect(Number(commande![1])).toBeGreaterThan(panneau)
    expect(Number(commande![1])).toBeLessThan(cv)
  })

  /**
   * Coins droits (spec §4, but nº 4) : plus de biseau, nulle part. Le
   * `clip-path` du bandeau s'en va avec lui — laissé avec un `--biseau`
   * indéfini il tomberait en silence, et une garde qui ne regarderait que
   * `.panneau` passerait quand même.
   */
  it('les coins sont droits', () => {
    expect(declarations('.panneau')).not.toMatch(/--biseau/)
    expect(declarations('.panneau')).not.toMatch(/clip-path|border-radius/)
    const sansCommentaires = source().replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
    expect(sansCommentaires).not.toMatch(/--biseau/)
    expect(declarations('.entete')).not.toMatch(/clip-path/)
  })

  /**
   * **Review Focus nº 1.** La fenêtre change pendant que le panneau descend : il
   * suit sa **fraction** de course et ne vise pas un `y` périmé. À fraction
   * égale, le haut du panneau est à la même fraction de sa course d'écran —
   * c'est la propriété, et elle vaut pour les deux cadres.
   */
  it('un redimensionnement en pleine descente ne fait pas sauter le panneau', async () => {
    const f1 = cadreDe(1512, 771)
    const f2 = cadreDe(800, 1000)
    expect(f2.scale).not.toBeCloseTo(f1.scale)
    // La course du haut du panneau à l'écran, d'un cadre donné.
    const course = (f: Frame) => ({
      range: f.offsetY + yRangeA(f) * f.scale,
      pose: f.offsetY + yPoseA(f) * f.scale,
    })
    // Le `y` que la scène émet à cette fraction : `Rideau.y` interpole la
    // fraction entre la rangée et la pose **du cadre courant**.
    const yA = (f: Frame, p: number) => yRangeA(f) * (1 - p) + yPoseA(f) * p
    const P = 0.4
    const { wrapper, cadre, rideau } = monter('ailleurs', {
      frame: f1,
      largeur: 1512,
      rideau: { y: yA(f1, P), baisse: true },
    })
    const haut = () => parseFloat(wrapper.get<HTMLElement>('.panneau').element.style.top)
    const fraction = (f: Frame) => {
      const c = course(f)
      return (haut() - c.range) / (c.pose - c.range)
    }
    expect(fraction(f1)).toBeCloseTo(P, 6)
    // La fenêtre change : la scène recadre et réémet, à la même fraction.
    window.innerWidth = 800
    cadre.value = f2
    rideau.value = { y: yA(f2, P), baisse: true }
    await nextTick()
    expect(fraction(f2)).toBeCloseTo(P, 6)
    // Et ce n'est pas la même place à l'écran : le test verrait un panneau figé.
    expect(haut()).not.toBeCloseTo(course(f1).range * (1 - P) + course(f1).pose * P, 1)
  })
})

/**
 * Ce que le DOM dessine maintenant qu'il dessine tout : les deux bras, le disque
 * de la commande posé sur l'heure du bandeau, et la largeur d'une ligne une fois
 * la plaque bornée par la fenêtre.
 *
 * jsdom ne met rien en page : ces tests gardent le style émis et le source des
 * règles — pas le rendu réel, que personne n'a regardé. Les mesures du style
 * sont en pixels de **cadre** (le `transform` les met à l'échelle) ; celles du
 * bouton, qui vit hors de la plaque, en pixels d'écran.
 */
describe('PanneauDeparts — ce que le DOM dessine', () => {
  const source = () => readFileSync('src/components/PanneauDeparts.vue', 'utf8')
  const regle = (nom: string) => {
    const texte = source()
    const i = texte.indexOf(`${nom} {`)
    expect(i, `pas de règle ${nom}`).toBeGreaterThanOrEqual(0)
    return texte.slice(i, texte.indexOf('}', i))
  }
  const nb = (re: RegExp, texte: string, quoi: string) => {
    const m = re.exec(texte)
    expect(m, `pas de ${quoi}`).not.toBeNull()
    return Number(m![1])
  }
  /** Une mesure de `.panneau`, en pixels de cadre. */
  const mesure = (nom: string) => nb(new RegExp(`--${nom}:\\s*([\\d.]+)px`), regle('.panneau'), `--${nom}`)
  const filet = () => nb(/border:\s*([\d.]+)px/, regle('.panneau'), 'le filet du cadre')

  const plaque = (wrapper: ReturnType<typeof monter>['wrapper']) => {
    const s = (wrapper.get('.panneau').element as HTMLElement).style
    return {
      echelle: Number(/^scale\(([\d.]+)\)$/.exec(s.transform)![1]),
      gauche: parseFloat(s.left),
      haut: parseFloat(s.top),
      largeur: parseFloat(s.width),
    }
  }
  const posee = (l: number, h: number) => {
    const f = cadreDe(l, h)
    return { f, ...monter('ailleurs', { frame: f, largeur: l, rideau: { y: yPoseA(f), baisse: true } }) }
  }

  /**
   * Les deux bras passent **devant** la frise (spec §5) : ils ne l'évitent plus,
   * et reprennent le retrait de la scène, `BRAS.retrait`, en pixels de cadre
   * comme le reste de la plaque. La vague de correction qui les écartait des
   * libellés de la navigation (`retraitBras`, `BANDE_LIBRE`) a perdu sa raison
   * d'être avec le seuil mobile.
   */
  describe('les bras', () => {
    it('sont deux barres du DOM, symétriques, au retrait de la scène', () => {
      const { wrapper } = posee(1512, 771)
      const bras = wrapper.findAll<HTMLElement>('.bras')
      expect(bras).toHaveLength(2)
      const [g, d] = bras.map((b) => b.element.style)
      expect(g.left).toBe(`${BRAS.retrait}px`)
      expect(d.right).toBe(`${BRAS.retrait}px`)
      for (const b of bras) expect(b.attributes('aria-hidden')).toBe('true')
    })

    /**
     * Ils montent **au-delà** du bord haut de la fenêtre : c'est le rognage qui
     * les coupe, pas un calcul, puisque la plaque peut être n'importe où entre
     * sa rangée et sa pose. Le cadrage « cover » garantit que la hauteur de la
     * scène, mise à l'échelle, dépasse celle de la fenêtre.
     */
    it.each([[320, 568], [390, 844], [1512, 771], [2560, 1440], [3440, 800]] as const)(
      'montent jusqu’au-dessus de la fenêtre à %i × %i',
      (l, h) => {
        const { wrapper } = posee(l, h)
        const p = plaque(wrapper)
        const hauteur = parseFloat(wrapper.get<HTMLElement>('.bras').element.style.height)
        expect(p.haut - hauteur * p.echelle).toBeLessThanOrEqual(0)
      },
    )

    // `auto` leur ferait avaler les appuis sur deux bandes qui montent jusqu'en
    // haut de la fenêtre, frise comprise.
    it('laissent passer le pointeur', () => {
      expect(regle('.bras')).toMatch(/pointer-events:\s*none/)
    })
  })

  /**
   * L'horloge est **sous** la plaque dès qu'elle est posée : la commande ne
   * reste pas en piège dessous, elle se déplace sur l'heure du bandeau. C'est le
   * même bouton, jamais un second.
   */
  describe('la commande posée sur le bandeau', () => {
    // 800 × 450 et 719 × 500 sont les fenêtres larges et basses où la bande du
    // bandeau ne fait que 21 et 24 px d'écran : c'est là que la cible tombait
    // sous les 44 px de haut. 720 × 400 pousse l'échelle plus bas encore.
    const TAILLES = [[1512, 771], [1920, 1080], [2560, 1440], [800, 450], [720, 400], [719, 500], [320, 568], [390, 844]] as const

    it('ne se dédouble jamais', () => {
      for (const [l, h] of TAILLES) {
        expect(posee(l, h).wrapper.findAll('[data-commande]'), `${l}×${h}`).toHaveLength(1)
      }
    })

    it.each(TAILLES)('est un disque de 44 px sur l’heure du bandeau à %i × %i', (l, h) => {
      const { wrapper } = posee(l, h)
      const bouton = wrapper.get('[data-commande]')
      expect(bouton.classes()).toContain('sur-bandeau')
      const s = (bouton.element as HTMLElement).style
      const [gauche, haut, large, hauteur] = [s.left, s.top, s.width, s.height].map(parseFloat)
      const p = plaque(wrapper)
      expect(large).toBe(44)
      // 44 px dans les deux dimensions : le plancher du doigt ne se négocie pas
      // plus en hauteur qu'en largeur (c'est celui de `cibleReverbere`).
      expect(hauteur).toBe(44)
      // Centré sur l'heure : à droite, après le filet, le creux et la moitié du texte.
      const espacement = nb(/letter-spacing:\s*([\d.]+)em/, regle('.entete'), 'l’espacement du bandeau')
      const corpsEntete = nb(/font-size:\s*([\d.]+)px/, regle('.entete'), 'le corps du bandeau')
      const largeurHeure = '00:00'.length * (0.6 + espacement) * corpsEntete
      const centreHeure = p.gauche + (p.largeur - filet() - mesure('creux') - largeurHeure / 2) * p.echelle
      const droite = p.gauche + p.largeur * p.echelle
      // Centré sur l'heure, sauf quand l'échelle est si basse que 44 px le
      // feraient déborder du bord droit : il se cale alors dessus, comme en
      // hauteur il se cale sur le début des lignes.
      expect(gauche + large / 2).toBeCloseTo(Math.min(centreHeure, droite - large / 2))
      // Il reste **dans** la plaque : ni au-dessus, où il mangerait des clics sur
      // le ciel, ni sur la première ligne, qui porte un lien.
      expect(gauche).toBeGreaterThanOrEqual(p.gauche)
      expect(gauche + large).toBeLessThanOrEqual(p.gauche + p.largeur * p.echelle)
      // Il ne descend **jamais** sur la première ligne, qui est un lien : quand la
      // bande du bandeau est plus courte que 44 px d'écran, c'est par le haut
      // qu'il déborde, au-dessus de la plaque, où il n'y a que le ciel.
      const debutLignes = p.haut + (filet() + mesure('entete')) * p.echelle
      expect(haut + hauteur).toBeLessThanOrEqual(debutLignes + 1e-6)
      // Et il ne monte pas dans la frise, qui reste lisible sous le panneau.
      expect(haut).toBeGreaterThanOrEqual(HAUTEUR_FRISE)
      // Centré sur la bande partout où elle est assez haute pour le porter.
      const bandeau = (mesure('entete') - mesure('ligne') / 2) * p.echelle
      if (bandeau >= 44) {
        expect(haut + hauteur / 2).toBeCloseTo(p.haut + (filet() + bandeau / p.echelle / 2) * p.echelle)
      }
    })

    it('est un disque invisible : ni texte, ni cadran, et le nom reste fixe', () => {
      const bouton = posee(1512, 771).wrapper.get('[data-commande]')
      expect(bouton.text()).toBe('')
      expect(bouton.attributes('aria-label')).toBe('Prochains départs')
      // Le cadran épinglé de 52 px s'en est allé avec le seuil mobile : l'horloge
      // de la gare est désormais visible sur tout écran (spec §4).
      expect(bouton.classes()).not.toContain('visible')
      const sansCommentaires = source().replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
      expect(sansCommentaires).not.toMatch(/cadranDessine|cadranMontre|\.commande\.visible/)
    })

    it('suit le panneau dans sa course', async () => {
      const { wrapper, f, rideau } = posee(1512, 771)
      const ecart = () =>
        parseFloat(wrapper.get<HTMLElement>('[data-commande]').element.style.top) - plaque(wrapper).haut
      const avant = ecart()
      rideau.value = { y: yPoseA(f) - 40, baisse: true }
      await nextTick()
      expect(plaque(wrapper).haut).toBeLessThan(f.offsetY + yPoseA(f) * f.scale)
      // Même distance au haut de la plaque : elle le suit, elle ne reste pas en route.
      expect(ecart()).toBeCloseTo(avant)
    })

    it('revient sur l’horloge dès que le panneau est rangé', async () => {
      const f = cadreDe(1512, 771)
      const { wrapper, rideau } = monter('ailleurs', { frame: f, largeur: 1512, rideau: { y: yPoseA(f), baisse: true } })
      expect(wrapper.get('[data-commande]').classes()).toContain('sur-bandeau')
      rideau.value = { y: yRangeA(f), baisse: false }
      await nextTick()
      const bouton = wrapper.get('[data-commande]')
      expect(bouton.classes()).not.toContain('sur-bandeau')
      const s = (bouton.element as HTMLElement).style
      expect((parseFloat(s.left) + parseFloat(s.width) / 2 - f.offsetX) / f.scale).toBeCloseTo(HORLOGE.x)
    })
  })

  /**
   * Le vrai geste : `useScene` écoute `pointerdown` et `pointermove` sur
   * `window`. Le panneau est devant tout ; ce qui tombe dessus s'arrête sur lui.
   */
  describe('ce qui tombe sur le panneau', () => {
    const envoyer = (type: string, cible: Element) => {
      const vu = vi.fn()
      window.addEventListener(type, vu)
      try {
        cible.dispatchEvent(new Event(type, { bubbles: true }))
      } finally {
        window.removeEventListener(type, vu)
      }
      return vu
    }

    it('un appui sur un lien n’atteint pas la fenêtre', () => {
      const { wrapper } = posee(1512, 771)
      expect(envoyer('pointerdown', lien(wrapper, 'LINKEDIN').element)).not.toHaveBeenCalled()
    })

    /**
     * **Le défaut que la tâche 3 a mesuré et laissé.** Une ligne éteinte ne porte
     * pas de lien ; l'appui tombait jusqu'à `Scene.clicPx`, qui éteignait le
     * réverbère dont les deux tiers bas sont en pleine vue sous la plaque. Le
     * panneau est `pointer-events: auto` et arrête l'appui : les deux routes —
     * celle de `window` et celle du bouton transparent de la lampe, que la pile
     * du DOM met sous le panneau — se ferment du même geste.
     */
    it('un appui sur une ligne éteinte n’atteint pas la fenêtre non plus', () => {
      const { wrapper } = posee(1512, 771)
      const eteinte = wrapper.findAll('.ligne.eteint')
      expect(eteinte.length).toBeGreaterThan(0)
      expect(envoyer('pointerdown', eteinte[0].element)).not.toHaveBeenCalled()
      // Ni le fond de la plaque, qui ne porte rien du tout.
      expect(envoyer('pointerdown', wrapper.get('.panneau').element)).not.toHaveBeenCalled()
    })

    /**
     * Le survol, lui, **passe**, et c'est voulu : `useScene` fait voyager
     * `setPointer` — la parallaxe du ciel — sur le même `pointermove`, et
     * l'arrêter figerait le ciel dès que le pointeur touche le panneau. La bulle
     * d'une étoile recouverte s'ouvre donc encore, mais à `z-index: 5`, derrière
     * une plaque opaque qui est à 15.
     */
    it('un survol du panneau atteint la fenêtre : la parallaxe du ciel en vit', () => {
      const { wrapper } = posee(1512, 771)
      expect(envoyer('pointermove', wrapper.get('.panneau').element)).toHaveBeenCalledTimes(1)
    })

    it('met le panneau dans le chemin du pointeur', () => {
      expect(regle('.panneau')).toMatch(/pointer-events:\s*auto/)
    })

    /**
     * Ce qu'arrêter l'appui coûtait, et que le panneau rend.
     *
     * `useScene.surAppui` finit par `setPointerPx`, et c'est ce qui ferme la
     * bulle d'une étoile : « a tap that hits nothing closes the bubble ». Un
     * appui sur la plaque n'y arrive plus — elle l'arrête avant `window` —, et
     * la bulle serait restée ouverte **dessous**, pour réapparaître à la
     * remontée du panneau. Le panneau le dit donc lui-même, avec les
     * coordonnées de l'appui.
     *
     * Et pas par `setPointerPx` : la scène ne sait plus ce que la plaque couvre,
     * et `stars.hit` y trouverait une étoile sous le panneau — on ouvrirait une
     * bulle au lieu d'en fermer une.
     */
    it('ferme la bulle d’une étoile, qu’il empêche l’appui d’aller fermer', async () => {
      const { wrapper, scene } = posee(1512, 771)
      wrapper.get('.panneau').element.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, clientX: 123, clientY: 456 }),
      )
      await nextTick()
      expect(scene.fermerBulleEtoile).toHaveBeenCalledWith(123, 456)
    })

    /**
     * La lampe, elle, **reste atteignable** panneau baissé (spec §5) : la plaque
     * couvre le haut du mât, les deux tiers bas sont dégagés. Son bouton ne
     * déclare aucun `z-index`, donc le panneau (15) passe devant lui et prend ce
     * qui tombe sur la partie couverte — il n'est pas retiré, il est dessous.
     */
    it('laisse la commande du réverbère sous le panneau, sans la retirer', () => {
      const lampe = readFileSync('src/components/CommandeReverbere.vue', 'utf8')
      expect(lampe).not.toMatch(/z-index/)
      expect(lampe).not.toMatch(/RIDEAU_KEY/)
    })

    /**
     * Et c'est ce qui rend ce choix tenable : la plaque posée couvre le haut du
     * mât, pas tout le mât. Ce qui reste **sous** elle — la part du bouton de la
     * lampe qu'on voit et qu'on vise encore — ne descend jamais sous les 44 px
     * qu'un doigt exige. Le retirer du DOM contredirait la spec §5 ; le laisser
     * n'est pas le laisser inatteignable.
     */
    it.each([[320, 568], [390, 844], [719, 500], [800, 450], [1512, 771], [2560, 1440], [3440, 800]] as const)(
      'laisse au moins 44 px du mât dégagés sous la plaque à %i × %i',
      (l, h) => {
        const { wrapper, f } = posee(l, h)
        const p = plaque(wrapper)
        const bas = p.haut + RIDEAU.hauteur * p.echelle
        const cible = cibleReverbere(f.scale)
        const basCible = f.offsetY + cible.y1 * f.scale
        // La plaque coupe bien le mât — sans quoi le test ne prouverait rien.
        expect(f.offsetY + cible.y0 * f.scale, `la plaque ne couvre pas le mât à ${l}×${h}`).toBeLessThan(bas)
        expect(basCible - bas, `dégagement à ${l}×${h}`).toBeGreaterThanOrEqual(44)
      },
    )
  })

  /**
   * Le panneau est retiré quand son bas sort de la fenêtre, avec sa vraie
   * hauteur — celle de la plaque mise à l'échelle du cadre, et plus une constante
   * d'écran.
   */
  describe('la hauteur de la plaque', () => {
    const TAILLES = [[390, 844], [719, 500], [1512, 771], [2560, 1440]] as const

    it.each(TAILLES)('est celle du cadre à %i × %i', (l, h) => {
      const { wrapper } = posee(l, h)
      const p = plaque(wrapper)
      expect(parseFloat(wrapper.get<HTMLElement>('.panneau').element.style.height)).toBe(RIDEAU.hauteur)
      expect(RIDEAU.hauteur * p.echelle).toBeCloseTo(RIDEAU.hauteur * cadreDe(l, h).scale)
    })

    it.each(TAILLES)('ne retire pas le panneau tant que son bas est dans la fenêtre, à %i × %i', async (l, h) => {
      const f = cadreDe(l, h)
      const { wrapper, rideau } = posee(l, h)
      // Le `y` de scène dont le bas de la plaque tombe exactement sur `bas` px d'écran.
      const yPourBas = (bas: number) => (bas - f.offsetY) / f.scale - RIDEAU.hauteur
      for (const [bas, attendu] of [[1, true], [0, false]] as const) {
        rideau.value = { y: yPourBas(bas), baisse: false }
        await nextTick()
        expect(wrapper.find('.panneau').exists(), `bas à ${bas} à ${l} × ${h}`).toBe(attendu)
      }
    })
  })

  /** La gouttière se relit à chaque redimensionnement, cadre inchangé ou non. */
  describe('la gouttière', () => {
    it('suit le redimensionnement, quand le cadre ne bouge pas', async () => {
      const f = cadreDe(1512, 771)
      const { wrapper } = monter('ailleurs', { frame: f, largeur: 1512, rideau: { y: yPoseA(f), baisse: true } })
      const avant = plaque(wrapper).gauche
      window.innerWidth = 1000
      window.dispatchEvent(new Event('resize'))
      await nextTick()
      expect(plaque(wrapper).gauche).not.toBeCloseTo(avant)
      expect(plaque(wrapper).gauche).toBeCloseTo((1000 - RIDEAU.largeur * f.scale) / 2)
    })

    it('cesse d’écouter la fenêtre au démontage', () => {
      const ajout = vi.spyOn(window, 'addEventListener')
      const retrait = vi.spyOn(window, 'removeEventListener')
      try {
        const { wrapper } = monter('ailleurs')
        const ajoutee = ajout.mock.calls.find(([type]) => type === 'resize')![1]
        wrapper.unmount()
        // Retirer la fonction qui a été ajoutée : une autre ne retirerait rien.
        expect(retrait.mock.calls.some(([type, f]) => type === 'resize' && f === ajoutee)).toBe(true)
      } finally {
        ajout.mockRestore()
        retrait.mockRestore()
      }
    })
  })

  /**
   * La largeur d'une ligne, une fois la plaque bornée par la fenêtre.
   *
   * jsdom ne met rien en page : c'est un **modèle** de la grille `3.4em 1fr auto`
   * avec son `gap`, en pixels de **cadre** — le repère dans lequel tout le style
   * du panneau est écrit. Seule la piste `1fr`, la destination et ses points de
   * conduite, peut manquer de place.
   *
   * Sur un téléphone la plaque est bornée par la gouttière (366 px à 390 de
   * large) tandis que le texte garde l'échelle du cadre : la piste s'y refermait
   * de 12,4 px de cadre, et les points de conduite — qui existent à toute autre
   * largeur — disparaissaient. `--creux` est descendu de 32 à 26 et rend
   * exactement ces 12 px : le déficit tombe à 0,4 px de cadre à 390 × 844 et
   * repasse positif au-delà. **La destination tient donc partout** ; la piste
   * des points, elle, ne fait plus que 0 à 2 px de cadre entre 390 et 430, soit
   * moins qu'une cellule du motif (12 px) : voir le rapport, qui dit ce qu'il
   * faudrait pour les voir vraiment.
   *
   * Les deux gardes sont donc : la destination tient dans sa piste à un pixel de
   * cadre près, et la ligne reste **dans la plaque** avec au moins 20 px de
   * cadre de franc — la part qui déborde est reprise sur le creux, jamais sur le
   * filet du cadre.
   */
  describe('la largeur d’une ligne', () => {
    const ligne = () => regle('.ligne')
    const corps = () => nb(/font-size:\s*([\d.]+)px/, regle('.panneau'), 'le corps du texte')
    const ecart = () => nb(/gap:\s*([\d.]+)px/, ligne(), 'l’écart des colonnes')
    const colonneHeure = () => nb(/grid-template-columns:\s*([\d.]+)em/, ligne(), 'la colonne de l’heure')
    const padding = () => nb(/padding:\s*0 ([\d.]+)px/, ligne(), 'le rembourrage de la ligne')
    const margeNegative = () => nb(/margin:\s*0 -([\d.]+)px/, ligne(), 'la marge négative de la ligne')
    const retraitPoints = () =>
      nb(/margin:[^;]*\s([\d.]+)em;/, regle('.ligne > span:nth-child(2)::after'), 'le retrait des points')
    const CHASSE = 0.6

    /** Le contenu d'une ligne, en pixels de cadre, pour une plaque de `largeur`. */
    const contenu = (largeur: number) =>
      largeur - 2 * filet() - 2 * mesure('creux') + 2 * margeNegative() - 2 * padding()

    /** Ce qui déborde de la piste `1fr`, en pixels de cadre, pour la pire paire du vivier. */
    const debordement = (largeur: number) => {
      const paires = [...VIVIER, ...departsReels(new Date())]
      return Math.max(
        ...paires.map((d) => {
          const piste =
            contenu(largeur) - 2 * ecart() - colonneHeure() * corps() - d.statut.length * CHASSE * corps()
          const besoin = d.destination.length * CHASSE * corps() + retraitPoints() * corps()
          return besoin - piste
        }),
      )
    }

    const TAILLES = [[320, 568], [390, 844], [414, 896], [430, 932], [1512, 771]] as const

    /**
     * Les deux gardes qui suivent se recouvrent **aujourd'hui** et pas demain, et
     * c'est pour ça qu'elles sont deux.
     *
     * Celle-ci mesure le franc entre la ligne et le filet du cadre, qui vaut
     * `filet + --creux − ce qui déborde`. À `--creux: 26` et 0,4 px de débord
     * elle est en effet impliquée par la suivante. Mais elle ne dépend pas du
     * seul débord : **un `--creux` plus court la fait tomber toute seule**, texte
     * parfaitement tenu ou non — à 19 px de cadre elle casse avec un débord nul.
     * Or descendre `--creux` est exactement ce que le rapport propose pour faire
     * revenir les points de conduite sur un téléphone. C'est le garde-fou de ce
     * réglage-là : la plaque doit garder 20 px de cadre de respiration, quel que
     * soit le chemin par lequel on la serre.
     */
    it.each(TAILLES)('garde 20 px de cadre entre la ligne et le filet, à %i × %i', (l, h) => {
      const { wrapper } = posee(l, h)
      const trop = Math.max(0, debordement(plaque(wrapper).largeur))
      const franc = filet() + mesure('creux') - trop
      expect(franc, `il ne reste que ${franc}px de cadre de franc`).toBeGreaterThanOrEqual(20)
    })

    /** La destination et son retrait de points tiennent dans la piste `1fr`. */
    it.each(TAILLES)('laisse la destination tenir dans sa piste à %i × %i', (l, h) => {
      const { wrapper } = posee(l, h)
      const trop = debordement(plaque(wrapper).largeur)
      expect(trop, `la destination déborde de ${trop}px de cadre`).toBeLessThanOrEqual(1)
    })

    /** Sur un écran de bureau, la plaque fait sa pleine largeur : les points sont là. */
    it('laisse la place aux points de conduite dès que la plaque est entière', () => {
      const { wrapper } = posee(1512, 771)
      expect(plaque(wrapper).largeur).toBe(RIDEAU.largeur)
      expect(debordement(RIDEAU.largeur)).toBeLessThanOrEqual(0)
    })

    it('tient dans le bandeau, d’après la source', () => {
      const titre = source().match(/texte="(PROCHAINS DÉPARTS)"/)![1]
      const corpsEntete = nb(/font-size:\s*([\d.]+)px/, regle('.entete'), 'le corps du bandeau')
      const espacement = nb(/letter-spacing:\s*([\d.]+)em/, regle('.entete'), 'l’espacement du bandeau')
      const lettres = (titre.length + '00:00'.length) * (CHASSE + espacement) * corpsEntete
      for (const [l, h] of TAILLES) {
        const { wrapper } = posee(l, h)
        const place = plaque(wrapper).largeur - 2 * filet()
        expect(lettres, `bandeau ${lettres}px pour ${place}px à ${l}×${h}`).toBeLessThanOrEqual(place)
      }
    })
  })
})
