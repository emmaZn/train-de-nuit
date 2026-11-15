import { describe, expect, it } from 'vitest'

import {
  DENSITE,
  GRAIN_ECRAN,
  PORTEE,
  TEINTE_MIN,
  creerMasque,
  densiteA,
  teinteA,
} from '@/scene/reflet'

describe('densiteA', () => {
  it('est la plus forte au ras de la voie', () => {
    expect(densiteA(0)).toBeCloseTo(DENSITE, 10)
  })

  it('s’éteint en descendant', () => {
    let precedent = Infinity
    for (let p = 0; p < 900; p += 25) {
      const d = densiteA(p)
      expect(d).toBeLessThanOrEqual(precedent)
      precedent = d
    }
  })

  it('reste une densité, entre 0 et 1', () => {
    for (let p = -50; p < 1200; p += 37) {
      expect(densiteA(p)).toBeGreaterThanOrEqual(0)
      expect(densiteA(p)).toBeLessThanOrEqual(1)
    }
  })

  it('ne se défait pas hors de l’écran : la portée se compte en pixels du cadre', () => {
    // On ne voit qu'environ 300 px sous la voie, sur les 921 du sprite. Le
    // reflet doit y avoir déjà beaucoup perdu, sinon l'extinction ne se voit
    // jamais — c'est ce qui arrivait quand elle était exprimée en parts.
    expect(densiteA(300)).toBeLessThan(DENSITE * 0.1)
  })

  it('garde une valeur franche contre la voie', () => {
    expect(densiteA(10)).toBeGreaterThan(DENSITE * 0.8)
  })

  it('suit la portée qu’on lui donne', () => {
    expect(densiteA(PORTEE, DENSITE, PORTEE)).toBeCloseTo(DENSITE * Math.exp(-1), 10)
    expect(densiteA(100, DENSITE, 10)).toBeLessThan(densiteA(100, DENSITE, 400))
  })
})

describe('teinteA', () => {
  it('laisse les points blancs contre la voie', () => {
    expect(teinteA(0)).toBeCloseTo(1, 10)
  })

  it('les grise en descendant', () => {
    let precedent = Infinity
    for (let p = 0; p < 600; p += 20) {
      const t = teinteA(p)
      expect(t).toBeLessThanOrEqual(precedent)
      precedent = t
    }
  })

  it('ne les efface jamais tout à fait : c’est la raréfaction qui s’en charge', () => {
    expect(teinteA(5000)).toBeCloseTo(TEINTE_MIN, 6)
    expect(TEINTE_MIN).toBeGreaterThan(0)
  })

  it('reste une opacité', () => {
    for (let p = 0; p < 900; p += 31) {
      expect(teinteA(p)).toBeGreaterThan(0)
      expect(teinteA(p)).toBeLessThanOrEqual(1)
    }
  })

  it('a déjà bien grisé au milieu de la bande visible', () => {
    expect(teinteA(150)).toBeLessThan(0.55)
  })
})

describe('creerMasque', () => {
  it('fait un canevas à la taille demandée', () => {
    const c = creerMasque(640, 320, 3, 1.28)
    expect(c.width).toBe(640)
    expect(c.height).toBe(320)
  })

  it('ne rend jamais un canevas vide, même sur des valeurs absurdes', () => {
    const c = creerMasque(0, -4, 0, 0)
    expect(c.width).toBeGreaterThanOrEqual(2)
    expect(c.height).toBeGreaterThanOrEqual(2)
  })
})

describe('les réglages', () => {
  it('garde le grain du massif', () => {
    expect(GRAIN_ECRAN).toBe(1.5)
  })

  it('laisse passer moins que tout : un reflet reste second', () => {
    expect(DENSITE).toBeGreaterThan(0)
    expect(DENSITE).toBeLessThan(1)
  })

  it('laisse le bas de l’écran revenir à la nuit', () => {
    // Le reflet est visible sur environ trois cents pixels du cadre : au-delà,
    // ses points n'ont plus rien à refléter et ne font que du bruit clair.
    expect(densiteA(300) * teinteA(300)).toBeLessThan(0.04)
  })
})
