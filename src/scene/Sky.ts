import { Container, Graphics } from 'pixi.js'
import { alea } from './alea'
import { HORIZON, MONDE, SEUIL_MOBILE, cadrageScene } from './layout'
import type { Frame } from './layout'
import type { Grain } from './alea'

/**
 * Le générateur et le type du grain vivent dans `alea.ts`, en nombres purs :
 * les modules qui ne dessinent pas — les horaires, la neige — ne doivent pas
 * charger Pixi pour s'en servir. Ils se relisent ici pour que rien de ce qui
 * les importait de `Sky` n'ait à changer de chemin.
 */
export { alea }
export type { Grain }

/** One grain per this many square pixels. */
const DENSITE = 1 / 600
/** Below this, a small viewport would end up with an empty sky. */
const PLANCHER = 60
/** CONCEPT.md §11: fewer particles on mobile. */
const FACTEUR_MOBILE = 0.35

export function dustCount(viewportW: number, viewportH: number, mobile: boolean): number {
  const surface = Math.max(viewportW, 1) * Math.max(viewportH, 1)
  const brut = surface * DENSITE * (mobile ? FACTEUR_MOBILE : 1)
  return Math.max(PLANCHER, Math.round(brut))
}

export function makeDust(count: number, seed: number, w: number, h: number): Grain[] {
  const suivant = alea(seed)
  const grains: Grain[] = []
  for (let i = 0; i < count; i += 1) {
    grains.push({
      x: suivant() * w,
      y: suivant() * h,
      r: 0.4 + suivant() * 0.9,
      a: 0.06 + suivant() * 0.3,
    })
  }
  return grains
}

/** How far the dust lags behind the pointer, in stage pixels. */
const PARALLAX = 14

/**
 * Le plancher de la poussière, en pixels d'écran : la voie. En dessous il n'y
 * a plus de ciel mais le reflet, et un grain qui continuerait dessus ferait
 * des étoiles sous l'horizon. Le bas de la fenêtre le borne aussi : inutile de
 * tirer des grains hors champ.
 */
export function plancherPoussiere(frame: Frame, viewportH: number): number {
  return Math.min(HORIZON * frame.scale + frame.offsetY, viewportH)
}

/**
 * La poussière du ciel, en pixels d'écran. Les grains sont tirés sur le
 * **monde** — le plateau et ses marges — puis posés par le cadre décalé de la
 * scène : taille, souffle et composition restent ceux du cadre.
 *
 * Sur le plateau seul, comme autrefois, le ciel s'arrêtait à ses bords. On ne
 * le voyait pas tant que la scène le débordait toujours ; depuis qu'elle
 * recule, le haut d'un portrait et les côtés d'un écran large tombent hors du
 * plateau, et le grain s'y serait arrêté net.
 *
 * Elle couvre tout l'écran jusqu'à la voie. Le ciel se dessine **devant** le
 * massif (voir `plansDuDecor` dans Scene.ts) : son grain continue donc sur le
 * flanc au lieu de s'arrêter net sur la silhouette, et le voile du pied, qui
 * passe devant lui, l'éteint doucement en approchant des rails. C'est le
 * contraire de ce qu'on faisait : la région libre ne taille plus la poussière,
 * elle ne sert plus qu'aux étoiles-voyageuses, qui elles se survolent.
 *
 * `PLANCHER` s'applique **après** ce filtre : si trop peu de grains survivent,
 * on en tire davantage (le tirage est stable, les premiers ne changent pas).
 */
export function poussiereLibre(
  frame: Frame,
  viewportW: number,
  viewportH: number,
  mobile: boolean,
  seed: number,
): Grain[] {
  const marge = PARALLAX * frame.scale
  const plancher = plancherPoussiere(frame, viewportH)
  const garder = (count: number): Grain[] => {
    const libres: Grain[] = []
    for (const g of makeDust(count, seed, MONDE.width, MONDE.height)) {
      const x = (MONDE.x + g.x) * frame.scale + frame.offsetX
      const y = (MONDE.y + g.y) * frame.scale + frame.offsetY
      const r = g.r * frame.scale
      if (x < 0 || x > viewportW) continue
      if (y + r + marge <= plancher) libres.push({ x, y, r, a: g.a })
    }
    return libres
  }
  let count = dustCount(MONDE.width, MONDE.height, mobile)
  let libres = garder(count)
  while (libres.length < PLANCHER && count < PLAFOND_TIRAGE) {
    count *= 2
    libres = garder(count)
  }
  return libres
}

/** Garde-fou : une région libre quasi vide ne doit pas boucler. */
const PLAFOND_TIRAGE = 20_000

/**
 * La graine du ciel. `Sky` la prend par défaut, et l'écran d'attente la
 * recopie : les deux doivent semer le même ciel.
 */
export const GRAINE_CIEL = 7

/**
 * La poussière telle qu'elle est posée sur une fenêtre donnée — cadre compris.
 *
 * C'est la chaîne que `Scene.cadrer` suit : `cadrageScene` pour le cadre, puis
 * `poussiereLibre`. Elle est ici, en une fonction, parce que **l'écran
 * d'attente d'`index.html` la recopie en JavaScript nu** : il doit dessiner ce
 * ciel-là avant que le bundle n'existe, et un test compare les deux grain par
 * grain. Sans ce point unique, la comparaison porterait sur ma lecture du code
 * plutôt que sur ce que la scène dessine.
 */
export function poussiereDeLaFenetre(
  viewportW: number,
  viewportH: number,
  seed: number = GRAINE_CIEL,
): Grain[] {
  const { frame } = cadrageScene(viewportW, viewportH)
  return poussiereLibre(frame, viewportW, viewportH, viewportW < SEUIL_MOBILE, seed)
}

export class Sky {
  private readonly racine = new Container()
  private readonly grains = new Graphics()
  private pointeur = { x: 0, y: 0 }
  private echelleCadre = 1
  private readonly seed: number

  constructor(parent: Container, seed = 7) {
    this.seed = seed
    this.racine.addChild(this.grains)
    parent.addChild(this.racine)
  }

  /** `frame` est celui de `cadrageScene` : son `offsetY` porte le décalage. */
  resize(frame: Frame, width: number, height: number, mobile: boolean): void {
    this.echelleCadre = frame.scale
    this.grains.clear()
    for (const g of poussiereLibre(frame, width, height, mobile, this.seed)) {
      this.grains.circle(g.x, g.y, g.r).fill({ color: 0xffffff, alpha: g.a })
    }
  }

  /** `x` and `y` are the pointer position, normalised to -1…1. */
  setPointer(x: number, y: number): void {
    this.pointeur = { x, y }
  }

  update(): void {
    // Lent, comme un souffle : on s'approche de la cible sans jamais l'atteindre d'un coup.
    const portee = PARALLAX * this.echelleCadre
    this.racine.x += (-this.pointeur.x * portee - this.racine.x) * 0.02
    this.racine.y += (-this.pointeur.y * portee - this.racine.y) * 0.02
  }

  destroy(): void {
    this.racine.destroy({ children: true })
  }
}
