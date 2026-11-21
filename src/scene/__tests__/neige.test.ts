import { describe, expect, it } from 'vitest'

import {
  COUCHES_NEIGE,
  VITESSES,
  decalageCouche,
  floconsLibres,
} from '@/scene/neige'

describe('la chute des couches', () => {
  it('le décalage d’une couche reste dans la hauteur de tirage', () => {
    for (const t of [0, 0.5, 3, 97.3, 1e4]) {
      for (let i = 0; i < COUCHES_NEIGE; i += 1) {
        const d = decalageCouche(i, t, 400)
        expect(d).toBeGreaterThanOrEqual(0)
        expect(d).toBeLessThan(400)
      }
    }
  })

  it('le décalage croît avec le temps, à l’intérieur d’un tour', () => {
    expect(decalageCouche(0, 0, 400)).toBe(0)
    expect(decalageCouche(0, 0.1, 400)).toBeGreaterThan(0)
    expect(decalageCouche(0, 0.2, 400)).toBeGreaterThan(decalageCouche(0, 0.1, 400))
  })

  it('les couches tombent à des vitesses différentes', () => {
    expect(VITESSES.length).toBe(COUCHES_NEIGE)
    expect(new Set(VITESSES).size).toBe(VITESSES.length)
    for (const v of VITESSES) expect(v).toBeGreaterThan(0)
  })
})

describe('le tirage des flocons', () => {
  it('rend une population par couche', () => {
    const couches = floconsLibres(1200, 800, 7, false)
    expect(couches).toHaveLength(COUCHES_NEIGE)
    for (const couche of couches) expect(couche.length).toBeGreaterThan(0)
  })

  it('le tirage est stable : même graine, mêmes flocons', () => {
    const a = floconsLibres(1200, 800, 7, false)
    const b = floconsLibres(1200, 800, 7, false)
    expect(b).toEqual(a)
  })

  it('une autre graine donne une autre neige', () => {
    const a = floconsLibres(1200, 800, 7, false)
    const b = floconsLibres(1200, 800, 8, false)
    expect(b).not.toEqual(a)
  })

  it('les flocons tiennent dans la surface de tirage', () => {
    for (const couche of floconsLibres(1200, 800, 7, false)) {
      for (const f of couche) {
        expect(f.x).toBeGreaterThanOrEqual(0)
        expect(f.x).toBeLessThan(1200)
        expect(f.y).toBeGreaterThanOrEqual(0)
        expect(f.y).toBeLessThan(800)
        expect(f.r).toBeGreaterThan(0)
        expect(f.a).toBeGreaterThan(0)
        expect(f.a).toBeLessThanOrEqual(1)
      }
    }
  })

  it('il y a moins de flocons sur mobile', () => {
    const total = (couches: { length: number }[]) =>
      couches.reduce((n, c) => n + c.length, 0)
    const petit = total(floconsLibres(400, 700, 7, true))
    const grand = total(floconsLibres(400, 700, 7, false))
    expect(petit).toBeLessThan(grand)
  })
})
