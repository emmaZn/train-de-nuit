import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import VoletTexte from '@/components/VoletTexte.vue'
import { DECALAGE_CARACTERE, PAS_MS, TOUR, dureeEnPas } from '@/components/volets'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/** Ce que montrent les volets, caractère par caractère (l'attribut que le CSS affiche). */
const glyphes = (w: ReturnType<typeof mount>) => w.findAll('[data-volets] [data-g]').map((g) => g.attributes('data-g'))
// Le DOM se met à jour au tick suivant : sans l'attente, on lirait l'image d'avant.
const avancer = async (pas: number) => {
  vi.advanceTimersByTime(pas * PAS_MS)
  await nextTick()
}

describe('VoletTexte', () => {
  it('porte le vrai texte dès le montage, avant d’avoir tourné', async () => {
    const w = mount(VoletTexte, { props: { texte: 'LINKEDIN', retard: 0 } })
    expect(w.text()).toBe('LINKEDIN')
    // Le défilé est bien en route : sans lui ce test ne prouverait rien du « avant ».
    expect(w.find('[data-volets]').exists()).toBe(true)
  })

  it('cache au lecteur d’écran les glyphes qui tournent, jamais le vrai texte', async () => {
    const w = mount(VoletTexte, { props: { texte: 'LINKEDIN', retard: 0 } })
    const vrai = w.get('[data-vrai]')
    expect(vrai.attributes('aria-hidden')).toBeUndefined()
    expect(w.get('[data-volets]').attributes('aria-hidden')).toBe('true')
  })

  /**
   * Les glyphes ne sont **pas du texte** : le CSS les tire d'un attribut. Un
   * lecteur d'écran, la recherche dans la page et la sélection ne voient donc
   * jamais « QXLMBDRP » dans `textContent`. Mais le contenu généré par CSS,
   * lui, **entre dans le nom accessible** d'un lien : c'est `aria-hidden` sur
   * la couche — et lui seul — qui garde les glyphes hors du nom des trois
   * liens. Ne pas le retirer comme redondant.
   */
  it('ne met aucune lettre qui tourne dans le texte du DOM, à aucun instant', async () => {
    const w = mount(VoletTexte, { props: { texte: 'LINKEDIN', retard: 0 } })
    let tours = 0
    for (let pas = 0; pas <= dureeEnPas(8) + 1; pas++) {
      expect(w.text(), `au pas ${pas}`).toBe('LINKEDIN')
      expect(w.element.textContent!.replace(/\s/g, ''), `au pas ${pas}`).toBe('LINKEDIN')
      tours++
      await avancer(1)
    }
    expect(tours).toBeGreaterThan(TOUR)
  })

  it('se pose d’un coup quand on lui demande de ne pas bouger', async () => {
    const w = mount(VoletTexte, { props: { texte: 'CV', retard: 500, fige: true } })
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(w.text()).toBe('CV')
    expect(w.get('[data-vrai]').classes()).not.toContain('tourne')
  })

  it('reste blanc jusqu’à son retard, puis tourne de gauche à droite', async () => {
    const retard = 5 * PAS_MS
    const w = mount(VoletTexte, { props: { texte: 'AB', retard } })
    expect(glyphes(w)).toEqual([' ', ' '])
    await avancer(4)
    expect(glyphes(w)).toEqual([' ', ' '])
    await avancer(1)
    // Au pas du retard, le premier volet est parti ; le second attend son tour.
    const [a, b] = glyphes(w)
    expect(a).not.toBe(' ')
    expect(b).toBe(' ')
    await avancer(DECALAGE_CARACTERE)
    expect(glyphes(w)[1]).not.toBe(' ')
  })

  it('se pose lettre à lettre puis retire sa couche, sur le texte déjà là', async () => {
    const w = mount(VoletTexte, { props: { texte: 'AB', retard: 0 } })
    const fin = dureeEnPas(2)
    await avancer(fin - 1)
    // Le dernier volet n'a pas fini son tour : la couche est encore là.
    expect(w.find('[data-volets]').exists()).toBe(true)
    expect(glyphes(w)[0]).toBe('A')
    expect(glyphes(w)[1]).not.toBe('B')
    await avancer(1)
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(w.text()).toBe('AB')
    expect(w.get('[data-vrai]').classes()).not.toContain('tourne')
  })

  it('cache le vrai texte à l’œil pendant le défilé, sans le retirer', async () => {
    const w = mount(VoletTexte, { props: { texte: 'AB', retard: 0 } })
    expect(w.get('[data-vrai]').classes()).toContain('tourne')
  })

  it('compte les volets qu’il traverse, et pas un de plus', async () => {
    const w = mount(VoletTexte, { props: { texte: 'K', retard: 0 } })
    const vus: Array<string | undefined> = []
    for (let i = 0; i < TOUR; i++) {
      vus.push(glyphes(w)[0])
      await avancer(1)
    }
    // Dix volets montrés, tous différents, puis la couche s'en va sur le vrai texte.
    expect(vus).toHaveLength(TOUR)
    expect(vus.every((g) => g !== undefined)).toBe(true)
    expect(new Set(vus).size).toBe(TOUR)
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(w.text()).toBe('K')
  })

  it('suit le texte quand il change en cours de route', async () => {
    const w = mount(VoletTexte, { props: { texte: 'AB', retard: 0 } })
    await avancer(2)
    await w.setProps({ texte: 'CD' })
    expect(w.text()).toBe('CD')
    await avancer(dureeEnPas(2))
    expect(w.find('[data-volets]').exists()).toBe(false)
  })

  // L'horloge change de minute toutes les soixante secondes : le texte change,
  // la couche ne doit pas revenir figée devant lui.
  it('ne rejoue pas ses volets quand le texte change une fois posé', async () => {
    const w = mount(VoletTexte, { props: { texte: '21:03', retard: 0 } })
    await avancer(dureeEnPas(5))
    expect(w.find('[data-volets]').exists()).toBe(false)
    await w.setProps({ texte: '21:04 DEMAIN' })
    await avancer(dureeEnPas(12) + 5)
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(w.text()).toBe('21:04 DEMAIN')
  })

  it('arrête sa minuterie une fois posé, et au démontage', async () => {
    const w = mount(VoletTexte, { props: { texte: 'AB', retard: 0 } })
    expect(vi.getTimerCount()).toBe(1)
    await avancer(dureeEnPas(2))
    expect(vi.getTimerCount()).toBe(0)
    const v = mount(VoletTexte, { props: { texte: 'AB', retard: 0 } })
    expect(vi.getTimerCount()).toBe(1)
    v.unmount()
    expect(vi.getTimerCount()).toBe(0)
    w.unmount()
  })

  // Un visiteur qui a demandé moins d'animations puis lève le réglage rideau
  // baissé : la couche revient, et sa minuterie avec elle. Sans minuterie, le
  // vrai texte restait transparent sous une couche que rien ne faisait avancer.
  it('se met à tourner quand le réglage est levé, et finit par se poser', async () => {
    const w = mount(VoletTexte, { props: { texte: 'AB', retard: 0, fige: true } })
    expect(w.find('[data-volets]').exists()).toBe(false)
    await w.setProps({ fige: false })
    expect(w.find('[data-volets]').exists()).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
    await avancer(dureeEnPas(2))
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(w.get('[data-vrai]').classes()).not.toContain('tourne')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reprend où il en était quand le réglage est posé puis levé', async () => {
    const w = mount(VoletTexte, { props: { texte: 'AB', retard: 0 } })
    await avancer(3)
    await w.setProps({ fige: true })
    await w.setProps({ fige: false })
    expect(w.find('[data-volets]').exists()).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
    await avancer(dureeEnPas(2))
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ne rejoue pas ce qui était déjà posé quand le réglage est levé', async () => {
    const w = mount(VoletTexte, { props: { texte: 'AB', retard: 0 } })
    await avancer(dureeEnPas(2))
    await w.setProps({ fige: true })
    await w.setProps({ fige: false })
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  // Jamais de couche sans minuterie : un texte vide ne tourne pas, et dès qu'il
  // s'emplit la couche et sa minuterie viennent ensemble.
  it('ne montre une couche que si une minuterie la fait avancer', async () => {
    const w = mount(VoletTexte, { props: { texte: '', retard: 0 } })
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    await w.setProps({ texte: 'AB' })
    expect(w.find('[data-volets]').exists()).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
  })

  // Le texte s'allonge en plein défilé : le défilé continue, il n'en part pas un second.
  it('garde une seule minuterie quand le texte change en cours de défilé', async () => {
    const w = mount(VoletTexte, { props: { texte: 'AB', retard: 0 } })
    await avancer(2)
    await w.setProps({ texte: 'ABC' })
    expect(vi.getTimerCount()).toBe(1)
    await avancer(dureeEnPas(3))
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ne lance aucune minuterie quand il est figé', async () => {
    mount(VoletTexte, { props: { texte: 'AB', retard: 0, fige: true } })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('se fige aussi quand le réglage change en cours de route', async () => {
    const w = mount(VoletTexte, { props: { texte: 'AB', retard: 0 } })
    await avancer(2)
    expect(vi.getTimerCount()).toBe(1)
    await w.setProps({ fige: true })
    expect(w.find('[data-volets]').exists()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  /*
   * Les gardes qui suivent lisent le **source** : jsdom n'injecte pas les styles
   * `scoped` et ne met rien en page. Ce sont les deux règles qui portent la
   * décision d'accessibilité.
   */
  const source = readFileSync('src/components/VoletTexte.vue', 'utf8')
  const regle = (nom: string) => {
    const i = source.indexOf(`${nom} {`)
    expect(i, `pas de règle ${nom}`).toBeGreaterThanOrEqual(0)
    return source.slice(i, source.indexOf('}', i))
  }

  it('affiche les glyphes par le CSS, depuis l’attribut, pas par du texte', async () => {
    expect(regle('.glyphe::before')).toContain('content: attr(data-g)')
  })

  /**
   * `visibility: hidden` et `display: none` retirent le texte de l'arbre
   * d'accessibilité : le lecteur d'écran n'aurait plus rien à lire — pas même
   * les liens — pendant tout le défilé. Seule la couleur s'efface. La regex
   * interdit aussi `opacity` et `clip` : ils ne sortent pas le texte de
   * l'arbre, mais ils ne sont pas le choix retenu, et `color: transparent` n'a
   * qu'un ennemi (`forced-colors`), isolé par le garde suivant.
   */
  it('cache le vrai texte par sa couleur seulement, jamais hors de l’arbre d’accessibilité', async () => {
    const r = regle('.tourne')
    expect(r).toMatch(/color:\s*transparent/)
    expect(r).not.toMatch(/visibility|display:\s*none|opacity|clip/)
  })

  // Le système impose les couleurs et `transparent` n'y survit pas : le vrai
  // texte se rallumerait sous la couche, deux chaînes lettre contre lettre.
  // Ces visiteurs n'ont pas le défilé, et lisent le texte posé.
  it('retire la couche en contraste forcé, où le vrai texte ne peut plus être transparent', () => {
    const i = source.indexOf('@media (forced-colors: active)')
    expect(i, 'pas de @media forced-colors').toBeGreaterThanOrEqual(0)
    const bloc = source.slice(i, source.indexOf('</style>', i))
    expect(bloc).toMatch(/\.volets\s*\{\s*display:\s*none/)
  })

  it('ne se laisse ni sélectionner ni cliquer par la couche décorative', async () => {
    const r = regle('.volets')
    expect(r).toContain('pointer-events: none')
    expect(r).toContain('user-select: none')
    // Safari avant la 17 ne connaît que la forme préfixée.
    expect(r).toContain('-webkit-user-select: none')
  })
})
