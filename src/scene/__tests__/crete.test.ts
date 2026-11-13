import { CRETE, CRETE_BIN, MARGE_CRETE } from '@/scene/crete'
import { MOUNTAIN_SOURCE, MOUNTAIN_CONTENU } from '@/scene/layout'

test('la crête couvre le cadre source, paquet par paquet', () => {
  expect(CRETE.length * CRETE_BIN).toBe(MOUNTAIN_SOURCE.width)
})

test('le sommet de la crête est celui que le cadrage déclare', () => {
  // `MOUNTAIN_CONTENU.top` est mesuré sur la même séquence : les deux doivent
  // se rejoindre, sinon l'un des deux a dérivé.
  expect(Math.min(...CRETE)).toBeGreaterThanOrEqual(MOUNTAIN_CONTENU.top - 2)
  expect(Math.min(...CRETE)).toBeLessThanOrEqual(MOUNTAIN_CONTENU.top + 2)
})

test('la marge absorbe le halo de l’étoile', () => {
  // RAYON_HALO = 9 dans StarLayer : « jamais derrière la montagne » vaut pour
  // le halo, pas seulement pour le point.
  expect(MARGE_CRETE).toBeGreaterThanOrEqual(9)
})
