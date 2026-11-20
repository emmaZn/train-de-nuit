/**
 * La géométrie du rideau des départs.
 *
 * Pendant de `quai.ts` pour le panneau : des nombres et des fonctions pures,
 * rien ne dessine. Le panneau n'est plus une plaque posée sur le mur de la
 * gare ; c'est un **rideau suspendu à deux bras**, qui descend du haut de
 * l'écran et se range au-dessus. Il appartient donc à la **scène**, pas à la
 * gare : `DECALAGE_GARE` ne le déplace pas, et la gare qui défile ne l'emporte
 * pas.
 *
 * Tout est en pixels de scène (`STAGE`), à une exception : `horlogeTouchee`
 * prend des pixels de cadre, comme `HORLOGE`. Le cadre de la frise, lui, est
 * posé sur la **fenêtre** (`ANCRE_FRISE`, en pixels d'écran) : rideau et frise
 * ne partagent aucun repère, et rien ici ne prétend les comparer. Que les bras
 * évitent les libellés de la frise se règle à l'œil, par `BRAS.retrait`.
 */
import { HORLOGE } from './quai'
import { HALO_HORLOGE } from './QuaiLayer'

/**
 * La plaque, une fois **posée** : `yPose` est son bord haut, en pixels de scène.
 *
 * Elle reste sous la frise (`HAUTEUR_FRISE`) et au-dessus du sol de la gare
 * (`HORIZON`) — `rideau.test.ts` le garde. `largeur` et `hauteur` sont celles du
 * texte qu'elle porte : la tâche qui le pose en dérive sa place, il n'y a pas de
 * second jeu de nombres.
 */
export const RIDEAU = { x: 551, largeur: 1127, hauteur: 329, yPose: 340 } as const

/**
 * Le `y` du rideau **rangé** : assez haut pour que son filet du bas soit hors
 * de la fenêtre, à toutes les tailles.
 *
 * Le haut de la scène n'est pas rogné, il est **descendu** de 9 à 60 px selon
 * l'écran (`cadrageScene`) : le bord à dépasser est donc celui de la fenêtre, à
 * 60 px sous le haut de la scène au pire, et non le haut de la scène lui-même.
 * Il faut `Y_RANGE + RIDEAU.hauteur <= -60`, soit `Y_RANGE <= -389` ; −400 laisse
 * onze pixels de jeu, pour que le filet n'affleure jamais.
 */
export const Y_RANGE = -400

/**
 * Les deux bras qui tiennent la plaque.
 *
 * `retrait` est la distance de chaque bras au bord de la plaque, en pixels de
 * scène : les bras sont symétriques. `cellules` est leur largeur en **cellules
 * de grain** et non en pixels — le trait ne descend pas sous la cellule, et un
 * bras d'un pixel d'écran serait plus fin que le grain du décor.
 *
 * `retrait` est **le nombre qu'on règle à l'œil** : c'est lui qui écarte les
 * bras des libellés de la frise (voir l'en-tête).
 */
export const BRAS = { retrait: 101, cellules: 1 } as const

/**
 * Les huit sommets d'un rectangle à coins coupés, à plat : `[x0, y0, x1, y1, …]`,
 * dans le sens horaire en partant du sommet haut-gauche du biseau.
 *
 * Un biseau nul rend les quatre coins du rectangle, dédoublés : la forme reste
 * juste, et c'est ce qui permet de régler le biseau jusqu'à zéro sans que le
 * tracé change de nature.
 */
export function pointsBiseau(
  x: number,
  y: number,
  largeur: number,
  hauteur: number,
  biseau: number,
): number[] {
  const b = Math.max(0, Math.min(biseau, largeur / 2, hauteur / 2))
  const [d, bas] = [x + largeur, y + hauteur]
  return [
    x + b, y,
    d - b, y,
    d, y + b,
    d, bas - b,
    d - b, bas,
    x + b, bas,
    x, bas - b,
    x, y + b,
  ]
}

/**
 * Le point `(x, y)`, en pixels de cadre, est-il sur l'horloge ?
 *
 * La cible est le **halo**, pas le seul cadran : le cadran fait ~58 px de
 * large, bien en deçà des 44 px d'écran qu'un doigt exige une fois la scène
 * réduite. Le halo, à `HALO_HORLOGE.rayon` fois le rayon du cadran, les
 * dépasse. La bordure du disque en fait partie.
 */
export function horlogeTouchee(x: number, y: number): boolean {
  const rayon = HORLOGE.rayon * HALO_HORLOGE.rayon
  return Math.hypot(x - HORLOGE.x, y - HORLOGE.y) <= rayon
}
