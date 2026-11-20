import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { RouterLink, createMemoryHistory } from 'vue-router'

import PanneauDeparts from '@/components/PanneauDeparts.vue'
import { FRAME_KEY, RIDEAU_KEY } from '@/composables/useScene'
import type { EtatRideau } from '@/composables/useScene'
import { fitStage } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { BISEAU, RIDEAU, yPoseA, yRangeA } from '@/scene/rideau'
import { createAppRouter } from '@/router'
import { CV } from '@/contenu/liens'
import { useVoyage } from '@/stores/voyage'

const ADRESSE = /[\w.]+@[\w.]+\.\w+/

type Options = {
  frame?: Frame | null
  /** Absent : le rideau est posé. `null` : la scène n'a rien émis. */
  rideau?: EtatRideau | null
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
  const frame = options.frame === undefined ? fitStage(1440, 900) : options.frame
  const cadre = ref<Frame | null>(frame)
  const posee = frame ? { y: yPoseA(frame), baisse: true } : null
  const rideau = ref<EtatRideau | null>(options.rideau === undefined ? posee : options.rideau)
  const wrapper = mount(PanneauDeparts, {
    attachTo: document.body,
    global: {
      // CV est un RouterLink : pas de rechargement de la page, la scène ne repart pas.
      plugins: [createAppRouter(createMemoryHistory())],
      provide: { [FRAME_KEY as symbol]: cadre, [RIDEAU_KEY as symbol]: rideau },
    },
  })
  return { wrapper, cadre, rideau, voyage }
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
    const frame = fitStage(1440, 900)
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
    expect(lien(wrapper, 'LINKEDIN').element.tagName).toBe('A')
    expect(lien(wrapper, 'ÉCRIRE').element.tagName).toBe('A')
  })

  /**
   * Au retrait, le panneau s'efface sur place pendant une demi-seconde. Cliquer
   * `CV` pendant ce fondu poussait `/ailleurs/cv`, dont
   * l'`afterEach` appelle `partirVers('ailleurs')` sur un train déjà en
   * marche : il le redirigeait, et l'envoyait faire tout le tour de la boucle.
   */
  it('les liens ne sont plus cliquables pendant le fondu du retrait', () => {
    const source = readFileSync('src/components/PanneauDeparts.vue', 'utf8')
    const bloc = source.slice(source.indexOf('.dissoudre-leave-active .reel'))
    expect(bloc.slice(0, bloc.indexOf('}'))).toMatch(/pointer-events:\s*none/)
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
    const f = fitStage(1440, 900)
    const { wrapper, rideau } = monter('ailleurs', { rideau: { y: 120, baisse: true } })
    expect(place(wrapper).top).toBeCloseTo(f.offsetY + 120 * f.scale)
    // La plaque descend : le texte la suit, image par image.
    rideau.value = { y: 200, baisse: true }
    await nextTick()
    expect(place(wrapper).top).toBeCloseTo(f.offsetY + 200 * f.scale)
    expect(200 * f.scale).not.toBeCloseTo(RIDEAU.yPose * f.scale)
  })

  it('le texte reste dans son cadre après un redimensionnement', async () => {
    const f1 = fitStage(1440, 900)
    const { wrapper, cadre, rideau } = monter()
    const y = (rideau.value as EtatRideau).y
    expect(place(wrapper).left).toBeCloseTo(f1.offsetX + RIDEAU.x * f1.scale)
    expect(place(wrapper).top).toBeCloseTo(f1.offsetY + y * f1.scale)
    expect(place(wrapper).transform).toBe(`scale(${f1.scale})`)
    // Le texte garde sa taille de cadre et c'est la transformation qui l'échelonne :
    // largeur et hauteur sont celles du rideau, jamais multipliées.
    expect(place(wrapper).width).toBe(`${RIDEAU.largeur}px`)
    expect(place(wrapper).height).toBe(`${RIDEAU.hauteur}px`)

    const f2 = fitStage(800, 1000)
    cadre.value = f2
    // La scène recadre le rideau dans la foulée : `y` suit le nouveau cadre.
    rideau.value = { y: yPoseA(f2), baisse: true }
    await nextTick()
    expect(place(wrapper).left).toBeCloseTo(f2.offsetX + RIDEAU.x * f2.scale)
    expect(place(wrapper).top).toBeCloseTo(f2.offsetY + yPoseA(f2) * f2.scale)
    expect(place(wrapper).transform).toBe(`scale(${f2.scale})`)
    expect(f2.scale).not.toBeCloseTo(f1.scale)
  })

  it('n’affiche rien tant que la scène n’a pas émis la position du rideau', () => {
    expect(monter('ailleurs', { rideau: null }).wrapper.find('.panneau').exists()).toBe(false)
  })

  it('ne se pose pas sans cadre, même si le rideau est là', () => {
    const { wrapper } = monter('ailleurs', { frame: null, rideau: { y: RIDEAU.yPose, baisse: true } })
    expect(wrapper.find('.panneau').exists()).toBe(false)
  })

  it('apparaît dès que la scène baisse le rideau, avant que la plaque ne soit arrivée', async () => {
    const f = fitStage(1440, 900)
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
    const f = fitStage(1440, 900)
    const { wrapper, voyage } = monter('ailleurs', { rideau: { y: yPoseA(f), baisse: true } })
    expect(wrapper.get('.panneau').classes()).not.toContain('remonte')
    voyage.partirVers('ici')
    await nextTick()
    expect(wrapper.find('.panneau').exists()).toBe(true)
    expect(wrapper.get('.panneau').classes()).toContain('remonte')
  })

  it('remonte aussi quand c’est la scène qui a relevé le rideau, plaque encore en vue', async () => {
    const f = fitStage(1440, 900)
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
    const f = fitStage(1440, 900)
    const { wrapper, rideau } = monter('ailleurs', { rideau: { y: yPoseA(f), baisse: true } })
    rideau.value = { y: (yPoseA(f) + yRangeA(f)) / 2, baisse: false }
    await nextTick()
    expect(wrapper.get('.panneau').classes()).toContain('remonte')
  })

  it('s’efface une fois que la plaque est sortie de la fenêtre', async () => {
    const f = fitStage(1440, 900)
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
   * C'est le budget qui décide de la mise en page, pas l'inverse : resserrer
   * une ligne sans toucher au budget ne trompe pas ce garde.
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
    const regleApres = source().slice(
      source().indexOf('.ligne > span:nth-child(2)::after'),
      source().indexOf('}', source().indexOf('.ligne > span:nth-child(2)::after')),
    )
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
   * fenêtre. Les confronter tels quels (12 contre 12) ne prouverait rien — on
   * compare ce que l'œil voit, en pixels d'écran, des deux côtés.
   */
  it('coupe son bandeau au même biseau que le cadre', () => {
    const f = fitStage(1440, 900)
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
    const apres = source().slice(
      source().indexOf('.ligne > span:nth-child(2)::after'),
      source().indexOf('}', source().indexOf('.ligne > span:nth-child(2)::after')),
    )
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
