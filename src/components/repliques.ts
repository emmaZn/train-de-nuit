/**
 * Ce que disent les bouvreuils.
 *
 * Les phrases sont du ressort de Vue, pas de la scène : la scène décide **où**
 * et **comment ça bouge**, Vue décide **quoi dire** (CONCEPT.md §9).
 */

/** Les quatorze répliques du §4.2, dans l'ordre, quel que soit l'oiseau cliqué. */
export const REPLIQUES = [
  'Je suis dev web front.',
  'J’aime la peinture.',
  'J’aime photographier les animaux.',
  'Et photographier les étoiles.',
  'Et je danse.',
  'Et j’essaie de rendre ma mère fière.',
  'Aïe.',
  'Encore ?',
  'Hé !',
  'Vous vous amusez bien ?',
  'Je vais le dire au chat.',
  'Si vous voulez lui parler, c’est ailleurs.',
  'Vous feriez mieux d’aller laisser une phrase, là-haut.',
  '…',
] as const

/** Ensuite, au hasard : de quoi répondre à quelqu'un qui abuse. */
export const ENSUITE = ['aïe', 'encore ?', 'pfff', 'hé !'] as const

/** Au-delà de ce nombre de caractères, la phrase reste affichée plus longtemps. */
export const PHRASE_LONGUE = 24

export function suivante(dites: number, tirage: () => number): string {
  if (dites < REPLIQUES.length) return REPLIQUES[dites]
  return ENSUITE[Math.min(ENSUITE.length - 1, Math.floor(tirage() * ENSUITE.length))]
}

/**
 * Ce que la chute doit jouer en plus de tomber.
 *
 * Deux phrases seulement en demandent, et toutes deux sont dans la partie
 * ordonnée : au-delà, il n'y a plus de variante.
 */
export function variante(texte: string): { pirouette: boolean; regard: boolean } {
  return { pirouette: texte === 'Et je danse.', regard: texte === '…' }
}

/** Combien de temps la phrase reste à l'écran, en millisecondes. */
export const duree = (texte: string): number => (texte.length > PHRASE_LONGUE ? 3600 : 2800)
