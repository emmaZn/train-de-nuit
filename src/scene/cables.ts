/**
 * La géométrie des câbles de « plus loin ».
 *
 * Tout vient de `cables/cables-scene.svg`, dessiné dans un cadre 1280 × 832
 * dont la ligne de rail est à `y = 586`. On ne rasterise pas ce fichier : on en
 * lit les mesures et on redessine, en points à pleine luminance (CONCEPT §4.2).
 *
 * Rien ici ne dessine : ce module ne contient que des nombres et des fonctions
 * pures, pour que tout ce qui se vérifie se vérifie sans canvas.
 */
import { DUREE_ETAPE, ECHELLE_TRAIN, HORIZON, STAGE } from './layout'
import { DEFILEMENT, PHASE_FREINAGE, PHASE_ROULE } from './Train'

/** Le cadre dans lequel le SVG des câbles est dessiné, rail compris. */
export const CADRE_CABLE = { largeur: 1280, rail: 586 } as const

/** Unités du SVG des câbles → pixels du cadre de la scène. */
export const ECHELLE_CABLE = STAGE.width / CADRE_CABLE.largeur

/** Une mesure du SVG, en pixels de cadre. */
export const u = (v: number): number => v * ECHELLE_CABLE

/**
 * Un `y` du SVG, ramené sur la ligne de rail de la scène.
 *
 * On se cale sur `HORIZON` et non sur un `y` de Figma : la scène a été
 * descendue par paliers depuis que ce cadre a été dessiné.
 */
export const yCadre = (ySvg: number): number =>
  HORIZON - (CADRE_CABLE.rail - ySvg) * ECHELLE_CABLE

/** Une travée, d'un poteau au suivant. */
export const TRAVEE = u(620)

/**
 * Les deux fils. `controle` est le décalage du **point de contrôle** de la
 * quadratique, comme dans le SVG : la flèche réelle à mi-portée en vaut la
 * moitié. Les prendre au pied de la lettre donnerait des fils deux fois plus
 * creux que le dessin.
 *
 * `densite` remplace l'opacité du SVG (0,75 et 0,65) : le projet ne connaît
 * pas les mi-teintes, une transparence devient une densité de points.
 */
export const FILS = [
  { y: yCadre(315), controle: u(92), densite: 0.75 },
  { y: yCadre(349), controle: u(104), densite: 0.65 },
] as const

/**
 * Le poteau, pied sur les rails. Toutes les mesures viennent du SVG : le fût
 * et sa pointe, deux bras, leurs isolateurs et leurs haubans. Ce sont ces
 * petites pièces qui font qu'un poteau ressemble à un poteau et non à une
 * croix.
 */
export const POTEAU = {
  sommet: yCadre(294),
  epaule: yCadre(300),
  demiFut: u(3.5),
  bras: [
    { y: yCadre(322), demi: u(34), epaisseur: u(5), isolateurs: u(30), hauban: u(16) },
    { y: yCadre(356), demi: u(26), epaisseur: u(5), isolateurs: u(22), hauban: u(16) },
  ],
} as const

export type Secousse = { amplitude: number; phase: number }

/** Combien un fil pend, à la fraction `t` de sa portée. */
export const creux = (controle: number, t: number): number =>
  Math.sin(Math.PI * t) * (controle / 2)

/** Ce qui reste d'une secousse après `dt`. */
export const amortir = (amplitude: number, dt: number): number =>
  amplitude * Math.exp(-2.2 * dt)

/**
 * La hauteur d'un fil : sa flèche, plus sa vibration.
 *
 * Les deux s'annulent aux poteaux (`sin(π t)`), parce que c'est là que le fil
 * est attaché — une vibration qui ne s'y éteint pas décrocherait le fil.
 */
export function yFil(fil: number, t: number, secousse: Secousse, horloge: number): number {
  const f = FILS[fil]
  const onde = Math.sin(Math.PI * t) * secousse.amplitude * Math.cos(horloge * 9 + secousse.phase)
  return f.y + creux(f.controle, t) + onde
}

/**
 * Le sol qui reste à parcourir jusqu'à l'arrêt de la gare, en pixels de cadre.
 *
 * On s'ancre là-dessus et non sur une position absolue de la ligne : selon
 * qu'on arrive d'« ici » en une étape ou d'« ailleurs » en deux, le sol
 * parcouru diffère de ~320 px, et l'approche ne se lirait pas pareil selon la
 * provenance. Négatif une fois la gare dépassée.
 */
export const distanceGare = (
  etapesAvantGare: number,
  avancementEtape: number,
  solParEtape: number,
): number => (etapesAvantGare - avancementEtape) * solParEtape

/**
 * Le sol que couvre une étape, en pixels de cadre.
 *
 * Les étapes ne se valent pas : une étape de passage se fait à vitesse
 * constante, une étape avec arrêt perd la moitié de ses rampes. C'est
 * l'intégrale de la vitesse, en pixels et non ramenée à 1 — `avancement()`
 * fait l'autre moitié du travail, côté train.
 */
export function solParEtape(demarrage: boolean, freinage: boolean): number {
  const montee = demarrage ? PHASE_ROULE : 0
  const descente = freinage ? 1 - PHASE_FREINAGE : 0
  const plein = 1 - montee - descente
  const part = montee / 2 + plein + descente / 2
  return DEFILEMENT * ECHELLE_TRAIN * DUREE_ETAPE * part
}

/**
 * De combien d'étapes l'île doit s'être éloignée avant qu'on reprenne l'ancre
 * suivante. En deçà, elle est encore à l'écran : la déplacer la ferait
 * disparaître d'un coup au lieu de s'en aller.
 */
export const RECUL_HORS_CHAMP = 1.6

/**
 * Quelle arrivée à « plus loin » l'île suit.
 *
 * La ligne est infinie vers l'avant : « plus loin » revient tous les quatre
 * legs. Quand le train la quitte, la gare suivante annonce déjà la prochaine,
 * trois étapes devant — mais reprendre cette ancre tout de suite téléporterait
 * les poteaux de l'autre côté de l'écran. On garde donc l'ancienne jusqu'à ce
 * que l'île soit sortie du champ par la gauche.
 */
export function ancreSuivante(
  ancre: number | null,
  prochain: number,
  parcouru: number,
): number {
  if (ancre === null) return prochain
  return ancre < parcouru - RECUL_HORS_CHAMP ? prochain : ancre
}

/**
 * Le sol qui reste jusqu'à l'arrêt en gare, en pixels de cadre.
 *
 * Tout se lit dans `restant`, qui est un nombre d'étapes **continu** : sa
 * partie fractionnaire dit ce qui reste de l'étape en cours, sa partie entière
 * combien d'étapes suivent. Mélanger `ceil(restant)` et un avancement venu
 * d'ailleurs comptait l'étape deux fois à l'instant précis de l'arrivée, et
 * l'île sautait d'une étape entière le temps d'une image.
 *
 * Les étapes ne font pas la même longueur : celle qui finit en gare freine,
 * les autres passent. On les additionne donc une à une, avec leur profil.
 */
export function solRestant(
  restant: number,
  etapesAvantTerminus: number,
  profil: { demarrage: boolean; freinage: boolean },
): number {
  if (restant <= 0) return 0
  const entieres = Math.max(0, Math.ceil(restant) - 1)
  const fraction = restant - entieres
  let sol = fraction * solParEtape(profil.demarrage, profil.freinage)
  for (let i = 0; i < entieres; i += 1) {
    const rang = i + 1
    // Une étape qui vient **après** le terminus repart d'un arrêt, donc elle
    // démarre — et elle est plus courte d'environ trois cents pixels. La
    // compter comme une étape lancée faisait réviser l'estimation à l'instant
    // précis où le train s'immobilise, et l'île glissait sous les yeux.
    const derniere = i === entieres - 1
    sol += solParEtape(
      rang >= etapesAvantTerminus,
      derniere && Math.ceil(restant) >= etapesAvantTerminus,
    )
  }
  return sol
}

/** En combien de secondes l'île rattrape une révision de l'estimation. */
export const RATTRAPAGE = 0.35

/**
 * De combien l'estimation vient d'être **révisée**, au-delà du sol parcouru.
 *
 * Tant que rien ne change, ce qui reste jusqu'à la gare décroît exactement du
 * sol parcouru : la révision vaut zéro, et l'île suit le ballast sans traîner
 * d'un pixel. Elle ne devient non nulle qu'aux discontinuités — au clic sur la
 * frise, l'étape apprend qu'elle va freiner et raccourcit de six cents pixels.
 */
export function revision(cibleAvant: number | null, cible: number, pasDeSol: number): number {
  if (cibleAvant === null) return 0
  return cible - (cibleAvant - pasDeSol)
}

/** Ce qu'il reste d'un écart après `dt`. */
export const decroitre = (erreur: number, dt: number): number =>
  erreur * Math.exp(-dt / RATTRAPAGE)

/**
 * Les étapes parcourues, du point de vue de l'île.
 *
 * Le compteur s'incrémente à la fin de chaque étape — mais à cette image-là
 * l'avancement vaut encore 1, et les additionner compterait l'étape deux fois.
 * On ne prend donc l'avancement que tant que la phase n'est pas close. Au
 * départ suivant la phase repart de zéro sans que le compteur bouge : la
 * distance ne recule pas non plus.
 */
export const legsDeLIle = (legsIle: number, phase: number, avancementEtape: number): number =>
  legsIle + (phase >= 1 ? 0 : avancementEtape)

/**
 * Faut-il poser la position d'un coup au lieu de la rattraper ?
 *
 * Deux moments seulement. **Au départ**, parce que l'étape apprend là si elle
 * freine ou si elle traverse, et que les deux ne font pas la même longueur :
 * la révision est inévitable, mais posée à l'instant précis où le train, le
 * massif et la frise se mettent tous en marche, elle passe dans le mouvement
 * général au lieu de glisser toute seule. **Au changement de boucle**, parce
 * que le saut se fait hors champ des deux côtés.
 *
 * Surtout pas à l'arrivée : c'est là qu'on veut de la continuité.
 */
export const rompreLeRattrapage = (
  enRouteAvant: boolean,
  enRoute: boolean,
  ancreAvant: number | null,
  ancre: number | null,
): boolean => (enRoute && !enRouteAvant) || ancre !== ancreAvant
