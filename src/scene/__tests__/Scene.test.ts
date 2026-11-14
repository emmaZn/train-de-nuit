import { Container } from 'pixi.js'
import { Scene, plansDuDecor, poserCiel, poserMonde } from '@/scene/Scene'
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

test('le ciel se dessine devant le massif, et derrière le voile et le train', () => {
  const decor = new Container()
  const { massif, ciel } = plansDuDecor(decor)
  // Ce que `peupler` ajoute ensuite : le voile du pied, puis le train.
  const voile = new Container()
  const train = new Container()
  decor.addChild(voile, train)

  const rang = (n: Container) => decor.getChildIndex(n)
  expect(rang(massif)).toBeLessThan(rang(ciel))
  expect(rang(ciel)).toBeLessThan(rang(voile))
  expect(rang(voile)).toBeLessThan(rang(train))
})

test('le massif garde sa place quand il arrive après le ciel', () => {
  // Le massif se construit bien plus tard (Three se charge à la demande) :
  // sa place est prise d'avance, sinon il recouvrirait le ciel en arrivant.
  const decor = new Container()
  const { massif, ciel } = plansDuDecor(decor)
  decor.addChild(new Container())
  const relief = new Container()
  massif.addChild(relief)
  expect(decor.getChildIndex(massif)).toBeLessThan(decor.getChildIndex(ciel))
})

test('poserCiel rend au ciel ses pixels d’écran, dans le cadre du décor', () => {
  // Format où ni l'échelle ni le décalage ne sont neutres.
  const { frame } = cadrageScene(1512, 771)
  expect(frame.scale).not.toBeCloseTo(1)
  const monde = new Container()
  poserMonde(monde, frame)
  const decor = new Container()
  monde.addChild(decor)
  const { ciel } = plansDuDecor(decor)
  poserCiel(ciel, frame)

  // Une étoile posée au pixel d'écran (px, py) doit y tomber : c'est là que
  // son test de survol la cherche.
  for (const [px, py] of [[0, 0], [300, 200], [1511, 770]]) {
    const point = ciel.toGlobal({ x: px, y: py })
    expect(point.x).toBeCloseTo(px, 6)
    expect(point.y).toBeCloseTo(py, 6)
  }
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
