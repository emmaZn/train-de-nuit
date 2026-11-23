import { describe, expect, it } from 'vitest'

import { POSES, RECETTE_POSE, cellulesAllumees, miroir, separer } from '@/scene/poses'
import { TROUS, cellulesClaires } from '@/scene/grain'

const DESSIN = '<path d="M0 0" fill="#0b0b0c" stroke="#e4e4e8" stroke-width="1.5"/>'

describe('separer', () => {
  it('garde les aplats et efface les contours dans la version pleine', () => {
    const { plein } = separer(DESSIN)
    expect(plein).toContain('fill="#0b0b0c"')
    expect(plein).toContain('stroke="none"')
    expect(plein).not.toContain('#e4e4e8')
  })

  it('garde les contours et efface les aplats dans la version trait', () => {
    const { trait } = separer(DESSIN)
    expect(trait).toContain('fill="none"')
    expect(trait).toContain('stroke="#e4e4e8"')
    expect(trait).not.toContain('#0b0b0c')
  })

  it('laisse `fill="none"` tranquille', () => {
    expect(separer('<g fill="none" stroke="#e4e4e8"/>').trait).toContain('fill="none"')
  })

  it('ne touche pas à l’épaisseur du trait : les poids sont dans le dessin', () => {
    expect(separer(DESSIN).trait).toContain('stroke-width="1.5"')
  })
})

describe('cellulesAllumees', () => {
  /** Une image RGBA de `l × h`, opaque sur la seule colonne `x`. */
  function colonne(x: number, l: number, h: number): Uint8ClampedArray {
    const d = new Uint8ClampedArray(l * h * 4)
    for (let y = 0; y < h; y += 1) d[(y * l + x) * 4 + 3] = 255
    return d
  }

  it('allume une cellule qu’un trait traverse, même sans toucher son centre', () => {
    // Cellules de 1,5 px sur 6 px : leurs bords tombent à 0, 2, 3, 5, 6, donc
    // le centre de la troisième est à x = 4. Un trait d'un pixel posé en x = 3
    // la traverse sans jamais passer par ce centre.
    const grille = cellulesAllumees(colonne(3, 6, 6), 6, 6, 1.5)
    for (let l = 0; l < 4; l += 1) {
      expect(grille[l * 4 + 2], `ligne ${l}`).toBe(1)
    }
  })

  it('n’allume rien là où le contour est absent', () => {
    const grille = cellulesAllumees(colonne(3, 6, 6), 6, 6, 1.5)
    for (let l = 0; l < 4; l += 1) {
      expect(grille[l * 4 + 0], `ligne ${l}`).toBe(0)
      expect(grille[l * 4 + 3], `ligne ${l}`).toBe(0)
    }
  })

  it('rend une grille vide pour une image vide', () => {
    const grille = cellulesAllumees(new Uint8ClampedArray(6 * 6 * 4), 6, 6, 1.5)
    expect([...grille].every((c) => c === 0)).toBe(true)
  })
})

describe('miroir', () => {
  it('retourne le SVG dans son propre cadre', () => {
    const retourne = miroir('<svg viewBox="0 0 120 90"><path d="M0 0"/></svg>')
    expect(retourne).toContain('translate(120,0) scale(-1,1)')
    expect(retourne).toContain('</g></svg>')
  })

  it('laisse le dessin intact : seul le repère change', () => {
    expect(miroir('<svg viewBox="0 0 120 90"><path d="M0 0"/></svg>')).toContain('<path d="M0 0"/>')
  })
})

describe('POSES', () => {
  it('nomme les cinq poses, et elles seules', () => {
    expect([...POSES]).toEqual(['perche', 'perche-ebouriffe', 'sonne', 'vol-haut', 'vol-bas'])
  })
})

describe('RECETTE_POSE', () => {
  it('troue le trait comme le train', () => {
    expect(RECETTE_POSE.trous).toBe(TROUS)
  })

  it('laisse le corps vide : « option 2 », le 21 novembre 2026', () => {
    // Quatre recettes de matière ont été comparées dans la scène le 15
    // novembre, et Emmanuelle a choisi « trait seul ». Le 21, elle a revu les
    // trois états côte à côte et gardé le corps vide, avec les seuls trous.
    // Semer de la matière ici reviendrait sur ce choix-là, deux fois.
    expect(RECETTE_POSE.matiere).toEqual({ haut: 0, bas: 0 })
  })

  it('ne pose aucun point dans une masse, quelle que soit la hauteur', () => {
    const colonnes = 40
    const lignes = 40
    const masse = new Uint8Array(colonnes * lignes).fill(1)
    const trait = new Uint8Array(colonnes * lignes)
    const claires = cellulesClaires(trait, masse, colonnes, lignes, RECETTE_POSE)
    expect(claires.some((v) => v === 1)).toBe(false)
  })
})
