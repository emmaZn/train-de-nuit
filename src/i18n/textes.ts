/**
 * Tout ce que le site dit, dans les deux langues.
 *
 * `en` est typé `typeof fr` : **TypeScript refuse une clé manquante ou en
 * trop**, et `vue-tsc` le vérifie au build. Un test compare aussi les deux
 * arbres à l'exécution, pour que l'oubli se voie en rouge et pas seulement à
 * la compilation.
 *
 * Ce qui ne se traduit pas et n'est donc pas ici : les noms propres
 * (« Emmanuelle Zenou », « manager.one »), les adresses, et les identifiants
 * de route — `/ici`, `/plus-loin`… restent en français, ce sont des URL
 * partageables qui ne doivent pas changer de forme avec la langue.
 */

const fr = {
  /** Les libellés de la frise. Les routes, elles, ne bougent pas. */
  gares: {
    ici: 'ici',
    'plus-loin': 'plus loin',
    'la-haut': 'là-haut',
    ailleurs: 'ailleurs',
  },

  frise: {
    aria: 'Les gares du voyage',
    aQuai: 'À QUAI',
    prochainArret: 'PROCHAIN ARRÊT',
  },

  ici: {
    /** Le métier, désormais dans le pied de page du site. */
    titre: 'Front End Web Developer',
    accueil: 'Bienvenue',
    phrase: 'Chaque étoile est quelqu’un qui est passé par ici.',
    /** La mention de la plaque. L'altitude est un nombre à confirmer. */
    mention: 'ALT. 612 M · LIGNE DE NUIT · SANS TERMINUS',
  },

  laHaut: {
    titre: 'Laisser une étoile ?',
    phrasePlaceholder: 'une phrase, un mot, une pensée…',
    phraseAria: 'votre phrase',
    prenomPlaceholder: 'un prénom, si vous voulez',
    prenomAria: 'votre prénom',
    laisser: 'laisser ↵',
    nonConfirmee: 'on n’a pas pu confirmer',
    etoilesAria: 'Étoiles laissées par les voyageurs',
  },

  commandes: {
    oeil: 'Changer la couleur de la nuit',
    reverbere: 'Réverbère',
    langue: 'Langue du site',
    versFrancais: 'Lire le site en français',
    versAnglais: 'Read this site in English',
  },

  departs: {
    aria: 'Prochains départs',
    fermer: 'Fermer les prochains départs',
    /* Passe par les volets : seul l'`ALPHABET` de `volets.ts` s'y écrit. */
    entete: 'PROCHAINS DÉPARTS',
  },

  cv: {
    aria: 'Curriculum vitæ',
    titre: 'Feuille de route',
    numero: 'N° 01 · Ailleurs',
    retour: '← retour à la gare',
    fermer: 'Fermer la feuille de route',
    service: 'Service',
    haltes: 'Haltes',
    horsDeLaVoie: 'Hors de la voie',
    terminus: 'Terminus',
  },

  /** `ageRelatif` : ce qui s'écrit sous une phrase laissée par quelqu'un. */
  age: {
    instant: 'à l’instant',
    aujourdhui: 'aujourd’hui',
    hier: 'hier',
    jours: (n: number) => `il y a ${n} jours`,
    mois: (n: number) => `il y a ${n} mois`,
    an: 'il y a 1 an',
    ans: (n: number) => `il y a ${n} ans`,
  },
}

const en: typeof fr = {
  gares: {
    ici: 'here',
    'plus-loin': 'further',
    'la-haut': 'up there',
    ailleurs: 'elsewhere',
  },

  frise: {
    aria: 'The stations along the way',
    aQuai: 'AT PLATFORM',
    prochainArret: 'NEXT STOP',
  },

  ici: {
    titre: 'Front End Web Developer',
    accueil: 'Welcome',
    phrase: 'Every star is someone who passed through here.',
    mention: 'ALT. 612 M · NIGHT LINE · NO TERMINUS',
  },

  laHaut: {
    titre: 'Leave a star?',
    phrasePlaceholder: 'a sentence, a word, a thought…',
    phraseAria: 'your sentence',
    prenomPlaceholder: 'a first name, if you like',
    prenomAria: 'your first name',
    laisser: 'leave ↵',
    nonConfirmee: 'we couldn’t confirm it',
    etoilesAria: 'Stars left by travellers',
  },

  commandes: {
    oeil: 'Change the colour of the night',
    reverbere: 'Street lamp',
    langue: 'Site language',
    versFrancais: 'Lire le site en français',
    versAnglais: 'Read this site in English',
  },

  departs: {
    aria: 'Next departures',
    fermer: 'Close next departures',
    entete: 'NEXT DEPARTURES',
  },

  cv: {
    aria: 'Curriculum vitae',
    titre: 'Route map',
    numero: 'No. 01 · Elsewhere',
    retour: '← back to the station',
    fermer: 'Close the route map',
    service: 'Service',
    haltes: 'Halts',
    horsDeLaVoie: 'Off the tracks',
    terminus: 'Terminus',
  },

  age: {
    instant: 'just now',
    aujourdhui: 'today',
    hier: 'yesterday',
    jours: (n: number) => `${n} days ago`,
    mois: (n: number) => `${n} months ago`,
    an: '1 year ago',
    ans: (n: number) => `${n} years ago`,
  },
}

export type Textes = typeof fr

export const TEXTES = { fr, en } as const
