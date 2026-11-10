import { Scene } from '@/scene/Scene'

function sceneSansRendu(reducedMotion = false) {
  // Sans init(), la scène n'a pas de contexte WebGL : c'est exactement l'état
  // d'un navigateur qui n'en a pas. Avec reducedMotion, c'est le réglage
  // système « réduire les animations ».
  return new Scene(document.createElement('canvas'), { reducedMotion })
}

test('en mouvement réduit, l’étape arrive tout de suite', async () => {
  const scene = sceneSansRendu(true)
  let arrivees = 0
  scene.on('arrived', () => {
    arrivees += 1
  })
  scene.setVoyage(true, 3)
  await Promise.resolve()
  expect(arrivees).toBe(1)
})

test('sans WebGL, l’étape arrive tout de suite aussi', async () => {
  const scene = sceneSansRendu(false)
  let arrivees = 0
  scene.on('arrived', () => {
    arrivees += 1
  })
  scene.setVoyage(true, 1)
  await Promise.resolve()
  expect(arrivees).toBe(1)
})

test('à quai, rien n’arrive', async () => {
  const scene = sceneSansRendu(true)
  let arrivees = 0
  scene.on('arrived', () => {
    arrivees += 1
  })
  scene.setVoyage(false, 0)
  await Promise.resolve()
  expect(arrivees).toBe(0)
})
