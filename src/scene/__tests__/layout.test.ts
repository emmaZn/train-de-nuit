import { readFileSync } from 'node:fs'

import { CRETE, CRETE_BIN } from '@/scene/crete'
import { GARES } from '@/stores/voyage'

import {
  ANCRE_FRISE,
  HAUTEUR_FRISE,
  HAUT_VOIE,
  CIEL_SOMMET,
  cadrageCiel,
  cadrageScene,
  cretePx,
  hautDuVoilePx,
  regionCiel,
  ANCRE_FRISE_MOBILE,
  DEGRADE_HAUTEUR,
  DUREE_ETAPE,
  MARGE_FRISE,
  MARGE_VOIE,
  MARGE_FRISE_MOBILE,
  ecartFrise,
  garesVisibles,
  DEGRADE_OPACITE,
  ECHELLE_MASSIF,
  ECHELLE_MONTAGNES,
  HORIZON,
  MOUNTAIN_SOURCE,
  ORTHO,
  SEUIL_MOBILE,
  STAGE,
  SWEEP_LEGS,
  bornesFenetre,
  cadreDegrade,
  cadreMontagnes,
  fenetreVisible,
  fitStage,
  margeVoie,
  toursMassif,
} from '@/scene/layout'

test('le cadre de la scène est celui que partagent les assets du train', () => {
  expect(STAGE).toEqual({ width: 2320, height: 1217 })
})

// Review Focus #5 : viewport minuscule, redimensionnement, rotation mobile
test.each([
  [360, 400],
  [1, 1],
  [3840, 2160],
  [0, 0],
])('fitStage(%i, %i) donne une échelle finie et positive', (w, h) => {
  const frame = fitStage(w, h)
  expect(frame.scale).toBeGreaterThan(0)
  expect(Number.isFinite(frame.scale)).toBe(true)
  expect(Number.isFinite(frame.offsetX)).toBe(true)
  expect(Number.isFinite(frame.offsetY)).toBe(true)
})

test('le cadre couvre le viewport sans laisser de bande vide', () => {
  const { scale } = fitStage(1440, 900)
  expect(STAGE.width * scale).toBeGreaterThanOrEqual(1440)
  expect(STAGE.height * scale).toBeGreaterThanOrEqual(900)
})

test('le cadre est centré sur le viewport', () => {
  const { scale, offsetX } = fitStage(1440, 900)
  expect(offsetX).toBeCloseTo((1440 - STAGE.width * scale) / 2, 5)
})

// Le voile qui éteint le pied des montagnes pour détacher le train.
test('le voile s’arrête exactement sur la ligne de voie', () => {
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.y + v.height).toBe(HORIZON)
})

test('le voile couvre toute la largeur du cadre', () => {
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.x).toBe(0)
  expect(v.width).toBe(STAGE.width)
})

test('le voile éteint le pied du massif, pas ses sommets', () => {
  const massif = cadreMontagnes(ECHELLE_MONTAGNES)
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.y).toBeGreaterThan(massif.y)
  expect(v.height).toBeLessThan(massif.height)
})

test('le voile reste dans le cadre', () => {
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.y).toBeGreaterThanOrEqual(0)
})

test('le voile s’efface vers le haut, il ne s’ouvre pas vers le bas', () => {
  // opacité pleine au ras de la voie, nulle en haut du voile
  expect(DEGRADE_OPACITE).toBeGreaterThan(0)
  expect(DEGRADE_OPACITE).toBeLessThanOrEqual(1)
})

// La frise étale ses gares sur la largeur : quatre sur un écran, deux sur un
// téléphone. L'écartement se calcule, il n'est plus une valeur en dur.
test('quatre gares sur un écran, deux sur un téléphone', () => {
  expect(garesVisibles(1440)).toBe(4)
  expect(garesVisibles(1024)).toBe(4)
  expect(garesVisibles(390)).toBe(2)
})

test('les quatre gares occupent toute la largeur disponible', () => {
  const l = 1280
  const e = ecartFrise(l, 4)
  expect(ANCRE_FRISE + 3 * e).toBeCloseTo(l - MARGE_FRISE, 6)
})

test('les deux gares du téléphone occupent la largeur aussi', () => {
  const l = 390
  const e = ecartFrise(l, 2)
  expect(ANCRE_FRISE_MOBILE + e).toBeCloseTo(l - MARGE_FRISE_MOBILE, 6)
})

test('l’écartement grandit avec l’écran', () => {
  expect(ecartFrise(1920, 4)).toBeGreaterThan(ecartFrise(1280, 4))
})

// Review Focus #5 : un viewport minuscule ne doit pas tout faire s'effondrer
test.each([[320, 2], [1, 2], [0, 2]])('ecartFrise(%i) reste positif et fini', (l, v) => {
  const e = ecartFrise(l, v)
  expect(e).toBeGreaterThan(0)
  expect(Number.isFinite(e)).toBe(true)
})

test('une seule gare visible ne divise pas par zéro', () => {
  expect(Number.isFinite(ecartFrise(400, 1))).toBe(true)
})

// Le massif n'est plus une image mais un rendu : le canvas qui le porte ne
// couvre que ce qu'on voit, borné à la voie. Couvrir tout le cadre coûterait
// 4800 px de large sur un téléphone en portrait, au-delà de la taille de
// texture que beaucoup de GPU mobiles acceptent.
test('sur un écran au format du cadre, la fenêtre prend toute la largeur', () => {
  const frame = fitStage(2320, 1217)
  const f = fenetreVisible(frame, 2320, 1217)
  expect(f.x).toBeCloseTo(0, 6)
  expect(f.width).toBeCloseTo(STAGE.width, 6)
})

test('la fenêtre s’arrête à la voie : le massif ne descend jamais plus bas', () => {
  const frame = fitStage(2320, 1217)
  const f = fenetreVisible(frame, 2320, 1217)
  expect(f.y + f.height).toBeCloseTo(HORIZON, 6)
})

test('en portrait, la fenêtre est bien plus étroite que le cadre', () => {
  const frame = fitStage(390, 844)
  const f = fenetreVisible(frame, 390, 844)
  expect(f.width).toBeLessThan(STAGE.width * 0.7)
  expect(f.width).toBeGreaterThan(0)
})

test('la fenêtre ne sort jamais du cadre, quel que soit l’écran', () => {
  for (const [w, h] of [[390, 844], [2320, 1217], [3840, 900], [1024, 1366], [1, 1]]) {
    const f = fenetreVisible(fitStage(w, h), w, h)
    expect(f.x).toBeGreaterThanOrEqual(0)
    expect(f.y).toBeGreaterThanOrEqual(0)
    expect(f.x + f.width).toBeLessThanOrEqual(STAGE.width + 1e-6)
    expect(f.y + f.height).toBeLessThanOrEqual(HORIZON + 1e-6)
    expect(f.width).toBeGreaterThan(0)
    expect(f.height).toBeGreaterThan(0)
  }
})

// Le frustum place le cadre Blender exactement là où la séquence était
// dessinée : on ne réinvente pas un cadrage, c'est ce qui avait désaligné le
// massif la dernière fois.
test('une fenêtre égale au cadre Blender redonne le frustum de Blender', () => {
  const c = cadreMontagnes(ECHELLE_MONTAGNES)
  const b = bornesFenetre(c, ECHELLE_MONTAGNES)
  const largeur = ORTHO / ECHELLE_MASSIF
  expect(b.right - b.left).toBeCloseTo(largeur, 6)
  expect(b.left).toBeCloseTo(-largeur / 2, 6)
  expect(b.top - b.bottom).toBeCloseTo((largeur * MOUNTAIN_SOURCE.height) / MOUNTAIN_SOURCE.width, 6)
})

test('une fenêtre deux fois plus large voit deux fois plus de scène', () => {
  const c = cadreMontagnes(ECHELLE_MONTAGNES)
  const etroit = bornesFenetre(c, ECHELLE_MONTAGNES)
  const large = bornesFenetre({ ...c, width: c.width * 2 }, ECHELLE_MONTAGNES)
  expect(large.right - large.left).toBeCloseTo((etroit.right - etroit.left) * 2, 6)
})

test('décaler la fenêtre vers la droite décale le frustum d’autant', () => {
  const c = cadreMontagnes(ECHELLE_MONTAGNES)
  const a = bornesFenetre(c, ECHELLE_MONTAGNES)
  const b = bornesFenetre({ ...c, x: c.x + 100 }, ECHELLE_MONTAGNES)
  const pas = (ORTHO / ECHELLE_MASSIF / c.width) * 100
  expect(b.left - a.left).toBeCloseTo(pas, 6)
  expect(b.right - a.right).toBeCloseTo(pas, 6)
})

// Le massif tourne à l'inverse de la marche : vu depuis un train qui va vers
// la droite, un relief lointain découvre peu à peu sa face gauche. Tourner
// dans l'autre sens donnerait un train qui recule — ce que CONCEPT.md §3
// interdit explicitement.
test('le massif tourne dans le sens inverse de la marche', () => {
  expect(toursMassif(1)).toBeLessThan(0)
  expect(toursMassif(4)).toBeLessThan(toursMassif(1))
})

test('à l’arrêt au départ, le massif est à son orientation d’origine', () => {
  expect(toursMassif(0)).toBeCloseTo(0, 12)
})

test('un tour complet demande SWEEP_LEGS étapes', () => {
  expect(Math.abs(toursMassif(SWEEP_LEGS))).toBeCloseTo(1, 6)
})

// « Lents, comme un souffle » (CONCEPT.md §6) : le massif met plusieurs tours
// de boucle à faire le sien, sinon il défile au lieu de se découvrir.
test('le massif met plusieurs boucles de train à faire un tour', () => {
  expect(SWEEP_LEGS / GARES.length).toBeGreaterThanOrEqual(2)
})

// Les deux réglages se multiplient : c'est leur produit qui donne la vitesse
// réellement vue. Le massif doit mettre plus d'une minute à faire son tour.
test('un tour de massif dure plus d’une minute', () => {
  expect(SWEEP_LEGS * DUREE_ETAPE).toBeGreaterThan(60)
})

// La voie s'arrête avant le bord de l'écran, mais jamais au point d'avaler
// l'ancre : un marqueur pris dans le fondu ne se verrait plus.
test('sur grand écran, la voie garde la marge demandée', () => {
  expect(margeVoie(1512)).toBe(MARGE_VOIE)
})

test('la marge ne mord jamais sur l’ancre', () => {
  for (const l of [320, 390, 600, 719, 720, 1024, 1512, 2560]) {
    const ancre = l < SEUIL_MOBILE ? ANCRE_FRISE_MOBILE : ANCRE_FRISE
    expect(margeVoie(l)).toBeLessThan(ancre)
    expect(margeVoie(l)).toBeGreaterThanOrEqual(0)
  }
})

test('sur téléphone, la marge se réduit au lieu de cacher le marqueur', () => {
  expect(margeVoie(390)).toBeLessThan(margeVoie(1512))
})

describe('la région libre du ciel', () => {
  test('là où il n’y a pas de massif, la région s’arrête au haut du voile', () => {
    expect(cretePx(2, 844, 390, 1.555, 26)).toBeCloseTo(hautDuVoilePx(844, 390, 26), 0)
  })

  test('la région ne descend jamais sous le haut du voile', () => {
    for (const x of [0, 200, 422, 700, 844]) {
      const r = regionCiel(x, 844, 390, 1.555, 26)
      expect(r.top + r.height).toBeLessThanOrEqual(hautDuVoilePx(844, 390, 26) + 0.5)
    }
  })

  test('une région écrasée garde une hauteur utilisable', () => {
    const r = regionCiel(400, 800, 200, 2.2, 0)
    expect(r.height).toBeGreaterThan(0)
    expect(Number.isFinite(r.height)).toBe(true)
  })

  test('la crête est brute : valeur absolue sur un bord de paquet, sans marge', () => {
    // Bord entre les paquets 26 et 27 : la crête y vaut min(386, 348) = 348.
    const [w, h, echelle, decalage] = [1512, 771, 2.153, 11]
    const frame = fitStage(w, h)
    const c = cadreMontagnes(echelle)
    const f = (STAGE.width / MOUNTAIN_SOURCE.width) * echelle
    const x = (c.x + 27 * CRETE_BIN * f) * frame.scale + frame.offsetX
    const attendu = (c.y + Math.min(CRETE[26], CRETE[27]) * f) * frame.scale + frame.offsetY + decalage
    expect(cretePx(x, w, h, echelle, decalage)).toBeCloseTo(attendu, 5)
  })

  test('la crête rendue ne descend jamais sous le minimum de son paquet', () => {
    for (const [w, h, echelle] of [[1512, 771, 2.153], [2560, 1440, 2.2], [1280, 800, 2.2]]) {
      const frame = fitStage(w, h)
      const c = cadreMontagnes(echelle)
      const f = (STAGE.width / MOUNTAIN_SOURCE.width) * echelle
      for (let x = 0; x <= w; x += 0.5) {
        const sx = ((x - frame.offsetX) / frame.scale - c.x) / f
        const i = Math.min(Math.max(Math.floor(sx / CRETE_BIN), 0), CRETE.length - 1)
        const borne = (c.y + CRETE[i] * f) * frame.scale + frame.offsetY
        expect(cretePx(x, w, h, echelle, 0)).toBeLessThanOrEqual(borne + 1e-6)
      }
    }
  })

  test('la crête varie en continu, sans marches', () => {
    let max = 0
    for (let x = 300; x < 1200; x++) {
      const d = Math.abs(cretePx(x + 1, 1512, 771, 2.153, 0) - cretePx(x, 1512, 771, 2.153, 0))
      max = Math.max(max, d)
    }
    expect(max).toBeLessThan(6)
  })

  test('le décalage descend la crête d’autant, en pixels d’écran', () => {
    const a = cretePx(756, 1512, 771, 2.153, 0)
    expect(cretePx(756, 1512, 771, 2.153, 30)).toBeCloseTo(a + 30, 5)
  })

  test('HAUTEUR_FRISE est la somme des deux morceaux de CSS qui la font', () => {
    const base = readFileSync('src/styles/base.css', 'utf8')
    const frise = readFileSync('src/components/NavFrise.vue', 'utf8')
    const voie = Number(/--haut-voie:\s*(\d+)px/.exec(base)?.[1])
    const marge = Number(/height:\s*calc\(var\(--haut-voie\)\s*\+\s*(\d+)px\)/.exec(frise)?.[1])
    expect(voie).toBe(HAUT_VOIE)
    expect(Number.isFinite(marge)).toBe(true)
    expect(voie + marge).toBe(HAUTEUR_FRISE)
  })
})

test('la frise fait 96 px', () => {
  expect(HAUTEUR_FRISE).toBe(96)
})

test('l’œil se pose sur la ligne de voie, pas au-dessus', async () => {
  // Il était centré dans la bande au-dessus de la voie ; cette bande passe de
  // 64 à 44 px et un bouton de 36 px n'y tient plus proprement.
  const css = (await import('@/components/EyeButton.vue?raw')).default
  expect(css).toMatch(/top:\s*calc\(var\(--haut-voie\)\s*-\s*18px\)/)
})

describe('la règle de dégagement', () => {
  const colonnes = (w: number): number[] => Array.from({ length: Math.ceil(w) + 1 }, (_, i) => i)

  test.each([
    [1512, 771, 11, 2.153],
    [1280, 800, 0, 2.16],
    [1440, 900, 0, 2.2],
    [1728, 1117, 0, 2.2],
    [390, 844, 0, 2.2],
    [844, 390, 26, 1.555],
  ])('cadrage de %ix%i', (w, h, decalage, echelle) => {
    const c = cadrageCiel(w, h)
    expect(c.decalage).toBeCloseTo(decalage, 0)
    expect(c.echelle).toBeCloseTo(echelle, 2)
  })

  test('le jeu vertical est nul dès que la fenêtre est pilotée par sa hauteur', () => {
    expect(cadrageCiel(1440, 900).decalage).toBe(0)
    expect(cadrageCiel(1512, 771).decalage).toBeGreaterThan(0)
  })

  test('l’échelle est continue en hauteur de fenêtre', () => {
    for (const w of [360, 390, 600, 1000]) {
      for (let h = 300; h < 900; h += 1) {
        const a = cadrageCiel(w, h).echelle
        const b = cadrageCiel(w, h + 1).echelle
        expect(Math.abs(a - b), `${w}x${h}`).toBeLessThan(0.02)
      }
    }
  })

  test('la cible de 60 px est tenue partout', () => {
    for (const [w, h] of [[1512, 771], [1280, 800], [1440, 900], [390, 844], [844, 390], [1024, 600]]) {
      const { decalage, echelle } = cadrageCiel(w, h)
      const sommet = Math.min(...colonnes(w).map((x) => cretePx(x, w, h, echelle, decalage)))
      expect(sommet - HAUTEUR_FRISE).toBeGreaterThanOrEqual(CIEL_SOMMET - 0.5)
    }
  })
})

test.each([
  [1512, 771],
  [844, 390],
  [1440, 900],
])('la scène décale ce que cretePx suppose décalé (%i x %i)', (w, h) => {
  // `cretePx` ajoute le décalage après `fitStage` ; la scène le met dans
  // l'`offsetY` du conteneur qui porte le massif. Une crête de scène projetée
  // par ce cadre doit retomber là où cretePx la place.
  const { frame, decalage, echelle } = cadrageScene(w, h)
  const c = cadreMontagnes(echelle)
  const f = (STAGE.width / MOUNTAIN_SOURCE.width) * echelle
  const x = w / 2
  const sx = ((x - frame.offsetX) / frame.scale - c.x) / f
  const u = Math.min(Math.max(sx / CRETE_BIN, 0), CRETE.length)
  const i = Math.min(Math.floor(u), CRETE.length - 1)
  const bord = (k: number): number =>
    k <= 0 ? CRETE[0] : k >= CRETE.length ? CRETE[CRETE.length - 1] : Math.min(CRETE[k - 1], CRETE[k])
  const sy = bord(i) + (bord(i + 1) - bord(i)) * (u - i)
  const ecran = (c.y + sy * f) * frame.scale + frame.offsetY
  const voile = (HORIZON - DEGRADE_HAUTEUR) * frame.scale + frame.offsetY
  expect(cretePx(x, w, h, echelle, decalage)).toBeCloseTo(Math.min(ecran, voile), 6)
  expect(frame.offsetY).toBeCloseTo(fitStage(w, h).offsetY + decalage, 9)
})
