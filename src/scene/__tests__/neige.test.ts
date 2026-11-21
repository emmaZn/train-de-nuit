import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  COUCHES_NEIGE,
  VITESSES,
  decalageCouche,
  floconsDuCone,
  floconsLibres,
} from '@/scene/neige'
import { coneDuFaisceau, dansLeCone } from '@/scene/cone'
import { grainsDuFaisceau } from '@/scene/Faisceau'
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

  it('`neige.ts` n’importe que des modules purs : liste blanche, guillemets et alias compris', () => {
    const source = readFileSync('src/scene/neige.ts', 'utf8')
    const imports = [...source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
    expect(imports.length).toBeGreaterThan(0)
    for (const i of imports) expect(['./alea', './cone'], i).toContain(i)
  })

  it('`cone.ts` ne charge pas Pixi', () => {
    const source = readFileSync('src/scene/cone.ts', 'utf8')
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
    for (const i of imports) expect(['./quai'], i).toContain(i)
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

const mediane = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const total = (couches: { length: number }[]) => couches.reduce((n, c) => n + c.length, 0)

describe('la neige du cône', () => {
  const cone = coneDuFaisceau(PIECES.reverbere)
  // L'aire que l'œil voit : le triangle. Le tirage couvre le rectangle, le masque en cache la moitié.
  // (le tirage en porte donc le double : `/ (2 * aire)` est la densité visible)
  const aire = ((cone.base[1] - cone.base[0]) * cone.hauteur) / 2

  it('rend exactement COUCHES_NEIGE populations : decalageCouche lit VITESSES par couche', () => {
    expect(floconsDuCone(cone, 29, false)).toHaveLength(COUCHES_NEIGE)
    expect(floconsDuCone(cone, 29, true)).toHaveLength(COUCHES_NEIGE)
  })

  it('une fois découpés au cône, la densité visible est uniforme à chaque phase de la chute', () => {
    const tous = floconsDuCone(cone, 29, false).flat()
    const h = cone.hauteur
    const demi = (cone.base[1] - cone.base[0]) / 2
    const part: number[] = []
    const nombre: number[] = []
    for (const d of [0, 0.1, 0.25, 0.5, 0.75, 0.9]) {
      const vus = tous
        .map((f) => ({ x: f.x, y: cone.sommet.y + ((f.y - cone.sommet.y + d * h) % h) }))
        .filter((p) => dansLeCone(cone, p))
      nombre.push(vus.length)
      part.push(vus.filter((p) => Math.abs(p.x - cone.sommet.x) / demi > 0.75 * ((p.y - cone.sommet.y) / h)).length / vus.length)
    }
    // Le quart extérieur de la demi-largeur, à chaque profondeur : 0,25 si c'est uniforme.
    for (const p of part) expect(p).toBeGreaterThan(0.17)
    for (const p of part) expect(p).toBeLessThan(0.33)
    // Et la quantité visible ne pulse pas.
    expect(Math.max(...nombre) / Math.min(...nombre)).toBeLessThan(1.12)
  })

  it('aucun flocon ne partage sa position avec un grain de poussière du faisceau', () => {
    const poussiere = grainsDuFaisceau(cone, 11, false)
    const prises = new Set(poussiere.map((g) => `${g.x.toFixed(6)}|${g.y.toFixed(6)}`))
    for (const f of floconsDuCone(cone, 29, false).flat())
      expect(prises.has(`${f.x.toFixed(6)}|${f.y.toFixed(6)}`)).toBe(false)
    // ni même colonne : x ne change jamais, et une colonne partagée le resterait.
    const colonnes = new Set(poussiere.map((g) => g.x.toFixed(4)))
    for (const f of floconsDuCone(cone, 29, false).flat()) expect(colonnes.has(f.x.toFixed(4))).toBe(false)
  })

  it('le tirage est stable : même graine, mêmes flocons', () => {
    expect(floconsDuCone(cone, 29, false)).toEqual(floconsDuCone(cone, 29, false))
    expect(floconsDuCone(cone, 12, false)).not.toEqual(floconsDuCone(cone, 29, false))
  })

  it('les flocons du cône sont plus vifs que ceux du fond', () => {
    const cone_ = floconsDuCone(cone, 29, false).flat().map((f) => f.a)
    const libres = floconsLibres(1440, 900, 23, false).flat().map((f) => f.a)
    expect(mediane(cone_)).toBeGreaterThan(mediane(libres))
  })

  it('ils sont plus denses que la neige libre', () => {
    const duCone = total(floconsDuCone(cone, 29, false)) / (2 * aire)
    const libre = total(floconsLibres(1440, 900, 23, false)) / (1440 * 900)
    expect(duCone).toBeGreaterThan(libre)
    // Et sur mobile aussi : on en retire, on ne repasse pas sous le fond.
    const duConeMobile = total(floconsDuCone(cone, 29, true)) / (2 * aire)
    const libreMobile = total(floconsLibres(400, 700, 23, true)) / (400 * 700)
    expect(duConeMobile).toBeGreaterThan(libreMobile)
  })

  it('il y a moins de flocons dans le cône sur mobile', () => {
    expect(total(floconsDuCone(cone, 29, true))).toBeLessThan(total(floconsDuCone(cone, 29, false)))
  })

  it('le sommet n’est pas plus dense que la base : au repos, le quart des flocons visibles est dans la moitié haute', () => {
    const vus = floconsDuCone(cone, 29, false).flat().filter((f) => dansLeCone(cone, f))
    const haut = vus.filter((f) => f.y < cone.sommet.y + cone.hauteur / 2)
    // La moitié haute du triangle n'a que le quart de son aire.
    expect(haut.length / vus.length).toBeGreaterThan(0.2)
    expect(haut.length / vus.length).toBeLessThan(0.3)
  })
})
