import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const RACINE = 'src/scene'

/**
 * Tous les modules qu'un fichier nomme, quelle que soit la forme de l'import :
 * `from '…'`, un `import '…'` seul, un `import('…')` dynamique, un
 * `export … from '…'`.
 *
 * Chercher seulement `from 'vue'` laissait passer les violations les plus
 * naturelles — `from '@/firebase'`, `import 'firebase/app'`, un import
 * différé — et un garde qui n'attrape pas la violation naturelle est pire que
 * pas de garde du tout.
 */
function specificateurs(source: string): string[] {
  const motif = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"]([^'"]+)['"]/g
  return [...source.matchAll(motif)].map((m) => m[1])
}

/** Vue, Pinia, Vue Router — et ce qui les ramène avec soi : un magasin, un composable. */
function estVue(spec: string): boolean {
  return (
    /^(vue|pinia|vue-router)(\/|$)/.test(spec) ||
    /^@vue\//.test(spec) ||
    /(^|\/)(stores|composables)(\/|$)/.test(spec)
  )
}

/**
 * Le paquet `firebase`, ses paquets internes `@firebase/*` — que
 * l'auto-import propose parfois à la place — et le point d'entrée du dépôt
 * sous tous ses chemins.
 */
function estFirebase(spec: string): boolean {
  return /(^|\/)firebase(\/|$)/.test(spec) || /^@firebase\//.test(spec)
}

function fichiersDeLaScene(): string[] {
  const fichiers = readdirSync(RACINE, { recursive: true, encoding: 'utf8' }).filter(
    (f) => f.endsWith('.ts') && !f.includes('__tests__'),
  )
  expect(fichiers.length).toBeGreaterThan(0)
  return fichiers
}

/** Contrainte globale : « la scène ne connaît pas Vue » (CONCEPT.md §8). */
test('aucun fichier de src/scene n’importe vue, pinia ou vue-router', () => {
  for (const fichier of fichiersDeLaScene()) {
    const source = readFileSync(join(RACINE, fichier), 'utf8')
    for (const spec of specificateurs(source)) {
      expect(estVue(spec), `${fichier} importe ${spec}`).toBe(false)
    }
  }
})

/** Les données viennent du store : la scène ne connaît pas le réseau. */
test('src/scene n’importe pas firebase', () => {
  for (const fichier of fichiersDeLaScene()) {
    const source = readFileSync(join(RACINE, fichier), 'utf8')
    for (const spec of specificateurs(source)) {
      expect(estFirebase(spec), `${fichier} importe ${spec}`).toBe(false)
    }
  }
})

/**
 * Le garde se teste lui-même : aucun fichier n'exploite ces trous aujourd'hui,
 * et c'est précisément pourquoi rien ne dirait qu'ils sont là.
 */
test('le garde attrape toutes les formes d’import, et pas seulement `from`', () => {
  const vue = [
    "import { ref } from 'vue'",
    "import 'vue'",
    "const { ref } = await import('vue')",
    "export { createPinia } from 'pinia'",
    "import { useRouter } from 'vue-router'",
    "import { useTraces } from '@/stores/traces'",
    "import '../stores/traces'",
    "import { useScene } from '@/composables/useScene'",
  ]
  for (const ligne of vue) expect(specificateurs(ligne).some(estVue), ligne).toBe(true)

  const firebase = [
    "import { db } from '@/firebase'",
    "import 'firebase/app'",
    "const { db } = await import('@/firebase')",
    "import { getDocs } from 'firebase/firestore'",
    "import { db } from '../../firebase'",
    "import { assertFails } from '@firebase/rules-unit-testing'",
  ]
  for (const ligne of firebase) expect(specificateurs(ligne).some(estFirebase), ligne).toBe(true)

  // Et rien de ce que la scène importe vraiment ne doit tomber dedans.
  const permis = [
    "import { Container } from 'pixi.js'",
    "import gsap from 'gsap'",
    "import * as THREE from 'three'",
    "import { eclat } from './stars'",
    "import type { Trace } from './types'",
    "const { Relief } = await import('./Relief')",
    "// la scène ne connaît ni vue ni firebase",
  ]
  for (const ligne of permis) {
    expect(specificateurs(ligne).some(estVue), ligne).toBe(false)
    expect(specificateurs(ligne).some(estFirebase), ligne).toBe(false)
  }
})
