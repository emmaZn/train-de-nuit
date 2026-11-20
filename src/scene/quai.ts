/**
 * La géométrie du quai de « ailleurs ».
 *
 * Pendant de `cables.ts` : des nombres et des fonctions pures, rien ne dessine.
 * La composition vient du §5.4 de la spec (maquette du 15 novembre) : loco à
 * gauche, réverbère vers le centre, bâtiment à droite, panneau en bas à droite
 * par-dessus le mur. Le bâtiment n'est plus un mur mais la gare entière
 * dessinée par la propriétaire, ses **deux** marquises de quai comprises :
 * celle de gauche part vers la gauche et passe au-dessus du réverbère, qui se
 * tient devant elle ; celle de droite sort du cadre, et ne se découvre qu'en
 * marche vers « ici ». La propriétaire l'a voulu ainsi (20 novembre 2026).
 *
 * **Le banc et la valise sont retirés**, le même jour et pour la même raison :
 * le deuxième dessin de gare n'a pas de porte, et c'est sur elle qu'ils étaient
 * calés. Elle les reprendra plus tard — leurs cadres (`CADRES`) et leurs SVG
 * restent donc en place, seul `PIECES` ne les pose plus.
 *
 * La rame est opaque et s'arrête le nez à `TETE_LOCO × STAGE.width`, en
 * s'allongeant vers l'arrière : elle occupe toute la moitié gauche du cadre.
 * La gare avait d'abord été posée tout entière à droite de son nez ; la
 * propriétaire l'a décalée vers la gauche (`DECALAGE_GARE`) en acceptant que le
 * réverbère passe derrière la rame à l'arrêt. C'est voulu.
 * Le faisceau du réverbère déborde sur le massif : il se construit à partir de
 * `x`, `pied` et `hauteur`.
 *
 * Convention : `x` est le centre de la pièce, sauf pour le bâtiment et le
 * panneau, où c'est le bord gauche. `pied` est le `y` du sol de la pièce.
 */
import { HORIZON } from './layout'

/**
 * Le cadre de chaque dessin, en pixels de cadre à l'échelle 1.
 *
 * Une pièce posée à un autre rapport que son dessin l'**étire** — la porte
 * cintrée devient un ovale, l'horloge une ellipse. Ces cadres sont donc la
 * source du rapport, et `quai.test.ts` les confronte aux fichiers servis :
 * au `viewBox` pour le banc et la valise, qui sont des SVG, aux dimensions de
 * l'image pour le bâtiment et le réverbère, qui sont des PNG déjà grainés
 * (`IMAGES`).
 *
 * Les deux cadres d'image ne valent **pas** les dimensions de leur fichier :
 * ils restent à l'échelle du cadre, parce que c'est en unités de cadre que se
 * lisent la lueur de la lanterne (`LUEUR.rayon`) et le sommet du faisceau.
 * Seul leur rapport doit suivre l'image.
 */
export const CADRES = {
  reverbere: { largeur: 80, hauteur: 560 },
  // Le banc et la valise ne sont plus posés (voir l'en-tête), mais leurs
  // dessins existent et reviendront : on garde leur cadre, que `quai.test.ts`
  // continue de confronter au `viewBox` de leur SVG. Les remettre dans
  // `PIECES` est alors la seule chose à faire.
  banc: { largeur: 280, hauteur: 140 },
  valise: { largeur: 96, hauteur: 80 },
  batiment: { largeur: 1813, hauteur: 500 },
} as const

/**
 * La taille des deux images servies, en pixels de leur fichier.
 *
 * Elles ne servent qu'à une chose : vérifier que le cadre ci-dessus est au
 * rapport de l'image, et convertir les repères relevés **sur le dessin** (la
 * porte, le trou d'horloge) en pixels de cadre. `quai.test.ts` les relit dans
 * les en-têtes PNG.
 */
export const IMAGES = {
  batiment: { largeur: 2114, hauteur: 583 },
  reverbere: { largeur: 108, hauteur: 756 },
} as const

/**
 * De combien toute la gare est décalée vers la gauche, en pixels de cadre.
 *
 * **Le seul nombre à changer** pour la déplacer : réverbère, bâtiment, panneau
 * et bordure (celle-ci suit `DEBUT_GARE` / `FIN_GARE`) en dérivent tous, du
 * même déplacement, donc la composition interne ne bouge pas.
 * Les abscisses de `PIECES` sont écrites à la place d'origine (gare entière à
 * droite du nez de la loco), moins ce décalage.
 *
 * **Mesure, pour qui voudra la déplacer ou remplacer l'asset.** Le cadre de
 * 2320 est rogné par la fenêtre dès qu'elle est plus étroite que 2320:1217
 * (1,906). Bande visible (`fitStage`, cover), en pixels de cadre : 0 à 2320 à
 * 2560×1080 ; 78 à 2242 à 1920×1080 ; 186 à 2134 à 1440×900 ; 192 à 2128 à
 * 1432×900 ; 349 à 1971 à 1280×960 et 1024×768. La bande commune à tous ces
 * formats (2560×1080 à 1024×768) va donc de **349 à 1971, soit environ
 * 1622 px**. La gare en occupe environ 1386 (de `DEBUT_GARE` à `FIN_GARE`) :
 * elle pourrait y entrer, mais à 360 de décalage elle passe presque entière
 * derrière la rame — la locomotive mange le flanc du bâtiment, le réverbère
 * tient sur la cabine, la marquise disparaît. La propriétaire préfère le
 * rognage : **le bord droit de la gare sort de la bande commune, à dessein.**
 * Un portrait de téléphone ne montre que ~560 px (879 à 1441).
 *
 * 60 est la valeur du réglage 1, décidée en regardant la scène tourner.
 */
export const DECALAGE_GARE = 60

/**
 * La largeur du bâtiment, en pixels de cadre — à l'échelle 1 de son dessin
 * (`CADRES.batiment`). Il s'étire **de part et d'autre de son corps**, que
 * `BORD_DROIT_CORPS` tient en place : le mur passe derrière le réverbère, qui
 * se tient devant lui comme sur un vrai quai, et la marquise de droite sort du
 * cadre. Un second réglage, indépendant de `DECALAGE_GARE`. Le changer demande
 * de refaire le dessin : le test des rapports le rappelle.
 *
 * **1040, puis 1316, puis 1813 : c'est toujours la même règle, et ce n'est
 * jamais un réglage de goût.** On garde la **hauteur** — 500 px, la présence
 * du bâtiment dans le cadre et la place de l'horloge dans la bande des
 * étoiles — et la largeur suit le rapport du dessin. Le premier dessin de la
 * propriétaire valait 0,380 (663 / 1745) contre 0,481 au mur d'avant ; le
 * second vaut 0,276 (583 / 2114), parce qu'il porte une marquise de **chaque**
 * côté du corps de gare au lieu d'une seule.
 *
 * 1813 et non 1808 : la largeur se calcule, elle ne s'arrondit pas. Une pièce
 * posée à un autre rapport que son dessin l'étire, et `quai.test.ts` confronte
 * les deux rapports à cinq décimales — 500 / 1808 s'en écarte de 8 × 10⁻⁴.
 */
export const LARGEUR_BATIMENT = 1813

/** Pixels de l'image du bâtiment → pixels de cadre. */
const ECHELLE_BATIMENT = LARGEUR_BATIMENT / IMAGES.batiment.largeur

/**
 * Le corps de gare dans son dessin, en pixels de l'image — **relevé sur le
 * PNG servi** (les colonnes dont le dessin occupe plus de 45 % de la hauteur :
 * le corps, pas les marquises). `x0` et `x1` sont la première et la dernière
 * de ces colonnes, bornes comprises.
 *
 * C'est lui, et non le bord de l'image, qui ancre la gare : voir
 * `BORD_DROIT_CORPS`. **Ne pas le tenir à jour à la main** : `quai.test.ts`
 * refait la mesure sur le PNG servi à chaque exécution, et tombe si le dessin
 * change de silhouette sans que ce nombre suive.
 */
export const CORPS_IMAGE = { x0: 638, x1: 1484 } as const

/** Le milieu du corps de gare avant décalage : le panneau s'y centre. */
const MILIEU_CORPS_NU = (CORPS_IMAGE.x1 - CORPS_IMAGE.x0) / 2

/**
 * La largeur du panneau, en pixels de cadre — écrite une fois, parce que son
 * abscisse s'en déduit : il est centré sur le corps de gare.
 *
 * 340 au départ, puis 440 (20 novembre 2026) : la propriétaire l'a voulu plus
 * large, en même temps qu'il perdait trois lignes et 70 px de hauteur. Le corps
 * de gare en fait 726 ; le panneau en occupe les trois cinquièmes.
 */
const LARGEUR_PANNEAU = 440

/**
 * Le bord droit du **corps de gare** avant décalage : fixe, c'est lui qui
 * ancre la gare.
 *
 * C'était le bord droit du **bâtiment**, à 2220, tant que le dessin s'arrêtait
 * à quelques pixels de son mur. Le second en met 630 (px d'image) à droite du
 * corps — une marquise entière —, et garder ce bord aurait traîné tout le
 * bâtiment vers la gauche : le corps de gare serait tombé au milieu du cadre,
 * derrière la rame, et le pignon sur le réverbère.
 *
 * 2150, c'est 2220 moins les 70 px de cadre que le premier dessin posait à
 * droite de son corps : **le corps de gare ne bouge pas d'un pixel.** Ce qui
 * change, c'est ce qu'il y a autour, et la marquise de droite sort du cadre.
 */
const BORD_DROIT_CORPS = 2150

export const PIECES = {
  // 490 = 560 × 0,875 : réduit de 12,5 % (réglage 4). `hauteur` est la hauteur
  // **posée** ; le dessin reste mesuré dans `CADRES.reverbere`, et lanterne,
  // lueur et sommet du faisceau en suivent l'échelle (`hauteur / CADRES…`).
  // 1390 et non 1290 (20 novembre 2026) : la propriétaire l'a décalé vers la
  // droite avec la rame, pour resserrer le groupe. Posé à 1330, il se tient
  // entre le nez de la loco (1299) et le bord gauche du corps de gare (1364).
  reverbere: { x: 1390 - DECALAGE_GARE, pied: HORIZON, hauteur: 490 },
  batiment: {
    x: BORD_DROIT_CORPS - CORPS_IMAGE.x1 * ECHELLE_BATIMENT - DECALAGE_GARE,
    pied: HORIZON,
    largeur: LARGEUR_BATIMENT,
    hauteur: 500,
  },
  // **Au milieu du corps de gare**, posé sur son mur et rien d'autre : ni les
  // deux pieds qui descendaient jusqu'au rail, ni les consoles qui les avaient
  // remplacés — la propriétaire a retiré les deux (`tracerCadrePanneau`).
  // Il était en bas à droite, débordant du mur : elle l'a recentré le
  // 20 novembre 2026, sous l'horloge, quand la gare v2 a mis une marquise de
  // chaque côté du corps. Son abscisse se calcule depuis le même ancrage que le
  // bâtiment, pour qu'un prochain dessin le retrouve centré sans qu'on y
  // revienne.
  panneau: {
    x: BORD_DROIT_CORPS - MILIEU_CORPS_NU * ECHELLE_BATIMENT - LARGEUR_PANNEAU / 2 - DECALAGE_GARE,
    // 700 et non 640 : la propriétaire l'a descendu, pied plus bas sur le mur.
    // Il s'arrête à 866, soit trente et un pixels au-dessus de la bordure du quai
    // (`PIECES.quai.y`), qu'il ne doit pas croiser — `quai.test.ts` le garde.
    y: 700,
    largeur: LARGEUR_PANNEAU,
    // 166, et ce nombre n'est pas libre : c'est exactement ce que le contenu
    // demande — le bandeau, cinq lignes, et la marge du bas. Celle du haut n'y
    // est pas : le bandeau l'annule et affleure le bord. 250 au départ, puis 180
    // quand les huit lignes sont tombées à cinq, puis 166 quand la propriétaire
    // a vu que le cadre traînait sous la dernière ligne. `PanneauDeparts.test.ts`
    // refait l'addition et refuse plus de quatre pixels de jeu.
    hauteur: 166,
  },
  quai: { y: HORIZON - 24, epaisseur: 24 },
} as const

/** Le corps de gare, en pixels de cadre : ce que le panneau et l'horloge visent. */
export const CORPS = {
  x0: PIECES.batiment.x + CORPS_IMAGE.x0 * ECHELLE_BATIMENT,
  x1: PIECES.batiment.x + CORPS_IMAGE.x1 * ECHELLE_BATIMENT,
} as const

/** Le haut du bâtiment, d'où se comptent les `y` de son dessin. */
const SOMMET_BATIMENT = PIECES.batiment.pied - PIECES.batiment.hauteur

/**
 * La place de l'horloge dans le pignon, en pixels de l'image du bâtiment.
 *
 * Le second dessin ne porte **pas** d'horloge. Le premier en portait une,
 * aiguilles figées, que `preparer_ailleurs.py` effaçait pour rendre au pignon
 * son trou : la place était celle du dessinateur, la scène venait s'y poser.
 * Ici il n'y a plus de place choisie, et il faut donc en choisir une.
 *
 * C'est le plus grand disque libre du pignon, **mesuré sur l'image servie** :
 * en (1060, 204), rien de tracé n'approche à moins de 83 px. Le rayon, lui,
 * n'est pas mesuré — 34 px d'image font 29,2 px de cadre, soit le cadran de la
 * v1 à un demi-pixel près (38 px d'une image de 1745, posée sur 1316). Elle
 * n'a pas changé de taille à l'écran, elle a changé de gare.
 *
 * `QuaiLayer.test.ts` relit les pixels de `batiment.png` sous ce disque : le
 * pignon doit y être plein (sinon le ciel passerait sous le cadran) et aucun
 * cercle n'y être tracé (sinon deux horloges).
 */
export const HORLOGE_IMAGE = { x: 1060, y: 204, rayon: 34 } as const

/**
 * L'horloge du bâtiment, en pixels de cadre.
 *
 * **Elle n'est pas dans le dessin** : cadran, halo et aiguilles se tracent au
 * rendu (`QuaiLayer.ts`), dans la racine allumée — c'est une des lumières de la
 * gare, et l'image du bâtiment s'éteint. Le dessin n'en garde que la place.
 *
 * Le premier dessin de la propriétaire en portait une, aiguilles figées : elle
 * était effacée à la fabrication de l'asset, et la nôtre venait se poser dans
 * son trou. Le second n'en porte pas, et c'est donc nous qui choisissons la
 * place — voir `HORLOGE_IMAGE`, qui dit laquelle et pourquoi.
 */
export const HORLOGE = {
  x: PIECES.batiment.x + HORLOGE_IMAGE.x * ECHELLE_BATIMENT,
  y: SOMMET_BATIMENT + HORLOGE_IMAGE.y * ECHELLE_BATIMENT,
  rayon: HORLOGE_IMAGE.rayon * ECHELLE_BATIMENT,
} as const

/**
 * Demi-largeur de l'embase du réverbère, pour que la gare ait un bord gauche :
 * la largeur de son cadre, à l'échelle où il est posé (`hauteur / hauteur`).
 */
const DEMI_EMBASE =
  (CADRES.reverbere.largeur / 2) * (PIECES.reverbere.hauteur / CADRES.reverbere.hauteur)

const bords = [PIECES.reverbere.x - DEMI_EMBASE, PIECES.batiment.x, PIECES.panneau.x]
const fins = [
  PIECES.reverbere.x + DEMI_EMBASE,
  // La marquise de droite dépasse le cadre : l'emprise la compte quand même,
  // sans quoi la gare serait réputée sortie du champ alors qu'elle rentre
  // encore par la gauche.
  PIECES.batiment.x + PIECES.batiment.largeur,
  PIECES.panneau.x + PIECES.panneau.largeur,
]

/** Le bord gauche de la gare, en pixels de cadre, à l'arrêt. */
export const DEBUT_GARE: number = Math.min(...bords)

/** Le bord droit de la gare, en pixels de cadre, à l'arrêt. */
export const FIN_GARE: number = Math.max(...fins)

/** Largeur totale occupée par la gare, en pixels de cadre. */
export const LARGEUR_GARE: number = FIN_GARE - DEBUT_GARE
