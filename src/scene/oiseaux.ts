/**
 * Ce que les bouvreuils choisissent : où se poser, quoi faire sur le fil.
 *
 * Rien ici ne dessine et rien n'a d'état : le hasard entre par `tirage`, pour
 * que chaque choix se vérifie sans scène et sans attendre.
 */
import type { Pose } from './poses'

/** Combien d'oiseaux tiennent sur les fils **en même temps**. */
export const PLACES_SIMULTANEES = 9

/** Ce qu'on laisse libre de chaque côté d'une travée : on ne se pose pas contre un poteau. */
export const MARGE_TRAVEE = 0.08

/** L'écart en deçà duquel deux oiseaux du même fil se gênent. */
export const ECART_MINIMAL = 0.1

/** Combien de places on tire avant d'admettre que le fil est plein. */
export const ESSAIS = 40

export type Place = { fil: number; u: number }
export type Geste = 'demi-tour' | 'pas' | 'ebouriffe'

/**
 * La part des fils qu'on voit vraiment, en abscisse continue.
 *
 * La scène est cadrée en « cover » : un téléphone n'en montre qu'environ un
 * quart de la largeur. Des oiseaux répartis sur toute l'île tombent alors
 * presque tous hors champ, et la gare paraît vide. On ne s'assied donc que là
 * où l'on peut être vu.
 */
export function champSurLesFils(
  xMinVisible: number,
  xMaxVisible: number,
  decalage: number,
  travee: number,
  travees: number,
): { uMin: number; uMax: number } {
  const borne = (x: number) => (x - decalage) / travee
  const uMin = Math.max(MARGE_TRAVEE, borne(xMinVisible))
  const uMax = Math.min(travees - MARGE_TRAVEE, borne(xMaxVisible))
  // Un champ vide — l'île est hors écran — ne doit pas rendre une plage
  // retournée : on garde alors la travée du milieu, faute de mieux.
  if (uMax <= uMin) {
    const milieu = travees / 2
    return { uMin: milieu - MARGE_TRAVEE, uMax: milieu + MARGE_TRAVEE }
  }
  return { uMin, uMax }
}

/**
 * Combien d'oiseaux tiennent dans ce qu'on voit, sans se marcher dessus.
 *
 * Jamais moins de trois : une gare avec un seul oiseau n'est pas une gare où
 * il se passe quelque chose.
 */
export function placesTenables(largeurU: number): number {
  const tiennent = Math.round((largeurU / ECART_MINIMAL) * 0.55)
  return Math.max(3, Math.min(PLACES_SIMULTANEES, tiennent))
}

/**
 * Une place libre sur les fils, ou `null` s'il n'y en a plus.
 *
 * Le tirage est répété plutôt que calculé : chercher la place optimale ferait
 * un alignement régulier, et des oiseaux alignés ne se sont pas posés, ils ont
 * été rangés.
 */
export function placeLibre(
  occupees: ReadonlyArray<Place>,
  fils: number,
  champ: { uMin: number; uMax: number },
  tirage: () => number,
): Place | null {
  for (let essai = 0; essai < ESSAIS; essai += 1) {
    const fil = Math.min(fils - 1, Math.floor(tirage() * fils))
    tirage()
    const u = champ.uMin + tirage() * (champ.uMax - champ.uMin)
    const gene = occupees.some((o) => o.fil === fil && Math.abs(o.u - u) < ECART_MINIMAL)
    if (!gene) return { fil, u }
  }
  return null
}

/** Quand le prochain geste : toutes les 3 à 8 secondes. */
export const prochainGeste = (horloge: number, tirage: () => number): number =>
  horloge + 3 + tirage() * 5

/** Lequel. Le demi-tour domine : c'est celui qui se voit le mieux de loin. */
export function choisirGeste(tirage: () => number): Geste {
  const d = tirage()
  if (d < 0.42) return 'demi-tour'
  if (d < 0.78) return 'pas'
  return 'ebouriffe'
}

/**
 * Quelle pose montrer, et faut-il la retourner.
 *
 * Il n'y a pas de dessin pour la gauche : la pose qui regarde à gauche est la
 * même, retournée au rendu (cadrage §10).
 */
export function poseDuGeste(sens: 1 | -1, ebouriffe: boolean): { pose: Pose; miroir: boolean } {
  return { pose: ebouriffe ? 'perche-ebouriffe' : 'perche', miroir: sens < 0 }
}

/** Combien de temps les trois étoiles tournent au-dessus d'un sonné tout frais. */
export const ETOILES = 2.4

/** Ce que « … » ajoute au sol : il se laisse regarder avant qu'on l'oublie. */
export const REGARD = 2.6

/**
 * Combien de temps dure la séquence au sol.
 *
 * C'est une **durée**, pas un retour : l'oiseau ne repart jamais. « … » reste
 * simplement plus longtemps sous les étoiles que les autres.
 */
export const dureeAuSol = (regard: boolean): number => ETOILES + (regard ? REGARD : 0)

/** Combien de temps dure un pas sur le fil. */
export const DUREE_PAS = 0.34

/**
 * Où en est le pas, de 0 à 1.
 *
 * Un oiseau qui change de place sur le fil **marche** : le poser d'un coup à
 * sa nouvelle place se lit comme une téléportation, pas comme un pas.
 */
export const avancementDuPas = (reste: number): number =>
  1 - Math.max(0, Math.min(1, reste / DUREE_PAS))
