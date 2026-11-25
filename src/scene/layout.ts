import { CRETE, CRETE_BIN, MARGE_CRETE } from './crete'

/** The frame every train asset is drawn in: rails, locomotive and wagon share it. */
export const STAGE = { width: 2320, height: 1217 } as const

export type Frame = {
  scale: number
  offsetX: number
  offsetY: number
}

/* ---- Le monde autour du plateau ---- */

/**
 * Le plateau est le système de coordonnées : tout y est ancré, et rien n'en
 * bouge. Autour, le **monde** : la bande où les plans continus — la voie, la
 * terre, le massif, le ciel — ont le droit de continuer quand la scène recule
 * et découvre ce qu'il y a de part et d'autre.
 *
 * Ces marges sont **fixes**, et non déduites de la fenêtre. Une bande répétée
 * dont l'origine suivrait le viewport verrait la phase de ses traverses sauter
 * à chaque redimensionnement, et la terre se resemer sous les roues.
 *
 * Leur taille vient du pire cas : la fenêtre la plus large qu'un recul
 * autorisé puisse montrer. Au-delà, ce n'est pas le monde qui s'agrandit,
 * c'est le recul qui s'arrête — voir `fitStage`.
 */
export const MONDE_MARGE_X = 420
export const MONDE_MARGE_HAUT = 1200
export const MONDE_MARGE_BAS = 320

/**
 * Ce qu'on garde au-dessus du plateau pour le massif seul. À sa plus grande
 * taille (2,2 × 1,3), son sommet passe de quelques pixels au-dessus de y = 0 :
 * sans cette marge il serait tranché net.
 */
export const MONDE_CIEL_MASSIF = 140

export const MONDE = {
  x: -MONDE_MARGE_X,
  y: -MONDE_MARGE_HAUT,
  width: STAGE.width + 2 * MONDE_MARGE_X,
  height: STAGE.height + MONDE_MARGE_HAUT + MONDE_MARGE_BAS,
} as const

/**
 * Ce qu'Emmanuelle a tranché, le 24 novembre 2026, sur des rendus à taille
 * d'appareil : le train entier et la montagne à distance sur un téléphone, un
 * peu de recul sur un écran d'ordinateur.
 *
 * Deux ancres, et rien entre les deux qu'une interpolation sur le **rapport
 * largeur / hauteur**. Pas de seuil de largeur : une tablette en portrait fait
 * 768 px — au-dessus de `SEUIL_MOBILE` — et c'est pourtant un portrait. Et un
 * seuil ferait sauter le train de moitié au milieu d'un redimensionnement, là
 * où `cadrageCiel` prend soin, lui, de rester continu.
 *
 * La descente se garde en **fraction de la hauteur** : 140 px sur les 915 de
 * son rendu. En pixels, elle aurait voulu dire autre chose sur chaque écran.
 *
 * **L'ancre paysage a été reprise le 25 novembre 2026**, au vu du premier
 * rendu large : « il faut que l'horizon soit plus bas et que le massif soit
 * légèrement plus grand ». La descente passe de 20 à 70 px et le massif de 1
 * à 1,25 — c'est la version qu'elle a choisie parmi quatre. 70 est aussi à peu
 * près le maximum : plus bas, la signature du pied de page vient se poser sur
 * le reflet. Le recul, lui, n'a pas bougé.
 */
export const CADRAGE_PORTRAIT = {
  aspect: 412 / 915,
  recul: 0.5,
  massif: 1.3,
  descente: 140 / 915,
  tete: 0.53,
} as const

export const CADRAGE_PAYSAGE = {
  aspect: 1480 / 690,
  recul: 0.8,
  massif: 1.25,
  descente: 70 / 690,
  tete: 0.5,
} as const

/** Où l'on se trouve entre les deux ancres : 0 au portrait, 1 au paysage. */
function entreLesAncres(viewportW: number, viewportH: number): number {
  const aspect = Math.max(viewportW, 1) / Math.max(viewportH, 1)
  const t =
    (aspect - CADRAGE_PORTRAIT.aspect) / (CADRAGE_PAYSAGE.aspect - CADRAGE_PORTRAIT.aspect)
  return Math.min(Math.max(t, 0), 1)
}

/** De combien la scène recule, pour ce format. */
export function reculDuFormat(viewportW: number, viewportH: number): number {
  const t = entreLesAncres(viewportW, viewportH)
  return CADRAGE_PORTRAIT.recul + t * (CADRAGE_PAYSAGE.recul - CADRAGE_PORTRAIT.recul)
}

/** De combien le massif grossit pour lui-même, sans entraîner le train. */
export function massifDuFormat(viewportW: number, viewportH: number): number {
  const t = entreLesAncres(viewportW, viewportH)
  return CADRAGE_PORTRAIT.massif + t * (CADRAGE_PAYSAGE.massif - CADRAGE_PORTRAIT.massif)
}

/** De combien la voie descend dans le cadre, en pixels d'écran. */
export function descenteDuFormat(viewportW: number, viewportH: number): number {
  const t = entreLesAncres(viewportW, viewportH)
  const part =
    CADRAGE_PORTRAIT.descente + t * (CADRAGE_PAYSAGE.descente - CADRAGE_PORTRAIT.descente)
  return Math.max(viewportH, 1) * part
}

/**
 * Où se pose la tête de la locomotive, en part de la largeur du plateau.
 *
 * C'est elle qu'on vise, et non le centre de la rame : la locomotive regarde
 * à droite, c'est son nez qui tient la composition. Dit ainsi, le cadrage ne
 * bouge plus quand on change l'échelle du train ou qu'on lui attelle un
 * wagon — la rame s'allonge vers l'arrière, jamais vers l'avant. En
 * contrepartie, elle déborde du plateau à gauche, et c'est voulu : le train
 * continue hors champ.
 *
 * **0,53 en portrait et 0,50 en paysage** depuis le 25 novembre 2026. Le nez
 * était à 0,56 pour tous les formats depuis le 20 novembre, afin que
 * réverbère, train, gare et panneau tiennent dans la même zone ; le panneau a
 * quitté le mur entre-temps, et la scène a reculé. Emmanuelle a rejugé sur des
 * rendus aux deux formats et l'a ramené vers la gauche — plus sur un écran
 * large que sur un téléphone, où la place manque déjà.
 *
 * Ce que ça change sur un écran large : le recul montre maintenant plus que le
 * plateau, et la rame y tient tout entière, queue comprise. C'est ce qu'elle a
 * regardé en choisissant 0,50 ; le `continue hors champ` ci-dessus reste vrai
 * des formats étroits, où elle déborde toujours.
 *
 * C'est le quatrième réglage à vivre entre les deux ancres, et le seul qui
 * déplace un objet plutôt que le cadre — d'où `Train.cadrer`.
 */
export function teteDuFormat(viewportW: number, viewportH: number): number {
  const t = entreLesAncres(viewportW, viewportH)
  return CADRAGE_PORTRAIT.tete + t * (CADRAGE_PAYSAGE.tete - CADRAGE_PORTRAIT.tete)
}

/**
 * Le nez le plus à droite qu'un format puisse donner.
 *
 * L'interpolation est bornée aux deux ancres : aucun écran ne peut pousser la
 * rame plus loin que ça. C'est donc contre cette valeur, et non contre celle
 * d'un format choisi, que se vérifie ce qui doit rester devant le train — le
 * réverbère, le quai, la dernière travée de câble.
 */
export const TETE_LOCO_MAX = Math.max(CADRAGE_PORTRAIT.tete, CADRAGE_PAYSAGE.tete)

/**
 * Pose le plateau sur la fenêtre, reculé de ce que le format demande.
 *
 * Le recul s'arrête là où la fenêtre cesserait de tenir dans le monde : c'est
 * ce plancher, et non la vigilance, qui rend vrai le seul anti-but de ce
 * cadrage — **aucun plan continu ne doit s'arrêter avant le bord de l'écran**.
 * Une dimension nulle vaut 1, ce qui garde l'échelle finie sur une fenêtre
 * qu'on n'a pas encore mesurée.
 */
export function fitStage(viewportW: number, viewportH: number): Frame {
  const width = Math.max(viewportW, 1)
  const height = Math.max(viewportH, 1)
  const couvre = Math.max(width / STAGE.width, height / STAGE.height)
  const voulue = couvre * reculDuFormat(width, height)
  const plancher = Math.max(width / MONDE.width, height / MONDE.height)
  const scale = Math.max(voulue, plancher)
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
 * Hauteur du voile qui éteint le pied du massif, en pixels de cadre, mesurée
 * depuis la ligne de rail. C'est ce sur quoi le trait blanc du train se détache.
 *
 * **540 / 0,62 depuis le 25 novembre 2026**, contre 230 / 0,40. Emmanuelle :
 * « il faut reprendre l'idée d'avoir un fondu en base de la montagne pour
 * assurer la visibilité du train ». C'est elle qui l'avait réduit le 14
 * novembre, et sa raison d'alors tient toujours : à 380 / **0,75**, le pied du
 * massif tombait à la couleur du ciel et le train, n'ayant plus rien à
 * masquer, flottait dans un trou au lieu de découper une silhouette. Elle a
 * revu les deux formes côte à côte et choisi la **haute et douce** plutôt que
 * la courte et fermée : le voile monte deux fois plus haut qu'avant, mais se
 * ferme moins. Le relief reste lisible derrière la rame.
 *
 * Deux choses ont changé entre-temps et justifient d'y revenir : la scène a
 * reculé — le train est plus petit dans le cadre —, et le grain du massif est
 * passé à 2,4, ce qui le rend plus présent derrière lui.
 */
export const DEGRADE_HAUTEUR = 540

/** Jusqu'où le voile se ferme à la ligne de rail, de 0 à 1. */
export const DEGRADE_OPACITE = 0.62

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
  return { x: MONDE.x, y: HORIZON - hauteur, width: MONDE.width, height: hauteur }
}

/* ---- La frise ---- */

/** Au-dessous de cette largeur, on est sur un téléphone (CONCEPT.md §11). */
export const SEUIL_MOBILE = 720

/** Où se tient la gare à quai, depuis le bord gauche. */
export const ANCRE_FRISE = 120
export const ANCRE_FRISE_MOBILE = 44

/** Ce qu'on garde à droite, pour que la dernière mention ait sa place. */
/**
 * Ce que les commandes occupent au bord droit.
 *
 * Il y en a **deux** depuis le 24 novembre 2026 : l'œil, et le sélecteur de
 * langue qui a pris le coin. Chacune fait 36 px — 24 px d'icône ou de texte, et
 * 6 de rembourrage de chaque côté —, avec 14 px entre elles ; puis 16 px de
 * dégagement avant que la voie ne commence.
 *
 * La voie s'effaçait jusqu'ici à `MARGE_VOIE` du bord, c'est-à-dire exactement
 * là où l'œil commençait — ils se superposaient par construction. Et quand le
 * sélecteur est arrivé, l'œil s'est décalé vers la gauche sans que ce nombre
 * suive : la voie repassait dessous. Si une commande change de taille ou qu'il
 * s'en ajoute une, c'est ici qu'il faut recompter.
 */
export const DEGAGEMENT_COMMANDES = 36 + 14 + 36 + 16

export const MARGE_FRISE = 200
export const MARGE_FRISE_MOBILE = 175

/** Ce que la voie laisse libre de chaque côté de l'écran, en pixels. */
export const MARGE_VOIE = 40

/**
 * Sur quelle distance la frise s'efface, après la marge, avant d'être opaque.
 *
 * Elle est réglée pour l'ancre du bureau. Sur téléphone, où l'ancre vaut le
 * tiers, le même fondu ferait naître la première gare en plein dedans — « ici »
 * à moitié effacé. Il s'y resserre donc, et pas seulement à la moitié :
 * `margeVoie` est elle-même plafonnée par l'ancre moins 16, si bien qu'un fondu
 * de 16 px laisserait exactement zéro dégagement. À 10, il en reste six.
 */
export function fonduFrise(largeur: number): number {
  return largeur < SEUIL_MOBILE ? 10 : 48
}

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
  return margeVoie(largeur) + DEGAGEMENT_COMMANDES
}

/** Écartement minimal : en dessous, deux gares se chevaucheraient. */
const ECART_MINIMUM = 80

/**
 * Ce que prend, sur téléphone, ce qui s'écrit sous le point de la gare
 * suivante — le plus large de son **libellé** et de sa **mention**.
 *
 * C'était la mention jusqu'au 25 novembre 2026 : « PROCHAIN » en mono 9 px,
 * interlettrage compris, fait 56 px, et 64 laissait une marge. Depuis que
 * tout le site est en mono, c'est le libellé qui gagne : « plus loin » et
 * « elsewhere », neuf caractères de mono 13 px, font **70,2 px** — mesurés
 * dans le navigateur, pas estimés. D'où 76, qui garde la même marge.
 *
 * Elle n'est pas décorative : c'est elle qui plafonne l'écartement. Si un
 * libellé s'allonge un jour, ou si la frise change de corps, c'est ce nombre
 * qu'il faut refaire — et il ne casse aucun test en silence, il déborde à
 * l'écran.
 */
export const LARGEUR_LIBELLE_MOBILE = 76

/**
 * Combien de gares la frise étale sur la largeur : quatre sur un écran, deux
 * sur un téléphone, où il n'y a de place que pour celle où l'on est et la
 * suivante.
 */
export function garesVisibles(largeur: number): number {
  return largeur < SEUIL_MOBILE ? 2 : 4
}

/**
 * De combien les gares sont resserrées par rapport à la largeur disponible.
 *
 * Emmanuelle, le 24 novembre 2026 : « tu peux resserrer très légèrement les
 * gares (5 % disons) ». La frise ne va donc plus tout à fait jusqu'à la marge
 * de droite : elle s'arrête un peu avant, et c'est voulu.
 */
export const RESSERREMENT = 0.95

/**
 * Écart entre deux gares : ce qu'il faudrait pour que `visibles` gares
 * occupent exactement la largeur, de l'ancre à la marge de droite, moins le
 * `RESSERREMENT`.
 */
export function ecartFrise(largeur: number, visibles: number): number {
  const mobile = largeur < SEUIL_MOBILE
  const ancre = mobile ? ANCRE_FRISE_MOBILE : ANCRE_FRISE
  const marge = mobile ? MARGE_FRISE_MOBILE : MARGE_FRISE
  const intervalles = Math.max(1, visibles - 1)
  const etale = ((largeur - ancre - marge) / intervalles) * RESSERREMENT
  if (!mobile) return Math.max(ECART_MINIMUM, etale)

  /*
   * Sur téléphone, l'étalement ne suffit pas : le masque de la frise efface
   * tout ce qui passe `margeVoieDroite` — la place de l'œil et du FR/EN — et
   * commence à l'effacer `fonduFrise` plus tôt. Sur un écran de 390, il ne
   * restait que 250 px lisibles, et « PROCHAIN ARRÊT » finissait à 305 : la
   * gare suivante était amputée des deux tiers de sa mention.
   *
   * D'où ce plafond, qui n'est pas un réglage mais la place qu'il reste.
   * Il ne mord que là où il le faut : au-delà de 420 px environ, l'étalement
   * est déjà sous le plafond et rien ne change.
   */
  const place = largeur - margeVoieDroite(largeur) - fonduFrise(largeur) - ancre - LARGEUR_LIBELLE_MOBILE
  return Math.max(ECART_MINIMUM, Math.min(etale, place))
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
  const droite = MONDE.x + MONDE.width
  const x0 = borner(-frame.offsetX / frame.scale, MONDE.x, droite)
  const x1 = borner((viewportW - frame.offsetX) / frame.scale, MONDE.x, droite)
  // Vers le haut, on ne remonte que ce que le sommet peut occuper : au-delà
  // c'est du ciel, et le ciel n'est pas dessiné par le relief. Rendre plus
  // haut ne ferait que peindre du vide, en pixels.
  const y0 = borner(-frame.offsetY / frame.scale, -MONDE_CIEL_MASSIF, HORIZON)
  const y1 = borner((viewportH - frame.offsetY) / frame.scale, -MONDE_CIEL_MASSIF, HORIZON)
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
  // La descente du format s'ajoute au jeu : le plafond du reflet, lui, reste
  // le vrai garde-fou — il est ce qui empêche rails et train de sortir par le
  // bas sur une fenêtre basse.
  const marge = jeu + descenteDuFormat(viewportW, viewportH)
  const decalage = Math.min(marge, Math.max(0, reflet - PLANCHER_REFLET))

  // Le massif a sa propre taille, qui ne suit pas le recul du train : c'est
  // elle qu'on essaie de tenir, et qu'on rabote si le ciel n'y suffit pas.
  const plafond = ECHELLE_MONTAGNES * massifDuFormat(viewportW, viewportH)
  const ciel = (e: number): number => cielAuSommet(viewportW, viewportH, e, decalage)
  // Quand le haut du voile plafonne la crête, rapetisser ne rend plus de ciel :
  // la cible devient le meilleur ciel disponible, ce qui garde l'échelle
  // continue (les deux définitions coïncident à la hauteur critique).
  const cible = Math.min(CIEL_SOMMET, ciel(ECHELLE_MIN))
  const tient = (e: number): boolean => ciel(e) >= cible
  if (tient(plafond)) return { decalage, echelle: plafond }

  let bas = ECHELLE_MIN
  let haut = plafond
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

/**
 * Un pixel CSS, ramené dans le cadre de la scène.
 *
 * C'est l'inverse exact de `poserMonde` : ce qui a été posé en (x, y) dans le
 * cadre se lit à `x * scale + offsetX` à l'écran. Un clic fait le chemin dans
 * l'autre sens.
 */
export function versCadre(px: number, py: number, frame: Frame): { x: number; y: number } {
  return { x: (px - frame.offsetX) / frame.scale, y: (py - frame.offsetY) / frame.scale }
}

/**
 * L'assombrissement d'« ailleurs » : deux profondeurs de teinte, qui suivent
 * `nuitDeLaGare`. Chacune multiplie vers le noir les plans qui la portent
 * (`Nuit`, dans `Scene.ts`), et le noir devient la couleur du fond sous le
 * shader de recoloration — comme le voile du pied. « Opacité » se lit donc ici
 * « ce que la teinte retire » : à 0,45, il reste 55 % de la clarté.
 *
 * Ce bloc a longtemps décrit « deux voiles noirs », un design abandonné depuis
 * longtemps : un rectangle plein cadre aurait assombri tout ce qui est dessiné
 * dessous, lumières comprises.
 *
 * VALEURS DE DÉPART PROVISOIRES — à régler à l'œil avec Emmanuelle dans la
 * scène en mouvement (spec §7). Ne pas les figer sans son accord.
 *
 * Réglage 3 : elles valaient 0,72 et 0,35. À 0,72 il ne restait que 28 % de la
 * luminance, et la maquette, elle, garde le train, le banc, la valise et le
 * grain du bâtiment lisibles. Descendues à 0,45 et 0,15 : la gare reste une
 * gare de nuit, mais on y voit encore ce qui est dessiné.
 */
/** Ce que la nuit retire au décor : massif, quai, rails, corps du train. */
export const NUIT_PROFONDEUR = 0.45
/** Ce que la nuit retire au ciel : poussière et étoiles. Plus léger. */
export const NUIT_CIEL = 0.15

/**
 * L'opacité d'un voile pour une nuit donnée (0 à 1) et son maximum. La nuit
 * est bornée : une valeur hors de [0, 1] ne rend jamais le voile plus opaque
 * que son maximum, ni négatif.
 */
export function opaciteVoile(nuit: number, max: number): number {
  return Math.min(1, Math.max(0, nuit)) * max
}
