/**
 * Le CV — un seul endroit. Données seules, aucune mise en forme.
 *
 * Ni le PDF de 2021 ni la capture LinkedIn du 15 novembre ne sont dans le
 * dépôt : ce module est la source. Trois coupes, toutes d'Emmanuelle :
 * pas de description de poste, pas de langues, pas de liste d'outils.
 * Ni téléphone ni adresse postale : la page est publique et indexable.
 * L'adresse mail vient de `contenu/liens.ts`, assemblée au montage.
 */
export type Arret = { intitule: string, lieu: string, depuis: string, jusqua: string, halte: boolean }

/** Une seule voie, du plus récent au plus ancien ; `halte` = diplôme. */
export const PARCOURS: readonly Arret[] = [
  { intitule: 'Lead Développeuse Front-End', lieu: 'manager.one', depuis: 'sept. 2023', jusqua: 'aujourd’hui', halte: false },
  { intitule: 'Développeuse Front-End', lieu: 'manager.one', depuis: 'oct. 2021', jusqua: 'août 2023', halte: false },
  { intitule: 'Licence pro Développement Web', lieu: 'Université de Cergy-Pontoise', depuis: '2020', jusqua: '2021', halte: true },
  { intitule: 'Apprentie développeuse full-stack', lieu: 'SISTEMIC.IO · Clermont-Ferrand', depuis: 'août 2020', jusqua: 'sept. 2021', halte: false },
  { intitule: 'DUT Informatique (accéléré)', lieu: 'Université Paris-Saclay', depuis: '2019', jusqua: '2020', halte: true },
  { intitule: 'Vendeuse polyvalente', lieu: 'Courir · Desigual · Mellow Yellow', depuis: '2016', jusqua: '2019', halte: false },
  { intitule: 'L2 Sciences pour l’ingénieur', lieu: 'Université Clermont Auvergne · Prépa Polytech', depuis: '2015', jusqua: '2019', halte: true },
]

export const HORS_DE_LA_VOIE: readonly string[] = [
  'danses sociales en compétition',
  'peinture acrylique',
  'piano',
  'ukulélé',
]

/** Le mail vient de `contenu/liens.ts` (jamais en clair ici). */
export const TERMINUS: { github: string } = { github: 'github.com/emmaZn' }
