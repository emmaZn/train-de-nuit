import { readFileSync } from 'node:fs'

import gsap from 'gsap'
import { Application, Container } from 'pixi.js'
import { Quai } from '@/scene/QuaiLayer'
import { Scene, plansDuDecor, poserCiel, poserMonde } from '@/scene/Scene'
import { cadrageScene, HORIZON, SEUIL_MOBILE } from '@/scene/layout'
import { HORLOGE, PIECES, cibleReverbere } from '@/scene/quai'
import { Rideau, yPoseA } from '@/scene/rideau'
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
  oiseaux: {
    cliquer: (x: number, y: number) => boolean
    survole: (x: number, y: number) => boolean
  } | null
  neige: { groupe: Container } | null
  ileAilleurs: { ancre: number | null; distance: number | null }
  legsQuai: number
  legsIle: number
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

/** Ce que le rendu du reflet avait sous les yeux : la visibilité des plans qui doivent en sortir. */
type Vu = { ciel: boolean; neige: boolean; neigeDuCone: boolean | null }

/**
 * Une scène qui a fait son `init()` pour de bon — le rideau naît là, dans le
 * même ordre que dans le navigateur —, sans carte graphique : Pixi est
 * remplacé par ce que la scène lui demande, et l'horloge de rendu par une
 * fonction qu'on appelle (`image`). Le quai, que `peupler` monte après le
 * manifeste, est posé à la main : l'île est à l'arrêt (distance 0).
 *
 * `rendus` note, **à l'instant du rendu du reflet**, ce que le renderer voit :
 * c'est le seul endroit d'où l'on peut le savoir, puisque `horsDuReflet` remet
 * tout en place dans son `finally`.
 */
async function sceneDeTest(reducedMotion = false) {
  vi.spyOn(Application.prototype, 'init').mockResolvedValue(undefined as never)
  const scene = new Scene(document.createElement('canvas'), { reducedMotion })
  vivantes.push(scene)
  const app = (scene as unknown as { app: Record<string, unknown> }).app
  Object.defineProperty(app, 'screen', { get: () => ECRAN, configurable: true })
  const rendus: Vu[] = []
  const render = vi.fn(() => {
    rendus.push({
      ciel: plans.ciel.visible,
      neige: plans.neige.visible,
      neigeDuCone: interne.quai ? interne.quai.lumiere.neige.racine.visible : null,
    })
  })
  app.renderer = { on() {}, resolution: 1, background: { color: 0 }, render }
  const images: Array<(t: { deltaMS: number }) => void> = []
  app.ticker = { add: (f: (t: { deltaMS: number }) => void) => images.push(f) }
  const emis: Array<[number, boolean]> = []
  scene.on('rideau', (y, baisse) => emis.push([y, baisse]))
  await scene.init()

  const interne = scene as unknown as Interne
  const plans = (scene as unknown as { plans: ReturnType<typeof plansDuDecor> }).plans
  interne.quai = new Quai(new Container(), plans.lumieres, reducedMotion)
  // Cadré comme la scène le cadre : la cible du réverbère suit l'échelle.
  interne.quai.cadrer(CADRE, 1)
  interne.quai.avancer(0, 0)
  return { scene, interne, emis, render, rendus, image: () => images[0]({ deltaMS: 16 }) }
}

describe('le rideau, commandé par l’horloge', () => {
  const trace = { id: 'a', phrase: 'une phrase', creeLe: 1, x: 0.5, y: 0.5 } as Trace
  const centre = () => enPixelsEcran(HORLOGE.x, HORLOGE.y)

  describe('le clic', () => {
    /**
     * Le décalage signalé le 22 novembre 2026 : « au fil de la navigation,
     * quand on fait plusieurs boucles, les scènes se décalent — la gare n'est
     * plus centrée après deux tours ».
     *
     * La cause est ici. À la dernière étape, `tick` épingle `phase` à 1 pour
     * que la voie ne reparte pas à pleine vitesse — mais la condition qui
     * annonce l'arrivée est justement `phase >= 1`. Elle reste donc vraie à
     * chaque image, et chaque image ajoutait une étape à `legsIle` **et** à
     * `legsQuai`, les deux compteurs qui placent les îles.
     *
     * Dans l'application, le store répond de façon asynchrone — `arrived` puis
     * `finirEtape`, puis un `watch` qui rappelle `setVoyage` : plusieurs images
     * passent avec `enRoute` encore vrai. C'est la fenêtre où les îles
     * dérivaient, un peu à chaque arrivée, visiblement au bout de deux tours.
     * Ce test garde cette fenêtre ouverte exprès.
     */
    it('n’annonce l’arrivée qu’une fois, même si le store tarde à répondre', async () => {
      const { scene, interne, image } = await sceneDeTest()
      let arrivees = 0
      scene.on('arrived', () => {
        arrivees += 1
      })
      scene.setGare('la-haut')
      scene.setVoyage(true, 1)
      for (let f = 0; f < 700; f += 1) image()
      expect(arrivees).toBe(1)

      // Et surtout : les deux compteurs qui placent les îles n'ont avancé que
      // d'une étape. C'est là que le décalage se mesure, à sa source — la
      // position de l'île, elle, dépend de la vitesse du train, que les tests
      // n'ont pas (les images de la rame ne sont pas chargées).
      expect(interne.legsQuai).toBe(1)
      expect(interne.legsIle).toBe(1)
    })

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
      interne.oiseaux = { cliquer, survole: () => false }
      scene.setGare('plus-loin')
      scene.setVoyage(false, 0)
      expect(scene.gagOuvert).toBe(true)
      const { x, y } = centre()
      expect(scene.clicPx(x, y)).toBe(true)
      expect(scene.rideauBaisse).toBe(true)
      expect(cliquer).not.toHaveBeenCalled()
    })

    /**
     * La plaque a quitté le canvas : la scène ne sait plus ce qu'elle couvre, et
     * n'a plus à le savoir — c'est le panneau du DOM, devant tout, qui arrête ce
     * qui tombe sur lui. Un clic qui parvient jusqu'ici est donc un clic tombé
     * **à côté** de la plaque, et depuis le 22 novembre 2026, à la demande de la
     * propriétaire, il la referme.
     *
     * Ce test disait l'inverse jusqu'à cette date — il affirmait que l'oiseau
     * répondait. C'est un renversement de comportement voulu, pas un test
     * affaibli : le tableau est devant les oiseaux, et un clic ne fait qu'une
     * chose.
     */
    it('se referme sur un clic à côté de la plaque, avant les oiseaux', async () => {
      const { scene, interne } = await sceneDeTest()
      const cliquer = vi.fn(() => true)
      interne.oiseaux = { cliquer, survole: () => false }
      scene.setGare('plus-loin')
      scene.setVoyage(false, 0)
      scene.basculerRideau()
      avancerGsap(2)
      const quelquePart = enPixelsEcran(600, yPoseA(CADRE) + 40)
      expect(scene.clicPx(quelquePart.x, quelquePart.y)).toBe(true)
      expect(scene.rideauBaisse).toBe(false)
      expect(cliquer).not.toHaveBeenCalled()
    })

    /** Rangé, il n'y a rien à fermer : l'oiseau retrouve le clic. */
    it('laisse l’oiseau répondre quand la plaque est rangée', async () => {
      const { scene, interne } = await sceneDeTest()
      const cliquer = vi.fn(() => true)
      interne.oiseaux = { cliquer, survole: () => false }
      scene.setGare('plus-loin')
      scene.setVoyage(false, 0)
      const quelquePart = enPixelsEcran(600, yPoseA(CADRE) + 40)
      expect(scene.clicPx(quelquePart.x, quelquePart.y)).toBe(true)
      expect(cliquer).toHaveBeenCalledTimes(1)
    })

    /**
     * Le réverbère garde la main sur la fermeture : la spec §5 veut qu'on puisse
     * l'éteindre tableau baissé, et les deux tiers bas de son mât sont dégagés
     * sous la plaque. S'il passait après, le tableau se refermerait à sa place.
     */
    it('laisse le réverbère répondre avant de se refermer', async () => {
      const { scene } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      scene.basculerRideau()
      avancerGsap(2)
      expect(scene.rideauBaisse).toBe(true)
      const surLeMat = enPixelsEcran(PIECES.reverbere.x, HORIZON - 30)
      expect(scene.clicPx(surLeMat.x, surLeMat.y)).toBe(true)
      expect(scene.reverbereAllume).toBe(false)
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

    /**
     * Le rideau n'a plus de tracé du tout : il n'est qu'un état et une position,
     * et il les tient quelle que soit la fenêtre. Le seuil mobile ne le regarde
     * plus — il n'y a plus qu'un rendu, celui du DOM.
     */
    it('émet sa position quelle que soit la largeur de la fenêtre', async () => {
      const { scene, emis, interne } = await sceneDeTest()
      ECRAN.width = SEUIL_MOBILE - 1
      try {
        scene.resize()
        emis.length = 0
        scene.basculerRideau()
        expect(emis).toHaveLength(1)
        expect(interne.rideau!.baisse).toBe(true)
      } finally {
        ECRAN.width = 1440
      }
    })

    it('n’émet jamais un y qui ne soit pas un nombre', async () => {
      // La tâche suivante pose le texte du DOM — les liens du site — sur ce
      // qu'on émet. Un rideau jamais cadré rend NaN : il ne doit pas sortir.
      const { scene, interne, emis } = await sceneDeTest()
      interne.rideau = new Rideau(false)
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
      const dedans = enPixelsEcran(600, yPoseA(CADRE) + 40)
      scene.setPointerPx(dedans.x, dedans.y)
      expect(vues.at(-1)).toBe(trace)
    })

    /**
     * La garde de couverture est levée, et pas déplacée. Elle était ici — « ce
     * que la plaque couvre ne répond pas » — tant que la plaque était dans le
     * canvas ; la scène ne sait plus où elle est, et le panneau n'arrête que
     * l'**appui**, pas le survol : `setPointer`, la parallaxe du ciel, voyage
     * sur le même `pointermove`, et la figer au survol du panneau se verrait
     * bien davantage qu'une bulle ouverte derrière une plaque opaque.
     */
    it('ne connaît plus de zone couverte : il n’y a plus de plaque dans le canvas', async () => {
      const { scene, interne } = await sceneDeTest()
      interne.stars = { hit: () => trace }
      const vues: Array<Trace | null> = []
      scene.on('starHover', (t) => vues.push(t))
      scene.basculerRideau()
      avancerGsap(2)
      const sousLaPlaque = enPixelsEcran(600, yPoseA(CADRE) + 40)
      scene.setPointerPx(sousLaPlaque.x, sousLaPlaque.y)
      expect(vues.at(-1)).toBe(trace)
    })

    /**
     * Le panneau du DOM arrête l'appui qui tombe sur lui — il est devant tout —,
     * et cet appui n'allait donc plus fermer la bulle d'une étoile, ce que
     * `setPointerPx` faisait pour tout appui qui ne prend rien. La scène offre
     * la phrase courte, que le panneau dit à sa place.
     */
    it('ferme la bulle d’une étoile sur demande, sans en chercher une autre', async () => {
      const { scene, interne } = await sceneDeTest()
      const trace2 = { ...trace, id: 'b' }
      interne.stars = { hit: () => trace2 }
      const vues: Array<Trace | null> = []
      scene.on('starHover', (t) => vues.push(t))
      scene.fermerBulleEtoile(10, 20)
      // `null`, et surtout pas l'étoile que `hit` aurait trouvée sous la plaque.
      expect(vues.at(-1)).toBeNull()
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
      const { scene, emis } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      scene.basculerRideau()
      expect(scene.rideauBaisse).toBe(true)
      emis.length = 0
      scene.setVoyage(true, 1)
      expect(scene.rideauBaisse).toBe(false)
      expect(emis).toHaveLength(1)
      expect(emis[0][1]).toBe(false)
    })

    it('ne relève pas un rideau qu’on n’a pas baissé, et ne l’émet pas', async () => {
      const { scene, emis } = await sceneDeTest()
      // Un vrai front : à quai, puis le départ, rideau haut.
      scene.setVoyage(false, 0)
      emis.length = 0
      scene.setVoyage(true, 1)
      expect(emis).toHaveLength(0)
    })

    it('ne se baisse qu’à l’arrêt : ni par l’horloge, ni par le bouton, quand le train roule', async () => {
      const { scene } = await sceneDeTest()
      scene.setGare('ailleurs')
      scene.setVoyage(false, 0)
      scene.basculerRideau()
      scene.setVoyage(true, 1)
      expect(scene.rideauBaisse).toBe(false)
      // L'île est encore là un moment, avec son horloge.
      const { x, y } = centre()
      scene.clicPx(x, y)
      expect(scene.rideauBaisse).toBe(false)
      scene.basculerRideau()
      expect(scene.rideauBaisse).toBe(false)
      // À l'arrêt suivant, il se baisse de nouveau.
      scene.setVoyage(false, 0)
      scene.basculerRideau()
      expect(scene.rideauBaisse).toBe(true)
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

describe('le réverbère, qu’un clic éteint', () => {
  /** Le milieu du mât, en pixels d'écran : le point que le visiteur vise. */
  const CIBLE = cibleReverbere(CADRE.scale)
  const surLeMat = () => enPixelsEcran(PIECES.reverbere.x, (CIBLE.y0 + CIBLE.y1) / 2)
  const etoile = { id: 'e', phrase: 'une phrase', creeLe: 1, x: 0.5, y: 0.5 } as Trace

  it('un clic l’éteint, un second le rallume, et chaque fois la scène le dit', async () => {
    const { scene } = await sceneDeTest()
    const dits: boolean[] = []
    scene.on('reverbere', (allume) => dits.push(allume))
    const { x, y } = surLeMat()
    expect(scene.reverbereAllume).toBe(true)
    expect(scene.clicPx(x, y)).toBe(true)
    expect(scene.reverbereAllume).toBe(false)
    expect(scene.clicPx(x, y)).toBe(true)
    expect(scene.reverbereAllume).toBe(true)
    expect(dits).toEqual([false, true])
  })

  /**
   * `clicPx` rend `true` : `useScene.surAppui` s'arrête là et n'appelle pas
   * `setPointerPx`. Un clic ne fait qu'une chose — éteindre la lampe n'ouvre
   * pas aussi la bulle d'une étoile.
   */
  it('prend le clic : l’appelant n’ouvrira pas de bulle', async () => {
    const { scene, interne } = await sceneDeTest()
    const hit = vi.fn(() => etoile)
    interne.stars = { hit }
    const { x, y } = surLeMat()
    expect(scene.clicPx(x, y)).toBe(true)
    expect(hit).not.toHaveBeenCalled()
  })

  it('est pris avant les oiseaux', async () => {
    const { scene, interne } = await sceneDeTest()
    const cliquer = vi.fn(() => true)
    interne.oiseaux = { cliquer, survole: () => false }
    scene.setGare('plus-loin')
    scene.setVoyage(false, 0)
    expect(scene.gagOuvert).toBe(true)
    const { x, y } = surLeMat()
    expect(scene.clicPx(x, y)).toBe(true)
    expect(cliquer).not.toHaveBeenCalled()
  })

  it('à côté du mât, ne prend pas le clic et ne touche à rien', async () => {
    const { scene } = await sceneDeTest()
    const loin = enPixelsEcran(CIBLE.x0 - 40, CIBLE.y0 - 40)
    expect(scene.clicPx(loin.x, loin.y)).toBe(false)
    expect(scene.reverbereAllume).toBe(true)
  })

  /** Il se rallume seul une fois la gare sortie — et le DOM doit l'apprendre. */
  it('dit au DOM qu’il s’est rallumé tout seul après le départ', async () => {
    const { scene, interne, image } = await sceneDeTest()
    const { x, y } = surLeMat()
    scene.clicPx(x, y)
    expect(scene.reverbereAllume).toBe(false)
    const dits: boolean[] = []
    scene.on('reverbere', (allume) => dits.push(allume))
    interne.quai!.avancer(1e6, 0)
    expect(scene.reverbereAllume).toBe(true)
    image()
    expect(dits).toEqual([true])
  })

  it('sans WebGL, le geste est inoffensif', () => {
    const scene = sceneSansRendu()
    expect(scene.reverbereAllume).toBe(true)
    expect(() => scene.basculerReverbere()).not.toThrow()
    expect(scene.reverbereAllume).toBe(true)
  })

  /**
   * **Seulement à l'arrêt** (spec §3), au pointeur comme au clavier. Le bouton
   * du DOM est `disabled` en marche ; la lampe avait, elle, gardé une règle à
   * elle — « elle répond là où elle est, même en marche » — et la souris
   * pouvait donc éteindre un réverbère que le clavier ne pouvait plus toucher.
   * Deux règles pour un seul geste : c'est ce que `basculerReverbere` interdit
   * en toutes lettres (« pour que le clavier n'ait pas une lampe à lui »).
   *
   * Le clic reste **pris** — `clicPx` rend `true` —, comme celui de l'horloge
   * en marche : il a touché la lampe, il ne doit pas aussi ouvrir une bulle.
   */
  it('ne répond plus en marche, comme le bouton du DOM qui est alors `disabled`', async () => {
    const { scene, interne } = await sceneDeTest()
    scene.setGare('ailleurs')
    scene.setVoyage(true, 1, 'ici')
    const { x, y } = surLeMat()
    expect(scene.clicPx(x, y)).toBe(true)
    expect(scene.reverbereAllume).toBe(true)
    // Et le geste direct non plus : la règle est dans `basculerReverbere`.
    scene.basculerReverbere()
    expect(scene.reverbereAllume).toBe(true)
    // À l'arrêt, elle répond de nouveau.
    scene.setVoyage(false, 0)
    interne.quai!.avancer(0, 1)
    expect(scene.clicPx(x, y)).toBe(true)
    expect(scene.reverbereAllume).toBe(false)
  })
})

describe('la nuit, posée avant la première image', () => {
  /**
   * L'`assombrir()` de la fin d'`init` ne peut pas tenir ce qu'il promettait :
   * quand il passe, `gare` vaut encore `'ici'` — `useScene` ne dit la gare
   * qu'**après** l'`await init()`. Il posait donc la neige à **zéro**.
   *
   * Ce qui porte la garantie, c'est que `setGare` et `setVoyage` assombrissent
   * eux-mêmes : la neige d'un lien partagé vers « ailleurs » est pleine dès que
   * la scène sait où elle est, sans attendre le premier tick de Pixi.
   */
  it('la neige est pleine dès que la gare est dite, sans qu’une image soit rendue', async () => {
    const { scene, interne, render } = await sceneDeTest()
    expect(interne.neige!.groupe.alpha).toBe(0)
    scene.setGare('ailleurs')
    scene.setVoyage(false, 0)
    expect(interne.neige!.groupe.alpha).toBe(1)
    // Aucune image n'a été rendue : c'est bien la pose, pas le tick.
    expect(render).not.toHaveBeenCalled()
  })

  /** Et elle repart dès qu'on quitte « ailleurs », toujours sans image. */
  it('et elle s’en va de même quand la gare change', async () => {
    const { scene, interne } = await sceneDeTest()
    scene.setGare('ailleurs')
    scene.setVoyage(false, 0)
    expect(interne.neige!.groupe.alpha).toBe(1)
    scene.setGare('ici')
    expect(interne.neige!.groupe.alpha).toBe(0)
  })

  /**
   * **M6.** Le reflet ne doit pas renvoyer la neige du cône : retournés, ses
   * flocons **monteraient** dans l'eau. Rien ne le gardait — supprimer le
   * dernier argument de `horsDuReflet` laissait la suite entière au vert.
   * On regarde donc ce que le renderer a sous les yeux **pendant** le rendu :
   * `horsDuReflet` remet tout en place dans son `finally`, c'est le seul
   * instant où cela se voit.
   */
  it('le reflet ne prend ni le ciel, ni la neige, ni celle du faisceau', async () => {
    const { interne, render, rendus, image } = await sceneDeTest()
    image()
    expect(render).toHaveBeenCalled()
    expect(rendus.length).toBeGreaterThan(0)
    for (const vu of rendus) {
      expect(vu.ciel, 'le ciel').toBe(false)
      expect(vu.neige, 'la neige libre').toBe(false)
      expect(vu.neigeDuCone, 'la neige du cône').toBe(false)
    }
    // Et tout est rendu après : le faisceau ne reste pas éteint par le reflet.
    expect(interne.quai!.lumiere.neige.racine.visible).toBe(true)
  })
})

describe('la scène dit quand le train et le massif sont posés', () => {
  it('`pret` n’est pas tenue avant que la scène n’ait rien chargé', async () => {
    // Le loader attend ce signal : s'il arrivait trop tôt, il s'effacerait sur
    // un écran encore noir — c'est tout ce qu'on lui demande de ne pas faire.
    const s = new Scene(document.createElement('canvas'), { reducedMotion: false })
    let tenue = false
    void s.pret.then(() => {
      tenue = true
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(tenue).toBe(false)
    s.dispose()
  })

  it('elle est tenue même quand il n’y a rien à charger', async () => {
    // Sans manifeste, `peupler` n'est jamais appelée ; sans WebGL, `init`
    // renonce avant. Dans les deux cas le loader doit partir, sinon le site
    // reste caché derrière lui pour toujours.
    const s = new Scene(document.createElement('canvas'), { reducedMotion: false })
    await s.init()
    await expect(s.pret).resolves.toBeUndefined()
    s.dispose()
  })

  it('`dispose` tient la promesse plutôt que de l’abandonner', async () => {
    // Une gare démontée pendant le chargement laisserait sinon le loader en
    // place, sur une scène qui n'existe plus.
    const s = new Scene(document.createElement('canvas'), { reducedMotion: false })
    s.dispose()
    await expect(s.pret).resolves.toBeUndefined()
  })
})
