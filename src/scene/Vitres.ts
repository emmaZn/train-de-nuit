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
import type { Mode } from './palette'

/**
 * Taille d'une cellule de grain, en texels du rendu.
 *
 * C'était celle du massif, et les deux ont marché ensemble jusqu'au 25
 * novembre 2026, où le massif est passé à 2 : une vitre fait 82 px de cadre
 * source, et un grain de 2 n'y laisserait qu'une poignée de cellules. Celui-ci
 * est donc resté à 1,5, **et c'est un choix qui n'a pas été soumis** : si la
 * matière des fenêtres doit suivre celle de la montagne, c'est ce nombre.
 */
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
  // Le troisième wagon, ajouté le 25 novembre 2026 avec lui : un motif à lui,
  // sans quoi `rang % longueur` lui rendrait celui du premier et la rame
  // aurait deux voitures identiques à la file.
  [true, false, true, true, true, false],
]

/** De combien le vacillement fait baisser la densité, au plus. */
export const AMPLITUDE = 0.22

/** Au plus quinze redessins par seconde : au-delà, la vitre grésille. */
export const PERIODE_REDESSIN = 1 / 15

/** Pas du seuil : en deçà, on redessine pour rien. */
export const PAS_SEUIL = 0.02

/** Entre deux extinctions, en secondes. */
export const EXTINCTION: { min: number; max: number } = { min: 5, max: 14 }

/**
 * Rayon de capture d'une vitre, en pixels d'écran.
 *
 * Une vitre fait 82 px de cadre source, soit treize pixels d'écran sur un
 * téléphone une fois la rame réduite et la scène reculée : on ne la vise pas
 * avec un doigt. **On ne cherche donc pas la vitre touchée, mais la plus
 * proche**, dans ce rayon. Les six vitres d'un wagon tiennent dans une centaine
 * de pixels d'écran : un doigt les couvre presque toutes, et la plus proche est
 * celle qu'on voulait. Il n'y a pas de cible de 44 px à tenir ici — ce n'est
 * pas une commande, c'est un geste sur la scène, et se tromper de fenêtre
 * n'empêche rien.
 */
export const RAYON_VITRE = 26

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

/**
 * Le centre d'une vitre dans le cadre source — la vitre seule, **sans son
 * halo** : deux halos voisins se recouvrent largement, et viser leur milieu
 * reviendrait à viser entre les deux fenêtres.
 */
export function centreVitre(boite: readonly [number, number, number, number]): {
  x: number
  y: number
} {
  return { x: (boite[0] + boite[2]) / 2, y: (boite[1] + boite[3]) / 2 }
}

/**
 * La vitre la plus proche d'un point, ou `null` si aucune n'est dans le rayon.
 *
 * Les coordonnées sont celles de la rame, rayon compris : c'est à l'appelant
 * de convertir ses pixels d'écran, parce que lui seul sait à quelle échelle la
 * rame est posée.
 */
export function vitreVisee(
  centres: readonly { x: number; y: number }[],
  x: number,
  y: number,
  rayon: number,
): number | null {
  let trouvee: number | null = null
  let meilleure = rayon * rayon
  centres.forEach((c, i) => {
    const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y)
    if (d <= meilleure) {
      meilleure = d
      trouvee = i
    }
  })
  return trouvee
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
  private mode: Mode = 'nuit'

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
    // De jour, le carreau garde son grain et perd sa lueur : « un carré de
    // grain sombre, ça suffit ». Le halo est un dégradé radial — la seule
    // entorse de cette pièce, et elle ne tient pas sur du papier.
    if (this.mode !== 'jour') this.halo(ctx, canvas, effectif)
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

  /** Le mode. Le seuil déjà peint est oublié : la texture doit se refaire. */
  setMode(mode: Mode): void {
    if (mode === this.mode) return
    this.mode = mode
    this.dernierSeuil = -1
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
  /** Le centre de chaque vitre, dans la rame, dans l'ordre de `this.vitres`. */
  private readonly centres: { x: number; y: number }[] = []
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
        // Le groupe est posé en (wx, spec.y) et porte des points du cadre
        // source : un point (sx, sy) retombe donc en (wx + sx - spec.x, sy).
        const c = centreVitre(boite)
        this.centres.push({ x: wx + c.x - spec.x, y: c.y })
        groupe.addChild(v.sprite)
      })
      this.racine.addChild(groupe)
    })
  }

  /**
   * Le mode du site, descendu sur chaque carreau. De jour, la lueur s'en va et
   * le grain reste — les vitres sont la seule branche de la scène qui ne porte
   * aucune teinte, et elles restent encrées à « ailleurs » pendant que le
   * reste se délave.
   */
  setMode(mode: Mode): void {
    for (const v of this.vitres) v.setMode(mode)
    // Tout de suite, et non au prochain redessin : celui-ci n'arrive qu'une
    // fois par `PERIODE_REDESSIN`, et la bascule se verrait traîner.
    this.peindre()
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

  /**
   * Quelqu'un touche une fenêtre : elle s'allume, ou elle s'éteint.
   *
   * Emmanuelle, le 25 novembre 2026 : « tout comme je peux cliquer sur le
   * réverbère et l'horloge, je veux pouvoir cliquer sur les fenêtres du train
   * — même si elle peut se rallumer et s'éteindre aléatoirement toujours ».
   * C'est la dernière phrase qui compte : rien n'est **verrouillé** ici. La
   * vitre qu'on vient d'éteindre reste dans le tirage de `update`, et pourra
   * se rallumer toute seule quelques secondes plus tard. On ne commande pas le
   * train, on frappe à un carreau.
   *
   * `x`, `y` sont en pixels de cadre, `echelleCadre` est `frame.scale` : la
   * rame ajoute la sienne par-dessus, et c'est elle qui est lue ici plutôt que
   * recopiée, pour que le jour où le nez du train bouge — il bouge avec le
   * format — rien n'ait à suivre.
   */
  toucher(x: number, y: number, echelleCadre: number): number | null {
    const rame = this.racine.parent
    const k = rame?.scale.x ?? 0
    const e = echelleCadre > 0 ? echelleCadre : 1
    if (!rame || !(k > 0)) return null
    const i = vitreVisee(
      this.centres,
      (x - rame.position.x) / k,
      (y - rame.position.y) / k,
      RAYON_VITRE / (e * k),
    )
    if (i === null) return null
    this.vitres[i].setAllumee(!this.vitres[i].estAllumee)
    // Tout de suite, et non au prochain redessin : un geste doit répondre.
    this.peindre()
    return i
  }

  destroy(): void {
    for (const v of this.vitres) v.destroy()
    this.racine.destroy({ children: true })
  }
}
