import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { GRIS, NOIR } from '@/scene/grain'

const SVG = 'public/favicon.svg'

function svg(): string {
  return readFileSync(SVG, 'utf8')
}

test('la page porte le favicon, et l’icône que iOS sait lire', () => {
  // iOS ignore le SVG : sans le PNG, l'écran d'accueil montre une capture.
  const html = readFileSync('index.html', 'utf8')
  expect(html).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/)
  expect(html).toMatch(/<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"/)
})

test('le favicon est fait du grain du projet, pas d’une couleur inventée', () => {
  // Le noir de la nuit et le gris du grain viennent de `grain.ts` : si l'un
  // des deux bouge, le favicon doit suivre — c'est la matière du site.
  const s = svg()
  expect(s.toLowerCase()).toContain(NOIR.toLowerCase())
  expect(s.toLowerCase()).toContain(GRIS.toLowerCase())
  expect(s).not.toMatch(/#(?!0b0b0c|EDEDED)[0-9a-f]{6}/i)
})

test('il tient sur la grille de seize cellules', () => {
  // Une cellule du favicon est une cellule de grain : à 16 px, un point vaut
  // un pixel, et rien n'est à cheval.
  const s = svg()
  expect(s).toMatch(/viewBox="0 0 16 16"/)
  for (const m of s.matchAll(/<rect x="([\d.]+)" y="([\d.]+)"/g)) {
    expect(Number.isInteger(Number(m[1]))).toBe(true)
    expect(Number.isInteger(Number(m[2]))).toBe(true)
  }
})

test('les bords ne sont pas lissés : un point reste un point', () => {
  expect(svg()).toMatch(/shape-rendering="crispEdges"/)
})

test('une seule étoile, à pleine intensité, et son halo autour', () => {
  // Choix d'Emmanuelle le 24 novembre 2026, parmi trois : l'étoile seule. Le
  // semis de grain se refermait à 16 px — un carré gris, plus un point lisible.
  // Le halo est fait de `rect` à opacité partielle ; l'étoile est le seul à
  // pleine intensité, et elle fait deux cellules de côté.
  const s = svg()
  const pleins = [...s.matchAll(/<rect x="\d+" y="\d+" width="(\d+)" height="(\d+)" fill="[^"]+"\/>/g)]
  expect(pleins).toHaveLength(1)
  expect(pleins[0][1]).toBe('2')
  expect(pleins[0][2]).toBe('2')
})
