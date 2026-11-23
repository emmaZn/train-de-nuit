/**
 * La matière du projet, pour les pièces fabriquées dans le navigateur.
 *
 * Le train, la gare et le réverbère sont des PNG cuits par `outils/grain_train.py` :
 * un trait clair à pleine luminance, troué par endroits, et une masse de la couleur
 * du fond qui porte quelques points clairs — d'autant moins qu'on descend. Les deux
 * pièces que la scène dessine elle-même, le poteau électrique et les bouvreuils,
 * n'avaient ni les trous ni la matière : des aplats nets, d'une autre étoffe que
 * tout ce qui les entoure.
 *
 * Ce module porte cette recette-là, et rien d'autre. Il ne dessine pas : il dit,
 * pour une cellule donnée, ce qu'elle devient. `poses.ts` et `CableLayer.ts`
 * peignent.
 *
 * **Les trois nombres sont des réglages d'œil** (`MATIERE`, `TROUS`,
 * `CELLULE_CADRE`) : ils se jugent dans la scène en mouvement, pas ici.
 */

/** Le gris du massif : la seule clarté du projet. */
export const GRIS = '#EDEDED'

/** La couleur du fond. C'est elle qui éteint ce qu'il y a derrière. */
export const NOIR = '#0b0b0c'

/**
 * La cellule de grain, en **pixels de cadre**.
 *
 * Le train est posé à 0,400 de sa source et cuit en cellules de 3 px : ses
 * cellules font 1,20 px de cadre, et c'est ce nombre-là que la gare et le
 * réverbère sont allés chercher avec `--grain` (20 novembre 2026). Les pièces
 * d'ici le prennent à leur tour.
 *
 * Elle n'est **pas** le `GRAIN_ECRAN = 1.5` du massif, de la terre et des fils,
 * qui se compte en pixels d'écran : à `parCadre = 2`, 1,20 px de cadre en font
 * 2,40, et à 0,63 — un 1366 × 768 à 1× — ils tombent à 0,76. Le massif est au
 * fond, le train au premier plan ; le poteau et les oiseaux sont du côté du
 * train.
 */
export const CELLULE_CADRE = 1.2

/** De quoi est faite la matière d'une masse : sa densité en haut, puis en bas. */
export type Matiere = { haut: number; bas: number }

/**
 * La densité des points clairs dans la masse, du haut de la pièce vers le bas.
 *
 * `0.05, 0.01` est celle du corps du train — 5 % au toit, 1 % aux roues — et
 * celle que la gare v2 a reprise, pour la même raison : son dessin est net, il
 * ne porte aucune matière à lui. Le poteau et les oiseaux sont dans ce cas.
 */
export const MATIERE: Matiere = { haut: 0.05, bas: 0.01 }

/**
 * La part du trait qui saute.
 *
 * `0.02` est le réglage du réverbère, et non les 0,05 de la gare ni les 0,08 du
 * train : ici le trait ne fait qu'une cellule de large, et un trou le coupe net
 * au lieu de le mordre. C'est ce que disait déjà la note de la marquise, qui
 * « se pointille » à 0,08.
 */
export const TROUS = 0.02

/** Ce qu'une cellule devient. `masse` veut dire : on la laisse telle quelle. */
export type Etat = 'trait' | 'masse' | 'vide'

export type Recette = { matiere: Matiere; trous: number }

export const RECETTE: Recette = { matiere: MATIERE, trous: TROUS }

/** Deux tirages indépendants sur la même cellule : les trous, puis la matière. */
const SEL_TROUS = 0x9e3779b9
const SEL_MATIERE = 0x85ebca6b

/**
 * Un bruit déterministe, tiré sur la **cellule** et non sur le pixel.
 *
 * C'est tout l'intérêt de compter les cellules en pixels de cadre : leur nombre
 * ne dépend plus de `parCadre`, donc une pièce recuite après un
 * redimensionnement retrouve exactement les mêmes points. Un bruit tiré par
 * pixel, lui, rebattrait la matière à chaque changement d'échelle — et les cinq
 * poses d'un oiseau, qui s'échangent sept fois par seconde en vol, bouilliraient.
 */
export function bruit(colonne: number, ligne: number, sel: number): number {
  let h = (Math.imul(colonne, 374761393) + Math.imul(ligne, 668265263) + sel) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** La cellule, en texels du rendu. Jamais moins d'un texel : on peint des pixels. */
export function cellule(parCadre: number): number {
  return Math.max(1, CELLULE_CADRE * parCadre)
}

/** Le bord d'une cellule, en texels : les cellules se touchent sans se recouvrir. */
export function bord(i: number, taille: number): number {
  return Math.round(i * taille)
}

/** La densité de matière à la hauteur `t` de la masse, de 0 en haut à 1 en bas. */
export function densite(t: number, matiere: Matiere = MATIERE): number {
  const borne = t < 0 ? 0 : t > 1 ? 1 : t
  return matiere.haut + (matiere.bas - matiere.haut) * borne
}

/**
 * Ce que devient une cellule : du trait, de la masse, ou rien.
 *
 * L'ordre suit `grain_train.py`. Le trait d'abord : il saute une fois sur
 * cinquante, et découvre alors ce qu'il y a dessous — la masse si elle est là,
 * le décor sinon. Puis la masse, qui reçoit ses points clairs. Un trou ne
 * découvre jamais de la matière : sous le trait, la masse est nue.
 */
export function cuireCellule(
  trait: boolean,
  masse: boolean,
  t: number,
  colonne: number,
  ligne: number,
  recette: Recette = RECETTE,
): Etat {
  if (trait) {
    if (bruit(colonne, ligne, SEL_TROUS) < recette.trous) return masse ? 'masse' : 'vide'
    return 'trait'
  }
  if (!masse) return 'vide'
  return bruit(colonne, ligne, SEL_MATIERE) < densite(t, recette.matiere) ? 'trait' : 'masse'
}

/**
 * Entre quelles lignes la masse s'étend, pour y étaler le dégradé de densité.
 *
 * Sur la pièce et non sur la toile : une pose d'oiseau a de l'air au-dessus
 * d'elle, et le dégradé doit partir du haut de l'oiseau. `grain_train.py` fait
 * le même relevé sur les lignes non vides du corps.
 */
export function etendue(
  masse: Uint8Array,
  colonnes: number,
  lignes: number,
): { haut: number; bas: number } {
  let haut = -1
  let bas = -1
  for (let l = 0; l < lignes; l += 1) {
    for (let c = 0; c < colonnes; c += 1) {
      if (!masse[l * colonnes + c]) continue
      if (haut < 0) haut = l
      bas = l
      break
    }
  }
  return haut < 0 ? { haut: 0, bas: 0 } : { haut, bas }
}

/**
 * Les cellules claires d'une pièce : le trait qui reste, et la matière semée
 * dans la masse. Tout le reste est déjà en place ou doit rester vide.
 *
 * Rend les cellules à peindre plutôt que de peindre : c'est ce qui permet de
 * vérifier la recette sans toile, et aux deux pièces de la partager alors que
 * l'une vient d'un SVG rasterisé et l'autre d'une géométrie.
 */
export function cellulesClaires(
  trait: Uint8Array,
  masse: Uint8Array,
  colonnes: number,
  lignes: number,
  recette: Recette = RECETTE,
): Uint8Array {
  const claires = new Uint8Array(Math.max(0, colonnes * lignes))
  const { haut, bas } = etendue(masse, colonnes, lignes)
  const hauteur = Math.max(1, bas - haut)
  for (let l = 0; l < lignes; l += 1) {
    const t = (l - haut) / hauteur
    for (let c = 0; c < colonnes; c += 1) {
      const i = l * colonnes + c
      if (cuireCellule(trait[i] === 1, masse[i] === 1, t, c, l, recette) === 'trait') claires[i] = 1
    }
  }
  return claires
}

/** Peint les cellules claires sur une toile, en gris plein — jamais autre chose. */
export function peindreClaires(
  ctx: CanvasRenderingContext2D,
  claires: Uint8Array,
  colonnes: number,
  lignes: number,
  taille: number,
): void {
  ctx.fillStyle = GRIS
  for (let l = 0; l < lignes; l += 1) {
    const y = bord(l, taille)
    const h = bord(l + 1, taille) - y
    for (let c = 0; c < colonnes; c += 1) {
      if (!claires[l * colonnes + c]) continue
      const x = bord(c, taille)
      ctx.fillRect(x, y, bord(c + 1, taille) - x, h)
    }
  }
}
