import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import { RESOLUTION_MAX, tailleDuRendu } from '@/scene/Relief'
import { cadrageScene, fenetreVisible } from '@/scene/layout'

/**
 * **« La texture horrible de la montagne. »**
 *
 * Emmanuelle, le 24 novembre 2026, sur son téléphone — et « ok » sur
 * l'ordinateur. Les deux moitiés de la phrase comptent autant l'une que
 * l'autre : ce fichier tient le téléphone **et** garde l'ordinateur tel quel.
 *
 * Le grain du massif se compte en texels du rendu. Sa taille à l'écran est
 * donc l'inverse de la densité à laquelle on rend : à 3 pixels d'écran par
 * pixel de CSS, le même grain devient deux fois plus fin qu'à 1,5. C'est ce
 * que `RESOLUTION_MAX` arrête.
 */

describe('la densité à laquelle le massif se rend', () => {
  test('un écran ordinaire et un écran Retina ne bougent pas', () => {
    // La condition de tout le reste : elle a jugé le grain sur un Mac à 2.
    for (const resolution of [1, 2]) {
      expect(tailleDuRendu(4000, 0.5, resolution, 8192)).toBe(2000 * resolution)
    }
  })

  test('au-delà de deux, la densité ne suit plus l’écran', () => {
    const a = tailleDuRendu(4000, 0.5, 2, 8192)
    for (const resolution of [2.625, 3, 3.5, 4]) {
      expect(tailleDuRendu(4000, 0.5, resolution, 8192), `dpr ${resolution}`).toBe(a)
    }
  })

  test('le plafond du GPU s’applique encore, et celui de sécurité aussi', () => {
    expect(tailleDuRendu(4000, 2, 2, 4096)).toBe(4096)
    expect(tailleDuRendu(40000, 2, 2, 1e9)).toBe(8192)
  })

  /**
   * Le vrai cas, en nombres. Sur le téléphone d'Emmanuelle, la montagne était
   * rendue à la densité de l'écran : son grain de 1,5 texel y valait 1,5
   * divisé par cette densité, en pixels de CSS. Sur son Mac, qui est à 2, il
   * en vaut 0,75 — et c'est cette montagne-là qu'elle trouve « ok ».
   *
   * Le test dit donc la seule chose qui compte : quelle que soit la densité du
   * téléphone, le grain y fait la même taille apparente que sur son Mac.
   */
  test('sur un téléphone, le grain fait la même taille que sur son Mac', () => {
    const { frame } = cadrageScene(412, 915)
    const cadre = fenetreVisible(frame, 412, 915)
    const GRAIN = 1.5

    /** La cellule de grain, en pixels de CSS, telle qu'on la voit. */
    const grainVu = (dpr: number) => {
      const rendue = tailleDuRendu(cadre.width, frame.scale, dpr, 4096)
      // Un texel du rendu, ramené aux pixels de CSS qu'il occupe à l'écran.
      return (GRAIN * cadre.width * frame.scale) / rendue
    }

    const surSonMac = 0.75
    expect(grainVu(2)).toBeCloseTo(surSonMac, 6)
    for (const dpr of [2.625, 3, 3.5, 4]) {
      expect(grainVu(dpr), `dpr ${dpr}`).toBeCloseTo(surSonMac, 6)
    }
    // Et ce qu'on avait avant, pour mémoire : deux fois plus fin à 3.
    expect((GRAIN * cadre.width * frame.scale) / (cadre.width * frame.scale * 3)).toBeCloseTo(0.5, 6)
  })

  test('même à cette densité, aucun GPU mobile n’est mis en difficulté', () => {
    // Le rendu ne couvre que la fenêtre visible, pas tout le massif : ce qu'on
    // demande sur un téléphone reste très loin des 4096 d'un GPU d'entrée.
    const { frame } = cadrageScene(412, 915)
    const cadre = fenetreVisible(frame, 412, 915)
    expect(tailleDuRendu(cadre.width, frame.scale, 3, 4096)).toBeLessThan(2048)
  })

  test('deux, parce que c’est la densité de l’écran où le grain a été jugé', () => {
    expect(RESOLUTION_MAX).toBe(2)
  })

  test('le massif reste une image, pas une page : rien ne l’agrandit en douce', () => {
    // `appliquer` ne peut pas tourner sans WebGL : on tient le texte qui dit
    // comment la texture est filtrée, faute de pouvoir la regarder.
    expect(readFileSync('src/scene/Relief.ts', 'utf8')).toMatch(/scaleMode:\s*'nearest'/)
  })
})
