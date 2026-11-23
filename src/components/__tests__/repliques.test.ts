import { describe, expect, it } from 'vitest'

import { ENSUITE, REPLIQUES, duree, suivante, variante } from '@/components/repliques'
import { LANGUES } from '@/i18n/langue'

describe('REPLIQUES', () => {
  it('porte les quatorze phrases du concept, dans l’ordre', () => {
    expect(REPLIQUES.fr).toHaveLength(14)
    expect(REPLIQUES.fr[0]).toBe('Je suis dev web front.')
    expect(REPLIQUES.fr[5]).toBe('Et j’essaie de rendre ma mère fière.')
    expect(REPLIQUES.fr[13]).toBe('…')
  })

  it('dit les mêmes choses en anglais, dans le même ordre', () => {
    // Le rang porte le sens : `variante` se lit dessus, et une langue plus
    // courte que l'autre décalerait la pirouette et le regard.
    expect(REPLIQUES.en).toHaveLength(REPLIQUES.fr.length)
    expect(ENSUITE.en).toHaveLength(ENSUITE.fr.length)
    expect(REPLIQUES.en[0]).not.toBe(REPLIQUES.fr[0])
    expect(REPLIQUES.en[13]).toBe('…')
  })

  it('garde les apostrophes typographiques du concept', () => {
    for (const l of LANGUES) {
      expect(REPLIQUES[l].some((r) => r.includes("'"))).toBe(false)
    }
  })
})

describe('suivante', () => {
  it('sort les quatorze répliques dans l’ordre, dans les deux langues', () => {
    for (const l of LANGUES) {
      for (let i = 0; i < REPLIQUES[l].length; i += 1) {
        expect(suivante(i, () => 0, l)).toBe(REPLIQUES[l][i])
      }
    }
  })

  it('puise ensuite au hasard dans les quatre brèves', () => {
    for (const v of [0, 0.3, 0.6, 0.99]) {
      expect(ENSUITE.fr).toContain(suivante(14, () => v, 'fr'))
      expect(ENSUITE.en).toContain(suivante(14, () => v, 'en'))
    }
    expect(ENSUITE.fr).toContain(suivante(900, () => 0.5, 'fr'))
  })
})

describe('variante', () => {
  it('fait pirouetter sur la danse, et sur elle seule', () => {
    // Le rang, et non le texte : « Et je danse. » et « And I dance. » doivent
    // jouer la même chose.
    const danse = REPLIQUES.fr.indexOf('Et je danse.')
    expect(variante(danse)).toEqual({ pirouette: true, regard: false })
    expect(variante(REPLIQUES.fr.indexOf('Aïe.'))).toEqual({ pirouette: false, regard: false })
    expect(REPLIQUES.en[danse]).toBe('And I dance.')
  })

  it('fait fixer sur « … »', () => {
    expect(variante(13)).toEqual({ pirouette: false, regard: true })
    expect(REPLIQUES.en[13]).toBe('…')
  })

  it('ne demande rien au-delà de l’ordre : il n’y a plus de variante', () => {
    expect(variante(14)).toEqual({ pirouette: false, regard: false })
    expect(variante(-1)).toEqual({ pirouette: false, regard: false })
  })
})

describe('duree', () => {
  it('tient 2,8 s, et 3,6 s au-delà de 24 caractères', () => {
    expect(duree('Aïe.')).toBe(2800)
    expect(duree('Vous feriez mieux d’aller laisser une phrase, là-haut.')).toBe(3600)
    expect(duree('You’d do better to leave a sentence, up there.')).toBe(3600)
  })
})
