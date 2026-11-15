import { alea } from './Sky'

export type Depart = {
  heure: string
  destination: string
  statut: string
  lien?: 'linkedin' | 'cv' | 'ecrire'
}

/** Les trois départs réels, toujours à +4, +11 et +19 minutes de `maintenant`. */
export const DECALAGES = [4, 11, 19] as const

const REELS: ReadonlyArray<{ destination: string, statut: string, lien: NonNullable<Depart['lien']> }> = [
  { destination: 'LINKEDIN', statut: 'QUAI 1', lien: 'linkedin' },
  { destination: 'CV', statut: 'QUAI 2', lien: 'cv' },
  { destination: 'ÉCRIRE', statut: 'EMBARQUEMENT', lien: 'ecrire' },
]

/** Le vivier approuvé par Emmanuelle, figé. */
export const VIVIER: ReadonlyArray<{ destination: string, statut: string }> = [
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
]

/** Écart, en minutes, entre deux lignes éteintes consécutives. */
const ECART_MIN = 5
const ECART_MAX = 12

/** « 21:03 », heure locale. */
export function formaterHeure(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * `maintenant` + n minutes, par arithmétique sur Date : minuit, les fins de mois
 * et les changements d'heure se règlent d'eux-mêmes.
 */
function plusMinutes(maintenant: Date, n: number): Date {
  const d = new Date(maintenant)
  d.setMinutes(d.getMinutes() + n)
  return d
}

export function departsReels(maintenant: Date): Depart[] {
  return REELS.map((r, i) => ({
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
export function departsEteints(maintenant: Date, graine: number, combien: number): Depart[] {
  const suivant = alea(graine)
  const n = Math.max(0, Math.min(combien, VIVIER.length))
  const pioche = [...VIVIER]
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
