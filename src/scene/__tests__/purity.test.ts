import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** Contrainte globale : « la scène ne connaît pas Vue » (CONCEPT.md §8). */
test('aucun fichier de src/scene n’importe vue, pinia ou vue-router', () => {
  const racine = 'src/scene'
  const fichiers = readdirSync(racine, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts') && !f.includes('__tests__'))
  expect(fichiers.length).toBeGreaterThan(0)
  for (const fichier of fichiers) {
    const source = readFileSync(join(racine, fichier), 'utf8')
    expect(source, `${fichier} importe Vue`).not.toMatch(/from ['"](vue|pinia|vue-router)['"]/)
  }
})
