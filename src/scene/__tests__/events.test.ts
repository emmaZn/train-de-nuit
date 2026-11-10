import { createEmitter } from '@/scene/events'
import type { SceneEvents } from '@/scene/events'

test('emit transmet ses arguments à tous les abonnés', () => {
  const emitter = createEmitter<SceneEvents>()
  const vus: number[] = []
  emitter.on('progress', (p) => vus.push(p))
  emitter.on('progress', (p) => vus.push(p * 2))
  emitter.emit('progress', 0.5)
  expect(vus).toEqual([0.5, 1])
})

test('on() renvoie une fonction de désabonnement qui coupe les appels suivants', () => {
  const emitter = createEmitter<SceneEvents>()
  const vus: number[] = []
  const off = emitter.on('progress', (p) => vus.push(p))
  emitter.emit('progress', 0.1)
  off()
  emitter.emit('progress', 0.2)
  expect(vus).toEqual([0.1])
})

test('clear() retire tous les abonnés', () => {
  const emitter = createEmitter<SceneEvents>()
  const vus: number[] = []
  emitter.on('progress', (p) => vus.push(p))
  emitter.clear()
  emitter.emit('progress', 0.3)
  expect(vus).toEqual([])
})

test('émettre un événement sans abonné ne lève pas', () => {
  const emitter = createEmitter<SceneEvents>()
  expect(() => emitter.emit('arrived', 'ici')).not.toThrow()
})
