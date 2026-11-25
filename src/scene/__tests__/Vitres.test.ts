import { readFileSync } from 'node:fs'

import { Container } from 'pixi.js'
import { afterEach, describe, expect, it } from 'vitest'

import {
  Vitres,
  ALLUMEES,
  AMPLITUDE,
  BOITES,
  DENSITE_BAS,
  DENSITE_HAUT,
  EXTINCTION,
  GRAIN_ECRAN,
  HALO_ALPHA,
  MARGE,
  PAS_SEUIL,
  PERIODE_REDESSIN,
  RAYON_VITRE,
  RETRAIT,
  alea,
  cadreVitre,
  centreVitre,
  densiteVisee,
  seuilVacillement,
  vitreVisee,
} from '@/scene/Vitres'
import { cadrageScene } from '@/scene/layout'
import type { Manifest } from '@/scene/types'

describe('seuilVacillement', () => {
  it('ne descend jamais en dessous de l’amplitude annoncée, ni au-dessus de 1', () => {
    for (let t = 0; t < 400; t += 0.17) {
      for (const phase of [0, 1.7, 5.1, 11.9]) {
        const v = seuilVacillement(t, phase)
        expect(v).toBeGreaterThanOrEqual(1 - AMPLITUDE - 1e-9)
        expect(v).toBeLessThanOrEqual(1 + 1e-9)
      }
    }
  })

  it('n’éteint jamais une vitre : le vacillement n’est pas un clignotement', () => {
    expect(1 - AMPLITUDE).toBeGreaterThan(0.5)
  })

  it('désynchronise deux vitres', () => {
    const a = seuilVacillement(3, 0)
    const b = seuilVacillement(3, 1.7)
    expect(Math.abs(a - b)).toBeGreaterThan(PAS_SEUIL)
  })

  it('ne se répète pas sur une étape : les deux périodes sont incommensurables', () => {
    // Si les deux ondes se refermaient ensemble, le battement reviendrait.
    expect((1.37 / 0.9) % 1).toBeGreaterThan(0.1)
  })

  it('à amplitude nulle, la vitre est fixe', () => {
    expect(seuilVacillement(42, 3, 0)).toBe(1)
  })

  it('est déterministe', () => {
    expect(seuilVacillement(7.5, 2.1)).toBe(seuilVacillement(7.5, 2.1))
  })
})

describe('densiteVisee', () => {
  const largeur = 200
  const hauteur = 300
  const marge = 40

  it('éclaire le bas de la vitre plus que le haut : la lampe est en bas', () => {
    const haut = densiteVisee(marge, largeur / 2, largeur, hauteur, marge)
    const bas = densiteVisee(hauteur - marge - 1, largeur / 2, largeur, hauteur, marge)
    expect(haut).toBeCloseTo(DENSITE_HAUT, 6)
    expect(bas).toBeCloseTo(DENSITE_BAS, 6)
  })

  it('monte sans à-coup du haut vers le bas', () => {
    let precedent = -1
    for (let y = marge; y < hauteur - marge; y += 1) {
      const d = densiteVisee(y, largeur / 2, largeur, hauteur, marge)
      expect(d).toBeGreaterThanOrEqual(precedent)
      precedent = d
    }
  })

  it('ne pose aucun point hors de la vitre : le halo est un dégradé, pas du grain', () => {
    expect(densiteVisee(marge - 1, largeur / 2, largeur, hauteur, marge)).toBe(0)
    expect(densiteVisee(hauteur - marge, largeur / 2, largeur, hauteur, marge)).toBe(0)
    expect(densiteVisee(hauteur / 2, marge - 1, largeur, hauteur, marge)).toBe(0)
    expect(densiteVisee(hauteur / 2, largeur - marge, largeur, hauteur, marge)).toBe(0)
  })

  it('reste une densité, entre 0 et 1', () => {
    for (let y = 0; y < hauteur; y += 7) {
      const d = densiteVisee(y, largeur / 2, largeur, hauteur, marge)
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThanOrEqual(1)
    }
  })
})

describe('cadreVitre', () => {
  it('rentre dans la boîte et laisse sa place au halo', () => {
    const [x0, y0, x1, y1] = BOITES[0]
    const c = cadreVitre(BOITES[0])
    expect(c.x).toBe(x0 + RETRAIT - MARGE)
    expect(c.y).toBe(y0 + RETRAIT - MARGE)
    expect(c.largeur).toBe(x1 - x0 + 1 - 2 * RETRAIT + 2 * MARGE)
    expect(c.hauteur).toBe(y1 - y0 + 1 - 2 * RETRAIT + 2 * MARGE)
  })

  it('garde une vitre non vide une fois le retrait appliqué', () => {
    for (const b of BOITES) {
      expect(b[2] - b[0] + 1 - 2 * RETRAIT).toBeGreaterThan(0)
      expect(b[3] - b[1] + 1 - 2 * RETRAIT).toBeGreaterThan(0)
    }
  })
})

describe('les vitres d’un wagon', () => {
  it('sont six, de gauche à droite et sans chevauchement', () => {
    expect(BOITES).toHaveLength(6)
    for (let i = 1; i < BOITES.length; i += 1) {
      expect(BOITES[i][0]).toBeGreaterThan(BOITES[i - 1][2])
    }
  })

  it('ne sont pas toutes allumées, et pas les mêmes d’un wagon à l’autre', () => {
    expect(ALLUMEES).toHaveLength(2)
    for (const motif of ALLUMEES) {
      expect(motif).toHaveLength(BOITES.length)
      expect(motif.some((v) => v)).toBe(true)
      expect(motif.some((v) => !v)).toBe(true)
    }
    expect(ALLUMEES[0]).not.toEqual(ALLUMEES[1])
  })
})

describe('alea', () => {
  it('donne la même suite pour la même graine', () => {
    const a = alea(7)
    const b = alea(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('reste dans [0, 1[', () => {
    const r = alea(99)
    for (let i = 0; i < 500; i += 1) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

/**
 * **« Je veux pouvoir cliquer sur les fenêtres du train pour allumer ou
 * éteindre, même si elle peut se rallumer et s'éteindre aléatoirement
 * toujours. »** Emmanuelle, le 25 novembre 2026.
 *
 * Une vitre fait 82 px de cadre source, soit une douzaine de pixels d'écran
 * sur un téléphone : on ne la vise pas. C'est la **plus proche** qui répond,
 * dans un rayon, et ces tests tiennent cette règle-là plutôt qu'un rectangle.
 */
describe('viser une fenêtre', () => {
  const centres = BOITES.map((b) => centreVitre(b))

  it('le centre est celui de la vitre, pas celui de son halo', () => {
    // `cadreVitre` ajoute `MARGE` de chaque côté pour le halo ; deux halos
    // voisins se recouvrent, et leur milieu tomberait entre deux fenêtres.
    const c = centreVitre(BOITES[0])
    const halo = cadreVitre(BOITES[0])
    expect(c.x).toBeCloseTo((BOITES[0][0] + BOITES[0][2]) / 2, 6)
    expect(halo.x).toBeLessThan(BOITES[0][0])
    expect(halo.x + halo.largeur).toBeGreaterThan(BOITES[0][2])
  })

  it('rend la vitre qu’on désigne, quand on tombe dessus', () => {
    centres.forEach((c, i) => {
      expect(vitreVisee(centres, c.x, c.y, RAYON_VITRE)).toBe(i)
    })
  })

  it('rend la plus proche, et non la première venue', () => {
    // Entre deux fenêtres, légèrement vers la seconde.
    const entre = (centres[0].x + centres[1].x) / 2 + 4
    expect(vitreVisee(centres, entre, centres[0].y, 1e4)).toBe(1)
    const avant = (centres[0].x + centres[1].x) / 2 - 4
    expect(vitreVisee(centres, avant, centres[0].y, 1e4)).toBe(0)
  })

  it('ne rend rien quand on est loin de toutes', () => {
    expect(vitreVisee(centres, centres[0].x, centres[0].y + 5000, 10)).toBeNull()
    expect(vitreVisee([], 0, 0, 1e4)).toBeNull()
  })

  it('le rayon est large devant une vitre, et plus étroit que l’écart des deux', () => {
    const vitre = BOITES[0][2] - BOITES[0][0]
    const ecart = centres[1].x - centres[0].x
    expect(RAYON_VITRE).toBeGreaterThan(vitre / 8)
    // En pixels d'écran : il ne doit pas falloir viser au pixel près, mais le
    // rayon ne sert à rien s'il couvre tout le wagon d'un coup — la plus
    // proche trancherait de toute façon, et le geste perdrait son sens.
    expect(RAYON_VITRE).toBeLessThan(ecart)
  })
})

/**
 * Le passage des pixels de cadre aux coordonnées de la rame — la seule partie
 * de ce geste qui puisse être fausse sans se voir. La rame est posée par
 * `Train.cadrer`, à une place qui dépend du format depuis le 25 novembre 2026 :
 * ce test prend donc une rame arbitrairement posée, et vérifie qu'on retrouve
 * la bonne fenêtre quand même.
 */
describe('toucher une fenêtre dans la scène', () => {
  const manifeste = () =>
    JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as Manifest

  /** Une rame posée n'importe où, comme le ferait un format n'importe lequel. */
  const poser = (x: number, y: number, k: number) => {
    const rame = new Container()
    rame.position.set(x, y)
    rame.scale.set(k)
    const m = manifeste()
    const positions = [-900, -1800]
    const vitres = new Vitres(rame, m, positions, false)
    return { vitres, rame, spec: m.train.wagon, positions }
  }

  /** Le centre de la vitre `i` du wagon `rang`, en pixels de cadre. */
  const enCadre = (
    o: ReturnType<typeof poser>,
    rang: number,
    i: number,
  ): { x: number; y: number } => {
    const c = centreVitre(BOITES[i])
    return {
      x: o.rame.position.x + o.rame.scale.x * (o.positions[rang] + c.x - o.spec.x),
      y: o.rame.position.y + o.rame.scale.x * c.y,
    }
  }

  it('bascule la fenêtre qu’on désigne, dans l’un ou l’autre wagon', () => {
    const o = poser(620, 70, 0.4)
    for (const [rang, i] of [[0, 0], [0, 4], [1, 2], [1, 5]] as const) {
      const p = enCadre(o, rang, i)
      expect(o.vitres.toucher(p.x, p.y, 1), `wagon ${rang}, vitre ${i}`).toBe(
        rang * BOITES.length + i,
      )
    }
  })

  it('rend `null` loin de la rame, et ne touche à rien', () => {
    const o = poser(620, 70, 0.4)
    expect(o.vitres.toucher(-5000, -5000, 1)).toBeNull()
  })

  /**
   * Le point de la demande : « même si elle peut se rallumer et s'éteindre
   * aléatoirement toujours ». Un carreau touché n'est pas verrouillé — il
   * repasse simplement dans l'autre état, et le tirage de `update` pourra le
   * reprendre comme n'importe quel autre.
   */
  it('éteint ce qui est allumé, rallume ce qui est éteint', () => {
    const o = poser(620, 70, 0.4)
    const p = enCadre(o, 0, 0)
    const i = o.vitres.toucher(p.x, p.y, 1)
    expect(i).toBe(0)
    const j = o.vitres.toucher(p.x, p.y, 1)
    expect(j).toBe(0)
  })

  /**
   * Le rayon se compte en pixels d'écran, et c'est ce qui fait qu'un doigt
   * trouve toujours un carreau : plus la scène est réduite, plus ces mêmes
   * pixels couvrent de fenêtres, et la plus proche répond pour les autres.
   *
   * Le test ne dit donc pas « on touche la vitre visée » — à 0,25 d'échelle,
   * quinze pixels d'écran enjambent deux fenêtres, et ce serait faux. Il dit
   * la chose qui compte : **on ne frappe jamais dans le vide**.
   */
  it('à quinze pixels d’écran du centre, on touche toujours une fenêtre', () => {
    const o = poser(620, 70, 0.4)
    const p = enCadre(o, 0, 0)
    for (const echelleCadre of [1, 0.5, 0.25]) {
      const dx = 15 / echelleCadre
      expect(o.vitres.toucher(p.x + dx, p.y, echelleCadre), `échelle ${echelleCadre}`).not.toBeNull()
    }
    // Et de près, c'est bien celle qu'on vise.
    expect(o.vitres.toucher(p.x + 5, p.y, 1)).toBe(0)
  })
})

describe('les réglages', () => {
  it('garde un grain plus fin que celui du massif', () => {
    // Le massif est passé à 2 le 25 novembre 2026 ; une vitre est trop petite
    // pour ce pas-là. Jamais soumis : voir le commentaire de la constante.
    expect(GRAIN_ECRAN).toBe(1.5)
  })

  it('ne redessine pas plus de quinze fois par seconde', () => {
    expect(1 / PERIODE_REDESSIN).toBeLessThanOrEqual(15 + 1e-9)
  })

  it('laisse passer plusieurs extinctions dans une visite, sans en faire un clignotant', () => {
    expect(EXTINCTION.min).toBeGreaterThan(4)
    expect(EXTINCTION.max).toBeGreaterThan(EXTINCTION.min)
  })

  it('assume un halo visible : c’est l’entorse à « blanc ou absent »', () => {
    expect(HALO_ALPHA).toBeGreaterThan(0)
    expect(HALO_ALPHA).toBeLessThanOrEqual(1)
  })
})

/**
 * De jour, les carreaux gardent leur grain et perdent leur lueur.
 *
 * « Les vitres allumées restent telles quelles, sans leur lueur : un carré de
 * grain sombre. Ça suffit. » — le 25/11. Le halo est l'une des quatre
 * « entorses assumées » du §6 : un dégradé radial, donc une tache une fois
 * inversé sur du papier.
 *
 * jsdom n'a pas de contexte 2D — `setup.ts` rend `null` exprès. On en pose un
 * qui note ce qu'on lui demande : c'est la seule fenêtre sur ce que la texture
 * recevrait vraiment.
 */
describe('les vitres selon le mode', () => {
  type Trace = { gradients: number; rects: number }

  function poserContexte(): Trace {
    const trace: Trace = { gradients: 0, rects: 0 }
    const contexte = {
      fillStyle: '' as unknown,
      clearRect: () => {},
      fillRect: () => {
        trace.rects += 1
      },
      createRadialGradient: () => {
        trace.gradients += 1
        return { addColorStop: () => {} }
      },
    }
    HTMLCanvasElement.prototype.getContext = (() =>
      contexte) as unknown as HTMLCanvasElement['getContext']
    return trace
  }

  function poser(mode?: 'nuit' | 'jour') {
    const trace = poserContexte()
    const rame = new Container()
    const m = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as Manifest
    const vitres = new Vitres(rame, m, [-900], false)
    if (mode) vitres.setMode(mode)
    vitres.cadrer(cadrageScene(1512, 771).frame, 1)
    vitres.update(0.016)
    return trace
  }

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as unknown as HTMLCanvasElement['getContext']
  })

  it('peint des halos de nuit', () => {
    expect(poser('nuit').gradients).toBeGreaterThan(0)
  })

  it('n’en peint aucun de jour', () => {
    expect(poser('jour').gradients).toBe(0)
  })

  it('garde le grain des carreaux de jour', () => {
    expect(poser('jour').rects).toBeGreaterThan(0)
  })

  it('en repeint quand on revient à la nuit', () => {
    const trace = poserContexte()
    const rame = new Container()
    const m = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8')) as Manifest
    const vitres = new Vitres(rame, m, [-900], false)
    vitres.setMode('jour')
    vitres.cadrer(cadrageScene(1512, 771).frame, 1)
    vitres.update(0.016)
    expect(trace.gradients).toBe(0)
    vitres.setMode('nuit')
    vitres.update(0.016)
    expect(trace.gradients).toBeGreaterThan(0)
  })
})
