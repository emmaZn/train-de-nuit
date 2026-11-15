import { describe, expect, it } from 'vitest'

import {
  ECART_MINIMAL,
  MARGE_TRAVEE,
  PLACES_SIMULTANEES,
  choisirGeste,
  placeLibre,
  poseDuGeste,
  prochainGeste,
} from '@/scene/oiseaux'

/** Un tirage déterministe, qui répète la suite donnée. */
function tirageDe(...valeurs: number[]): () => number {
  let i = 0
  return () => valeurs[i++ % valeurs.length]
}

describe('placeLibre', () => {
  it('reste dans la marge de sa travée, jamais contre un poteau', () => {
    for (let i = 0; i < 200; i += 1) {
      const r = tirageDe(i / 200, ((i * 7) % 200) / 200, ((i * 13) % 200) / 200)
      const place = placeLibre([], 2, 2, r)
      expect(place).not.toBeNull()
      const t = place!.u - Math.floor(place!.u)
      expect(t).toBeGreaterThanOrEqual(MARGE_TRAVEE)
      expect(t).toBeLessThanOrEqual(1 - MARGE_TRAVEE)
      expect(place!.u).toBeLessThan(2)
    }
  })

  it('ne pose jamais deux oiseaux à moins de l’écart minimal', () => {
    const occupees = [{ fil: 0, u: 0.5 }]
    for (let i = 0; i < 200; i += 1) {
      const r = tirageDe(0, i / 200, ((i * 11) % 200) / 200)
      const place = placeLibre(occupees, 2, 2, r)
      if (place && place.fil === 0) {
        expect(Math.abs(place.u - 0.5)).toBeGreaterThanOrEqual(ECART_MINIMAL)
      }
    }
  })

  it('accepte deux oiseaux au même endroit sur deux fils différents', () => {
    const place = placeLibre([{ fil: 0, u: 0.5 }], 2, 2, tirageDe(0.9, 0, 0.42))
    expect(place).not.toBeNull()
    expect(place!.fil).toBe(1)
    // Assez près du voisin pour être refusée sur le même fil : c'est le point.
    expect(Math.abs(place!.u - 0.5)).toBeLessThan(ECART_MINIMAL)
  })

  it('rend null quand tout est occupé', () => {
    const occupees = []
    for (let fil = 0; fil < 2; fil += 1) {
      for (let u = 0; u < 2; u += 0.05) occupees.push({ fil, u })
    }
    expect(placeLibre(occupees, 2, 2, tirageDe(0.1, 0.3, 0.7))).toBeNull()
  })

  it('est déterministe à tirage donné', () => {
    const a = placeLibre([], 2, 2, tirageDe(0.3, 0.6, 0.2))
    const b = placeLibre([], 2, 2, tirageDe(0.3, 0.6, 0.2))
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
