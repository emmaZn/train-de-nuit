import { describe, expect, it } from 'vitest'

import { HORIZON, MONDE, STAGE, ECHELLE_TRAIN } from '@/scene/layout'
import {
  DEBUT,
  DECROISSANCE,
  DENSITE,
  GRAIN_ECRAN,
  PROFONDEUR,
  cadreTerre,
  paquets,
  pasDeDefilement,
  semer,
} from '@/scene/Terre'

describe('paquets', () => {
  it('se referme sur lui-même : la couture du pavage ne se voit pas', () => {
    const v = paquets(2000)
    // Les périodes sont entières : la dernière colonne doit enchaîner sur la
    // première comme sur n'importe quelle autre voisine. Un motif non
    // périodique ferait ici un saut bien plus grand que les écarts courants.
    const ecarts = Array.from({ length: v.length - 1 }, (_, i) => Math.abs(v[i + 1] - v[i]))
    const couture = Math.abs(v[0] - v[v.length - 1])
    expect(couture).toBeLessThan(Math.max(...ecarts) * 1.5)
  })

  it('ne laisse jamais une portion de voie tout à fait nue', () => {
    const v = paquets(2000)
    expect(Math.min(...v)).toBeGreaterThanOrEqual(0.15)
  })

  it('fait des paquets : la densité varie le long de la voie', () => {
    const v = paquets(2000)
    expect(Math.max(...v) - Math.min(...v)).toBeGreaterThan(0.3)
  })

  it('est déterministe : la même terre d’une visite à l’autre', () => {
    expect([...paquets(200)]).toEqual([...paquets(200)])
  })

  it('tient une largeur nulle sans broncher', () => {
    expect(paquets(0)).toHaveLength(0)
  })
})

describe('semer', () => {
  const colonnes = 400
  const lignes = 30

  it('n’allume que des cellules pleines : blanc ou absent, jamais entre les deux', () => {
    const grille = semer(colonnes, lignes, GRAIN_ECRAN, 1)
    expect(grille.every((v) => v === 0 || v === 1)).toBe(true)
  })

  it('s’éteint vers le bas', () => {
    const grille = semer(colonnes, lignes, GRAIN_ECRAN, 1)
    const parLigne = Array.from({ length: lignes }, (_, l) =>
      grille.slice(l * colonnes, (l + 1) * colonnes).reduce((a: number, b) => a + b, 0),
    )
    expect(parLigne[0]).toBeGreaterThan(parLigne[lignes - 1] * 3)
  })

  it('part de la densité annoncée au ras du rail', () => {
    const grille = semer(colonnes, lignes, GRAIN_ECRAN, 1)
    const premiere = grille.slice(0, colonnes).reduce((a: number, b) => a + b, 0) / colonnes
    const amas = paquets(colonnes)
    const attendu = (DENSITE * amas.reduce((a, b) => a + b, 0)) / colonnes
    // La première ligne est déjà à `pas` du bord, d'où la décroissance.
    expect(premiere).toBeGreaterThan(attendu * 0.6)
    expect(premiere).toBeLessThan(attendu * 1.4)
  })

  it('garde la même taille de grain quand l’écran est plus dense', () => {
    // À `parCadre` doublé, la décroissance se mesure sur deux fois plus de
    // texels : la terre descend aussi bas en pixels de cadre, pas en texels.
    const simple = semer(colonnes, lignes, GRAIN_ECRAN, 1)
    const dense = semer(colonnes, lignes, GRAIN_ECRAN, 2)
    const somme = (g: Uint8Array) => g.reduce((a: number, b) => a + b, 0)
    expect(somme(dense)).toBeGreaterThan(somme(simple))
  })

  it('est déterministe', () => {
    expect([...semer(50, 10, GRAIN_ECRAN, 1)]).toEqual([...semer(50, 10, GRAIN_ECRAN, 1)])
  })

  it('tient une grille vide', () => {
    expect(semer(0, 0, GRAIN_ECRAN, 1)).toHaveLength(0)
  })
})

describe('cadreTerre', () => {
  it('prend toute la largeur du monde, sous le champignon du rail', () => {
    // Du plateau seul, elle s'arrêtait net là où la voie s'arrêtait — ce qui
    // ne se voyait pas tant que la scène débordait l'écran, et se voit depuis
    // qu'elle recule.
    const c = cadreTerre()
    expect(c).toEqual({ x: MONDE.x, y: HORIZON + DEBUT, width: MONDE.width, height: PROFONDEUR })
    expect(c.width).toBeGreaterThan(STAGE.width)
  })

  it('commence sous la ligne de rail et non dessus : les traverses restent nettes', () => {
    expect(cadreTerre().y).toBeGreaterThan(HORIZON)
  })

  it('reste au-dessus du bas du cadre', () => {
    expect(cadreTerre().y + cadreTerre().height).toBeLessThan(STAGE.height)
  })
})

describe('pasDeDefilement', () => {
  it('va exactement à la vitesse de la voie : elle est à la même distance', () => {
    // La voie, dans Train.update : dt * DEFILEMENT * ECHELLE_TRAIN * vitesse.
    expect(pasDeDefilement(1, 1)).toBeCloseTo(900 * ECHELLE_TRAIN, 10)
  })

  it('s’arrête avec le train', () => {
    expect(pasDeDefilement(1, 0)).toBe(0)
  })

  it('suit la vitesse et non l’horloge', () => {
    expect(pasDeDefilement(1, 0.5)).toBeCloseTo(pasDeDefilement(0.5, 1), 10)
  })
})

describe('les réglages', () => {
  it('garde le grain du massif, en texels du rendu', () => {
    expect(GRAIN_ECRAN).toBe(1.5)
  })

  it('s’éteint bien avant le bas de la bande', () => {
    // Sinon la terre finirait sur une coupure nette au lieu de se perdre.
    expect(PROFONDEUR).toBeGreaterThan(DECROISSANCE * 3)
  })
})
