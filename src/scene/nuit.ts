import { PHASE_FREINAGE, PHASE_ROULE } from './Train'
import type { Gare } from './types'

/** Ce que la scène sait du voyage, rien de plus : `nuitDeLaGare` n'a pas de mémoire. */
export type EtatVoyage = {
  gare: Gare // la gare derrière le train
  cible: Gare | null
  enRoute: boolean
  phase: number // avancement de l'étape en cours, 0 à 1
  derniereEtape: boolean
  /**
   * Vrai seulement si le train est **reparti d'un arrêt** sur cette étape-ci.
   *
   * C'est le seul discriminant entre « repartir d'« ailleurs » » et « venir de
   * passer devant sans s'arrêter » : les deux ont `gare === 'ailleurs'`,
   * `enRoute` vrai et la phase remise à zéro, parce que `finirEtape` avance la
   * gare à **chaque** frontière d'étape, traversées comprises. C'est le
   * `profil.demarrage` de `Scene`, figé au début de l'étape.
   */
  demarrage: boolean
  reducedMotion: boolean
}

/** Rampe de 0 à 1 entre `debut` et `fin` ; une marche en mouvement réduit. */
function rampe(phase: number, debut: number, fin: number, marche: boolean): number {
  if (marche) return phase >= fin ? 1 : 0
  return Math.min(1, Math.max(0, (phase - debut) / (fin - debut)))
}

/**
 * 0 = scène pleine lumière, 1 = scène au plus sombre.
 *
 * Elle lit l'état du voyage, jamais un événement : un lien partagé qui pose
 * « ailleurs » d'emblée est sombre dès la première image, sans freinage joué.
 * La montée court sur le freinage de la dernière étape vers « ailleurs »
 * (`PHASE_FREINAGE` → 1), la descente sur le démarrage depuis « ailleurs »
 * (0 → `PHASE_ROULE`).
 *
 * **Traverser « ailleurs » sans s'y arrêter ne l'assombrit pas** (spec §6.3 :
 * l'assombrissement tient à l'arrêt, pas au lieu). Une traversée a pourtant
 * exactement l'état d'un départ — même gare derrière le train, même phase
 * remise à zéro — et seul `demarrage` les distingue.
 */
export function nuitDeLaGare(etat: EtatVoyage): number {
  const { gare, cible, enRoute, phase, derniereEtape, demarrage, reducedMotion } = etat

  if (enRoute && derniereEtape && cible === 'ailleurs') {
    return rampe(phase, PHASE_FREINAGE, 1, reducedMotion)
  }
  if (enRoute && gare === 'ailleurs') {
    return demarrage ? 1 - rampe(phase, 0, PHASE_ROULE, reducedMotion) : 0
  }
  return gare === 'ailleurs' ? 1 : 0
}
