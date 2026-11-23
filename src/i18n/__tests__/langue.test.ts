import { readFileSync } from 'node:fs'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, test, vi } from 'vitest'
import { LANGUES, estLangue, poserLangue, premiere, useLangue } from '@/i18n/langue'

const CLE = 'train-de-nuit:langue'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  document.documentElement.removeAttribute('lang')
})

test('le site s’ouvre en français, sans regarder le navigateur', () => {
  // Choix assumé : le concept est écrit en français, et un visiteur
  // francophone dont le navigateur est en anglais ne doit pas voir le site
  // basculer sans l'avoir demandé.
  expect(premiere()).toBe('fr')
})

test('la langue choisie est retenue d’une visite à l’autre', () => {
  const l = useLangue()
  l.choisir('en')
  expect(localStorage.getItem(CLE)).toBe('en')
  expect(premiere()).toBe('en')
})

test('basculer fait l’aller et le retour', () => {
  const l = useLangue()
  l.basculer()
  expect(l.langue).toBe('en')
  l.basculer()
  expect(l.langue).toBe('fr')
})

test('une valeur abîmée dans le stockage ne décide de rien', () => {
  localStorage.setItem(CLE, 'klingon')
  expect(premiere()).toBe('fr')
  expect(estLangue('klingon')).toBe(false)
})

test('un stockage qui refuse ne casse pas le site', () => {
  // Fenêtre privée, cookies bloqués, quota plein : partout ailleurs dans le
  // projet l'échec est silencieux, ici aussi.
  const lecture = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('refusé')
  })
  const ecriture = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('refusé')
  })
  try {
    expect(premiere()).toBe('fr')
    const l = useLangue()
    expect(() => l.choisir('en')).not.toThrow()
    expect(l.langue).toBe('en')
  } finally {
    lecture.mockRestore()
    ecriture.mockRestore()
  }
})

test('le document dit la langue qu’il parle, et en change avec elle', () => {
  // `<html lang>` n'est pas décoratif : il décide de la voix d'un lecteur
  // d'écran, des césures et de ce que comprend un traducteur automatique.
  const l = useLangue()
  poserLangue(l.langue)
  expect(document.documentElement.lang).toBe('fr')

  l.basculer()
  expect(document.documentElement.lang).toBe('en')

  l.basculer()
  expect(document.documentElement.lang).toBe('fr')
})

test('choisir la langue déjà en place ne touche à rien', () => {
  const l = useLangue()
  poserLangue('fr')
  document.documentElement.lang = 'sentinelle'
  l.choisir('fr')
  expect(document.documentElement.lang).toBe('sentinelle')
})

test('index.html s’ouvre dans la langue retenue, avant le bundle', () => {
  // Entre le premier pixel et `main.ts`, c'est le HTML servi qui parle. Le
  // script de tête lit la même clé que le magasin ; les valeurs sont
  // recopiées à la main parce qu'il s'exécute avant tout import.
  const html = readFileSync('index.html', 'utf8')
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  const code = scripts.find((bout) => bout.includes(CLE))
  expect(code, 'aucun script de tête ne lit la langue').toBeTruthy()

  for (const langue of LANGUES) expect(code).toContain(`'${langue}'`)
  // Et l'attribut servi est celui par défaut : ce que voit un visiteur sans
  // stockage, et ce que lit un robot qui n'exécute rien.
  expect(html).toContain(`<html lang="${premiere()}">`)
})
