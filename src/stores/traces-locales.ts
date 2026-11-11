import type { Trace } from '@/scene/types'

// The visitor's own stars, kept so they find them again next visit. Same
// pattern as scene/palette.ts: every read and write falls back silently —
// private windows, blocked cookies, full quota.
const CLE = 'train-de-nuit:mes-traces'

function estUneTrace(v: unknown): v is Trace {
  if (typeof v !== 'object' || v === null) return false
  const t = v as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.phrase === 'string' &&
    typeof t.creeLe === 'number' &&
    typeof t.x === 'number' &&
    typeof t.y === 'number' &&
    (t.prenom === undefined || typeof t.prenom === 'string')
  )
}

function lire(): Trace[] {
  try {
    const brut = localStorage.getItem(CLE)
    if (brut === null) return []
    const valeur: unknown = JSON.parse(brut)
    return Array.isArray(valeur) ? valeur.filter(estUneTrace) : []
  } catch {
    return []
  }
}

export function loadMiennes(): Trace[] {
  return lire()
}

export function saveMienne(t: Trace): void {
  try {
    const autres = lire().filter((m) => m.id !== t.id)
    localStorage.setItem(CLE, JSON.stringify([...autres, t]))
  } catch {
    // Repli silencieux : la trace est dans la base, retrouver sa propre étoile est un confort.
  }
}
