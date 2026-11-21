import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  COUCHES_NEIGE,
  VITESSES,
  decalageCouche,
  floconsDuCone,
  floconsLibres,
} from '@/scene/neige'
import type { Cone } from '@/scene/Faisceau'
import { coneDuFaisceau } from '@/scene/Faisceau'
import { PIECES } from '@/scene/quai'

/**
 * La coupe nombres/dessin du dépôt : `neige.ts` est à `NeigeLayer.ts` ce que
 * `quai.ts` est à `QuaiLayer.ts`. Elle ne tient que si personne ne ramène Pixi
 * par la bande — c'est pour ça qu'`alea` et `Grain` ont quitté `Sky.ts`, qui
 * dessine, pour `alea.ts`, qui ne dessine pas.
 */
describe('la coupe nombres / dessin', () => {
  it('ni `neige.ts` ni `alea.ts` ne chargent Pixi, même en transitif', () => {
    for (const module of ['neige', 'alea']) {
      const source = readFileSync(`src/scene/${module}.ts`, 'utf8')
      const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1])
      expect(imports, module).not.toContain('pixi.js')
      // Et rien qui en charge : `Sky.ts` et `Train.ts` dessinent.
      expect(imports, module).not.toContain('./Sky')
      expect(imports, module).not.toContain('./Train')
    }
  })

  it('`neige.ts` ne touche `Faisceau.ts` (qui charge Pixi) que par un import de type, effacé à la compilation', () => {
    const source = readFileSync('src/scene/neige.ts', 'utf8')
    const lignes = source.split('\n').filter((l) => /from '\.\/Faisceau'/.test(l))
    for (const l of lignes) expect(l).toMatch(/^import type /)
  })
})

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

function dansLeCone(c: Cone, g: { x: number; y: number }): boolean {
  const t = (g.y - c.sommet.y) / c.hauteur
  if (t < -1e-9 || t > 1 + 1e-9) return false
  const gauche = c.sommet.x + (c.base[0] - c.sommet.x) * t
  const droite = c.sommet.x + (c.base[1] - c.sommet.x) * t
  return g.x >= gauche - 1e-9 && g.x <= droite + 1e-9
}

const mediane = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const total = (couches: { length: number }[]) => couches.reduce((n, c) => n + c.length, 0)

describe('la neige du cône', () => {
  const cone = coneDuFaisceau(PIECES.reverbere)
  const aire = ((cone.base[1] - cone.base[0]) * cone.hauteur) / 2

  it('rend exactement COUCHES_NEIGE populations : decalageCouche lit VITESSES par couche', () => {
    expect(floconsDuCone(cone, 11, false)).toHaveLength(COUCHES_NEIGE)
    expect(floconsDuCone(cone, 11, true)).toHaveLength(COUCHES_NEIGE)
  })

  it('les flocons du cône sont tous dans le cône', () => {
    for (const mobile of [false, true])
      for (const couche of floconsDuCone(cone, 11, mobile))
        for (const f of couche) expect(dansLeCone(cone, f)).toBe(true)
  })

  it('le tirage est stable : même graine, mêmes flocons', () => {
    expect(floconsDuCone(cone, 11, false)).toEqual(floconsDuCone(cone, 11, false))
    expect(floconsDuCone(cone, 12, false)).not.toEqual(floconsDuCone(cone, 11, false))
  })

  it('les flocons du cône sont plus vifs que ceux du fond', () => {
    const cone_ = floconsDuCone(cone, 11, false).flat().map((f) => f.a)
    const libres = floconsLibres(1440, 900, 23, false).flat().map((f) => f.a)
    expect(mediane(cone_)).toBeGreaterThan(mediane(libres))
  })

  it('ils sont plus denses que la neige libre', () => {
    const duCone = total(floconsDuCone(cone, 11, false)) / aire
    const libre = total(floconsLibres(1440, 900, 23, false)) / (1440 * 900)
    expect(duCone).toBeGreaterThan(libre)
    // Et sur mobile aussi : on en retire, on ne repasse pas sous le fond.
    const duConeMobile = total(floconsDuCone(cone, 11, true)) / aire
    const libreMobile = total(floconsLibres(400, 700, 23, true)) / (400 * 700)
    expect(duConeMobile).toBeGreaterThan(libreMobile)
  })

  it('il y a moins de flocons dans le cône sur mobile', () => {
    expect(total(floconsDuCone(cone, 11, true))).toBeLessThan(total(floconsDuCone(cone, 11, false)))
  })

  it('le sommet n’est pas plus dense que la base : la profondeur se tire en racine carrée', () => {
    const tous = floconsDuCone(cone, 11, false).flat()
    const haut = tous.filter((f) => f.y < cone.sommet.y + cone.hauteur / 2)
    // Le tiers haut du cône ne porte qu'un quart de son aire : bien moins de la moitié des flocons.
    expect(haut.length / tous.length).toBeLessThan(0.35)
    expect(haut.length / tous.length).toBeGreaterThan(0.15)
  })
})
