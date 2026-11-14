/**
 * La terre sous les rails.
 *
 * Quelques grains sous la voie, pour que le train repose sur quelque chose au
 * lieu de flotter au bord du reflet.
 *
 * Rien n'est rempli : seulement des points blancs à pleine luminance, dont la
 * densité s'éteint vers le bas. C'est la matière du massif et rien d'autre, et
 * comme rien n'est opaque, la terre se pose sur le haut du reflet et en adoucit
 * la couture au lieu de le recouvrir.
 *
 * Le grain se mesure en **texels du rendu**, comme celui du massif, et non en
 * pixels de la source comme celui du train : il garde donc la même taille quelle
 * que soit la fenêtre et quelle que soit la densité de pixels de l'écran.
 */
import { Container, Texture, TilingSprite } from 'pixi.js'
import { ECHELLE_TRAIN, HORIZON, STAGE } from './layout'
import type { Cadre, Frame } from './layout'

/**
 * Taille d'une cellule de grain, en **texels du rendu** : c'est ce que
 * `GRAIN_ECRAN` veut dire dans `Massif.ts`, puisque `Relief` l'applique à un
 * canvas déjà multiplié par le `devicePixelRatio`.
 *
 * Elle n'est pas entière, comme dans le shader : les cellules alternent donc
 * entre un et deux texels, exactement comme la grille du massif.
 */
export const GRAIN_ECRAN = 1.5

/** Ce que parcourt la voie en pixels de cadre par seconde, à pleine vitesse. */
const DEFILEMENT = 900

/** Où la terre commence, en pixels de cadre sous la ligne de rail. */
export const DEBUT = 9

/** Jusqu'où elle descend, en pixels de cadre. */
export const PROFONDEUR = 46

/** Densité de points au ras du rail, avant les paquets. */
export const DENSITE = 0.2

/** Sur combien de pixels de cadre la densité s'éteint vers le bas. */
export const DECROISSANCE = 13

/** Le gris du massif : blanc ou absent, jamais entre les deux. */
const GRIS = '#EDEDED'

/** Repli quand on n'a pas pu demander au GPU sa taille maximale. */
export const TEXTURE_REPLI = 4096

/** Un générateur déterministe : la même terre d'une session à l'autre. */
function alea(graine: number): () => number {
  let s = graine >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * Des paquets le long de la voie, pour que la terre ne soit pas un voile
 * uniforme : du ballast par endroits, presque rien ailleurs.
 *
 * Des sinus de périodes **entières** sur la largeur de la texture : le motif se
 * referme donc sur lui-même, et la couture du pavage ne se voit pas — à six
 * cents pixels par seconde, elle se verrait tout de suite.
 */
export function paquets(colonnes: number, graine = 907): Float32Array {
  const r = alea(graine)
  const v = new Float32Array(Math.max(0, colonnes))
  const ondes = [
    { k: 2, a: 0.26, p: r() * Math.PI * 2 },
    { k: 5, a: 0.18, p: r() * Math.PI * 2 },
    { k: 13, a: 0.12, p: r() * Math.PI * 2 },
    { k: 31, a: 0.08, p: r() * Math.PI * 2 },
  ]
  for (let x = 0; x < v.length; x += 1) {
    let s = 1
    for (const o of ondes) s += o.a * Math.sin((2 * Math.PI * o.k * x) / colonnes + o.p)
    // Jamais tout à fait vide : une portion de voie sans un grain se verrait
    // autant qu'un paquet de trop.
    v[x] = Math.max(0.15, s)
  }
  return v
}

/**
 * Quelles cellules sont allumées, en 0 ou 1 — jamais entre les deux : c'est la
 * règle du massif, et c'est ici qu'elle se décide.
 *
 * Séparé du dessin parce que c'est tout ce qu'il y a à vérifier : le reste
 * n'est que des rectangles posés sur un canvas.
 */
export function semer(
  colonnes: number,
  lignes: number,
  pas: number,
  parCadre: number,
  graine = 5150,
): Uint8Array {
  const grille = new Uint8Array(Math.max(0, colonnes) * Math.max(0, lignes))
  const amas = paquets(colonnes)
  const r = alea(graine)
  const decroissance = Math.max(1, DECROISSANCE * parCadre)
  for (let c = 0; c < colonnes; c += 1) {
    const densite = DENSITE * amas[c]
    for (let l = 0; l < lignes; l += 1) {
      const p = densite * Math.exp((-l * pas) / decroissance)
      if (r() < p) grille[l * colonnes + c] = 1
    }
  }
  return grille
}

/** Où la bande se pose : toute la largeur, sous le champignon du rail. */
export function cadreTerre(profondeur = PROFONDEUR): Cadre {
  return { x: 0, y: HORIZON + DEBUT, width: STAGE.width, height: profondeur }
}

/**
 * Ce que la terre parcourt, en pixels de cadre. La vitesse de la voie,
 * exactement : elle est à la même distance. Et la **distance**, pas le temps —
 * elle démarre, freine et s'arrête avec le train.
 */
export function pasDeDefilement(dt: number, vitesse: number): number {
  return dt * DEFILEMENT * ECHELLE_TRAIN * vitesse
}

/** La bande, en texels. `semer` a déjà tout décidé. */
export function dessinerTerre(
  pas: number,
  largeur: number,
  hauteur: number,
  parCadre: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  const ctx = canvas.getContext('2d')
  // Sans contexte 2D — jsdom, ou un canvas trop grand — la scène garde sa voie
  // nue plutôt que de s'arrêter là.
  if (!ctx) return canvas
  const colonnes = Math.floor(largeur / pas)
  const lignes = Math.floor(hauteur / pas)
  const grille = semer(colonnes, lignes, pas, parCadre)
  // Le pas n'est pas entier : on arrondit les bords de chaque cellule, et elles
  // alternent donc entre un et deux texels, comme la grille du shader.
  const bord = (i: number) => Math.round(i * pas)

  ctx.fillStyle = GRIS
  for (let c = 0; c < colonnes; c += 1) {
    for (let l = 0; l < lignes; l += 1) {
      if (!grille[l * colonnes + c]) continue
      ctx.fillRect(bord(c), bord(l), bord(c + 1) - bord(c), bord(l + 1) - bord(l))
    }
  }
  return canvas
}

export class Terre {
  private readonly racine = new Container()
  private bande: TilingSprite | null = null
  private cle = ''
  private frame: Frame | null = null
  private resolution = 1
  private tailleMax = TEXTURE_REPLI

  constructor(parent: Container) {
    parent.addChild(this.racine)
  }

  cadrer(frame: Frame, resolution: number, tailleMax = TEXTURE_REPLI): void {
    this.frame = frame
    this.resolution = resolution
    this.tailleMax = Math.max(1024, tailleMax)
    this.construire()
  }

  avancer(dt: number, vitesse: number): void {
    if (!this.bande) return
    this.bande.tilePosition.x -= pasDeDefilement(dt, vitesse)
  }

  private construire(): void {
    if (!this.frame) return
    // Texels par pixel de cadre : exactement ce que fait `Relief` pour le
    // massif. Un texel du rendu pour un pixel de l'écran.
    const parCadre = this.frame.scale * this.resolution
    // La bande la plus longue que le GPU accepte : c'est elle qui décide au
    // bout de combien de temps le motif revient.
    const largeur = this.tailleMax
    const cadre = cadreTerre()
    const hauteur = Math.max(2, Math.ceil(cadre.height * parCadre))
    const cle = `${largeur}:${hauteur}`
    if (cle === this.cle) return
    this.cle = cle

    const texture = Texture.from(dessinerTerre(GRAIN_ECRAN, largeur, hauteur, parCadre))
    // Sans ça, un `tilePosition` fractionnaire rééchantillonnerait les points
    // en gris, et la règle « blanc ou absent » se déferait au rendu.
    texture.source.scaleMode = 'nearest'

    this.bande?.destroy()
    this.bande = new TilingSprite({ texture, width: cadre.width, height: cadre.height })
    this.bande.tileScale.set(1 / parCadre)
    this.bande.position.set(cadre.x, cadre.y)
    this.racine.addChild(this.bande)
  }

  destroy(): void {
    this.racine.destroy({ children: true })
  }
}
