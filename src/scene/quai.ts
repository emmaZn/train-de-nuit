/**
 * La géométrie du quai de « ailleurs ».
 *
 * Pendant de `cables.ts` : des nombres et des fonctions pures, rien ne dessine.
 * La composition : loco à gauche, **gare au milieu**, réverbère devant elle.
 * Elle vient du §5.4 de la spec (maquette du 15 novembre), puis le 21 novembre
 * la gare est descendue au centre de la scène (`DECALAGE_GARE`) : à droite, ni
 * elle ni son horloge n'étaient dans le cadre d'un écran étroit, d'un
 * téléphone surtout. Le panneau des départs
 * n'y figure plus : ce n'est plus une plaque posée sur le mur mais un rideau
 * suspendu à la scène (`rideau.ts`), qui ne suit pas la gare. Le bâtiment n'est plus un mur mais la gare entière
 * dessinée par la propriétaire, ses **deux** marquises de quai comprises :
 * celle de gauche part vers la gauche, derrière la rame ; celle de droite part
 * vers la droite et sort de la bande visible des écrans étroits, qui ne la
 * découvrent qu'en marche vers « ici ». Le réverbère se tient devant le **corps**
 * de la gare, sur le quai, entre les deux marquises — il ne passe sous aucune.
 * La propriétaire a voulu ces deux marquises (20 novembre 2026).
 *
 * **Le banc et la valise sont retirés**, le même jour et pour la même raison :
 * le deuxième dessin de gare n'a pas de porte, et c'est sur elle qu'ils étaient
 * calés. Elle les reprendra plus tard — leurs cadres (`CADRES`) et leurs SVG
 * restent donc en place, seul `PIECES` ne les pose plus.
 *
 * La rame est opaque et s'arrête le nez à `TETE_LOCO × STAGE.width`, en
 * s'allongeant vers l'arrière : elle occupe toute la moitié gauche du cadre.
 * La gare avait d'abord été posée tout entière à droite de son nez ; elle a été
 * décalée vers la gauche, et c'est maintenant l'**horloge** qui tient le centre
 * de la scène, le pignon étant sa place. Le flanc gauche du bâtiment passe
 * derrière la rame à l'arrêt : c'est voulu. Le réverbère, lui, n'y passe pas :
 * il reste devant la gare, à droite de l'horloge, hors de la rame.
 * Le faisceau du réverbère déborde sur le massif : il se construit à partir de
 * `x`, `pied` et `hauteur`.
 *
 * Convention : `x` est le centre de la pièce, sauf pour le bâtiment, où c'est
 * le bord gauche. `pied` est le `y` du sol de la pièce.
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
 * lisent le corps de la lanterne (`LANTERNE`) et le sommet du faisceau.
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
 * Il déplace le **bâtiment**, et avec lui l'horloge et la bordure (celle-ci
 * suit `DEBUT_GARE` / `FIN_GARE`) : leurs abscisses sont écrites à la place
 * d'origine (gare entière à droite du nez de la loco), moins ce décalage.
 * **Il ne déplace plus le réverbère** : celui-ci a une abscisse littérale
 * (`PIECES.reverbere.x`), parce que le décalage de la gare, qui sert à placer
 * l'horloge, ne doit pas entraîner la lampe avec lui — l'ancienne soustraction
 * l'aurait ramenée dans la rame au prochain réglage. Changer ce nombre, c'est
 * donc revérifier que l'horloge est au milieu de la scène, et que les deux
 * disques de lumière se tiennent à l'écart (`quai.test.ts` le fait).
 *
 * **Mesure, pour qui voudra la déplacer ou remplacer l'asset.** Le cadre de
 * 2320 est rogné par la fenêtre dès qu'elle est plus étroite que 2320:1217
 * (1,906). Bande visible (`fitStage`, cover), en pixels de cadre : 0 à 2320 à
 * 2560×1080 ; 78 à 2242 à 1920×1080 ; 186 à 2134 à 1440×900 ; 192 à 2128 à
 * 1432×900 ; 349 à 1971 à 1280×960 et 1024×768. La bande commune à tous ces
 * formats (2560×1080 à 1024×768) va donc de **349 à 1971, soit environ
 * 1622 px**. La gare en occupe environ 1386 (de `DEBUT_GARE` à `FIN_GARE`) :
 * elle pourrait y entrer, mais **à l'époque** (réglage à 360, réverbère encore
 * lié à la gare) elle passait presque entière derrière la rame : la locomotive
 * mangeait le flanc du bâtiment, le réverbère tenait sur la cabine, la marquise
 * disparaissait. C'est l'histoire d'un réglage antérieur, qui ne décrit plus la
 * scène : à 626 le réverbère est découplé et reste devant le corps de gare. La
 * propriétaire préférait déjà le rognage : **le bord droit de la gare sort de la
 * bande commune, à dessein.** Un portrait de téléphone ne montre que ~560 px (879 à 1441).
 *
 * **626, parce que c'est la valeur qui amène l'horloge au centre du cadre**
 * (`HORLOGE.x` = 1160,37 pour un centre à 1160), et non un goût : la scène
 * fait 2320 de large, l'horloge est le point qu'on veut voir sur tous les
 * écrans, et la bande d'un portrait de téléphone (879 à 1441) l'encadre alors.
 * Le bord droit de la gare, lui, reste hors de la bande commune : il tombe à
 * 2064 (`FIN_GARE`) et le rognage de la marquise de droite est assumé.
 *
 * (Les mesures de bande ci-dessus restent vraies, mais le récit du réglage à
 * 360 est celui d'une configuration disparue : voir plus haut.) 60 fut la valeur du réglage 1, 600 un
 * essai à la main, 626 la valeur tenue.
 */
export const DECALAGE_GARE = 626

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
  // `hauteur` est la hauteur **posée** (400, réglée à l'œil le 21 novembre) ; le
  // dessin reste mesuré dans `CADRES.reverbere`, et lanterne et sommet du
  // faisceau en suivent l'échelle (`hauteur / CADRES…`).
  //
  // **1390 est écrit en clair, et c'est la décision** : le réverbère ne dérive
  // plus de `DECALAGE_GARE`. Il se posait en lui soustrayant ce décalage et suivait
  // la gare ; or la gare est maintenant calée sur l'horloge, au milieu de la
  // scène, et la lampe se tient devant elle, à droite du cadran. Garder la
  // soustraction la ferait bouger à chaque réglage de la gare, jusque dans la
  // rame (nez de la loco à 1299) — `quai.test.ts` garde cette marge, et celle
  // qui la sépare de l'horloge.
  reverbere: { x: 1390, pied: HORIZON, hauteur: 400 },
  batiment: {
    x: BORD_DROIT_CORPS - CORPS_IMAGE.x1 * ECHELLE_BATIMENT - DECALAGE_GARE,
    pied: HORIZON,
    largeur: LARGEUR_BATIMENT,
    hauteur: 500,
  },
  quai: { y: HORIZON - 24, epaisseur: 24 },
} as const

/** Le corps de gare, en pixels de cadre : ce que vise l'horloge. */
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
 * Le halo de l'horloge : rayon en fractions du rayon du cadran, et opacité
 * d'une nappe. Il remplace les deux cercles de points de l'ancien dessin, qui
 * se lisaient comme un anneau et non comme un halo. **Le réglage de la
 * luminosité de l'horloge, c'est `alpha`** ; `nappes`, comme pour le cône du
 * faisceau (`Faisceau.ts`), n'est que la finesse du dégradé. PROVISOIRE (§7).
 */
export const HALO_HORLOGE = { rayon: 2.4, nappes: 48, alpha: 0.023 } as const

/**
 * Demi-largeur de l'embase du réverbère, pour que la gare ait un bord gauche :
 * la largeur de son cadre, à l'échelle où il est posé (`hauteur / hauteur`).
 */
const DEMI_EMBASE =
  (CADRES.reverbere.largeur / 2) * (PIECES.reverbere.hauteur / CADRES.reverbere.hauteur)

/**
 * Le corps vitré de la lanterne, en unités du cadre du réverbère —
 * **miroir du dessin**, à tenir à jour avec lui (même parti que
 * `CORPS_IMAGE`).
 *
 * Le dessin de la propriétaire **garde le verre en creux** : `vider_le_verre`
 * y retire la masse et ne laisse que les meneaux, exactement comme le pignon
 * de la gare garde son trou d'horloge. C'est la raison d'être de ce trapèze :
 * une masse noire à cet endroit serait rendue à la couleur du fond par le
 * shader, et le lampadaire serait éteint.
 *
 * Il est posé **en retrait** du trait de la lanterne, qui est galbé là où le
 * trapèze est droit : il vaut mieux laisser paraître un filet de lueur au bord
 * du verre que déborder du dessin.
 *
 * Il vit ici, avec la géométrie, et non dans `QuaiLayer.ts` qui le trace :
 * `cibleReverbere` a besoin de `hautY` pour savoir où commence la lampe, et
 * un second 110 écrit à la main se serait désaccordé du dessin au premier
 * réglage.
 */
export const LANTERNE = { hautY: 110, basY: 165, hautDemi: 31, basDemi: 14, cx: 40 } as const

/**
 * Ce qu'un doigt exige, en pixels d'écran (WCAG 2.5.5). C'est le même nombre
 * que la cible du bandeau dans `PanneauDeparts.vue`.
 */
const CIBLE_ECRAN = 44

/**
 * Un pixel de cadre de rab sur la largeur de la cible. Une cible posée
 * **exactement** sur les 44 px y tombe au premier flottant — `44 / e * e` rend
 * 43,999999999999872 à l'échelle de 1512 — et un plancher d'accessibilité ne
 * doit pas dépendre de l'arrondi. Un pixel de cadre vaut moins d'un pixel
 * d'écran à toutes les échelles qui nous concernent : il ne coûte rien.
 */
const MARGE_FLOTTANT = 1

/** Le haut de la cible : le haut du corps vitré. Il ne dépend pas de l'échelle. */
const CIBLE_Y0 =
  PIECES.reverbere.pied -
  PIECES.reverbere.hauteur +
  (LANTERNE.hautY * PIECES.reverbere.hauteur) / CADRES.reverbere.hauteur

/** Le bas de la cible : le rail. */
const CIBLE_Y1 = PIECES.reverbere.pied

/** La cible du réverbère, en pixels de cadre. */
export type CibleReverbere = { x0: number; x1: number; y0: number; y1: number }

/**
 * La cible du réverbère à cette échelle de cadre, **à la place d'arrêt** : ce
 * qu'un clic doit toucher pour éteindre la lampe, et la boîte où
 * `CommandeReverbere.vue` pose son bouton. Les deux l'appellent, avec la même
 * échelle, pour que la souris et le clavier visent exactement la même chose.
 *
 * En x : l'emprise du réverbère, qui ne fait que 57,1 px de cadre — 37 px
 * d'écran à 1512, 21 px sur un téléphone en paysage —, **élargie pour tenir
 * `CIBLE_ECRAN` px d'écran à toute échelle**. C'est un plancher
 * d'accessibilité, pas un réglage : une cible de cadre à taille fixe tombe
 * sous les 44 px dès que la scène se réduit. Comme la largeur demandée est en
 * pixels d'**écran**, la demi-largeur en pixels de cadre vaut
 * `CIBLE_ECRAN / échelle / 2` — c'est tout ce que l'échelle sert à faire ici.
 *
 * L'élargissement peut mordre sur le nez de la loco (1299,2) aux très petites
 * échelles, et c'est sans conséquence : la rame ne se clique pas, et la cible
 * est invisible. L'horloge, elle, est consultée **avant** dans `clicPx` : même
 * si les deux se touchaient un jour, elle garderait son clic.
 *
 * En y : du haut de la lanterne au rail, à toute échelle. Au-dessus il n'y a
 * que le toit de la lampe, qui n'éclaire rien ; au-dessous, le quai.
 *
 * **Elle suppose la gare à quai**, comme `horlogeTouchee` : hors de l'arrêt,
 * c'est à l'appelant de retrancher l'abscisse de l'île — `Quai.reverbereTouche`
 * le fait, parce que c'est le quai qui la connaît.
 */
export function cibleReverbere(echelle: number): CibleReverbere {
  // Une échelle nulle ou absurde rendrait un rectangle infini : `fitStage` n'en
  // produit jamais, mais une cible qui couvre la scène entière est le genre de
  // chose qu'on ne veut pas découvrir en production.
  const e = Number.isFinite(echelle) && echelle > 0 ? echelle : 1
  const demi = Math.max(DEMI_EMBASE, (CIBLE_ECRAN / e + MARGE_FLOTTANT) / 2)
  return {
    x0: PIECES.reverbere.x - demi,
    x1: PIECES.reverbere.x + demi,
    y0: CIBLE_Y0,
    y1: CIBLE_Y1,
  }
}

/** Le point `(x, y)`, en pixels de cadre, est-il sur le réverbère à quai ? */
export function reverbereTouche(x: number, y: number, echelle: number): boolean {
  const c = cibleReverbere(echelle)
  return x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1
}

const bords = [PIECES.reverbere.x - DEMI_EMBASE, PIECES.batiment.x]
const fins = [
  PIECES.reverbere.x + DEMI_EMBASE,
  // La marquise de droite dépasse le cadre : l'emprise la compte quand même,
  // sans quoi la gare serait réputée sortie du champ alors qu'elle rentre
  // encore par la gauche.
  PIECES.batiment.x + PIECES.batiment.largeur,
]

/** Le bord gauche de la gare, en pixels de cadre, à l'arrêt. */
export const DEBUT_GARE: number = Math.min(...bords)

/** Le bord droit de la gare, en pixels de cadre, à l'arrêt. */
export const FIN_GARE: number = Math.max(...fins)

/** Largeur totale occupée par la gare, en pixels de cadre. */
export const LARGEUR_GARE: number = FIN_GARE - DEBUT_GARE
