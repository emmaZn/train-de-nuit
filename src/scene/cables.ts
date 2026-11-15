/**
 * La géométrie des câbles de « plus loin ».
 *
 * Tout vient de `cables/cables-scene.svg`, dessiné dans un cadre 1280 × 832
 * dont la ligne de rail est à `y = 586`. On ne rasterise pas ce fichier : on en
 * lit les mesures et on redessine, en points à pleine luminance (CONCEPT §4.2).
 *
 * Rien ici ne dessine : ce module ne contient que des nombres et des fonctions
 * pures, pour que tout ce qui se vérifie se vérifie sans canvas.
 */
import { HORIZON, STAGE } from './layout'

/** Le cadre dans lequel le SVG des câbles est dessiné, rail compris. */
export const CADRE_CABLE = { largeur: 1280, rail: 586 } as const

/** Unités du SVG des câbles → pixels du cadre de la scène. */
export const ECHELLE_CABLE = STAGE.width / CADRE_CABLE.largeur

/** Une mesure du SVG, en pixels de cadre. */
export const u = (v: number): number => v * ECHELLE_CABLE

/**
 * Un `y` du SVG, ramené sur la ligne de rail de la scène.
 *
 * On se cale sur `HORIZON` et non sur un `y` de Figma : la scène a été
 * descendue par paliers depuis que ce cadre a été dessiné.
 */
export const yCadre = (ySvg: number): number =>
  HORIZON - (CADRE_CABLE.rail - ySvg) * ECHELLE_CABLE

/** Une travée, d'un poteau au suivant. */
export const TRAVEE = u(620)

/**
 * Les deux fils. `controle` est le décalage du **point de contrôle** de la
 * quadratique, comme dans le SVG : la flèche réelle à mi-portée en vaut la
 * moitié. Les prendre au pied de la lettre donnerait des fils deux fois plus
 * creux que le dessin.
 *
 * `densite` remplace l'opacité du SVG (0,75 et 0,65) : le projet ne connaît
 * pas les mi-teintes, une transparence devient une densité de points.
 */
export const FILS = [
  { y: yCadre(315), controle: u(92), densite: 0.75 },
  { y: yCadre(349), controle: u(104), densite: 0.65 },
] as const

/** Le poteau, pied sur les rails. */
export const POTEAU = {
  sommet: yCadre(294),
  epaule: yCadre(300),
  demiFut: u(3.5),
  bras: [
    { y: yCadre(322), demi: u(34), epaisseur: u(5) },
    { y: yCadre(356), demi: u(26), epaisseur: u(5) },
  ],
} as const

export type Secousse = { amplitude: number; phase: number }

/** Combien un fil pend, à la fraction `t` de sa portée. */
export const creux = (controle: number, t: number): number =>
  Math.sin(Math.PI * t) * (controle / 2)

/** Ce qui reste d'une secousse après `dt`. */
export const amortir = (amplitude: number, dt: number): number =>
  amplitude * Math.exp(-2.2 * dt)

/**
 * La hauteur d'un fil : sa flèche, plus sa vibration.
 *
 * Les deux s'annulent aux poteaux (`sin(π t)`), parce que c'est là que le fil
 * est attaché — une vibration qui ne s'y éteint pas décrocherait le fil.
 */
export function yFil(fil: number, t: number, secousse: Secousse, horloge: number): number {
  const f = FILS[fil]
  const onde = Math.sin(Math.PI * t) * secousse.amplitude * Math.cos(horloge * 9 + secousse.phase)
  return f.y + creux(f.controle, t) + onde
}

/**
 * Le sol qui reste à parcourir jusqu'à l'arrêt de la gare, en pixels de cadre.
 *
 * On s'ancre là-dessus et non sur une position absolue de la ligne : selon
 * qu'on arrive d'« ici » en une étape ou d'« ailleurs » en deux, le sol
 * parcouru diffère de ~320 px, et l'approche ne se lirait pas pareil selon la
 * provenance. Négatif une fois la gare dépassée.
 */
export const distanceGare = (
  etapesAvantGare: number,
  avancementEtape: number,
  solParEtape: number,
): number => (etapesAvantGare - avancementEtape) * solParEtape
