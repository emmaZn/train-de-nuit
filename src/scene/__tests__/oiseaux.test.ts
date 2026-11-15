import { describe, expect, it } from 'vitest'

import {
  ECART_MINIMAL,
  MARGE_TRAVEE,
  PLACES_SIMULTANEES,
  champSurLesFils,
  placesTenables,
  choisirGeste,
  placeLibre,
  DUREE_PAS,
  avancementDuPas,
  dureeAuSol,
  poseDuGeste,
  prochainGeste,
} from '@/scene/oiseaux'

/** Un tirage déterministe, qui répète la suite donnée. */
function tirageDe(...valeurs: number[]): () => number {
  let i = 0
  return () => valeurs[i++ % valeurs.length]
}

const CHAMP = { uMin: MARGE_TRAVEE, uMax: 2 - MARGE_TRAVEE }

describe('placeLibre', () => {
  it('reste dans le champ qu’on lui donne, jamais contre un poteau', () => {
    for (let i = 0; i < 200; i += 1) {
      const r = tirageDe(i / 200, ((i * 7) % 200) / 200, ((i * 13) % 200) / 200)
      const place = placeLibre([], 2, CHAMP, r)
      expect(place).not.toBeNull()
      expect(place!.u).toBeGreaterThanOrEqual(CHAMP.uMin)
      expect(place!.u).toBeLessThanOrEqual(CHAMP.uMax)
    }
  })

  it('ne s’assied que là où on peut le voir, sur un écran étroit', () => {
    const etroit = { uMin: 0.73, uMax: 1.23 }
    for (let i = 0; i < 200; i += 1) {
      const r = tirageDe(i / 200, ((i * 7) % 200) / 200, ((i * 13) % 200) / 200)
      const place = placeLibre([], 2, etroit, r)
      expect(place!.u).toBeGreaterThanOrEqual(etroit.uMin)
      expect(place!.u).toBeLessThanOrEqual(etroit.uMax)
    }
  })

  it('ne pose jamais deux oiseaux à moins de l’écart minimal', () => {
    const occupees = [{ fil: 0, u: 0.5 }]
    for (let i = 0; i < 200; i += 1) {
      const r = tirageDe(0, i / 200, ((i * 11) % 200) / 200)
      const place = placeLibre(occupees, 2, CHAMP, r)
      if (place && place.fil === 0) {
        expect(Math.abs(place.u - 0.5)).toBeGreaterThanOrEqual(ECART_MINIMAL)
      }
    }
  })

  it('accepte deux oiseaux au même endroit sur deux fils différents', () => {
    const place = placeLibre([{ fil: 0, u: 1 }], 2, CHAMP, tirageDe(0.9, 0, 0.5))
    expect(place).not.toBeNull()
    expect(place!.fil).toBe(1)
    expect(Math.abs(place!.u - 1)).toBeLessThan(ECART_MINIMAL)
  })

  it('rend null quand tout est occupé', () => {
    const occupees = []
    for (let fil = 0; fil < 2; fil += 1) {
      for (let u = 0; u < 2; u += 0.05) occupees.push({ fil, u })
    }
    expect(placeLibre(occupees, 2, CHAMP, tirageDe(0.1, 0.3, 0.7))).toBeNull()
  })

  it('est déterministe à tirage donné', () => {
    const a = placeLibre([], 2, CHAMP, tirageDe(0.3, 0.6, 0.2))
    const b = placeLibre([], 2, CHAMP, tirageDe(0.3, 0.6, 0.2))
    expect(a).toEqual(b)
  })
})

describe('prochainGeste', () => {
  it('tombe entre 3 et 8 s après l’horloge donnée', () => {
    for (const v of [0, 0.5, 0.999]) {
      const t = prochainGeste(10, () => v)
      expect(t).toBeGreaterThanOrEqual(13)
      expect(t).toBeLessThanOrEqual(18)
    }
  })
})

describe('choisirGeste', () => {
  it('répartit les trois gestes, et n’en invente pas un quatrième', () => {
    expect(choisirGeste(() => 0)).toBe('demi-tour')
    expect(choisirGeste(() => 0.5)).toBe('pas')
    expect(choisirGeste(() => 0.9)).toBe('ebouriffe')
  })
})

describe('poseDuGeste', () => {
  it('rend la pose perchée retournée quand l’oiseau regarde à gauche', () => {
    expect(poseDuGeste(-1, false)).toEqual({ pose: 'perche', miroir: true })
    expect(poseDuGeste(1, false)).toEqual({ pose: 'perche', miroir: false })
  })

  it('n’a pas de dessin propre pour l’ébouriffé qui regarde à gauche', () => {
    expect(poseDuGeste(-1, true)).toEqual({ pose: 'perche-ebouriffe', miroir: true })
  })
})

describe('PLACES_SIMULTANEES', () => {
  it('tient neuf oiseaux à la fois, pas le total de la visite', () => {
    expect(PLACES_SIMULTANEES).toBe(9)
  })
})

describe('dureeAuSol', () => {
  it('laisse le « … » plus longtemps que les autres', () => {
    expect(dureeAuSol(true)).toBeGreaterThan(dureeAuSol(false))
  })

  it('ne fait jamais repartir personne : c’est une durée, pas un retour', () => {
    expect(dureeAuSol(true)).toBeGreaterThan(0)
    expect(Number.isFinite(dureeAuSol(true))).toBe(true)
  })
})

describe('avancementDuPas', () => {
  it('part de zéro et arrive à un', () => {
    expect(avancementDuPas(DUREE_PAS)).toBeCloseTo(0)
    expect(avancementDuPas(0)).toBeCloseTo(1)
  })

  it('ne dépasse jamais, dans un sens ni dans l’autre', () => {
    expect(avancementDuPas(DUREE_PAS * 2)).toBe(0)
    expect(avancementDuPas(-1)).toBe(1)
  })

  it('passe par le milieu à mi-chemin : un pas, pas un bond', () => {
    expect(avancementDuPas(DUREE_PAS / 2)).toBeCloseTo(0.5)
  })
})

describe('champSurLesFils', () => {
  it('rend la part des fils qu’on voit vraiment', () => {
    // Un écran large voit toute l'île : on peut s'asseoir partout.
    expect(champSurLesFils(-100, 2500, 60, 1124, 2)).toEqual({ uMin: MARGE_TRAVEE, uMax: 2 - MARGE_TRAVEE })
  })

  it('se resserre sur ce que montre un écran étroit', () => {
    // Un téléphone ne voit qu'un quart de la largeur du cadre : s'asseoir
    // ailleurs, c'est s'asseoir hors de l'écran.
    const champ = champSurLesFils(879, 1441, 60, 1124, 2)
    expect(champ.uMin).toBeGreaterThan(0.5)
    expect(champ.uMax).toBeLessThan(1.5)
    expect(champ.uMax).toBeGreaterThan(champ.uMin)
  })

  it('ne sort jamais des travées, même si l’écran déborde', () => {
    const champ = champSurLesFils(-9000, 9000, 60, 1124, 2)
    expect(champ.uMin).toBeGreaterThanOrEqual(MARGE_TRAVEE)
    expect(champ.uMax).toBeLessThanOrEqual(2 - MARGE_TRAVEE)
  })
})

describe('placesTenables', () => {
  it('garde les neuf places quand on voit toute l’île', () => {
    expect(placesTenables(2 - 2 * MARGE_TRAVEE)).toBe(PLACES_SIMULTANEES)
  })

  it('en met moins quand il y a moins de fil à voir', () => {
    expect(placesTenables(0.5)).toBeLessThan(PLACES_SIMULTANEES)
  })

  it('en garde toujours assez pour que la gare soit vivante', () => {
    expect(placesTenables(0.05)).toBeGreaterThanOrEqual(3)
  })
})
