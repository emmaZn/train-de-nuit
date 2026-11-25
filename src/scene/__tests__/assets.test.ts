import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { Assets, Texture } from 'pixi.js'

import { PARALLELE_SEQUENCE, framePath, loadManifest, loadSequence } from '@/scene/assets'
import { PIECES } from '@/scene/quai'
import { lirePngIndexe } from './png'

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

/**
 * Les pièces du quai d'« ailleurs », par la voie qui les sert.
 *
 * Le banc et la valise sont des SVG, cuits au rendu par `fabriquerPiece`
 * comme les poses des bouvreuils. Le bâtiment et le réverbère viennent des
 * dessins de la propriétaire, passés au grain du projet hors ligne
 * (`outils/preparer_ailleurs.py`, puis `outils/grain_train.py`) et servis en
 * PNG indexé, comme les images du train sont servies en WebP.
 */
const AILLEURS = 'public/assets/ailleurs'
const PIECES_SVG = ['banc.svg', 'valise.svg']
const PIECES_IMAGE = ['batiment.png', 'reverbere.png']
const PIECES_SERVIES = [...PIECES_SVG, ...PIECES_IMAGE]

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

/**
 * Un sous-ensemble, et des `.svg` seulement : la liste exacte du dossier
 * cassait la suite pour un `.DS_Store` déposé par le Finder, c'est-à-dire pour
 * une raison étrangère au code. Ce qui compte est que les quatre pièces soient
 * servies, pas que rien d'autre ne traîne à côté.
 */
test('les quatre pièces du quai sont servies', () => {
  const servies = readdirSync(AILLEURS).filter((f) => /\.(svg|png)$/.test(f))
  expect(servies).toEqual(expect.arrayContaining([...PIECES_SERVIES]))
})

/**
 * Les deux dessins à la main sont **remplacés**, pas doublés : un
 * `batiment.svg` qui traînerait à côté de `batiment.png` serait chargé par
 * personne et relu par le prochain qui passe.
 */
test('les deux dessins à la main ne sont plus servis', () => {
  const servies = readdirSync(AILLEURS)
  expect(servies).not.toContain('batiment.svg')
  expect(servies).not.toContain('reverbere.svg')
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
  for (const fichier of PIECES_SVG) {
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
  for (const fichier of PIECES_SVG) {
    const svg = readFileSync(join(AILLEURS, fichier), 'utf8')
    for (const [, valeur] of svg.matchAll(/\b(?:fill-|stroke-)?opacity="([^"]*)"/g)) {
      expect(Number(valeur), `${fichier} : opacity="${valeur}"`).toBe(1)
    }
  }
})

/**
 * L'équivalent, pour une image grainée, du test des couleurs ci-dessus — et
 * son remplaçant : c'est ici que « blanc ou absent » (CONCEPT §12.2) se garde
 * depuis que les deux pièces ne sont plus des SVG.
 *
 * Le PNG indexé rend l'invariant **structurel** : une image qui n'a que trois
 * entrées de palette ne *peut* pas allumer un point à mi-teinte, quoi qu'elle
 * contienne. On vérifie les trois entrées, l'opacité — pleine ou nulle, jamais
 * entre les deux, c'est l'équivalent du test des `opacity` fractionnaires — et
 * qu'aucun pixel ne pointe hors de la palette.
 */
test('aucune pièce grainée d’« ailleurs » n’allume un point à mi-teinte', () => {
  for (const fichier of PIECES_IMAGE) {
    const png = lirePngIndexe(readFileSync(join(AILLEURS, fichier)))
    expect(png.palette.length, `${fichier} : entrées de palette`).toBeLessThanOrEqual(3)
    for (const [r, v, b] of png.palette) {
      const l = clarte(`#${[r, v, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`)
      expect(l < 0.1 || l > 0.9, `${fichier} : rgb(${r}, ${v}, ${b})`).toBe(true)
    }
    // Une absence ne doit pas satisfaire ce garde : sans `tRNS`, la boucle
    // ci-dessous ne tournerait pas, et chaque pixel « vide » serait du noir
    // opaque. On exige donc le chunk, et que l'entrée 0 — le vide — soit bien
    // la transparente.
    expect(png.opacites.length, `${fichier} : chunk tRNS`).toBeGreaterThan(0)
    expect(png.opacites[0], `${fichier} : l'entrée 0 est transparente`).toBe(0)
    for (const [index, opacite] of png.opacites.entries()) {
      expect([0, 255], `${fichier} : opacité de l’entrée ${index}`).toContain(opacite)
    }
    // `Math.max(...)` sur un million de pixels fait sauter la pile d'appels.
    let plusHaut = 0
    for (const index of png.index) if (index > plusHaut) plusHaut = index
    expect(plusHaut, `${fichier} : index hors palette`).toBeLessThan(png.palette.length)
  }
})

/**
 * Le bâtiment est la seule pièce dont `quai.ts` fixe les deux dimensions :
 * c'est donc la seule qu'un cadre mal proportionné étirerait sans qu'on
 * puisse s'en apercevoir en regardant l'image seule.
 */
test('le bâtiment est dessiné aux proportions que le quai lui donne', () => {
  const png = lirePngIndexe(readFileSync(join(AILLEURS, 'batiment.png')))
  expect(png.hauteur / png.largeur).toBeCloseTo(
    PIECES.batiment.hauteur / PIECES.batiment.largeur,
    4,
  )
})

/**
 * Les images d'une séquence arrivaient **une par une** : `loadSequence`
 * attendait chacune avant de demander la suivante. Mesuré le 24 novembre 2026
 * sur le build de production, les 237 images du train faisaient quelque 120
 * allers-retours en file indienne — invisible sur la boucle locale, des
 * dizaines de secondes sur un téléphone, où chaque aller-retour coûte sa
 * latence.
 *
 * Elles partent maintenant par paquets. Ce qui ne change pas : l'ordre du
 * tableau rendu, qui est celui des images et non celui des réponses, et le
 * sort d'une image manquante, qui est sautée sans rien interrompre.
 */
function sequenceFeinte(compte: number, manquantes: number[] = []) {
  let ensemble = 0
  let creteDeFront = 0
  const vus: number[] = []
  // `Assets.load` est surchargée : on passe par le type de la fonction elle-même.
  const espion = vi.spyOn(Assets, 'load').mockImplementation((async (url: unknown) => {
    const index = Number(String(url).match(/(\d+)\.webp$/)?.[1])
    vus.push(index)
    ensemble += 1
    creteDeFront = Math.max(creteDeFront, ensemble)
    // Les dernières répondent les premières : si l'ordre du tableau suivait
    // les réponses, ce test le verrait.
    await new Promise((r) => setTimeout(r, (compte - index) * 2))
    ensemble -= 1
    if (manquantes.includes(index)) throw new Error('image absente')
    return { __index: index } as unknown as Texture
  }) as unknown as typeof Assets.load)
  return { espion, vus, front: () => creteDeFront }
}

test('une séquence se charge par paquets, pas une image à la fois', async () => {
  const { front } = sequenceFeinte(24)
  await loadSequence({ count: 24, path: '/t/{i}.webp' })
  expect(front()).toBeGreaterThan(1)
  expect(front()).toBeLessThanOrEqual(PARALLELE_SEQUENCE)
})

test('le tableau rendu suit l’ordre des images, pas celui des réponses', async () => {
  sequenceFeinte(12)
  const textures = await loadSequence({ count: 12, path: '/t/{i}.webp' })
  expect(textures).toHaveLength(12)
  expect(textures.map((t) => (t as unknown as { __index: number }).__index)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  ])
})

test('une image manquante est sautée, et le reste garde son ordre', async () => {
  sequenceFeinte(8, [3, 6])
  const textures = await loadSequence({ count: 8, path: '/t/{i}.webp' })
  expect(textures.map((t) => (t as unknown as { __index: number }).__index)).toEqual([
    1, 2, 4, 5, 7, 8,
  ])
})

test('toutes les images sont demandées, une seule fois chacune', async () => {
  const { vus } = sequenceFeinte(30)
  await loadSequence({ count: 30, path: '/t/{i}.webp' })
  expect([...vus].sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
})

/**
 * Un jeu d'images du train par mode. Le manifeste ne change pas : il garde ses
 * chemins en `/assets/train/`, parce que les boîtes et les comptes sont
 * identiques dans les deux jeux. C'est le chargement qui pose le préfixe, et
 * un visiteur ne télécharge donc que les images de son mode.
 */
describe('le préfixe du train suit le mode', () => {
  const manifeste = () => ({
    stage: { width: 2320, height: 1217 },
    train: {
      loco: { count: 32, path: '/assets/train/loco/{i}.webp' },
      wagon: { count: 32, path: '/assets/train/wagon/{i}.webp' },
    },
  })

  function servir() {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(manifeste()) }),
    )
  }

  test('sert le jeu de nuit par défaut', async () => {
    servir()
    const m = await loadManifest()
    expect(m!.train.loco.path).toBe('/assets/train-nuit/loco/{i}.webp')
  })

  test('sert le jeu de jour en mode jour', async () => {
    servir()
    const m = await loadManifest('/assets/manifest.json', 'jour')
    expect(m!.train.loco.path).toBe('/assets/train-jour/loco/{i}.webp')
    expect(m!.train.wagon.path).toBe('/assets/train-jour/wagon/{i}.webp')
  })

  // Review Focus #4 : un préfixe inconnu retombe sur la nuit, pas sur des 404.
  test('retombe sur la nuit pour un mode inconnu', async () => {
    servir()
    const m = await loadManifest('/assets/manifest.json', 'brouillard' as never)
    expect(m!.train.loco.path).toBe('/assets/train-nuit/loco/{i}.webp')
  })

  test('ne touche pas aux chemins hors du dossier du train', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ ...manifeste(), carte: { path: '/assets/massif-carte.webp' } }),
      }),
    )
    const m = await loadManifest('/assets/manifest.json', 'jour')
    expect((m as unknown as { carte: { path: string } }).carte.path).toBe(
      '/assets/massif-carte.webp',
    )
  })

  // La voie vit dans le dossier du train et suit donc le préfixe. Elle est la
  // même image dans les deux jeux — elle vient du repli, pas de la cuisson.
  test('la voie suit le préfixe elle aussi', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ ...manifeste(), rails: { path: '/assets/train/rails.webp' } }),
      }),
    )
    const m = await loadManifest('/assets/manifest.json', 'jour')
    expect((m as unknown as { rails: { path: string } }).rails.path).toBe(
      '/assets/train-jour/rails.webp',
    )
  })

  test('rend null sur un manifeste illisible, mode ou pas', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))
    await expect(loadManifest('/nulle-part.json', 'jour')).resolves.toBeNull()
  })
})

/** Les deux jeux sont servis, et ils portent le même nombre d'images. */
describe('les deux jeux d’images du train sont là', () => {
  const sequences = ['loco', 'wagon', 'loco-start', 'wagon-start', 'loco-stop', 'wagon-stop']

  test('la voie est servie dans les deux jeux', () => {
    expect(readdirSync('public/assets/train-nuit')).toContain('rails.webp')
    expect(readdirSync('public/assets/train-jour')).toContain('rails.webp')
  })

  test.each(sequences)('%s existe dans les deux modes, au même compte', (sequence) => {
    const nuit = readdirSync(join('public/assets/train-nuit', sequence))
    const jour = readdirSync(join('public/assets/train-jour', sequence))
    expect(nuit.length).toBeGreaterThan(0)
    expect(jour).toEqual(nuit)
  })

  test('l’ancien dossier unique n’est plus servi', () => {
    expect(() => readdirSync('public/assets/train')).toThrow()
  })
})
