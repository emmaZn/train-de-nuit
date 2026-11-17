import { describe, expect, it } from 'vitest'
import { VIVIER, departsEteints, departsReels, formaterHeure } from '../horaires'

describe('horaires du panneau', () => {
  it('les trois départs réels sont à +4, +11 et +19 minutes', () => {
    const d = departsReels(new Date('2026-11-15T21:03:00'))
    expect(d.map((x) => x.heure)).toEqual(['21:07', '21:14', '21:22'])
  })

  it('les trois départs réels ne changent jamais de destination ni de statut', () => {
    const d = departsReels(new Date())
    expect(d.map((x) => x.destination)).toEqual(['LINKEDIN', 'CV', 'ÉCRIRE'])
    expect(d.map((x) => x.statut)).toEqual(['QUAI 1', 'QUAI 2', 'EMBARQUEMENT'])
    expect(d.map((x) => x.lien)).toEqual(['linkedin', 'cv', 'ecrire'])
  })

  it('franchit minuit sans se casser', () => {
    const d = departsReels(new Date('2026-11-15T23:58:00'))
    expect(d.map((x) => x.heure)).toEqual(['00:02', '00:09', '00:17'])
  })

  it('formate sur deux chiffres', () => {
    expect(formaterHeure(new Date('2026-11-15T07:05:00'))).toBe('07:05')
  })

  it('les lignes éteintes viennent du vivier et ne se répètent pas', () => {
    const d = departsEteints(new Date('2026-11-15T21:03:00'), 7, 3)
    expect(d).toHaveLength(3)
    expect(new Set(d.map((x) => x.destination)).size).toBe(3)
    for (const x of d) expect(VIVIER.some((v) => v.destination === x.destination)).toBe(true)
  })

  it('les lignes éteintes n’ont pas de lien', () => {
    for (const x of departsEteints(new Date('2026-11-15T21:03:00'), 7, 3)) expect(x.lien).toBeUndefined()
  })

  it('les lignes éteintes partent après les trois départs réels', () => {
    const maintenant = new Date('2026-11-15T21:03:00')
    const dernier = departsReels(maintenant).at(-1)!.heure
    for (const x of departsEteints(maintenant, 1, 3)) expect(x.heure > dernier).toBe(true)
  })

  it('les lignes éteintes restent dans l’ordre des heures', () => {
    for (let graine = 0; graine < 50; graine++) {
      const heures = departsEteints(new Date('2026-11-15T10:00:00'), graine, 3).map((x) => x.heure)
      expect([...heures].sort()).toEqual(heures)
    }
  })

  it('la même graine rend le même tirage', () => {
    const m = new Date('2026-11-15T21:03:00')
    expect(departsEteints(m, 42, 3)).toEqual(departsEteints(m, 42, 3))
  })

  it('la graine seule décide des destinations, l’heure seule décide des horaires', () => {
    const a = departsEteints(new Date('2026-11-15T21:03:00'), 42, 3)
    const b = departsEteints(new Date('2026-11-15T21:09:00'), 42, 3)
    expect(b.map((x) => x.destination)).toEqual(a.map((x) => x.destination))
    expect(b.map((x) => x.statut)).toEqual(a.map((x) => x.statut))
    expect(b.map((x) => x.heure)).not.toEqual(a.map((x) => x.heure))
  })

  it('des graines différentes rendent des tirages différents', () => {
    const m = new Date('2026-11-15T21:03:00')
    const tirages = new Set(Array.from({ length: 20 }, (_, g) => departsEteints(m, g, 3).map((x) => x.destination).join('|')))
    expect(tirages.size).toBeGreaterThan(5)
  })

  it('ne demande jamais plus que le vivier', () => {
    expect(departsEteints(new Date(), 1, 99)).toHaveLength(VIVIER.length)
  })

  /**
   * Un `combien` non entier mélangeait ⌈n⌉ cartes et n'en rendait que ⌊n⌋ :
   * un tirage de plus que de lignes, donc une suite différente de celle de
   * `⌊n⌋` à graine égale, pour rien.
   */
  it('arrondit un compte non entier vers le bas, mélange compris', () => {
    const m = new Date('2026-11-15T21:03:00')
    expect(departsEteints(m, 42, 3.7)).toHaveLength(3)
    expect(departsEteints(m, 42, 3.7)).toEqual(departsEteints(m, 42, 3))
    expect(departsEteints(m, 42, -0.5)).toHaveLength(0)
  })

  it('le vivier est celui qu’elle a approuvé, mot pour mot', () => {
    expect(VIVIER.map((v) => `${v.destination} / ${v.statut}`)).toEqual([
      "L'ENFANCE / ANNULÉ", 'NULLE PART / SUPPRIMÉ', "LE PRINTEMPS / À L'HEURE", 'LA LUNE / RETARDÉ',
      'DEMAIN / RETARDÉ', "LA MER / À L'HEURE", 'LE SOMMEIL / QUAI 4', 'AVANT / SANS ARRÊT',
      "LE SILENCE / À L'HEURE", 'LA MAISON / ANNULÉ', 'PLUS TARD / RETARDÉ', 'LE DÉBUT / TERMINUS',
    ])
  })
})
