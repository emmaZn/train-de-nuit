import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CADRES,
  DEBUT_GARE,
  FIN_GARE,
  CORPS,
  CORPS_IMAGE,
  IMAGES,
  PIECES,
  HALO_HORLOGE,
  HORLOGE,
  LARGEUR_GARE,
} from '@/scene/quai'
import { lirePngIndexe } from './png'
import { RECUL_HORS_CHAMP, solParEtape } from '@/scene/cables'
import { HORIZON, STAGE, TETE_LOCO } from '@/scene/layout'

describe('la géométrie du quai', () => {
  it('la gare sort du champ avant que la suivante entre', () => {
    const recul = RECUL_HORS_CHAMP * solParEtape(false, false)
    expect(recul).toBeGreaterThan(STAGE.width + LARGEUR_GARE)
  })

  it('toutes les pièces posent leur pied sur ou sous la ligne de rail', () => {
    for (const piece of Object.values(PIECES)) {
      if ('pied' in piece) expect(piece.pied).toBeGreaterThanOrEqual(HORIZON - 1)
    }
  })

  /**
   * Le panneau des départs a quitté le mur : c'est un rideau suspendu, que
   * `rideau.ts` pose sur la scène et non sur la gare. La gare n'a donc plus
   * d'autre emprise que celle de son bâtiment (et du réverbère, qui est dedans).
   */
  it('la gare ne porte plus le panneau : son emprise est celle du bâtiment', () => {
    expect('panneau' in PIECES).toBe(false)
    const b = PIECES.batiment
    expect(FIN_GARE).toBe(b.x + b.largeur)
    expect(DEBUT_GARE).toBe(b.x)
  })

  /**
   * Ce test affirmait « rien ne se cache derrière le nez de la loco ». La
   * propriétaire a levé cette contrainte : la gare peut passer derrière la rame,
   * c'est voulu. On n'affirme donc plus où elle s'arrête, mais ce qui reste
   * vrai : le réverbère se tient **devant** le bâtiment, dans son emprise.
   *
   * Le banc et la valise y figuraient aussi : ils ne sont plus posés (`quai.ts`).
   */
  it('le bâtiment passe derrière le réverbère', () => {
    const b = PIECES.batiment
    const embase = CADRES.reverbere.largeur / 2
    expect(PIECES.reverbere.x - embase).toBeGreaterThan(b.x)
    expect(PIECES.reverbere.x + embase).toBeLessThan(b.x + b.largeur)
  })

  /**
   * Le second dessin porte une marquise de **chaque** côté de son corps. On ne
   * peut plus demander au bâtiment de tenir dans le cadre : la propriétaire a
   * tranché que la marquise de droite en sorte, et qu'on la découvre en marche
   * vers « ici » (20 novembre 2026). Ce qui doit tenir, c'est le **corps de
   * gare** — et le bord gauche, par où la gare arrive.
   */
  it('le corps de gare reste dans le cadre, la marquise de droite en sort', () => {
    expect(CORPS.x0).toBeGreaterThanOrEqual(0)
    expect(CORPS.x1).toBeLessThanOrEqual(STAGE.width)
    expect(DEBUT_GARE).toBeGreaterThanOrEqual(0)
    // On n'exige **pas** que le bâtiment dépasse : elle a permis qu'il sorte,
    // elle ne l'a pas demandé. Le ramener dans le cadre (par `DECALAGE_GARE`)
    // ne doit pas faire tomber ce test.
  })

  /**
   * L'ancien test disait « la porte est sous l'horloge » : les deux étaient
   * relevées sur le dessin, et leur accord disait que notre horloge s'était
   * bien posée dans le trou du dessinateur. Le second dessin n'a ni porte ni
   * horloge : c'est nous qui choisissons la place (`HORLOGE_IMAGE`), et il n'y
   * a plus de second repère à confronter.
   *
   * Ce qui reste vérifiable ici, c'est que la place choisie est bien dans le
   * pignon : au-dessus du corps de gare, dans sa moitié haute. Que rien n'y
   * soit dessiné se vérifie sur les pixels, dans `QuaiLayer.test.ts`.
   */
  it('l’horloge se pose dans le pignon, au-dessus du corps de gare', () => {
    const b = PIECES.batiment
    expect(HORLOGE.x - HORLOGE.rayon).toBeGreaterThan(CORPS.x0)
    expect(HORLOGE.x + HORLOGE.rayon).toBeLessThan(CORPS.x1)
    expect(HORLOGE.y + HORLOGE.rayon).toBeLessThan(b.pied - b.hauteur / 2)
    expect(HORLOGE.y - HORLOGE.rayon).toBeGreaterThan(b.pied - b.hauteur)
  })

  /**
   * Le piège que le second dessin a ouvert, et la raison d'être de
   * `BORD_DROIT_CORPS` : le cadran tombé sur le mât du réverbère, deux lumières
   * l'une dans l'autre. La gare au milieu a retourné l'ordre — le réverbère est
   * maintenant **à droite** de l'horloge, devant la gare — d'où la valeur
   * absolue : l'écart se mesure dans un sens comme dans l'autre. Ce qui ne doit
   * pas se toucher, ce sont les deux disques : le halo de l'horloge (plus large
   * que son cadran) et l'embase du réverbère.
   */
  it('les deux disques de lumière ne se touchent pas', () => {
    const halo = HORLOGE.rayon * HALO_HORLOGE.rayon
    const embase = CADRES.reverbere.largeur / 2
    const ecart = Math.abs(HORLOGE.x - PIECES.reverbere.x) - halo - embase
    expect(ecart).toBeGreaterThan(0)
  })

  /**
   * Tolérance 0 (à moins de 0,5 px) : l'horloge tombe à 1160,37 pour un centre
   * de scène à 1160, parce que `DECALAGE_GARE` est un entier choisi à l'œil.
   */
  it('l’horloge est au milieu de la scène', () => {
    expect(HORLOGE.x).toBeCloseTo(STAGE.width / 2, 0)
  })

  /**
   * Le réverbère est posé sur une abscisse littérale, découplée de la gare : ce
   * test garde qu'il ne rentre pas dans la rame, quel que soit le prochain
   * réglage de `DECALAGE_GARE`. Le bord gauche de son embase doit rester au-delà
   * du nez de la locomotive.
   */
  it('le réverbère est dégagé du nez de la locomotive', () => {
    const demiEmbase =
      (CADRES.reverbere.largeur / 2) * (PIECES.reverbere.hauteur / CADRES.reverbere.hauteur)
    expect(PIECES.reverbere.x - demiEmbase).toBeGreaterThan(STAGE.width * TETE_LOCO)
  })

  /**
   * Une pièce posée à un autre rapport que son dessin l'**étire** — la porte
   * cintrée devient un ovale, l'horloge une ellipse. Élargir une pièce sans
   * refaire son dessin ne doit donc pas passer en silence.
   *
   * Le banc et la valise sont des SVG : leur cadre est leur `viewBox`, aux
   * deux dimensions près, parce que `fabriquerPiece` rasterise à cette
   * échelle. Le bâtiment et le réverbère sont des images déjà grainées : seul
   * leur **rapport** doit suivre, leur cadre restant à l'échelle du cadre (en
   * unités de laquelle se lisent `LUEUR.rayon` et le sommet du faisceau).
   */
  it('chaque pièce en SVG garde le cadre de son dessin', () => {
    for (const nom of ['banc', 'valise'] as const) {
      const cadre = CADRES[nom]
      const svg = readFileSync(`public/assets/ailleurs/${nom}.svg`, 'utf8')
      const vue = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
      expect(vue, `${nom}.svg : viewBox introuvable`).not.toBeNull()
      expect(Number(vue![1]), `${nom}.svg : largeur du viewBox`).toBeCloseTo(cadre.largeur, 3)
      expect(Number(vue![2]), `${nom}.svg : hauteur du viewBox`).toBeCloseTo(cadre.hauteur, 3)
    }
  })

  it('chaque pièce en image garde le rapport de son dessin', () => {
    for (const nom of ['batiment', 'reverbere'] as const) {
      const png = lirePngIndexe(readFileSync(`public/assets/ailleurs/${nom}.png`))
      expect(png.largeur, `${nom}.png : largeur`).toBe(IMAGES[nom].largeur)
      expect(png.hauteur, `${nom}.png : hauteur`).toBe(IMAGES[nom].hauteur)
      expect(CADRES[nom].hauteur / CADRES[nom].largeur, `${nom} : rapport du cadre`).toBeCloseTo(
        png.hauteur / png.largeur,
        4,
      )
    }
  })

  /**
   * `CORPS_IMAGE` est relevé **à la main** sur le dessin, et il porte tout :
   * la place de l'horloge en dérive. C'était la seule
   * cote de ce fichier que rien ne refaisait — `IMAGES` est confronté à
   * l'en-tête du PNG, `HORLOGE_IMAGE` à ses pixels, `CADRES` à son rapport.
   *
   * Un dessin v3, ou un simple regrainage qui déplace la silhouette, laisserait
   * la suite **entièrement verte** en décalant le bâtiment et en ramenant le
   * cadran vers le mât du réverbère — exactement le piège que la docstring de
   * `BORD_DROIT_CORPS` raconte avoir attrapé une fois. Ce test refait la
   * mesure : les colonnes dont le dessin occupe plus de 45 % de la hauteur, et
   * la plus longue plage contiguë qu'elles forment.
   */
  it('le corps de gare est bien là où le dessin le met', () => {
    const png = lirePngIndexe(readFileSync('public/assets/ailleurs/batiment.png'))
    const hautes: number[] = []
    for (let c = 0; c < png.largeur; c += 1) {
      let dessin = 0
      for (let l = 0; l < png.hauteur; l += 1) if (png.index[l * png.largeur + c] !== 0) dessin += 1
      if (dessin > 0.45 * png.hauteur) hautes.push(c)
    }
    expect(hautes.length, 'aucune colonne pleine : le dessin a changé de nature').toBeGreaterThan(0)
    let [debut, fin, meilleur] = [hautes[0], hautes[0], [hautes[0], hautes[0]]]
    for (const c of hautes.slice(1)) {
      if (c === fin + 1) fin = c
      else [debut, fin] = [c, c]
      if (fin - debut >= meilleur[1] - meilleur[0]) meilleur = [debut, fin]
    }
    // `x0` et `x1` sont la première et la **dernière** colonne du corps, bornes comprises.
    expect([meilleur[0], meilleur[1]]).toEqual([CORPS_IMAGE.x0, CORPS_IMAGE.x1])
  })

  it('le bâtiment occupe son cadre sans l’étirer', () => {
    expect(PIECES.batiment.hauteur / PIECES.batiment.largeur).toBeCloseTo(
      CADRES.batiment.hauteur / CADRES.batiment.largeur,
      6,
    )
  })

  it('le réverbère occupe son cadre sans l’étirer', () => {
    // `PIECES.reverbere` ne porte qu'une hauteur : la largeur posée se déduit,
    // et elle peut se déduire de deux côtés. Par l'image (108 × 756, lue dans
    // l'en-tête du PNG par le test d'au-dessus) et par le cadre (80 × 560, où
    // se lisent lanterne, lueur et faisceau) : deux littéraux indépendants, qui
    // doivent s'accorder sur ce que fait le lampadaire à l'écran. Réduire la
    // pièce (`hauteur`) sans toucher à l'un des deux ne les sépare pas ; changer
    // l'un sans l'autre, si.
    const h = PIECES.reverbere.hauteur
    const parLImage = (h * IMAGES.reverbere.largeur) / IMAGES.reverbere.hauteur
    const parLeCadre = (CADRES.reverbere.largeur * h) / CADRES.reverbere.hauteur
    expect(parLImage).toBeCloseTo(parLeCadre, 6)
  })

  /**
   * L'emprise sert au test du hors-champ. C'est la marquise de droite qui la
   * finit, et elle sort du cadre — si l'emprise ne la comptait pas, la gare
   * serait réputée partie alors qu'on en voit encore le toit, et la suivante
   * entrerait par-dessus.
   */
  it('l’emprise de la gare couvre tout, marquise de droite comprise', () => {
    const b = PIECES.batiment
    expect(FIN_GARE).toBe(b.x + b.largeur)
    expect(DEBUT_GARE).toBe(b.x)
    expect(DEBUT_GARE).toBeLessThanOrEqual(PIECES.reverbere.x)
    expect(FIN_GARE - DEBUT_GARE).toBeCloseTo(LARGEUR_GARE, 6)
  })
})
