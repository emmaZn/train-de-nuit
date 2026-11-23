/**
 * Le CV — un seul endroit. Données seules, aucune mise en forme.
 *
 * Ni le PDF de 2021 ni la capture LinkedIn du 15 novembre ne sont dans le
 * dépôt : ce module est la source. Trois coupes, toutes d'Emmanuelle :
 * pas de description de poste, pas de langues, pas de liste d'outils.
 * Ni téléphone ni adresse postale : la page est publique et indexable.
 * L'adresse mail vient de `contenu/liens.ts`, assemblée au montage.
 */
// Chemin relatif, et non l'alias : un test interdit le caractère arobase dans
// ce fichier — c'est la garde qui tient l'adresse mail hors du CV, et un import
// ne vaut pas qu'on la relâche.
import type { Langue } from '../i18n/langue'

export type Arret = { intitule: string, lieu: string, depuis: string, jusqua: string, halte: boolean }

/**
 * Une seule voie, du plus récent au plus ancien ; `halte` = diplôme.
 *
 * Les deux langues gardent **le même ordre et le même nombre d'arrêts** : un
 * test les confronte, et la feuille de route les numérote par rang. Les noms
 * propres ne se traduisent pas — « manager.one », « SISTEMIC.IO » —, les
 * établissements prennent leur nom anglais d'usage, et les intitulés de poste
 * leur équivalent du métier.
 */
const FR: readonly Arret[] = [
  { intitule: 'Lead Développeuse Front-End', lieu: 'manager.one', depuis: 'sept. 2023', jusqua: 'aujourd’hui', halte: false },
  { intitule: 'Développeuse Front-End', lieu: 'manager.one', depuis: 'oct. 2021', jusqua: 'août 2023', halte: false },
  { intitule: 'Licence pro Développement Web', lieu: 'Université de Cergy-Pontoise', depuis: '2020', jusqua: '2021', halte: true },
  { intitule: 'Apprentie développeuse Full-Stack', lieu: 'SISTEMIC.IO', depuis: 'août 2020', jusqua: 'sept. 2021', halte: false },
  { intitule: 'DUT Informatique (accéléré)', lieu: 'Université Paris-Saclay', depuis: '2019', jusqua: '2020', halte: true },
  { intitule: 'Vendeuse polyvalente', lieu: 'Courir · Desigual · Mellow Yellow', depuis: '2016', jusqua: '2019', halte: false },
  { intitule: 'L2 Sciences pour l’ingénieur', lieu: 'Université Clermont Auvergne · Prépa Polytech', depuis: '2015', jusqua: '2019', halte: true },
]

const EN: readonly Arret[] = [
  { intitule: 'Lead Front-End Developer', lieu: 'manager.one', depuis: 'Sept. 2023', jusqua: 'today', halte: false },
  { intitule: 'Front-End Developer', lieu: 'manager.one', depuis: 'Oct. 2021', jusqua: 'Aug. 2023', halte: false },
  { intitule: 'Professional Bachelor’s, Web Development', lieu: 'Cergy-Pontoise University', depuis: '2020', jusqua: '2021', halte: true },
  { intitule: 'Full-Stack Developer Apprentice', lieu: 'SISTEMIC.IO', depuis: 'Aug. 2020', jusqua: 'Sept. 2021', halte: false },
  { intitule: 'Two-year Computer Science degree (fast track)', lieu: 'Paris-Saclay University', depuis: '2019', jusqua: '2020', halte: true },
  { intitule: 'Sales Assistant', lieu: 'Courir · Desigual · Mellow Yellow', depuis: '2016', jusqua: '2019', halte: false },
  { intitule: 'Second year, Engineering Science', lieu: 'Clermont Auvergne University · Polytech preparatory', depuis: '2015', jusqua: '2019', halte: true },
]

export const PARCOURS: Record<Langue, readonly Arret[]> = { fr: FR, en: EN }

export const HORS_DE_LA_VOIE: Record<Langue, readonly string[]> = {
  fr: ['danses sociales en compétition', 'peinture acrylique', 'piano', 'ukulélé'],
  en: ['competitive social dancing', 'acrylic painting', 'piano', 'ukulele'],
}

/** Le mail vient de `contenu/liens.ts` (jamais en clair ici). */
export const TERMINUS: { github: string } = { github: 'github.com/emmaZn' }
