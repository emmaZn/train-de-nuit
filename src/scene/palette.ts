/**
 * Les deux modes du site. L'œil ne parcourt plus un cycle de couleurs, il
 * bascule : la nuit, et le jour qui en est le négatif sur papier. Le choix est
 * retenu pour la visite suivante, et chaque lecture comme chaque écriture
 * retombe en silence quand le stockage est indisponible — fenêtre privée,
 * cookies bloqués, quota plein.
 */
export type Mode = 'nuit' | 'jour'

export const MODES = ['nuit', 'jour'] as const satisfies readonly Mode[]

/** On arrive de nuit. C'est le nom du site. */
export const DEFAUT: Mode = 'nuit'

/**
 * L'inversion est à 100 % : la teinte encre `#151517` est le sol de la nuit et
 * le trait du jour. Le papier `#F2EEE6` a été choisi parmi trois beiges, rendus
 * sur la scène qui bouge.
 */
export const COULEURS: Record<Mode, { fond: string; trait: string; texte: string }> = {
  nuit: { fond: '#151517', trait: '#e6e6ea', texte: '#ececf0' },
  jour: { fond: '#F2EEE6', trait: '#151517', texte: '#151517' },
}

const CLE = 'train-de-nuit:mode'

function estUnMode(valeur: string | null): valeur is Mode {
  return valeur !== null && (MODES as readonly string[]).includes(valeur)
}

/** L'autre mode. Un mode inconnu part vers le jour, puisqu'on le lit comme la nuit. */
export function autreMode(courant: string): Mode {
  return courant === 'jour' ? 'nuit' : 'jour'
}

export function loadMode(): Mode {
  try {
    const stocke = localStorage.getItem(CLE)
    return estUnMode(stocke) ? stocke : DEFAUT
  } catch {
    return DEFAUT
  }
}

export function saveMode(mode: Mode): void {
  try {
    localStorage.setItem(CLE, mode)
  } catch {
    // Repli silencieux : mémoriser le mode est un confort, pas une fonction.
  }
}

/** The colour as the shader wants it: 0xRRGGBB. */
export function fondToHex(fond: string): number {
  const brut = fond.replace('#', '')
  // La forme courte vaut sa forme longue : #abc, c'est #aabbcc. Sans cette
  // expansion, parseInt le lirait comme #000abc — une tout autre couleur, et
  // en silence. Seuls les gris comme #000 survivaient par hasard.
  const plein = brut.length === 3 ? [...brut].map((c) => c + c).join('') : brut
  return Number.parseInt(plein, 16)
}
