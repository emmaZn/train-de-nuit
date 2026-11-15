import { describe, expect, it } from 'vitest'

import { nuitDeLaGare } from '@/scene/nuit'
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
