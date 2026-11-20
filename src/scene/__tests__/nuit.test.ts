import { describe, expect, it } from 'vitest'

import { readFileSync } from 'node:fs'

import { Container } from 'pixi.js'

import { nuitDeLaGare } from '@/scene/nuit'
import {
  appliquerNuit,
  grisDeNuit,
  monterLaRame,
  monterLeTrain,
  plansDuDecor,
} from '@/scene/Scene'
import type { Manifest } from '@/scene/types'
import { NUIT_CIEL, NUIT_PROFONDEUR, opaciteVoile } from '@/scene/layout'
import { PHASE_FREINAGE, PHASE_ROULE } from '@/scene/Train'

const base = {
  gare: 'ici',
  cible: null,
  enRoute: false,
  phase: 0,
  derniereEtape: false,
  demarrage: false,
  reducedMotion: false,
} as const

describe('nuitDeLaGare', () => {
  it('vaut 0 partout ailleurs qu’à « ailleurs »', () => {
    expect(nuitDeLaGare({ ...base, gare: 'la-haut' })).toBe(0)
  })

  it('vaut 1 à l’arrêt à « ailleurs »', () => {
    expect(nuitDeLaGare({ ...base, gare: 'ailleurs' })).toBe(1)
  })

  it('vaut 1 dès la première image sur un lien partagé', () => {
    // `poserGare('ailleurs')` : enRoute faux, phase 0, aucun freinage joué
    expect(nuitDeLaGare({ ...base, gare: 'ailleurs', phase: 0 })).toBe(1)
  })

  it('monte pendant le freinage de la dernière étape vers « ailleurs »', () => {
    const avant = {
      ...base,
      gare: 'la-haut',
      cible: 'ailleurs',
      enRoute: true,
      derniereEtape: true,
      phase: PHASE_FREINAGE,
    } as const
    expect(nuitDeLaGare(avant)).toBe(0)
    expect(nuitDeLaGare({ ...avant, phase: (PHASE_FREINAGE + 1) / 2 })).toBeCloseTo(0.5, 2)
    expect(nuitDeLaGare({ ...avant, phase: 1 })).toBe(1)
  })

  it('redescend pendant le démarrage depuis « ailleurs »', () => {
    const part = {
      ...base,
      gare: 'ailleurs',
      cible: 'ici',
      enRoute: true,
      derniereEtape: true,
      demarrage: true,
      phase: 0,
    } as const
    expect(nuitDeLaGare(part)).toBe(1)
    expect(nuitDeLaGare({ ...part, phase: 0.05 })).toBeLessThan(1)
    expect(nuitDeLaGare({ ...part, phase: PHASE_ROULE })).toBe(0)
  })

  /**
   * Le piège de l'étape 4. `finirEtape` avance `gare` à **chaque** frontière,
   * traversées comprises, et `Scene.tick` remet la phase à 0 à la même image :
   * une traversée a donc exactement l'état d'un départ, à `demarrage` près.
   * Sans lui, la scène basculait au noir complet à l'instant où le train
   * dépassait le quai, puis remontait sur ~1,8 s — un flash plein écran sur
   * un clic ordinaire, que la spec §6.3 interdit nommément.
   *
   * On sonde **au départ de la traversée**, pas au milieu : l'ancien garde ne
   * regardait que `phase: 0.5`, au-delà de la fin de la rampe, là où la
   * fonction rendait 0 pour la mauvaise raison.
   */
  it('ne s’assombrit pas quand le train traverse « ailleurs » sans s’arrêter', () => {
    // « là-haut » → « ici » : une seule étape reste, et « ailleurs » est
    // derrière le train sans avoir été un arrêt.
    const traverse = {
      ...base,
      gare: 'ailleurs',
      cible: 'ici',
      enRoute: true,
      derniereEtape: true,
      demarrage: false,
    } as const
    expect(nuitDeLaGare({ ...traverse, phase: 0 })).toBe(0)
    expect(nuitDeLaGare({ ...traverse, phase: 0.05 })).toBe(0)
    expect(nuitDeLaGare({ ...traverse, phase: 0.5 })).toBe(0)
  })

  it('ne s’assombrit pas non plus sur une traversée à deux étapes du terme', () => {
    // « plus loin » → « là-haut » : deux étapes, donc `derniereEtape` faux.
    const traverse = {
      ...base,
      gare: 'ailleurs',
      cible: 'la-haut',
      enRoute: true,
      derniereEtape: false,
      demarrage: false,
    } as const
    expect(nuitDeLaGare({ ...traverse, phase: 0 })).toBe(0)
    expect(nuitDeLaGare({ ...traverse, phase: 0.05 })).toBe(0)
  })

  it('s’inverse sans sortir de [0, 1] si le voyage se redirige pendant le freinage', () => {
    const freine = {
      ...base,
      gare: 'la-haut',
      cible: 'ailleurs',
      enRoute: true,
      derniereEtape: true,
      phase: 0.95,
    } as const
    const redirige = { ...freine, cible: 'ici', derniereEtape: false } as const
    // la valeur tombe à 0, mais sans passer par une valeur plus grande que 1
    expect(nuitDeLaGare(freine)).toBeGreaterThan(0)
    expect(nuitDeLaGare(freine)).toBeLessThanOrEqual(1)
    expect(nuitDeLaGare(redirige)).toBe(0)
  })

  it('vaut 1 à l’arrêt en mouvement réduit, sans phase de freinage', () => {
    expect(nuitDeLaGare({ ...base, gare: 'ailleurs', reducedMotion: true })).toBe(1)
  })
})

/** La clarté que la teinte laisse passer, de 0 (noir) à 1 (blanc). */
function clarte(n: Container): number {
  return (n.getGlobalTint() & 0xff) / 255
}

/** Le train monté comme `peupler` le monte, avec le manifeste réel. */
function rameMontee(reducedMotion = false) {
  const decor = new Container()
  const plans = plansDuDecor(decor)
  const manifeste = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as Manifest
  const train = monterLeTrain(plans, manifeste)
  monterLaRame(plans, train, manifeste, reducedMotion)
  const rame = train.rameContainer
  const nomme = (label: string) => {
    const n = rame.children.find((c) => c.label === label)
    if (!n) throw new Error(`pas de ${label} dans la rame : ${rame.children.map((c) => c.label)}`)
    return n as Container
  }
  return { decor, plans, train, rame, nomme }
}

describe('l’assombrissement par teinte', () => {
  function decorMonte() {
    const decor = new Container()
    return { decor, plans: plansDuDecor(decor) }
  }

  /**
   * Le plateau est coupé en deux depuis que le quai d'« ailleurs » y pose ses
   * lumières : `lumieres` doit tomber **devant** le voile du pied et
   * **derrière** la rame, et la rame vit dans `plateau`. Il n'y a plus de plan
   * `vitres` au-dessus de tout : elles sont retournées dans la rame.
   */
  it('range les plans du fond vers l’avant, sans plan « vitres » au sommet', () => {
    const { decor } = decorMonte()
    expect(decor.children.map((c) => c.label)).toEqual([
      'massif',
      'ciel',
      'plateau-fond',
      'lumieres',
      'rideau',
      'plateau',
    ])
  })

  /**
   * Zéro passe plein écran : plus un seul filtre sur les groupes. Le shader de
   * recoloration reste sur `decor`, et c'est le seul.
   */
  it('n’accroche aucun filtre aux plans', () => {
    const { decor, plans } = decorMonte()
    for (const g of decor.children) expect(g.filters ?? []).toHaveLength(0)
    expect(plans.lumieres.filters ?? []).toHaveLength(0)
  })

  it('teinte le massif et le fond du plateau, jamais les lumières ni le plateau', () => {
    const { plans } = decorMonte()
    expect(plans.nuit.profond).toEqual([plans.massif, plans.plateauFond])
    expect(plans.nuit.ciel).toEqual([plans.ciel])
    expect(plans.nuit.profond).not.toContain(plans.lumieres)
    // Le plateau porte la rame, donc les vitres : il ne peut pas être teinté.
    expect(plans.nuit.profond).not.toContain(plans.plateau)
  })

  it('à nuit nulle, rien n’est teinté', () => {
    const { plans } = decorMonte()
    appliquerNuit(plans, 0)
    for (const n of [...plans.nuit.profond, ...plans.nuit.ciel]) expect(clarte(n)).toBe(1)
  })

  it('à pleine nuit, le ciel reste plus clair que le massif et le plateau', () => {
    const { plans } = decorMonte()
    appliquerNuit(plans, 1)
    expect(clarte(plans.massif)).toBeCloseTo(1 - NUIT_PROFONDEUR, 2)
    // Les deux moitiés du plateau descendent ensemble : la coupure est un
    // ordre de plans, pas une seconde profondeur.
    expect(clarte(plans.plateauFond)).toBeCloseTo(1 - NUIT_PROFONDEUR, 2)
    expect(clarte(plans.ciel)).toBeCloseTo(1 - NUIT_CIEL, 2)
    expect(clarte(plans.ciel)).toBeGreaterThan(clarte(plans.massif))
  })

  it('à mi-nuit, le ciel est encore plus clair', () => {
    const { plans } = decorMonte()
    appliquerNuit(plans, 0.5)
    expect(clarte(plans.ciel)).toBeGreaterThan(clarte(plans.massif))
    expect(clarte(plans.massif)).toBeLessThan(1)
  })

  it('grisDeNuit rend un gris, borné, qui suit la nuit', () => {
    expect(grisDeNuit(0, NUIT_PROFONDEUR)).toBe(0xffffff)
    expect(grisDeNuit(2, NUIT_PROFONDEUR)).toBe(grisDeNuit(1, NUIT_PROFONDEUR))
    expect(grisDeNuit(-1, NUIT_PROFONDEUR)).toBe(0xffffff)
    const g = grisDeNuit(1, NUIT_PROFONDEUR)
    expect((g >> 16) & 0xff).toBe(g & 0xff)
    expect((g >> 8) & 0xff).toBe(g & 0xff)
  })
})

/**
 * L'ordre des trois bandes de la rame, et l'exemption des vitres.
 *
 * Ces deux-là tombent ensemble : les vitres sont exemptées parce qu'aucun de
 * leurs ancêtres n'est teinté, et c'est exactement ce qui leur permet de rester
 * **dans** la rame, entre le corps des wagons et la fumée. Une teinte posée sur
 * le plateau, sur `train.racine` ou sur la rame les rattraperait sans qu'elles
 * puissent s'en défaire : sous Pixi v8 la teinte se multiplie en descendant.
 */
/** La voie : inscrite par `monterLeTrain`, elle vit dans la racine du train. */
function voieDuTrain(plans: { nuit: { profond: Container[] } }): Container {
  const voie = plans.nuit.profond.find((n) => n.label === 'voie')
  if (!voie) throw new Error('la voie n’est pas inscrite dans la nuit')
  return voie
}

describe('les trois bandes de la rame', () => {
  it('range le corps, puis les vitres, puis la fumée', () => {
    const { rame } = rameMontee()
    expect(rame.children.map((c) => c.label)).toEqual(['corps', 'vitres', 'fumee'])
  })

  it('ne teinte aucun ancêtre des vitres', () => {
    const { plans, train, nomme } = rameMontee()
    appliquerNuit(plans, 1)
    const vitres = nomme('vitres')
    for (const n of [plans.plateau, train.container, train.rameContainer, vitres]) {
      expect(plans.nuit.profond).not.toContain(n)
    }
    expect(vitres.getGlobalTint()).toBe(0xffffff)
  })

  it('éteint le corps, la voie et la fumée à la même profondeur', () => {
    const { plans, nomme } = rameMontee()
    appliquerNuit(plans, 1)
    for (const label of ['corps', 'fumee']) {
      expect(clarte(nomme(label)), label).toBeCloseTo(1 - NUIT_PROFONDEUR, 2)
    }
    const voie = voieDuTrain(plans)
    expect(clarte(voie)).toBeCloseTo(1 - NUIT_PROFONDEUR, 2)
  })

  it('rallume tout quand la nuit retombe, vitres comprises', () => {
    const { plans, nomme } = rameMontee()
    appliquerNuit(plans, 1)
    appliquerNuit(plans, 0)
    expect(nomme('vitres').getGlobalTint()).toBe(0xffffff)
    expect(nomme('corps').getGlobalTint()).toBe(0xffffff)
  })
})

describe('opaciteVoile', () => {
  it('est nulle à nuit nulle', () => {
    expect(opaciteVoile(0, NUIT_PROFONDEUR)).toBe(0)
    expect(opaciteVoile(0, NUIT_CIEL)).toBe(0)
  })

  it('suit la nuit et ne dépasse jamais le maximum', () => {
    expect(opaciteVoile(1, NUIT_PROFONDEUR)).toBeCloseTo(NUIT_PROFONDEUR)
    expect(opaciteVoile(0.5, NUIT_PROFONDEUR)).toBeCloseTo(NUIT_PROFONDEUR / 2)
    expect(opaciteVoile(2, NUIT_PROFONDEUR)).toBeCloseTo(NUIT_PROFONDEUR)
    expect(opaciteVoile(-1, NUIT_PROFONDEUR)).toBe(0)
  })
})
