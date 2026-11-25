import { Assets, Texture } from 'pixi.js'
import type { Mode } from './palette'
import type { Manifest, SequenceSpec } from './types'

/** Le dossier qu'écrit `build_assets.py`, et que le mode remplace au chargement. */
const JEU_ECRIT = '/assets/train/'

/** Un dossier par mode, et un seul part sur le réseau par visite. */
const JEUX: Record<Mode, string> = {
  nuit: '/assets/train-nuit/',
  jour: '/assets/train-jour/',
}

/**
 * Pose le préfixe du mode sur tous les `path` du manifeste qui désignent le
 * dossier du train — les six séquences, et la voie qui y vit aussi.
 *
 * Le manifeste, lui, ne change pas : les deux jeux ont exactement les mêmes
 * boîtes et les mêmes comptes — seule la matière du trait diffère —, et il
 * reste donc la seule source de ces nombres-là.
 */
function poserLeJeu(valeur: unknown, prefixe: string): void {
  if (!valeur || typeof valeur !== 'object') return
  const objet = valeur as Record<string, unknown>
  for (const [cle, v] of Object.entries(objet)) {
    if (cle === 'path' && typeof v === 'string') objet.path = v.replace(JEU_ECRIT, prefixe)
    else poserLeJeu(v, prefixe)
  }
}

/** `assets/mountains/{i}.webp` + 7 → `assets/mountains/0007.webp` */
export function framePath(pattern: string, index: number): string {
  return pattern.replace('{i}', String(index).padStart(4, '0'))
}

/**
 * Never throws: a missing or unreadable manifest yields null, and the scene
 * then shows background and star dust rather than a black canvas.
 */
export async function loadManifest(
  url = '/assets/manifest.json',
  mode?: Mode,
): Promise<Manifest | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const manifeste = (await response.json()) as Manifest
    // Un mode inconnu prend la nuit : mieux vaut le jeu de l'autre mode que
    // deux cent trente-six images introuvables.
    poserLeJeu(manifeste, JEUX[mode as Mode] ?? JEUX.nuit)
    return manifeste
  } catch {
    return null
  }
}

export async function loadTexture(path: string): Promise<Texture | null> {
  try {
    return await Assets.load<Texture>(path)
  } catch {
    return null
  }
}

/**
 * Combien d'images d'une séquence sont demandées en même temps.
 *
 * Six, et non une : les images partaient en file indienne, chacune attendant
 * la précédente. Sur la boucle locale ça ne se voyait pas ; sur un téléphone,
 * où chaque aller-retour coûte sa latence, les 237 images du train faisaient
 * quelque 120 attentes mises bout à bout.
 *
 * Six, et non trente : au-delà, le navigateur met les requêtes en file lui-même
 * — six par origine en HTTP/1.1 — et une rafale de deux cents demandes ferait
 * surtout concurrence au massif, qui est l'autre chose qu'on attend.
 */
export const PARALLELE_SEQUENCE = 6

/**
 * Charge une séquence par paquets de `PARALLELE_SEQUENCE`.
 *
 * Le tableau rendu suit **l'ordre des images**, et non celui des réponses :
 * chaque ouvrier écrit à sa place, et le tableau n'est resserré qu'à la fin.
 * Une image manquante est sautée, jamais fatale — la séquence est alors plus
 * courte, ce que `frameIndex` sait faire.
 */
export async function loadSequence(
  spec: Pick<SequenceSpec, 'count' | 'path'>,
): Promise<Texture[]> {
  const places: (Texture | null)[] = new Array(spec.count).fill(null)
  let prochaine = 0

  async function ouvrier(): Promise<void> {
    for (;;) {
      const rang = prochaine
      prochaine += 1
      if (rang >= spec.count) return
      places[rang] = await loadTexture(framePath(spec.path, rang + 1))
    }
  }

  const ouvriers = Math.max(1, Math.min(PARALLELE_SEQUENCE, spec.count))
  await Promise.all(Array.from({ length: ouvriers }, ouvrier))
  return places.filter((texture): texture is Texture => texture !== null)
}
