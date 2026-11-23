/**
 * Les poses des bouvreuils, et leur passage à la matière du projet.
 *
 * Les dessins sont faits **pour la ligne** : une silhouette fermée remplie de
 * `#0b0b0c`, qui masse comme le corps du train, et rien à l'intérieur hors des
 * marques qui portent un sens (cadrage §10). Le passage au grain ne garde donc
 * que le contour, quantifié à la cellule du projet : c'est la recette
 * « trait seul », celle qu'Emmanuelle a choisie entre quatre.
 *
 * Depuis le 21 novembre 2026, la cuisson passe par `grain.ts` : le contour est
 * **troué** comme celui du train, et la cellule est celle du train — 1,20 px de
 * cadre — au lieu des 1,5 px d'écran du massif. « La texture de la gare, du
 * train et du réverbère est très bien ; est-ce qu'on peut avoir la même chose
 * pour les poteaux électriques et les oiseaux ? »
 *
 * **Le corps, lui, reste vide** (`RECETTE_POSE`) : voir plus bas.
 */
import { NOIR, RECETTE, TROUS, cellule, cellulesClaires, peindreClaires } from './grain'
import type { Recette } from './grain'

export const POSES = ['perche', 'perche-ebouriffe', 'sonne', 'vol-haut', 'vol-bas'] as const
export type Pose = (typeof POSES)[number]

/**
 * Cellule de grain, en texels du rendu — celle du massif et de la terre.
 *
 * Elle ne cuit plus les pièces d'ici : `fabriquerPiece` prend la cellule du
 * train (`grain.CELLULE_CADRE`), qui se compte en pixels de cadre. Elle reste
 * exportée parce que le quai, le faisceau et le rideau la lisent ici, et qu'ils
 * dessinent, eux, dans le repère de l'écran.
 */
export const GRAIN_ECRAN = 1.5

/** Au-delà de cette opacité, on considère que le contour couvre le pixel. */
export const SEUIL_TRAIT = 70


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
 * Quelles cellules une couche allume, en 0 ou 1 — jamais entre les deux.
 *
 * On balaie **toute** la cellule et non son seul centre : un contour plus fin
 * qu'un pixel passe entre deux centres, et le trait sortait troué.
 *
 * `entiere` renverse la question : au lieu d'allumer la cellule qu'un trait
 * **effleure**, on n'allume que celle qu'une masse **couvre d'un bout à
 * l'autre**. C'est ce qu'il faut pour y semer de la matière : un point clair
 * tiré sur une cellule à moitié vide déborderait de la silhouette, et
 * l'oiseau se mettrait à perdre des miettes.
 */
export function cellulesAllumees(
  contours: Uint8ClampedArray,
  largeur: number,
  hauteur: number,
  grain: number,
  entiere = false,
): Uint8Array {
  const colonnes = Math.floor(largeur / grain)
  const lignes = Math.floor(hauteur / grain)
  const grille = new Uint8Array(Math.max(0, colonnes * lignes))
  const bord = (i: number) => Math.round(i * grain)

  for (let c = 0; c < colonnes; c += 1) {
    for (let l = 0; l < lignes; l += 1) {
      let fort = 0
      let faible = 255
      for (let y = bord(l); y < bord(l + 1); y += 1) {
        for (let x = bord(c); x < bord(c + 1); x += 1) {
          const a = contours[(Math.min(hauteur - 1, y) * largeur + Math.min(largeur - 1, x)) * 4 + 3]
          if (a > fort) fort = a
          if (a < faible) faible = a
        }
      }
      if ((entiere ? faible : fort) > SEUIL_TRAIT) grille[l * colonnes + c] = 1
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
 * Une pièce du décor, passée à la matière du projet : la silhouette aplatie à
 * la couleur du fond — c'est elle qui **éteint** ce qu'il y a derrière, comme
 * le corps du train — et le contour en cellules pleines par-dessus.
 *
 * `ratio` est celui du dessin, hauteur sur largeur : une pose d'oiseau a le
 * sien (`RATIO_POSE`). Les oiseaux sont les seuls à passer par ici : le
 * bâtiment et le réverbère sont des images déjà grainées
 * (`QuaiLayer.PIECES_IMAGE`), et le banc et la valise ne sont plus posés
 * (`quai.ts`) — ils repasseront par cette fonction quand ils reviendront.
 *
 * Rend `null` plutôt que de lever : sans contexte 2D, la scène garde ses
 * câbles et perd ses oiseaux, elle ne s'arrête pas.
 */
export async function fabriquerPiece(
  svg: string,
  largeurCadre: number,
  ratio: number,
  parCadre: number,
  recette: Recette = RECETTE,
): Promise<HTMLCanvasElement | null> {
  const L = Math.max(8, Math.round(largeurCadre * parCadre))
  const H = Math.max(8, Math.round(largeurCadre * ratio * parCadre))
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

  // Les deux couches, lues l'une après l'autre dans la même toile : le contour
  // dès qu'il effleure une cellule, la masse seulement là où elle la remplit.
  const taille = cellule(parCadre)
  lecture.drawImage(imgTrait, 0, 0, L, H)
  const grilleTrait = cellulesAllumees(lecture.getImageData(0, 0, L, H).data, L, H, taille)
  lecture.clearRect(0, 0, L, H)
  lecture.drawImage(imgPlein, 0, 0, L, H)
  const grilleMasse = cellulesAllumees(lecture.getImageData(0, 0, L, H).data, L, H, taille, true)

  const colonnes = Math.floor(L / taille)
  const lignes = Math.floor(H / taille)
  const claires = cellulesClaires(grilleTrait, grilleMasse, colonnes, lignes, recette)
  peindreClaires(sortie, claires, colonnes, lignes, taille)
  return sortie.canvas
}

/**
 * La recette des bouvreuils : le trait respire, le corps reste vide.
 *
 * `MATIERE` est à **zéro ici, et ici seulement**. Le 15 novembre 2026, quatre
 * recettes de matière ont été comparées dans la scène et Emmanuelle a choisi
 * « trait seul », le corps sans rien dedans. Le 21, les trois états lui ont été
 * remontrés côte à côte — trait seul, trait troué, trait troué plus matière —
 * et elle a tranché le deuxième : « option 2 le trait qui respire ». Elle garde
 * donc son corps vide et prend les trous du train, rien de plus.
 *
 * Le poteau électrique, lui, garde la matière dans son fût : sa masse est une
 * structure, pas une silhouette dessinée pour la ligne.
 */
export const RECETTE_POSE: Recette = { matiere: { haut: 0, bas: 0 }, trous: TROUS }

/** Une pose d'oiseau : la pièce au ratio du cadre des poses, et rien d'autre. */
export function fabriquerPose(
  svg: string,
  largeurCadre: number,
  parCadre: number,
  recette: Recette = RECETTE_POSE,
): Promise<HTMLCanvasElement | null> {
  return fabriquerPiece(svg, largeurCadre, RATIO_POSE, parCadre, recette)
}
