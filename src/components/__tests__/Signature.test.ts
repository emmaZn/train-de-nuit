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

/**
 * Emmanuelle, le 24 novembre 2026, devant un iPhone couché : « on peut
 * enlever le nuage noir derrière le texte, et descendre le texte plus bas ».
 *
 * Les deux vont ensemble, et les images l'ont montré : sans la tache mais à
 * `--marge-ecran` du bas, la ligne tombe sur le corps de la loco et disparaît
 * dans son grain. C'est en descendant de 40 à 16 px qu'elle retrouve la bande
 * sombre sous le reflet, où elle se lit sans rien derrière elle.
 *
 * Seulement sur écran court. Partout ailleurs la tache reste : en portrait et
 * sur un écran, la ligne tombe sur le reflet, et c'est elle qui la tient.
 */
test('sur un écran court, la signature descend et sa tache s’en va', () => {
  const garde = source().match(/@media \(max-height: 480px\)[\s\S]*?\n\}\n/)
  expect(garde?.[0], 'la garde écran court existe').toBeTruthy()
  expect(garde?.[0]).toMatch(/bottom:\s*16px/)
  expect(garde?.[0]).toMatch(/\.signature::before\s*\{[^}]*display:\s*none/)
})

test('ailleurs, la tache de nuit est toujours là', () => {
  // La recette elle-même ne bouge pas : ses arrêts sont ceux de la bulle, à la
  // virgule, et un autre test les compare.
  expect(source()).toMatch(/\.signature::before\s*\{/)
  expect(source()).toMatch(/radial-gradient/)
})
