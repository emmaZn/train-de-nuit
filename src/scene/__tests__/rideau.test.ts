import { readFileSync } from 'node:fs'
import gsap from 'gsap'
import { afterEach, describe, expect, it } from 'vitest'

import { HAUTEUR_FRISE, HORIZON, cadrageScene } from '@/scene/layout'
import type { Frame } from '@/scene/layout'
import { HALO_HORLOGE, HORLOGE } from '@/scene/quai'
import {
  BRAS,
  DEGAGEMENT_ECRAN,
  RIDEAU,
  Rideau,
  horlogeTouchee,
  yPoseA,
  yRangeA,
} from '@/scene/rideau'

describe('la géométrie du rideau', () => {
  /**
   * Les fenêtres où les deux propriétés ont été trouvées en défaut : téléphones
   * (le décalage de `cadrageScene` y est de 60 px **d'écran**), et fenêtres
   * larges et basses (le cadre y est rogné en haut, jusque sous la frise).
   */
  const FENETRES: ReadonlyArray<readonly [number, number]> = [
    [320, 568], [390, 844], [600, 960], [768, 1024],
    [1440, 900], [1920, 600], [2560, 720], [3440, 800],
  ]

  // Le test compare en **pixels d'écran** : la frise et le bord de la fenêtre y
  // sont posés, et le rideau dans le cadre. Un seul nombre de cadre ne peut pas
  // dire « au-dessus de la fenêtre » : le rapport dépend de l'échelle.
  const ecranY = (frame: Frame, y: number) => frame.offsetY + y * frame.scale

  it.each(FENETRES)('range le rideau hors de la fenêtre à %i×%i', (w, h) => {
    const { frame } = cadrageScene(w, h)
    const bas = ecranY(frame, yRangeA(frame) + RIDEAU.hauteur)
    expect(bas).toBeLessThanOrEqual(-DEGAGEMENT_ECRAN + 1e-6)
  })

  it.each(FENETRES)('pose la plaque sous la frise, bandeau compris, à %i×%i', (w, h) => {
    const { frame } = cadrageScene(w, h)
    expect(ecranY(frame, yPoseA(frame))).toBeGreaterThanOrEqual(
      HAUTEUR_FRISE + DEGAGEMENT_ECRAN - 1e-6,
    )
    // On ne monte jamais plus haut que la cible : `yPoseA` ne fait que borner vers le bas.
    expect(yPoseA(frame)).toBeGreaterThanOrEqual(RIDEAU.yPose)
  })

  it('garde la plaque posée au-dessus de la gare', () => {
    // En pixels de cadre, le sol de la gare et la plaque partagent un repère.
    expect(RIDEAU.yPose + RIDEAU.hauteur).toBeLessThan(HORIZON)
    for (const [w, h] of FENETRES) {
      const { frame } = cadrageScene(w, h)
      expect(yPoseA(frame) + RIDEAU.hauteur, `${w}×${h}`).toBeLessThan(HORIZON)
    }
  })

  /**
   * Les bras sont symétriques et dans la largeur de la plaque. Le repère est
   * celui de la plaque elle-même (0 à `largeur`) : `RIDEAU` n'a plus d'abscisse
   * depuis que le panneau se centre sur la fenêtre au lieu de se poser à un `x`
   * de cadre.
   */
  it('pose deux bras symétriques, dans la largeur de la plaque', () => {
    const g = BRAS.retrait
    const d = RIDEAU.largeur - BRAS.retrait
    expect(g).toBeGreaterThan(0)
    expect(d).toBeLessThan(RIDEAU.largeur)
    expect(d - g).toBeCloseTo(RIDEAU.largeur - 2 * BRAS.retrait, 6)
  })

  it('ouvre l’horloge au clic sur son halo, et pas à côté', () => {
    expect(horlogeTouchee(HORLOGE.x, HORLOGE.y)).toBe(true)
    expect(horlogeTouchee(HORLOGE.x + HORLOGE.rayon * 2.2, HORLOGE.y)).toBe(true)
    expect(horlogeTouchee(HORLOGE.x + HORLOGE.rayon * 3, HORLOGE.y)).toBe(false)
  })

  /**
   * La cible est le **halo** et non le seul cadran : c'est ce qui la garde touchable
   * une fois la scène réduite. L'assertion qui portait cette phrase comparait deux
   * constantes de cadre l'une à l'autre — un `2,4` recopié de `HALO_HORLOGE` au lieu
   * d'être importé, et une échelle plancher de `0,65` que rien ne justifiait et qui
   * est fausse : à 1280 × 720 l'échelle vaut 0,592, à 1024 × 600 elle vaut 0,493.
   *
   * On mesure donc le **diamètre à l'écran**, par l'échelle que la scène applique
   * vraiment, aux fenêtres éprouvées ici. C'est tout ce que ce test établit : il ne
   * promet pas 44 px à **toute** fenêtre. Panneau posé, de toute façon, ce n'est
   * plus l'horloge qu'on vise mais le disque posé sur l'heure du bandeau, que
   * `PanneauDeparts.test.ts` garde à 44 px.
   */
  it.each(FENETRES)('fait de l’horloge une cible de 44 px d’écran à %i×%i', (w, h) => {
    const { frame } = cadrageScene(w, h)
    // On mesure la **cible**, pas le halo dessiné. Les deux coïncidaient tant
    // que la scène collait à l'écran ; depuis qu'elle recule, le halo tombe à
    // 34 px sur un petit téléphone et c'est `horlogeTouchee` qui tient les 44,
    // en élargissant sa cible à mesure que l'échelle baisse — comme le fait
    // `cibleReverbere` depuis toujours.
    const demi = 22 / frame.scale
    expect(horlogeTouchee(HORLOGE.x + demi, HORLOGE.y, frame.scale)).toBe(true)
    expect(horlogeTouchee(HORLOGE.x, HORLOGE.y + demi, frame.scale)).toBe(true)
  })

  it('n’élargit la cible de l’horloge que lorsque le halo n’y suffit plus', () => {
    // Sur une grande fenêtre, le halo dépasse déjà les 44 px : la cible reste
    // celle qu'on voit, et ne déborde pas sur ce qu'il y a autour.
    const grand = cadrageScene(2560, 1080).frame
    const halo = HORLOGE.rayon * HALO_HORLOGE.rayon
    expect(2 * halo * grand.scale).toBeGreaterThanOrEqual(44)
    expect(horlogeTouchee(HORLOGE.x + halo * 1.05, HORLOGE.y, grand.scale)).toBe(false)
  })
})

/**
 * L'état du rideau. Il ne dessine plus rien — la plaque est en DOM (spec §4) —,
 * il tient une **fraction** de course et la relit sur le cadre courant.
 */
describe('Rideau', () => {
  // `cadrageScene` et jamais `fitStage` : c'est `cadrageScene` qui ajoute son
  // décalage à `offsetY` (20 px d'écran à 1440 × 900), et `yPoseA` comme
  // `yRangeA` le lisent. Un cadre de `fitStage` est un cadre que l'application
  // ne produit jamais.
  const CADRE = cadrageScene(1440, 900).frame

  /**
   * Avance la timeline globale de GSAP sans attendre le temps réel. `time()`
   * laisse passer les `onUpdate` ; c'est `seek()` qui les supprime par défaut.
   */
  function avancerGsap(secondes: number): void {
    gsap.globalTimeline.time(gsap.globalTimeline.time() + secondes)
  }

  const vivants: Rideau[] = []
  function nouveau(reducedMotion?: boolean): Rideau {
    const r = new Rideau(reducedMotion)
    vivants.push(r)
    return r
  }
  afterEach(() => {
    for (const r of vivants.splice(0)) r.destroy()
  })

  it('n’est nulle part avant son premier cadrage', () => {
    expect(Number.isNaN(nouveau().y)).toBe(true)
  })

  it('démarre rangé, hors de la fenêtre', () => {
    const r = nouveau()
    r.cadrer(CADRE)
    expect(r.baisse).toBe(false)
    expect(r.y).toBe(yRangeA(CADRE))
  })

  it('baisse jusqu’à sa position posée, et relève jusqu’à la rangée', () => {
    const r = nouveau()
    r.cadrer(CADRE)
    r.baisser()
    expect(r.baisse).toBe(true)
    avancerGsap(2)
    expect(r.y).toBeCloseTo(yPoseA(CADRE), 1)
    r.relever()
    expect(r.baisse).toBe(false)
    avancerGsap(2)
    expect(r.y).toBeCloseTo(yRangeA(CADRE), 1)
  })

  it('bascule d’un état à l’autre', () => {
    const r = nouveau(true)
    r.cadrer(CADRE)
    r.basculer()
    expect(r.baisse).toBe(true)
    r.basculer()
    expect(r.baisse).toBe(false)
  })

  /** Deux clics rapides : la seconde timeline repart d'où la première en était. */
  it('ne laisse pas deux timelines se disputer la plaque', () => {
    const r = nouveau()
    r.cadrer(CADRE)
    r.baisser()
    avancerGsap(0.4)
    const aMiCourse = r.y
    expect(aMiCourse).toBeGreaterThan(yRangeA(CADRE))
    r.relever()
    avancerGsap(0.05)
    expect(r.y).toBeLessThan(aMiCourse)
    avancerGsap(2)
    expect(r.y).toBeCloseTo(yRangeA(CADRE), 1)
  })

  it('sans animations, se pose d’un coup', () => {
    const r = nouveau(true)
    r.cadrer(CADRE)
    r.baisser()
    expect(r.y).toBe(yPoseA(CADRE))
    r.relever()
    expect(r.y).toBe(yRangeA(CADRE))
  })

  /**
   * **Review Focus nº 1**, côté scène : la fenêtre change en pleine descente. On
   * interpole une fraction et non un `y`, donc la plaque reste exactement à sa
   * fraction de course dans le nouveau cadre — elle ne vise jamais un `y` périmé
   * et ne saute pas.
   */
  it('suit le cadre quand la fenêtre change en pleine descente', () => {
    // Deux fenêtres dont `yPoseA` diffère : sur 1440×900 le plancher de 340
    // s'applique, sur 3440×800 non — sinon le test comparerait 340 à 340.
    // C'était 2560×720 ; depuis que la scène recule, cette fenêtre-là retombe
    // elle aussi sur le plancher, et il a fallu aller chercher plus large.
    const large = cadrageScene(3440, 800).frame
    expect(yPoseA(large)).not.toBeCloseTo(yPoseA(CADRE), 0)
    const r = nouveau()
    r.cadrer(CADRE)
    r.baisser()
    avancerGsap(0.4)
    const p = (r.y - yRangeA(CADRE)) / (yPoseA(CADRE) - yRangeA(CADRE))
    expect(p).toBeGreaterThan(0.2)
    expect(p).toBeLessThan(0.95)
    r.cadrer(large)
    expect(r.y).toBeCloseTo(yRangeA(large) * (1 - p) + yPoseA(large) * p, 6)
    avancerGsap(2)
    expect(r.y).toBeCloseTo(yPoseA(large), 1)
  })

  it('ne laisse plus de tween derrière lui une fois détruit', () => {
    const r = new Rideau()
    r.cadrer(CADRE)
    r.baisser()
    const etat = (r as unknown as { etat: object }).etat
    expect(gsap.getTweensOf(etat)).toHaveLength(1)
    r.destroy()
    expect(gsap.getTweensOf(etat)).toHaveLength(0)
  })

  it('est construit par la scène avant le manifeste, donc toujours cadré', () => {
    const src = readFileSync('src/scene/Scene.ts', 'utf8')
    const debut = src.indexOf('this.sky = new Sky')
    const cadrage = src.indexOf('this.cadrer()', debut)
    const pose = src.indexOf('new Rideau(')
    expect(debut).toBeGreaterThan(0)
    expect(pose).toBeGreaterThan(debut)
    expect(pose).toBeLessThan(cadrage)
  })

  /**
   * Il ne dessine plus : plus de `Container`, plus de `Graphics`, plus de Pixi
   * du tout. C'est ce qui permet au panneau de passer devant la frise, et ce qui
   * fait que la scène ne peut plus prétendre savoir ce que la plaque couvre.
   */
  it('n’importe plus le moteur de rendu', () => {
    const src = readFileSync('src/scene/rideau.ts', 'utf8')
    expect(src).not.toMatch(/from 'pixi\.js'/)
    expect(src).not.toMatch(/Graphics|Container/)
  })
})
