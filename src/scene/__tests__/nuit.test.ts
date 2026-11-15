import { describe, expect, it } from 'vitest'

import { Container } from 'pixi.js'

import { nuitDeLaGare } from '@/scene/nuit'
import { plansDuDecor, poserLumieres } from '@/scene/Scene'
import { NUIT_CIEL, NUIT_PROFONDEUR, opaciteVoile } from '@/scene/layout'
import { PHASE_FREINAGE, PHASE_ROULE } from '@/scene/Train'

const base = {
  gare: 'ici',
  cible: null,
  enRoute: false,
  phase: 0,
  derniereEtape: false,
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
    const part = { ...base, gare: 'ailleurs', cible: 'ici', enRoute: true, phase: 0 } as const
    expect(nuitDeLaGare(part)).toBe(1)
    expect(nuitDeLaGare({ ...part, phase: PHASE_ROULE })).toBe(0)
  })

  it('ne s’assombrit pas quand le train traverse « ailleurs » sans s’arrêter', () => {
    // de « là-haut » vers « ici » : « ailleurs » est sur la route, pas la cible
    expect(
      nuitDeLaGare({
        ...base,
        gare: 'ailleurs',
        cible: 'ici',
        enRoute: true,
        derniereEtape: false,
        phase: 0.5,
      }),
    ).toBe(0)
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

/** Les enfants du décor, par nom, dans l'ordre où on les dessine. */
function ordreDuDecor(decor: Container): string[] {
  return decor.children.map((c) => c.label)
}

describe('les voiles de la nuit', () => {
  // Ce que `peupler` monte, dans l'ordre : le train et ses compagnons d'abord,
  // les lumières en dernier.
  function decorMonte() {
    const decor = new Container()
    plansDuDecor(decor)
    for (const nom of ['voile-pied', 'cables', 'train', 'terre', 'oiseaux']) {
      const c = new Container()
      c.label = nom
      decor.addChild(c)
    }
    poserLumieres(decor)
    return decor
  }

  it('le voile du décor couvre le massif mais pas les vitres du train', () => {
    const ordre = ordreDuDecor(decorMonte())
    expect(ordre.indexOf('massif')).toBeLessThan(ordre.indexOf('voile-nuit'))
    expect(ordre.indexOf('voile-nuit')).toBeLessThan(ordre.indexOf('vitres'))
  })

  it('le voile du décor couvre aussi le corps du train, la terre et les oiseaux', () => {
    const ordre = ordreDuDecor(decorMonte())
    for (const nom of ['train', 'terre', 'oiseaux']) {
      expect(ordre.indexOf(nom)).toBeLessThan(ordre.indexOf('voile-nuit'))
    }
  })

  it('le voile du ciel est juste au-dessus du ciel, sous tout le reste', () => {
    const ordre = ordreDuDecor(decorMonte())
    expect(ordre.indexOf('voile-nuit-ciel')).toBe(ordre.indexOf('ciel') + 1)
  })

  it('le voile du ciel est moins opaque que celui du décor à nuit égale', () => {
    expect(opaciteVoile(1, NUIT_CIEL)).toBeLessThan(opaciteVoile(1, NUIT_PROFONDEUR))
  })

  it('les deux voiles sont transparents à nuit nulle', () => {
    expect(opaciteVoile(0, NUIT_PROFONDEUR)).toBe(0)
    expect(opaciteVoile(0, NUIT_CIEL)).toBe(0)
  })

  it('l’opacité suit la nuit et ne dépasse jamais le maximum', () => {
    expect(opaciteVoile(1, NUIT_PROFONDEUR)).toBeCloseTo(NUIT_PROFONDEUR)
    expect(opaciteVoile(0.5, NUIT_PROFONDEUR)).toBeCloseTo(NUIT_PROFONDEUR / 2)
    expect(opaciteVoile(2, NUIT_PROFONDEUR)).toBeCloseTo(NUIT_PROFONDEUR)
    expect(opaciteVoile(-1, NUIT_PROFONDEUR)).toBe(0)
  })
})
