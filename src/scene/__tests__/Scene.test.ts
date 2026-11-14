import { Container } from 'pixi.js'
import { Scene, poserMonde } from '@/scene/Scene'
import { cadrageScene } from '@/scene/layout'

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

test('poserMonde pose le décalage dans la position du conteneur du décor', () => {
  // Format où le décalage n'est pas nul : 1512x771 -> 11 px.
  const { frame, decalage } = cadrageScene(1512, 771)
  expect(decalage).toBeGreaterThan(0)
  const monde = new Container()
  poserMonde(monde, frame)
  expect(monde.y).toBeCloseTo(frame.offsetY)
  expect(monde.x).toBeCloseTo(frame.offsetX)
  expect(monde.scale.x).toBeCloseTo(frame.scale)
})
