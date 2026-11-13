/**
 * Le massif dans la scène : Three le calcule dans son propre canvas, Pixi le
 * consomme comme n'importe quelle texture.
 *
 * C'est ce qui permet de ne rien changer d'autre — le reflet le reflète, le
 * filtre de recoloration le recolore et la poussière d'étoiles reste derrière,
 * exactement comme du temps de la séquence d'images. La différence est qu'il
 * est calculé à la résolution réelle de l'écran, et qu'il tourne en continu.
 */
import { CanvasSource, Container, Sprite, Texture } from 'pixi.js'

import { Massif, decoder } from './Massif'
import {
  ECHELLE_MONTAGNES,
  HORIZON,
  STAGE,
  bornesFenetre,
  facteurCadre,
  fenetreVisible,
  toursMassif,
} from './layout'
import type { Cadre, Frame } from './layout'
import type { Manifest } from './types'

/**
 * Plafond de sécurité, par-dessus celui du GPU. Un écran 5K demanderait plus
 * de 5000 px de large ; au-delà de celui-ci on préfère un léger agrandissement
 * à une texture de plusieurs centaines de mégaoctets.
 */
const TAILLE_MAX = 8192

/**
 * La carte de relief, ramenée à des hauteurs 0..1.
 *
 * `colorSpaceConversion: 'none'` est ce qui garantit qu'on relit les octets
 * écrits par le pipeline, et pas une version gérée en couleur : la hauteur
 * voyage sur deux canaux, un octet déplacé ferait un trou de 256 niveaux.
 */
async function chargerCarte(url: string) {
  const reponse = await fetch(url)
  if (!reponse.ok) throw new Error(`carte de relief introuvable : ${url}`)
  const bitmap = await createImageBitmap(await reponse.blob(), {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  })
  // Les dimensions se lisent avant close() : après, elles valent zéro.
  const largeur = bitmap.width
  const hauteur = bitmap.height
  const c = document.createElement('canvas')
  c.width = largeur
  c.height = hauteur
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('pas de contexte 2d pour lire la carte de relief')
  ctx.drawImage(bitmap, 0, 0)
  const { data } = ctx.getImageData(0, 0, largeur, hauteur)
  bitmap.close()

  const hauteurs = decoder(data, largeur, hauteur)
  let max = 0
  for (const v of hauteurs) if (v > max) max = v
  // Un relief plat ne produit aucun point : autant le dire ici plutôt que de
  // laisser une montagne vide à l'écran.
  if (max < 0.5) throw new Error(`carte de relief plate (max ${max.toFixed(3)}) : ${url}`)
  return { hauteurs, largeur, hauteur }
}

export class Relief {
  private readonly racine = new Container()
  private readonly sprite = new Sprite()
  private canvas: HTMLCanvasElement | null = null
  private source: CanvasSource | null = null
  private massif: Massif | null = null

  private fenetre: Cadre = { x: 0, y: 0, width: STAGE.width, height: HORIZON }
  private echelleEcran = 1
  /** Ouverture de la caméra : elle change à chaque pixel de hauteur, sans rien recharger. */
  private echelleMassif = ECHELLE_MONTAGNES
  private resolution = 1
  private legs = 0
  private dernierRendu = Number.NaN

  constructor(parent: Container) {
    this.racine.addChild(this.sprite)
    parent.addChild(this.racine)
  }

  /** Peut échouer : sans WebGL 2 pour Three, la scène garde son train. */
  async charger(manifest: Manifest): Promise<void> {
    if (!manifest.carte) return
    const carte = await chargerCarte(manifest.carte.path)
    const canvas = document.createElement('canvas')
    const massif = new Massif(canvas, carte.hauteurs, carte.largeur, carte.hauteur)
    this.canvas = canvas
    this.massif = massif
    this.source = new CanvasSource({ resource: canvas, alphaMode: 'premultiplied-alpha' })
    this.sprite.texture = new Texture({ source: this.source })
    this.appliquer()
  }

  /**
   * La part de la scène qu'on voit, et à quelle densité de pixels. `frame` est
   * celui de `cadrageScene` : son `offsetY` porte déjà le décalage.
   */
  cadrer(
    frame: Frame,
    viewportW: number,
    viewportH: number,
    resolution: number,
    echelle: number,
  ): void {
    this.fenetre = fenetreVisible(frame, viewportW, viewportH)
    this.echelleEcran = frame.scale
    this.resolution = resolution
    this.echelleMassif = echelle
    this.appliquer()
  }

  private appliquer(): void {
    const f = this.fenetre
    this.sprite.position.set(f.x, f.y)
    if (!this.massif || !this.canvas || !this.source) return

    // Un texel du rendu pour un pixel de l'écran : c'est tout l'intérêt, le
    // massif n'est plus jamais agrandi.
    const voulue = f.width * this.echelleEcran * this.resolution
    const plafond = Math.min(this.massif.tailleMax, TAILLE_MAX)
    const largeur = Math.max(1, Math.round(Math.min(voulue, plafond)))
    const hauteur = Math.max(1, Math.round((largeur * f.height) / f.width))

    this.massif.cadrer(
      largeur,
      hauteur,
      bornesFenetre(f, this.echelleMassif),
      // La taille du grain se mesure sur le cadre Blender, pas sur le canvas :
      // les deux ne coïncident que si la fenêtre est exactement ce cadre.
      largeur * facteurCadre(f, this.echelleMassif),
    )
    this.source.resize(largeur, hauteur, 1)
    // Après le redimensionnement, et pas avant : Pixi déduit l'échelle du
    // sprite de la taille de sa texture, et la fixerait sur l'ancienne.
    this.sprite.setSize(f.width, f.height)
    this.dernierRendu = Number.NaN
    this.dessiner()
  }

  /** Le store, hors rendu : on ne fait que retenir la distance parcourue. */
  setLegs(legs: number): void {
    this.legs = legs
  }

  /**
   * Appelé dans le tick, juste avant que Pixi dessine. Rendre ailleurs
   * exposerait au vidage du tampon entre deux images.
   */
  dessiner(): void {
    if (!this.massif || !this.source) return
    // À quai, rien ne tourne : recalculer un million de triangles soixante
    // fois par seconde coûterait de la batterie pour une image identique.
    // La texture garde la dernière, côté GPU.
    if (this.legs === this.dernierRendu) return
    this.dernierRendu = this.legs
    this.massif.tourner(toursMassif(this.legs))
    this.massif.rendre()
    this.source.update()
  }

  detruire(): void {
    this.massif?.detruire()
    this.massif = null
    this.source?.destroy()
    this.source = null
    this.canvas = null
    this.racine.destroy({ children: true })
  }
}
