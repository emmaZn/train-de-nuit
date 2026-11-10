import { nextTrainState, sequenceFor, trainSpeed } from '@/scene/Train'

test('le train quitte l’arrêt par le démarrage', () => {
  expect(nextTrainState('arret', 0, true)).toBe('demarrage')
})

test('le démarrage passe au roulement une fois lancé', () => {
  expect(nextTrainState('demarrage', 0.5, true)).toBe('roule')
})

test('le train freine longuement avant la gare', () => {
  expect(nextTrainState('roule', 0.75, true)).toBe('freinage')
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
