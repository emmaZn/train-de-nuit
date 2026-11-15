import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CADRES, DEBUT_GARE, FIN_GARE, PIECES, PORTE, LARGEUR_GARE } from '@/scene/quai'
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

  it('aucune pièce n’est cachée derrière la rame à l’arrêt', () => {
    const nez = TETE_LOCO * STAGE.width
    expect(PIECES.reverbere.x).toBeGreaterThan(nez)
    expect(PIECES.banc.x - PIECES.banc.largeur / 2).toBeGreaterThan(nez)
    expect(PIECES.valise.x - PIECES.valise.largeur / 2).toBeGreaterThan(nez)
    expect(PIECES.batiment.x).toBeGreaterThan(nez)
    expect(PIECES.batiment.x + PIECES.batiment.largeur).toBeLessThanOrEqual(STAGE.width)
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

  it('la porte est dans la partie gauche du bâtiment', () => {
    const b = PIECES.batiment
    expect(PORTE.x0).toBeGreaterThan(b.x)
    expect(PORTE.x1).toBeLessThan(b.x + b.largeur / 2)
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
