import { createPinia, setActivePinia } from 'pinia'
import { forwardSteps, gareSuivante, useVoyage } from '@/stores/voyage'

beforeEach(() => {
  setActivePinia(createPinia())
})

// CONCEPT.md §3 : le train ne recule jamais.
test('aller à la gare suivante fait un pas', () => {
  expect(forwardSteps('ici', 'plus-loin')).toBe(1)
})

test('revenir en arrière fait le tour par l’avant', () => {
  expect(forwardSteps('ailleurs', 'plus-loin')).toBe(2)
})

test('la gare précédente immédiate coûte trois pas, jamais moins un', () => {
  expect(forwardSteps('plus-loin', 'ici')).toBe(3)
})

test('rester sur place ne coûte rien', () => {
  expect(forwardSteps('ici', 'ici')).toBe(0)
})

test('la boucle revient à ici après ailleurs', () => {
  expect(gareSuivante('ailleurs')).toBe('ici')
})

test('le voyage commence à quai, à ici', () => {
  const v = useVoyage()
  expect(v.gare).toBe('ici')
  expect(v.enRoute).toBe(false)
  expect(v.legs).toBe(0)
})

// Review Focus #2 : clics répétés dans la frise pendant un trajet
test('un second départ pendant un trajet redirige celui en cours au lieu d’en empiler un', () => {
  const v = useVoyage()
  v.partirVers('la-haut')
  v.setProgression(0.4)
  v.partirVers('ailleurs')
  expect(v.cible).toBe('ailleurs')
  expect(v.enRoute).toBe(true)
  expect(v.progression).toBe(0.4)
})

test('setProgression borne la progression à [0,1]', () => {
  const v = useVoyage()
  v.partirVers('plus-loin')
  v.setProgression(1.8)
  expect(v.progression).toBe(1)
  v.setProgression(-3)
  expect(v.progression).toBe(0)
})

test('finirEtape avance d’une gare et compte l’étape', () => {
  const v = useVoyage()
  v.partirVers('ailleurs')
  v.finirEtape()
  expect(v.gare).toBe('plus-loin')
  expect(v.legs).toBe(1)
  expect(v.progression).toBe(0)
  expect(v.enRoute).toBe(true)
})

test('arriver à la cible termine le voyage', () => {
  const v = useVoyage()
  v.partirVers('plus-loin')
  v.finirEtape()
  expect(v.gare).toBe('plus-loin')
  expect(v.enRoute).toBe(false)
  expect(v.cible).toBe(null)
})

test('poserGare ne lance aucun voyage', () => {
  const v = useVoyage()
  v.poserGare('la-haut')
  expect(v.gare).toBe('la-haut')
  expect(v.enRoute).toBe(false)
  expect(v.cible).toBe(null)
})

test('partir vers la gare où l’on est déjà ne lance rien', () => {
  const v = useVoyage()
  v.partirVers('ici')
  expect(v.enRoute).toBe(false)
})

test('etapesRestantes dit combien d’étapes il reste', () => {
  const v = useVoyage()
  v.partirVers('ailleurs')
  expect(v.etapesRestantes).toBe(3)
  v.finirEtape()
  expect(v.etapesRestantes).toBe(2)
})
