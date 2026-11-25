import {
  createRecolorFilter,
  luminance,
  recolorPixel,
  setRecolorMode,
} from '@/scene/recolor'
import type { Filter } from 'pixi.js'

type Rgb = [number, number, number]

/** #2E2313, « vieille photo », la couleur de nuit par défaut. */
const FOND: Rgb = [46, 35, 19]

test('le noir devient exactement la couleur du fond', () => {
  expect(recolorPixel([0, 0, 0], FOND)).toEqual(FOND)
})

test('le blanc reste blanc', () => {
  expect(recolorPixel([255, 255, 255], FOND)).toEqual([255, 255, 255])
})

test('un gris moyen se place entre le fond et le blanc', () => {
  const [r] = recolorPixel([128, 128, 128], FOND)
  expect(r).toBeGreaterThan(FOND[0])
  expect(r).toBeLessThan(255)
})

test('la règle vaut pour n’importe quelle couleur de nuit', () => {
  const encre: Rgb = [21, 21, 23]
  expect(recolorPixel([0, 0, 0], encre)).toEqual(encre)
})

/** L'encre, sol de la nuit et trait du jour. */
const FOND_NUIT: Rgb = [21, 21, 23]
/** Le papier choisi le 25/11, #F2EEE6, et l'encre. */
const JOUR = { papier: [242, 238, 230] as Rgb, encre: [21, 21, 23] as Rgb }

/**
 * Témoin : la règle d'avant le mode jour, recopiée mot pour mot. Elle tient la
 * promesse « la nuit ne bouge pas d'un pixel ».
 */
function recolorPixelAvant(rgb: Rgb, fond: Rgb): Rgb {
  const l = luminance(rgb)
  return [
    Math.round(fond[0] + (rgb[0] - fond[0]) * l),
    Math.round(fond[1] + (rgb[1] - fond[1]) * l),
    Math.round(fond[2] + (rgb[2] - fond[2]) * l),
  ]
}

describe('la règle à deux pôles', () => {
  it('rend le papier exact sur le sol', () => {
    // le noir d'un asset, que la nuit rend à #151517
    expect(recolorPixel([0, 0, 0], FOND_NUIT, JOUR)).toEqual([242, 238, 230])
  })

  it("rend l'encre exacte sur un trait à pleine luminance", () => {
    expect(recolorPixel([255, 255, 255], FOND_NUIT, JOUR)).toEqual([21, 21, 23])
  })

  it('ne touche pas la nuit quand on ne lui donne pas de jour', () => {
    expect(recolorPixel([128, 130, 127], FOND_NUIT)).toEqual(
      recolorPixelAvant([128, 130, 127], FOND_NUIT),
    )
  })

  it('est monotone : plus le texel est clair, plus le jour est sombre', () => {
    const suite = [0, 64, 128, 192, 255].map((v) =>
      luminance(recolorPixel([v, v, v], FOND_NUIT, JOUR)),
    )
    expect(suite).toEqual([...suite].sort((a, b) => b - a))
  })

  it('ne laisse aucun pixel plus clair que le papier', () => {
    for (let v = 0; v <= 255; v += 5) {
      const [r, g, b] = recolorPixel([v, v, v], FOND_NUIT, JOUR)
      expect(r).toBeLessThanOrEqual(242)
      expect(g).toBeLessThanOrEqual(238)
      expect(b).toBeLessThanOrEqual(230)
    }
  })
})

function uniformes(filter: Filter): Record<string, unknown> {
  const groupe = filter.resources.recolorUniforms as { uniforms: Record<string, unknown> }
  return groupe.uniforms
}

describe('le filtre porte les deux pôles', () => {
  it('part en nuit', () => {
    expect(uniformes(createRecolorFilter(0x151517)).uJour).toBe(0)
  })

  it('bascule en jour et revient', () => {
    const filtre = createRecolorFilter(0x151517)
    setRecolorMode(filtre, true)
    expect(uniformes(filtre).uJour).toBe(1)
    setRecolorMode(filtre, false)
    expect(uniformes(filtre).uJour).toBe(0)
  })

  it('calcule le sol depuis le fond', () => {
    const filtre = createRecolorFilter(0x151517)
    expect(uniformes(filtre).uSol as number).toBeCloseTo(luminance([21, 21, 23]), 5)
  })

  // Le sol ne change jamais après coup : il n'y a qu'un seul sol, l'encre, et
  // le mode ne le déplace pas. C'est tout l'intérêt de ne pas pouvoir l'écrire.
  it('ne donne aucun moyen de déplacer le sol après coup', () => {
    const filtre = createRecolorFilter(0x151517)
    setRecolorMode(filtre, true)
    expect(uniformes(filtre).uSol as number).toBeCloseTo(luminance([21, 21, 23]), 5)
  })
})
