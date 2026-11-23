import { alea } from './alea'
import type { Langue } from '@/i18n/langue'

export type Depart = {
  heure: string
  destination: string
  statut: string
  lien?: 'linkedin' | 'cv' | 'ecrire'
}

/** Les trois départs réels, toujours à +4, +11 et +19 minutes de `maintenant`. */
export const DECALAGES = [4, 11, 19] as const

type Ligne = { destination: string, statut: string, lien: NonNullable<Depart['lien']> }

/**
 * Les trois départs réels, dans les deux langues.
 *
 * L'ordre et le nombre ne bougent pas : `DECALAGES` les horodate par rang, et
 * un test confronte les deux listes. Les volets ne savent écrire que
 * l'`ALPHABET` de `volets.ts` — lettres sans accent, chiffres, `:` et `'` —,
 * ce que l'anglais respecte sans effort.
 */
const REELS: Record<Langue, ReadonlyArray<Ligne>> = {
  fr: [
    { destination: 'LINKEDIN', statut: 'QUAI 1', lien: 'linkedin' },
    { destination: 'CV', statut: 'QUAI 2', lien: 'cv' },
    { destination: 'ÉCRIRE', statut: 'EMBARQUEMENT', lien: 'ecrire' },
  ],
  en: [
    { destination: 'LINKEDIN', statut: 'PLATFORM 1', lien: 'linkedin' },
    { destination: 'CV', statut: 'PLATFORM 2', lien: 'cv' },
    { destination: 'WRITE', statut: 'BOARDING', lien: 'ecrire' },
  ],
}

/** Le vivier approuvé par Emmanuelle, figé. */
/**
 * Les lignes éteintes : douze destinations qu'on ne prend pas. Même ordre dans
 * les deux langues — le tirage se fait sur le rang, donc une graine donnée rend
 * les mêmes lignes quelle que soit la langue, et seul leur libellé change.
 */
export const VIVIER: Record<Langue, ReadonlyArray<{ destination: string, statut: string }>> = {
  fr: [
    { destination: "L'ENFANCE", statut: 'ANNULÉ' },
    { destination: 'NULLE PART', statut: 'SUPPRIMÉ' },
    { destination: 'LE PRINTEMPS', statut: "À L'HEURE" },
    { destination: 'LA LUNE', statut: 'RETARDÉ' },
    { destination: 'DEMAIN', statut: 'RETARDÉ' },
    { destination: 'LA MER', statut: "À L'HEURE" },
    { destination: 'LE SOMMEIL', statut: 'QUAI 4' },
    { destination: 'AVANT', statut: 'SANS ARRÊT' },
    { destination: 'LE SILENCE', statut: "À L'HEURE" },
    { destination: 'LA MAISON', statut: 'ANNULÉ' },
    { destination: 'PLUS TARD', statut: 'RETARDÉ' },
    { destination: 'LE DÉBUT', statut: 'TERMINUS' },
  ],
  en: [
    { destination: 'CHILDHOOD', statut: 'CANCELLED' },
    { destination: 'NOWHERE', statut: 'TERMINATED' },
    { destination: 'SPRING', statut: 'ON TIME' },
    { destination: 'THE MOON', statut: 'DELAYED' },
    { destination: 'TOMORROW', statut: 'DELAYED' },
    { destination: 'THE SEA', statut: 'ON TIME' },
    { destination: 'SLEEP', statut: 'PLATFORM 4' },
    { destination: 'BEFORE', statut: 'NON STOP' },
    { destination: 'SILENCE', statut: 'ON TIME' },
    { destination: 'HOME', statut: 'CANCELLED' },
    { destination: 'LATER', statut: 'DELAYED' },
    { destination: 'THE BEGINNING', statut: 'TERMINUS' },
  ],
}

/** Écart, en minutes, entre deux lignes éteintes consécutives. */
const ECART_MIN = 5
const ECART_MAX = 12

/** « 21:03 », heure locale. */
export function formaterHeure(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * `maintenant` + n minutes, par arithmétique sur les **champs locaux** de Date :
 * minuit et les fins de mois se règlent d'eux-mêmes, les changements d'heure
 * **non**.
 *
 * `setMinutes` écrit une heure de calendrier, pas un instant. Au retour à
 * l'heure d'hiver — l'heure ambiguë, 02:50 CEST + 19 min — le résultat se lit
 * 03:09, alors que l'instant réel est 02:09 CET : le panneau avance d'une
 * heure, le temps de cette heure-là. Au passage à l'heure d'été, en revanche,
 * l'heure inexistante se résout vers l'avant et l'affichage reste juste
 * (01:58 CET + 4 min → 03:02 CEST, soit bien quatre minutes plus tard).
 *
 * C'est un panneau décoratif : on ne corrige pas, mais on ne le raconte pas
 * de travers.
 */
function plusMinutes(maintenant: Date, n: number): Date {
  const d = new Date(maintenant)
  d.setMinutes(d.getMinutes() + n)
  return d
}

export function departsReels(maintenant: Date, langue: Langue = 'fr'): Depart[] {
  return REELS[langue].map((r, i) => ({
    heure: formaterHeure(plusMinutes(maintenant, DECALAGES[i])),
    destination: r.destination,
    statut: r.statut,
    lien: r.lien,
  }))
}

/**
 * Lignes éteintes, tirées au sort dans le vivier, sans répétition.
 * La graine décide seule des destinations et des écarts ; `maintenant` ne décide que
 * des heures. Même graine, mêmes destinations — l'appelant choisit donc le grain du
 * renouvellement (à chaque arrivée, ou pendant l'arrêt) en changeant, ou non, la graine.
 */
export function departsEteints(
  maintenant: Date,
  graine: number,
  combien: number,
  langue: Langue = 'fr',
): Depart[] {
  const suivant = alea(graine)
  // `Math.floor` : sans lui, un `combien` non entier mélangeait ⌈n⌉ tours de
  // mélange et une tranche de ⌊n⌋.
  const vivier = VIVIER[langue]
  const n = Math.max(0, Math.min(Math.floor(combien), vivier.length))
  const pioche = [...vivier]
  // Mélange de Fisher-Yates partiel : les n premiers sont le tirage.
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(suivant() * (pioche.length - i))
    ;[pioche[i], pioche[j]] = [pioche[j], pioche[i]]
  }
  let minutes: number = DECALAGES[DECALAGES.length - 1]
  return pioche.slice(0, n).map((v) => {
    minutes += ECART_MIN + Math.floor(suivant() * (ECART_MAX - ECART_MIN + 1))
    return { heure: formaterHeure(plusMinutes(maintenant, minutes)), destination: v.destination, statut: v.statut }
  })
}
