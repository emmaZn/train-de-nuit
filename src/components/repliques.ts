/**
 * Ce que disent les bouvreuils.
 *
 * Les phrases sont du ressort de Vue, pas de la scène : la scène décide **où**
 * et **comment ça bouge**, Vue décide **quoi dire** (CONCEPT.md §9).
 */

import type { Langue } from '@/i18n/langue'

/**
 * Les quatorze répliques du §4.2, dans l'ordre, quel que soit l'oiseau cliqué.
 *
 * Les deux langues gardent **le même ordre et le même nombre** : c'est le rang
 * qui porte le sens, pas le texte. `variante` le montre — elle se lisait sur la
 * phrase française, elle se lit maintenant sur le rang, sans quoi la pirouette
 * et le regard se seraient perdus à la traduction.
 */
const FR = [
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

const EN = [
  'I’m a front-end web dev.',
  'I like painting.',
  'I like photographing animals.',
  'And photographing stars.',
  'And I dance.',
  'And I try to make my mother proud.',
  'Ouch.',
  'Again?',
  'Hey!',
  'Having fun, are we?',
  'I’m telling the cat.',
  'If you want to talk to her, that’s elsewhere.',
  'You’d do better to leave a sentence, up there.',
  '…',
] as const

export const REPLIQUES: Record<Langue, readonly string[]> = { fr: FR, en: EN }

/** Ensuite, au hasard : de quoi répondre à quelqu'un qui abuse. */
export const ENSUITE: Record<Langue, readonly string[]> = {
  fr: ['aïe', 'encore ?', 'pfff', 'hé !'],
  en: ['ouch', 'again?', 'pfff', 'hey!'],
}

/** Les rangs qui jouent quelque chose en plus de tomber. */
const RANG_DANSE = 4
const RANG_SILENCE = 13

/** Au-delà de ce nombre de caractères, la phrase reste affichée plus longtemps. */
export const PHRASE_LONGUE = 24

export function suivante(dites: number, tirage: () => number, langue: Langue): string {
  const dites_ = REPLIQUES[langue]
  if (dites < dites_.length) return dites_[dites]
  const ensuite = ENSUITE[langue]
  return ensuite[Math.min(ensuite.length - 1, Math.floor(tirage() * ensuite.length))]
}

/**
 * Ce que la chute doit jouer en plus de tomber.
 *
 * Deux phrases seulement en demandent, et toutes deux sont dans la partie
 * ordonnée : au-delà, il n'y a plus de variante.
 */
export function variante(rang: number): { pirouette: boolean; regard: boolean } {
  return { pirouette: rang === RANG_DANSE, regard: rang === RANG_SILENCE }
}

/** Combien de temps la phrase reste à l'écran, en millisecondes. */
export const duree = (texte: string): number => (texte.length > PHRASE_LONGUE ? 3600 : 2800)
