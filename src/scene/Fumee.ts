/**
 * La fumée de la locomotive.
 *
 * Des **bouffées**, pas une nuée de grains : une poignée de nuages ronds qui
 * sortent de la cheminée l'un après l'autre, enflent, se couchent en arrière
 * selon la vitesse, puis se referment. Une fumée de dessin animé plutôt qu'un
 * nuage de points — la version en grains grouillait.
 *
 * Chaque bouffée est faite de quelques lobes ronds, tirés **une fois** à sa
 * naissance et portés ensuite sans rien retirer au hasard : elle garde donc sa
 * forme en grandissant au lieu de bouillonner.
 *
 * Elle est de la **couleur du fond**, comme le corps du train : elle cache la
 * montagne au lieu de s'ajouter à son grain. Quelques points blancs dessus lui
 * donnent la même matière que le train.
 *
 * Elle vit dans la rame : la cheminée est à ses coordonnées du cadre source, et
 * l'échelle du train s'applique toute seule.
 *
 * Les images de la locomotive en portaient une autre, **dessinée**, qui montait
 * et s'effaçait sur la boucle. Elle est retirée à la fabrication des assets
 * (`--coupe=492` dans `outils/grain_train.py`) : celle-ci suit la vitesse du
 * train, l'autre ne le pouvait pas.
 */
import { Container, Graphics } from 'pixi.js'
import { ECHELLE_TRAIN } from './layout'
import type { Frame } from './layout'

/** Le haut de la cheminée, dans le cadre source 2320 × 1217. */
export const CHEMINEE = { x: 1606, y: 492 } as const

/** Taille d'une cellule de grain, en pixels d'écran — celle du massif. */
export const GRAIN_ECRAN = 1.5

/** Bouffées par seconde, à l'arrêt puis en plus à pleine vitesse. */
export const TAUX_ARRET = 1.8
export const TAUX_VITESSE = 3.6

/** Durée de vie d'une bouffée, en secondes, et sa part tirée au hasard. */
export const DUREE = 3
export const DUREE_HASARD = 0.25

/** Part de la vie où la bouffée se referme, à la fin. */
export const FERMETURE = 0.5

/** Rayon d'une bouffée au départ, et ce qu'elle gagne par seconde. */
export const RAYON = 24
export const CROISSANCE = 20

/** Lobes et points blancs par bouffée. */
export const LOBES = 5
export const POINTS = 9

/**
 * Vitesse de montée, en pixels du cadre source par seconde. Assez vive pour
 * qu'à quai les bouffées se détachent l'une de l'autre : plus lentes, elles se
 * rattrapaient et ne faisaient qu'un champignon posé sur la cheminée.
 */
export const MONTEE = 170

/** Ce que la fumée garde de la vitesse du sol en dérivant vers l'arrière. */
export const DERIVE = 0.6

/** Ce que parcourt le sol, en pixels du cadre source par seconde. */
const SOL = 900

/** Balancement à l'arrêt, en pixels du cadre par seconde. */
export const REMOUS = 26

const GRIS = 0xededed

function alea(graine: number): () => number {
  let s = graine >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Un morceau de nuage, en parts du rayon de la bouffée. */
export type Lobe = { dx: number; dy: number; r: number }

export type Bouffee = {
  x: number
  y: number
  vy: number
  age: number
  duree: number
  phase: number
  /** 1 à quai, 0 à pleine vitesse, figé à la naissance. */
  repos: number
  lobes: Lobe[]
  /** Points blancs, en parts du rayon : ils suivent la bouffée. */
  points: { dx: number; dy: number }[]
}

/**
 * Une bouffée tout juste sortie de la cheminée. Ses lobes sont tirés une fois :
 * c'est ce qui lui garde sa forme en grandissant.
 */
export function naitre(r: () => number, vitesse = 0): Bouffee {
  const lobes: Lobe[] = [{ dx: 0, dy: 0, r: 0.92 }]
  for (let i = 1; i < LOBES; i += 1) {
    const a = (i / (LOBES - 1)) * Math.PI * 2 + r() * 0.8
    const d = 0.42 + r() * 0.3
    lobes.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.72, r: 0.5 + r() * 0.26 })
  }
  const points: { dx: number; dy: number }[] = []
  for (let i = 0; i < POINTS; i += 1) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 0.95
    points.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8 })
  }
  return {
    x: CHEMINEE.x + (r() - 0.5) * 14,
    y: CHEMINEE.y,
    vy: -MONTEE * (0.85 + r() * 0.3),
    age: 0,
    duree: DUREE * (1 - DUREE_HASARD + r() * DUREE_HASARD * 2),
    phase: r() * Math.PI * 2,
    repos: 1 - Math.min(1, Math.max(0, vitesse)),
    lobes,
    points,
  }
}

/** Ce qui reste de la bouffée : pleine, puis elle se referme sur la fin. */
export function fermeture(b: Bouffee): number {
  const t = b.age / b.duree
  if (t <= 1 - FERMETURE) return 1
  const u = Math.min(1, (t - (1 - FERMETURE)) / FERMETURE)
  // En cosinus : elle se referme en douceur au lieu de se couper net.
  return 0.5 + 0.5 * Math.cos(u * Math.PI)
}

/** Le rayon d'une bouffée, en pixels du cadre source. */
export function rayon(b: Bouffee): number {
  return (RAYON + CROISSANCE * b.age) * fermeture(b)
}

export function avancer(b: Bouffee, dt: number, vitesse: number): void {
  b.age += dt
  // La poussée s'épuise sans jamais s'annuler : une fumée se traîne, elle ne
  // se fige pas en l'air.
  const pousse = 0.25 + 0.75 * Math.max(0, 1 - b.age / b.duree)
  const balancement = Math.sin(b.age * 0.9 + b.phase) * REMOUS * b.repos
  b.x += (balancement - DERIVE * SOL * vitesse) * dt
  b.y += b.vy * pousse * dt
}

export function morte(b: Bouffee): boolean {
  return b.age >= b.duree
}

export class Fumee {
  private readonly gfx = new Graphics()
  private readonly bouffees: Bouffee[] = []
  private readonly r = alea(31337)
  private readonly anime: boolean
  private reste = 0
  private cellule = 3

  constructor(parent: Container, reducedMotion: boolean) {
    parent.addChild(this.gfx)
    // Mouvement réduit : le train est à l'arrêt (CONCEPT.md §11), et une fumée
    // qui ne bouge pas n'est plus une fumée. On n'en met pas.
    this.anime = !reducedMotion
  }

  cadrer(frame: Frame, resolution: number): void {
    // Une cellule de grain, ramenée aux pixels du cadre source : la rame est
    // déjà réduite à ECHELLE_TRAIN, c'est ce facteur-là qui compte.
    const k = ECHELLE_TRAIN * frame.scale * resolution
    this.cellule = GRAIN_ECRAN / Math.max(0.01, k)
  }

  update(dt: number, vitesse: number): void {
    if (!this.anime) return
    this.reste += dt * (TAUX_ARRET + TAUX_VITESSE * vitesse)
    while (this.reste >= 1) {
      this.reste -= 1
      this.bouffees.push(naitre(this.r, vitesse))
    }
    for (let i = this.bouffees.length - 1; i >= 0; i -= 1) {
      avancer(this.bouffees[i], dt, vitesse)
      if (morte(this.bouffees[i])) this.bouffees.splice(i, 1)
    }
    this.dessiner()
  }

  private dessiner(): void {
    const g = this.gfx
    g.clear()
    for (const b of this.bouffees) {
      const R = rayon(b)
      if (R < 1) continue
      for (const l of b.lobes) g.circle(b.x + l.dx * R, b.y + l.dy * R, l.r * R)
    }
    g.fill({ color: 0x000000 })
    const c = this.cellule
    for (const b of this.bouffees) {
      const R = rayon(b)
      if (R < 1) continue
      for (const p of b.points) g.rect(b.x + p.dx * R, b.y + p.dy * R, c, c)
    }
    g.fill({ color: GRIS })
  }

  destroy(): void {
    this.gfx.destroy()
  }
}
