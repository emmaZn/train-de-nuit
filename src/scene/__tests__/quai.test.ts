import { describe, expect, it } from 'vitest'
import { PIECES, LARGEUR_GARE } from '@/scene/quai'
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
    expect(PIECES.batiment.x + PIECES.batiment.largeur).toBeLessThanOrEqual(STAGE.width)
  })

  it('le panneau est posé sur le mur du bâtiment, au-dessus des rails', () => {
    const p = PIECES.panneau
    const b = PIECES.batiment
    expect(p.x).toBeGreaterThanOrEqual(b.x)
    expect(p.x + p.largeur).toBeLessThanOrEqual(b.x + b.largeur)
    expect(p.y + p.hauteur).toBeLessThan(HORIZON)
    expect(p.y).toBeGreaterThan(b.pied - b.hauteur)
  })
})
