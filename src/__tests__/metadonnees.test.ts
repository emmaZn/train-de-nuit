import { readFileSync } from 'node:fs'

import { expect, test } from 'vitest'

import { TEXTES } from '@/i18n/textes'
import { DEFAUT } from '@/scene/palette'

/**
 * Ce que le document dit de lui-même, et qui n'existait pas : `index.html` ne
 * portait que `charset` et `viewport`.
 *
 * Deux choses le décident. **Le site n'est pas indexé** (§12.8) : il ne vit que
 * par le lien qu'Emmanuelle envoie. Et du coup **l'aperçu de ce lien est la
 * seule vitrine qu'il ait** — d'où les balises Open Graph, écrites ici en
 * français, parce que les robots d'aperçu n'exécutent pas le bundle. Ils lisent
 * ce fichier.
 *
 * Les textes vivent dans `TEXTES`, et le HTML les recopie. Ce test tient les
 * deux ensemble, comme le fait celui du ciel d'attente pour la poussière.
 */
const html = readFileSync('index.html', 'utf8')

function meta(cle: string, attribut: 'name' | 'property' = 'name'): string | null {
  const trouve = html.match(new RegExp(`<meta ${attribut}="${cle}" content="([^"]*)"`))
  return trouve ? trouve[1] : null
}

test('le site demande à ne pas être indexé', () => {
  expect(meta('robots')).toMatch(/\bnoindex\b/)
})

/**
 * Un `Disallow` empêche le robot de **lire** la page, donc de voir le
 * `noindex` : la page peut alors rester référencée, vide, par un lien venu
 * d'ailleurs. C'est l'inverse de ce qu'on veut. Un `noindex` qu'on peut lire
 * est plus sûr qu'une porte fermée.
 */
test('aucun robots.txt ne ferme la porte', () => {
  let robots: string | null = null
  try {
    robots = readFileSync('public/robots.txt', 'utf8')
  } catch {
    robots = null
  }
  if (robots !== null) expect(robots).not.toMatch(/Disallow:\s*\/\s*$/m)
})

test('le titre et la description du HTML sont ceux du français', () => {
  expect(html).toContain(`<title>${TEXTES.fr.meta.titre}</title>`)
  expect(meta('description')).toBe(TEXTES.fr.meta.description)
})

test('l’aperçu du lien reprend les mêmes mots', () => {
  expect(meta('og:title', 'property')).toBe(TEXTES.fr.meta.titre)
  expect(meta('og:description', 'property')).toBe(TEXTES.fr.meta.description)
  expect(meta('og:type', 'property')).toBe('website')
})

/**
 * L'image de partage : une vraie capture de la scène, choisie parmi les
 * quatre gares. Son URL doit être **absolue** — un aperçu se fabrique sur le
 * serveur du réseau social, qui n'a pas de page courante contre laquelle
 * résoudre un chemin relatif.
 */
test('l’aperçu porte une image, à une adresse absolue', () => {
  const image = meta('og:image', 'property')
  expect(image).toBe('https://train-de-nuit.pages.dev/partage.png')
  expect(meta('og:image:width', 'property')).toBe('1200')
  expect(meta('og:image:height', 'property')).toBe('630')
  expect(meta('og:image:alt', 'property')).toBeTruthy()
  expect(meta('twitter:card')).toBe('summary_large_image')
})

test('l’image de partage existe, et fait bien 1200 × 630', () => {
  // Les deux nombres sont annoncés dans les balises : un aperçu les croit sur
  // parole et réserve la place avant d'avoir l'image.
  const fichier = readFileSync('public/partage.png')
  expect(fichier.length).toBeGreaterThan(0)
  // Les dimensions d'un PNG vivent dans son en-tête IHDR, octets 16 à 23.
  expect(fichier.readUInt32BE(16)).toBe(1200)
  expect(fichier.readUInt32BE(20)).toBe(630)
})

test('l’aperçu pointe sur l’adresse de l’hébergeur', () => {
  // Cloudflare Pages, adresse gratuite — CONCEPT.md §12.6.
  expect(meta('og:url', 'property')).toBe('https://train-de-nuit.pages.dev/')
})

test('les deux langues sont annoncées', () => {
  expect(meta('og:locale', 'property')).toBe('fr_FR')
  expect(meta('og:locale:alternate', 'property')).toBe('en_GB')
})

test('la couleur du navigateur est la nuit par défaut', () => {
  // Le script de tête pose déjà `--fond` avant le premier pixel ; celle-ci
  // teinte ce qui est autour, la barre d'adresse d'un téléphone.
  expect(meta('theme-color')).toBe(DEFAUT)
})

/**
 * Les gares sont de vraies URL — `/ici`, `/plus-loin`, `/ailleurs/cv` — mais
 * il n'y a qu'un seul fichier. Sans cette règle, ouvrir un lien partagé
 * ailleurs que sur la racine rend un 404 chez l'hébergeur : c'est le routeur
 * de la page qui lit le chemin, encore faut-il que la page arrive.
 */
test('toutes les gares retombent sur la page, chez l’hébergeur', () => {
  const regles = readFileSync('public/_redirects', 'utf8')
  // 200 et non 301 : l'URL demandée reste celle qu'on voit.
  expect(regles).toMatch(/^\/\*\s+\/index\.html\s+200\s*$/m)
})
