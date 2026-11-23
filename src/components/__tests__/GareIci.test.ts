import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

/**
 * La composition de « ici », lue dans la source du SFC : Vitest ne charge pas
 * le CSS scopé d'un composant. Ça ne dit rien du rendu — l'épreuve est à
 * l'œil, dans la scène en mouvement — mais ça épingle ce qu'Emmanuelle a
 * tranché le 23 novembre 2026 : la signature en bas au centre, et la phrase
 * mise en avant.
 */
function source(): string {
  return readFileSync('src/components/gares/GareIci.vue', 'utf8')
}

function regle(src: string, selecteur: string): string {
  return new RegExp(`${selecteur}\\s*\\{([^}]*)\\}`).exec(src)?.[1] ?? ''
}

test('la plaque reste à gauche, sur la marge du site', () => {
  // Emmanuelle, le 24/11 : « sur "ici" laisse le texte à gauche stp », puis
  // « ok nice pour ici » devant la plaque. Le nom, lui, est le pied de page.
  const m = regle(source(), '\\.mot')
  expect(m).toMatch(/left:\s*var\(--marge-ecran\)/)
  expect(m).not.toMatch(/translateX/)
  expect(source()).not.toMatch(/Emmanuelle Zenou/)
})

test('la phrase et la mention sont en mono', () => {
  // Sa décision du 24 : « on utilise la font mono partout ». Une plaque est un
  // objet de la gare, pas une parole de voyageur.
  const src = source()
  expect(regle(src, '\\.phrase')).toMatch(/font-family:\s*var\(--police-mono\)/)
  expect(regle(src, '\\.mention')).toMatch(/font-family:\s*var\(--police-mono\)/)
})

test('la tache de nuit est partie : c’est la plaque qui rend lisible', () => {
  // Le dégradé du 23 novembre n'a plus lieu d'être — le fond opaque de la
  // plaque éteint le massif, et sans laisser d'arête sur le grain.
  expect(source()).not.toMatch(/radial-gradient/)
  expect(source()).toMatch(/PlaqueGrainee/)
})

test('la mention ouvre la gare, sans prendre la voix', () => {
  // « Bienvenue » est parti avec la plaque : c'est la mention qui ouvre
  // maintenant, et elle reste sous la phrase en corps comme en intensité.
  const m = regle(source(), '\\.mention')
  const phrase = regle(source(), '\\.phrase')
  const taille = (r: string): number => Number(/font-size:\s*([\d.]+)px/.exec(r)?.[1] ?? 0)
  expect(taille(m)).toBeLessThan(taille(phrase))
  expect(m).toMatch(/opacity:\s*var\(--faible\)/)
})

test('la phrase passe devant le pied de page', () => {
  // « Pas d'égotrip : le site parle très peu d'Emmanuelle. Le cœur, ce sont
  // les voyageurs » (CONCEPT §2). La hiérarchie le dit : la phrase de « ici »
  // est plus grande et plus intense que le nom, qui est partout mais petit.
  const taille = (r: string): number => Number(/font-size:\s*([\d.]+)px/.exec(r)?.[1] ?? 0)
  const phrase = regle(source(), '\\.phrase')
  const pied = regle(readFileSync('src/components/Signature.vue', 'utf8'), '\\.signature p')
  expect(taille(phrase)).toBeGreaterThan(taille(pied))
  expect(phrase).toMatch(/opacity:\s*var\(--fort\)/)
  expect(pied).toMatch(/opacity:\s*var\(--faible\)/)
})

test('la phrase passe devant le pied de page', () => {
  // « Pas d'égotrip : le site parle très peu d'Emmanuelle. Le cœur, ce sont
  // les voyageurs » (CONCEPT §2). La hiérarchie le dit : la phrase de « ici »
  // est plus grande et plus intense que le nom, qui est partout mais petit.
  const taille = (r: string): number => Number(/font-size:\s*([\d.]+)px/.exec(r)?.[1] ?? 0)
  const phrase = regle(source(), '\\.phrase')
  const pied = regle(readFileSync('src/components/Signature.vue', 'utf8'), '\\.signature p')
  expect(taille(phrase)).toBeGreaterThan(taille(pied))
  expect(phrase).toMatch(/opacity:\s*var\(--fort\)/)
  expect(pied).toMatch(/opacity:\s*var\(--faible\)/)
})

test('le pied de page se lit aussi quand il tombe sur le train', () => {
  // En bas de l'écran il est sur le reflet, et sur une fenêtre courte sur le
  // corps de la loco : même remède et surtout mêmes arrêts que partout ailleurs.
  const arrets = (src: string, sel: string): string[] =>
    [...(new RegExp(`${sel}[^}]*\\}`).exec(src)?.[0] ?? '').matchAll(/(\d+)%\s*,?\s*transparent\)\s*(\d+)%/g)]
      .map((m) => `${m[1]}/${m[2]}`)
  const bulle = arrets(readFileSync('src/components/StarTooltip.vue', 'utf8'), '\\.bulle::before')
  const pied = readFileSync('src/components/Signature.vue', 'utf8')
  expect(arrets(pied, '\\.signature::before')).toEqual(bulle)
  expect(regle(pied, '\\.signature')).toMatch(/isolation:\s*isolate/)
})
