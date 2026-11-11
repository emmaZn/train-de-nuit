import { createPinia, setActivePinia } from 'pinia'
import { DUREE_ETAPE } from '@/scene/layout'
import { Scene } from '@/scene/Scene'
import { useVoyage } from '@/stores/voyage'

/**
 * Le joint entre la scène et le store, là où un voyage s'enchaîne étape par
 * étape. Pas besoin de WebGL : l'avance d'une étape est de l'arithmétique sur
 * une horloge. On remplace donc l'horloge et on force `vivante`, ce que le
 * navigateur ferait en posant un contexte.
 */
// La vraie constante, pas une copie : une copie se désynchronise en silence.
const DT = 1 / 60

type Interne = { vivante: boolean; tick(dt: number): void; legsParcourues: number }

function monterLeJoint(reducedMotion = false) {
  setActivePinia(createPinia())
  const voyage = useVoyage()
  const scene = new Scene(document.createElement('canvas'), { reducedMotion })
  const interne = scene as unknown as Interne
  interne.vivante = true

  const arrivees: number[] = []
  /** La distance telle que le rendu la lit : dans le tick, avant tout relais. */
  const distances: number[] = []
  let temps = 0

  scene.on('progress', (p) => voyage.setProgression(p))
  scene.on('arrived', () => {
    voyage.finirEtape()
    arrivees.push(temps)
  })
  scene.setVoyage(voyage.enRoute, voyage.etapesRestantes)

  function avancer(secondes: number) {
    for (let i = 0; i < Math.round(secondes / DT); i += 1) {
      temps += DT
      interne.tick(DT)
      distances.push(interne.legsParcourues)
      // Le pont relaie l'état du store après chaque changement.
      scene.setVoyage(voyage.enRoute, voyage.etapesRestantes)
      scene.setLegs(voyage.legs)
    }
  }

  return { voyage, scene, interne, arrivees, distances, avancer }
}

test('un voyage d’une étape arrive après la durée d’une étape', () => {
  const { voyage, arrivees, avancer } = monterLeJoint()
  voyage.partirVers('plus-loin')
  avancer(DUREE_ETAPE + 1)
  expect(arrivees).toHaveLength(1)
  expect(voyage.gare).toBe('plus-loin')
  expect(voyage.enRoute).toBe(false)
})

test('un voyage de trois étapes les fait toutes, chacune à son rythme', () => {
  const { voyage, arrivees, avancer } = monterLeJoint()
  voyage.partirVers('ailleurs')
  avancer(3 * DUREE_ETAPE + 1)
  expect(arrivees).toHaveLength(3)
  expect(voyage.gare).toBe('ailleurs')
  for (let i = 1; i < arrivees.length; i += 1) {
    expect(arrivees[i] - arrivees[i - 1]).toBeGreaterThan(DUREE_ETAPE * 0.9)
  }
})

// C2 : le bouton retour vers la gare qu'on vient de quitter, en plein voyage
test('revenir vers la gare occupée fait le tour complet, sans étape escamotée', () => {
  const { voyage, arrivees, avancer } = monterLeJoint()
  voyage.partirVers('plus-loin')
  avancer(1)
  voyage.partirVers('ici') // le tour complet : quatre étapes
  expect(voyage.etapesRestantes).toBe(4)

  avancer(4 * DUREE_ETAPE + 2)
  expect(voyage.gare).toBe('ici')
  expect(arrivees).toHaveLength(4)
  for (let i = 1; i < arrivees.length; i += 1) {
    expect(arrivees[i] - arrivees[i - 1]).toBeGreaterThan(DUREE_ETAPE * 0.9)
  }
})

// C3 : les montagnes doivent tourner pendant que le train roule
test('la distance poussée aux montagnes avance pendant une étape, pas par sauts', () => {
  const { voyage, interne, avancer } = monterLeJoint()
  voyage.partirVers('ailleurs')
  avancer(1)
  const a = interne.legsParcourues
  avancer(1)
  const b = interne.legsParcourues
  expect(b).toBeGreaterThan(a)
  // en une seconde sur six, on avance d'environ un sixième d'étape
  expect(b - a).toBeLessThan(0.5)
})

test('à quai, la distance poussée aux montagnes ne bouge plus', () => {
  const { interne, avancer } = monterLeJoint()
  const a = interne.legsParcourues
  avancer(2)
  expect(interne.legsParcourues).toBe(a)
})

// Le massif tourne avec la distance parcourue : un bond entre deux images se
// voit comme un saut du relief. C'est ce qu'on observait en arrivant en gare.
test('la distance parcourue n’a aucun à-coup, arrivées comprises', () => {
  const { voyage, distances, avancer } = monterLeJoint()
  voyage.partirVers('ailleurs') // trois étapes depuis « ici »
  avancer(4 * DUREE_ETAPE)

  const pas = DT / DUREE_ETAPE
  let pire = 0
  for (let i = 1; i < distances.length; i += 1) {
    pire = Math.max(pire, Math.abs(distances[i] - distances[i - 1]))
  }
  // Une image d'avance, pas davantage, et jamais en arrière.
  expect(pire).toBeLessThan(pas * 2)
  for (let i = 1; i < distances.length; i += 1) {
    expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1])
  }
})
