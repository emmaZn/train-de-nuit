/**
 * Le rideau des départs : sa géométrie, et son état.
 *
 * Le panneau n'est plus une plaque posée sur le mur de la gare ; c'est un
 * **rideau suspendu à deux bras**, qui descend du haut de l'écran et se range
 * au-dessus. Il appartient à la **scène**, pas à la gare : `DECALAGE_GARE` ne le
 * déplace pas, et la gare qui défile ne l'emporte pas.
 *
 * **Plus rien ici ne dessine.** La plaque a quitté le canvas (spec §4) : un
 * canvas ne peut jamais passer devant un élément du DOM, et le panneau doit
 * passer devant la frise de navigation, qui en est un. La scène garde donc
 * l'**état** et la **position** du rideau — c'est elle qui commande, et le DOM
 * (`PanneauDeparts.vue`) qui dessine la plaque, les bras et le bandeau.
 *
 * C'est aussi pourquoi la classe `Rideau` vit ici, avec les nombres qu'elle
 * interpole, et non plus dans un `RideauLayer.ts` : il n'y a plus de couche de
 * rendu à nommer. **Ce fichier n'est donc plus seulement des nombres et des
 * fonctions pures** : il porte aussi une machine à états, animée par une tween
 * GSAP, et `gsap` est le seul paquet qu'il importe. Rien n'y dessine pour
 * autant, et rien n'y importe le moteur de rendu — c'est cette ligne-là, et
 * non la pureté, qui est la contrainte. (Le fichier aurait dû s'appeler `Rideau.ts` ; le système de
 * fichiers de macOS ne distingue pas la casse, et `Rideau.ts` serait le même
 * fichier que `rideau.ts`. Les deux sujets tenant en un seul fichier, ils y
 * tiennent.)
 *
 * Tout est en pixels de cadre, comme `quai.ts`. La frise et le bord de la
 * fenêtre, eux, sont en pixels d'**écran** (`ANCRE_FRISE`, `HAUTEUR_FRISE`) : ce
 * sont deux repères, reliés par l'échelle du cadre (`Frame`), et aucun nombre de
 * cadre ne peut dire « sous la frise » ni « hors de la fenêtre » — le rapport
 * change avec la fenêtre. C'est pourquoi la pose et le rangement sont des
 * **fonctions du cadre** (`yPoseA`, `yRangeA`) et non des constantes.
 */
import gsap from 'gsap'
import { HAUTEUR_FRISE } from './layout'
import type { Frame } from './layout'
import { HALO_HORLOGE, HORLOGE } from './quai'

/**
 * La plaque, une fois **posée** : `yPose` est le bord haut **visé**, en pixels
 * de cadre. `yPoseA` le borne vers le bas quand la fenêtre est trop basse pour
 * que la plaque dégage la frise.
 *
 * Elle reste au-dessus du sol de la gare (`HORIZON`) — `rideau.test.ts` le
 * garde. `largeur` et `hauteur` sont les **proportions de la plaque**, et c'est
 * à cette taille-là, mise à l'échelle du cadre, que le DOM la dessine ; `yPoseA`
 * et `yRangeA` lisent la hauteur.
 *
 * Il n'y a plus d'abscisse : le panneau se **centre sur la fenêtre**. Le cadrage
 * « cover » centre la scène et l'horloge est au milieu de la scène (1160,4 sur
 * 2320) : elle est donc au milieu de la fenêtre à toute taille, et un panneau
 * centré la couvre partout. Une abscisse de cadre, elle, ne l'aurait couverte
 * qu'aux fenêtres où le cadre n'est pas rogné.
 */
export const RIDEAU = { largeur: 1127, hauteur: 329, yPose: 340 } as const

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
 * navigation. Il ne monte jamais plus haut que la cible.
 *
 * La plaque passe désormais **devant** la frise, mais elle ne la couvre pas pour
 * autant : ce qui la traverse, ce sont les deux bras (spec §5).
 */
export function yPoseA(frame: Frame): number {
  const dessousFrise = (HAUTEUR_FRISE + DEGAGEMENT_ECRAN - frame.offsetY) / frame.scale
  return Math.max(RIDEAU.yPose, dessousFrise)
}

/**
 * Les deux bras qui tiennent la plaque.
 *
 * `retrait` est la distance de chaque bras au bord de la plaque, en pixels de
 * cadre : les bras sont symétriques, et le DOM met ce retrait à l'échelle avec
 * le reste de la plaque.
 *
 * Il n'a plus à éviter les libellés de la frise : le panneau passe devant elle,
 * et deux traits fins la traversent (spec §5). C'est un réglage d'œil, et plus
 * un garde de navigation.
 */
export const BRAS = { retrait: 101 } as const

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
 * décalage de `x` avant de la lui passer — `Quai.horlogeTouchee` le fait, parce
 * que c'est le quai qui connaît l'abscisse de l'île.
 */
export function horlogeTouchee(x: number, y: number): boolean {
  const rayon = HORLOGE.rayon * HALO_HORLOGE.rayon
  return Math.hypot(x - HORLOGE.x, y - HORLOGE.y) <= rayon
}

/**
 * Durée et courbes : des réglages d'œil (spec §7), à reprendre en regardant la
 * scène. La descente dépasse un peu sa pose et s'y rassoit ; le rangement part
 * doucement et n'a pas besoin de rebond.
 */
const DUREE = 1.45
// `DEBUT_LIGNES_MS` et `DEBUT_ENTETE_MS` (`components/volets.ts`) sont calés sur
// cette durée et sur la courbe ci-dessous : le texte se pose pendant que la
// plaque finit de se rasseoir. Les changer ici sans eux désynchronise le tout.
const COURBE_DESCENTE = 'back.out(1.1)'
const COURBE_REMONTEE = 'power2.inOut'

/**
 * Où en est le rideau, et où cela le met : un état et une position, rien de
 * plus. Il ne porte aucun conteneur, aucun tracé — la plaque est en DOM.
 */
export class Rideau {
  /**
   * Où en est la plaque, de 0 (rangée) à 1 (posée) — et un peu au-delà pendant
   * le dépassement. On interpole une **fraction** et non un `y` : la rangée et
   * la pose sont des fonctions du cadre, et une fenêtre qui se redimensionne
   * en pleine descente ne doit pas laisser la plaque viser un `y` périmé.
   */
  private readonly etat = { avancee: 0 }
  /** La seule tween vivante : `kill()` avant d'en créer une autre. */
  private tween: gsap.core.Tween | null = null
  private visee = false

  private cadre: Frame | null = null

  private readonly reducedMotion: boolean

  constructor(reducedMotion = false) {
    this.reducedMotion = reducedMotion
  }

  /** L'état **visé** : il change dès `baisser`, bien avant que la plaque arrive. */
  get baisse(): boolean {
    return this.visee
  }

  /**
   * La position courante du bord haut de la plaque, en pixels de cadre.
   * Avant le premier `cadrer` elle n'est nulle part : `NaN`, pas un zéro qui
   * ressemblerait à une vraie position.
   */
  get y(): number {
    if (!this.cadre) return Number.NaN
    const p = this.etat.avancee
    // Cette forme rend les bornes **exactes** à p = 0 et p = 1.
    return yRangeA(this.cadre) * (1 - p) + yPoseA(this.cadre) * p
  }

  baisser(): void {
    this.aller(true)
  }

  relever(): void {
    this.aller(false)
  }

  basculer(): void {
    this.aller(!this.visee)
  }

  /**
   * Le nouveau cadre. Seule la **fraction** est conservée : `y` se relit du
   * cadre courant, et un redimensionnement en pleine descente ne fait donc
   * jamais sauter la plaque — elle reste à sa fraction de course.
   */
  cadrer(frame: Frame): void {
    this.cadre = frame
  }

  destroy(): void {
    this.tween?.kill()
    this.tween = null
  }

  private aller(baisse: boolean): void {
    this.visee = baisse
    this.tween?.kill()
    this.tween = null
    const but = baisse ? 1 : 0
    if (this.reducedMotion) {
      this.etat.avancee = but
      return
    }
    // Même objet que la tween précédente : la nouvelle part d'où l'autre en était.
    this.tween = gsap.to(this.etat, {
      avancee: but,
      duration: DUREE,
      ease: baisse ? COURBE_DESCENTE : COURBE_REMONTEE,
      onComplete: () => {
        this.tween = null
      },
    })
  }
}
