import { readFileSync } from 'node:fs'

import {
  ATTELAGE,
  FPS,
  IMAGES_TRANSITION,
  PHASE_FREINAGE,
  PHASE_ROULE,
  WAGONS,
  ancrageRame,
  emprise,
  frameIndex,
  nextTrainState,
  sequenceFor,
  trainSpeed,
  wagonX,
} from '@/scene/Train'
import { DUREE_ETAPE, ECHELLE_TRAIN, HORIZON, STAGE, TETE_LOCO } from '@/scene/layout'

test('le train quitte l’arrêt par le démarrage', () => {
  expect(nextTrainState('arret', 0, true)).toBe('demarrage')
})

test('le démarrage passe au roulement une fois lancé', () => {
  expect(nextTrainState('demarrage', 0.5, true)).toBe('roule')
})

test('le train freine longuement avant la gare', () => {
  expect(nextTrainState('roule', 0.9, true)).toBe('freinage')
})

test('il ne freine pas encore en milieu d’étape', () => {
  expect(nextTrainState('roule', 0.4, true)).toBe('roule')
})

test('il traverse une gare intermédiaire sans freiner', () => {
  expect(nextTrainState('roule', 0.95, false)).toBe('roule')
})

test('le freinage se termine à l’arrêt', () => {
  expect(nextTrainState('freinage', 1, true)).toBe('arret')
})

test('le freinage dure jusqu’au bout de l’étape', () => {
  expect(nextTrainState('freinage', 0.9, true)).toBe('freinage')
})

test('chaque état choisit la paire loco + wagon correspondante', () => {
  expect(sequenceFor('demarrage')).toEqual(['loco-start', 'wagon-start'])
  expect(sequenceFor('roule')).toEqual(['loco', 'wagon'])
  expect(sequenceFor('freinage')).toEqual(['loco-stop', 'wagon-stop'])
})

test('à l’arrêt, le train garde la dernière image de la séquence d’arrêt', () => {
  expect(sequenceFor('arret')).toEqual(['loco-stop', 'wagon-stop'])
})

test('à l’arrêt, la voie ne défile pas', () => {
  expect(trainSpeed('arret', 0)).toBe(0)
})

test('en roulement, la voie défile à pleine vitesse', () => {
  expect(trainSpeed('roule', 0.5)).toBe(1)
})

test('le démarrage accélère progressivement', () => {
  expect(trainSpeed('demarrage', 0)).toBeCloseTo(0, 2)
  const milieu = trainSpeed('demarrage', 0.1)
  expect(milieu).toBeGreaterThan(0)
  expect(milieu).toBeLessThan(1)
})

test('le freinage ralentit jusqu’à l’arrêt', () => {
  expect(trainSpeed('freinage', 1)).toBeCloseTo(0, 2)
  expect(trainSpeed('freinage', 0.8)).toBeGreaterThan(0)
  expect(trainSpeed('freinage', 0.8)).toBeLessThan(1)
})

test('la vitesse ne sort jamais de [0,1]', () => {
  for (const phase of [-1, 0, 0.3, 0.7, 1, 2]) {
    for (const etat of ['arret', 'demarrage', 'roule', 'freinage'] as const) {
      const v = trainSpeed(etat, phase)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  }
})

test('une séquence en boucle tourne indéfiniment', () => {
  expect(frameIndex('roule', 35, 32, true)).toBe(3)
})

test('une séquence à jouer une fois s’arrête sur sa dernière image', () => {
  // Le démarrage et le freinage ne se rejouent pas : sans cela, le train
  // repartirait du début de sa séquence d'arrêt au milieu du freinage.
  expect(frameIndex('freinage', 70, 43, false)).toBe(42)
})

test('à l’arrêt, c’est la dernière image qui reste', () => {
  expect(frameIndex('arret', 5, 43, false)).toBe(42)
})

test('l’index d’image reste dans les bornes', () => {
  for (const image of [0, 1.9, 1000]) {
    const i = frameIndex('roule', image, 32, true)
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(32)
  }
})

// I1 : une cible redirigée pendant le freinage doit relancer le train
test('une étape qui n’est plus la dernière relance le train', () => {
  expect(nextTrainState('freinage', 0.5, false)).toBe('roule')
})

test('le freinage continue tant que l’étape reste la dernière', () => {
  expect(nextTrainState('freinage', 0.5, true)).toBe('freinage')
})

// Le wagon et la locomotive sont deux rendus séparés, chacun dessiné au même
// endroit du cadre. Les poser tous deux à leur origine les empile : le toit du
// wagon barre alors la chaudière, au-dessus de la cheminée.
const LOCO = { x: 597, y: 277, width: 1341, height: 666, count: 32, scale: 0.5, path: '' }
const WAGON = { x: 597, y: 494, width: 1119, height: 446, count: 32, scale: 0.5, path: '' }

test('le wagon est attelé derrière la locomotive, pas empilé dessus', () => {
  const x = wagonX(LOCO, WAGON)
  expect(x).toBeLessThan(LOCO.x)
  expect(x + WAGON.width).toBeLessThanOrEqual(LOCO.x + ATTELAGE)
})

test('le wagon ne recouvre ni la chaudière ni la cheminée', () => {
  const x = wagonX(LOCO, WAGON)
  // la cheminée est dans la moitié avant de la locomotive
  expect(x + WAGON.width).toBeLessThan(LOCO.x + LOCO.width / 2)
})

test('les tampons se touchent, ils ne laissent pas de trou', () => {
  const x = wagonX(LOCO, WAGON)
  expect(LOCO.x - (x + WAGON.width)).toBeLessThanOrEqual(0)
  expect(ATTELAGE).toBeGreaterThan(0)
})

// Réduire le train : la rame rétrécit, mais ses roues restent sur la voie et
// la rame reste centrée dans le cadre.
test('la voie reste exactement à sa place quand le train rétrécit', () => {
  const a = ancrageRame(LOCO, WAGON, 0.5)
  expect(a.y + 0.5 * HORIZON).toBeCloseTo(HORIZON, 6)
})

test('la tête de la locomotive se pose au milieu du cadre', () => {
  const { droite } = emprise(LOCO, WAGON)
  const a = ancrageRame(LOCO, WAGON, 0.5)
  expect(a.x + 0.5 * droite).toBeCloseTo(STAGE.width * TETE_LOCO, 6)
})

test('la rame s’étend vers l’arrière de la tête, jamais devant', () => {
  const { gauche, droite } = emprise(LOCO, WAGON, WAGONS)
  expect(gauche).toBeLessThan(droite)
})

test('la tête ne bouge pas quand l’échelle change', () => {
  const { droite } = emprise(LOCO, WAGON)
  for (const e of [0.3, 0.44, 0.8]) {
    const a = ancrageRame(LOCO, WAGON, e)
    expect(a.x + e * droite).toBeCloseTo(STAGE.width * TETE_LOCO, 6)
  }
})

// C'était le piège de l'ancien décalage en pixels : atteler un wagon
// déplaçait toute la rame, puisqu'on centrait son milieu.
test('la tête ne bouge pas quand on attelle un wagon de plus', () => {
  const { droite } = emprise(LOCO, WAGON)
  for (const n of [1, 2, 3]) {
    const a = ancrageRame(LOCO, WAGON, ECHELLE_TRAIN, n)
    expect(a.x + ECHELLE_TRAIN * droite).toBeCloseTo(STAGE.width * TETE_LOCO, 6)
  }
})

test('réduire de moitié divise la largeur de la rame par deux', () => {
  const { gauche, droite } = emprise(LOCO, WAGON)
  const pleine = droite - gauche
  const a = ancrageRame(LOCO, WAGON, 0.5)
  const g = a.x + 0.5 * gauche
  const d = a.x + 0.5 * droite
  expect(d - g).toBeCloseTo(pleine / 2, 6)
})

test('la rame va du tampon arrière du wagon au nez de la locomotive', () => {
  const { gauche, droite } = emprise(LOCO, WAGON)
  expect(gauche).toBe(wagonX(LOCO, WAGON))
  expect(droite).toBe(LOCO.x + LOCO.width)
})

test('à échelle réduite, la rame tient dans le cadre', () => {
  const { gauche, droite } = emprise(LOCO, WAGON)
  const a = ancrageRame(LOCO, WAGON, ECHELLE_TRAIN)
  expect(a.x + ECHELLE_TRAIN * gauche).toBeGreaterThanOrEqual(0)
  expect(a.x + ECHELLE_TRAIN * droite).toBeLessThanOrEqual(STAGE.width)
})

// La longueur des transitions est écrite dans le code mais vient des assets.
// Ce test la confronte au manifeste réel : s'ils changent, il casse, au lieu
// de laisser les roues se figer pendant que la voie défile encore.
test('les séquences de transition font le nombre d’images annoncé', () => {
  const manifeste = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8'))
  for (const cle of ['loco-start', 'wagon-start', 'loco-stop', 'wagon-stop']) {
    expect(manifeste.train[cle].count).toBe(IMAGES_TRANSITION)
  }
})

test('la montée en vitesse dure exactement la séquence de démarrage', () => {
  expect(PHASE_ROULE * DUREE_ETAPE).toBeCloseTo(IMAGES_TRANSITION / FPS, 9)
})

test('le freinage dure exactement la séquence d’arrêt', () => {
  expect((1 - PHASE_FREINAGE) * DUREE_ETAPE).toBeCloseTo(IMAGES_TRANSITION / FPS, 9)
})

// Et il reste du roulage entre les deux : une étape trop courte ferait
// freiner le train avant d'avoir fini de démarrer.
test('le train roule un moment entre le démarrage et le freinage', () => {
  expect(PHASE_FREINAGE).toBeGreaterThan(PHASE_ROULE)
})

// Les wagons se chaînent : chacun recule d'une longueur de wagon moins
// l'attelage, pour que les tampons se touchent comme sur le premier.
test('le deuxième wagon se pose derrière le premier, même recouvrement', () => {
  const premier = wagonX(LOCO, WAGON, 1)
  const second = wagonX(LOCO, WAGON, 2)
  expect(premier - second).toBe(WAGON.width - ATTELAGE)
  expect(second + WAGON.width - premier).toBe(ATTELAGE)
})

test('sans rang, on retrouve le wagon unique d’avant', () => {
  expect(wagonX(LOCO, WAGON)).toBe(wagonX(LOCO, WAGON, 1))
})

test('allonger la rame étend son emprise vers l’arrière, pas vers l’avant', () => {
  const un = emprise(LOCO, WAGON, 1)
  const deux = emprise(LOCO, WAGON, 2)
  expect(deux.droite).toBe(un.droite)
  expect(deux.gauche).toBeLessThan(un.gauche)
})

// La rame déborde maintenant à gauche, volontairement : la tête tient le
// milieu et le reste du train sort du champ, comme s'il continuait.
// Ce qui ne doit jamais arriver, c'est qu'elle dépasse à droite.
test('la rame retenue ne dépasse pas à droite et pose sa tête au milieu', () => {
  const { droite } = emprise(LOCO, WAGON, WAGONS)
  const a = ancrageRame(LOCO, WAGON, ECHELLE_TRAIN, WAGONS)
  const nez = a.x + ECHELLE_TRAIN * droite
  expect(nez).toBeCloseTo(STAGE.width * TETE_LOCO, 6)
  expect(nez).toBeLessThanOrEqual(STAGE.width)
})

test('les roues restent sur la voie quelle que soit la longueur de la rame', () => {
  for (const n of [1, 2, 3]) {
    const a = ancrageRame(LOCO, WAGON, ECHELLE_TRAIN, n)
    expect(a.y + ECHELLE_TRAIN * HORIZON).toBeCloseTo(HORIZON, 6)
  }
})
