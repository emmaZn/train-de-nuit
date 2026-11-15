/**
 * Le reflet sous la voie, et l'eau qui le porte.
 *
 * Mesuré avant : la bande du reflet occupait 18 % de la hauteur de l'écran et
 * n'y renvoyait rien — 0,4 % de couverture, luminance maximale 48 sur un fond à
 * 21. Un cinquième du cadre ne faisait rien, et son atténuation par l'opacité
 * (0,16, plus un flou) fabriquait des mi-teintes, ce que le projet refuse
 * partout ailleurs.
 *
 * Le reflet est donc rendu **à pleine force**, et c'est un **masque de grain**
 * qui lui retire des points : ce qui reste garde sa luminance. L'eau se défait
 * en s'éloignant au lieu de pâlir.
 *
 * Trois choses le font tenir :
 * - la texture est rendue à la taille du cadre et échantillonnée **au plus
 *   proche voisin**. Au demi, l'agrandissement rééchantillonnait le grain
 *   binaire en gris, et le flou achevait le travail ;
 * - l'extinction se compte en **pixels du cadre** et non en part de la hauteur
 *   du sprite : celui-ci descend 921 px sous la voie, dont on n'en voit que
 *   trois cents ;
 * - la bande sous la voie reste **de la couleur du fond**, comme le reste de la
 *   nuit. On a essayé de l'assombrir : ça ne fait que donner plus de contraste
 *   aux points, qui ressortaient alors trop en bas ;
 * - les points **grisent** en descendant, en plus de se raréfier. C'est la
 *   seule mi-teinte assumée ici : un reflet qui ne ferait que s'éclaircir par
 *   trous garderait des points aussi blancs tout en bas que contre la voie, et
 *   c'est ce qui les faisait ressortir.
 */

/** Part des points gardés au ras de la voie. Une valeur d'œil. */
export const DENSITE = 0.8

/**
 * Sur combien de pixels du cadre le reflet se défait. En pixels et non en part
 * de la hauteur du sprite, qui descend bien plus bas que ce qu'on voit.
 *
 * Courte : le reflet se tient contre la voie et le bas de l'écran revient à la
 * nuit. Plus longue, ses points gagnaient le bas du cadre, où ils n'ont plus
 * rien à refléter et ne font que du bruit clair sur le fond.
 */
export const PORTEE = 110

/** Taille d'une cellule, en pixels d'écran — celle du massif. */
export const GRAIN_ECRAN = 1.5

/**
 * Sur combien de pixels du cadre les points grisent, et jusqu'où. Ils gardent
 * un minimum de présence : sous ce plancher ils ne seraient plus gris mais
 * absents, ce dont la raréfaction s'occupe déjà.
 */
export const TEINTE = 110
export const TEINTE_MIN = 0.22

function alea(graine: number): () => number {
  let s = graine >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** La densité gardée à une profondeur donnée, en pixels du cadre sous la voie. */
export function densiteA(profondeur: number, densite = DENSITE, portee = PORTEE): number {
  return densite * Math.exp(-Math.max(0, profondeur) / Math.max(1, portee))
}

/**
 * Ce qui reste de la luminance d'un point à cette profondeur, de 1 contre la
 * voie à `TEINTE_MIN` tout en bas. C'est l'opacité du masque : un point à demi
 * opaque se mélange au fond et devient gris.
 */
export function teinteA(profondeur: number, portee = TEINTE, plancher = TEINTE_MIN): number {
  const t = Math.exp(-Math.max(0, profondeur) / Math.max(1, portee))
  return plancher + (1 - plancher) * t
}

/**
 * Le masque : opaque là où le reflet passe, transparent ailleurs. Jamais entre
 * les deux — c'est ce qui garde le reflet en blanc ou absent.
 */
export function creerMasque(
  largeur: number,
  hauteur: number,
  cellule: number,
  k: number,
  densite = DENSITE,
  portee = PORTEE,
): HTMLCanvasElement {
  const pas = Math.max(1, cellule)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.round(largeur))
  canvas.height = Math.max(2, Math.round(hauteur))
  const ctx = canvas.getContext('2d')
  // Sans contexte 2D — jsdom — le masque est vide : la scène montre alors un
  // reflet entier plutôt que de s'arrêter là.
  if (!ctx) return canvas
  const colonnes = Math.max(1, Math.floor(canvas.width / pas))
  const lignes = Math.max(1, Math.floor(canvas.height / pas))
  const r = alea(776655)
  const bord = (i: number) => Math.round(i * pas)
  for (let l = 0; l < lignes; l += 1) {
    const y = bord(l)
    const h = bord(l + 1) - y
    // `y` est en texels : la profondeur se compte en pixels du cadre.
    const profondeur = y / Math.max(0.01, k)
    const d = densiteA(profondeur, densite, portee)
    if (d <= 0.0005) continue
    // L'opacité du masque grise les points qu'il laisse passer.
    ctx.fillStyle = `rgba(255,255,255,${teinteA(profondeur).toFixed(3)})`
    for (let c = 0; c < colonnes; c += 1) {
      if (r() < d) ctx.fillRect(bord(c), y, bord(c + 1) - bord(c), h)
    }
  }
  return canvas
}
