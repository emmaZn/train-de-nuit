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
export const MARGE_FRISE = 150
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
export const HAUT_VOIE = 64

/**
 * Hauteur de la frise, fixe en pixels : `--haut-voie` (64) plus les 52 px que
 * NavFrise.vue y ajoute. Un test lit les deux fichiers et vérifie la somme.
 */
export const HAUTEUR_FRISE = 116

/**
 * La bande où vivent les étoiles des visiteurs : du bas de la frise jusqu'à
 * mi-hauteur de la fenêtre. `y` est normalisé sur cette bande, pas sur la
 * fenêtre, sans quoi la frise (fixe) en cacherait une part variable.
 */
export function bandeCiel(viewportH: number): { top: number; height: number } {
  const top = HAUTEUR_FRISE
  return { top, height: Math.max(viewportH / 2 - top, 1) }
}
