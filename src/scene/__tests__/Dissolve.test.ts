import { Container, Graphics } from 'pixi.js'
import {
  DUREE_DEFAIT,
  DUREE_ECLAT,
  DUREE_MONTEE,
  DUREE_TOTALE,
  Dissolve,
  cibleDuGrain,
  grainsDePhrase,
  grainsDepuisAlpha,
  poigneeSansAnimation,
} from '@/scene/Dissolve'
import type { Grain } from '@/scene/Dissolve'
import { Scene } from '@/scene/Scene'
import { Stars } from '@/scene/StarLayer'
import { cadrageCiel } from '@/scene/layout'
import { projeter, projeterAuCadrage } from '@/scene/stars'
import type { Place } from '@/scene/stars'
import type { Trace } from '@/scene/types'

const VP_W = 1000
const VP_H = 800
/** La fenêtre d'un téléphone dont le clavier vient de se refermer. */
const VP_H2 = 500
const PLACE: Place = { x: 0.4, y: 0.25 }
const DEPUIS = new DOMRect(600, 300, 240, 24)
const IMAGE = 1 / 60

/** Un tampon RGBA blanc dont seul l'alpha varie — ce que rend `getImageData`. */
function tampon(w: number, h: number, alphas: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 255
    data[i * 4 + 1] = 255
    data[i * 4 + 2] = 255
    data[i * 4 + 3] = alphas[i] ?? 0
  }
  return data
}

function trace(): Trace {
  return { id: 'neuve', phrase: 'une phrase', creeLe: Date.now(), x: PLACE.x, y: PLACE.y }
}

/** Trois grains écrits à la main : la rastérisation n'est pas testable ici. */
function grains(): Grain[] {
  return [
    { x: 0, y: 12, a: 1 },
    { x: 120, y: 12, a: 0.8 },
    { x: 239, y: 12, a: 0.6 },
  ]
}

function monter(source: Promise<Grain[]> = Promise.resolve(grains())) {
  const parent = new Container()
  const ciel = new Container()
  const stars = new Stars(ciel, { reducedMotion: false })
  const posees: Trace[] = []
  const d = new Dissolve({
    depuis: DEPUIS,
    place: PLACE,
    parent,
    viewportW: VP_W,
    viewportH: VP_H,
    grains: source,
    allumer: (t) => {
      posees.push(t)
      stars.setStars(posees, VP_W, VP_H)
    },
  })
  return { parent, stars, posees, d }
}

/** La scène fait tourner la dissolution image par image : ici aussi. */
function jouer(d: Dissolve, secondes: number): void {
  const images = Math.round(secondes / IMAGE)
  for (let i = 0; i < images; i++) d.update(IMAGE)
}

/** Laisse passer les microtâches : les promesses de la poignée s'y tiennent. */
function souffler(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0))
}

/**
 * Les cercles que la dissolution vient de dessiner. Pixi garde la géométrie
 * telle quelle tant qu'elle n'est pas rendue : c'est la seule fenêtre sur ce
 * qu'on verrait, là où il n'y a pas d'écran.
 */
function cercles(parent: Container): Array<{ x: number; y: number }> {
  const gfx = parent.children[0] as Graphics | undefined
  if (!gfx) return []
  type Chemin = { action: string; data: number[] }
  type Remplissage = { data: { path: { instructions: Chemin[] } } }
  const vus: Array<{ x: number; y: number }> = []
  for (const i of gfx.context.instructions) {
    // Pixi préfixe d'un `moveTo` tout chemin qui suit un premier remplissage :
    // c'est le cercle qu'on cherche, pas la première instruction.
    const cercle = (i as unknown as Remplissage).data.path.instructions.find(
      (c) => c.action === 'circle',
    )
    if (cercle) vus.push({ x: cercle.data[0], y: cercle.data[1] })
  }
  return vus
}

function dessin(parent: Container): number {
  return cercles(parent).length
}

/** Une promesse de grains qu'on tient quand on veut : la police est lente. */
function enRetard(): { source: Promise<Grain[]>; livrer: (g: Grain[]) => void } {
  let livrer: (g: Grain[]) => void = () => {}
  const source = new Promise<Grain[]>((r) => {
    livrer = r
  })
  return { source, livrer }
}

test('grainsDepuisAlpha ne rend que les pixels au-dessus du seuil', () => {
  const alpha = tampon(2, 2, [0, 100, 128, 255])
  expect(grainsDepuisAlpha(alpha, 2, 2, 1, 128)).toEqual([{ x: 1, y: 1, a: 1 }])
})

test('grainsDepuisAlpha échantillonne selon le pas et rend l’alpha en 0..1', () => {
  const alphas = Array.from({ length: 16 }, () => 255)
  alphas[0] = 51
  expect(grainsDepuisAlpha(tampon(4, 4, alphas), 4, 4, 2, 10)).toEqual([
    { x: 0, y: 0, a: 51 / 255 },
    { x: 2, y: 0, a: 1 },
    { x: 0, y: 2, a: 1 },
    { x: 2, y: 2, a: 1 },
  ])
})

test('grainsDepuisAlpha rend [] sur un tampon vide', () => {
  expect(grainsDepuisAlpha(tampon(8, 8, []), 8, 8, 2, 0)).toEqual([])
})

test('sans contexte 2D, la rastérisation rend [] plutôt que de lever', async () => {
  // Le navigateur sans canvas que `setup.ts` reproduit : `getContext` rend
  // `null`, et `document.fonts` n'existe pas en jsdom. Les deux replis
  // passent ici — c'est tout ce qui est mesurable de la rastérisation.
  await expect(grainsDePhrase('une phrase', DEPUIS)).resolves.toEqual([])
})

test('les durées font les 3,5 s du cadrage, dont 2,5 s de montée', () => {
  expect(DUREE_TOTALE).toBe(3.5)
  expect(DUREE_MONTEE).toBe(2.5)
})

test('sans réponse, les grains convergés patientent', async () => {
  const { d, parent, posees } = monter()
  await souffler()
  jouer(d, 20)
  // Rien ne s'est allumé, et le nœud de grains est toujours dessiné.
  expect(posees).toHaveLength(0)
  expect(parent.children).toHaveLength(1)
  expect(dessin(parent)).toBe(grains().length)

  // L'écriture arrive enfin : le grain monte quand même.
  const t = trace()
  const fin = d.land(t)
  jouer(d, 1)
  // Les grains restés en bas se sont effacés, le grain élu monte avec sa
  // traîne : il y a plus à voir que le nœud.
  expect(dessin(parent)).toBeGreaterThan(grains().length)
  jouer(d, DUREE_TOTALE)
  await expect(fin).resolves.toBeUndefined()
  expect(posees).toEqual([t])
})

test('land puis revert : le second est ignoré, la poignée ne joue qu’une fin', async () => {
  const { d, parent, posees, stars } = monter()
  await souffler()
  const t = trace()
  let finie = false
  const fin = d.land(t).then(() => {
    finie = true
  })
  // En pleine dissolution : le revert ne défait pas le land, il rend la même
  // fin — celle du grain qui monte.
  const second = d.revert()

  jouer(d, DUREE_TOTALE - 0.1)
  await souffler()
  expect(finie).toBe(false)

  jouer(d, 0.3)
  await souffler()
  expect(finie).toBe(true)
  expect(posees).toEqual([t])
  expect(parent.children).toHaveLength(0)
  await expect(second).resolves.toBeUndefined()

  // Celui d'après non plus : rien à reformer, rien qui pend.
  await expect(d.revert()).resolves.toBeUndefined()
  jouer(d, 1)
  expect(posees).toEqual([t])
  expect(parent.children).toHaveLength(0)

  const { px, py } = projeterAuCadrage(PLACE, VP_W, VP_H)
  expect(stars.hit(px, py)?.id).toBe(t.id)
  await fin
})

test('revert avant la fin de la dissolution attend qu’elle soit finie', async () => {
  const { d, parent, posees } = monter()
  await souffler()
  let finie = false
  const fin = d.revert().then(() => {
    finie = true
  })
  // Et un land en pleine dissolution ne gagne pas : aucune étoile ne s'allume
  // pour une phrase qui n'est pas enregistrée (§9).
  const second = d.land(trace())

  jouer(d, DUREE_DEFAIT / 2)
  await souffler()
  expect(finie).toBe(false)

  // La dissolution va jusqu'au bout avant que la phrase ne se reforme.
  jouer(d, DUREE_DEFAIT)
  await souffler()
  expect(finie).toBe(false)

  jouer(d, DUREE_DEFAIT)
  await souffler()
  expect(finie).toBe(true)
  expect(posees).toHaveLength(0)
  expect(parent.children).toHaveLength(0)
  await expect(second).resolves.toBeUndefined()
  await fin
})

test('après l’attente, revert reforme la phrase et tient sa promesse', async () => {
  // C'est le chemin de production : la tâche 7 renonce au bout de 10 s, donc
  // toujours bien après les 0,6 s de la dissolution. Un revert qui ne
  // réveillerait pas l'attente laisserait la scène figée et le formulaire
  // absent pour de bon.
  const { d, parent, posees } = monter()
  await souffler()
  jouer(d, 20)

  let finie = false
  const fin = d.revert().then(() => {
    finie = true
  })
  await souffler()
  expect(finie).toBe(false)

  jouer(d, DUREE_DEFAIT)
  await souffler()
  expect(finie).toBe(true)
  expect(posees).toHaveLength(0)
  expect(parent.children).toHaveLength(0)
  await fin
})

test('des grains en retard paraissent quand même pendant l’attente', async () => {
  // À la première visite la police n'est pas en cache : `document.fonts.ready`
  // peut tenir plus longtemps que les 0,6 s de la dissolution.
  const { source, livrer } = enRetard()
  const { d, parent } = monter(source)
  jouer(d, DUREE_DEFAIT * 2)
  expect(dessin(parent)).toBe(0)

  livrer(grains())
  await souffler()
  const vus = cercles(parent)
  expect(vus).toHaveLength(grains().length)
  // Ils paraissent convergés, au nœud, et non étalés sur la phrase.
  const etalement = Math.max(...vus.map((c) => c.x)) - Math.min(...vus.map((c) => c.x))
  expect(etalement).toBeLessThan(DEPUIS.width / 4)
})

test('des grains arrivés en pleine montée sont ignorés', async () => {
  const { source, livrer } = enRetard()
  const { d, parent } = monter(source)
  void d.land(trace())
  jouer(d, DUREE_DEFAIT + 1)
  const avant = JSON.stringify(cercles(parent))

  livrer(grains())
  await souffler()
  // Une image de plus, sans temps : seule une reprise des grains pourrait
  // bouger quoi que ce soit — et elle ferait sauter le grain en plein vol.
  d.update(0)
  expect(JSON.stringify(cercles(parent))).toBe(avant)
})

test('un redimensionnement en vol déplace la cible du grain', async () => {
  // Sur un téléphone, Entrée referme le clavier : la fenêtre change de taille
  // à l'instant même où la dissolution commence.
  const { d, parent } = monter()
  await souffler()
  void d.land(trace())
  d.resize(VP_W, VP_H2)
  jouer(d, DUREE_DEFAIT + DUREE_MONTEE + DUREE_ECLAT / 2)

  const vise = projeterAuCadrage(PLACE, VP_W, VP_H2)
  expect(vise.py).not.toBeCloseTo(projeterAuCadrage(PLACE, VP_W, VP_H).py)
  // Le halo de l'éclat, dessiné en dernier, se pose là où l'étoile sera.
  const halo = cercles(parent).at(-1)
  expect(halo?.x).toBeCloseTo(vise.px)
  expect(halo?.y).toBeCloseTo(vise.py)
})

test('en mouvement réduit, land pose l’étoile sans animer', async () => {
  const ciel = new Container()
  const stars = new Stars(ciel, { reducedMotion: true })
  const posees: Trace[] = []
  const poignee = poigneeSansAnimation((t) => {
    posees.push(t)
    stars.setStars(posees, VP_W, VP_H)
  })

  const t = trace()
  // Aucune image jouée : l'étoile est là dès que l'écriture aboutit.
  await expect(poignee.land(t)).resolves.toBeUndefined()
  expect(posees).toEqual([t])
  const { px, py } = projeterAuCadrage(PLACE, VP_W, VP_H)
  expect(stars.hit(px, py)?.id).toBe(t.id)
})

test('sans rendu, beginDissolve rend une poignée qui se tient tout de suite', async () => {
  // Sans init(), la scène n'a pas de contexte WebGL : son horloge ne tourne
  // pas, et une dissolution animée ne finirait jamais.
  const scene = new Scene(document.createElement('canvas'), { reducedMotion: false })
  const poignee = scene.beginDissolve('une phrase', DEPUIS, PLACE)
  await expect(poignee.land(trace())).resolves.toBeUndefined()
  await expect(poignee.revert()).resolves.toBeUndefined()
})

test('le grain monte là où l’étoile s’allumera vraiment', () => {
  // `Dissolve` et `StarLayer` doivent lire la même région : sinon la traînée
  // vise une place que l'étoile n'occupera pas. 1512x771 est un format où le
  // décalage n'est pas nul.
  const place = { x: 0.46, y: 0.3 }
  const { decalage, echelle } = cadrageCiel(1512, 771)
  expect(decalage).toBeGreaterThan(0)
  expect(cibleDuGrain(place, 1512, 771)).toEqual(projeter(place, 1512, 771, echelle, decalage))
})
