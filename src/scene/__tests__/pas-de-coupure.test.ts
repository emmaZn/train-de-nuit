import { describe, expect, test } from 'vitest'

import { poussiereDeLaFenetre } from '@/scene/Sky'
import { cadreTerre } from '@/scene/Terre'
import {
  DEGRADE_HAUTEUR,
  HORIZON,
  MONDE,
  cadrageScene,
  cadreDegrade,
} from '@/scene/layout'

/**
 * **« Je veux pas de coupage. »**
 *
 * Emmanuelle, le 24 novembre 2026, en voyant sur un rendu la voie et la terre
 * s'arrêter net sur une ligne verticale au milieu de l'écran. C'était le prix
 * du recul qu'elle venait de demander : le plateau fait 2320 px de large, et
 * reculer la scène finit par en découvrir les bords.
 *
 * Ce fichier est cette phrase, écrite. Pour une grille de formats, il exige
 * que chaque plan **continu** — ceux qui n'ont pas de fin dans le monde :
 * la voie, la terre, le voile du pied, le ciel — s'étende au-delà de ce que
 * la fenêtre montre. Les objets, eux, ont le droit de finir : le quai, les
 * poteaux, la gare sont des choses posées quelque part, pas des étendues.
 *
 * Il ne teste pas le rendu, il teste la **géométrie** : ce qui est trop petit
 * ici s'arrêtera à l'écran là-bas, sans exception.
 */
const FORMATS = [
  [360, 800],
  [390, 844],
  [412, 915],
  [768, 1024],
  [820, 1180],
  [915, 412],
  [1280, 720],
  [1480, 690],
  [1512, 771],
  [1512, 860],
  [1920, 1080],
  [2560, 1080],
  [3440, 1440],
] as const

/**
 * Ce que la fenêtre montre du monde, en pixels de cadre, **sans aucune borne**.
 *
 * `fenetreVisible` rend la même chose bornée au monde — c'est ce qu'on veut
 * pour dessiner, et c'est précisément ce qu'il ne faut pas pour ce test : une
 * fenêtre bornée tiendrait toujours dans le monde, et ne prouverait rien.
 */
function fenetreCrue(viewportW: number, viewportH: number) {
  const { frame } = cadrageScene(viewportW, viewportH)
  return {
    gauche: -frame.offsetX / frame.scale,
    droite: (viewportW - frame.offsetX) / frame.scale,
    haut: -frame.offsetY / frame.scale,
    bas: (viewportH - frame.offsetY) / frame.scale,
  }
}

describe('aucun plan continu ne s’arrête avant le bord de l’écran', () => {
  test.each(FORMATS)('le monde déborde la fenêtre, à %i × %i', (w, h) => {
    const f = fenetreCrue(w, h)
    expect(MONDE.x).toBeLessThanOrEqual(f.gauche + 1e-6)
    expect(MONDE.x + MONDE.width).toBeGreaterThanOrEqual(f.droite - 1e-6)
    expect(MONDE.y).toBeLessThanOrEqual(f.haut + 1e-6)
  })

  test.each(FORMATS)('la terre déborde la fenêtre, à %i × %i', (w, h) => {
    const f = fenetreCrue(w, h)
    const t = cadreTerre()
    expect(t.x).toBeLessThanOrEqual(f.gauche + 1e-6)
    expect(t.x + t.width).toBeGreaterThanOrEqual(f.droite - 1e-6)
  })

  test.each(FORMATS)('le voile du pied déborde la fenêtre, à %i × %i', (w, h) => {
    const f = fenetreCrue(w, h)
    const v = cadreDegrade(DEGRADE_HAUTEUR)
    expect(v.x).toBeLessThanOrEqual(f.gauche + 1e-6)
    expect(v.x + v.width).toBeGreaterThanOrEqual(f.droite - 1e-6)
  })

  /**
   * La voie est un `TilingSprite` posé par `Train.poserLaVoie` : on ne peut pas
   * l'instancier sans Pixi ni manifeste. On tient donc les deux nombres qu'elle
   * recopie, et le fichier qui les lui donne — c'est la même garantie, prise un
   * cran plus tôt.
   */
  test('la voie est posée sur toute la largeur du monde', async () => {
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync('src/scene/Train.ts', 'utf8'),
    )
    expect(source).toMatch(/width:\s*MONDE\.width/)
    expect(source).toMatch(/this\.rails\.position\.set\(MONDE\.x,\s*HORIZON\)/)
  })

  /**
   * Le ciel, lui, ne se mesure pas par un rectangle : c'est un semis. On lui
   * demande donc ce qu'on verrait — de la poussière dans les quatre coins de
   * ce qui est au-dessus de la voie.
   *
   * C'est ce qui manquait avant ce chantier, et qui ne se voyait pas : les
   * grains étaient tirés sur le plateau seul. Sur un téléphone, le haut de
   * l'écran tombe à plus de mille pixels au-dessus du plateau — tout ce ciel-là
   * était vide, d'un vide qu'on ne remarque qu'en le cherchant.
   */
  test.each(FORMATS)('le ciel a du grain jusque dans ses coins, à %i × %i', (w, h) => {
    const grains = poussiereDeLaFenetre(w, h)
    const { frame } = cadrageScene(w, h)
    // La bande au-dessus de la voie, qui est tout ce que le ciel occupe.
    const sol = Math.min(HORIZON * frame.scale + frame.offsetY, h)
    expect(sol).toBeGreaterThan(0)
    const dans = (x0: number, x1: number, y0: number, y1: number) =>
      grains.some((g) => g.x >= x0 && g.x <= x1 && g.y >= y0 && g.y <= y1)

    const milieuX = w / 2
    const milieuY = sol / 2
    expect(dans(0, milieuX, 0, milieuY), 'coin haut gauche').toBe(true)
    expect(dans(milieuX, w, 0, milieuY), 'coin haut droit').toBe(true)
    expect(dans(0, milieuX, milieuY, sol), 'bas gauche').toBe(true)
    expect(dans(milieuX, w, milieuY, sol), 'bas droit').toBe(true)
  })
})
