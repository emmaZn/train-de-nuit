import { describe, expect, it } from 'vitest'

import { HORIZON, STAGE } from '@/scene/layout'
import { forwardSteps } from '@/scene/types'
import {
  ECHELLE_CABLE,
  FILS,
  POTEAU,
  TRAVEE,
  amortir,
  creux,
  distanceGare,
  RECUL_HORS_CHAMP,
  ancreSuivante,
  solParEtape,
  yCadre,
  yFil,
} from '@/scene/cables'

describe('yCadre', () => {
  it('pose le pied des poteaux sur la ligne de rail', () => {
    expect(yCadre(586)).toBeCloseTo(HORIZON)
  })

  it('échelle le cadre 1280 du SVG sur celui de la scène', () => {
    expect(ECHELLE_CABLE).toBeCloseTo(STAGE.width / 1280)
    expect(TRAVEE).toBeCloseTo(620 * ECHELLE_CABLE)
  })

  it('met le sommet des poteaux au-dessus de leur épaule, et les deux au-dessus du rail', () => {
    expect(POTEAU.sommet).toBeLessThan(POTEAU.epaule)
    expect(POTEAU.epaule).toBeLessThan(HORIZON)
  })
})

describe('creux', () => {
  it('vaut la moitié du décalage du point de contrôle à mi-portée', () => {
    expect(creux(92, 0.5)).toBeCloseTo(46)
  })

  it('est nul aux deux poteaux', () => {
    expect(creux(92, 0)).toBeCloseTo(0)
    expect(creux(92, 1)).toBeCloseTo(0)
  })
})

describe('amortir', () => {
  it('éteint la secousse, sans jamais la relancer', () => {
    expect(amortir(9, 0.5)).toBeLessThan(9)
    expect(amortir(9, 0.5)).toBeGreaterThan(0)
  })

  it('éteint d’autant plus vite que l’image est longue', () => {
    expect(amortir(9, 0.5)).toBeLessThan(amortir(9, 0.1))
  })
})

describe('yFil', () => {
  it('au repos, le fil n’est que sa flèche', () => {
    const repos = { amplitude: 0, phase: 0 }
    expect(yFil(0, 0.5, repos, 3)).toBeCloseTo(FILS[0].y + creux(FILS[0].controle, 0.5))
  })

  it('secoué, il s’écarte de son repos', () => {
    const repos = { amplitude: 0, phase: 0 }
    const secoue = { amplitude: 9, phase: 0 }
    expect(yFil(0, 0.5, secoue, 0)).not.toBeCloseTo(yFil(0, 0.5, repos, 0))
  })

  it('ne bouge pas aux poteaux, même secoué : c’est là qu’il est attaché', () => {
    const secoue = { amplitude: 9, phase: 0 }
    expect(yFil(0, 0, secoue, 0)).toBeCloseTo(FILS[0].y)
    expect(yFil(0, 1, secoue, 0)).toBeCloseTo(FILS[0].y)
  })

  it('le fil du bas pend plus bas que celui du haut', () => {
    const repos = { amplitude: 0, phase: 0 }
    expect(yFil(1, 0.5, repos, 0)).toBeGreaterThan(yFil(0, 0.5, repos, 0))
  })
})

describe('distanceGare', () => {
  it('vaut zéro à quai', () => {
    expect(distanceGare(0, 0, 2273)).toBe(0)
  })

  it('vaut une étape de sol quand la gare est la prochaine', () => {
    expect(distanceGare(1, 0, 2273)).toBe(2273)
  })

  it('décroît avec l’avancement de l’étape', () => {
    expect(distanceGare(1, 0.5, 2273)).toBeCloseTo(1136.5)
  })

  it('devient négative une fois la gare dépassée', () => {
    expect(distanceGare(0, 0.5, 2273)).toBeLessThan(0)
  })
})

describe('solParEtape', () => {
  it('une étape de passage couvre plus de sol qu’une étape avec arrêt', () => {
    expect(solParEtape(false, false)).toBeGreaterThan(solParEtape(true, true))
  })

  it('une étape à pleine vitesse vaut la vitesse de la voie fois sa durée', () => {
    expect(solParEtape(false, false)).toBeCloseTo(900 * 0.4 * 9, 0)
  })

  it('freiner coûte plus de sol que démarrer : le freinage est deux fois plus long', () => {
    const perteFreinage = solParEtape(false, false) - solParEtape(false, true)
    const perteDemarrage = solParEtape(false, false) - solParEtape(true, false)
    expect(perteFreinage).toBeGreaterThan(perteDemarrage)
  })
})

describe('les câbles sur la ligne', () => {
  it('sur un lien direct vers « plus loin », ils sont déjà à leur place', () => {
    // Pas d'approche : la gare est là, l'étape n'a pas commencé.
    expect(distanceGare(forwardSteps('plus-loin', 'plus-loin'), 0, solParEtape(true, true))).toBe(0)
  })

  it('depuis « ici », ils sont une étape plus loin et approchent', () => {
    const sol = solParEtape(true, true)
    const debut = distanceGare(forwardSteps('ici', 'plus-loin'), 0, sol)
    const moitie = distanceGare(forwardSteps('ici', 'plus-loin'), 0.5, sol)
    expect(debut).toBeCloseTo(sol)
    expect(moitie).toBeLessThan(debut)
    expect(moitie).toBeGreaterThan(0)
  })

  it('depuis « là-haut », ils sont loin derrière : trois étapes à faire', () => {
    expect(forwardSteps('la-haut', 'plus-loin')).toBe(3)
  })
})

describe('ancreSuivante', () => {
  it('se pose où elle peut au premier appel', () => {
    expect(ancreSuivante(null, 3, 0)).toBe(3)
  })

  it('ne saute pas tant que l’île précédente n’est pas hors champ', () => {
    // Le train vient de quitter « plus loin » : la gare suivante dit que la
    // prochaine est à trois étapes. L'île doit continuer de s'éloigner.
    expect(ancreSuivante(0, 4, 1)).toBe(0)
    expect(ancreSuivante(0, 4, RECUL_HORS_CHAMP - 0.1)).toBe(0)
  })

  it('reprend la suivante une fois l’île bien derrière', () => {
    expect(ancreSuivante(0, 4, RECUL_HORS_CHAMP + 0.1)).toBe(4)
  })

  it('laisse l’ancre tranquille quand la gare est encore devant', () => {
    expect(ancreSuivante(3, 3, 1)).toBe(3)
  })
})

describe('POTEAU', () => {
  it('porte ses isolateurs aux bouts des bras, pas au-delà', () => {
    for (const bras of POTEAU.bras) {
      expect(bras.isolateurs).toBeGreaterThan(0)
      expect(bras.isolateurs).toBeLessThan(bras.demi)
    }
  })

  it('accroche ses haubans au fût, sous le bras', () => {
    for (const bras of POTEAU.bras) {
      expect(bras.hauban).toBeGreaterThan(bras.epaisseur)
    }
  })

  it('a un bras plus large en haut qu’en bas', () => {
    expect(POTEAU.bras[0].demi).toBeGreaterThan(POTEAU.bras[1].demi)
  })
})
