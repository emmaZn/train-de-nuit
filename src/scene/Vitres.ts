/**
 * Les vitres allumées des wagons.
 *
 * Un train de nuit s'annonce par ses fenêtres. Ce sont les seules lumières de
 * la scène, et ce sont des voyageurs — le sujet du site.
 *
 * Elles ne sont pas cuites dans les images, pour trois raisons :
 *
 * 1. **Les deux wagons partagent leurs textures.** Cuites, elles s'allumeraient
 *    à l'identique ; ici chaque wagon a son motif (`ALLUMEES`).
 * 2. **Le grain se calcule à la densité de pixels de l'écran**, comme celui du
 *    massif et celui de la terre. Cuit, il traversait deux réductions — 0,75 au
 *    build puis environ 1,4 au dessin — et une densité moyenne s'y
 *    rééchantillonnait en gris : des vitres sales.
 * 3. Le vacillement et le halo deviennent possibles.
 *
 * **La cabine du conducteur reste éteinte** : une vitre allumée derrière son dos
 * effacerait ses traits blancs. Elle n'aurait de toute façon pas pu être posée
 * ici — quelque chose bouge derrière, deux à cinq cents pixels changent d'une
 * image à l'autre, là où les vitres des wagons sont strictement immobiles.
 */
import { Container, Sprite, Texture } from 'pixi.js'
import { ECHELLE_TRAIN } from './layout'
import type { Frame } from './layout'
import type { Manifest } from './types'

/** Taille d'une cellule de grain, en texels du rendu — celle du massif. */
export const GRAIN_ECRAN = 1.5

/**
 * Les six vitres d'un wagon, dans le cadre source 2320 × 1217. Mesurées sur
 * les composantes fermées du corps, identiques sur les trois séquences.
 */
export const BOITES = [
  [796, 656, 878, 748],
  [892, 656, 977, 749],
  [1070, 656, 1152, 748],
  [1166, 656, 1251, 749],
  [1342, 656, 1424, 748],
  [1438, 656, 1523, 749],
] as const

/** De combien on rentre dans la boîte pour ne pas mordre sur le cadre blanc. */
export const RETRAIT = 3

/** Place laissée autour de la vitre pour le halo, en pixels du cadre source. */
export const MARGE = 62

/** Densité des points dans la vitre, du bas vers le haut : la lampe est en bas. */
export const DENSITE_BAS = 0.95
export const DENSITE_HAUT = 0.55

/**
 * Le halo est un **dégradé**, donc des mi-teintes : c'est la première entorse
 * assumée à « le noir devient le fond, blanc ou absent » (CONCEPT.md §6).
 * Choisie à l'œil contre un halo en grain, qui respectait la règle mais se
 * lisait moins bien.
 *
 * Au réglage 3, la propriétaire a étendu cette entorse aux **deux dégradés**
 * de la gare d'« ailleurs » — cône du faisceau, halo de l'horloge
 * (`QuaiLayer`, `Faisceau`) —, et à eux seuls. Ils étaient trois : le halo rond
 * de la lanterne a été retiré le 21 novembre 2026, et la lanterne est depuis un
 * blanc plein, qui ne fait pas de mi-teinte.
 */
export const HALO_ALPHA = 0.5

/** Quelles vitres sont allumées, par wagon. Toutes ne le sont pas. */
export const ALLUMEES: readonly (readonly boolean[])[] = [
  [true, true, false, true, false, true],
  [false, true, true, false, true, true],
]

/** De combien le vacillement fait baisser la densité, au plus. */
export const AMPLITUDE = 0.22

/** Au plus quinze redessins par seconde : au-delà, la vitre grésille. */
export const PERIODE_REDESSIN = 1 / 15

/** Pas du seuil : en deçà, on redessine pour rien. */
export const PAS_SEUIL = 0.02

/** Entre deux extinctions, en secondes. */
export const EXTINCTION: { min: number; max: number } = { min: 5, max: 14 }

/** Le gris du massif. */
const GRIS = '237,237,237'

/** Un générateur déterministe : le même train d'une visite à l'autre. */
export function alea(graine: number): () => number {
  let s = graine >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * Le seuil d'une vitre à un instant.
 *
 * **Le bruit ne change jamais** : une vitre tire son champ aléatoire une fois,
 * et c'est ce seuil qui monte et descend. C'est ce que fait le massif
 * (`alea(cellule) < total`). Un bruit neuf à chaque image ferait bouillir la
 * vitre — le scintillement pour lequel le massif a déjà été ralenti deux fois.
 *
 * Deux ondes lentes de périodes incommensurables, déphasées d'une vitre à
 * l'autre : le battement ne se répète pas, et deux vitres ne vacillent jamais
 * ensemble.
 */
export function seuilVacillement(t: number, phase: number, amplitude = AMPLITUDE): number {
  const a = Math.sin(t * 0.9 + phase)
  const b = Math.sin(t * 1.37 + phase * 2.3)
  return 1 - amplitude * (0.5 + 0.25 * a + 0.25 * b)
}

/** Le rectangle d'une vitre, halo compris, dans le cadre source. */
export function cadreVitre(boite: readonly [number, number, number, number]): {
  x: number
  y: number
  largeur: number
  hauteur: number
} {
  const [x0, y0, x1, y1] = boite
  return {
    x: x0 + RETRAIT - MARGE,
    y: y0 + RETRAIT - MARGE,
    largeur: x1 - x0 + 1 - 2 * RETRAIT + 2 * MARGE,
    hauteur: y1 - y0 + 1 - 2 * RETRAIT + 2 * MARGE,
  }
}

/**
 * La densité de points visée en un point de la texture, en texels. Hors de la
 * vitre il n'y a pas de point : le halo, lui, est un dégradé posé dessous.
 */
export function densiteVisee(
  y: number,
  x: number,
  largeur: number,
  hauteur: number,
  marge: number,
): number {
  if (x < marge || x >= largeur - marge) return 0
  if (y < marge || y >= hauteur - marge) return 0
  const t = (y - marge) / Math.max(1, hauteur - 2 * marge - 1)
  return DENSITE_HAUT + (DENSITE_BAS - DENSITE_HAUT) * t
}

class Vitre {
  readonly sprite = new Sprite()
  readonly phase: number
  private readonly boite: readonly [number, number, number, number]
  private readonly graine: number
  private champ: Float32Array | null = null
  private canvas: HTMLCanvasElement | null = null
  private texture: Texture | null = null
  private colonnes = 0
  private lignes = 0
  private k = 1
  private dernierSeuil = -1
  private allumee = true

  constructor(boite: readonly [number, number, number, number], phase: number, graine: number) {
    this.boite = boite
    this.phase = phase
    this.graine = graine
  }

  construire(k: number, origine: { x: number; y: number }): void {
    const c = cadreVitre(this.boite)
    this.k = k
    const largeur = Math.max(2, Math.round(c.largeur * k))
    const hauteur = Math.max(2, Math.round(c.hauteur * k))
    this.colonnes = Math.max(1, Math.floor(largeur / GRAIN_ECRAN))
    this.lignes = Math.max(1, Math.floor(hauteur / GRAIN_ECRAN))
    const r = alea(this.graine)
    this.champ = new Float32Array(this.colonnes * this.lignes)
    for (let i = 0; i < this.champ.length; i += 1) this.champ[i] = r()

    const canvas = document.createElement('canvas')
    canvas.width = largeur
    canvas.height = hauteur
    this.canvas = canvas
    this.texture?.destroy(true)
    this.texture = Texture.from(canvas)
    this.texture.source.scaleMode = 'nearest'
    this.sprite.texture = this.texture
    this.dernierSeuil = -1

    this.sprite.position.set(c.x - origine.x, c.y - origine.y)
    this.sprite.setSize(c.largeur, c.hauteur)
  }

  peindre(seuil: number): void {
    const canvas = this.canvas
    const champ = this.champ
    if (!canvas || !champ) return
    const effectif = this.allumee ? seuil : 0
    if (Math.abs(effectif - this.dernierSeuil) < PAS_SEUIL) return
    this.dernierSeuil = effectif
    // Sans contexte 2D — jsdom — le train garde ses vitres éteintes plutôt
    // que de s'arrêter là.
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (effectif <= 0) {
      this.texture?.source.update()
      return
    }
    this.halo(ctx, canvas, effectif)
    const marge = MARGE * this.k
    const bord = (i: number) => Math.round(i * GRAIN_ECRAN)
    ctx.fillStyle = `rgb(${GRIS})`
    for (let c = 0; c < this.colonnes; c += 1) {
      const x = bord(c)
      const l = bord(c + 1) - x
      for (let ligne = 0; ligne < this.lignes; ligne += 1) {
        const y = bord(ligne)
        const d = densiteVisee(y, x, canvas.width, canvas.height, marge)
        if (d > 0 && champ[ligne * this.colonnes + c] < d * effectif) {
          ctx.fillRect(x, y, l, bord(ligne + 1) - y)
        }
      }
    }
    this.texture?.source.update()
  }

  /** La lueur autour de la vitre. Voir `HALO_ALPHA` : c'est l'entorse assumée. */
  private halo(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, seuil: number): void {
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = Math.max(canvas.width, canvas.height) / 2
    const g = ctx.createRadialGradient(cx, cy, r * 0.22, cx, cy, r)
    g.addColorStop(0, `rgba(${GRIS},${HALO_ALPHA * seuil})`)
    g.addColorStop(0.55, `rgba(${GRIS},${0.18 * seuil})`)
    g.addColorStop(1, `rgba(${GRIS},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  setAllumee(v: boolean): void {
    this.allumee = v
  }

  get estAllumee(): boolean {
    return this.allumee
  }

  destroy(): void {
    this.texture?.destroy(true)
    this.texture = null
  }
}

export class Vitres {
  private readonly racine = new Container()
  private readonly vitres: Vitre[] = []
  private readonly origine: { x: number; y: number }
  private readonly anime: boolean
  private readonly dé = alea(20261114)
  private frame: Frame | null = null
  private t = 0
  private depuisRedessin = 0
  private prochaineBascule = EXTINCTION.max

  /**
   * `positionsWagons` donne l'abscisse de chaque wagon dans la rame. Le sprite
   * d'un wagon est posé en (wx, spec.y) et porte la région source qui commence
   * en (spec.x, spec.y) : un point source (sx, sy) retombe donc en
   * (wx + sx - spec.x, sy).
   */
  constructor(
    parent: Container,
    manifest: Manifest,
    positionsWagons: number[],
    reducedMotion: boolean,
  ) {
    // Nommée : c'est la seule branche de la scène qui ne porte aucune teinte,
    // ni sur elle ni sur un ancêtre, et un test doit pouvoir le dire.
    this.racine.label = 'vitres'
    parent.addChild(this.racine)
    const spec = manifest.train.wagon
    this.origine = { x: spec.x, y: spec.y }
    // Mouvement réduit : les vitres restent allumées, mais fixes — comme les
    // étoiles, qui ne scintillent plus (CONCEPT.md §11).
    this.anime = !reducedMotion
    positionsWagons.forEach((wx, rang) => {
      const groupe = new Container()
      groupe.position.set(wx, spec.y)
      BOITES.forEach((boite, i) => {
        const v = new Vitre(boite, (rang * BOITES.length + i) * 1.7, 101 + rang * 97 + i * 13)
        v.setAllumee(ALLUMEES[rang % ALLUMEES.length][i])
        this.vitres.push(v)
        groupe.addChild(v.sprite)
      })
      this.racine.addChild(groupe)
    })
  }

  cadrer(frame: Frame, resolution: number): void {
    this.frame = frame
    // Texels par pixel du cadre source : la rame est déjà réduite à
    // ECHELLE_TRAIN, c'est donc ce facteur-là qui compte, pas celui du décor.
    const k = ECHELLE_TRAIN * frame.scale * resolution
    for (const v of this.vitres) v.construire(k, this.origine)
    this.peindre()
  }

  private peindre(): void {
    for (const v of this.vitres) {
      v.peindre(this.anime ? seuilVacillement(this.t, v.phase) : 1)
    }
  }

  update(dt: number): void {
    if (!this.anime || !this.frame) return
    this.t += dt
    this.depuisRedessin += dt
    this.prochaineBascule -= dt
    if (this.prochaineBascule <= 0) {
      // De temps en temps, quelqu'un éteint — ou rallume.
      this.prochaineBascule = EXTINCTION.min + this.dé() * (EXTINCTION.max - EXTINCTION.min)
      const i = Math.floor(this.dé() * this.vitres.length)
      this.vitres[i].setAllumee(!this.vitres[i].estAllumee)
    }
    if (this.depuisRedessin < PERIODE_REDESSIN) return
    this.depuisRedessin = 0
    this.peindre()
  }

  destroy(): void {
    for (const v of this.vitres) v.destroy()
    this.racine.destroy({ children: true })
  }
}
