/**
 * La géométrie du rideau des départs.
 *
 * Pendant de `quai.ts` pour le panneau : des nombres et des fonctions pures,
 * rien ne dessine — et rien ici n'importe le moteur de rendu. Le panneau n'est
 * plus une plaque posée sur le mur de la gare ; c'est un **rideau suspendu à
 * deux bras**, qui descend du haut de l'écran et se range au-dessus. Il
 * appartient donc à la **scène**, pas à la gare : `DECALAGE_GARE` ne le déplace
 * pas, et la gare qui défile ne l'emporte pas.
 *
 * Tout est en pixels de cadre, comme `quai.ts`. La frise et le bord de la
 * fenêtre, eux, sont en pixels d'**écran** (`ANCRE_FRISE`, `HAUTEUR_FRISE`) : ce
 * sont deux repères, reliés par l'échelle du cadre (`Frame`), et aucun nombre de
 * cadre ne peut dire « sous la frise » ni « hors de la fenêtre » — le rapport
 * change avec la fenêtre. C'est pourquoi la pose et le rangement sont des
 * **fonctions du cadre** (`yPoseA`, `yRangeA`) et non des constantes.
 * Que les bras évitent les libellés de la frise, en revanche, se règle à l'œil,
 * par `BRAS.retrait`.
 */
import { HAUTEUR_FRISE } from './layout'
import type { Frame } from './layout'
import { HALO_HORLOGE, HORLOGE } from './quai'

/**
 * La plaque, une fois **posée** : `yPose` est le bord haut **visé**, en pixels
 * de cadre. `yPoseA` le borne vers le bas quand la fenêtre est trop basse pour
 * que la plaque dégage la frise.
 *
 * Elle reste au-dessus du sol de la gare (`HORIZON`) — `rideau.test.ts` le
 * garde. `largeur` et `hauteur` sont celles du texte qu'elle porte : la tâche
 * qui le pose en dérive sa place, il n'y a pas de second jeu de nombres.
 */
export const RIDEAU = { x: 551, largeur: 1127, hauteur: 329, yPose: 340 } as const

/**
 * Ce qu'on laisse de franc, en pixels d'**écran**, entre le rideau et la frise
 * (posé) ou le bord de la fenêtre (rangé) : pour que le filet ne l'affleure
 * jamais, quelle que soit l'échelle.
 */
export const DEGAGEMENT_ECRAN = 8

/**
 * Le `y` du rideau **rangé**, en pixels de cadre : son bas est au-dessus du
 * bord haut de la fenêtre, à `DEGAGEMENT_ECRAN` près.
 *
 * `frame` est celui de `cadrageScene`, dont `offsetY` porte déjà le décalage
 * (9 à 60 px d'écran selon l'écran) : le haut de la scène n'est pas rogné, il
 * est **descendu**. Franchir 60 px d'écran demande `60 / scale` pixels de cadre,
 * et c'est ce que le calcul fait — une constante de cadre ne le pouvait pas.
 */
export function yRangeA(frame: Frame): number {
  return (-DEGAGEMENT_ECRAN - frame.offsetY) / frame.scale - RIDEAU.hauteur
}

/**
 * Le `y` du rideau **posé**, en pixels de cadre : `RIDEAU.yPose`, descendu s'il
 * le faut pour que son haut dégage la frise de `DEGAGEMENT_ECRAN`.
 *
 * Sur une fenêtre large et basse le cadre est rogné en haut, et 340 px de cadre
 * tombent sous la frise : le bandeau « PROCHAINS DÉPARTS » passerait derrière la
 * navigation, ce que les bras devaient justement éviter. Il ne monte jamais plus
 * haut que la cible.
 */
export function yPoseA(frame: Frame): number {
  const dessousFrise = (HAUTEUR_FRISE + DEGAGEMENT_ECRAN - frame.offsetY) / frame.scale
  return Math.max(RIDEAU.yPose, dessousFrise)
}

/**
 * Le biseau des coins de la plaque, en pixels de **cadre**. C'est le même
 * nombre que le `--biseau: 12px` de `PanneauDeparts.vue`, mais pas la même
 * longueur : 12 px de cadre valent `12 × échelle` px CSS (≈ 9 à l'échelle de
 * pose). Quiconque les confronte doit convertir.
 */
export const BISEAU = 12

/**
 * Les deux bras qui tiennent la plaque.
 *
 * `retrait` est la distance de chaque bras au bord de la plaque, en pixels de
 * cadre : les bras sont symétriques. `cellules` est leur largeur en **cellules
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
 *
 * **Elle suppose la gare à quai.** Elle compare à `HORLOGE.x`, l'abscisse à
 * l'arrêt ; or `Quai.avancer` pose `racineAllumee.x = distance` et l'horloge
 * défile avec la gare. Hors de l'arrêt, c'est à l'appelant de retrancher ce
 * décalage de `x` avant de la lui passer.
 */
export function horlogeTouchee(x: number, y: number): boolean {
  const rayon = HORLOGE.rayon * HALO_HORLOGE.rayon
  return Math.hypot(x - HORLOGE.x, y - HORLOGE.y) <= rayon
}
