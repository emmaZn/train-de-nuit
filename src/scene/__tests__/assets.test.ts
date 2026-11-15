import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { framePath, loadManifest } from '@/scene/assets'
import { PIECES } from '@/scene/quai'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('framePath remplit l’index sur quatre chiffres', () => {
  expect(framePath('assets/mountains/{i}.webp', 7)).toBe('assets/mountains/0007.webp')
})

test('framePath ne tronque pas un index à quatre chiffres', () => {
  expect(framePath('assets/mountains/{i}.webp', 160)).toBe('assets/mountains/0160.webp')
})

test('loadManifest rend le manifeste quand tout va bien', async () => {
  const manifeste = { stage: { width: 2320, height: 1217 } }
  vi.stubGlobal('fetch', () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(manifeste) }),
  )
  await expect(loadManifest()).resolves.toEqual(manifeste)
})

// Review Focus #3 : réseau coupé, manifeste introuvable
test('loadManifest rend null au lieu de lever quand le fetch échoue', async () => {
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))
  await expect(loadManifest()).resolves.toBeNull()
})

test('loadManifest rend null sur une réponse 404', async () => {
  vi.stubGlobal('fetch', () => Promise.resolve({ ok: false, status: 404 }))
  await expect(loadManifest()).resolves.toBeNull()
})

test('loadManifest rend null sur un JSON illisible', async () => {
  vi.stubGlobal('fetch', () =>
    Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('bad json')) }),
  )
  await expect(loadManifest()).resolves.toBeNull()
})

/** Les pièces du quai d'« ailleurs », servies comme les poses des bouvreuils. */
const AILLEURS = 'public/assets/ailleurs'
const PIECES_SERVIES = ['banc.svg', 'batiment.svg', 'reverbere.svg', 'valise.svg']

/** Les couleurs qu'un SVG nomme : celles de ses `fill` et de ses `stroke`. */
function couleursDe(svg: string): string[] {
  return [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{3,8})"/g)].map((m) => m[1])
}

/**
 * La clarté d'une couleur, de 0 (le noir qui devient le fond) à 1 (le blanc).
 *
 * C'est la clarté HSL — la moyenne des extrêmes — et non la luminance
 * perceptuelle : on ne cherche pas à savoir ce que l'œil pèse, seulement de
 * quel côté du vide la couleur tombe.
 */
function clarte(couleur: string): number {
  const hex = couleur.slice(1)
  const pas = hex.length <= 4 ? 1 : 2
  const canaux = [0, 1, 2].map((i) => {
    const part = hex.slice(i * pas, i * pas + pas)
    return parseInt(pas === 1 ? part + part : part, 16)
  })
  return (Math.max(...canaux) + Math.min(...canaux)) / 2 / 255
}

test('les quatre pièces du quai sont servies', () => {
  expect(readdirSync(AILLEURS).sort()).toEqual(PIECES_SERVIES)
})

/**
 * La règle qui gouverne tout le décor (cadrage §4) : le noir *devient* la
 * couleur du fond, le blanc reste blanc, et rien ne s'allume entre les deux.
 *
 * La borne basse n'est pas 0 parce que le noir de la maison ne l'est pas :
 * `#0b0b0c` est celui qui devient le fond (`poses.ts`). Le trait, `#e6e6ea`
 * (`ailleurs/panneau-ailleurs.svg`), passe la borne haute sans rien assouplir.
 * Ce qu'on interdit, c'est le milieu.
 */
test('aucun asset d’« ailleurs » ne contient de gris moyen', () => {
  for (const fichier of PIECES_SERVIES) {
    const couleurs = couleursDe(readFileSync(join(AILLEURS, fichier), 'utf8'))
    expect(couleurs.length, `${fichier} ne nomme aucune couleur`).toBeGreaterThan(0)
    for (const couleur of couleurs) {
      const l = clarte(couleur)
      expect(l < 0.1 || l > 0.9, `${fichier} : ${couleur}`).toBe(true)
    }
  }
})

/**
 * Une opacité fractionnaire rallume à mi-teinte ce que la couleur avait laissé
 * blanc ou noir : c'est le même défaut, écrit autrement. `cables/poteau.svg`
 * en est plein (`opacity=".7"`), on ne reprend pas l'habitude.
 */
test('aucun asset d’« ailleurs » n’éteint un trait à demi', () => {
  for (const fichier of PIECES_SERVIES) {
    const svg = readFileSync(join(AILLEURS, fichier), 'utf8')
    for (const [, valeur] of svg.matchAll(/\b(?:fill-|stroke-)?opacity="([^"]*)"/g)) {
      expect(Number(valeur), `${fichier} : opacity="${valeur}"`).toBe(1)
    }
  }
})

/**
 * Le bâtiment est la seule pièce dont `quai.ts` fixe les deux dimensions :
 * c'est donc la seule qu'un cadre mal proportionné étirerait sans qu'on
 * puisse s'en apercevoir en regardant le SVG seul.
 */
test('le bâtiment est dessiné aux proportions que le quai lui donne', () => {
  const svg = readFileSync(join(AILLEURS, 'batiment.svg'), 'utf8')
  const cadre = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  expect(cadre, 'le bâtiment n’a pas de viewBox à l’origine').not.toBeNull()
  const [, largeur, hauteur] = cadre!
  expect(Number(hauteur) / Number(largeur)).toBeCloseTo(
    PIECES.batiment.hauteur / PIECES.batiment.largeur,
    5,
  )
})
