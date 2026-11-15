/**
 * Les trois destinations du panneau d'« ailleurs » — un seul endroit.
 *
 * ⚠ BOUCHONS : l'URL LinkedIn et l'adresse mail ne sont PAS des décisions.
 * Emmanuelle ne les a pas encore données ; rien ne se déploie sans elles.
 */

/** BOUCHON — remplacer par l'URL réelle du profil. */
export const LINKEDIN = 'https://www.linkedin.com/in/bouchon-a-remplacer'

/** La page du CV : route imbriquée sous « ailleurs ». */
export const CV = '/ailleurs/cv'

// BOUCHON — l'adresse réelle est à confirmer. Morceaux séparés : le texte
// source ne contient jamais l'adresse d'un seul tenant.
const LOCAL = ['emmanuelle', 'zenou', 'rogala']
const DOMAINE = ['gmail', 'com']

/** Assemblée au montage, jamais écrite en clair dans le HTML ni dans le source. */
export function adresseMail(): string {
  return `${LOCAL.join('.')}${String.fromCharCode(64)}${DOMAINE.join('.')}`
}
