const JOUR = 86_400_000

/** Local calendar day number: midnight to midnight, immune to DST shifts. */
function jourCalendaire(t: number): number {
  const d = new Date(t)
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / JOUR)
}

/** Whole calendar months between two timestamps, local time. */
function moisEcoules(creeLe: number, maintenant: number): number {
  const a = new Date(creeLe)
  const b = new Date(maintenant)
  let mois = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()
  if (b.getDate() < a.getDate()) mois -= 1
  return mois
}

/**
 * How long ago, in French. Compares local calendar days, not 24-hour slices:
 * « hier » is yesterday, even at 23:50.
 */
export function ageRelatif(creeLe: number, maintenant: number): string {
  if (maintenant - creeLe < 60_000) return 'à l’instant'
  const jours = jourCalendaire(maintenant) - jourCalendaire(creeLe)
  if (jours <= 0) return 'aujourd’hui'
  if (jours === 1) return 'hier'
  if (jours < 30) return `il y a ${jours} jours`
  const mois = Math.max(1, moisEcoules(creeLe, maintenant))
  if (mois < 12) return `il y a ${mois} mois`
  const ans = Math.floor(mois / 12)
  return ans === 1 ? 'il y a 1 an' : `il y a ${ans} ans`
}
