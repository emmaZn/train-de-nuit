/**
 * Le tambour d'un tableau à volets : l'ordre fixe dans lequel passent les
 * caractères, et le temps que met chacun à se poser.
 *
 * Ce module ne sait rien du DOM. `VoletTexte.vue` le lit pour savoir quel
 * glyphe montrer à quel pas, et il le fait **sans toucher au vrai texte**.
 */

/**
 * L'ordre du tambour. Le blanc d'abord, comme un volet au repos ; puis les
 * lettres, les accentuées à leur suite (le `É` d'« ÉCRIRE », le `À` d'« À
 * L'HEURE », le `Ê` d'« ARRÊT ») ; puis les chiffres dans l'ordre, que l'horloge
 * parcourt ; puis les deux signes des heures et des élisions.
 *
 * Il n'y a que ce que `horaires.ts` peut afficher, et `volets.test.ts` le
 * vérifie sur l'inventaire réel : un caractère qui n'est pas ici est posé
 * d'emblée (voir `glypheA`), il ne casse rien — mais il saute aux yeux.
 */
export const ALPHABET: readonly string[] = [...` ABCDEFGHIJKLMNOPQRSTUVWXYZÀÉÊ0123456789:'`]

/**
 * Volets parcourus avant de se poser. Un vrai tambour irait de A à la cible
 * en tournant ; sur un mot de douze lettres, pas plus de dix le rend lisible
 * en moins d'une seconde. C'est le réglage « nombre de glyphes parcourus ».
 * Inférieur à la longueur du tambour : les volets d'un tour sont tous distincts.
 */
export const TOUR = 10

/** Une image de volet, en millisecondes : la vitesse du défilé (réglage raisonné, pas encore réglé à l'œil). */
export const PAS_MS = 40

/** Pas d'écart entre deux caractères voisins : le tableau se pose de gauche à droite. */
export const DECALAGE_CARACTERE = 1

/**
 * Où commence la première ligne des départs, en ms. Réglage raisonné, pas
 * encore réglé à l'œil. Il est calé sur la descente de `rideau.ts` (1,45 s,
 * `back.out(1.1)`) : la plaque atteint sa pose vers 0,69 s, la dépasse un peu
 * vers 0,94 s et finit de se rasseoir ensuite — les lignes partent donc
 * pendant ce dernier rebond. Si la descente change, celui-ci doit suivre.
 */
export const DEBUT_LIGNES_MS = 1000

/** Retard de chaque ligne sur la précédente, en ms : le tableau se pose de haut en bas. */
export const ECART_LIGNES_MS = 200

/**
 * Le bandeau se pose avant les lignes. Réglage raisonné, pas encore réglé à
 * l'œil : à 600 ms la plaque est déjà aux environs de 95 % de sa course.
 */
export const DEBUT_ENTETE_MS = 600

/**
 * Le glyphe que montre le volet d'un caractère, `pas` images après son départ.
 *
 * Avant le départ (`pas < 0`) le volet est blanc. Ensuite il avance de
 * `TOUR` volets dans l'ordre du tambour, en boucle, et finit sur la cible.
 * Un caractère que le tambour n'a pas, ou le blanc lui-même, n'a rien à faire
 * défiler : il est posé tel quel, et jamais remplacé par un autre.
 */
export function glypheA(cible: string, pas: number): string {
  if (pas < 0) return ' '
  const rang = ALPHABET.indexOf(cible)
  if (rang <= 0 || pas >= TOUR) return cible
  return ALPHABET[(rang - TOUR + pas + ALPHABET.length) % ALPHABET.length]
}

/** Images pour que le dernier de `n` caractères soit posé. Zéro sans caractère. */
export function dureeEnPas(n: number): number {
  return n > 0 ? (n - 1) * DECALAGE_CARACTERE + TOUR : 0
}
