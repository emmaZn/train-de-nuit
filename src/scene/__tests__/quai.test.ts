import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CADRES, DEBUT_GARE, FIN_GARE, PIECES, PORTE, HORLOGE, LARGEUR_GARE } from '@/scene/quai'
import { RECUL_HORS_CHAMP, solParEtape } from '@/scene/cables'
import { HORIZON, STAGE, TETE_LOCO } from '@/scene/layout'

describe('la géométrie du quai', () => {
  it('la gare sort du champ avant que la suivante entre', () => {
    const recul = RECUL_HORS_CHAMP * solParEtape(false, false)
    expect(recul).toBeGreaterThan(STAGE.width + LARGEUR_GARE)
  })

  it('toutes les pièces posent leur pied sur ou sous la ligne de rail', () => {
    for (const piece of Object.values(PIECES)) {
      if ('pied' in piece) expect(piece.pied).toBeGreaterThanOrEqual(HORIZON - 1)
    }
  })

  it('le panneau est entièrement dans le cadre à l’arrêt', () => {
    expect(PIECES.panneau.x).toBeGreaterThanOrEqual(0)
    expect(PIECES.panneau.x + PIECES.panneau.largeur).toBeLessThanOrEqual(STAGE.width)
  })

  it('le panneau ne recouvre pas la rame à l’arrêt', () => {
    expect(PIECES.panneau.x).toBeGreaterThan(TETE_LOCO * STAGE.width)
  })

  /**
   * Ce test affirmait « rien ne se cache derrière le nez de la loco ». La
   * propriétaire a levé cette contrainte : la gare peut passer derrière la rame,
   * c'est voulu. On n'affirme donc plus où elle s'arrête, mais ce qui reste
   * vrai : le mur est plus large que le reste, et banc, valise et réverbère se
   * tiennent **devant** lui, tout entiers dans son emprise.
   */
  it('le bâtiment passe derrière le banc, la valise et le réverbère', () => {
    const b = PIECES.batiment
    const gauche = (x: number, largeur: number) => x - largeur / 2
    const embase = CADRES.reverbere.largeur / 2
    expect(PIECES.reverbere.x - embase).toBeGreaterThan(b.x)
    expect(gauche(PIECES.banc.x, PIECES.banc.largeur)).toBeGreaterThan(b.x)
    expect(gauche(PIECES.valise.x, PIECES.valise.largeur)).toBeGreaterThan(b.x)
    expect(PIECES.valise.x + PIECES.valise.largeur / 2).toBeLessThan(b.x + b.largeur)
  })

  it('le bâtiment reste dans le cadre', () => {
    expect(PIECES.batiment.x + PIECES.batiment.largeur).toBeLessThanOrEqual(STAGE.width)
    expect(DEBUT_GARE).toBeGreaterThanOrEqual(0)
  })

  /**
   * Le panneau **commence** sur le mur et **déborde** à droite, jusque vers le
   * bord du cadre : c'est la composition de la maquette. L'ancienne borne — le
   * panneau entièrement dans le mur — disait l'inverse ; elle est remplacée,
   * pas retirée, parce que ce qu'elle garantissait (le panneau est accroché au
   * bâtiment, au-dessus des rails, sous le toit) reste vrai.
   */
  it('le panneau est accroché au mur du bâtiment et déborde à sa droite', () => {
    const p = PIECES.panneau
    const b = PIECES.batiment
    expect(p.x).toBeGreaterThanOrEqual(b.x)
    expect(p.x).toBeLessThan(b.x + b.largeur)
    expect(p.x + p.largeur).toBeGreaterThan(b.x + b.largeur)
    expect(p.y + p.hauteur).toBeLessThan(HORIZON)
    expect(p.y).toBeGreaterThan(b.pied - b.hauteur)
  })

  /**
   * La garantie pour laquelle la correction existe : le panneau avalait la
   * porte cintrée, il n'en restait que trente pixels. Les deux doivent se voir
   * côte à côte.
   */
  it('le panneau ne recouvre pas la porte du bâtiment', () => {
    const p = PIECES.panneau
    expect(PORTE.x1).toBeLessThanOrEqual(p.x)
  })

  /**
   * Réglage 2 : la porte est au milieu du mur, et le pignon aussi. Ce que
   * l'ancien test affirmait — la porte entre la valise et le panneau — encodait
   * son ancienne place et n'est plus vrai : la porte centrée est derrière la
   * valise. On affirme ce qui est vrai : le centre, le pignon dessus, et que le
   * banc, lui, ne la cache pas.
   */
  it('la porte et le pignon sont centrés sur le bâtiment', () => {
    const b = PIECES.batiment
    const milieu = b.x + b.largeur / 2
    expect((PORTE.x0 + PORTE.x1) / 2).toBeCloseTo(milieu, 6)
    expect(HORLOGE.x).toBeCloseTo(milieu, 6)
  })

  it('le banc ne cache pas la porte', () => {
    expect(PIECES.banc.x + PIECES.banc.largeur / 2).toBeLessThanOrEqual(PORTE.x0)
  })

  /** L'emprise ne bouge pas avec les pieds : ils sont sous le panneau, dans sa largeur. */
  it('les pieds du panneau arrivent au rail, dans la largeur du panneau', () => {
    const p = PIECES.panneau
    expect(p.y + p.hauteur).toBeLessThan(HORIZON)
    expect(FIN_GARE).toBe(p.x + p.largeur)
  })

  /**
   * `fabriquerPiece` rasterise un SVG dans une boîte calculée depuis un ratio :
   * une pièce qui n'est plus au ratio de son `viewBox` étire son dessin — la
   * porte cintrée devient un ovale, l'horloge une ellipse. Élargir une pièce
   * sans élargir son dessin ne doit donc pas passer en silence.
   */
  it('chaque pièce garde le cadre de son dessin', () => {
    for (const [nom, cadre] of Object.entries(CADRES)) {
      const svg = readFileSync(`public/assets/ailleurs/${nom}.svg`, 'utf8')
      const vue = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
      expect(vue, `${nom}.svg : viewBox introuvable`).not.toBeNull()
      expect(Number(vue![1]), `${nom}.svg : largeur du viewBox`).toBeCloseTo(cadre.largeur, 3)
      expect(Number(vue![2]), `${nom}.svg : hauteur du viewBox`).toBeCloseTo(cadre.hauteur, 3)
    }
  })

  it('le bâtiment occupe son cadre sans l’étirer', () => {
    expect(PIECES.batiment.hauteur / PIECES.batiment.largeur).toBeCloseTo(
      CADRES.batiment.hauteur / CADRES.batiment.largeur,
      6,
    )
  })

  it('le réverbère occupe son cadre sans l’étirer', () => {
    const largeur = PIECES.reverbere.hauteur / (CADRES.reverbere.hauteur / CADRES.reverbere.largeur)
    expect(largeur).toBeCloseTo(CADRES.reverbere.largeur, 6)
  })

  /** L'emprise sert au test du hors-champ : le panneau déborde, il en fait partie. */
  it('l’emprise de la gare couvre le panneau, qui dépasse le bâtiment', () => {
    expect(FIN_GARE).toBeGreaterThanOrEqual(PIECES.panneau.x + PIECES.panneau.largeur)
    expect(DEBUT_GARE).toBeLessThanOrEqual(PIECES.reverbere.x)
    expect(FIN_GARE - DEBUT_GARE).toBeCloseTo(LARGEUR_GARE, 6)
  })
})
