import { Container } from 'pixi.js'
import { describe, expect, it } from 'vitest'

import { Neige } from '@/scene/NeigeLayer'
import { COUCHES_NEIGE } from '@/scene/neige'
import { nuitDeLaGare } from '@/scene/nuit'
import { horsDuReflet, plansDuDecor } from '@/scene/Scene'
import { cadrageScene } from '@/scene/layout'
import { PHASE_FREINAGE } from '@/scene/Train'

/** Les tests passent par `cadrageScene`, jamais par `fitStage`. */
const LARGEUR = 1280
const HAUTEUR = 800
const { frame } = cadrageScene(LARGEUR, HAUTEUR)

const base = {
  gare: 'ici',
  cible: null,
  enRoute: false,
  phase: 0,
  derniereEtape: false,
  demarrage: false,
  reducedMotion: false,
} as const

function monter(reducedMotion = false) {
  const decor = new Container()
  const plans = plansDuDecor(decor)
  const neige = new Neige(plans.neige, reducedMotion)
  return { decor, plans, neige }
}

/** La neige cadrée, prête à tomber. */
function neigeCadree(reducedMotion = false) {
  const monte = monter(reducedMotion)
  monte.neige.cadrer(frame, LARGEUR, HAUTEUR, false)
  return monte
}

describe('la neige ne tombe que sur « ailleurs »', () => {
  it('la neige est absente hors d’« ailleurs »', () => {
    const { neige } = neigeCadree()
    neige.setNuit(nuitDeLaGare({ ...base, gare: 'ici' }))
    expect(neige.groupe.alpha).toBe(0)
    neige.setNuit(nuitDeLaGare({ ...base, gare: 'la-haut' }))
    expect(neige.groupe.alpha).toBe(0)
  })

  it('un lien partagé qui pose « ailleurs » a sa neige dès la première image', () => {
    // Review Focus nº 2 : aucun freinage joué, aucune image animée, et
    // `nuitDeLaGare` vaut déjà 1 — donc la neige est pleine tout de suite.
    const { neige } = neigeCadree()
    neige.setNuit(nuitDeLaGare({ ...base, gare: 'ailleurs', phase: 0 }))
    expect(neige.groupe.alpha).toBe(1)
  })

  it('traverser « ailleurs » sans s’arrêter ne fait pas neiger', () => {
    // Review Focus nº 3 : on sonde au départ de la traversée, pas au milieu.
    const { neige } = neigeCadree()
    const traverse = {
      ...base,
      gare: 'ailleurs',
      cible: 'ici',
      enRoute: true,
      derniereEtape: true,
      demarrage: false,
    } as const
    for (const phase of [0, 0.05, 0.5]) {
      neige.setNuit(nuitDeLaGare({ ...traverse, phase }))
      expect(neige.groupe.alpha).toBe(0)
    }
  })

  it('elle monte avec le freinage vers « ailleurs », sans fondu à elle', () => {
    const { neige } = neigeCadree()
    const freine = {
      ...base,
      gare: 'la-haut',
      cible: 'ailleurs',
      enRoute: true,
      derniereEtape: true,
    } as const
    neige.setNuit(nuitDeLaGare({ ...freine, phase: (PHASE_FREINAGE + 1) / 2 }))
    expect(neige.groupe.alpha).toBeCloseTo(0.5, 2)
    neige.setNuit(nuitDeLaGare({ ...freine, phase: 1 }))
    expect(neige.groupe.alpha).toBe(1)
  })
})

describe('la chute', () => {
  it('pose des flocons sur toutes les couches', () => {
    const { neige } = neigeCadree()
    expect(neige.decalages).toHaveLength(COUCHES_NEIGE)
    expect(neige.nombreDeFlocons).toBeGreaterThan(0)
  })

  it('les couches descendent, chacune à son rythme, sans sortir du bouclage', () => {
    const { neige } = neigeCadree()
    expect(neige.decalages).toEqual(new Array(COUCHES_NEIGE).fill(0))
    neige.animer(0.5)
    const apres = neige.decalages
    for (const d of apres) {
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThan(neige.hauteurDeBouclage)
    }
    expect(new Set(apres).size).toBe(COUCHES_NEIGE)
    // Et après un long moment, elles sont toujours dans le bouclage.
    neige.animer(600)
    for (const d of neige.decalages) {
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThan(neige.hauteurDeBouclage)
    }
  })

  it('ne retrace rien tant que le cadre ne change pas', () => {
    const { neige } = neigeCadree()
    const traces = neige.tracages
    neige.cadrer(frame, LARGEUR, HAUTEUR, false)
    neige.animer(1)
    neige.animer(1)
    expect(neige.tracages).toBe(traces)
    // Mais un écran qui change, lui, retrace.
    const { frame: autre } = cadrageScene(600, 900)
    neige.cadrer(autre, 600, 900, true)
    expect(neige.tracages).toBe(traces + 1)
  })

  it('sous mouvement réduit, les flocons sont posés mais ne tombent pas', () => {
    const { neige } = neigeCadree(true)
    expect(neige.nombreDeFlocons).toBeGreaterThan(0)
    const avant = neige.decalages
    neige.animer(1)
    expect(neige.decalages).toEqual(avant)
  })
})

describe('le reflet', () => {
  it('la neige ne se dessine pas dans le reflet', () => {
    const { plans } = monter()
    expect(plans.neige.visible).toBe(true)
    let pendant: boolean[] = []
    horsDuReflet(plans, () => {
      pendant = [plans.neige.visible, plans.ciel.visible]
    })
    expect(pendant).toEqual([false, false])
    expect(plans.neige.visible).toBe(true)
    expect(plans.ciel.visible).toBe(true)
  })

  it('rend les plans même si le rendu jette', () => {
    const { plans } = monter()
    expect(() =>
      horsDuReflet(plans, () => {
        throw new Error('pas de contexte')
      }),
    ).toThrow()
    expect(plans.neige.visible).toBe(true)
    expect(plans.ciel.visible).toBe(true)
  })
})
