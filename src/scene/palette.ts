/**
 * The colours of the night. Clicking the eye walks this cycle; the choice is
 * remembered for the next visit, and every read and write falls back silently
 * when storage is unavailable — private windows, blocked cookies, full quota.
 */
export const PALETTE = ['#151517', '#0a1728', '#0c1c12', '#2f1b0c'] as const

export type Fond = (typeof PALETTE)[number]

/** La première du cycle. */
export const DEFAUT: Fond = PALETTE[0]

const CLE = 'train-de-nuit:fond'

function estDeLaPalette(valeur: string | null): valeur is Fond {
  return valeur !== null && (PALETTE as readonly string[]).includes(valeur)
}

/** Next colour in the cycle; an unknown colour restarts from the default. */
export function nextFond(courant: string): Fond {
  if (!estDeLaPalette(courant)) return DEFAUT
  return PALETTE[(PALETTE.indexOf(courant) + 1) % PALETTE.length]
}

export function loadFond(): Fond {
  try {
    const stocke = localStorage.getItem(CLE)
    return estDeLaPalette(stocke) ? stocke : DEFAUT
  } catch {
    return DEFAUT
  }
}

export function saveFond(fond: string): void {
  try {
    localStorage.setItem(CLE, fond)
  } catch {
    // Repli silencieux : mémoriser la couleur est un confort, pas une fonction.
  }
}

/** The colour as the shader wants it: 0xRRGGBB. */
export function fondToHex(fond: string): number {
  return Number.parseInt(fond.replace('#', ''), 16)
}
