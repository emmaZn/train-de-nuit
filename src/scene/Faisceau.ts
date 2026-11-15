/**
 * Le faisceau du réverbère de « ailleurs » (spec §6.2).
 *
 * **Ce n'est pas un cône peint.** C'est de la poussière — des points pleins, de
 * la même matière que `Sky.ts` — qui s'allume dans un cône. Un dégradé plaqué
 * serait une mi-teinte, et le projet n'en allume jamais.
 *
 * Il porte **sa propre population**, il n'éclaire pas celle du fond : la
 * poussière à `1/600` par pixel² ne met qu'une centaine de points dans un cône
 * de cette taille, sans marge, et elle est encore réduite sur mobile.
 *
 * Il se monte dans la racine **allumée** du quai, donc dans `lumieres` : hors de
 * tout filtre d'assombrissement, et **devant** le voile du pied du massif — qui,
 * sans cela, éteindrait le bas du cône, là où il est le plus lumineux. Rien
 * n'est à reconstruire ici : c'est l'ordre des plans (`plansDuDecor`).
 *
 * Les réglages marqués « provisoire » attendent la séance avec Emmanuelle
 * (spec §7 : « la densité et la portée du faisceau »).
 */
import { Container, Graphics } from 'pixi.js'
import type { Frame } from './layout'
import { GRAIN_ECRAN } from './poses'
import { PIECES } from './quai'
import { alea } from './Sky'
import type { Grain } from './Sky'

export type Point = { x: number; y: number }

/** Le cône, en pixels de cadre, depuis la lanterne. */
export type Cone = {
  sommet: Point
  /** Les abscisses des deux coins de la base, à `sommet.y + hauteur`. */
  base: [number, number]
  hauteur: number
}

/** Où la lanterne finit, en unités du SVG du réverbère (`reverbere.svg`) : le bas du corps vitré. */
const BAS_LANTERNE_SVG = 48
/** Le cadre du dessin : 560 unités de haut, posées à `piece.hauteur` pixels. */
const HAUTEUR_SVG = 560

/** Demi-ouverture de la base, en pixels de cadre. PROVISOIRE (§7) : à régler à vue. */
const DEMI_BASE = 170
/** De combien le cône s'arrête au-dessus du sol, en pixels. PROVISOIRE (§7) : à régler à vue. */
const GARDE_AU_SOL = 36

/** Un grain par ce nombre de pixels² : 4 fois la poussière du fond (`1/600`). PROVISOIRE (§7). */
const DENSITE = 1 / 150
/** CONCEPT.md §11 : moins de particules sur mobile — mais le faisceau reste plus dense que le fond. */
const FACTEUR_MOBILE = 0.6
/** Sous ce nombre, un faisceau ne se lit plus comme un faisceau. */
const PLANCHER = 40

export function coneDuFaisceau(piece: typeof PIECES.reverbere): Cone {
  const sommet = {
    x: piece.x,
    y: piece.pied - piece.hauteur + (BAS_LANTERNE_SVG * piece.hauteur) / HAUTEUR_SVG,
  }
  return {
    sommet,
    base: [piece.x - DEMI_BASE, piece.x + DEMI_BASE],
    hauteur: piece.pied - GARDE_AU_SOL - sommet.y,
  }
}

/**
 * Les grains du faisceau : un tirage stable (`graine`), uniforme sur la surface
 * du cône — la profondeur se tire en racine carrée, sinon le sommet, plus
 * étroit, serait plus dense que la base.
 *
 * Plus lumineux vers le bas, comme la maquette : le bas du cône est la partie
 * qui se détache du massif.
 */
export function grainsDuFaisceau(cone: Cone, graine: number, mobile: boolean): Grain[] {
  const aire = ((cone.base[1] - cone.base[0]) * cone.hauteur) / 2
  const brut = aire * DENSITE * (mobile ? FACTEUR_MOBILE : 1)
  const nombre = Math.max(PLANCHER, Math.round(brut))
  const suivant = alea(graine)
  const grains: Grain[] = []
  for (let i = 0; i < nombre; i += 1) {
    const t = Math.sqrt(suivant())
    const u = suivant()
    const gauche = cone.sommet.x + (cone.base[0] - cone.sommet.x) * t
    const droite = cone.sommet.x + (cone.base[1] - cone.sommet.x) * t
    grains.push({
      x: gauche + (droite - gauche) * u,
      y: cone.sommet.y + cone.hauteur * t,
      r: 0.5 + suivant() * 1.2,
      a: (0.3 + suivant() * 0.5) * (0.55 + 0.45 * t),
    })
  }
  return grains
}

/** Les couches respirent chacune à leur rythme : quelques `Graphics`, pas un par grain. */
const COUCHES = 4
/** De combien une couche s'éteint au creux de sa respiration. */
const CREUX = 0.45

export class Faisceau {
  private readonly racine = new Container()
  private readonly couches: Graphics[] = []
  private horloge = 0
  private echelle = 0
  private mobile: boolean | null = null

  constructor(parent: Container) {
    for (let i = 0; i < COUCHES; i += 1) {
      const g = new Graphics()
      this.couches.push(g)
      this.racine.addChild(g)
    }
    parent.addChild(this.racine)
  }

  /** Retrace les grains quand l'échelle ou la taille de l'écran change — pas avant. */
  cadrer(frame: Frame, mobile: boolean): void {
    if (frame.scale === this.echelle && mobile === this.mobile) return
    this.echelle = frame.scale
    this.mobile = mobile
    // Jamais plus petit qu'un demi-grain d'écran : un point de moins d'un pixel
    // se lisserait en mi-teinte, et le projet n'en allume pas.
    const rMin = GRAIN_ECRAN / 2 / frame.scale
    for (const g of this.couches) g.clear()
    const grains = grainsDuFaisceau(coneDuFaisceau(PIECES.reverbere), 11, mobile)
    grains.forEach((grain, i) => {
      this.couches[i % COUCHES]
        .circle(grain.x, grain.y, Math.max(grain.r, rMin))
        .fill({ color: 0xffffff, alpha: grain.a })
    })
  }

  /** Ça bouge tout seul : chaque couche respire à son rythme, déphasée des autres. */
  animer(dt: number): void {
    this.horloge += dt
    this.couches.forEach((g, i) => {
      const onde = 0.5 + 0.5 * Math.sin(this.horloge * (0.6 + 0.35 * i) + i * 1.9)
      g.alpha = 1 - CREUX * onde
    })
  }
}
