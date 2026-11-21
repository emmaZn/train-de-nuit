import { describe, expect, it } from 'vitest'

import { ALPHABET, DECALAGE_CARACTERE, TOUR, dureeEnPas, glypheA } from '@/components/volets'
import { VIVIER, departsReels, formaterHeure } from '@/scene/horaires'

describe('l’alphabet des volets', () => {
  /**
   * Tout ce que le panneau peut afficher doit être sur le tambour, sinon un
   * caractère posé d'emblée romprait le défilé. L'inventaire vient de
   * `horaires.ts`, pas d'une liste recopiée ici : un mot ajouté au vivier doit
   * faire tomber ce test, pas le contourner.
   */
  it('porte chaque caractère que les départs peuvent afficher', () => {
    const textes = [
      ...VIVIER.flatMap((v) => [v.destination, v.statut]),
      ...departsReels(new Date(2026, 10, 20, 21, 3)).flatMap((d) => [d.destination, d.statut, d.heure]),
      // Chaque chiffre y passe : toutes les minutes de la journée, à l'heure près.
      ...Array.from({ length: 24 * 60 }, (_, m) => formaterHeure(new Date(2026, 0, 1, 0, m))),
    ]
    const vus = new Set(textes.join(''))
    // Sans ces témoins, une liste vidée ou un vivier tronqué laisserait tout passer.
    for (const c of ['É', 'À', 'Ê', "'", ':', '0', '9', ' ']) expect(vus.has(c), `témoin ${c}`).toBe(true)
    expect(vus.size).toBeGreaterThan(25)
    const manquants = [...vus].filter((c) => !ALPHABET.includes(c))
    expect(manquants).toEqual([])
  })

  it('suit un ordre fixe : le blanc d’abord, l’alphabet, puis les chiffres dans l’ordre', () => {
    expect(ALPHABET[0]).toBe(' ')
    expect(ALPHABET.join('')).toContain('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    expect(ALPHABET.join('')).toContain('0123456789')
    expect(new Set(ALPHABET).size).toBe(ALPHABET.length)
  })
})

describe('TOUR', () => {
  it('reste plus court que le tambour : les volets d’un tour sont tous distincts', () => {
    expect(TOUR).toBeLessThan(ALPHABET.length)
  })
})

describe('glypheA', () => {
  const suite = (cible: string) => Array.from({ length: TOUR + 1 }, (_, pas) => glypheA(cible, pas))

  it('reste blanc tant que le volet n’est pas parti', () => {
    expect(glypheA('K', -1)).toBe(' ')
    expect(glypheA('É', -30)).toBe(' ')
    expect(glypheA("'", -1)).toBe(' ')
  })

  it('fait défiler l’alphabet dans son ordre et s’arrête sur la cible', () => {
    for (const cible of ['K', 'É', 'Ê', '0', ':', 'A']) {
      const vus = suite(cible)
      expect(vus[TOUR]).toBe(cible)
      // Chaque volet est le suivant du tambour, en boucle : c'est un Solari, pas un tirage.
      for (let i = 0; i < TOUR; i++) {
        const suivant = ALPHABET[(ALPHABET.indexOf(vus[i]) + 1) % ALPHABET.length]
        expect(suivant, `${cible} au pas ${i}`).toBe(vus[i + 1])
      }
      // Dix volets distincts : le tambour est plus long que le tour.
      expect(new Set(vus).size).toBe(TOUR + 1)
    }
  })

  it('reste posé une fois arrivé', () => {
    expect(glypheA('K', TOUR + 5)).toBe('K')
  })

  it('pose d’emblée ce que le tambour n’a pas, sans le déformer', () => {
    for (let pas = 0; pas <= TOUR; pas++) {
      expect(glypheA('Ω', pas)).toBe('Ω')
      expect(glypheA(' ', pas)).toBe(' ')
    }
  })
})

describe('dureeEnPas', () => {
  it('compte le tour du dernier volet, décalé de tous ceux qui le précèdent', () => {
    expect(dureeEnPas(8)).toBe(7 * DECALAGE_CARACTERE + TOUR)
    expect(dureeEnPas(1)).toBe(TOUR)
  })

  it('est nulle sans caractère', () => {
    expect(dureeEnPas(0)).toBe(0)
  })
})
