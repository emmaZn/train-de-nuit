import { CRETE, CRETE_BIN, MARGE_CRETE } from './crete'

/** The frame every train asset is drawn in: rails, locomotive and wagon share it. */
export const STAGE = { width: 2320, height: 1217 } as const

export type Frame = {
  scale: number
  offsetX: number
  offsetY: number
}

/**
 * Fit the stage frame over the viewport: it covers it entirely and is centred,
 * so no empty band ever shows. A zero dimension is treated as 1, which keeps
 * the scale finite on a viewport that has not been measured yet.
 */
export function fitStage(viewportW: number, viewportH: number): Frame {
  const width = Math.max(viewportW, 1)
  const height = Math.max(viewportH, 1)
  const scale = Math.max(width / STAGE.width, height / STAGE.height)
  return {
    scale,
    offsetX: (width - STAGE.width * scale) / 2,
    offsetY: (height - STAGE.height * scale) / 2,
  }
}

/**
 * Stage y of the rail line: every asset standing on the track — mountains
 * behind, poles, the signpost — is placed against it. Measured on rails.png.
 */
export const HORIZON = 921

/**
 * The frame the massif is rendered in, inherited from blender/massif.py. The
 * sequence it produced is gone; the frame stays, because it is what places
 * the massif on the stage.
 */
export const MOUNTAIN_SOURCE = { width: 3840, height: 944 } as const

/**
 * Where the massif actually sits inside that frame, measured across the whole
 * sequence. The render leaves 37% of empty sky above the summit and a margin
 * each side, so framing on the image rather than on the massif would both
 * float its foot above the track and stop it growing far too early.
 */
export const MOUNTAIN_CONTENU = { left: 667, top: 346, right: 3125, bottom: 869 } as const

/**
 * How much smaller the train is drawn than its source frame.
 *
 * CONCEPT.md §6 wants it « environ 3 fois plus petit que les PNG ». A visual
 * value: the track and the scroll speed follow it, so changing this one number
 * keeps the whole rolling stock consistent.
 */
export const ECHELLE_TRAIN = 0.4

/**
 * How much bigger than the frame the mountain range is drawn.
 *
 * 1 fits its width exactly; above that it climbs higher and spills off both
 * sides, which is what a nearer ridge does. A visual value, like the train's.
 */
export const ECHELLE_MONTAGNES = 2.2

/**
 * Où se pose la tête de la locomotive, en part de la largeur du cadre.
 *
 * C'est elle qu'on vise, et non le centre de la rame : la locomotive regarde
 * à droite, c'est son nez qui tient la composition. Dit ainsi, le cadrage ne
 * bouge plus quand on change l'échelle du train ou qu'on lui attelle un
 * wagon — la rame s'allonge vers l'arrière, jamais vers l'avant. En
 * contrepartie, elle déborde du cadre à gauche, et c'est voulu : le train
 * continue hors champ.
 */
export const TETE_LOCO = 0.5

/**
 * Height of the veil that puts out the foot of the mountain range, in stage
 * pixels, measured up from the rail line. It is what the train's white line
 * stands out against.
 */
export const DEGRADE_HAUTEUR = 380

/** How far the veil closes at the rail line, 0 to 1. */
export const DEGRADE_OPACITE = 0.75

/**
 * The band the veil covers: full frame width, resting on the rail line and
 * fading out upwards. Drawn in black, so the project's one rule turns it into
 * the colour of the night, whatever that colour is.
 */
export function cadreDegrade(hauteur: number): {
  x: number
  y: number
  width: number
  height: number
} {
  return { x: 0, y: HORIZON - hauteur, width: STAGE.width, height: hauteur }
}

/* ---- La frise ---- */

/** Au-dessous de cette largeur, on est sur un téléphone (CONCEPT.md §11). */
export const SEUIL_MOBILE = 720

/** Où se tient la gare à quai, depuis le bord gauche. */
export const ANCRE_FRISE = 120
export const ANCRE_FRISE_MOBILE = 24

/** Ce qu'on garde à droite, pour que la dernière mention ait sa place. */
/**
 * Ce que l'œil occupe au bord droit : 24 px d'icône, 6 de rembourrage de chaque
 * côté, et 16 px de dégagement. La voie s'effaçait jusqu'ici à `MARGE_VOIE` du
 * bord, c'est-à-dire exactement là où l'œil commence — ils se superposaient par
 * construction.
 */
export const DEGAGEMENT_OEIL = 36 + 16

export const MARGE_FRISE = 200
export const MARGE_FRISE_MOBILE = 150

/** Ce que la voie laisse libre de chaque côté de l'écran, en pixels. */
export const MARGE_VOIE = 40

/**
 * Marge effective, qui ne mord jamais sur l'ancre : sur un téléphone celle-ci
 * n'est qu'à 24 px du bord, et un marqueur noyé dans le fondu de la voie ne
 * se verrait plus. On lui garde 16 px de dégagement.
 */
export function margeVoie(largeur: number): number {
  const ancre = largeur < SEUIL_MOBILE ? ANCRE_FRISE_MOBILE : ANCRE_FRISE
  return Math.max(0, Math.min(MARGE_VOIE, ancre - 16))
}

/** Idem à droite, où l'œil se tient : la voie doit s'arrêter avant lui. */
export function margeVoieDroite(largeur: number): number {
  return margeVoie(largeur) + DEGAGEMENT_OEIL
}

/** Écartement minimal : en dessous, deux gares se chevaucheraient. */
const ECART_MINIMUM = 80

/**
 * Combien de gares la frise étale sur la largeur : quatre sur un écran, deux
 * sur un téléphone, où il n'y a de place que pour celle où l'on est et la
 * suivante.
 */
export function garesVisibles(largeur: number): number {
  return largeur < SEUIL_MOBILE ? 2 : 4
}

/**
 * Écart entre deux gares, pour que `visibles` gares occupent exactement la
 * largeur, de l'ancre jusqu'à la marge de droite.
 */
export function ecartFrise(largeur: number, visibles: number): number {
  const mobile = largeur < SEUIL_MOBILE
  const ancre = mobile ? ANCRE_FRISE_MOBILE : ANCRE_FRISE
  const marge = mobile ? MARGE_FRISE_MOBILE : MARGE_FRISE
  const intervalles = Math.max(1, visibles - 1)
  return Math.max(ECART_MINIMUM, (largeur - ancre - marge) / intervalles)
}


/** Ouverture de la caméra orthographique du massif, en unités de scène. */
export const ORTHO = 16.5

/**
 * Taille du massif dans cette ouverture. Retrouvée en mesurant la séquence
 * Blender : le massif y fait 2081 px de large sur 3840.
 */
export const ECHELLE_MASSIF = 2 / 3

/**
 * Secondes par étape. « Lents, comme un souffle » (CONCEPT.md §6) : le train
 * roule un moment avant de freiner, et on a le temps de regarder dehors.
 *
 * Les deux rampes gardent leur durée — elles sont calées sur les séquences
 * de démarrage et d'arrêt — donc allonger l'étape allonge le roulage, pas
 * les transitions.
 */
export const DUREE_ETAPE = 9

/**
 * Étapes pour un tour complet du massif.
 *
 * La boucle fait quatre gares : le massif met donc trente-deux boucles de
 * train à faire son tour, soit seize minutes, et moins de trois degrés par
 * étape — « elles tournent légèrement quand le train avance » (CONCEPT.md §6). Un relief
 * lointain ne défile pas, il se découvre.
 *
 * Un tour dure `SWEEP_LEGS × DUREE_ETAPE` secondes et chaque étape en fait
 * tourner `360 / SWEEP_LEGS` degrés : de quoi viser une valeur directement
 * plutôt que de l'approcher.
 *
 * Les deux constantes se multiplient : allonger l'étape ralentit déjà la
 * rotation en temps réel, celle-ci ne règle que l'angle parcouru par étape.
 * Et agrandir le massif la rend plus visible sans la changer — les points
 * parcourent plus de chemin à l'écran pour le même angle.
 */
export const SWEEP_LEGS = 128

/**
 * Tours de massif pour une distance parcourue, en étapes. **Négatif** : le
 * massif tourne à l'inverse de la marche. Vu depuis un train qui va vers la
 * droite, un relief lointain découvre peu à peu sa face gauche ; le faire
 * tourner dans l'autre sens donnerait un train qui recule.
 */
export function toursMassif(legs: number): number {
  return -legs / SWEEP_LEGS
}

export type Cadre = { x: number; y: number; width: number; height: number }

/** How many stage pixels one pixel of the source frame covers. */
function facteurMontagnes(echelle: number): number {
  return (STAGE.width / MOUNTAIN_SOURCE.width) * echelle
}

/**
 * Where the massif itself lands on the stage — not its frame. Whatever the
 * scale, its foot rests on the rail line and it stays centred: growing it
 * makes it climb higher and spill off both sides, never lift off the ground.
 */
export function cadreMassif(echelle: number): Cadre {
  const f = facteurMontagnes(echelle)
  const width = (MOUNTAIN_CONTENU.right - MOUNTAIN_CONTENU.left) * f
  const height = (MOUNTAIN_CONTENU.bottom - MOUNTAIN_CONTENU.top) * f
  return { x: (STAGE.width - width) / 2, y: HORIZON - height, width, height }
}

/**
 * Where the whole Blender frame goes, so the massif inside it lands exactly
 * where `cadreMassif` says. This is what the camera reproduces.
 */
export function cadreMontagnes(echelle: number): Cadre {
  const f = facteurMontagnes(echelle)
  const massif = cadreMassif(echelle)
  return {
    x: massif.x - MOUNTAIN_CONTENU.left * f,
    y: massif.y - MOUNTAIN_CONTENU.top * f,
    width: MOUNTAIN_SOURCE.width * f,
    height: MOUNTAIN_SOURCE.height * f,
  }
}

function borner(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

/**
 * La part du cadre qu'on voit vraiment, arrêtée à la voie.
 *
 * Le massif est désormais calculé, pas dessiné : son canvas n'a aucune raison
 * de couvrir ce qui est hors écran. Le cadrage « cover » rogne beaucoup en
 * portrait, et couvrir toute la largeur demanderait là plus de 4000 px, au-delà
 * de ce que beaucoup de GPU mobiles acceptent.
 */
export function fenetreVisible(frame: Frame, viewportW: number, viewportH: number): Cadre {
  const x0 = borner(-frame.offsetX / frame.scale, 0, STAGE.width)
  const x1 = borner((viewportW - frame.offsetX) / frame.scale, 0, STAGE.width)
  const y0 = borner(-frame.offsetY / frame.scale, 0, HORIZON)
  const y1 = borner((viewportH - frame.offsetY) / frame.scale, 0, HORIZON)
  return { x: x0, y: y0, width: Math.max(x1 - x0, 1), height: Math.max(y1 - y0, 1) }
}

export type Bornes = { left: number; right: number; top: number; bottom: number }

/**
 * Le frustum qui fait tomber le cadre Blender exactement là où la séquence
 * était dessinée. On ne réinvente pas de cadrage : c'est ce qui avait
 * désaligné le massif la dernière fois.
 */
export function bornesFenetre(fenetre: Cadre, echelle: number): Bornes {
  const c = cadreMontagnes(echelle)
  const s = ORTHO / ECHELLE_MASSIF / c.width
  const cx = c.x + c.width / 2
  const cy = c.y + c.height / 2
  return {
    left: (fenetre.x - cx) * s,
    right: (fenetre.x + fenetre.width - cx) * s,
    top: (cy - fenetre.y) * s,
    bottom: (cy - (fenetre.y + fenetre.height)) * s,
  }
}

/** Largeur du cadre Blender, en parts de la fenêtre : c'est l'échelle du grain. */
export function facteurCadre(fenetre: Cadre, echelle: number): number {
  return cadreMontagnes(echelle).width / fenetre.width
}

/* ---- Le ciel des visiteurs ---- */

/** Hauteur de la voie dans la frise, en pixels (`--haut-voie` de base.css). */
export const HAUT_VOIE = 44

/**
 * Hauteur de la frise, fixe en pixels : `--haut-voie` (44) plus les 52 px que
 * NavFrise.vue y ajoute. Un test lit les deux fichiers et vérifie la somme.
 */
export const HAUTEUR_FRISE = 96

/**
 * Haut du voile, en pixels d'écran : `HORIZON - DEGRADE_HAUTEUR` projeté.
 * C'est le plancher de la région libre. Là où il n'y a pas de massif, la
 * région irait sinon jusqu'au bas du cadre, et les étoiles se poseraient sur
 * les rails, le train ou le reflet.
 *
 * `decalage` est un décalage vertical en pixels d'écran, ajouté après le
 * cadrage.
 */
export function hautDuVoilePx(viewportW: number, viewportH: number, decalage: number): number {
  const frame = fitStage(viewportW, viewportH)
  return (HORIZON - DEGRADE_HAUTEUR) * frame.scale + frame.offsetY + decalage
}

/**
 * Ordonnée d'écran de la crête du massif sous la colonne `xPx`, plancher
 * compris, **sans** `MARGE_CRETE` (c'est `regionCiel` qui la retranche).
 *
 * Même chaîne que le rendu : source -> scène par `cadreMontagnes`, puis
 * scène -> écran par `fitStage`. `CRETE` garde le minimum de chaque paquet :
 * on évalue donc la crête aux bords de paquet à `min` des deux voisins, et on
 * interpole linéairement entre bords. Les deux extrémités d'un segment sont
 * ainsi au plus égales à la valeur de son paquet (la garantie conservatrice
 * tient), et la fonction reste continue : une crête en marches ferait sauter
 * la région quand le pointeur bouge.
 */
export function cretePx(
  xPx: number,
  viewportW: number,
  viewportH: number,
  echelle: number,
  decalage: number,
): number {
  const frame = fitStage(viewportW, viewportH)
  const c = cadreMontagnes(echelle)
  const f = facteurMontagnes(echelle)
  const sx = ((xPx - frame.offsetX) / frame.scale - c.x) / f
  const u = borner(sx / CRETE_BIN, 0, CRETE.length)
  const i = Math.min(Math.floor(u), CRETE.length - 1)
  const bord = (k: number): number =>
    k <= 0 ? CRETE[0] : k >= CRETE.length ? CRETE[CRETE.length - 1] : Math.min(CRETE[k - 1], CRETE[k])
  const sy = bord(i) + (bord(i + 1) - bord(i)) * (u - i)
  const wy = (c.y + sy * f) * frame.scale + frame.offsetY + decalage
  return Math.min(wy, hautDuVoilePx(viewportW, viewportH, decalage))
}

/**
 * La région où une étoile peut se poser : du bas de la frise jusqu'à la crête
 * moins `MARGE_CRETE`. `y` est normalisé sur cette région. Sa hauteur reste
 * strictement positive, sans quoi `projeter` poserait les étoiles en NaN.
 */
export function regionCiel(
  xPx: number,
  viewportW: number,
  viewportH: number,
  echelle: number,
  decalage: number,
): { top: number; height: number } {
  const top = HAUTEUR_FRISE
  const bas = cretePx(xPx, viewportW, viewportH, echelle, decalage) - MARGE_CRETE
  return { top, height: Math.max(bas - top, 1) }
}

/* ---- La règle de dégagement ---- */

/** Ciel qu'on garde au sommet du massif, sous la frise, en pixels d'écran. */
export const CIEL_SOMMET = 60

/**
 * Ce qu'on ne réduit pas sous les rails, en pixels d'écran. C'est un plafond
 * au décalage, pas une garantie : on ne promet pas de l'atteindre. Quand
 * l'espace sous les rails est déjà inférieur avant tout décalage (il peut même
 * être négatif, les rails étant alors hors champ), le décalage permis est 0.
 */
export const PLANCHER_REFLET = 55

/**
 * Ce qu'on descend la scène en plus, sur grand écran, pour dégager du ciel.
 *
 * Le décalage est d'ordinaire plafonné par le jeu du cadrage « cover »
 * (`-offsetY`), qui ne vaut qu'une poignée de pixels sur une fenêtre de bureau
 * ordinaire : 11 px à 1512 x 771. Au-delà, une bande du haut n'a plus de scène
 * derrière elle — ce qui condamnait la manœuvre quand la poussière vivait dans
 * le cadre. Elle se dessine désormais en coordonnées d'écran : cette bande
 * porte donc le fond et le grain comme le reste du ciel, et ne se voit pas.
 */
export const DESCENTE_BUREAU = 20

/**
 * Idem sur téléphone, où l'on descend davantage : le format est très haut, le
 * train y tombe trop près du milieu, et le ciel au-dessus du massif supporte
 * d'être généreux. Les deux valeurs sont séparées parce que ce sont deux
 * décisions d'Emmanuelle, prises à deux moments et sur deux formats.
 */
export const DESCENTE_MOBILE = 60

/** Plus petite échelle que la résolution puisse retenir. */
const ECHELLE_MIN = 0.5

/**
 * Le ciel au sommet : la crête la plus haute sur les colonnes visibles, sous
 * la frise. La crête est linéaire par morceaux, ses ruptures aux bords de
 * paquet : son minimum est donc atteint à un bord de paquet ou à une extrémité
 * de l'écran. On n'évalue que ces points, et c'est exact.
 */
function cielAuSommet(
  viewportW: number,
  viewportH: number,
  echelle: number,
  decalage: number,
): number {
  const frame = fitStage(viewportW, viewportH)
  const c = cadreMontagnes(echelle)
  const f = facteurMontagnes(echelle)
  let sommet = Math.min(
    cretePx(0, viewportW, viewportH, echelle, decalage),
    cretePx(viewportW, viewportW, viewportH, echelle, decalage),
  )
  for (let k = 0; k <= CRETE.length; k++) {
    const x = (c.x + k * CRETE_BIN * f) * frame.scale + frame.offsetX
    if (x > 0 && x < viewportW) {
      sommet = Math.min(sommet, cretePx(x, viewportW, viewportH, echelle, decalage))
    }
  }
  return sommet - HAUTEUR_FRISE
}

/**
 * Comment dégager le sommet du massif : décaler d'abord, rapetisser ensuite.
 *
 * Le décalage ne dépasse ni le jeu vertical du cadrage (`-offsetY`, nul quand
 * la fenêtre est pilotée par sa hauteur : sinon une bande du haut n'aurait plus
 * de scène derrière elle), ni ce que `PLANCHER_REFLET` autorise sous les rails.
 * Si `CIEL_SOMMET` n'est pas atteint, l'échelle se résout : la plus grande de
 * `[ECHELLE_MIN, ECHELLE_MONTAGNES]` qui tienne la cible. Résolue, elle est
 * continue en hauteur de fenêtre, sans aucun seuil de format.
 */
export function cadrageCiel(
  viewportW: number,
  viewportH: number,
): { decalage: number; echelle: number } {
  const frame = fitStage(viewportW, viewportH)
  const jeu = Math.max(0, -frame.offsetY)
  // Le décalage est plafonné par le jeu de couverture ET par le plafond du
  // reflet : `max(0, reflet - PLANCHER_REFLET)`, continu en hauteur de fenêtre.
  // Sans lui, le décalage pris en entier (jeu = -offsetY) remet offsetY à 0 et
  // fait sortir rails et train sur les fenêtres larges et basses. Si la cible
  // n'est plus atteinte, l'échelle se résout plus bas.
  const reflet = viewportH - (HORIZON * frame.scale + frame.offsetY)
  // Sur grand écran on s'autorise `DESCENTE_BUREAU` au-delà du jeu : le
  // plafond du reflet, lui, reste le vrai garde-fou — il est ce qui empêche
  // rails et train de sortir par le bas.
  const marge = jeu + (viewportW >= SEUIL_MOBILE ? DESCENTE_BUREAU : DESCENTE_MOBILE)
  const decalage = Math.min(marge, Math.max(0, reflet - PLANCHER_REFLET))

  const ciel = (e: number): number => cielAuSommet(viewportW, viewportH, e, decalage)
  // Quand le haut du voile plafonne la crête, rapetisser ne rend plus de ciel :
  // la cible devient le meilleur ciel disponible, ce qui garde l'échelle
  // continue (les deux définitions coïncident à la hauteur critique).
  const cible = Math.min(CIEL_SOMMET, ciel(ECHELLE_MIN))
  const tient = (e: number): boolean => ciel(e) >= cible
  if (tient(ECHELLE_MONTAGNES)) return { decalage, echelle: ECHELLE_MONTAGNES }

  let bas = ECHELLE_MIN
  let haut = ECHELLE_MONTAGNES
  while (haut - bas > 1e-4) {
    const milieu = (bas + haut) / 2
    if (tient(milieu)) bas = milieu
    else haut = milieu
  }
  return { decalage, echelle: bas }
}

/**
 * Le cadrage que la scène applique réellement : le cadre de scène, déjà
 * décalé, et l'échelle du massif. `cretePx` ajoute `decalage` après `fitStage` ;
 * la scène le met donc dans `offsetY` du conteneur qui porte tout le décor
 * (massif, voile, rails, train). Un seul endroit où ces deux chaînes se
 * rejoignent, pour que les étoiles et la montagne ne se décalent jamais.
 */
export function cadrageScene(
  viewportW: number,
  viewportH: number,
): { frame: Frame; decalage: number; echelle: number } {
  const frame = fitStage(viewportW, viewportH)
  const { decalage, echelle } = cadrageCiel(viewportW, viewportH)
  return { frame: { ...frame, offsetY: frame.offsetY + decalage }, decalage, echelle }
}
