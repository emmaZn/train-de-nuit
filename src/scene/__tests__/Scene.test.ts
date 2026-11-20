import { readFileSync } from 'node:fs'

import gsap from 'gsap'
import { Application, Container } from 'pixi.js'
import { Quai } from '@/scene/QuaiLayer'
import { Rideau } from '@/scene/RideauLayer'
import { Scene, plansDuDecor, poserCiel, poserMonde } from '@/scene/Scene'
import { cadrageScene, HORIZON } from '@/scene/layout'
import { HORLOGE } from '@/scene/quai'
import { RIDEAU, yPoseA } from '@/scene/rideau'
import type { Trace } from '@/scene/types'

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

describe('le rideau, commandé par l’horloge', () => {
  const ECRAN = { width: 1440, height: 900 }
  const CADRE = cadrageScene(ECRAN.width, ECRAN.height).frame

  /** Un point du cadre, tel que le pointeur le donne : en pixels CSS. */
  const enPixelsEcran = (x: number, y: number) => ({
    x: CADRE.offsetX + x * CADRE.scale,
    y: CADRE.offsetY + y * CADRE.scale,
  })

  /** Avance la timeline globale de GSAP sans attendre le temps réel. */
  function avancerGsap(secondes: number): void {
    gsap.globalTimeline.time(gsap.globalTimeline.time() + secondes)
  }

  type Interne = {
    quai: Quai | null
    stars: { hit: (px: number, py: number) => Trace | null } | null
    rideau: Rideau | null
    oiseaux: { cliquer: (x: number, y: number) => boolean } | null
  }

  const vivantes: Scene[] = []
  afterEach(() => {
    for (const s of vivantes.splice(0)) {
      // Les doublures posées par les tests n'ont pas de `destroy`, et le
      // Pixi de pacotille n'a pas de contexte à défaire.
      const interne = s as unknown as Interne & { vivante: boolean }
      interne.stars = null
      interne.oiseaux = null
      interne.vivante = false
      s.dispose()
    }
    vi.restoreAllMocks()
  })

  /**
   * Une scène qui a fait son `init()` pour de bon — le rideau naît là, dans le
   * même ordre que dans le navigateur —, sans carte graphique : Pixi est
   * remplacé par ce que la scène lui demande, et l'horloge de rendu par une
   * fonction qu'on appelle (`image`). Le quai, que `peupler` monte après le
   * manifeste, est posé à la main : l'île est à l'arrêt (distance 0).
   */
  async function sceneDeTest(reducedMotion = false) {
    vi.spyOn(Application.prototype, 'init').mockResolvedValue(undefined as never)
    const scene = new Scene(document.createElement('canvas'), { reducedMotion })
    vivantes.push(scene)
    const app = (scene as unknown as { app: Record<string, unknown> }).app
    Object.defineProperty(app, 'screen', { get: () => ECRAN, configurable: true })
    app.renderer = { on() {}, resolution: 1, background: { color: 0 }, render() {} }
    const images: Array<(t: { deltaMS: number }) => void> = []
    app.ticker = { add: (f: (t: { deltaMS: number }) => void) => images.push(f) }
    const emis: Array<[number, boolean]> = []
    scene.on('rideau', (y, baisse) => emis.push([y, baisse]))
    await scene.init()

    const interne = scene as unknown as Interne
    const plans = (scene as unknown as { plans: ReturnType<typeof plansDuDecor> }).plans
    interne.quai = new Quai(new Container(), plans.lumieres, reducedMotion)
    interne.quai.avancer(0, 0)
    return { scene, interne, emis, image: () => images[0]({ deltaMS: 16 }) }
  }

  const trace = { id: 'a', phrase: 'une phrase', creeLe: 1, x: 0.5, y: 0.5 } as Trace
  const centre = () => enPixelsEcran(HORLOGE.x, HORLOGE.y)

  describe('le clic', () => {
    it('baisse le rideau, un second le relève', async () => {
      const { scene } = await sceneDeTest()
      const { x, y } = centre()
      expect(scene.clicPx(x, y)).toBe(true)
      expect(scene.rideauBaisse).toBe(true)
      expect(scene.clicPx(x, y)).toBe(true)
      expect(scene.rideauBaisse).toBe(false)
    })

    it('à côté de l’horloge, ne prend pas le clic et ne touche à rien', async () => {
      const { scene } = await sceneDeTest()
      const loin = enPixelsEcran(HORLOGE.x, HORIZON - 10)
      expect(scene.clicPx(loin.x, loin.y)).toBe(false)
      expect(scene.rideauBaisse).toBe(false)
    })

    it('cherche l’horloge là où l’île l’a emportée, pas à sa place d’arrêt', async () => {
      const { scene, interne } = await sceneDeTest()
      interne.quai!.avancer(300, 0)
      const ou = enPixelsEcran(HORLOGE.x + 300, HORLOGE.y)
      const arret = centre()
      expect(scene.clicPx(arret.x, arret.y)).toBe(false)
      expect(scene.clicPx(ou.x, ou.y)).toBe(true)
      expect(scene.rideauBaisse).toBe(true)
    })

    it('est pris par l’horloge avant les oiseaux : un clic ne fait qu’une chose', async () => {
      const { scene, interne } = await sceneDeTest()
      const cliquer = vi.fn(() => true)
      interne.oiseaux = { cliquer }
      scene.setGare('plus-loin')
      scene.setVoyage(false, 0)
      expect(scene.gagOuvert).toBe(true)
      const { x, y } = centre()
      expect(scene.clicPx(x, y)).toBe(true)
      expect(scene.rideauBaisse).toBe(true)
      expect(cliquer).not.toHaveBeenCalled()
    })

    it('laisse l’oiseau répondre sous la plaque : il est dessiné devant elle', async () => {
      const { scene, interne } = await sceneDeTest()
      const cliquer = vi.fn(() => true)
      interne.oiseaux = { cliquer }
      scene.setGare('plus-loin')
      scene.setVoyage(false, 0)
      scene.basculerRideau()
      avancerGsap(2)
      const dedans = enPixelsEcran(RIDEAU.x + 40, yPoseA(CADRE) + 40)
      expect(scene.clicPx(dedans.x, dedans.y)).toBe(true)
      expect(cliquer).toHaveBeenCalledTimes(1)
      expect(scene.rideauBaisse).toBe(true)
    })
  })

  describe('ce que la scène émet', () => {
    it('donne la position du rideau dès le cadrage, rangé', async () => {
      const { emis } = await sceneDeTest()
      expect(emis).toHaveLength(1)
      expect(emis[0][1]).toBe(false)
      expect(emis[0][0]).toBeLessThan(0)
    })

    it('émet la position à chaque image où le rideau bouge, jusqu’à sa pose', async () => {
      const { scene, emis, image } = await sceneDeTest()
      emis.length = 0
      scene.basculerRideau()
      for (let i = 0; i < 20; i += 1) {
        avancerGsap(0.1)
        image()
      }
      expect(emis.length).toBeGreaterThan(5)
      expect(emis.at(-1)![0]).toBeCloseTo(yPoseA(CADRE), 1)
      expect(emis.every(([, baisse]) => baisse)).toBe(true)
    })

    it('n’émet rien d’une image à l’autre quand le rideau ne bouge pas', async () => {
      const { scene, emis, image } = await sceneDeTest()
      scene.basculerRideau()
      avancerGsap(3)
      image()
      const avant = emis.length
      image()
      image()
      expect(emis).toHaveLength(avant)
    })

    it('émet aussitôt à chaque changement d’état, avant que la plaque ait bougé', async () => {
      const { scene, emis } = await sceneDeTest()
      emis.length = 0
      scene.basculerRideau()
      expect(emis).toHaveLength(1)
      expect(emis[0][1]).toBe(true)
      scene.basculerRideau()
      expect(emis).toHaveLength(2)
      expect(emis[1][1]).toBe(false)
    })

    it('suit un redimensionnement, sans attendre que le rideau bouge', async () => {
      const { scene, emis } = await sceneDeTest()
      const avant = emis.at(-1)![0]
      ECRAN.height = 600
      try {
        scene.resize()
      } finally {
        ECRAN.height = 900
      }
      expect(emis.length).toBeGreaterThan(1)
      expect(emis.at(-1)![0]).not.toBeCloseTo(avant, 1)
    })

    it('n’émet jamais un y qui ne soit pas un nombre', async () => {
      // La tâche suivante pose le texte du DOM — les liens du site — sur ce
      // qu'on émet. Un rideau jamais cadré rend NaN : il ne doit pas sortir.
      const { scene, interne, emis } = await sceneDeTest()
      interne.rideau = new Rideau(new Container(), false)
      emis.length = 0
      scene.basculerRideau()
      expect(emis).toHaveLength(0)
      interne.rideau.destroy()
    })

    it('n’émet pas de nombre infini non plus', async () => {
      const { scene, interne, emis } = await sceneDeTest()
      vi.spyOn(interne.rideau!, 'y', 'get').mockReturnValue(Number.POSITIVE_INFINITY)
      emis.length = 0
      scene.basculerRideau()
      expect(emis).toHaveLength(0)
    })
  })

  describe('le survol', () => {
    it('rend l’étoile sous le pointeur quand le rideau est rangé', async () => {
      const { scene, interne } = await sceneDeTest()
      interne.stars = { hit: () => trace }
      const vues: Array<Trace | null> = []
      scene.on('starHover', (t) => vues.push(t))
      const dedans = enPixelsEcran(RIDEAU.x + 40, yPoseA(CADRE) + 40)
      scene.setPointerPx(dedans.x, dedans.y)
      expect(vues.at(-1)).toBe(trace)
    })

    /**
     * Le rideau baissé couvre environ 40 % du ciel des visiteurs. Le pointeur ne
     * doit pas le traverser : sans ça, survoler la plaque ouvre la bulle d'une
     * étoile qu'on ne voit pas.
     */
    it('ne traverse pas le rideau baissé, mais passe à côté', async () => {
      const { scene, interne } = await sceneDeTest()
      interne.stars = { hit: () => trace }
      const vues: Array<Trace | null> = []
      scene.on('starHover', (t) => vues.push(t))
      scene.basculerRideau()
      avancerGsap(2)
      const dedans = enPixelsEcran(RIDEAU.x + 40, yPoseA(CADRE) + 40)
      scene.setPointerPx(dedans.x, dedans.y)
      expect(vues.at(-1)).toBeNull()
      const a_cote = enPixelsEcran(RIDEAU.x - 40, yPoseA(CADRE) + 40)
      scene.setPointerPx(a_cote.x, a_cote.y)
      expect(vues.at(-1)).toBe(trace)
    })

    it('éclaire l’horloge sous le pointeur, et seulement elle', async () => {
      const { scene, interne } = await sceneDeTest()
      const { x, y } = centre()
      scene.setPointerPx(x, y)
      expect(interne.quai!.eclat.alpha).toBeGreaterThan(0)
      const loin = enPixelsEcran(HORLOGE.x, HORIZON - 10)
      scene.setPointerPx(loin.x, loin.y)
      expect(interne.quai!.eclat.alpha).toBe(0)
    })

    it('n’éclaire pas l’horloge qu’un rideau baissé recouvre', async () => {
      const { scene, interne } = await sceneDeTest()
      // L'île a défilé : l'horloge passe derrière la plaque, qui est devant elle.
      interne.quai!.avancer(RIDEAU.x + 100 - HORLOGE.x, 0)
      scene.basculerRideau()
      avancerGsap(2)
      const sous = enPixelsEcran(RIDEAU.x + 100, HORLOGE.y)
      scene.setPointerPx(sous.x, sous.y)
      expect(interne.quai!.eclat.alpha).toBe(0)
      expect(scene.clicPx(sous.x, sous.y)).toBe(false)
      expect(scene.rideauBaisse).toBe(true)
    })
  })

  describe('le battement de l’horloge', () => {
    it('bat quand le train s’arrête à « ailleurs », et se tait au premier clic', async () => {
      const { scene } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      expect(scene.horlogeBat).toBe(true)
      const { x, y } = centre()
      scene.clicPx(x, y)
      expect(scene.horlogeBat).toBe(false)
    })

    it('ne bat pas tant que le train roule', async () => {
      const { scene } = await sceneDeTest()
      scene.setVoyage(true, 2)
      scene.setGare('ailleurs')
      expect(scene.horlogeBat).toBe(false)
    })

    it('relève le rideau quand le train repart, où qu’il soit', async () => {
      const { scene } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      scene.basculerRideau()
      expect(scene.rideauBaisse).toBe(true)
      scene.setVoyage(true, 1)
      expect(scene.rideauBaisse).toBe(false)
    })

    it('ne relève pas un rideau qu’on n’a pas baissé, et ne l’émet pas', async () => {
      const { scene, emis } = await sceneDeTest()
      scene.setVoyage(true, 1)
      emis.length = 0
      scene.setVoyage(true, 1)
      expect(emis).toHaveLength(0)
    })

    it('s’interrompt quand le train repart', async () => {
      const { scene } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      expect(scene.horlogeBat).toBe(true)
      scene.setVoyage(true, 1)
      expect(scene.horlogeBat).toBe(false)
    })

    it('ne bat pas à une gare où l’horloge n’est pas à l’écran', async () => {
      const { scene } = await sceneDeTest()
      scene.setGare('plus-loin')
      scene.setVoyage(false, 0)
      expect(scene.horlogeBat).toBe(false)
    })

    it('bat quel que soit l’ordre où le magasin annonce la gare et l’arrêt', async () => {
      const a = await sceneDeTest()
      a.scene.setVoyage(false, 0)
      a.scene.setGare('ailleurs')
      expect(a.scene.horlogeBat).toBe(true)

      const b = await sceneDeTest()
      b.scene.setGare('ailleurs')
      b.scene.setVoyage(false, 0)
      expect(b.scene.horlogeBat).toBe(true)
    })

    it('ne redémarre pas quand le magasin répète le même état', async () => {
      const { scene } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      avancerGsap(10)
      expect(scene.horlogeBat).toBe(false)
      scene.setVoyage(false, 0)
      scene.setGare('ailleurs')
      expect(scene.horlogeBat).toBe(false)
    })

    it('reprend à l’arrêt suivant tant que personne n’a trouvé l’horloge', async () => {
      const { scene } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      avancerGsap(10)
      scene.setVoyage(true, 1)
      scene.setVoyage(false, 0)
      expect(scene.horlogeBat).toBe(true)
    })

    it('ne reprend plus jamais une fois l’horloge trouvée', async () => {
      const { scene } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      const { x, y } = centre()
      scene.clicPx(x, y)
      scene.setVoyage(true, 1)
      scene.setVoyage(false, 0)
      expect(scene.horlogeBat).toBe(false)
    })

    it('se tait aussi quand le visiteur prend le bouton du DOM', async () => {
      // Le même geste, par un autre chemin : il a trouvé le rideau.
      const { scene } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      scene.basculerRideau()
      expect(scene.horlogeBat).toBe(false)
      scene.setVoyage(true, 1)
      scene.setVoyage(false, 0)
      expect(scene.horlogeBat).toBe(false)
    })

    it('ne bat pas sous prefers-reduced-motion', async () => {
      const { scene } = await sceneDeTest(true)
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      expect(scene.horlogeBat).toBe(false)
    })
  })

  it('sans WebGL, le rideau est absent et les gestes sont inoffensifs', () => {
    const scene = sceneSansRendu()
    expect(scene.rideauBaisse).toBe(false)
    expect(scene.horlogeBat).toBe(false)
    expect(() => scene.basculerRideau()).not.toThrow()
    expect(scene.rideauBaisse).toBe(false)
  })
})
