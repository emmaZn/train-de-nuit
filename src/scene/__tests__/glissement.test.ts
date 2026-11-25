import { describe, expect, test } from 'vitest'

import {
  BORD_SYSTEME,
  COURSE_MIN,
  DOMINANCE,
  DUREE_MAX_MS,
  sensDuGlissement,
  surUnElementInteractif,
} from '@/scene/glissement'
import { GARES, garePrecedente, gareSuivante } from '@/scene/types'

/**
 * **« On devrait pouvoir slide pour changer de gare je pense. »**
 *
 * Emmanuelle, le 24 novembre 2026. Le geste lui-même ne se teste pas ici — il
 * faudrait un doigt et un téléphone. Ce qui se teste, c'est la **règle** : ce
 * qui est un glissement et ce qui n'en est pas un. Tout ce que ce fichier
 * refuse est une chose qu'un pouce fait sans le vouloir.
 */
const LARGEUR = 390
const MILIEU = LARGEUR / 2

describe('lire un glissement', () => {
  test('vers la gauche, on va à la gare suivante', () => {
    expect(sensDuGlissement(-120, 0, 200, MILIEU, LARGEUR)).toBe('suivante')
  })

  test('vers la droite, on revient à la précédente', () => {
    expect(sensDuGlissement(120, 0, 200, MILIEU, LARGEUR)).toBe('precedente')
  })

  test('un appui qui ripe n’est pas un glissement', () => {
    for (const dx of [0, 5, -12, COURSE_MIN - 1, -(COURSE_MIN - 1)]) {
      expect(sensDuGlissement(dx, 0, 120, MILIEU, LARGEUR), `${dx}`).toBeNull()
    }
    expect(sensDuGlissement(COURSE_MIN, 0, 120, MILIEU, LARGEUR)).toBe('precedente')
  })

  test('un geste vertical reste vertical', () => {
    // Le CV d'« ailleurs » défile ; un jour, autre chose défilera.
    expect(sensDuGlissement(-100, 200, 300, MILIEU, LARGEUR)).toBeNull()
    expect(sensDuGlissement(-100, 100, 300, MILIEU, LARGEUR)).toBeNull()
    // Juste au-dessus du rapport exigé, l'horizontale l'emporte.
    expect(sensDuGlissement(-100, 100 / DOMINANCE - 1, 300, MILIEU, LARGEUR)).toBe('suivante')
  })

  test('les bords appartiennent au téléphone, pas au site', () => {
    // iOS fait revenir en arrière depuis le bord : le lui disputer donnerait
    // les deux à la fois.
    expect(sensDuGlissement(-120, 0, 200, BORD_SYSTEME, LARGEUR)).toBeNull()
    expect(sensDuGlissement(-120, 0, 200, 2, LARGEUR)).toBeNull()
    expect(sensDuGlissement(120, 0, 200, LARGEUR - BORD_SYSTEME, LARGEUR)).toBeNull()
    expect(sensDuGlissement(-120, 0, 200, BORD_SYSTEME + 1, LARGEUR)).toBe('suivante')
  })

  test('traîner la souris n’est pas un geste', () => {
    expect(sensDuGlissement(-300, 0, DUREE_MAX_MS + 1, MILIEU, LARGEUR)).toBeNull()
    expect(sensDuGlissement(-300, 0, DUREE_MAX_MS, MILIEU, LARGEUR)).toBe('suivante')
  })

  test('ne se laisse pas prendre à des nombres qui n’en sont pas', () => {
    expect(sensDuGlissement(Number.NaN, 0, 200, MILIEU, LARGEUR)).toBeNull()
    expect(sensDuGlissement(-120, Number.NaN, 200, MILIEU, LARGEUR)).toBeNull()
    // Une fenêtre de largeur nulle n'est que deux bords : plus rien au milieu.
    expect(sensDuGlissement(-120, 0, 200, MILIEU, 0)).toBeNull()
  })
})

describe('ce sur quoi on ne glisse pas', () => {
  test('les champs, les boutons et les liens gardent leur geste', () => {
    const page = document.createElement('div')
    page.innerHTML = `
      <input id="phrase" />
      <button id="laisser"><span id="dedans">laisser</span></button>
      <a id="gare" href="/ici">ici</a>
      <div id="ciel"></div>
    `
    for (const id of ['phrase', 'laisser', 'dedans', 'gare']) {
      expect(surUnElementInteractif(page.querySelector(`#${id}`)), id).toBe(true)
    }
    expect(surUnElementInteractif(page.querySelector('#ciel'))).toBe(false)
    expect(surUnElementInteractif(null)).toBe(false)
  })
})

describe('la ligne est circulaire, la marche ne l’est pas', () => {
  test('suivante et précédente se répondent, sur tout le tour', () => {
    for (const g of GARES) {
      expect(garePrecedente(gareSuivante(g))).toBe(g)
      expect(gareSuivante(garePrecedente(g))).toBe(g)
    }
  })

  test('la précédente de la première est la dernière', () => {
    expect(garePrecedente(GARES[0])).toBe(GARES[GARES.length - 1])
  })
})
