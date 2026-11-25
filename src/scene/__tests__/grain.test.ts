import { describe, expect, it } from 'vitest'

import {
  CELLULE_CADRE,
  MATIERE,
  TROUS,
  bruit,
  cellule,
  cellulesClaires,
  cuireCellule,
  densite,
  epaissir,
  etendue,
} from '@/scene/grain'

/** Une grille pleine, toutes cellules allumées. */
function pleine(colonnes: number, lignes: number): Uint8Array {
  return new Uint8Array(colonnes * lignes).fill(1)
}

const vide = (colonnes: number, lignes: number) => new Uint8Array(colonnes * lignes)

describe('bruit', () => {
  it('rend toujours la même valeur pour la même cellule', () => {
    expect(bruit(12, 7, 3)).toBe(bruit(12, 7, 3))
  })

  it('reste entre 0 et 1', () => {
    for (let c = 0; c < 40; c += 1) {
      for (let l = 0; l < 40; l += 1) {
        const v = bruit(c, l, 1)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    }
  })

  it('ne répète pas la même valeur d’une cellule à sa voisine', () => {
    expect(bruit(5, 5, 1)).not.toBe(bruit(6, 5, 1))
    expect(bruit(5, 5, 1)).not.toBe(bruit(5, 6, 1))
  })

  it('tire deux suites indépendantes selon le sel', () => {
    expect(bruit(5, 5, 1)).not.toBe(bruit(5, 5, 2))
  })

  it('se répartit à peu près uniformément : une densité demandée est tenue', () => {
    let sous = 0
    for (let c = 0; c < 200; c += 1) {
      for (let l = 0; l < 200; l += 1) if (bruit(c, l, 9) < 0.05) sous += 1
    }
    expect(sous / 40000).toBeGreaterThan(0.04)
    expect(sous / 40000).toBeLessThan(0.06)
  })
})

describe('cellule', () => {
  it('vaut la cellule du train, en pixels de cadre', () => {
    expect(cellule(1)).toBe(CELLULE_CADRE)
    expect(cellule(2)).toBeCloseTo(2.4, 10)
  })

  it('ne descend jamais sous le texel : on peint des pixels', () => {
    expect(cellule(0.3)).toBe(1)
  })

  it('garde le même nombre de cellules quelle que soit la résolution', () => {
    // C'est la propriété qui permet au bruit de tenir d'un cadrage à l'autre :
    // une pièce de 72 px de cadre a le même quadrillage à 1×, 2× et 3×.
    const colonnes = (parCadre: number) => Math.floor((72 * parCadre) / cellule(parCadre))
    expect(colonnes(2)).toBe(colonnes(1))
    expect(colonnes(3)).toBe(colonnes(1))
  })
})

describe('densite', () => {
  it('part du haut et descend vers le bas', () => {
    expect(densite(0)).toBe(MATIERE.haut)
    expect(densite(1)).toBeCloseTo(MATIERE.bas, 10)
    expect(densite(0.5)).toBeCloseTo((MATIERE.haut + MATIERE.bas) / 2, 10)
  })

  it('borne les hauteurs hors de la pièce au lieu d’extrapoler', () => {
    expect(densite(-3)).toBe(MATIERE.haut)
    expect(densite(4)).toBeCloseTo(MATIERE.bas, 10)
  })
})

describe('cuireCellule', () => {
  it('ne rend que du trait, de la masse ou du vide', () => {
    const vus = new Set<string>()
    for (let c = 0; c < 60; c += 1) {
      for (let l = 0; l < 60; l += 1) {
        vus.add(cuireCellule(true, true, 0.5, c, l))
        vus.add(cuireCellule(false, true, 0.5, c, l))
        vus.add(cuireCellule(false, false, 0.5, c, l))
      }
    }
    expect([...vus].every((e) => ['trait', 'masse', 'vide'].includes(e))).toBe(true)
  })

  it('laisse le vide vide', () => {
    expect(cuireCellule(false, false, 0.5, 3, 4)).toBe('vide')
  })

  it('découvre la masse là où le trait saute, et le décor là où il n’y en a pas', () => {
    // La même cellule, avec et sans masse dessous : le trou ne peut pas
    // inventer de la masse, ni en effacer.
    let trouve = false
    for (let c = 0; c < 400 && !trouve; c += 1) {
      if (cuireCellule(true, true, 0.5, c, 0) !== 'masse') continue
      trouve = true
      expect(cuireCellule(true, false, 0.5, c, 0)).toBe('vide')
    }
    expect(trouve, 'aucun trou trouvé sur 400 cellules').toBe(true)
  })

  it('ne sème jamais de matière sous le trait : un trou découvre une masse nue', () => {
    for (let c = 0; c < 200; c += 1) {
      const sousTrait = cuireCellule(true, true, 0, c, 0)
      expect(sousTrait === 'trait' || sousTrait === 'masse').toBe(true)
    }
  })

  it('ne touche pas au trait quand on ferme les trous', () => {
    const sansTrous = { matiere: MATIERE, trous: 0 }
    for (let c = 0; c < 200; c += 1) {
      expect(cuireCellule(true, true, 0.5, c, 0, sansTrous)).toBe('trait')
    }
  })
})

describe('etendue', () => {
  it('relève les lignes où la masse commence et finit', () => {
    const colonnes = 4
    const lignes = 6
    const masse = vide(colonnes, lignes)
    masse[2 * colonnes + 1] = 1
    masse[4 * colonnes + 3] = 1
    expect(etendue(masse, colonnes, lignes)).toEqual({ haut: 2, bas: 4 })
  })

  it('rend une étendue nulle quand il n’y a pas de masse', () => {
    expect(etendue(vide(4, 4), 4, 4)).toEqual({ haut: 0, bas: 0 })
  })
})

describe('cellulesClaires', () => {
  const colonnes = 120
  const lignes = 120

  it('troue le trait dans la proportion demandée', () => {
    const trait = pleine(colonnes, lignes)
    const claires = cellulesClaires(trait, vide(colonnes, lignes), colonnes, lignes)
    const posees = claires.reduce((n, v) => n + v, 0)
    const part = 1 - posees / (colonnes * lignes)
    expect(part).toBeGreaterThan(TROUS * 0.7)
    expect(part).toBeLessThan(TROUS * 1.4)
  })

  it('sème la matière plus dense en haut qu’en bas', () => {
    const masse = pleine(colonnes, lignes)
    const claires = cellulesClaires(vide(colonnes, lignes), masse, colonnes, lignes)
    const bande = (debut: number, fin: number) => {
      let n = 0
      for (let l = debut; l < fin; l += 1) {
        for (let c = 0; c < colonnes; c += 1) n += claires[l * colonnes + c]
      }
      return n / ((fin - debut) * colonnes)
    }
    const haut = bande(0, 12)
    const bas = bande(lignes - 12, lignes)
    expect(haut).toBeGreaterThan(bas * 2)
    expect(haut).toBeGreaterThan(MATIERE.haut * 0.6)
    expect(bas).toBeLessThan(MATIERE.haut)
  })

  it('ne sème rien hors de la masse', () => {
    const masse = vide(colonnes, lignes)
    for (let l = 0; l < 10; l += 1) {
      for (let c = 0; c < colonnes; c += 1) masse[l * colonnes + c] = 1
    }
    const claires = cellulesClaires(vide(colonnes, lignes), masse, colonnes, lignes)
    for (let l = 10; l < lignes; l += 1) {
      for (let c = 0; c < colonnes; c += 1) expect(claires[l * colonnes + c]).toBe(0)
    }
  })

  it('rend deux fois la même matière : une pièce recuite ne bouge pas', () => {
    const t = pleine(colonnes, lignes)
    const m = pleine(colonnes, lignes)
    const une = cellulesClaires(t, m, colonnes, lignes)
    expect([...une]).toEqual([...cellulesClaires(t, m, colonnes, lignes)])
  })

  it('ne rend rien sur une pièce vide', () => {
    const rien = vide(colonnes, lignes)
    const claires = cellulesClaires(rien, rien, colonnes, lignes)
    expect(claires.some((v) => v === 1)).toBe(false)
  })
})

/**
 * Le contour épaissi, demandé le 25 novembre 2026 : « sur les oiseaux il faut
 * aussi renforcer le contour du tracé ». C'est la même constatation que pour
 * le train — un trait d'un pixel de cadre, coupé par une cellule de grain, ne
 * tient plus la silhouette —, et elle vaut dans les deux modes.
 *
 * Le trait grandit **vers l'intérieur** : il ne déborde jamais de la masse,
 * sans quoi l'oiseau grossirait au lieu d'être mieux dessiné.
 */
describe('epaissir', () => {
  /** Une silhouette carrée : contour sur son bord, masse dedans. */
  function carre(cote: number, bord: number) {
    const trait = new Uint8Array(cote * cote)
    const masse = new Uint8Array(cote * cote)
    for (let l = 0; l < cote; l += 1) {
      for (let c = 0; c < cote; c += 1) {
        const i = l * cote + c
        const surLeBord = l < bord || c < bord || l >= cote - bord || c >= cote - bord
        if (surLeBord) trait[i] = 1
        else masse[i] = 1
      }
    }
    return { trait, masse }
  }

  it('laisse le trait tel quel à zéro cellule', () => {
    const { trait, masse } = carre(10, 1)
    expect([...epaissir(trait, masse, 10, 10, 0)]).toEqual([...trait])
  })

  it('épaissit le trait d’une cellule vers l’intérieur', () => {
    const { trait, masse } = carre(10, 1)
    const epais = epaissir(trait, masse, 10, 10, 1)
    // Le bord d'avant, plus le premier anneau de masse.
    expect(epais[1 * 10 + 1]).toBe(1)
    // Et pas le second : on n'épaissit que d'une cellule.
    expect(epais[2 * 10 + 2]).toBe(0)
  })

  it('ne déborde jamais de la silhouette', () => {
    const cote = 10
    const { trait, masse } = carre(cote, 1)
    const epais = epaissir(trait, masse, cote, cote, 3)
    for (let i = 0; i < epais.length; i += 1) {
      if (epais[i] === 1) expect(trait[i] === 1 || masse[i] === 1).toBe(true)
    }
  })

  it('épaissit de deux cellules quand on en demande deux', () => {
    const { trait, masse } = carre(12, 1)
    const epais = epaissir(trait, masse, 12, 12, 2)
    expect(epais[2 * 12 + 2]).toBe(1)
    expect(epais[3 * 12 + 3]).toBe(0)
  })
})

describe('le contour de la recette', () => {
  const colonnes = 40
  const lignes = 40

  function carre() {
    const trait = new Uint8Array(colonnes * lignes)
    const masse = new Uint8Array(colonnes * lignes)
    for (let l = 4; l < 36; l += 1) {
      for (let c = 4; c < 36; c += 1) {
        const i = l * colonnes + c
        if (l === 4 || c === 4 || l === 35 || c === 35) trait[i] = 1
        else masse[i] = 1
      }
    }
    return { trait, masse }
  }

  it('pose plus de cellules claires avec un contour qu’avec aucun', () => {
    const { trait, masse } = carre()
    const sans = cellulesClaires(trait, masse, colonnes, lignes, { matiere: { haut: 0, bas: 0 }, trous: TROUS })
    const avec = cellulesClaires(trait, masse, colonnes, lignes, { matiere: { haut: 0, bas: 0 }, trous: TROUS, contour: 1 })
    const compter = (g: Uint8Array) => g.reduce((n, v) => n + v, 0)
    expect(compter(avec)).toBeGreaterThan(compter(sans))
  })

  it('reste sans effet quand la recette n’en demande pas', () => {
    const { trait, masse } = carre()
    const a = cellulesClaires(trait, masse, colonnes, lignes, { matiere: { haut: 0, bas: 0 }, trous: TROUS })
    const b = cellulesClaires(trait, masse, colonnes, lignes, { matiere: { haut: 0, bas: 0 }, trous: TROUS, contour: 0 })
    expect([...a]).toEqual([...b])
  })
})
