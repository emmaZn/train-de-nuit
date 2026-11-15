import { PHASE_FREINAGE, PHASE_ROULE } from './Train'
import type { Gare } from './types'

/** Ce que la scène sait du voyage, rien de plus : `nuitDeLaGare` n'a pas de mémoire. */
export type EtatVoyage = {
  gare: Gare // la gare derrière le train
  cible: Gare | null
  enRoute: boolean
  phase: number // avancement de l'étape en cours, 0 à 1
  derniereEtape: boolean
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
 * (0 → `PHASE_ROULE`). Traverser « ailleurs » sans s'y arrêter ne l'assombrit pas.
 */
export function nuitDeLaGare(etat: EtatVoyage): number {
  const { gare, cible, enRoute, phase, derniereEtape, reducedMotion } = etat

  if (enRoute && derniereEtape && cible === 'ailleurs') {
    return rampe(phase, PHASE_FREINAGE, 1, reducedMotion)
  }
  if (enRoute && gare === 'ailleurs') {
    return 1 - rampe(phase, 0, PHASE_ROULE, reducedMotion)
  }
  return gare === 'ailleurs' ? 1 : 0
}
