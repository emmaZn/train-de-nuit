import { readFileSync } from 'node:fs'

import { CRETE, CRETE_BIN } from '@/scene/crete'
import { GARES } from '@/stores/voyage'

import {
  ANCRE_FRISE,
  HAUTEUR_FRISE,
  HAUT_VOIE,
  CIEL_SOMMET,
  MONDE,
  MONDE_CIEL_MASSIF,
  PLANCHER_REFLET,
  descenteDuFormat,
  massifDuFormat,
  reculDuFormat,
  teteDuFormat,
  CADRAGE_PAYSAGE,
  CADRAGE_PORTRAIT,
  TETE_LOCO_MAX,
  cadrageCiel,
  versCadre,
  cadrageScene,
  cretePx,
  hautDuVoilePx,
  regionCiel,
  ANCRE_FRISE_MOBILE,
  DEGRADE_HAUTEUR,
  DUREE_ETAPE,
  MARGE_FRISE,
  MARGE_VOIE,
  MARGE_FRISE_MOBILE,
  ecartFrise,
  LARGEUR_LIBELLE_MOBILE,
  garesVisibles,
  DEGRADE_OPACITE,
  ECHELLE_MASSIF,
  ECHELLE_MONTAGNES,
  HORIZON,
  MOUNTAIN_SOURCE,
  ORTHO,
  SEUIL_MOBILE,
  STAGE,
  SWEEP_LEGS,
  bornesFenetre,
  cadreDegrade,
  cadreMontagnes,
  fenetreVisible,
  fitStage,
  fonduFrise,
  margeVoie,
  margeVoieDroite,
  toursMassif,
} from '@/scene/layout'

test('le cadre de la scène est celui que partagent les assets du train', () => {
  expect(STAGE).toEqual({ width: 2320, height: 1217 })
})

// Review Focus #5 : viewport minuscule, redimensionnement, rotation mobile
test.each([
  [360, 400],
  [1, 1],
  [3840, 2160],
  [0, 0],
])('fitStage(%i, %i) donne une échelle finie et positive', (w, h) => {
  const frame = fitStage(w, h)
  expect(frame.scale).toBeGreaterThan(0)
  expect(Number.isFinite(frame.scale)).toBe(true)
  expect(Number.isFinite(frame.offsetX)).toBe(true)
  expect(Number.isFinite(frame.offsetY)).toBe(true)
})

/**
 * L'anti-but du cadrage, écrit.
 *
 * Le plateau ne couvre plus le viewport : depuis le 24 novembre 2026 la scène
 * recule, et c'est voulu — on veut voir le train entier sur un téléphone, et
 * de l'air autour sur un écran. Ce qui doit couvrir le viewport, c'est le
 * **monde** : la bande où la voie, la terre, le massif et le ciel ont le droit
 * de continuer. Si un seul format y échoue, un plan s'arrête à l'écran, et
 * c'est le seul défaut qu'Emmanuelle ait interdit en toutes lettres.
 */
const FENETRES = [
  [360, 800],
  [412, 915],
  [768, 1024],
  [915, 412],
  [1280, 720],
  [1480, 690],
  [1512, 860],
  [2560, 1080],
  [3440, 1440],
  [1, 1],
] as const

test.each(FENETRES)('le monde couvre le viewport, à %i × %i', (w, h) => {
  const { scale } = fitStage(w, h)
  expect(MONDE.width * scale).toBeGreaterThanOrEqual(w - 1e-6)
  expect(MONDE.height * scale).toBeGreaterThanOrEqual(h - 1e-6)
})

test('le plateau, lui, a le droit de ne plus couvrir : c’est le recul', () => {
  // 412 × 915, l'ancre portrait. Le recul y valait la moitié jusqu'au soir du
  // 25 novembre 2026, où Emmanuelle a jugé la scène **sur son téléphone** et
  // non plus sur un rendu à sa taille : « c'est vraiment trop petit, c'est
  // illisible ». Il vaut 0,72 depuis. Le test ne tient pas le chiffre, il
  // tient la règle : l'échelle est celle de la couverture, multipliée par le
  // recul de ce format, et le plateau ne couvre plus l'écran.
  const { scale } = fitStage(412, 915)
  expect(STAGE.height * scale).toBeLessThan(915)
  const couvre = Math.max(412 / STAGE.width, 915 / STAGE.height)
  expect(scale).toBeCloseTo(couvre * CADRAGE_PORTRAIT.recul, 6)
  expect(CADRAGE_PORTRAIT.recul).toBeLessThan(1)
})

test('le cadre est centré sur le viewport', () => {
  const { scale, offsetX } = fitStage(1440, 900)
  expect(offsetX).toBeCloseTo((1440 - STAGE.width * scale) / 2, 5)
})

// Le voile qui éteint le pied des montagnes pour détacher le train.
test('le voile s’arrête exactement sur la ligne de voie', () => {
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.y + v.height).toBe(HORIZON)
})

test('le voile couvre toute la largeur du monde', () => {
  // Du plateau seul, il laissait le pied du massif clair au-delà de l'ancien
  // bord : une couture verticale, juste là où l'on regarde.
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.x).toBe(MONDE.x)
  expect(v.width).toBe(MONDE.width)
})

test('le voile éteint le pied du massif, pas ses sommets', () => {
  const massif = cadreMontagnes(ECHELLE_MONTAGNES)
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.y).toBeGreaterThan(massif.y)
  expect(v.height).toBeLessThan(massif.height)
})

test('le voile reste dans le cadre', () => {
  const v = cadreDegrade(DEGRADE_HAUTEUR)
  expect(v.y).toBeGreaterThanOrEqual(0)
})

test('le voile s’efface vers le haut, il ne s’ouvre pas vers le bas', () => {
  // opacité pleine au ras de la voie, nulle en haut du voile
  expect(DEGRADE_OPACITE).toBeGreaterThan(0)
  expect(DEGRADE_OPACITE).toBeLessThanOrEqual(1)
})

// La frise étale ses gares sur la largeur : quatre sur un écran, deux sur un
// téléphone. L'écartement se calcule, il n'est plus une valeur en dur.
test('quatre gares sur un écran, deux sur un téléphone', () => {
  expect(garesVisibles(1440)).toBe(4)
  expect(garesVisibles(1024)).toBe(4)
  expect(garesVisibles(390)).toBe(2)
})

test('les quatre gares occupent la largeur, resserrées de cinq pour cent', () => {
  const l = 1280
  const e = ecartFrise(l, 4)
  expect(ANCRE_FRISE + 3 * e).toBeCloseTo(ANCRE_FRISE + (l - MARGE_FRISE - ANCRE_FRISE) * 0.95, 6)
})

/**
 * Le téléphone suivait le même étalement que le bureau — la largeur
 * disponible, resserrée de 5 %. Relevé sur trois téléphones le 23 novembre
 * 2026, il amputait la gare suivante : « PROCHAIN ARRÊT » finissait à 305 sur
 * un écran de 390 qui n'en montrait que 250.
 *
 * L'écart y est donc plafonné par la place qui reste avant le masque, et à
 * 390 px ce plafond **mord** : il est plus serré que l'étalement.
 */
test('sur un téléphone, l’écart est la place qui reste, pas l’étalement', () => {
  const l = 390
  const etale = (l - MARGE_FRISE_MOBILE - ANCRE_FRISE_MOBILE) * 0.95
  const place =
    l - margeVoieDroite(l) - fonduFrise(l) - ANCRE_FRISE_MOBILE - LARGEUR_LIBELLE_MOBILE
  expect(place).toBeLessThan(etale)
  expect(ecartFrise(l, 2)).toBeCloseTo(place, 6)
})

test('la première gare naît là où le masque est déjà opaque', () => {
  // La frise s'efface aux bords : transparente jusqu'à `margeVoie`, opaque
  // seulement `fonduFrise` plus loin. Une ancre posée avant cette limite fait
  // naître la première gare en plein fondu — « ici » à moitié effacé. Le fondu
  // de bureau est réglé pour une ancre de 120 px ; sur téléphone, où elle vaut
  // moins du quart, il doit se resserrer d'autant.
  for (const l of [390, 430, 360, 1280, 1512, 1920]) {
    const ancre = l < SEUIL_MOBILE ? ANCRE_FRISE_MOBILE : ANCRE_FRISE
    expect(margeVoie(l) + fonduFrise(l), `${l}px`).toBeLessThanOrEqual(ancre)
  }
})

test('le téléphone ne montre que la gare à quai et la suivante', () => {
  // CONCEPT §11 : « frise réduite (gare actuelle + prochaine) ». Rien ne
  // l'imposait : la frise est une piste qui glisse, et c'est l'écartement qui
  // décide combien de gares tombent dans la bande visible. Trop resserrer en
  // fait entrer une troisième, coupée par le fondu de droite. La troisième doit
  // donc naître au-delà du bord où le masque redevient transparent.
  for (const l of [320, 360, 390, 430]) {
    const troisieme = ANCRE_FRISE_MOBILE + 2 * ecartFrise(l, 2)
    expect(troisieme, `${l}px`).toBeGreaterThanOrEqual(l - margeVoieDroite(l))
  }
})

test('l’écartement grandit avec l’écran', () => {
  expect(ecartFrise(1920, 4)).toBeGreaterThan(ecartFrise(1280, 4))
})

// Review Focus #5 : un viewport minuscule ne doit pas tout faire s'effondrer
test.each([[320, 2], [1, 2], [0, 2]])('ecartFrise(%i) reste positif et fini', (l, v) => {
  const e = ecartFrise(l, v)
  expect(e).toBeGreaterThan(0)
  expect(Number.isFinite(e)).toBe(true)
})

test('une seule gare visible ne divise pas par zéro', () => {
  expect(Number.isFinite(ecartFrise(400, 1))).toBe(true)
})

// Le massif n'est plus une image mais un rendu : le canvas qui le porte ne
// couvre que ce qu'on voit, borné à la voie. Couvrir tout le cadre coûterait
// 4800 px de large sur un téléphone en portrait, au-delà de la taille de
// texture que beaucoup de GPU mobiles acceptent.
test('sur un écran au format du cadre, la fenêtre déborde le plateau', () => {
  // Elle le prenait tout entier, exactement, du temps où la scène le collait
  // à l'écran. Reculée, elle en montre autant et mord dans les marges.
  const frame = fitStage(2320, 1217)
  const f = fenetreVisible(frame, 2320, 1217)
  expect(f.x).toBeLessThan(0)
  expect(f.width).toBeGreaterThan(STAGE.width)
  expect(f.x).toBeGreaterThanOrEqual(MONDE.x)
})

test('la fenêtre s’arrête à la voie : le massif ne descend jamais plus bas', () => {
  const frame = fitStage(2320, 1217)
  const f = fenetreVisible(frame, 2320, 1217)
  expect(f.y + f.height).toBeCloseTo(HORIZON, 6)
})

test('en portrait, la fenêtre est bien plus étroite que le cadre', () => {
  const frame = fitStage(390, 844)
  const f = fenetreVisible(frame, 390, 844)
  expect(f.width).toBeLessThan(STAGE.width * 0.7)
  expect(f.width).toBeGreaterThan(0)
})

test('la fenêtre ne sort jamais du monde, quel que soit l’écran', () => {
  for (const [w, h] of FENETRES) {
    const f = fenetreVisible(fitStage(w, h), w, h)
    expect(f.x).toBeGreaterThanOrEqual(MONDE.x)
    expect(f.y).toBeGreaterThanOrEqual(-MONDE_CIEL_MASSIF)
    expect(f.x + f.width).toBeLessThanOrEqual(MONDE.x + MONDE.width + 1e-6)
    expect(f.y + f.height).toBeLessThanOrEqual(HORIZON + 1e-6)
    expect(f.width).toBeGreaterThan(0)
    expect(f.height).toBeGreaterThan(0)
  }
})

// Le frustum place le cadre Blender exactement là où la séquence était
// dessinée : on ne réinvente pas un cadrage, c'est ce qui avait désaligné le
// massif la dernière fois.
test('une fenêtre égale au cadre Blender redonne le frustum de Blender', () => {
  const c = cadreMontagnes(ECHELLE_MONTAGNES)
  const b = bornesFenetre(c, ECHELLE_MONTAGNES)
  const largeur = ORTHO / ECHELLE_MASSIF
  expect(b.right - b.left).toBeCloseTo(largeur, 6)
  expect(b.left).toBeCloseTo(-largeur / 2, 6)
  expect(b.top - b.bottom).toBeCloseTo((largeur * MOUNTAIN_SOURCE.height) / MOUNTAIN_SOURCE.width, 6)
})

test('une fenêtre deux fois plus large voit deux fois plus de scène', () => {
  const c = cadreMontagnes(ECHELLE_MONTAGNES)
  const etroit = bornesFenetre(c, ECHELLE_MONTAGNES)
  const large = bornesFenetre({ ...c, width: c.width * 2 }, ECHELLE_MONTAGNES)
  expect(large.right - large.left).toBeCloseTo((etroit.right - etroit.left) * 2, 6)
})

test('décaler la fenêtre vers la droite décale le frustum d’autant', () => {
  const c = cadreMontagnes(ECHELLE_MONTAGNES)
  const a = bornesFenetre(c, ECHELLE_MONTAGNES)
  const b = bornesFenetre({ ...c, x: c.x + 100 }, ECHELLE_MONTAGNES)
  const pas = (ORTHO / ECHELLE_MASSIF / c.width) * 100
  expect(b.left - a.left).toBeCloseTo(pas, 6)
  expect(b.right - a.right).toBeCloseTo(pas, 6)
})

// Le massif tourne à l'inverse de la marche : vu depuis un train qui va vers
// la droite, un relief lointain découvre peu à peu sa face gauche. Tourner
// dans l'autre sens donnerait un train qui recule — ce que CONCEPT.md §3
// interdit explicitement.
test('le massif tourne dans le sens inverse de la marche', () => {
  expect(toursMassif(1)).toBeLessThan(0)
  expect(toursMassif(4)).toBeLessThan(toursMassif(1))
})

test('à l’arrêt au départ, le massif est à son orientation d’origine', () => {
  expect(toursMassif(0)).toBeCloseTo(0, 12)
})

test('un tour complet demande SWEEP_LEGS étapes', () => {
  expect(Math.abs(toursMassif(SWEEP_LEGS))).toBeCloseTo(1, 6)
})

// « Lents, comme un souffle » (CONCEPT.md §6) : le massif met plusieurs tours
// de boucle à faire le sien, sinon il défile au lieu de se découvrir.
test('le massif met plusieurs boucles de train à faire un tour', () => {
  expect(SWEEP_LEGS / GARES.length).toBeGreaterThanOrEqual(2)
})

// Les deux réglages se multiplient : c'est leur produit qui donne la vitesse
// réellement vue. Le massif doit mettre plus d'une minute à faire son tour.
test('un tour de massif dure plus d’une minute', () => {
  expect(SWEEP_LEGS * DUREE_ETAPE).toBeGreaterThan(60)
})

// La voie s'arrête avant le bord de l'écran, mais jamais au point d'avaler
// l'ancre : un marqueur pris dans le fondu ne se verrait plus.
test('sur grand écran, la voie garde la marge demandée', () => {
  expect(margeVoie(1512)).toBe(MARGE_VOIE)
})

test('la marge ne mord jamais sur l’ancre', () => {
  for (const l of [320, 390, 600, 719, 720, 1024, 1512, 2560]) {
    const ancre = l < SEUIL_MOBILE ? ANCRE_FRISE_MOBILE : ANCRE_FRISE
    expect(margeVoie(l)).toBeLessThan(ancre)
    expect(margeVoie(l)).toBeGreaterThanOrEqual(0)
  }
})

test('sur téléphone, la marge se réduit au lieu de cacher le marqueur', () => {
  expect(margeVoie(390)).toBeLessThan(margeVoie(1512))
})

describe('la région libre du ciel', () => {
  test('là où il n’y a pas de massif, la région s’arrête au haut du voile', () => {
    expect(cretePx(2, 844, 390, 1.555, 26)).toBeCloseTo(hautDuVoilePx(844, 390, 26), 0)
  })

  test('la région ne descend jamais sous le haut du voile', () => {
    for (const x of [0, 200, 422, 700, 844]) {
      const r = regionCiel(x, 844, 390, 1.555, 26)
      expect(r.top + r.height).toBeLessThanOrEqual(hautDuVoilePx(844, 390, 26) + 0.5)
    }
  })

  test('une région écrasée garde une hauteur utilisable', () => {
    const r = regionCiel(400, 800, 200, 2.2, 0)
    expect(r.height).toBeGreaterThan(0)
    expect(Number.isFinite(r.height)).toBe(true)
  })

  test('la crête est brute : valeur absolue sur un bord de paquet, sans marge', () => {
    // Bord entre les paquets 26 et 27 : la crête y vaut min(386, 348) = 348.
    const [w, h, echelle, decalage] = [1512, 771, 2.153, 11]
    const frame = fitStage(w, h)
    const c = cadreMontagnes(echelle)
    const f = (STAGE.width / MOUNTAIN_SOURCE.width) * echelle
    const x = (c.x + 27 * CRETE_BIN * f) * frame.scale + frame.offsetX
    const attendu = (c.y + Math.min(CRETE[26], CRETE[27]) * f) * frame.scale + frame.offsetY + decalage
    expect(cretePx(x, w, h, echelle, decalage)).toBeCloseTo(attendu, 5)
  })

  test('la crête rendue ne descend jamais sous le minimum de son paquet', () => {
    for (const [w, h, echelle] of [[1512, 771, 2.153], [2560, 1440, 2.2], [1280, 800, 2.2]]) {
      const frame = fitStage(w, h)
      const c = cadreMontagnes(echelle)
      const f = (STAGE.width / MOUNTAIN_SOURCE.width) * echelle
      for (let x = 0; x <= w; x += 0.5) {
        const sx = ((x - frame.offsetX) / frame.scale - c.x) / f
        const i = Math.min(Math.max(Math.floor(sx / CRETE_BIN), 0), CRETE.length - 1)
        const borne = (c.y + CRETE[i] * f) * frame.scale + frame.offsetY
        expect(cretePx(x, w, h, echelle, 0)).toBeLessThanOrEqual(borne + 1e-6)
      }
    }
  })

  test('la crête varie en continu, sans marches', () => {
    let max = 0
    for (let x = 300; x < 1200; x++) {
      const d = Math.abs(cretePx(x + 1, 1512, 771, 2.153, 0) - cretePx(x, 1512, 771, 2.153, 0))
      max = Math.max(max, d)
    }
    expect(max).toBeLessThan(6)
  })

  test('le décalage descend la crête d’autant, en pixels d’écran', () => {
    const a = cretePx(756, 1512, 771, 2.153, 0)
    expect(cretePx(756, 1512, 771, 2.153, 30)).toBeCloseTo(a + 30, 5)
  })

  test('HAUTEUR_FRISE est la somme des deux morceaux de CSS qui la font', () => {
    const base = readFileSync('src/styles/base.css', 'utf8')
    const frise = readFileSync('src/components/NavFrise.vue', 'utf8')
    const voie = Number(/--haut-voie:\s*(\d+)px/.exec(base)?.[1])
    const marge = Number(/height:\s*calc\(var\(--haut-voie\)\s*\+\s*(\d+)px\)/.exec(frise)?.[1])
    expect(voie).toBe(HAUT_VOIE)
    expect(Number.isFinite(marge)).toBe(true)
    expect(voie + marge).toBe(HAUTEUR_FRISE)
  })
})

test('la frise fait 96 px', () => {
  expect(HAUTEUR_FRISE).toBe(96)
})

test('l’œil se pose sur la ligne de voie, pas au-dessus', async () => {
  // Il était centré dans la bande au-dessus de la voie ; cette bande passe de
  // 64 à 44 px et un bouton de 36 px n'y tient plus proprement.
  const css = (await import('@/components/EyeButton.vue?raw')).default
  expect(css).toMatch(/top:\s*calc\(var\(--haut-voie\)\s*-\s*18px\)/)
})

describe('la règle de dégagement', () => {
  const colonnes = (w: number): number[] => Array.from({ length: Math.ceil(w) + 1 }, (_, i) => i)

  // Depuis que la scène recule, la descente ne vaut plus deux chiffres selon
  // la largeur : elle suit le format, en fraction de la hauteur, entre les
  // deux ancres qu'Emmanuelle a tranchées sur rendus. Et comme la scène
  // reculée laisse bien plus de ciel qu'avant, le massif tient sa taille
  // pleine partout — rabotée seulement sur une fenêtre basse et large.
  //
  // Les écrans larges descendent de cinquante pixels de plus depuis que
  // l'ancre paysage est passée à 70 px et 1,25 (25 novembre 2026), et tout a
  // encore bougé le même soir quand l'ancre **portrait** a été reprise sur le
  // vrai téléphone : recul 0,72, descente 200 px, massif 1,02. Ces nombres se
  // recalculent, ils ne se choisissent pas — seules les deux ancres sont des
  // choix.
  test.each([
    [1512, 771, 84, 2.720],
    [1280, 800, 100, 2.662],
    [1440, 900, 113, 2.662],
    [1728, 1117, 142, 2.653],
    [390, 844, 147, 2.477],
    [844, 390, 40, 1.84],
  ])('cadrage de %ix%i', (w, h, decalage, echelle) => {
    const c = cadrageCiel(w, h)
    expect(c.decalage).toBeCloseTo(decalage, 0)
    expect(c.echelle).toBeCloseTo(echelle, 2)
  })

  test('les deux ancres d’Emmanuelle sont rendues exactement', () => {
    // Ce sont les deux seuls formats qu'elle ait jugés, sur des rendus à
    // taille d'appareil : 412 × 915 et 1480 × 690. Tout le reste du cadrage
    // n'est qu'une interpolation entre eux, et peut bouger ; ces deux-là non.
    expect(reculDuFormat(412, 915)).toBeCloseTo(0.72, 6)
    expect(massifDuFormat(412, 915)).toBeCloseTo(1.125, 6)
    expect(cadrageCiel(412, 915).decalage).toBeCloseTo(160, 0)

    expect(reculDuFormat(1480, 690)).toBeCloseTo(0.8, 6)
    expect(massifDuFormat(1480, 690)).toBeCloseTo(1.25, 6)
    expect(cadrageCiel(1480, 690).decalage).toBeCloseTo(70, 0)
  })

  test('le nez du train est à elle aussi, aux deux mêmes formats', () => {
    // Jugé le 25 novembre 2026, sur des planches où seul le nez changeait.
    // Le train recule dans les deux cas — il était à 0,56 partout — et recule
    // plus sur un écran large, où la queue de la rame rentrait dans le cadre.
    //
    // Le portrait est reparti de 0,53 à 0,546 puis à 0,562 le soir même, sur
    // le téléphone : « fais avancer le nez de la locomotive de 20 px », deux
    // fois. Vingt pixels d'écran à ce format valent 0,0159 de la largeur du
    // plateau. Au second pas, le nez a rattrapé la deuxième travée de câble —
    // à neuf centièmes de pixel près — et `POSITION_A_QUAI` a dû avancer avec
    // lui, comme son commentaire prévenait qu'il le faudrait.
    expect(teteDuFormat(412, 915)).toBeCloseTo(0.562, 6)
    expect(teteDuFormat(1480, 690)).toBeCloseTo(0.5, 6)
  })

  test('le nez ne sort jamais de ce que les deux ancres encadrent', () => {
    // Ce qui doit rester dégagé devant la rame — le réverbère, la deuxième
    // travée de câble — se vérifie contre `TETE_LOCO_MAX`. Encore faut-il
    // qu'aucun format n'aille au-delà : l'interpolation est bornée, et ce
    // test le tient pour des fenêtres bien plus extrêmes que les vraies.
    for (const [w, h] of [...FENETRES, [200, 2000], [4000, 300], [1, 1]] as const) {
      const t = teteDuFormat(w, h)
      expect(t, `${w}x${h}`).toBeLessThanOrEqual(TETE_LOCO_MAX + 1e-9)
      expect(t, `${w}x${h}`).toBeGreaterThanOrEqual(CADRAGE_PAYSAGE.tete - 1e-9)
    }
  })

  test('la descente s’ajoute au jeu vertical, et vaut plus en portrait', () => {
    // Le jeu de couverture est nul dès que la scène ne déborde plus : c'est
    // désormais le cas partout où elle recule, et le décalage vaut alors la
    // descente seule. La bande découverte en haut est du ciel, que la couche
    // d'écran remplit — c'est ce qui rend la manœuvre possible.
    for (const [w, h] of FENETRES) {
      const jeu = Math.max(0, -fitStage(w, h).offsetY)
      const permis = jeu + descenteDuFormat(w, h)
      expect(cadrageCiel(w, h).decalage, `${w}x${h}`).toBeLessThanOrEqual(permis + 1e-6)
    }
    // Un portrait descend beaucoup plus qu'un paysage, à hauteur égale.
    expect(descenteDuFormat(412, 915)).toBeGreaterThan(descenteDuFormat(915, 412) * 3)
  })

  test('le recul et la taille du massif sont continus avec le format', () => {
    // Un seuil ferait sauter le train de moitié au milieu d'un
    // redimensionnement. Il n'y en a pas : seulement une interpolation.
    for (let w = 320; w <= 2000; w += 7) {
      const a = reculDuFormat(w, 800)
      const b = reculDuFormat(w + 1, 800)
      expect(Math.abs(a - b), `${w}`).toBeLessThan(0.01)
      const m = massifDuFormat(w, 800)
      const n = massifDuFormat(w + 1, 800)
      expect(Math.abs(m - n), `${w}`).toBeLessThan(0.01)
    }
  })

  test('l’échelle est continue en hauteur de fenêtre', () => {
    for (const w of [360, 390, 600, 1000]) {
      for (let h = 300; h < 900; h += 1) {
        const a = cadrageCiel(w, h).echelle
        const b = cadrageCiel(w, h + 1).echelle
        expect(Math.abs(a - b), `${w}x${h}`).toBeLessThan(0.02)
      }
    }
  })

  test.each([
    [1512, 500],
    [1920, 700],
    [1280, 480],
    [915, 356],
    // Étroite et basse : c'est là que le plafond du reflet mord sur téléphone,
    // d'autant plus depuis que la descente du portrait demande 15 % de la hauteur.
    [360, 440],
  ])('les rails restent visibles sur une fenêtre serrée (%ix%i)', (w, h) => {
    const frame = fitStage(w, h)
    const { decalage } = cadrageCiel(w, h)
    const reflet = h - (HORIZON * frame.scale + frame.offsetY + decalage)
    expect(reflet).toBeGreaterThan(0)
    // the shift never eats into the floor: it stops where the reflection hits it
    const avant = h - (HORIZON * frame.scale + frame.offsetY)
    expect(decalage).toBeLessThanOrEqual(Math.max(0, avant - PLANCHER_REFLET) + 1e-6)
  })

  test('la cible de 60 px est tenue partout', () => {
    for (const [w, h] of [[1512, 771], [1280, 800], [1440, 900], [390, 844], [844, 390], [1024, 600]]) {
      const { decalage, echelle } = cadrageCiel(w, h)
      const sommet = Math.min(...colonnes(w).map((x) => cretePx(x, w, h, echelle, decalage)))
      expect(sommet - HAUTEUR_FRISE).toBeGreaterThanOrEqual(CIEL_SOMMET - 0.5)
    }
  })
})

test.each([
  [1512, 771],
  [844, 390],
  [1440, 900],
])('le cadre de la scène porte le décalage de cadrageCiel (%i x %i)', (w, h) => {
  const { frame, decalage } = cadrageScene(w, h)
  expect(decalage).toBe(cadrageCiel(w, h).decalage)
  expect(frame.offsetY).toBeCloseTo(fitStage(w, h).offsetY + decalage, 9)
  expect(frame.scale).toBe(fitStage(w, h).scale)
})

describe('versCadre', () => {
  it('ramène un pixel CSS dans le cadre de la scène', () => {
    const frame = { scale: 0.5, offsetX: 100, offsetY: 20 }
    expect(versCadre(100, 20, frame)).toEqual({ x: 0, y: 0 })
    expect(versCadre(200, 120, frame)).toEqual({ x: 200, y: 200 })
  })

  it('est l’inverse exact du placement du monde', () => {
    const frame = { scale: 0.37, offsetX: -12, offsetY: 44 }
    const cadre = { x: 1160, y: 921 }
    const ecran = { x: cadre.x * frame.scale + frame.offsetX, y: cadre.y * frame.scale + frame.offsetY }
    const retour = versCadre(ecran.x, ecran.y, frame)
    expect(retour.x).toBeCloseTo(cadre.x)
    expect(retour.y).toBeCloseTo(cadre.y)
  })
})

test('la voie s’arrête avant les deux commandes du coin, pas avant une seule', () => {
  // Depuis le 24 novembre 2026 le coin droit en porte deux : l'œil et le
  // sélecteur de langue. Chacun fait 36 px, il y a 14 px entre eux, et la voie
  // doit s'effacer 16 px avant la première — sinon elle passe sous l'œil, qui
  // s'est décalé pour laisser la place au sélecteur.
  const MARGE_ECRAN = 40 // `--marge-ecran`, dans `base.css`
  const COMMANDES = 36 + 14 + 36
  for (const l of [1024, 1280, 1512, 1920, 2560]) {
    const finVoie = l - margeVoieDroite(l)
    const debutCommandes = l - MARGE_ECRAN - COMMANDES
    expect(finVoie, `${l}px`).toBeLessThanOrEqual(debutCommandes - 16)
  }
})

test('les gares sont resserrées de cinq pour cent sur la largeur disponible', () => {
  // Emmanuelle, le 24 novembre 2026 : « tu peux resserrer très légèrement les
  // gares (5 % disons) ». La frise n'occupe donc plus exactement la largeur :
  // elle s'arrête un peu avant, et c'est voulu.
  // Le téléphone n'est plus dans cette liste : son écart est plafonné par la
  // place qui reste avant le masque, et ce plafond est plus serré que les
  // 5 %. Il a son propre test — « l'écart est la place qui reste ». Le
  // resserrement d'Emmanuelle reste la règle partout où il y a la place.
  for (const [l, visibles] of [[1280, 4], [1512, 4], [1920, 4]] as const) {
    const plein = (l - ANCRE_FRISE - MARGE_FRISE) / Math.max(1, visibles - 1)
    expect(ecartFrise(l, visibles), `${l}px`).toBeCloseTo(plein * 0.95, 5)
  }
})
