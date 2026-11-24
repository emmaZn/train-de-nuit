/**
 * Les trois destinations du panneau d'« ailleurs » — un seul endroit.
 *
 * Les deux adresses sont confirmées : le profil LinkedIn le 22 novembre 2026,
 * l'adresse mail le 24. Plus de bouchon ici — c'est ce qui bloquait la mise
 * en ligne.
 */

/** Le profil d'Emmanuelle, donné par elle le 22 novembre 2026. */
export const LINKEDIN = 'https://www.linkedin.com/in/emmanuelle-zenou-a398a6198'

/** La page du CV : route imbriquée sous « ailleurs ». */
export const CV = '/ailleurs/cv'

// Morceaux séparés, et c'est le seul point : le texte source ne contient
// jamais l'adresse d'un seul tenant, ni le HTML servi. Un test refuse toute
// chaîne qui ressemble à une adresse dans ce fichier comme dans le rendu —
// les aspirateurs lisent les pages, pas les fonctions.
const LOCAL = ['emmanuelle', 'zenou', 'rogala']
const DOMAINE = ['gmail', 'com']

/** Assemblée au montage, jamais écrite en clair dans le HTML ni dans le source. */
export function adresseMail(): string {
  return `${LOCAL.join('.')}${String.fromCharCode(64)}${DOMAINE.join('.')}`
}
