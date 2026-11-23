import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useLangue } from './langue'
import { TEXTES } from './textes'
import type { Textes } from './textes'

export type { Langue } from './langue'
export type { Textes }
export { LANGUES, useLangue } from './langue'
export { TEXTES }

/**
 * Les textes de la langue courante, pour un composant.
 *
 * Un `computed` et non un objet figé : la bascule doit se voir sans remonter
 * les composants, et sans que chacun ait à écouter le magasin.
 */
export function useTextes(): ComputedRef<Textes> {
  const langue = useLangue()
  return computed(() => TEXTES[langue.langue])
}
