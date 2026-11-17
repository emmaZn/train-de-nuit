import { describe, expect, it } from 'vitest'

import { ColorMatrixFilter, Container } from 'pixi.js'

import { nuitDeLaGare } from '@/scene/nuit'
import { appliquerNuit, plansDuDecor } from '@/scene/Scene'
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

/** Le premier coefficient de la matrice : la luminance que le filtre laisse passer. */
function luminance(f: ColorMatrixFilter): number {
  return f.enabled ? f.matrix[0] : 1
}

describe('l’assombrissement par groupe', () => {
  function decorMonte() {
    const decor = new Container()
    return { decor, plans: plansDuDecor(decor) }
  }

  /**
   * Le plateau est coupé en deux depuis que le quai d'« ailleurs » y pose ses
   * lumières : `lumieres` doit tomber **devant** le voile du pied et
   * **derrière** la rame, et la rame vit dans `plateau`.
   */
  it('range les groupes du fond vers l’avant, les non-filtrés hors de tout filtre', () => {
    const { decor, plans } = decorMonte()
    expect(decor.children.map((c) => c.label)).toEqual([
      'massif',
      'ciel',
      'plateau-fond',
      'lumieres',
      'plateau',
      'vitres',
    ])
    expect(plans.vitres.filters ?? []).toHaveLength(0)
    expect(plans.lumieres.filters ?? []).toHaveLength(0)
  })

  it('les mêmes groupes que ceux où peupler monte ses objets', () => {
    const { decor, plans } = decorMonte()
    for (const g of [plans.massif, plans.ciel, plans.plateauFond, plans.plateau]) {
      expect(decor.children).toContain(g)
      expect(g.filters).toHaveLength(1)
    }
  })

  it('à nuit nulle, aucun filtre ne travaille et rien ne s’assombrit', () => {
    const { plans } = decorMonte()
    appliquerNuit(plans, 0)
    for (const f of Object.values(plans.nuit)) expect(luminance(f)).toBe(1)
  })

  it('à pleine nuit, le ciel reste plus clair que le massif et le plateau', () => {
    const { plans } = decorMonte()
    appliquerNuit(plans, 1)
    expect(luminance(plans.nuit.massif)).toBeCloseTo(1 - NUIT_PROFONDEUR)
    expect(luminance(plans.nuit.plateau)).toBeCloseTo(1 - NUIT_PROFONDEUR)
    // Les deux moitiés du plateau descendent ensemble : la coupure est un
    // ordre de plans, pas une seconde profondeur.
    expect(luminance(plans.nuit.plateauFond)).toBeCloseTo(1 - NUIT_PROFONDEUR)
    expect(luminance(plans.nuit.ciel)).toBeCloseTo(1 - NUIT_CIEL)
    expect(luminance(plans.nuit.ciel)).toBeGreaterThan(luminance(plans.nuit.massif))
    expect(luminance(plans.nuit.ciel)).toBeGreaterThan(luminance(plans.nuit.plateau))
  })

  it('à mi-nuit, le ciel est encore plus clair', () => {
    const { plans } = decorMonte()
    appliquerNuit(plans, 0.5)
    expect(luminance(plans.nuit.ciel)).toBeGreaterThan(luminance(plans.nuit.massif))
    expect(luminance(plans.nuit.massif)).toBeLessThan(1)
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
