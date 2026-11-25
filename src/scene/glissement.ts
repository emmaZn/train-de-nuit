/**
 * Changer de gare d'un coup de pouce.
 *
 * Emmanuelle, le 24 novembre 2026, troisième de ses trois remarques sur le
 * site en ligne : « on devrait pouvoir slide pour changer de gare je pense ».
 *
 * Ce module ne connaît ni le DOM ni le routeur : il ne fait que **lire un
 * geste**. C'est ce qui permet de le tenir par des tests, là où un écouteur
 * de pointeur ne se vérifie qu'à la main sur un téléphone qu'on n'a pas.
 */

/** Ce qu'un glissement demande, une fois lu. */
export type Sens = 'suivante' | 'precedente'

/**
 * Ce qu'il faut parcourir pour que ce soit un glissement, en pixels d'écran.
 *
 * Soixante-quatre : un peu plus d'un doigt, assez pour qu'un appui qui ripe ne
 * fasse pas partir le train, assez peu pour que le geste reste un geste. Sur
 * le plus étroit des téléphones visés (360 px), c'est moins d'un cinquième de
 * la largeur.
 */
export const COURSE_MIN = 64

/**
 * De combien l'horizontale doit l'emporter sur la verticale.
 *
 * Un pouce ne va jamais droit. En dessous de ce rapport, c'est un geste
 * vertical qu'on ne veut pas interpréter — le CV d'« ailleurs » défile, et
 * rien n'interdit qu'autre chose défile un jour.
 */
export const DOMINANCE = 1.4

/**
 * Ce qu'on laisse au système sur chaque bord, en pixels d'écran.
 *
 * iOS fait revenir en arrière quand un geste part du bord, et Android a le
 * sien. Un glissement qui commence là appartient au téléphone, pas au site :
 * le lui disputer donnerait les deux à la fois.
 */
export const BORD_SYSTEME = 24

/**
 * Au-delà, ce n'est plus un geste mais un déplacement.
 *
 * Sans cette borne, traîner lentement la souris d'un bout à l'autre de la
 * scène ferait partir le train. C'est surtout vrai au pointeur, où rien ne
 * limite la durée d'un appui.
 */
export const DUREE_MAX_MS = 800

/**
 * Le sens d'un glissement, ou `null` si ce n'en est pas un.
 *
 * Vers la gauche, on pousse la scène et la gare suivante arrive — le sens
 * d'un carrousel, et celui de la frise, où les gares défilent de la droite
 * vers la gauche à mesure que le train avance.
 */
export function sensDuGlissement(
  dx: number,
  dy: number,
  dureeMs: number,
  departX: number,
  largeur: number,
): Sens | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null
  if (dureeMs > DUREE_MAX_MS) return null
  if (departX <= BORD_SYSTEME || departX >= Math.max(largeur, 1) - BORD_SYSTEME) return null
  if (Math.abs(dx) < COURSE_MIN) return null
  if (Math.abs(dx) < DOMINANCE * Math.abs(dy)) return null
  return dx < 0 ? 'suivante' : 'precedente'
}

/**
 * Les cibles d'un appui qui ne nous regardent pas.
 *
 * Le formulaire de « là-haut » a deux champs et un bouton, la frise a ses
 * liens, les commandes ont les leurs : y glisser le doigt, c'est y
 * sélectionner du texte ou viser un lien, jamais changer de gare. On s'écarte
 * dès que la cible est, ou est dans, l'un de ces éléments.
 */
const INTERACTIFS = 'input, textarea, select, button, a, [contenteditable], [role="button"]'

export function surUnElementInteractif(cible: EventTarget | null): boolean {
  return cible instanceof Element && cible.closest(INTERACTIFS) !== null
}
