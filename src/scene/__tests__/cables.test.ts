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
  legsDeLIle,
  solRestant,
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

describe('solRestant', () => {
  const profil = { demarrage: true, freinage: true }

  it('est nul quand il n’y a plus rien à parcourir', () => {
    expect(solRestant(0, 0, profil)).toBe(0)
    expect(solRestant(-0.5, 0, profil)).toBe(0)
  })

  it('compte une étape entière quand il en reste exactement une', () => {
    expect(solRestant(1, 1, profil)).toBeCloseTo(solParEtape(true, true))
  })

  it('décroît tout au long de l’étape', () => {
    const a = solRestant(1, 1, profil)
    const b = solRestant(0.5, 1, profil)
    const c = solRestant(0.01, 1, profil)
    expect(b).toBeLessThan(a)
    expect(c).toBeLessThan(b)
    expect(c).toBeLessThan(50)
  })

  it('ne saute pas au passage d’une étape à la suivante', () => {
    // C'est **le** piège : juste avant l'arrivée il reste un chouia plus d'une
    // étape, juste après il en reste exactement une. Les deux doivent donner
    // la même chose, sans quoi l'île se téléporte d'une étape entière.
    // Chaque côté avec le profil de **son** étape courante : avant la
    // frontière on traverse, après on est sur l'étape qui freine en gare.
    const avant = solRestant(1.001, 2, { demarrage: false, freinage: false })
    const apres = solRestant(1, 1, { demarrage: false, freinage: true })
    expect(Math.abs(avant - apres)).toBeLessThan(10)
  })

  it('ne saute pas à l’arrivée en gare : une étape à venir redémarre', () => {
    // Le dernier piège de la chaîne. Juste avant l'arrêt il reste une étape
    // **entière** au-delà du terminus : elle repartira d'un arrêt, donc elle
    // est plus courte. Si on la compte comme une étape lancée, l'estimation se
    // révise de trois cents pixels à l'instant où le train s'immobilise.
    const roulant = solRestant(1.0001, 1, { demarrage: false, freinage: true })
    const arrete = solRestant(1, 0, { demarrage: true, freinage: true })
    expect(Math.abs(roulant - arrete)).toBeLessThan(5)
  })

  it('compte les étapes entières qui suivent, chacune avec son profil', () => {
    const une = solRestant(1, 1, profil)
    const trois = solRestant(3, 3, profil)
    expect(trois).toBeGreaterThan(2 * une)
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

describe('legsDeLIle', () => {
  it('avance avec l’étape', () => {
    expect(legsDeLIle(3, 0.4, 0.25)).toBeCloseTo(3.25)
  })

  it('ne compte pas deux fois l’étape qui vient de finir', () => {
    // À l'image où l'étape se termine, le compteur vient d'être incrémenté et
    // l'avancement vaut encore 1. Les additionner ferait sauter l'île d'une
    // étape entière — ce qu'on voit en arrivant à « ici » après un tour.
    const avant = legsDeLIle(3, 0.999, 0.999)
    const apres = legsDeLIle(4, 1, 1)
    expect(Math.abs(apres - avant)).toBeLessThan(0.01)
  })

  it('ne recule pas au départ suivant, quand la phase repart de zéro', () => {
    const arret = legsDeLIle(4, 1, 1)
    const depart = legsDeLIle(4, 0, 0)
    expect(depart).toBeCloseTo(arret)
  })
})

