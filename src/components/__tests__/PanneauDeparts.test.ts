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
import { ANCRE_FRISE_MOBILE, SEUIL_MOBILE, cadrageScene } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { HALO_HORLOGE, HORLOGE } from '@/scene/quai'
import { BISEAU, RIDEAU, horlogeTouchee, yPoseA, yRangeA } from '@/scene/rideau'
import { VIVIER, departsReels } from '@/scene/horaires'
import { createAppRouter } from '@/router'
import { CV } from '@/contenu/liens'
import { useVoyage } from '@/stores/voyage'

const ADRESSE = /[\w.]+@[\w.]+\.\w+/

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
  // La scène, réduite à ce que le bouton lui demande : la règle du rideau vit chez elle.
  const scene = { basculerRideau: vi.fn() }
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
    expect(place(wrapper).left).toBeCloseTo(f1.offsetX + RIDEAU.x * f1.scale)
    expect(place(wrapper).top).toBeCloseTo(f1.offsetY + y * f1.scale)
    expect(place(wrapper).transform).toBe(`scale(${f1.scale})`)
    // Le texte garde sa taille de cadre et c'est la transformation qui l'échelonne :
    // largeur et hauteur sont celles du rideau, jamais multipliées.
    expect(place(wrapper).width).toBe(`${RIDEAU.largeur}px`)
    expect(place(wrapper).height).toBe(`${RIDEAU.hauteur}px`)

    const f2 = cadreDe(800, 1000)
    expect(f2.offsetY).toBeGreaterThan(0)
    cadre.value = f2
    // La scène recadre le rideau dans la foulée : `y` suit le nouveau cadre.
    rideau.value = { y: yPoseA(f2), baisse: true }
    await nextTick()
    expect(place(wrapper).left).toBeCloseTo(f2.offsetX + RIDEAU.x * f2.scale)
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

  // `pointer-events: none` ne ferme ni la tabulation ni l'Entrée : pendant la
  // remontée les liens sont retirés du parcours, pas seulement du pointeur.
  it('rend le panneau inerte pendant la remontée, et lui seul', async () => {
    const f = cadreDe(1440, 900)
    const { wrapper, rideau } = monter('ailleurs', { rideau: { y: yPoseA(f), baisse: true } })
    expect(wrapper.get('.panneau').attributes('inert')).toBeUndefined()
    rideau.value = { y: (yPoseA(f) + yRangeA(f)) / 2, baisse: false }
    await nextTick()
    expect(wrapper.get('.panneau').attributes('inert')).toBeDefined()
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
   * Le bandeau annule les retraits du panneau pour affleurer ses bords — mais
   * le fond opaque est un **octogone** : à sa première ligne il ne va que de
   * `BISEAU` à `largeur − BISEAU`. Sans coupe, le bandeau peint deux triangles
   * **hors de la plaque**, et le haut du cadre se lit à coins carrés. Les deux
   * coins qu'on regarde en premier.
   *
   * `BISEAU` est en pixels de **cadre**, le `--biseau` du CSS en pixels **du
   * panneau** : un repère que `transform: scale()` met à l'échelle de la
   * fenêtre. C'est donc la **même longueur**, `12 × échelle` à l'écran des deux
   * côtés, et 12 contre 12 serait déjà la bonne comparaison. On passe pourtant
   * par l'écran, avec l'échelle lue dans le style : le test tombe aussi si le
   * `transform` disparaît, ce qu'un 12 contre 12 ne verrait pas.
   */
  it('coupe son bandeau au même biseau que le cadre', () => {
    const f = cadreDe(1440, 900)
    const m = /--biseau:\s*([\d.]+)px/.exec(source())
    expect(m, 'pas de --biseau en pixels').not.toBeNull()
    const { wrapper } = monter('ailleurs', { frame: f })
    const echelle = /^scale\(([\d.]+)\)$/.exec(place(wrapper).transform)
    expect(echelle, 'le panneau n’est pas mis à l’échelle du cadre').not.toBeNull()
    // Le biseau, tel qu'il tombe à l'écran : celui du panneau, mis à l'échelle…
    const dansLeDom = Number(m![1]) * Number(echelle![1])
    // … et celui que le canvas trace pour la plaque, converti de la même façon.
    const dansLeCanvas = BISEAU * f.scale
    expect(dansLeDom).toBeCloseTo(dansLeCanvas)
    // Si l'échelle valait 1 les deux repères seraient confondus et ce test ne
    // distinguerait plus rien : à cette fenêtre, 12 px de cadre font ~9 px à l'écran.
    expect(Math.abs(BISEAU - dansLeCanvas)).toBeGreaterThan(2)
    expect(regle('.entete')).toContain('clip-path: polygon(')
    expect(regle('.entete')).toContain('var(--biseau)')
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
  it('couvre exactement la cible de l’horloge du canvas', () => {
    const f = cadreDe(1440, 900)
    const { wrapper } = monter('ailleurs', { frame: f })
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

  it('suit le cadre quand la fenêtre change', async () => {
    const { wrapper, cadre } = monter()
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
 * Le second rendu, sous `SEUIL_MOBILE` : le même état du rideau, rendu deux fois.
 * Le panneau se détache de la scène (il se pose sur la fenêtre, à taille
 * lisible) et la commande bouge : dessinée en cadran quand le panneau est rangé,
 * disque invisible sur l'heure du bandeau quand il est posé. jsdom ne met rien en page :
 * ces tests gardent les classes, le style émis et le source des règles — pas le
 * rendu réel, que personne n'a regardé.
 */
describe('PanneauDeparts — le rendu petit écran', () => {
  const source = () => readFileSync('src/components/PanneauDeparts.vue', 'utf8')
  const regle = (nom: string) => {
    const texte = source()
    const i = texte.indexOf(`${nom} {`)
    expect(i, `pas de règle ${nom}`).toBeGreaterThanOrEqual(0)
    return texte.slice(i, texte.indexOf('}', i))
  }
  const variable = (nom: string) => parseFloat(regle('.detache').match(new RegExp(`--${nom}:\\s*([\\d.]+)px`))![1])
  const filet = () => parseFloat(regle('.detache').match(/border:\s*([\d.]+)px/)![1])
  /** La hauteur que le CSS du panneau détaché additionne : marge basse, bandeau + écart (= `--entete`), cinq lignes, deux filets. */
  const hauteurCss = () => variable('marge') + variable('entete') + 5 * variable('ligne') + 2 * filet()
  /** Où le panneau détaché se pose : exactement l'endroit où la plaque se posait. */
  const posePx = (f: Frame) => f.offsetY + yPoseA(f) * f.scale
  /** Le haut du panneau détaché pour un `y` de scène : sa propre course, de `-hauteur` (bas à 0) à la pose. */
  const hautDetache = (f: Frame, y: number) => {
    const fraction = (y - yRangeA(f)) / (yPoseA(f) - yRangeA(f))
    return -hauteurCss() + fraction * (posePx(f) + hauteurCss())
  }
  /** Le `y` de scène qui donne ce haut de panneau détaché. */
  const yPourHaut = (f: Frame, haut: number) =>
    yRangeA(f) + ((haut + hauteurCss()) / (posePx(f) + hauteurCss())) * (yPoseA(f) - yRangeA(f))
  const TAILLES: Array<[number, number]> = [[386, 676], [663, 371], [320, 568]]

  it('se détache de la scène sous le seuil et se pose sur la fenêtre', () => {
    const { wrapper } = monter('ailleurs', { largeur: SEUIL_MOBILE - 1 })
    const panneau = wrapper.get('.panneau')
    expect(panneau.classes()).toContain('detache')
    // Posé sur la fenêtre : ni largeur ni échelle de scène dans son style.
    const style = panneau.attributes('style')!
    expect(style).not.toContain(`${RIDEAU.largeur}px`)
    expect(style).not.toContain('scale(')
  })

  it('reste attaché à la scène au seuil et au-dessus', () => {
    for (const largeur of [SEUIL_MOBILE, 1440]) {
      const { wrapper } = monter('ailleurs', { largeur })
      expect(wrapper.get('.panneau').classes()).not.toContain('detache')
      expect(wrapper.get('.panneau').attributes('style')).toContain(`${RIDEAU.largeur}px`)
    }
  })

  // Détaché, le panneau descend encore comme un rideau, mais sur **sa** course : la
  // fraction d'avancement de la plaque de scène, remise sur sa propre hauteur.
  it('suit le rideau par sa fraction d’avancement, sur sa propre course', async () => {
    const f = cadreDe(SEUIL_MOBILE - 1, 844)
    const { wrapper, rideau } = monter('ailleurs', { frame: f, largeur: SEUIL_MOBILE - 1, rideau: { y: 100, baisse: true } })
    const haut = () => parseFloat(wrapper.get<HTMLElement>('.panneau').element.style.top)
    expect(haut()).toBeCloseTo(hautDetache(f, 100))
    rideau.value = { y: 160, baisse: true }
    await nextTick()
    expect(haut()).toBeCloseTo(hautDetache(f, 160))
    // Au repos, rien ne change : il se pose là où il se posait.
    rideau.value = { y: yPoseA(f), baisse: true }
    await nextTick()
    expect(haut()).toBeCloseTo(posePx(f))
    // Rangé, son bas est à 0 : sorti, exactement.
    rideau.value = { y: yRangeA(f), baisse: true }
    await nextTick()
    expect(haut() + hauteurCss()).toBeCloseTo(0)
  })

  // L'identité qui retire le panneau rangé doit tenir à **toute** taille de fenêtre.
  it.each(TAILLES)('n’affiche rien, rangé, à %i × %i', (l, h) => {
    const f = cadreDe(l, h)
    const { wrapper } = monter('ailleurs', { frame: f, largeur: l, rideau: { y: yRangeA(f), baisse: false } })
    expect(wrapper.find('.panneau').exists()).toBe(false)
  })

  it('garde les trois départs réels comme liens du DOM', () => {
    const { wrapper } = monter('ailleurs', { largeur: SEUIL_MOBILE - 1 })
    expect(wrapper.findAll('a')).toHaveLength(3)
    expect(lien(wrapper, 'LINKEDIN').attributes('href')).toMatch(/linkedin/i)
    expect(lien(wrapper, 'ÉCRIRE').attributes('href')).toMatch(/^mailto:/)
    expect(lien(wrapper, 'CV').attributes('href')).toBe(CV)
  })

  /** Pas un commentaire sur l'horloge : portrait la cache, une fenêtre large et basse non. */
  it('dessine un cadran sous le seuil quand le panneau est rangé, sans regarder où est l’horloge', () => {
    // 719 × 500 : large et basse, l'horloge est dans le champ — le cadran se dessine quand même.
    const f = cadreDe(SEUIL_MOBILE - 1, 500)
    const { wrapper } = monter('ailleurs', { frame: f, largeur: SEUIL_MOBILE - 1, rideau: { y: yRangeA(f), baisse: false } })
    expect(wrapper.get('[data-commande]').classes()).toContain('visible')
    expect(wrapper.get('[data-commande]').classes()).not.toContain('sur-bandeau')
  })

  it('ne montre pas sa commande au seuil et au-dessus : elle y est invisible sur l’horloge', () => {
    for (const largeur of [SEUIL_MOBILE, 1440]) {
      const { wrapper } = monter('ailleurs', { largeur })
      expect(wrapper.get('[data-commande]').classes()).not.toContain('visible')
    }
  })

  it('déplace la commande au lieu de la dédoubler', () => {
    for (const largeur of [SEUIL_MOBILE - 1, 1440]) {
      const { wrapper } = monter('ailleurs', { largeur })
      expect(wrapper.findAll('[data-commande]')).toHaveLength(1)
    }
    // Panneau rangé : elle ne porte plus les coordonnées de l'horloge, le CSS l'épingle.
    const f = cadreDe(SEUIL_MOBILE - 1, 844)
    const { wrapper } = monter('ailleurs', { frame: f, largeur: SEUIL_MOBILE - 1, rideau: { y: yRangeA(f), baisse: false } })
    const bouton = wrapper.get<HTMLElement>('[data-commande]').element
    expect(bouton.style.left).toBe('')
    expect(bouton.style.top).toBe('')
    expect(bouton.style.width).toBe('')
  })

  // Un cadran qui ne dirait rien serait un rond vide : il porte l'heure du tableau.
  it('porte l’heure sur le cadran dessiné, et rien sur l’horloge transparente', () => {
    const f = cadreDe(SEUIL_MOBILE - 1, 844)
    const rangee = { frame: f, largeur: SEUIL_MOBILE - 1, rideau: { y: yRangeA(f), baisse: false } }
    expect(monter('ailleurs', rangee).wrapper.get('[data-commande]').text()).toMatch(/^\d{2}:\d{2}$/)
    expect(monter('ailleurs', { largeur: 1440 }).wrapper.get('[data-commande]').text()).toBe('')
  })

  it('garde à la commande son contrat de bouton, dessinée ou posée sur le bandeau', async () => {
    const f = cadreDe(SEUIL_MOBILE - 1, 844)
    for (const baisse of [false, true]) {
      const rideau = { y: baisse ? yPoseA(f) : yRangeA(f), baisse }
      const { wrapper, scene } = monter('ailleurs', { frame: f, largeur: SEUIL_MOBILE - 1, rideau })
      const bouton = wrapper.get('[data-commande]')
      expect(bouton.element.tagName).toBe('BUTTON')
      // Le nom contient toujours le texte vu (WCAG 2.5.3) : l'heure quand le cadran la montre, rien sinon.
      expect(bouton.attributes('aria-label')).toContain('Prochains départs')
      expect(bouton.text() === '' || bouton.attributes('aria-label')!.includes(bouton.text())).toBe(true)
      expect(bouton.attributes('aria-label')!.includes(':')).toBe(!baisse)
      expect(bouton.attributes('aria-expanded')).toBe(String(baisse))
      await bouton.trigger('click')
      expect(scene.basculerRideau).toHaveBeenCalledTimes(1)
    }
  })

  /**
   * Panneau posé, la commande se pose sur l'heure du bandeau et redevient un disque
   * invisible : un cadran à elle croiserait les liens (fenêtre large et basse). En
   * portrait c'est aussi le seul moyen tactile de refermer le panneau : le disque
   * fait 44 px, la cible qu'un doigt exige (voir `HALO_HORLOGE`). jsdom ne met rien
   * en page, on garde donc la structure : il est centré sur la bande du bandeau et
   * s'arrête avant le début des lignes, qui seules portent des liens.
   */
  describe.each([[719, 500], [386, 676], [663, 371]])('posée sur le bandeau à %i × %i', (l, h) => {
    const monte = () => {
      const f = cadreDe(l, h)
      return { f, ...monter('ailleurs', { frame: f, largeur: l, rideau: { y: yPoseA(f), baisse: true } }) }
    }

    it('est une cible de 44 px, centrée sur l’heure du bandeau, qui dégage les lignes', () => {
      const { wrapper, f } = monte()
      const bouton = wrapper.get('[data-commande]')
      expect(bouton.classes()).toContain('sur-bandeau')
      expect(bouton.classes()).not.toContain('visible')
      const s = (bouton.element as HTMLElement).style
      const [gauche, haut, large, hauteur] = [s.left, s.top, s.width, s.height].map(parseFloat)
      expect(large).toBe(44)
      expect(hauteur).toBe(44)
      const panneau = parseFloat(wrapper.get<HTMLElement>('.panneau').element.style.top)
      expect(panneau).toBeCloseTo(posePx(f))
      // Centré sur la bande : le filet, puis la moitié du bandeau (`--entete` moins la demi-ligne d'écart).
      const bandeau = variable('entete') - variable('ligne') / 2
      expect(haut + hauteur / 2).toBeCloseTo(panneau + filet() + bandeau / 2)
      // Les lignes commencent à `filet + --entete` : le disque s'arrête avant, il ne touche aucun lien.
      expect(haut + hauteur).toBeLessThanOrEqual(panneau + filet() + variable('entete'))
      // Centré sur l'heure : à droite, après la gouttière, le filet, le creux et la moitié du texte.
      const regleEntete = regle('.detache .entete')
      const corpsEntete = parseFloat(regleEntete.match(/font-size:\s*([\d.]+)px/)![1])
      const espacement = parseFloat(regle('.entete').match(/letter-spacing:\s*([\d.]+)em/)![1])
      const largeurHeure = '00:00'.length * (0.6 + espacement) * corpsEntete
      const droite = parseFloat(regle('.detache').match(/right:\s*([\d.]+)px/)![1])
      expect(gauche + large / 2).toBeCloseTo(l - droite - filet() - variable('creux') - largeurHeure / 2)
    })

    it('est un disque invisible : ni texte, ni anneau, et le nom reste fixe', () => {
      const bouton = monte().wrapper.get('[data-commande]')
      expect(bouton.text()).toBe('')
      expect(bouton.attributes('aria-label')).toBe('Prochains départs')
      // L'anneau est celui de `.commande.visible` : sans cette classe, rien ne se voit.
      expect(bouton.classes()).not.toContain('visible')
    })

    it('suit le panneau dans sa course', async () => {
      const { wrapper, f, rideau } = monte()
      rideau.value = { y: yPoseA(f) - 40, baisse: true }
      await nextTick()
      const panneau = parseFloat(wrapper.get<HTMLElement>('.panneau').element.style.top)
      const haut = parseFloat(wrapper.get<HTMLElement>('[data-commande]').element.style.top)
      // Même distance au haut du panneau qu'au repos : elle le suit, elle ne reste pas en route.
      expect(haut).toBeCloseTo(panneau + filet() + (variable('entete') - variable('ligne') / 2) / 2 - 22)
    })
  })

  // La frise est en haut de la fenêtre (`top: 0`) : rien en bas dont il faille se
  // dégager. La marge basse est un choix d'œil, pas un dégagement de frise.
  it('épingle la commande en bas à droite, avec une marge basse choisie à l’œil', () => {
    const r = regle('.commande.visible')
    expect(r).not.toMatch(/96px|safe-area/)
    // Elle est peinte au-dessus du panneau, qui la recouvrirait sinon (même
    // `z-index: auto`, et le panneau vient après dans le gabarit).
    expect(r).toMatch(/z-index:\s*[1-9]/)
    // Posée sur le bandeau, elle doit aussi passer au-dessus du panneau.
    expect(regle('.commande.sur-bandeau')).toMatch(/z-index:\s*[1-9]/)
    // `position: fixed` vient de `.commande`, gardé plus haut.
    expect(r).toMatch(/bottom:[^;]*\d/)
    expect(r).toMatch(/width:\s*\d+px/)
    // Une fois visible, elle n'est plus transparente.
    expect(r).toMatch(/background:\s*var\(--fond\)/)
  })

  it('garde les trois liens chacun sur une ligne', () => {
    expect(regle('.detache .ligne')).toContain('white-space: nowrap')
  })

  it('se pose entre deux gouttières, à pleine largeur, sans échelle', () => {
    const r = regle('.detache')
    expect(r).toMatch(/left:\s*\d+px/)
    expect(r).toMatch(/right:\s*\d+px/)
    expect(r).toMatch(/transform:\s*none/)
    // Un corps lisible : en pixels d'écran, pas ceux d'un cadre rétréci.
    expect(parseFloat(r.match(/font-size:\s*([\d.]+)px/)![1])).toBeGreaterThanOrEqual(13)
  })

  /**
   * `.detache` ne redéclare ni `clip-path` ni `border-radius` : la plaque y est un
   * **rectangle**, avec son propre filet. Un biseau sur le seul bandeau y creusait
   * deux encoches de `--fond` entre le filet du cadre et le bandeau inversé, en haut
   * à gauche et en haut à droite. À zéro le `polygon` dégénère en rectangle — le même
   * choix que `pointsBiseau` côté canvas, « un biseau nul rend le rectangle ».
   *
   * `0px` et non `0` : dans `calc(100% - var(--biseau))` un zéro sans unité est
   * invalide, et c'est toute la déclaration `clip-path` qui tomberait — même résultat
   * à l'œil, mais pour une raison qu'on n'aurait pas écrite.
   */
  it('n’a plus de biseau une fois détaché : son cadre est à coins droits', () => {
    const r = regle('.detache')
    expect(r).toMatch(/--biseau:\s*0px/)
    // Les déclarations seules : la règle porte un commentaire qui nomme les deux.
    expect(r.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/clip-path|border-radius/)
    // Le biseau du cadre, lui, ne bouge pas : le test qui le confronte au canvas lit
    // le **premier** `--biseau` du fichier, celui de `.panneau`, qui vient avant.
    expect(Number(/--biseau:\s*([\d.]+)px/.exec(source())![1])).toBe(BISEAU)
  })

  /** Le passage du seuil pendant l'animation ne doit pas perdre l'état. */
  it('reste baissé quand la fenêtre franchit le seuil', async () => {
    const { wrapper, cadre } = monter('ailleurs', { largeur: SEUIL_MOBILE + 1, rideau: { y: yPoseA(cadreDe(SEUIL_MOBILE + 1, 900)), baisse: true } })
    expect(wrapper.get('.panneau').classes()).not.toContain('detache')
    const avant = wrapper.get('.panneau').element
    expect(wrapper.get<HTMLElement>('.panneau').element.style.width).toBe(`${RIDEAU.largeur}px`)
    // La scène émet un nouveau cadre ; la fenêtre a changé de largeur avec lui.
    window.innerWidth = SEUIL_MOBILE - 1
    cadre.value = cadreDe(SEUIL_MOBILE - 1, 844)
    await nextTick()
    expect(wrapper.get('.panneau').classes()).toContain('detache')
    // Le même nœud : pas de remontage, donc les volets ne repartent pas.
    expect(wrapper.get('.panneau').element).toBe(avant)
    // Les mesures de la scène sont effacées du style en ligne, pas laissées par-dessous.
    const style = wrapper.get<HTMLElement>('.panneau').element.style
    expect(style.width).toBe('')
    expect(style.left).toBe('')
    expect(style.transform).toBe('')
    expect(style.height).not.toBe(`${RIDEAU.hauteur}px`)
    // Panneau posé : la commande se pose sur le bandeau, elle ne se dessine pas.
    expect(wrapper.get('[data-commande]').classes()).toContain('sur-bandeau')
  })

  it('suit aussi le redimensionnement, quand le cadre ne bouge pas', async () => {
    const { wrapper } = monter('ailleurs', { largeur: 1440 })
    window.innerWidth = SEUIL_MOBILE - 1
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(wrapper.get('.panneau').classes()).toContain('detache')
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

  /**
   * Le vrai geste : `useScene` écoute `pointerdown` sur `window` et bascule le
   * rideau si l'appui tombe sur l'horloge. Détaché, le panneau passe par-dessus
   * l'horloge dans une fenêtre large et basse : un appui sur un lien ne doit pas
   * remonter jusque-là.
   */
  describe('l’appui sur un lien détaché', () => {
    const appuyer = (largeur: number, hauteur: number) => {
      const f = cadreDe(largeur, hauteur)
      const { wrapper } = monter('ailleurs', { frame: f, largeur })
      const surAppui = vi.fn()
      window.addEventListener('pointerdown', surAppui)
      try {
        lien(wrapper, 'LINKEDIN').element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      } finally {
        window.removeEventListener('pointerdown', surAppui)
      }
      return surAppui
    }

    it('n’atteint pas la fenêtre', () => {
      expect(appuyer(SEUIL_MOBILE - 1, 500)).not.toHaveBeenCalled()
    })

    it('atteint toujours la fenêtre en rendu attaché : on n’y touche pas', () => {
      expect(appuyer(1440, 900)).toHaveBeenCalledTimes(1)
    })

    it('met le panneau détaché dans le chemin du pointeur', () => {
      // Un appui sur un lien traverse déjà par bulle (`.reel` est `auto`) : c'est le gestionnaire
      // qui le ferme. `auto` protège le reste du panneau — bandeau, lignes éteintes, fond.
      expect(regle('.detache')).toMatch(/pointer-events:\s*auto/)
    })
  })

  describe('la hauteur du panneau détaché', () => {
    const f = () => cadreDe(SEUIL_MOBILE - 1, 844)
    const hauteurDe = (wrapper: ReturnType<typeof monter>['wrapper']) => parseFloat(wrapper.get<HTMLElement>('.panneau').element.style.height)

    it('est celle que le CSS additionne : un bandeau, cinq lignes, les marges et les filets', () => {
      expect(hauteurDe(monter('ailleurs', { frame: f(), largeur: SEUIL_MOBILE - 1 }).wrapper)).toBe(hauteurCss())
    })

    // Retiré quand son bas sort de la fenêtre, avec sa vraie hauteur, à toute taille.
    it.each(TAILLES)('ne retire pas le panneau tant que son bas est dans la fenêtre, à %i × %i', async (l, h) => {
      const cadre = cadreDe(l, h)
      const { wrapper, rideau } = monter('ailleurs', { frame: cadre, largeur: l, rideau: { y: yPoseA(cadre), baisse: true } })
      for (const [bas, attendu] of [[1, true], [0, false]] as const) {
        rideau.value = { y: yPourHaut(cadre, bas - hauteurCss()), baisse: false }
        await nextTick()
        expect(wrapper.find('.panneau').exists(), `bas à ${bas} à ${l} × ${h}`).toBe(attendu)
      }
    })
  })

  describe('le cadran épinglé', () => {
    it('avance son heure même panneau rangé', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 10, 21, 22, 0, 0))
      const cadre = cadreDe(SEUIL_MOBILE - 1, 844)
      const { wrapper } = monter('ailleurs', { frame: cadre, largeur: SEUIL_MOBILE - 1, rideau: { y: yRangeA(cadre), baisse: false } })
      expect(wrapper.find('.panneau').exists()).toBe(false)
      expect(wrapper.get('[data-commande]').text()).toBe('22:00')
      vi.setSystemTime(new Date(2026, 10, 21, 22, 20, 0))
      await vi.advanceTimersByTimeAsync(15_000)
      expect(wrapper.get('[data-commande]').text()).toBe('22:20')
      wrapper.unmount()
    })

    it('n’arme aucune minuterie quand ni le panneau ni le cadran ne sont là', () => {
      vi.useFakeTimers()
      const cadre = cadreDe(1440, 900)
      const { wrapper } = monter('ailleurs', { frame: cadre, rideau: { y: yRangeA(cadre), baisse: false } })
      expect(vi.getTimerCount()).toBe(0)
      wrapper.unmount()
    })

    it('dit en rendu attaché le nom fixe, sans heure', () => {
      expect(monter('ailleurs', { largeur: 1440 }).wrapper.get('[data-commande]').attributes('aria-label')).toBe('Prochains départs')
    })

    /**
     * Le train s'ébranle, la scène relève le rideau, le panneau sort du champ
     * (≈ 1,5 s) : `visible` tombait, le cadran se dessinait, et un vrai cadran de
     * 52 px avec l'heure s'épinglait en bas à droite — **désactivé**, à portée du
     * pouce, pendant toute l'étape. `voyage.gare` reste « ailleurs » jusqu'au
     * premier `finirEtape` (≈ 9 s), et `Scene.basculerRideau` refuse de baisser en
     * route : il ne répondait pas. Un cadran qu'on touche et qui ne fait rien est
     * une fausse promesse ; rien n'est perdu à ne pas le dessiner.
     */
    it('ne se dessine plus une fois le train parti, et revient à l’arrivée', async () => {
      const f = cadreDe(SEUIL_MOBILE - 1, 844)
      const petit = { frame: f, largeur: SEUIL_MOBILE - 1 }
      const { wrapper, voyage, rideau } = monter('ailleurs', { ...petit, rideau: { y: yPoseA(f), baisse: true } })
      expect(wrapper.find('.panneau').exists()).toBe(true)

      voyage.partirVers('ici')
      // La scène relève le rideau et le sort du champ : le panneau s'en va.
      rideau.value = { y: yRangeA(f), baisse: false }
      await nextTick()
      expect(wrapper.find('.panneau').exists()).toBe(false)
      // On est encore « ailleurs » : c'est tout l'intervalle où le cadran restait.
      expect(voyage.gare).toBe('ailleurs')
      expect(wrapper.get('[data-commande]').classes()).not.toContain('visible')
      expect(wrapper.get('[data-commande]').text()).toBe('')

      // Le tour de la boucle, jusqu'à revenir à quai : le cadran reprend sa place.
      voyage.finirEtape()
      voyage.partirVers('ailleurs')
      for (let i = 0; i < 3; i++) voyage.finirEtape()
      await nextTick()
      expect([voyage.gare, voyage.enRoute]).toEqual(['ailleurs', false])
      expect(wrapper.get('[data-commande]').classes()).toContain('visible')
      expect(wrapper.get('[data-commande]').text()).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  describe('les bras', () => {
    it('sont deux barres du DOM, du haut du panneau au bord de la fenêtre, symétriques', () => {
      const cadre = cadreDe(SEUIL_MOBILE - 1, 844)
      const { wrapper } = monter('ailleurs', { frame: cadre, largeur: SEUIL_MOBILE - 1, rideau: { y: 80, baisse: true } })
      const bras = wrapper.findAll<HTMLElement>('.bras')
      expect(bras).toHaveLength(2)
      const [g, d] = bras.map((b) => b.element.style)
      // Le même retrait des deux bords : c'est ce que « deux bras » veut dire.
      // Où il tombe, et contre quoi, est gardé juste en dessous.
      expect(g.left).toBe(d.right)
      expect(g.left).not.toBe('')
      for (const b of bras) {
        expect(parseFloat(b.element.style.height)).toBeCloseTo(hautDetache(cadre, 80))
        expect(b.attributes('aria-hidden')).toBe('true')
      }
    })

    // Hérité de `.detache`, `auto` leur ferait avaler les appuis sur 2 px de large.
    it('laissent passer le pointeur', () => {
      expect(regle('.bras')).toMatch(/pointer-events:\s*none/)
    })

    it('n’existent pas en rendu attaché : le canvas les trace', () => {
      expect(monter('ailleurs', { largeur: 1440 }).wrapper.findAll('.bras')).toHaveLength(0)
    })

    /**
     * **L'anti-but nommé de la spec** : « Perdre la navigation. Les bras existent
     * pour ça : s'ils coûtaient la frise, ils ne serviraient à rien. »
     *
     * Le retrait était repris de la plaque de scène **en pourcentage** (8,96 % de
     * `RIDEAU.largeur`) et appliqué à un panneau qui fait la largeur de la
     * fenêtre : il grandissait avec elle, tandis que les repères de la navigation
     * sont à distance **fixe** des bords. À 386 le bras gauche tombait sur l'ancre
     * (44,4 contre 44) ; à 663 il traversait « ail|leurs » (69,3). Et le bras
     * droit, que personne n'avait mesuré, traversait le bouton de l'œil aux deux
     * tailles.
     *
     * Les repères sont lus **dans leurs sources** — `ANCRE_FRISE_MOBILE` ici,
     * `--marge-ecran` dans `base.css`, le point et les anneaux de focus dans les
     * deux composants — et jamais recopiés : un test qui porterait les nombres en
     * clair laisserait la frise bouger toute seule.
     *
     * Il compare des **pixels d'écran**, quelle que soit l'unité du style émis :
     * `parseFloat('8,96%')` rend 8,96, et une comparaison posée dessus laisserait
     * passer le pourcentage qu'elle est là pour attraper.
     */
    describe('ne tombent ni sur la frise ni sur l’œil', () => {
      const nb = (re: RegExp, texte: string, quoi: string) => {
        const m = re.exec(texte)
        expect(m, `pas de ${quoi}`).not.toBeNull()
        return Number(m![1])
      }
      const navCss = () => readFileSync('src/components/NavFrise.vue', 'utf8')
      const oeilCss = () => readFileSync('src/components/EyeButton.vue', 'utf8')
      const baseCss = () => readFileSync('src/styles/base.css', 'utf8')

      /**
       * Le premier repère à gauche, en pixels depuis le bord **gauche** de la
       * fenêtre : le point de la gare à quai, qui déborde de l'ancre, ou l'anneau
       * de focus de son lien, selon lequel sort le plus.
       */
      const repereGauche = () => {
        const css = navCss()
        const debord = nb(/\.point\s*\{[^}]*margin-left:\s*-([\d.]+)px/, css, 'débord du point')
        const trait = nb(/\.gare:focus-visible\s*\{[^}]*outline:\s*([\d.]+)px/, css, 'anneau de la gare')
        const ecart = nb(/\.gare:focus-visible\s*\{[^}]*outline-offset:\s*([\d.]+)px/, css, 'écart de l’anneau')
        return ANCRE_FRISE_MOBILE - Math.max(debord, trait + ecart)
      }

      /**
       * Le premier repère à droite, en pixels depuis le bord **droit** : le bouton
       * de l'œil, anneau de focus compris. Il se pose à `--marge-ecran` du bord et
       * fait 36 px de large (24 d'icône, 6 de rembourrage de chaque côté) : le bras
       * ne passe donc qu'**avant** lui, entre lui et le bord de la fenêtre.
       */
      const repereDroit = () => {
        const css = oeilCss()
        expect(css, 'l’œil ne se pose plus sur --marge-ecran').toMatch(/right:\s*var\(--marge-ecran\)/)
        const marge = nb(/--marge-ecran:\s*([\d.]+)px/, baseCss(), '--marge-ecran')
        const trait = nb(/\.oeil:focus-visible\s*\{[^}]*outline:\s*([\d.]+)px/, css, 'anneau de l’œil')
        const ecart = nb(/\.oeil:focus-visible\s*\{[^}]*outline-offset:\s*([\d.]+)px/, css, 'écart de l’anneau')
        return marge - (trait + ecart)
      }

      /** Un retrait de `.bras`, quelle que soit son unité, en pixels d'écran. */
      const enPixels = (valeur: string, largeurInterieure: number) => {
        const m = /^(-?[\d.]+)(px|%)$/.exec(valeur)
        expect(m, `retrait illisible : « ${valeur} »`).not.toBeNull()
        return m![2] === '%' ? (Number(m![1]) / 100) * largeurInterieure : Number(m![1])
      }

      /** Le bord **intérieur** du panneau : la gouttière, puis le filet. */
      const bordPanneau = () =>
        parseFloat(regle('.detache').match(/left:\s*([\d.]+)px/)![1]) + filet()

      /** Les deux bras, en pixels d'écran depuis le bord de fenêtre qui les porte. */
      const poser = (l: number) => {
        const f = cadreDe(l, 844)
        const { wrapper } = monter('ailleurs', { frame: f, largeur: l, rideau: { y: yPoseA(f), baisse: true } })
        const bras = wrapper.findAll<HTMLElement>('.bras')
        expect(bras, `pas de bras à ${l}`).toHaveLength(2)
        const bord = bordPanneau()
        const interieur = l - 2 * bord
        return {
          bord,
          large: parseFloat(regle('.bras').match(/width:\s*([\d.]+)px/)![1]),
          gauche: bord + enPixels(bras[0].element.style.left, interieur),
          droit: bord + enPixels(bras[1].element.style.right, interieur),
        }
      }

      it.each([320, 386, 414, 663, 719])('dégagent les deux repères à %i px de large', (l) => {
        const { bord, large, gauche, droit } = poser(l)
        // À gauche : tout le bras tient avant le premier repère de la frise.
        expect(gauche + large, `bras gauche à ${l}`).toBeLessThanOrEqual(repereGauche())
        // À droite, mesuré depuis le bord droit : tout le bras tient avant l'œil.
        expect(droit + large, `bras droit à ${l}`).toBeLessThanOrEqual(repereDroit())
        // Et les deux restent **dans** la largeur du panneau, pas débordants.
        expect(gauche, `bras gauche hors du panneau à ${l}`).toBeGreaterThanOrEqual(bord)
        expect(droit, `bras droit hors du panneau à ${l}`).toBeGreaterThanOrEqual(bord)
        expect(2 * (gauche + large), `les deux bras se croisent à ${l}`).toBeLessThan(l)
      })

      // Le cœur de la correction : les repères ne bougent pas avec la fenêtre, le
      // retrait non plus. Un pourcentage, lui, les rattrape.
      it('gardent le même retrait d’un bout à l’autre du seuil', () => {
        const etroit = poser(320)
        const large = poser(SEUIL_MOBILE - 1)
        expect(large.gauche).toBeCloseTo(etroit.gauche)
        expect(large.droit).toBeCloseTo(etroit.droit)
      })
    })
  })

  /**
   * jsdom ne met rien en page : ce test est un **modèle** de la grille d'une ligne,
   * `3.4em 1fr auto` avec un `gap`. Les trois pistes couvrent toujours `contenu - 2 gap`,
   * quel que soit le texte : leur somme ne mesure rien. Seule la piste `1fr` (la
   * destination et ses points) peut manquer de place. À 320 px, avec la pire paire
   * (`LE PRINTEMPS` / `À L'HEURE`) : contenu 266, moins deux gaps (20), moins l'heure
   * (3,4 em = 47,6), moins le statut (9 × 8,40 = 75,6) = **122,8 px disponibles** ;
   * la destination demande 12 × 8,40 + le retrait des points (0,7 em = 9,8) =
   * **110,6 px nécessaires**. Marge : 12,2 px. Mesure faite dans un vrai 320 × 568 :
   * chasse 8,40 px (0,6 em à 14 px), ligne de 290 px de boîte, 266 de contenu.
   */
  describe('le débordement à 320 px', () => {
    const r = regle('.detache')
    const px = (re: RegExp) => parseFloat(r.match(re)![1])
    const ligne = regle('.ligne')
    const corps = px(/font-size:\s*([\d.]+)px/)
    const creux = px(/--creux:\s*([\d.]+)px/)
    const ecart = parseFloat(regle('.detache .ligne').match(/gap:\s*([\d.]+)px/)![1])
    const gouttiere = px(/left:\s*([\d.]+)px/)
    const colonneHeure = parseFloat(ligne.match(/grid-template-columns:\s*([\d.]+)em/)![1])
    const padding = parseFloat(ligne.match(/padding:\s*0 ([\d.]+)px/)![1])
    const margeNegative = parseFloat(ligne.match(/margin:\s*0 -([\d.]+)px/)![1])
    const retraitPoints = parseFloat(regle('.ligne > span:nth-child(2)::after').match(/margin:[^;]*\s([\d.]+)em;/)![1])
    const CHASSE = 0.6

    /** Contenu d'une ligne : l'intérieur du panneau, élargi par la marge négative, rétréci par le padding. */
    const contenu = 320 - 2 * gouttiere - 2 * filet() - 2 * creux + 2 * margeNegative - 2 * padding

    it('lit un contenu de 266 px, la mesure faite dans un vrai 320 × 568', () => {
      expect(contenu).toBe(266)
    })

    it('laisse à la destination la place qu’elle demande, avec la pire paire', () => {
      const paires = [...VIVIER, ...departsReels(new Date())]
      const marges = paires.map((d) => {
        const piste = contenu - 2 * ecart - colonneHeure * corps - d.statut.length * CHASSE * corps
        const besoin = d.destination.length * CHASSE * corps + retraitPoints * corps
        return piste - besoin
      })
      const pire = Math.min(...marges)
      expect(pire, `la piste 1fr manque de ${-pire}px`).toBeGreaterThanOrEqual(0)
    })

    it('tient dans le bandeau, d’après la source', () => {
      const titre = source().match(/texte="(PROCHAINS DÉPARTS)"/)![1]
      const corpsEntete = parseFloat(regle('.detache .entete').match(/font-size:\s*([\d.]+)px/)![1])
      const espacement = parseFloat(regle('.entete').match(/letter-spacing:\s*([\d.]+)em/)![1])
      const lettres = (titre.length + '00:00'.length) * (CHASSE + espacement) * corpsEntete
      expect(lettres, `bandeau ${lettres}px pour ${contenu}px`).toBeLessThanOrEqual(contenu)
    })
  })
})
