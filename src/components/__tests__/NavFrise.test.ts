import { readFileSync } from 'node:fs'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { RouterLink, createMemoryHistory } from 'vue-router'
import NavFrise from '@/components/NavFrise.vue'
import { createAppRouter } from '@/router'
import { useVoyage } from '@/stores/voyage'
import {
  ANCRE_FRISE,
  ANCRE_FRISE_MOBILE,
  LARGEUR_LIBELLE_MOBILE,
  SEUIL_MOBILE,
  ecartFrise,
  fonduFrise,
  garesVisibles,
  margeVoieDroite,
} from '@/scene/layout'

async function monter() {
  setActivePinia(createPinia())
  const router = createAppRouter(createMemoryHistory())
  await router.push('/ici')
  await router.isReady()
  const voyage = useVoyage()
  const wrapper = mount(NavFrise, { global: { plugins: [router] } })
  return { wrapper, voyage, router }
}

test('la gare courante porte la mention À QUAI', async () => {
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="a-quai"]').text()).toContain('À QUAI')
})

test('la gare suivante porte la mention PROCHAIN ARRÊT', async () => {
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="prochain"]').text()).toContain('PROCHAIN ARRÊT')
})

test('la gare à quai est celle où l’on est', async () => {
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="a-quai"]').attributes('data-gare')).toBe('ici')
})

test('les gares déjà franchies sont marquées passées', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.finirEtape()
  await wrapper.vm.$nextTick()
  expect(wrapper.findAll('[data-etat="passee"]').length).toBeGreaterThan(0)
})

test('en route, aucune gare n’est à quai', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('la-haut')
  await wrapper.vm.$nextTick()
  expect(wrapper.find('[data-etat="a-quai"]').exists()).toBe(false)
})

test('en route, PROCHAIN ARRÊT désigne la cible, pas une gare traversée', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('ailleurs') // trois étapes : on traverse plus-loin et là-haut
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[data-etat="prochain"]').attributes('data-gare')).toBe('ailleurs')
})

test('la frise est une vraie navigation, au clavier comme à la souris', async () => {
  const { wrapper } = await monter()
  expect(wrapper.find('nav').exists()).toBe(true)
  expect(wrapper.findAllComponents(RouterLink).length).toBeGreaterThan(1)
})

// La frise suit le train pendant tout le trajet, au lieu de sauter d'un cran
// une fois arrivee.
test('la frise glisse en continu pendant le trajet', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.setProgression(0.5)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('.piste').attributes('style')).toContain('--legs: 0.5')
})

test('la frise avance avec la progression, sans a-coup', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  const positions: string[] = []
  for (const p of [0, 0.25, 0.5, 0.75]) {
    voyage.setProgression(p)
    await wrapper.vm.$nextTick()
    positions.push(wrapper.get('.piste').attributes('style') ?? '')
  }
  expect(new Set(positions).size).toBe(4)
})

test('a quai, la frise se pose sur un cran entier', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.finirEtape()
  await wrapper.vm.$nextTick()
  expect(wrapper.get('.piste').attributes('style')).toContain('--legs: 1')
})

test('le marqueur ne se deplace plus : c est la frise qui defile sous lui', async () => {
  const { wrapper, voyage } = await monter()
  voyage.partirVers('plus-loin')
  voyage.setProgression(0.5)
  await wrapper.vm.$nextTick()
  expect(wrapper.html()).not.toContain('--avancee')
})

test('le marqueur n’apparaît qu’en route', async () => {
  const { wrapper } = await monter()
  expect(wrapper.find('[data-role="marqueur"]').exists()).toBe(false)
})

// Le branchement : la frise doit vraiment poser l'écartement calculé sur le DOM.
test('la frise étale ses gares sur la largeur de l’écran', async () => {
  window.innerWidth = 1280
  const { wrapper } = await monter()
  const style = wrapper.get('nav.frise').attributes('style') ?? ''
  expect(style).toContain(`--ecart: ${ecartFrise(1280, garesVisibles(1280))}px`)
  expect(style).toContain(`--ancre: ${ANCRE_FRISE}px`)
})

test('sur un téléphone, la frise se resserre et ne vise plus que deux gares', async () => {
  window.innerWidth = 390
  const { wrapper } = await monter()
  const style = wrapper.get('nav.frise').attributes('style') ?? ''
  expect(garesVisibles(390)).toBe(2)
  expect(style).toContain(`--ecart: ${ecartFrise(390, 2)}px`)
  expect(style).toContain(`--ancre: ${ANCRE_FRISE_MOBILE}px`)
  window.innerWidth = 1024
})

test('la frise suit un redimensionnement', async () => {
  window.innerWidth = 1280
  const { wrapper } = await monter()
  const avant = wrapper.get('nav.frise').attributes('style')
  window.innerWidth = 1920
  window.dispatchEvent(new Event('resize'))
  await wrapper.vm.$nextTick()
  expect(wrapper.get('nav.frise').attributes('style')).not.toBe(avant)
  window.innerWidth = 1024
})

/**
 * Décidé le 23 novembre 2026 : sous mouvement réduit la frise **glisse
 * encore**, mais trop vite pour qu'on y lise un voyage — 0,2 s au lieu de
 * 1,2 s. La couper net ferait perdre le lien entre la gare qu'on quitte et
 * celle où l'on arrive. Les trois transitions de la frise partent ensemble :
 * la piste qui glisse, les gares qui s'éteignent, le libellé qui grandit.
 */
test('en mouvement réduit, les trois transitions de la frise sont raccourcies ensemble', () => {
  const source = readFileSync('src/components/NavFrise.vue', 'utf8')
  const garde = source.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\n\}\n/)
  for (const regle of ['.piste', '.voie', '.libelle']) {
    expect(garde?.[0], regle).toContain(regle)
  }
  expect(garde?.[0]).toMatch(/transition-duration:\s*0\.2s/)
})

/**
 * Relevé au clavier le 23 novembre 2026, sur la page qui tourne : la frise
 * offrait **six arrêts pour quatre gares**. La fenêtre est plus large que la
 * boucle — six entrées, quatre gares — donc deux gares y figurent deux fois,
 * sous le même nom et vers la même adresse. À l'œil, c'est la boucle qui
 * continue des deux côtés ; au clavier et au lecteur d'écran, c'étaient deux
 * destinations fantômes.
 *
 * Les copies restent dessinées — sans elles, la frise aurait un bord — mais
 * elles sortent de la tabulation et de l'arbre d'accessibilité.
 */
test('la frise n’offre qu’un lien par gare, les copies restent décoratives', async () => {
  const { wrapper } = await monter()
  const liens = wrapper.findAll('a.gare')
  expect(liens).toHaveLength(6)

  const offerts = liens.filter((l) => l.attributes('aria-hidden') !== 'true')
  expect(offerts.map((l) => l.attributes('href'))).toEqual([
    '/ici',
    '/plus-loin',
    '/la-haut',
    '/ailleurs',
  ])

  // Un nœud `aria-hidden` qui garde un enfant focalisable est une faute : le
  // lecteur d'écran ne l'annonce pas, le clavier l'atteint quand même.
  for (const copie of liens.filter((l) => l.attributes('aria-hidden') === 'true')) {
    expect(copie.attributes('tabindex')).toBe('-1')
  }
})

test('la gare à quai reste offerte, même si c’est la page courante', async () => {
  const { wrapper } = await monter()
  const quai = wrapper.get('[data-etat="a-quai"]')
  expect(quai.attributes('aria-hidden')).toBeUndefined()
  expect(quai.attributes('tabindex')).toBeUndefined()
})

/**
 * Relevé le 23 novembre 2026 sur trois téléphones : la frise **amputait la
 * gare suivante**. Son masque réserve `margeVoieDroite` à droite — la place
 * de l'œil et du FR/EN — soit 130 px ; sur un écran de 390 il ne restait que
 * 250 px visibles, et « PROCHAIN ARRÊT » finissait à 305. Les deux tiers de
 * la mention étaient invisibles, à 375, 390 et 430.
 *
 * Ce n'est pas un réglage à l'œil mais une contrainte de place : la gare
 * suivante doit tenir, mention comprise, **avant que le masque ne commence à
 * l'effacer**. L'écart est donc plafonné sur téléphone, et le plafond ne mord
 * que là où il le faut — à 430 il ne change rien.
 */
for (const largeur of [375, 390, 430]) {
  test(`à ${largeur} px, la gare suivante tient avant le masque`, () => {
    const finDeLaMention = ANCRE_FRISE_MOBILE + ecartFrise(largeur, 2) + LARGEUR_LIBELLE_MOBILE
    const debutDuMasque = largeur - margeVoieDroite(largeur) - fonduFrise(largeur)
    expect(finDeLaMention).toBeLessThanOrEqual(debutDuMasque)
  })
}

test('sur un écran, le plafond ne change rien', () => {
  const largeur = 1280
  expect(largeur).toBeGreaterThanOrEqual(SEUIL_MOBILE)
  // La formule d'avant, telle quelle : rien du bureau ne bouge.
  expect(ecartFrise(largeur, 4)).toBeCloseTo(((1280 - ANCRE_FRISE - 200) / 3) * 0.95, 5)
})

test('sur un téléphone, la mention de la gare suivante est la courte', async () => {
  window.innerWidth = 390
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="prochain"] .mention').text()).toBe('PROCHAIN')
  window.innerWidth = 1024
})

test('sur un écran, elle reste entière', async () => {
  window.innerWidth = 1280
  const { wrapper } = await monter()
  expect(wrapper.get('[data-etat="prochain"] .mention').text()).toBe('PROCHAIN ARRÊT')
  window.innerWidth = 1024
})

/**
 * La frise selon le mode.
 *
 * Trois lueurs y étaient écrites **en dur** à la couleur de trait de la nuit,
 * `rgb(230 230 234)` : elles ne suivaient donc pas le mode, et sur du papier
 * elles devenaient invisibles — la gare « à quai » et le prochain arrêt
 * perdaient leur seule emphase, et la frise cessait de dire où l'on est.
 *
 * De jour, elles ne reviennent pas sous forme de lueur : une lueur en négatif
 * sur du papier est une tache (critère 8 de la spec). C'est un **anneau net**
 * qui tient l'emphase, et la lueur de la voie s'en va.
 */
describe('la frise selon le mode', () => {
  const source = readFileSync('src/components/NavFrise.vue', 'utf8')

  it('ne code plus la couleur de trait de la nuit en dur', () => {
    expect(source).not.toContain('230 230 234')
  })

  it('garde ses lueurs de nuit, dérivées du token', () => {
    expect(source).toMatch(/box-shadow:[^;]*color-mix\(in srgb, var\(--trait\)/)
  })

  it('remplace la lueur du point à quai par un anneau net en jour', () => {
    expect(source).toMatch(
      /\[data-mode="jour"\][^{]*\[data-etat='a-quai'\][^{]*\{[^}]*box-shadow:[^;]*var\(--trait\)/,
    )
  })

  it('retire la lueur de la voie en jour', () => {
    expect(source).toMatch(/\[data-mode="jour"\][^{]*\.halo[^{]*\{[^}]*display:\s*none/)
  })

  it('ne laisse aucun flou dans les ombres du jour', () => {
    const blocs = [...source.matchAll(/:root\[data-mode="jour"\][^{]*\{([^}]*)\}/g)]
    expect(blocs.length).toBeGreaterThan(0)
    for (const [, corps] of blocs) {
      const ombre = corps.match(/box-shadow:([^;]*);/)
      if (!ombre) continue
      // Un rayon de flou est le troisième nombre d'une ombre : il doit rester
      // à zéro — un anneau, pas une lueur.
      for (const couche of ombre[1].split(',')) {
        const nombres = couche.match(/-?\d+px/g) ?? []
        if (nombres.length >= 3) expect(nombres[2]).toBe('0px')
      }
    }
  })
})


/**
 * Relevé le 26 novembre 2026, sur la page qui tourne : « À QUAI » était
 * **coupé en travers**, le bas des lettres mangé, à toutes les largeurs.
 *
 * La frise est une bande de hauteur fixe — `--haut-voie` plus 52 px — en
 * `overflow: hidden`, et `HAUTEUR_FRISE` reprend cette somme ailleurs dans le
 * site : c'est le plafond du ciel des visiteurs, celui du rideau et celui de
 * l'infobulle d'étoile. On ne peut donc pas agrandir la bande sans déplacer
 * des étoiles déjà posées : **c'est la colonne d'une gare qui doit tenir
 * dedans**, pas la bande qui doit s'ouvrir.
 *
 * Or la colonne n'avait aucune hauteur de ligne à elle : elle dépendait des
 * métriques de la fonte. Le passage au tout-mono du 25 novembre (JetBrains
 * Mono rend à peu près 1,32 em de haut, l'Inter qu'il remplace 1,21) a fait
 * déborder l'état à quai, le seul dont le libellé monte à 16 px, et la bande
 * a coupé le reste. Pendant le `display=swap`, la fonte de secours changeait
 * cette hauteur une seconde fois.
 *
 * D'où la règle, et ce test : les deux lignes portent une hauteur explicite,
 * et la somme des morceaux reste sous la bande — pour les deux corps de
 * libellé de chaque largeur.
 */
describe('la colonne d’une gare tient dans la hauteur de la frise', () => {
  /** Le corps d'une règle, prise au ras de la marge — pas celles des médias. */
  function regle(css: string, selecteur: string): string {
    const trouve = new RegExp(
      `^${selecteur.replace(/[.[\]*+?^${}()|\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`,
      'm',
    ).exec(css)
    expect(trouve, selecteur).not.toBeNull()
    return trouve![1]
  }

  /** Une longueur en pixels, déclarée dans ce corps de règle. */
  function px(corps: string, propriete: string): number {
    const trouve = new RegExp(`${propriete}:\\s*(-?[\\d.]+)px`).exec(corps)
    expect(trouve, propriete).not.toBeNull()
    return Number(trouve![1])
  }

  /** Une hauteur de ligne **sans unité** : sans elle, la fonte décide. */
  function hauteurLigne(corps: string, quoi: string): number {
    const trouve = /line-height:\s*([\d.]+)\s*;/.exec(corps)
    expect(trouve, `hauteur de ligne explicite sur ${quoi}`).not.toBeNull()
    return Number(trouve![1])
  }

  /** Le bas de la mention, et le bas de la bande, pour un corps de libellé. */
  function mesurer(corpsLibelle: 'repos' | 'a-quai', mediaMobile: boolean) {
    const css = readFileSync('src/components/NavFrise.vue', 'utf8')
    const base = readFileSync('src/styles/base.css', 'utf8')

    const hautVoie = Number(/--haut-voie:\s*([\d.]+)px/.exec(base)?.[1])
    const bande =
      hautVoie + Number(/height:\s*calc\(var\(--haut-voie\)\s*\+\s*([\d.]+)px\)/.exec(css)?.[1])

    const libelle = regle(css, '.libelle')
    const mention = regle(css, '.mention')
    const aQuai = regle(css, ".gare[data-etat='a-quai'] .libelle")

    // Sous 360 px, le mono est plus large : les deux corps baissent d'un cran.
    const mobile = /@media \(max-width: 359px\)\s*\{([\s\S]*?\n\})\n/.exec(css)?.[1] ?? ''
    const corps = mediaMobile
      ? Number(
          (corpsLibelle === 'a-quai'
            ? /a-quai'\]\s*\.libelle\s*\{[^}]*font-size:\s*([\d.]+)px/
            : /^\s*\.libelle\s*\{[^}]*font-size:\s*([\d.]+)px/m
          ).exec(mobile)?.[1],
        )
      : px(corpsLibelle === 'a-quai' ? aQuai : libelle, 'font-size')

    // Le point est en `border-box` (base.css) : son bord d'1 px est dans les 9.
    const bas =
      hautVoie +
      px(regle(css, '.gare'), 'top') +
      px(regle(css, '.point'), 'height') +
      px(libelle, 'margin-top') +
      corps * hauteurLigne(libelle, '.libelle') +
      px(mention, 'margin-top') +
      px(mention, 'font-size') * hauteurLigne(mention, '.mention')

    expect(Number.isFinite(corps), 'corps du libellé').toBe(true)
    return { bas, bande }
  }

  const cas: Array<[string, 'repos' | 'a-quai', boolean]> = [
    ['au repos', 'repos', false],
    ['à quai', 'a-quai', false],
    ['au repos, sous 360 px', 'repos', true],
    ['à quai, sous 360 px', 'a-quai', true],
  ]

  for (const [etat, corps, mobile] of cas) {
    it(`${etat}, la mention ne touche pas le bas de la bande`, () => {
      const { bas, bande } = mesurer(corps, mobile)
      expect(bas).toBeLessThanOrEqual(bande)
    })
  }
})
