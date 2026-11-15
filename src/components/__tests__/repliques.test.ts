import { describe, expect, it } from 'vitest'

import { ENSUITE, REPLIQUES, duree, suivante, variante } from '@/components/repliques'

describe('REPLIQUES', () => {
  it('porte les quatorze phrases du concept, dans l’ordre', () => {
    expect(REPLIQUES).toHaveLength(14)
    expect(REPLIQUES[0]).toBe('Je suis dev web front.')
    expect(REPLIQUES[5]).toBe('Et j’essaie de rendre ma mère fière.')
    expect(REPLIQUES[13]).toBe('…')
  })

  it('garde les apostrophes typographiques du concept', () => {
    expect(REPLIQUES.some((r) => r.includes("'"))).toBe(false)
  })
})

describe('suivante', () => {
  it('sort les quatorze répliques dans l’ordre', () => {
    for (let i = 0; i < REPLIQUES.length; i += 1) {
      expect(suivante(i, () => 0)).toBe(REPLIQUES[i])
    }
  })

  it('puise ensuite au hasard dans les quatre brèves', () => {
    for (const v of [0, 0.3, 0.6, 0.99]) {
      expect(ENSUITE).toContain(suivante(14, () => v))
    }
    expect(ENSUITE).toContain(suivante(900, () => 0.5))
  })
})

describe('variante', () => {
  it('fait pirouetter sur « Et je danse. » et sur elle seule', () => {
    expect(variante('Et je danse.')).toEqual({ pirouette: true, regard: false })
    expect(variante('Aïe.')).toEqual({ pirouette: false, regard: false })
  })

  it('fait fixer sur « … »', () => {
    expect(variante('…')).toEqual({ pirouette: false, regard: true })
  })

  it('ne demande rien pour une phrase vide : il n’y en a plus à dire dans l’ordre', () => {
    expect(variante('')).toEqual({ pirouette: false, regard: false })
  })
})

describe('duree', () => {
  it('tient 2,8 s, et 3,6 s au-delà de 24 caractères', () => {
    expect(duree('Aïe.')).toBe(2800)
    expect(duree('Vous feriez mieux d’aller laisser une phrase, là-haut.')).toBe(3600)
  })
})
