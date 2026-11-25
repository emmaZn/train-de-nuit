import { Container, Graphics } from 'pixi.js'
import { describe, expect, it } from 'vitest'

import { Faisceau, grainsDuFaisceau, nappesDuCone } from '@/scene/Faisceau'
import { coneDuFaisceau, dansLeCone } from '@/scene/cone'
import type { Cone } from '@/scene/cone'
import { Quai } from '@/scene/QuaiLayer'
import { horsDuReflet, plansDuDecor } from '@/scene/Scene'
import { PIECES } from '@/scene/quai'
import { HORIZON, STAGE } from '@/scene/layout'
import type { Frame } from '@/scene/layout'

const cone = coneDuFaisceau(PIECES.reverbere)

/** Un triangle : sommet à la lanterne, base à `sommet.y + hauteur`. */
function aireDuCone(c: Cone): number {
  return ((c.base[1] - c.base[0]) * c.hauteur) / 2
}

describe('la géométrie du faisceau', () => {
  it('part de la lanterne, au-dessus du pied du réverbère', () => {
    expect(cone.sommet.x).toBe(PIECES.reverbere.x)
    expect(cone.sommet.y).toBeGreaterThan(PIECES.reverbere.pied - PIECES.reverbere.hauteur)
    expect(cone.sommet.y).toBeLessThan(PIECES.reverbere.pied)
  })

  it('descend jusqu’au quai sans passer sous la voie', () => {
    expect(cone.sommet.y + cone.hauteur).toBeLessThanOrEqual(HORIZON)
  })

  it('s’ouvre vers le bas, de part et d’autre du mât, et tient dans le cadre', () => {
    expect(cone.base[0]).toBeLessThan(cone.sommet.x)
    expect(cone.base[1]).toBeGreaterThan(cone.sommet.x)
    expect(cone.base[0]).toBeGreaterThanOrEqual(0)
    expect(cone.base[1]).toBeLessThanOrEqual(STAGE.width)
  })
})

describe('les grains du faisceau', () => {
  it('le faisceau porte sa propre population, plus dense que la poussière du fond', () => {
    const aire = aireDuCone(cone)
    expect(grainsDuFaisceau(cone, 1, false).length).toBeGreaterThan(aire / 600)
  })

  it('même sur mobile, il reste plus dense que la poussière du fond', () => {
    const aire = aireDuCone(cone)
    expect(grainsDuFaisceau(cone, 1, true).length).toBeGreaterThan(aire / 600)
  })

  it('le faisceau garde un plancher de grains sur mobile', () => {
    const minuscule: Cone = { sommet: { x: 100, y: 0 }, base: [95, 105], hauteur: 10 }
    expect(grainsDuFaisceau(minuscule, 1, true).length).toBeGreaterThanOrEqual(40)
    // Le vrai cône, sur mobile, reste très au-dessus du plancher.
    expect(grainsDuFaisceau(cone, 1, true).length).toBeGreaterThan(100)
  })

  it('tous les grains tombent dans le cône', () => {
    for (const mobile of [false, true]) {
      for (const g of grainsDuFaisceau(cone, 1, mobile)) expect(dansLeCone(cone, g)).toBe(true)
    }
  })

  it('le tirage est stable : même graine, mêmes grains', () => {
    expect(grainsDuFaisceau(cone, 3, false)).toEqual(grainsDuFaisceau(cone, 3, false))
    expect(grainsDuFaisceau(cone, 3, false)).not.toEqual(grainsDuFaisceau(cone, 4, false))
  })

  it('les grains sont de la même matière que la poussière : opacité et rayon dans ses bornes hautes', () => {
    for (const g of grainsDuFaisceau(cone, 1, false)) {
      expect(g.a).toBeGreaterThan(0)
      expect(g.a).toBeLessThanOrEqual(1)
      expect(g.r).toBeGreaterThan(0)
      expect(g.r).toBeLessThanOrEqual(2)
    }
  })

  it('le bas du cône est plus lumineux que le haut', () => {
    const grains = grainsDuFaisceau(cone, 1, false)
    const moyenne = (liste: typeof grains) => liste.reduce((s, g) => s + g.a, 0) / liste.length
    const milieu = cone.sommet.y + cone.hauteur / 2
    expect(moyenne(grains.filter((g) => g.y > milieu))).toBeGreaterThan(
      moyenne(grains.filter((g) => g.y <= milieu)),
    )
  })
})

/**
 * Le cône peint (réglage 3). Ce qui se garde ici n'est pas la valeur des
 * réglages — ils sont faits pour bouger — mais les deux choses que la maquette
 * demande et qu'on ne verrait pas casser dans jsdom : il tient dans le cône, et
 * il s'éteint avant les rails.
 */
describe('le cône peint', () => {
  const nappes = nappesDuCone(cone)

  it('tient tout entier dans le cône, donc jamais sur les rails', () => {
    for (const nappe of nappes) {
      for (let i = 0; i < nappe.points.length; i += 2) {
        expect(dansLeCone(cone, { x: nappe.points[i], y: nappe.points[i + 1] })).toBe(true)
      }
    }
  })

  it('s’éteint vers le bas : la dernière tranche est plus pâle que la première', () => {
    const haut = nappes[0].alpha
    const bas = nappes[nappes.length - 1].alpha
    expect(haut).toBeGreaterThan(0)
    expect(bas).toBeGreaterThan(0)
    expect(bas).toBeLessThan(haut / 10)
  })

  it('se recouvre : plusieurs nappes par tranche, pour faire le dégradé latéral', () => {
    const parTranche = nappes.filter((n) => n.points[1] === nappes[0].points[1])
    expect(parTranche.length).toBeGreaterThan(1)
    // Elles partagent l'alpha de leur tranche : c'est le cumul qui éclaire l'axe.
    expect(new Set(parTranche.map((n) => n.alpha)).size).toBe(1)
  })
})

describe('le faisceau dans la scène', () => {
  const cadre: Frame = { scale: 0.5, offsetX: 0, offsetY: 0 }

  function poser(reducedMotion = false) {
    const decor = new Container()
    const plans = plansDuDecor(decor)
    const planQuai = new Container()
    plans.plateauFond.addChild(planQuai)
    const quai = new Quai(planQuai, plans.lumieres, reducedMotion)
    return { plans, quai }
  }

  it('se monte avec le réverbère, dans le groupe des lumières', () => {
    const { plans, quai } = poser()
    expect(quai.allume.parent).toBe(plans.lumieres)
    expect(quai.allume.children).toContain(quai.lumiere.groupe)
  })

  it('respire : l’opacité des couches bouge quand on l’anime', () => {
    const f = new Faisceau(new Container())
    f.cadrer(cadre, false)
    const avant = f.opacites
    f.animer(1.3)
    expect(f.opacites).not.toEqual(avant)
  })

  it('sous mouvement réduit, il ne respire pas : l’opacité ne bouge pas', () => {
    const f = new Faisceau(new Container(), true)
    f.cadrer(cadre, false)
    const avant = f.opacites
    f.animer(1.3)
    f.animer(2.1)
    expect(f.opacites).toEqual(avant)
  })

  it('sous mouvement réduit, il est pourtant là, visible et immobile', () => {
    const { quai } = poser(true)
    quai.cadrer(cadre, 1, false)
    quai.animer(1.3)
    const f = quai.lumiere
    expect(f.groupe.parent).toBe(quai.allume)
    expect(f.groupe.visible).toBe(true)
    expect(f.groupe.children.length).toBeGreaterThan(0)
    expect(f.opacites.every((a) => a > 0)).toBe(true)
    expect(f.groupe.children.some((c) => !c.destroyed)).toBe(true)
  })
})

describe('la neige du faisceau', () => {
  const cadre: Frame = { scale: 0.5, offsetX: 0, offsetY: 0 }

  function descend(racine: Container, cible: Container): boolean {
    let c: Container | null = cible
    while (c) {
      if (c === racine) return true
      c = c.parent
    }
    return false
  }

  it('le réverbère éteint, la neige du cône s’éteint avec lui', () => {
    const f = new Faisceau(new Container())
    f.cadrer(cadre, false)
    f.allumer(false)
    expect(f.groupe.visible).toBe(false)
    // Sans interrupteur à elle : elle vit sous la racine que `allumer` cache.
    expect(descend(f.groupe, f.neige.racine)).toBe(true)
    expect(f.neige.racine.visible).toBe(true)
  })

  it('est découpée au cône : un masque, sur un conteneur immobile', () => {
    const f = new Faisceau(new Container())
    const masque = f.neige.racine.mask as Graphics | null
    expect(masque).toBeTruthy()
    // Le masque est seul à retenir les flocons dans le faisceau : sa géométrie
    // est l'invariant, pas son existence. Il doit valoir le cône.
    const { minX, maxX, minY, maxY } = masque!.getLocalBounds()
    expect(minX).toBeCloseTo(cone.base[0], 3)
    expect(maxX).toBeCloseTo(cone.base[1], 3)
    expect(minY).toBeCloseTo(cone.sommet.y, 3)
    expect(maxY).toBeCloseTo(cone.sommet.y + cone.hauteur, 3)
    f.cadrer(cadre, false)
    f.animer(2)
    expect(f.neige.racine.y).toBe(0)
  })

  /**
   * **La boîte ne dit rien de la forme.** Depuis que les flocons sont tirés sur
   * le **rectangle** englobant (`floconsDuCone`), le masque est la seule chose
   * qui les retient dans le cône : c'est lui l'invariant. Or la garde ci-dessus
   * ne regarde que `getLocalBounds()`, et un rectangle, un losange ou un
   * triangle retourné y passeraient tous les quatre.
   *
   * On interroge donc le masque **point par point**, et on le confronte à
   * `dansLeCone`, qui est la vérité du cône. Les quatre sondes nommées disent
   * la forme en clair — deux coins hauts dehors, deux coins bas dedans : c'est
   * exactement ce qui sépare le triangle des trois autres — et le balayage
   * garde le reste. Les points à moins d'un pixel d'une arête sont laissés de
   * côté : un test d'appartenance n'est pas tenu au dernier bit.
   */
  it('et ce masque est bien le triangle du cône, pas sa boîte', () => {
    const f = new Faisceau(new Container())
    const masque = f.neige.racine.mask as Graphics
    const dedans = (x: number, y: number) => masque.containsPoint({ x, y })
    const bas = cone.sommet.y + cone.hauteur

    // Les deux coins hauts de la boîte sont **hors** du cône : un rectangle les
    // prendrait. Le sommet, lui, est dedans : un triangle retourné ne l'aurait pas.
    expect(dedans(cone.base[0] + 5, cone.sommet.y + 5), 'coin haut gauche').toBe(false)
    expect(dedans(cone.base[1] - 5, cone.sommet.y + 5), 'coin haut droit').toBe(false)
    expect(dedans(cone.sommet.x, cone.sommet.y + 5), 'sous le sommet').toBe(true)
    // Les deux coins bas sont **dans** le cône : un losange inscrit dans la
    // même boîte s'y refermerait sur sa pointe basse.
    expect(dedans(cone.base[0] + 5, bas - 2), 'coin bas gauche').toBe(true)
    expect(dedans(cone.base[1] - 5, bas - 2), 'coin bas droit').toBe(true)
    expect(dedans(cone.sommet.x, bas - 2), 'milieu de la base').toBe(true)

    /** Le point est-il franc — à plus d'un pixel de toute arête ? Sinon on passe. */
    const franc = (x: number, y: number): boolean | null => {
      const a = dansLeCone(cone, { x, y })
      for (const dx of [-1, 1]) {
        for (const dy of [-1, 1]) {
          if (dansLeCone(cone, { x: x + dx, y: y + dy }) !== a) return null
        }
      }
      return a
    }

    let compares = 0
    let dehors = 0
    for (let i = 0; i <= 24; i += 1) {
      for (let j = 0; j <= 24; j += 1) {
        const x = cone.base[0] + ((cone.base[1] - cone.base[0]) * i) / 24
        const y = cone.sommet.y + (cone.hauteur * j) / 24
        const attendu = franc(x, y)
        if (attendu === null) continue
        compares += 1
        if (!attendu) dehors += 1
        expect(dedans(x, y), `(${x.toFixed(1)}, ${y.toFixed(1)})`).toBe(attendu)
      }
    }
    // Le balayage a bien vu les deux côtés : sans ça il ne garderait rien.
    expect(compares).toBeGreaterThan(400)
    expect(dehors).toBeGreaterThan(100)
  })

  it('porte des flocons, COUCHES_NEIGE couches, tracés au cadrage', () => {
    const f = new Faisceau(new Container())
    expect(f.neige.nombreDeFlocons).toBe(0)
    f.cadrer(cadre, false)
    expect(f.neige.nombreDeFlocons).toBeGreaterThan(0)
    expect(f.neige.decalages).toHaveLength(4)
  })

  it('tombe : les couches se décalent, chacune à sa vitesse', () => {
    const f = new Faisceau(new Container())
    f.cadrer(cadre, false)
    f.animer(0.5)
    const d = f.neige.decalages
    expect(d.every((y) => y > 0)).toBe(true)
    expect(new Set(d).size).toBe(d.length)
  })

  it('sous mouvement réduit, les flocons sont posés mais ne tombent pas', () => {
    const f = new Faisceau(new Container(), true)
    f.cadrer(cadre, false)
    f.animer(0.5)
    f.animer(1.5)
    expect(f.neige.nombreDeFlocons).toBeGreaterThan(0)
    expect(f.neige.decalages.every((y) => y === 0)).toBe(true)
  })

  it('suit le cône quand l’échelle change : même population, même nombre, rien de plus', () => {
    const f = new Faisceau(new Container())
    f.cadrer({ scale: 0.5, offsetX: 0, offsetY: 0 }, false)
    const n = f.neige.nombreDeFlocons
    const h = f.neige.hauteurDeBouclage
    f.cadrer({ scale: 1.7, offsetX: 0, offsetY: 0 }, false)
    expect(f.neige.nombreDeFlocons).toBe(n)
    // Le bouclage est la hauteur du cône, en pixels de cadre : l'échelle n'y change rien.
    expect(f.neige.hauteurDeBouclage).toBe(h)
    expect(h).toBe(cone.hauteur)
  })

  it('moins de flocons sur mobile', () => {
    const grand = new Faisceau(new Container())
    grand.cadrer(cadre, false)
    const petit = new Faisceau(new Container())
    petit.cadrer(cadre, true)
    expect(petit.neige.nombreDeFlocons).toBeLessThan(grand.neige.nombreDeFlocons)
  })

  it('elle commence absente, et la nuit seule la fait venir : à nuit = 0 les flocons sont éteints, le cône reste là', () => {
    const f = new Faisceau(new Container())
    f.cadrer(cadre, false)
    expect(f.neige.racine.alpha).toBe(0)
    f.setNuit(1)
    expect(f.neige.racine.alpha).toBe(1)
    f.setNuit(0)
    expect(f.neige.racine.alpha).toBe(0)
    // Le cône peint, lui, ne dépend pas de la nuit : toujours là, toujours visible.
    expect(f.groupe.visible).toBe(true)
    expect(f.groupe.children.some((c) => c !== f.neige.racine && c.visible && c.alpha > 0)).toBe(true)
    // Une nuit qui n'est pas un nombre ne passe pas.
    f.setNuit(0.6)
    f.setNuit(Number.NaN)
    expect(f.neige.racine.alpha).toBe(0.6)
  })

  it('le quai passe la nuit à la neige du faisceau, pas au cône peint', () => {
    const decor = new Container()
    const plans = plansDuDecor(decor)
    const planQuai = new Container()
    plans.plateauFond.addChild(planQuai)
    const quai = new Quai(planQuai, plans.lumieres, false)
    quai.cadrer(cadre, 1, false)
    quai.avancer(0, 0)
    expect(quai.lumiere.neige.racine.alpha).toBe(0)
    quai.avancer(0, 1)
    expect(quai.lumiere.neige.racine.alpha).toBe(1)
    expect(quai.lumiere.groupe.visible).toBe(true)
  })

  it('sort du reflet avec le plan de la neige, et elle seule : le cône peint s’y reflète', () => {
    const decor = new Container()
    const plans = plansDuDecor(decor)
    const f = new Faisceau(plans.lumieres)
    f.cadrer(cadre, false)
    let neigeVue = true
    let faisceauVu = false
    horsDuReflet(
      plans,
      decor,
      2,
      () => {
        neigeVue = f.neige.racine.visible
        faisceauVu = f.groupe.visible
      },
      [f.neige.racine],
    )
    expect(neigeVue).toBe(false)
    expect(faisceauVu).toBe(true)
    // Tout est remis en place.
    expect(f.neige.racine.visible).toBe(true)
  })
})

/**
 * De jour, il n'y a pas de faisceau.
 *
 * C'est la pièce la plus « lueur » de toute la scène : un cône de dégradé.
 * Sur du papier, un dégradé blanc en négatif donne une tache. La piste C,
 * choisie le 25/11 : « La lanterne, le cadran, les carreaux restent de
 * l'encre. La lueur s'en va. » Conséquence assumée : « ailleurs » perd son
 * théâtre de jour — la scène se délave au lieu de s'assombrir.
 */
describe('le faisceau selon le mode', () => {
  it('ne se montre pas de jour', () => {
    const faisceau = new Faisceau(new Container())
    faisceau.setMode('jour')
    expect(faisceau.groupe.visible).toBe(false)
  })

  it('reste caché de jour même quand on rallume la lampe', () => {
    const faisceau = new Faisceau(new Container())
    faisceau.setMode('jour')
    faisceau.allumer(true)
    expect(faisceau.groupe.visible).toBe(false)
  })

  it('revient la nuit, allumé comme il l’était', () => {
    const faisceau = new Faisceau(new Container())
    faisceau.allumer(true)
    faisceau.setMode('jour')
    faisceau.setMode('nuit')
    expect(faisceau.groupe.visible).toBe(true)
  })

  it('ne se rallume pas en revenant la nuit si la lampe est éteinte', () => {
    const faisceau = new Faisceau(new Container())
    faisceau.allumer(false)
    faisceau.setMode('jour')
    faisceau.setMode('nuit')
    expect(faisceau.groupe.visible).toBe(false)
  })
})
