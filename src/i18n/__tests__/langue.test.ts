import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, test, vi } from 'vitest'
import { estLangue, premiere, useLangue } from '@/i18n/langue'

const CLE = 'train-de-nuit:langue'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
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
