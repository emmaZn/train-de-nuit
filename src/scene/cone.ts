/**
 * La géométrie du cône du faisceau (spec §6.2) : des nombres et des fonctions
 * pures, rien ne dessine — aucun import de Pixi. Pendant de `quai.ts` pour
 * `QuaiLayer.ts`. `Faisceau.ts` trace le cône et sa poussière, `neige.ts` tire
 * les flocons qui y tombent : tous deux lisent le cône ici, sans que l'un
 * charge l'autre.
 */
import { CADRES } from './quai'
import type { PIECES } from './quai'

export type Point = { x: number; y: number }

/** Le cône, en pixels de cadre, depuis la lanterne. */
export type Cone = {
  sommet: Point
  /** Les abscisses des deux coins de la base, à `sommet.y + hauteur`. */
  base: [number, number]
  hauteur: number
}

/**
 * D'où part le faisceau, en unités du cadre du réverbère : le **haut** du
 * corps vitré, qui court de 110 à 165 (`LANTERNE` dans `quai.ts`). La
 * lanterne se tient donc dans la pointe du cône, là où il est le plus clair —
 * c'est ce qui la pose comme la source.
 *
 * Passé de 48 à 108 avec le lampadaire de la propriétaire : son dessin porte
 * une flèche et un toit au-dessus de la lanterne, là où l'ancien SVG avait
 * presque tout de suite le verre. Le sommet du cône **suit la lanterne**,
 * sinon il partirait du vide au-dessus d'elle.
 */
const HAUT_LANTERNE = 108
/** Le cadre du dessin, en unités : posé à `piece.hauteur` pixels. */
const HAUTEUR_CADRE = CADRES.reverbere.hauteur

/**
 * Demi-ouverture de la base, en pixels de cadre : **la largeur du faisceau**.
 * Elle commande le cône peint **et** la population de poussière, qui garde sa
 * densité — élargir le faisceau ne l'éclaircit pas, il en met simplement sur
 * plus de surface. Passée de 170 à 230 au réglage 3 : la maquette montre un
 * cône large. PROVISOIRE (§7) : à régler à vue.
 */
const DEMI_BASE = 230
/** De combien le cône s'arrête au-dessus du sol, en pixels. PROVISOIRE (§7) : à régler à vue. */
const GARDE_AU_SOL = 36

export function coneDuFaisceau(piece: typeof PIECES.reverbere): Cone {
  const sommet = {
    x: piece.x,
    y: piece.pied - piece.hauteur + (HAUT_LANTERNE * piece.hauteur) / HAUTEUR_CADRE,
  }
  return {
    sommet,
    base: [piece.x - DEMI_BASE, piece.x + DEMI_BASE],
    hauteur: piece.pied - GARDE_AU_SOL - sommet.y,
  }
}

/**
 * Un point uniforme sur la surface du cône, avec sa profondeur `t` (0 au
 * sommet, 1 à la base). La profondeur se tire en **racine carrée** : sinon le
 * sommet, plus étroit, serait plus dense que la base.
 *
 * `suivant` est un générateur dans `[0, 1)` (`alea`).
 */
export function pointDuCone(cone: Cone, suivant: () => number): Point & { t: number } {
  const t = Math.sqrt(suivant())
  const u = suivant()
  const gauche = cone.sommet.x + (cone.base[0] - cone.sommet.x) * t
  const droite = cone.sommet.x + (cone.base[1] - cone.sommet.x) * t
  return { x: gauche + (droite - gauche) * u, y: cone.sommet.y + cone.hauteur * t, t }
}

/**
 * Un cheveu de tolérance, parce qu'un point du bord du cône y revient par un
 * aller-retour en virgule flottante : `nappesDuCone` calcule `y` depuis `t`,
 * on recalcule `t` depuis `y`, et les deux ne retombent pas toujours sur le
 * même dernier bit. L'écart mesuré vaut 2 × 10⁻¹³ pixel.
 */
const CHEVEU = 1e-9

/** Le point est-il dans le cône (bord compris, à un cheveu près) ? */
export function dansLeCone(cone: Cone, p: Point): boolean {
  const t = (p.y - cone.sommet.y) / cone.hauteur
  if (t < -CHEVEU || t > 1 + CHEVEU) return false
  const gauche = cone.sommet.x + (cone.base[0] - cone.sommet.x) * t
  const droite = cone.sommet.x + (cone.base[1] - cone.sommet.x) * t
  return p.x >= gauche - CHEVEU && p.x <= droite + CHEVEU
}
