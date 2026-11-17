import { readFileSync } from 'node:fs'

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

describe('l’ordre des plans du décor', () => {
  const source = readFileSync('src/scene/Scene.ts', 'utf8')

  it('met les câbles derrière la rame et les oiseaux devant', () => {
    // Sinon la chute traverse la silhouette du train et l'oiseau disparaît à
    // mi-course (cadrage §7.14).
    const cables = source.indexOf('planCables')
    // `monterLeTrain(this.plans` : l'appel dans `peupler`, et non la
    // définition de la fonction, qui est déclarée plus haut dans le fichier.
    const train = source.indexOf('monterLeTrain(this.plans')
    const terre = source.indexOf('new Terre(')
    const oiseaux = source.indexOf('planOiseaux')
    expect(cables).toBeGreaterThan(0)
    expect(train).toBeGreaterThan(0)
    expect(oiseaux).toBeGreaterThan(0)
    expect(cables).toBeLessThan(train)
    expect(train).toBeLessThan(terre)
    expect(terre).toBeLessThan(oiseaux)
  })

  it('convertit un clic en pixels CSS vers le cadre avant de le passer', () => {
    expect(source).toContain('versCadre(')
  })
})

describe('sans WebGL', () => {
  /** jsdom n'a pas de contexte WebGL : `init` échoue et la scène reste nue. */
  async function sceneNue() {
    const scene = sceneSansRendu()
    await scene.init()
    return scene
  }

  it('fait quand même parler un oiseau au clavier', async () => {
    // C'est le seul endroit du site où l'on apprend qui est Emmanuelle : sans
    // WebGL, la chute n'a pas lieu, mais la phrase doit sortir. Le contenu est
    // le but, la chute est le plaisir (cadrage §14).
    const scene = await sceneNue()
    scene.setGare('plus-loin')
    let dits = 0
    scene.on('birdFell', () => {
      dits += 1
    })
    expect(scene.faireTomberUnOiseau()).toBe(true)
    expect(dits).toBe(1)
    scene.dispose()
  })
})

describe('la porte du gag', () => {
  it('ne laisse tomber un oiseau qu’à quai, et qu’à « plus loin »', async () => {
    const scene = sceneSansRendu()
    await scene.init()
    let dits = 0
    scene.on('birdFell', () => {
      dits += 1
    })

    scene.setGare('la-haut')
    expect(scene.faireTomberUnOiseau()).toBe(false)
    expect(scene.clicPx(600, 400)).toBe(false)

    scene.setGare('plus-loin')
    scene.setVoyage(true, 2)
    expect(scene.faireTomberUnOiseau()).toBe(false)

    scene.setVoyage(false, 0)
    expect(scene.faireTomberUnOiseau()).toBe(true)
    expect(dits).toBe(1)
    scene.dispose()
  })
})
