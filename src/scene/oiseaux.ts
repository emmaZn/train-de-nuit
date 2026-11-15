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
 * Une place libre sur les fils, ou `null` s'il n'y en a plus.
 *
 * Le tirage est répété plutôt que calculé : chercher la place optimale ferait
 * un alignement régulier, et des oiseaux alignés ne se sont pas posés, ils ont
 * été rangés.
 */
export function placeLibre(
  occupees: ReadonlyArray<Place>,
  fils: number,
  travees: number,
  tirage: () => number,
): Place | null {
  for (let essai = 0; essai < ESSAIS; essai += 1) {
    const fil = Math.min(fils - 1, Math.floor(tirage() * fils))
    const travee = Math.min(travees - 1, Math.floor(tirage() * travees))
    const t = MARGE_TRAVEE + tirage() * (1 - 2 * MARGE_TRAVEE)
    const u = travee + t
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
