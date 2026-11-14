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

test('la marge ne couvre plus que l’erreur de mesure', () => {
  // Elle absorbait le halo (RAYON_HALO = 9 dans StarLayer) parce qu'une étoile
  // ne devait jamais passer derrière la montagne. Le ciel se dessine désormais
  // devant le massif : plus rien ne peut être derrière, et la marge ne couvre
  // que l'écart GLSL / rendu de référence et l'échantillonnage du tour à 2°.
  // La borne haute est le vrai garde : repasser au-dessus du halo rendrait aux
  // étoiles le dégagement qu'on vient de leur retirer, sans le dire.
  expect(MARGE_CRETE).toBeGreaterThan(0)
  expect(MARGE_CRETE).toBeLessThan(9)
})
