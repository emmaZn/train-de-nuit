import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import PlaqueGrainee from '@/components/PlaqueGrainee.vue'

function source(): string {
  return readFileSync('src/components/PlaqueGrainee.vue', 'utf8')
}

test('la plaque porte son fond et son cadre, et laisse passer son contenu', () => {
  const w = mount(PlaqueGrainee, { slots: { default: '<p class="dit">une phrase</p>' } })
  expect(w.find('canvas').exists()).toBe(true)
  expect(w.find('.dit').text()).toBe('une phrase')
})

test('le fond suit l’œil, donc il est en CSS et non dans le canevas', () => {
  // L'œil fait défiler les couleurs de nuit : un fond peint dans le canevas
  // retarderait d'une image, ou demanderait de recuire à chaque changement.
  const s = source()
  expect(s).toMatch(/background:\s*var\(--fond\)/)
  expect(s).not.toMatch(/fillRect\(0, 0, w, h\)/)
})

test('le cadre est en cellules de grain, jamais un `border`', () => {
  // Un trait CSS serait la seule chose du site qui ne soit pas du grain (§2).
  const s = source()
  expect(s).toMatch(/CELLULE_CADRE/)
  expect(s).toMatch(/TROUS/)
  expect(s).not.toMatch(/border:\s*1px/)
})

test('le cadre n’a pas de biseau : quatre segments, quatre angles droits', () => {
  // Emmanuelle, le 24/11 : « pas de bizot ». C'est ce qui distingue ces
  // plaques du cartouche du panneau des départs, coupé à 45°.
  const s = source()
  const segments = (s.match(/^\s*segment\(ctx,/gm) ?? []).length
  expect(segments).toBe(4)
})

test('le cadre ne vole le pointeur de rien', () => {
  // Il couvre toute la plaque : sans ça il prendrait les clics du contenu.
  expect(source()).toMatch(/\.cadre\s*\{[^}]*pointer-events:\s*none/)
})

test('les valeurs du grain viennent du projet, elles ne sont pas recopiées', () => {
  const s = source()
  expect(s).toMatch(/from '@\/scene\/grain'/)
  expect(s).not.toMatch(/=\s*0\.02\b/)
  expect(s).not.toMatch(/#EDEDED/)
})
