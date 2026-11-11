import { Object3D, Vector3 } from 'three'

import { ECHELLE_MASSIF, ORTHO, toursMassif } from '@/scene/layout'

import {
  CAMERA,
  CONTRASTE,
  COTE,
  OMBRE,
  SOLEIL,
  GRAIN_ECRAN,
  TAILLE_BLENDER,
  bornesSymetriques,
  cameraMassif,
  MAILLE,
  RELIEF,
  decoder,
  echantillonner,
  fondusDuTour,
  geometrieMassif,
  grainsParUnite,
} from '@/scene/Massif'

/** Une carte RGB « deux canaux » à partir de hauteurs 16 bits. */
function encoder(valeurs: number[], largeur: number): Uint8ClampedArray {
  const o = new Uint8ClampedArray(valeurs.length * 4)
  valeurs.forEach((v, i) => {
    o[i * 4] = (v >> 8) & 0xff
    o[i * 4 + 1] = v & 0xff
    o[i * 4 + 3] = 255
  })
  void largeur
  return o
}

function carte(largeur: number, hauteur: number, f: (x: number, y: number) => number) {
  const v: number[] = []
  for (let y = 0; y < hauteur; y += 1) for (let x = 0; x < largeur; x += 1) v.push(f(x, y))
  return decoder(encoder(v, largeur), largeur, hauteur)
}

// Le navigateur ramène un PNG 16 bits à 8 bits : la hauteur voyage donc sur
// deux canaux, l'octet fort dans le rouge et le faible dans le vert.
test('la hauteur se recompose depuis les deux canaux', () => {
  const h = decoder(encoder([0, 65535, 0x1234, 300], 4), 4, 1)
  expect(h[0]).toBeCloseTo(0, 6)
  expect(h[1]).toBeCloseTo(1, 6)
  expect(h[2]).toBeCloseTo(0x1234 / 65535, 6)
  expect(h[3]).toBeCloseTo(300 / 65535, 6)
})

// Blender normalise sur 65535, pas sur le maximum rencontré : une carte qui
// ne monte qu'à mi-échelle donne un massif deux fois plus bas, pas le même.
test('une carte à mi-échelle donne un relief de moitié', () => {
  const h = decoder(encoder([32768], 1), 1, 1)
  expect(h[0]).toBeCloseTo(0.5, 4)
})

// Le tour complet : aucun bord du terrain ne doit se voir quand on tourne
// autour, donc la carte retombe à zéro sur ses quatre côtés.
test('les quatre bords retombent à zéro', () => {
  const n = 64
  const plat = carte(n, n, () => 65535)
  const f = fondusDuTour(plat, n, n)
  expect(f[0]).toBeCloseTo(0, 6)
  expect(f[n - 1]).toBeCloseTo(0, 6)
  expect(f[(n - 1) * n]).toBeCloseTo(0, 6)
  expect(f[n * n - 1]).toBeCloseTo(0, 6)
})

test('le centre de la carte est intact', () => {
  const n = 64
  const f = fondusDuTour(carte(n, n, () => 65535), n, n)
  expect(f[(n / 2) * n + n / 2]).toBeCloseTo(1, 6)
})

test('le fondu est symétrique, donc le relief ne penche pas', () => {
  const n = 64
  const f = fondusDuTour(carte(n, n, () => 65535), n, n)
  for (let i = 0; i < n; i += 1) {
    expect(f[i * n + 3]).toBeCloseTo(f[i * n + (n - 4)], 6)
    expect(f[3 * n + i]).toBeCloseTo(f[(n - 4) * n + i], 6)
  }
})

// v se mesure depuis le bas du terrain, comme les UV de Blender ; la première
// ligne du PNG est donc le fond de la scène.
test('la première ligne du PNG est le fond du terrain', () => {
  const c = carte(2, 2, (_x, y) => (y === 0 ? 65535 : 0))
  expect(echantillonner(c, 2, 2, 0.5, 1)).toBeCloseTo(1, 6)
  expect(echantillonner(c, 2, 2, 0.5, 0)).toBeCloseTo(0, 6)
})

test('l’échantillonnage interpole entre deux hauteurs', () => {
  const c = carte(2, 1, (x) => (x === 0 ? 0 : 65535))
  expect(echantillonner(c, 2, 1, 0.5, 0)).toBeCloseTo(0.5, 4)
})

test('l’échantillonnage reste borné au-delà des coins', () => {
  const c = carte(4, 4, () => 65535)
  for (const [u, v] of [[-1, -1], [2, 2], [0, 1], [1, 0]]) {
    expect(echantillonner(c, 4, 4, u, v)).toBeCloseTo(1, 6)
  }
})

// La géométrie : une grille de MAILLE subdivisions, de COTE unités de côté,
// déplacée de RELIEF unités — les trois réglages de ton script Blender.
test('la grille a le bon nombre de sommets et la bonne étendue', () => {
  const g = geometrieMassif(carte(8, 8, () => 0), 8, 8)
  const p = g.getAttribute('position')
  expect(p.count).toBe((MAILLE + 1) ** 2)
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity
  for (let i = 0; i < p.count; i += 1) {
    xmin = Math.min(xmin, p.getX(i)); xmax = Math.max(xmax, p.getX(i))
    ymin = Math.min(ymin, p.getY(i)); ymax = Math.max(ymax, p.getY(i))
  }
  expect(xmin).toBeCloseTo(-COTE / 2, 4)
  expect(xmax).toBeCloseTo(COTE / 2, 4)
  expect(ymin).toBeCloseTo(-COTE / 2, 4)
  expect(ymax).toBeCloseTo(COTE / 2, 4)
})

test('le sommet de la carte monte à RELIEF, et le plancher reste à zéro', () => {
  const n = 64
  const g = geometrieMassif(carte(n, n, (x, y) => (x > 20 && x < 44 && y > 20 && y < 44 ? 65535 : 0)), n, n)
  const p = g.getAttribute('position')
  let zmin = Infinity, zmax = -Infinity
  for (let i = 0; i < p.count; i += 1) {
    zmin = Math.min(zmin, p.getZ(i)); zmax = Math.max(zmax, p.getZ(i))
  }
  expect(zmin).toBeCloseTo(0, 6)
  expect(zmax).toBeCloseTo(RELIEF, 2)
})

test('un relief à l’avant de la carte se retrouve devant la caméra', () => {
  const n = 64
  // derniere ligne du PNG = bas de l'image = avant du terrain = y negatif
  const g = geometrieMassif(carte(n, n, (_x, y) => (y > n - 10 ? 65535 : 0)), n, n)
  const p = g.getAttribute('position')
  let somme = 0, poids = 0
  for (let i = 0; i < p.count; i += 1) {
    somme += p.getY(i) * p.getZ(i)
    poids += p.getZ(i)
  }
  expect(somme / poids).toBeLessThan(0)
})

test('les normales sont unitaires et verticales sur un terrain plat', () => {
  const g = geometrieMassif(carte(8, 8, () => 0), 8, 8)
  const n = g.getAttribute('normal')
  for (const i of [0, 500, n.count - 1]) {
    const [x, y, z] = [n.getX(i), n.getY(i), n.getZ(i)]
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 4)
    expect(z).toBeCloseTo(1, 4)
  }
})

test('une pente penche la normale du côté de la descente', () => {
  const n = 64
  const g = geometrieMassif(carte(n, n, (x) => Math.round((x / (n - 1)) * 65535)), n, n)
  const no = g.getAttribute('normal')
  const i = Math.floor(((MAILLE + 1) * MAILLE) / 2 + MAILLE / 2)
  expect(no.getX(i)).toBeLessThan(-0.1)
  expect(Math.hypot(no.getX(i), no.getY(i), no.getZ(i))).toBeCloseTo(1, 4)
})

// Le grain est attaché au massif, mais sa taille se dit en pixels d'écran :
// il doit donc suivre la résolution, sinon il repasse sous le pixel et le
// nuage se met à grouiller.
const tailleGrain = (px: number, grain?: number) =>
  px / (ORTHO / ECHELLE_MASSIF) / grainsParUnite(px, grain)

test('une cellule fait la taille demandée, quelle que soit la résolution', () => {
  for (const px of [1280, 1920, 3840, 5120]) {
    expect(tailleGrain(px)).toBeCloseTo(GRAIN_ECRAN, 6)
  }
})

test('doubler la résolution double le nombre de grains par unité', () => {
  expect(grainsParUnite(3840)).toBeCloseTo(2 * grainsParUnite(1920), 6)
})

// Repère de filiation : à la taille de son rendu, on retrouve exactement la
// densité de grains de massif.py (k = 3840 / 15 / 2 = 128).
test('à la taille du rendu Blender, on retrouve sa densité de grains', () => {
  expect(grainsParUnite(3840, TAILLE_BLENDER)).toBeCloseTo(128, 3)
})

test('le grain retenu est un peu plus gros que celui du rendu Blender', () => {
  expect(GRAIN_ECRAN).toBeGreaterThan(TAILLE_BLENDER)
  expect(GRAIN_ECRAN).toBeLessThan(TAILLE_BLENDER * 2)
})

// L'échelle agit sur l'ouverture de la caméra, et la hauteur est rattrapée
// pour que la base du massif reste à la même ligne de l'image.
test('réduire l’échelle élargit le champ et remonte la caméra', () => {
  const c = cameraMassif(bornesSymetriques(3840, 944, 0.5), 0.5)
  expect(c.right - c.left).toBeCloseTo(ORTHO / 0.5, 6)
  expect(c.position.z).toBeCloseTo(CAMERA.z + CAMERA.compensation, 6)
})

// La compensation 1.71 de ton script est exacte pour le bord avant du
// terrain — c'est là que se pose le pied du massif. Elle dérive un peu pour
// ce qui est plus loin, et c'est voulu.
test('le pied du massif reste à la même ligne quand l’échelle change', () => {
  const sol = new Vector3(0, -COTE / 2, 0)
  const lignes = [1, 0.8, 0.67, 0.5].map((e) => {
    const c = cameraMassif(bornesSymetriques(3840, 944, e), e)
    return Math.round((1 - sol.clone().project(c).y) * 0.5 * 944)
  })
  for (const l of lignes) expect(Math.abs(l - lignes[0])).toBeLessThanOrEqual(2)
})

// Le soleil éclaire depuis la gauche. C'est l'inverse du défaut de
// massif.py, et c'est le réglage qu'on a payé le plus cher à retrouver :
// retourner ce signe suffit à faire tomber la ressemblance de 0.76 à 0.18.
test('le soleil éclaire le massif par la gauche', () => {
  expect(SOLEIL.x).toBeLessThan(0)
  expect(SOLEIL.length()).toBeCloseTo(1, 6)
})

// L'échelle retenue vient d'une mesure : sur ta séquence, le massif occupe
// 2081 px de large sur 3840. Le terrain entier, lui, déborde un peu de ce
// que le fondu laisse voir.
test('à l’échelle retenue, le terrain occupe un peu plus de la moitié du cadre', () => {
  const c = cameraMassif(bornesSymetriques(3840, 944, ECHELLE_MASSIF), ECHELLE_MASSIF)
  const part = COTE / (c.right - c.left)
  expect(part).toBeGreaterThan(2081 / 3840)
  expect(part).toBeLessThan(0.62)
})

// Les ombres sont franches : sous ce seuil d'éclairement, plus aucun point.
test('le seuil d’ombre reste dans la plage utile de l’éclairement', () => {
  expect(OMBRE).toBeGreaterThan(0)
  expect(OMBRE).toBeLessThan(0.95)
  expect(CONTRASTE).toBeGreaterThan(1)
})

// Le sens, vérifié bout en bout : signe de `toursMassif` et convention de
// rotation de Three ensemble. Vu depuis un train qui va vers la droite, la
// face avant du relief doit filer vers la gauche. Le signe seul ne le prouve
// pas — il faut composer avec la rotation réelle.
test('la face avant du massif part vers la gauche quand le train avance', () => {
  const pivot = new Object3D()
  const avant = new Vector3(0, -COTE / 3, 1)
  const x = (legs: number) => {
    pivot.rotation.z = toursMassif(legs) * Math.PI * 2
    pivot.updateMatrixWorld()
    return avant.clone().applyMatrix4(pivot.matrixWorld).x
  }
  expect(x(1)).toBeLessThan(x(0))
  expect(x(2)).toBeLessThan(x(1))
})
