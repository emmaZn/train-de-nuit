import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'

import { Birds, CORPS_MAX, SOL, TAILLE_OISEAU } from '@/scene/Birds'
import { Cables } from '@/scene/CableLayer'
import { PLACES_SIMULTANEES } from '@/scene/oiseaux'
import { HORIZON } from '@/scene/layout'

function scene(reducedMotion = false) {
  const parent = new Container()
  const cables = new Cables(new Container())
  cables.placer(0)
  const birds = new Birds(parent, cables, { reducedMotion })
  return { birds, cables }
}

/** Fait tourner la scène pendant `secondes`, à 60 images par seconde. */
function tourner(birds: Birds, secondes: number) {
  for (let i = 0; i < Math.round(secondes * 60); i += 1) birds.avancer(1 / 60)
}

/** Où en sont les sprites, sans rien demander de privé à la classe. */
function positions(birds: Birds) {
  return birds.corps.children.map((c) => ({ x: c.x, y: c.y }))
}

describe('Birds', () => {
  it('garnit les fils jusqu’à neuf places, pas plus', () => {
    const { birds } = scene()
    expect(birds.corps.children.length).toBe(PLACES_SIMULTANEES)
    tourner(birds, 30)
    expect(birds.corps.children.length).toBe(PLACES_SIMULTANEES)
  })

  it('un clic sur un oiseau le fait tomber, et ne prévient qu’une fois', () => {
    const { birds } = scene()
    let dits = 0
    birds.surChute = () => {
      dits += 1
    }
    const cible = positions(birds)[0]
    expect(birds.cliquer(cible.x, cible.y - TAILLE_OISEAU * 0.3)).toBe(true)
    expect(dits).toBe(1)
    tourner(birds, 2)
    expect(dits).toBe(1)
  })

  it('un clic dans le vide ne fait rien et rend false', () => {
    const { birds } = scene()
    let dits = 0
    birds.surChute = () => {
      dits += 1
    }
    expect(birds.cliquer(-5000, -5000)).toBe(false)
    expect(dits).toBe(0)
  })

  it('un clic sur une bosse déjà au sol ne relance rien', () => {
    const { birds } = scene()
    const cible = positions(birds)[0]
    birds.cliquer(cible.x, cible.y - TAILLE_OISEAU * 0.3)
    tourner(birds, 3)
    const bosse = positions(birds).find((p) => p.y >= SOL - 1)!
    expect(birds.cliquer(bosse.x, bosse.y)).toBe(false)
  })

  it('la bosse se plante dans la terre, pas dans l’eau du reflet', () => {
    const { birds } = scene()
    const cible = positions(birds)[0]
    birds.cliquer(cible.x, cible.y - TAILLE_OISEAU * 0.3)
    tourner(birds, 3)
    expect(SOL).toBeGreaterThan(HORIZON)
    expect(positions(birds).some((p) => Math.abs(p.y - SOL) < 1)).toBe(true)
  })

  it('une bosse arrivée au sol ne bouge plus jamais', () => {
    const { birds } = scene()
    const cible = positions(birds)[0]
    birds.cliquer(cible.x, cible.y - TAILLE_OISEAU * 0.3)
    tourner(birds, 3)
    // On ne regarde que les bosses : les oiseaux restés sur le fil, eux,
    // doivent continuer de vivre.
    const bosses = () =>
      birds.corps.children
        .filter((c) => Math.abs(c.y - SOL) < 1)
        .map((c) => ({ x: c.x, y: c.y, rotation: c.rotation }))
    const avant = bosses()
    expect(avant.length).toBe(1)
    tourner(birds, 10)
    expect(bosses()).toEqual(avant)
  })

  it('remplace un oiseau tombé par un arrivant', () => {
    const { birds } = scene()
    const cible = positions(birds)[0]
    birds.cliquer(cible.x, cible.y - TAILLE_OISEAU * 0.3)
    tourner(birds, 12)
    expect(birds.corps.children.length).toBe(PLACES_SIMULTANEES + 1)
  })

  it('en mouvement réduit, l’oiseau ne tombe pas mais prévient quand même', () => {
    const { birds } = scene(true)
    let dits = 0
    birds.surChute = () => {
      dits += 1
    }
    const cible = positions(birds)[0]
    expect(birds.cliquer(cible.x, cible.y - TAILLE_OISEAU * 0.3)).toBe(true)
    expect(dits).toBe(1)
    tourner(birds, 3)
    expect(positions(birds).some((p) => Math.abs(p.y - SOL) < 1)).toBe(false)
  })

  it('fait pirouetter l’oiseau sur le fil avant de le lâcher, si la variante le dit', () => {
    const { birds } = scene()
    birds.variante = { pirouette: true, regard: false }
    const cible = positions(birds)[0]
    birds.cliquer(cible.x, cible.y - TAILLE_OISEAU * 0.3)
    tourner(birds, 0.3)
    // Il tourne encore sur le fil : il n'a pas commencé à descendre.
    expect(positions(birds)[0].y).toBeLessThan(cible.y + 10)
    expect(birds.corps.children[0].rotation).not.toBe(0)
    tourner(birds, 3)
    expect(positions(birds).some((p) => Math.abs(p.y - SOL) < 1)).toBe(true)
  })

  it('laisse le « … » fixer au sol plus longtemps, sans jamais repartir', () => {
    const { birds } = scene()
    birds.variante = { pirouette: false, regard: true }
    const cible = positions(birds)[0]
    birds.cliquer(cible.x, cible.y - TAILLE_OISEAU * 0.3)
    tourner(birds, 12)
    // Le regard retarde la fin de la séquence ; il ne fait jamais remonter.
    expect(positions(birds).some((p) => Math.abs(p.y - SOL) < 1)).toBe(true)
  })

  it('ne garde pas plus de CORPS_MAX bosses', () => {
    const { birds } = scene()
    for (let i = 0; i < 800; i += 1) {
      birds.faireTomberUn()
      tourner(birds, 0.2)
    }
    tourner(birds, 20)
    const bosses = positions(birds).filter((p) => Math.abs(p.y - SOL) < 1).length
    expect(bosses).toBeLessThanOrEqual(CORPS_MAX)
    // Et la butée a bien servi : sans elle, le tas aurait largement dépassé.
    expect(bosses).toBeGreaterThan(CORPS_MAX / 2)
  })

  it('garde les bosses en place quand le cadre change', () => {
    const { birds } = scene()
    const cible = positions(birds)[0]
    birds.cliquer(cible.x, cible.y - TAILLE_OISEAU * 0.3)
    tourner(birds, 3)
    const auSol = () => positions(birds).filter((p) => Math.abs(p.y - SOL) < 1)
    const avant = auSol()
    expect(avant.length).toBeGreaterThan(0)
    birds.cadrer({ scale: 0.3, offsetX: 0, offsetY: 0 }, 2)
    tourner(birds, 1)
    expect(auSol()).toEqual(avant)
  })

  it('se range tout seul', () => {
    const parent = new Container()
    const birds = new Birds(parent, new Cables(new Container()), { reducedMotion: false })
    expect(parent.children.length).toBe(1)
    birds.destroy()
    expect(parent.children.length).toBe(0)
  })
})
