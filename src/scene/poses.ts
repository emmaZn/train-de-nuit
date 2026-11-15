/**
 * Les poses des bouvreuils, et leur passage à la matière du projet.
 *
 * Les dessins sont faits **pour la ligne** : une silhouette fermée remplie de
 * `#0b0b0c`, qui masse comme le corps du train, et rien à l'intérieur hors des
 * marques qui portent un sens (cadrage §10). Le passage au grain ne garde donc
 * que le contour, quantifié à la cellule du projet : c'est la recette
 * « trait seul », celle qu'Emmanuelle a choisie entre quatre.
 */

export const POSES = ['perche', 'perche-ebouriffe', 'sonne', 'vol-haut', 'vol-bas'] as const
export type Pose = (typeof POSES)[number]

/** Cellule de grain, en texels du rendu — celle du massif et de la terre. */
export const GRAIN_ECRAN = 1.5

/** Au-delà de cette opacité, on considère que le contour couvre le pixel. */
export const SEUIL_TRAIT = 70

const GRIS = '#EDEDED'
const NOIR = '#0b0b0c'

/** Le cadre d'une pose : `viewBox="0 0 120 90"`. */
export const CADRE_POSE = { largeur: 120, hauteur: 90 } as const
export const RATIO_POSE = CADRE_POSE.hauteur / CADRE_POSE.largeur

/**
 * Le SVG d'une pose, en deux versions : les aplats seuls, le trait seul.
 *
 * C'est ce découpage qui permet de traiter les deux séparément — la masse d'un
 * côté, la ligne de l'autre — au lieu de lire une luminance moyenne qui
 * n'aurait de sens ni pour l'une ni pour l'autre.
 */
export function separer(svg: string): { plein: string; trait: string } {
  const plein = svg.replace(/stroke="[^"]*"/g, 'stroke="none"')
  const trait = svg.replace(/fill="(?!none)[^"]*"/g, 'fill="none"')
  return { plein, trait }
}

/** Retourne un SVG sur son axe vertical, dans son propre cadre. */
export function miroir(svg: string): string {
  return svg
    .replace(/(<svg[^>]*>)/, `$1<g transform="translate(${CADRE_POSE.largeur},0) scale(-1,1)">`)
    .replace(/<\/svg>\s*$/, '</g></svg>')
}

/**
 * Quelles cellules le contour allume, en 0 ou 1 — jamais entre les deux.
 *
 * On balaie **toute** la cellule et non son seul centre : un contour plus fin
 * qu'un pixel passe entre deux centres, et le trait sortait troué.
 */
export function cellulesAllumees(
  contours: Uint8ClampedArray,
  largeur: number,
  hauteur: number,
  grain: number,
): Uint8Array {
  const colonnes = Math.floor(largeur / grain)
  const lignes = Math.floor(hauteur / grain)
  const grille = new Uint8Array(Math.max(0, colonnes * lignes))
  const bord = (i: number) => Math.round(i * grain)

  for (let c = 0; c < colonnes; c += 1) {
    for (let l = 0; l < lignes; l += 1) {
      let fort = 0
      for (let y = bord(l); y < bord(l + 1); y += 1) {
        for (let x = bord(c); x < bord(c + 1); x += 1) {
          const a = contours[(Math.min(hauteur - 1, y) * largeur + Math.min(largeur - 1, x)) * 4 + 3]
          if (a > fort) fort = a
        }
      }
      if (fort > SEUIL_TRAIT) grille[l * colonnes + c] = 1
    }
  }
  return grille
}

function rasteriser(svg: string, largeur: number, hauteur: number): Promise<HTMLImageElement> {
  return new Promise((resoudre, rejeter) => {
    const image = new Image()
    image.width = largeur
    image.height = hauteur
    image.onload = () => resoudre(image)
    image.onerror = rejeter
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

function contexte(largeur: number, hauteur: number): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, largeur)
  canvas.height = Math.max(1, hauteur)
  return canvas.getContext('2d', { willReadFrequently: true })
}

/**
 * Une pose, prête à poser : la silhouette aplatie à la couleur du fond — c'est
 * elle qui **éteint** la montagne derrière l'oiseau, comme le corps du train —
 * et le contour en cellules pleines par-dessus.
 *
 * Rend `null` plutôt que de lever : sans contexte 2D, la scène garde ses
 * câbles et perd ses oiseaux, elle ne s'arrête pas.
 */
export async function fabriquerPose(
  svg: string,
  largeurCadre: number,
  parCadre: number,
): Promise<HTMLCanvasElement | null> {
  const L = Math.max(8, Math.round(largeurCadre * parCadre))
  const H = Math.max(8, Math.round(largeurCadre * RATIO_POSE * parCadre))
  const { plein, trait } = separer(svg)

  let images: HTMLImageElement[]
  try {
    images = await Promise.all([rasteriser(plein, L, H), rasteriser(trait, L, H)])
  } catch {
    return null
  }
  const [imgPlein, imgTrait] = images

  const lecture = contexte(L, H)
  const sortie = contexte(L, H)
  if (!lecture || !sortie) return null

  // La masse : la silhouette des aplats, aplatie au noir du projet.
  sortie.drawImage(imgPlein, 0, 0, L, H)
  sortie.globalCompositeOperation = 'source-in'
  sortie.fillStyle = NOIR
  sortie.fillRect(0, 0, L, H)
  sortie.globalCompositeOperation = 'source-over'

  lecture.drawImage(imgTrait, 0, 0, L, H)
  const grille = cellulesAllumees(lecture.getImageData(0, 0, L, H).data, L, H, GRAIN_ECRAN)

  const colonnes = Math.floor(L / GRAIN_ECRAN)
  const lignes = Math.floor(H / GRAIN_ECRAN)
  const bord = (i: number) => Math.round(i * GRAIN_ECRAN)
  sortie.fillStyle = GRIS
  for (let c = 0; c < colonnes; c += 1) {
    for (let l = 0; l < lignes; l += 1) {
      if (!grille[l * colonnes + c]) continue
      sortie.fillRect(bord(c), bord(l), bord(c + 1) - bord(c), bord(l + 1) - bord(l))
    }
  }
  return sortie.canvas
}
