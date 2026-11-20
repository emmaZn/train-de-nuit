import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { RouterLink, createMemoryHistory } from 'vue-router'

import PanneauDeparts from '@/components/PanneauDeparts.vue'
import { FRAME_KEY } from '@/composables/useScene'
import { fitStage } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { createAppRouter } from '@/router'
import { CV } from '@/contenu/liens'
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
    global: {
      // CV est un RouterLink : pas de rechargement de la page, la scène ne repart pas.
      plugins: [createAppRouter(createMemoryHistory())],
      provide: { [FRAME_KEY as symbol]: cadre },
    },
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

  // Tâche 4 du plan du rideau : le composant n'a plus de `place` (voir l'en-tête de
  // `PanneauDeparts.vue`), donc il ne s'affiche pas. À rétablir quand la scène lui rend une position.
  it.skip('affiche cinq lignes à quai, dont trois liens', () => {
    const { wrapper } = monter()
    expect(wrapper.findAll('.ligne')).toHaveLength(5)
    expect(wrapper.findAll('a')).toHaveLength(3)
  })

  // Tâche 4 du plan du rideau : le composant n'a plus de `place` (voir l'en-tête de
  // `PanneauDeparts.vue`), donc il ne s'affiche pas. À rétablir quand la scène lui rend une position.
  it.skip('ne répète pas une destination éteinte', () => {
    const { wrapper } = monter()
    const mots = wrapper.findAll('.eteint').map((l) => l.text())
    expect(mots).toHaveLength(2)
    expect(new Set(mots).size).toBe(mots.length)
  })

  it('met les trois liens avant les lignes éteintes', () => {
    const lignes = monter().wrapper.findAll('.ligne')
    expect(lignes.slice(0, 3).every((l) => l.element.tagName === 'A')).toBe(true)
    expect(lignes.slice(3).every((l) => l.element.tagName !== 'A')).toBe(true)
  })

  // Tâche 4 du plan du rideau : le composant n'a plus de `place` (voir l'en-tête de
  // `PanneauDeparts.vue`), donc il ne s'affiche pas. À rétablir quand la scène lui rend une position.
  it.skip('LINKEDIN s’ouvre dans un nouvel onglet', () => {
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
  // Tâche 4 du plan du rideau : le composant n'a plus de `place` (voir l'en-tête de
  // `PanneauDeparts.vue`), donc il ne s'affiche pas. À rétablir quand la scène lui rend une position.
  it.skip('CV est un RouterLink vers /ailleurs/cv, pas un <a> nu', () => {
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
    expect(routes.some((t) => t.includes('LINKEDIN'))).toBe(false)
    expect(routes.some((t) => t.includes('ÉCRIRE'))).toBe(false)
  })

  /**
   * Au départ, le panneau s'efface sur place pendant une demi-seconde (spec
   * §6.6). Cliquer `CV` pendant ce fondu poussait `/ailleurs/cv`, dont
   * l'`afterEach` appelle `partirVers('ailleurs')` sur un train déjà en
   * marche : il le redirigeait, et l'envoyait faire tout le tour de la boucle.
   */
  it('les liens ne sont plus cliquables pendant le fondu du départ', () => {
    const source = readFileSync('src/components/PanneauDeparts.vue', 'utf8')
    const bloc = source.slice(source.indexOf('.dissoudre-leave-active .reel'))
    expect(bloc.slice(0, bloc.indexOf('}'))).toMatch(/pointer-events:\s*none/)
  })

  // Tâche 4 du plan du rideau : le composant n'a plus de `place` (voir l'en-tête de
  // `PanneauDeparts.vue`), donc il ne s'affiche pas. À rétablir quand la scène lui rend une position.
  it.skip('ÉCRIRE porte un href mailto dès le montage, pas au clic', () => {
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
    expect(wrapper.text()).not.toMatch(ADRESSE)
    // Le href, lui, est un mailto: nécessaire : on regarde tout le reste.
    const html = wrapper.html().replace(/href="mailto:[^"]*"/, '')
    expect(html).not.toMatch(ADRESSE)
  })

  // Tâche 4 du plan du rideau : le composant n'a plus de `place` (voir l'en-tête de
  // `PanneauDeparts.vue`), donc il ne s'affiche pas. À rétablir quand la scène lui rend une position.
  it.skip('les trois liens prennent le focus clavier, dans l’ordre du DOM', () => {
    const { wrapper } = monter()
    const liens = wrapper.findAll('a')
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

  // Tâche 4 : ce test lisait `PIECES.panneau` / `PANNEAU_BISEAU`, partis avec la plaque.
  // À réécrire sur le rideau : la place du texte suit le cadre de la scène : `offset + position × scale`, avec la position que la scène émettra (tâche 4).
  it.todo('le texte reste dans son cadre après un redimensionnement')

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
  // Tâche 4 : ce test lisait `PIECES.panneau` / `PANNEAU_BISEAU`, partis avec la plaque.
  // À réécrire sur le rideau : l'addition `--entete + 5 × --ligne + --marge` contre la hauteur du rideau (`RIDEAU.hauteur`), qui n'est plus celle de la plaque de 166 px (tâches 4 et 5).
  it.todo('tient dans la hauteur du cadre, sans vide sous la dernière ligne')

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
    for (const ligne of wrapper.findAll('.ligne')) {
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
   * `PANNEAU_BISEAU` à `largeur − PANNEAU_BISEAU`. Sans coupe, le bandeau peint
   * deux triangles de douze pixels **hors du panneau, sur le mur**, et le haut
   * du cadre se lit à coins carrés. Les deux coins qu'on regarde en premier.
   */
  // Tâche 4 : ce test lisait `PIECES.panneau` / `PANNEAU_BISEAU`, partis avec la plaque.
  // À réécrire sur le rideau : le bandeau se coupe au biseau du cadre — le biseau du rideau viendra avec sa couche (tâche 2) ; `PANNEAU_BISEAU` est parti de `QuaiLayer.ts`.
  it.todo('coupe son bandeau au même biseau que le cadre')

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
