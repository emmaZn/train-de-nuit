/**
 * Les trois destinations du panneau d'« ailleurs » — un seul endroit.
 *
 * ⚠ BOUCHON : l'adresse mail n'est PAS une décision. Elle est assemblée de
 * morceaux plus bas, et reste à confirmer par Emmanuelle ; rien ne se déploie
 * sans elle. L'URL LinkedIn, elle, est la sienne depuis le 22 novembre 2026.
 */

/** Le profil d'Emmanuelle, donné par elle le 22 novembre 2026. */
export const LINKEDIN = 'https://www.linkedin.com/in/emmanuelle-zenou-a398a6198'

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
