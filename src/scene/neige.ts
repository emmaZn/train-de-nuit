/**
 * La neige d'« ailleurs » (spec §6, « la neige libre »).
 *
 * Pendant de `quai.ts` et `cables.ts` : des nombres et des fonctions pures,
 * rien ne dessine — aucun import de Pixi ici. `NeigeLayer.ts` est ce qui
 * trace, et c'est le seul à connaître un `Graphics`.
 *
 * **Des couches, pas des flocons.** La neige se tire une fois par couche, puis
 * elle ne se retire plus : chaque image ne déplace que la racine de la couche,
 * et `decalageCouche` dit de combien. C'est l'idiome du projet — `Sky`
 * translate sa racine entière, `Faisceau` fait respirer quatre couches à des
 * rythmes décalés — et c'est ce qui rend la neige gratuite à l'image.
 *
 * Tout se compte ici en **pixels de cadre** : les vitesses, les hauteurs de
 * bouclage, la surface de la densité. C'est le repère du décor (le plan
 * `neige` vit dans `decor`, posé par `cadrageScene`), celui du cône du
 * faisceau, et donc celui que la seconde population — les flocons du faisceau,
 * tâche 7 — retrouvera sans conversion.
 *
 * Les réglages marqués « provisoire » attendent la séance avec la
 * propriétaire (spec, « Ce qui reste ouvert » : la densité et la vitesse de la
 * neige se posent à vue, sur la scène qui tourne).
 */
import { alea } from './alea'
import type { Grain } from './alea'
import type { Cone } from './cone'

/**
 * Un flocon : exactement la matière d'un grain de `Sky` — une place, un rayon,
 * une opacité. Rien de plus, pour que les flocons du faisceau (tâche 7)
 * tombent par la même mécanique sans rien ajouter au type.
 */
export type Flocon = Grain

/**
 * Combien de couches tombent ensemble : **quatre** (spec §6), comme les quatre
 * couches qui respirent dans `Faisceau`. Elles font la profondeur — la
 * lointaine est lente et fine, la proche rapide et plus franche. Quelques
 * `Graphics`, pas un par flocon.
 */
export const COUCHES_NEIGE = 4

/**
 * La chute de chaque couche, en pixels de **cadre** par seconde, de la plus
 * lointaine à la plus proche. Elles sont toutes différentes : deux couches à
 * la même vitesse tomberaient comme une seule.
 * PROVISOIRE (spec §7) : à régler à vue.
 */
export const VITESSES: readonly number[] = [30, 44, 60, 80]

/**
 * Un flocon par ce nombre de pixels de cadre², **toutes couches confondues**.
 * Trois fois moins dense que la poussière du ciel (`1/600`) : la neige se
 * regarde tomber, elle ne concurrence pas les étoiles.
 * PROVISOIRE (spec §7) : à régler à vue.
 */
const DENSITE = 1 / 1800

/** CONCEPT.md §11 : moins de particules sur mobile, comme `Sky`. */
const FACTEUR_MOBILE = 0.35

/** Sous ce nombre, une couche ne se lit plus comme une chute. */
const PLANCHER_COUCHE = 8

/**
 * Le rayon d'un flocon, en pixels de cadre, couche par couche : la couche
 * lointaine est la plus fine. PROVISOIRE (§7).
 */
const RAYONS: readonly (readonly [number, number])[] = [
  [0.8, 1.3],
  [1.0, 1.7],
  [1.3, 2.2],
  [1.6, 2.7],
]

/**
 * L'opacité d'un flocon, couche par couche : la lointaine est la plus terne.
 * La neige est blanche (CONCEPT §12.2) ; c'est son opacité, et elle seule, qui
 * la met en arrière-plan. PROVISOIRE (§7).
 */
const OPACITES: readonly (readonly [number, number])[] = [
  [0.2, 0.4],
  [0.3, 0.52],
  [0.4, 0.68],
  [0.5, 0.85],
]

/** Combien de flocons une surface porte, toutes couches confondues. */
export function nombreDeFlocons(largeur: number, hauteur: number, mobile: boolean): number {
  const surface = Math.max(largeur, 1) * Math.max(hauteur, 1)
  const brut = surface * DENSITE * (mobile ? FACTEUR_MOBILE : 1)
  return Math.max(PLANCHER_COUCHE * COUCHES_NEIGE, Math.round(brut))
}

/** Un flocon de la couche `i`, tiré sur `largeur` × `hauteur`. */
function flocon(suivant: () => number, i: number, largeur: number, hauteur: number): Flocon {
  const [rMin, rMax] = RAYONS[i % RAYONS.length]
  const [aMin, aMax] = OPACITES[i % OPACITES.length]
  return {
    x: suivant() * largeur,
    y: suivant() * hauteur,
    r: rMin + suivant() * (rMax - rMin),
    a: aMin + suivant() * (aMax - aMin),
  }
}

/**
 * La neige libre : une population par couche, tirée sur `largeur` × `hauteur`
 * pixels de cadre — la part du cadre que l'écran montre, pas le `STAGE`
 * entier : `cadrageScene` décale le cadre, et un tirage sur le `STAGE`
 * laisserait une bande vide en haut de l'écran.
 *
 * Le tirage est stable : même graine, même neige, sur chaque visite comme dans
 * chaque test.
 */
export function floconsLibres(
  largeur: number,
  hauteur: number,
  graine: number,
  mobile: boolean,
): Flocon[][] {
  // Le même mulberry32 que la poussière et le faisceau — un seul générateur
  // dans la scène, et la même neige à chaque visite. Il vit dans `alea.ts`,
  // sans Pixi : ce module reste en nombres purs, ses tests aussi.
  const suivant = alea(graine)
  const parCouche = Math.max(
    PLANCHER_COUCHE,
    Math.round(nombreDeFlocons(largeur, hauteur, mobile) / COUCHES_NEIGE),
  )
  const couches: Flocon[][] = []
  for (let i = 0; i < COUCHES_NEIGE; i += 1) {
    const flocons: Flocon[] = []
    for (let n = 0; n < parCouche; n += 1) flocons.push(flocon(suivant, i, largeur, hauteur))
    couches.push(flocons)
  }
  return couches
}

/**
 * De combien la couche `i` est tombée après `t` secondes, rebouclé sur
 * `hauteur` : toujours dans `[0, hauteur)`, quelle que soit la durée.
 *
 * C'est tout ce que l'animation demande. Le bouclage sans bande vide tient au
 * tracé — chaque couche est dessinée **deux fois**, à `y` et à `y - hauteur`,
 * si bien qu'un décalage dans `[0, hauteur)` couvre toujours l'écran entier
 * (voir `NeigeLayer`).
 */
export function decalageCouche(i: number, t: number, hauteur: number): number {
  const h = Math.max(hauteur, 1)
  const d = (VITESSES[i % VITESSES.length] * t) % h
  return d < 0 ? d + h : d
}

/* ---- La neige du faisceau (spec §6, « la neige du cône »). Une seconde
 *      population, plus dense et plus vive que la libre : celle que la
 *      propriétaire a demandée, ce pour quoi la neige est dans le canvas. ---- */

/**
 * Un flocon par ce nombre de pixels de cadre² **du cône** — la densité de la
 * poussière du faisceau (`1/150`), soit douze fois celle de la neige libre.
 * PROVISOIRE (§7) : à régler à vue.
 */
const DENSITE_CONE = 1 / 150

/** Moins de flocons sur mobile (§11), mais le cône reste plus dense que le fond. */
const FACTEUR_MOBILE_CONE = 0.6

/** Sous ce nombre, une couche du cône ne se lit plus comme une chute. */
const PLANCHER_COUCHE_CONE = 6

/** Rayon, par couche, en pixels de cadre : un peu plus gros que la libre. PROVISOIRE (§7). */
const RAYONS_CONE: readonly (readonly [number, number])[] = [
  [1.0, 1.6],
  [1.2, 2.0],
  [1.5, 2.5],
  [1.8, 3.0],
]

/**
 * Opacité, par couche : plus vive que la libre (`OPACITES`) couche pour couche,
 * et de beaucoup en médiane. Pas pour chaque flocon : `PLANCHER_CLARTE` assombrit
 * le haut du cône, et un flocon de la couche 0 près du sommet (0,385 au plus
 * terne) peut passer sous le plafond de 0,4 de la couche lointaine libre. Le
 * flocon est blanc, comme la lanterne qui l'éclaire — pas de mi-teinte
 * nouvelle (CONCEPT §12.2). PROVISOIRE (§7).
 */
const OPACITES_CONE: readonly (readonly [number, number])[] = [
  [0.55, 0.75],
  [0.65, 0.85],
  [0.75, 0.95],
  [0.85, 1.0],
]

/** Le plus clair du cône est en bas, comme la poussière (`grainsDuFaisceau`). */
const PLANCHER_CLARTE = 0.7

/**
 * La neige du faisceau : une population par couche, tirée sur le **rectangle**
 * qui enveloppe le cône — la largeur de la base, sur la hauteur du cône.
 *
 * Pas sur le cône : la chute est un décalage vertical à `x` fixe, bouclé sur la
 * hauteur du cône. Une population tirée dans le cône (ou dans la colonne du
 * cône à chaque `x`) ne remplit, une fois décalée, que l'intersection de deux
 * arcs de la boucle : la quantité visible pulse et les bords se vident — mesuré
 * à 0,02..0,47 de flocons dans le quart extérieur selon la phase, contre 0,25
 * pour une densité uniforme. Une densité uniforme sur le rectangle bouclé reste
 * uniforme sous le masque du cône à chaque phase, à l'arrêt comme en chute.
 * C'est donc **le masque** (`Faisceau`) qui découpe le cône, et les flocons au
 * repos ne sont pas tous dans le triangle : seuls ceux qu'il laisse voir le sont.
 *
 * La densité est celle de ce qu'on **voit** (`1/150` par pixel² de cône) : le
 * rectangle en tire donc le double du cône, qui en cache la moitié. Le nombre
 * de couches est `COUCHES_NEIGE`, le même que la neige libre, parce que
 * `decalageCouche` lit `VITESSES` couche par couche et que rien ne doit les
 * désaccorder en silence.
 *
 * Le tirage est en pixels de cadre, donc indifférent à l'échelle.
 */
export function floconsDuCone(cone: Cone, graine: number, mobile: boolean): Flocon[][] {
  const largeur = cone.base[1] - cone.base[0]
  const surface = largeur * cone.hauteur
  const brut = surface * DENSITE_CONE * (mobile ? FACTEUR_MOBILE_CONE : 1)
  const parCouche = Math.max(PLANCHER_COUCHE_CONE, Math.round(brut / COUCHES_NEIGE))
  const suivant = alea(graine)
  const couches: Flocon[][] = []
  for (let i = 0; i < COUCHES_NEIGE; i += 1) {
    const [rMin, rMax] = RAYONS_CONE[i]
    const [aMin, aMax] = OPACITES_CONE[i]
    const flocons: Flocon[] = []
    for (let n = 0; n < parCouche; n += 1) {
      const t = suivant()
      flocons.push({
        x: cone.base[0] + suivant() * largeur,
        y: cone.sommet.y + cone.hauteur * t,
        r: rMin + suivant() * (rMax - rMin),
        // Plus clair vers le bas, comme la poussière : t est la profondeur.
        a: (aMin + suivant() * (aMax - aMin)) * (PLANCHER_CLARTE + (1 - PLANCHER_CLARTE) * t),
      })
    }
    couches.push(flocons)
  }
  return couches
}
