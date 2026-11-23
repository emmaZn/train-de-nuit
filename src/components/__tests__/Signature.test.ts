import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { beforeEach, expect, test } from 'vitest'
import Signature from '@/components/Signature.vue'

beforeEach(() => setActivePinia(createPinia()))

function source(): string {
  return readFileSync('src/components/Signature.vue', 'utf8')
}

test('le pied de page porte le nom et le métier, sur une ligne', () => {
  const w = mount(Signature)
  expect(w.text().replace(/\s+/g, ' ')).toBe('Emmanuelle Zenou · Front End Web Developer')
  expect(w.find('footer').exists()).toBe(true)
})

test('il suit la langue du site', () => {
  // Le nom ne se traduit pas ; le métier vient du dictionnaire, et il se trouve
  // qu'il est déjà en anglais — ce qui compte est qu'il passe par lui.
  expect(source()).toMatch(/t\.ici\.titre/)
})

test('il est là tout le temps, et pas seulement sur « ici »', () => {
  // Emmanuelle, le 24/11 : « on pouvait le laisser en footer en petit tout le
  // temps, pas que sur "ici" ». Il vit donc dans App, hors des routes, comme la
  // frise et l'œil — et il reste visible pendant que le train roule.
  const app = readFileSync('src/App.vue', 'utf8')
  expect(app).toMatch(/<Signature \/>/)
  // Hors des routes : après `<RouterView />`, donc jamais remonté ni démonté
  // par un changement de gare.
  expect(app.indexOf('<Signature />')).toBeGreaterThan(app.indexOf('<RouterView />'))
  expect(source()).toMatch(/position:\s*fixed/)
})

test('il ne vole le pointeur de rien', () => {
  // Une bande au centre du bas de l'écran capterait le survol des étoiles et
  // les clics sur les oiseaux qui passent dessous.
  expect(source()).toMatch(/pointer-events:\s*none/)
})

test('il reste le plus petit texte de l’écran', () => {
  const taille = (r: RegExp, src: string): number => Number(r.exec(src)?.[1] ?? 0)
  const pied = taille(/font-size:\s*([\d.]+)px/, /\.signature p\s*\{([^}]*)\}/.exec(source())?.[1] ?? '')
  expect(pied).toBeLessThanOrEqual(12)
})
