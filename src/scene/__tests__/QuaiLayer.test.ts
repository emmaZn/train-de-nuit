import { readFileSync } from 'node:fs'
import gsap from 'gsap'
import { Container } from 'pixi.js'
import { describe, expect, it, vi } from 'vitest'

import { loadTexture } from '@/scene/assets'
import { Quai, anglesHorloge } from '@/scene/QuaiLayer'
import { appliquerNuit, plansDuDecor } from '@/scene/Scene'
import { solParEtape } from '@/scene/cables'
import { HALO_HORLOGE, HORLOGE, HORLOGE_IMAGE } from '@/scene/quai'
import { lirePngIndexe } from './png'
import { DUREE_ETAPE, STAGE } from '@/scene/layout'

vi.mock('@/scene/poses', async (importOriginal) => {
  const vrai = await importOriginal<typeof import('@/scene/poses')>()
  return { ...vrai, fabriquerPiece: vi.fn() }
})

/**
 * Le bâtiment et le réverbère sont des images, chargées par `Assets`. Sous
 * jsdom il n'y a personne pour décoder un PNG : sans ce mock, les deux pièces
 * manqueraient à chaque montage et les tests de la couche compteraient faux.
 * Chaque appel rend une texture **neuve** : `Texture.EMPTY` est le singleton de
 * Pixi, partagé par tout le worker, et `charger()` écrit sur sa source
 * (`scaleMode`). Elle n'est jamais détruite par `Quai`, qui ne détruit pas
 * les textures qui ne sont pas les siennes ; on la jette ici avec le test.
 */
vi.mock('@/scene/assets', async (importOriginal) => {
  const vrai = await importOriginal<typeof import('@/scene/assets')>()
  const { Texture, TextureSource } = await import('pixi.js')
  const neuve = () => new Texture({ source: new TextureSource({ width: 4, height: 4 }) })
  return { ...vrai, loadTexture: vi.fn(async () => neuve()) }
})

/** Le quai monté là où la scène le monte : décor éteint au fond, lumières à part. */
function poser() {
  const decor = new Container()
  const plans = plansDuDecor(decor)
  const planQuai = new Container()
  plans.plateauFond.addChild(planQuai)
  const quai = new Quai(planQuai, plans.lumieres)
  return { decor, plans, quai }
}

/** La chaîne des ancêtres d'un nœud, lui compris. */
function ancetres(noeud: Container): Container[] {
  const chaine: Container[] = []
  for (let n: Container | null = noeud; n; n = n.parent) chaine.push(n)
  return chaine
}

/**
 * La clarté qu'un nœud garde, teintes des ancêtres comprises : 1 = intact.
 *
 * C'est ce qui a remplacé le compte des filtres au-dessus de lui. Une lumière
 * est désormais une branche que la nuit ne teint pas — ni elle, ni aucun de
 * ses ancêtres, puisque sous Pixi v8 la teinte se multiplie en descendant.
 */
function clarte(noeud: Container): number {
  return (noeud.getGlobalTint() & 0xff) / 255
}

/**
 * Combien d'ancêtres portent un filtre. Zéro partout depuis la teinte : ce qui
 * se garde ici, c'est qu'on n'en remette pas un sur le chemin d'une lumière —
 * un filtre rendrait son groupe dans une cible intermédiaire, et la passe
 * plein écran qu'on vient de retirer reviendrait avec lui.
 */
function filtresAuDessus(noeud: Container): number {
  return ancetres(noeud).filter((n) => {
    const f = n.filters as unknown
    return Array.isArray(f) ? f.length > 0 : Boolean(f)
  }).length
}

/** Le sol restant, image par image, sur une étape qui passe sans s'arrêter. */
function distancesDUneEtape(): number[] {
  const sol = solParEtape(false, false)
  const images = Math.round(DUREE_ETAPE * 60)
  return Array.from({ length: images + 1 }, (_, i) => sol * (1 - i / images))
}

function stubFetchEnEchec(piece: string): () => void {
  const original = globalThis.fetch
  globalThis.fetch = (async (url: RequestInfo | URL) =>
    String(url).includes(piece)
      ? new Response('', { status: 404 })
      : new Response('<svg viewBox="0 0 10 10"></svg>', { status: 200 })) as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

describe('les plans du quai dans le décor', () => {
  /**
   * Le test du brief visait un `voile-nuit` qui n'existe plus : depuis
   * `b8a5627` l'assombrissement a cessé d'être un rectangle plein cadre, et
   * depuis la teinte il n'est même plus un filtre. Ce qui se vérifie à la
   * place, c'est la règle des lumières elle-même : une lumière est une branche
   * que la nuit ne teint pas, ni elle ni aucun de ses ancêtres.
   */
  it('les lumières du quai ne sont teintées par aucun de leurs ancêtres', () => {
    const { plans, quai } = poser()
    appliquerNuit(plans, 1)
    expect(clarte(quai.allume)).toBe(1)
    expect(filtresAuDessus(quai.allume)).toBe(0)
  })

  it('le décor éteint du quai descend bien avec la nuit', () => {
    const { plans, quai } = poser()
    appliquerNuit(plans, 1)
    expect(clarte(quai.eteint)).toBeLessThan(1)
    expect(ancetres(quai.eteint)).toContain(plans.plateauFond)
  })

  /**
   * « Hors des branches teintées » ne suffit pas : monté après le plateau, le
   * réverbère passerait **devant la rame**. Le quai est derrière elle par
   * construction — c'est la prémisse du test « aucune pièce n'est cachée
   * derrière la rame » de `quai.test.ts`. Les lumières sont donc entre le fond
   * du plateau et la rame.
   */
  it('les lumières passent devant le voile du pied et derrière la rame', () => {
    const decor = new Container()
    const p = plansDuDecor(decor)
    const rang = (n: Container) => decor.getChildIndex(n)
    expect(rang(p.massif)).toBeLessThan(rang(p.ciel))
    expect(rang(p.ciel)).toBeLessThan(rang(p.plateauFond))
    expect(rang(p.plateauFond)).toBeLessThan(rang(p.lumieres))
    expect(rang(p.lumieres)).toBeLessThan(rang(p.plateau))
  })

  it('la nuit éteint le fond du plateau comme le massif', () => {
    const decor = new Container()
    const p = plansDuDecor(decor)
    appliquerNuit(p, 1)
    expect(clarte(p.plateauFond)).toBeLessThan(1)
    expect(clarte(p.plateauFond)).toBe(clarte(p.massif))
    appliquerNuit(p, 0)
    expect(clarte(p.plateauFond)).toBe(1)
  })

  it('la scène monte le quai au fond du plateau, avant la rame', () => {
    const source = readFileSync('src/scene/Scene.ts', 'utf8')
    const quai = source.indexOf('planQuai')
    const train = source.indexOf('monterLeTrain(this.plans')
    expect(quai).toBeGreaterThan(0)
    expect(train).toBeGreaterThan(0)
    expect(quai).toBeLessThan(train)
    expect(source).toContain('plateauFond.addChild(planQuai)')
  })
})

describe('l’horloge allumée', () => {
  /**
   * L'horloge est une des trois lumières de la gare : cadran, halo et
   * aiguilles sont dans la racine allumée, d'un seul tenant. Allumer les
   * aiguilles sur un cadran éteint serait laid.
   */
  it('est tout entière hors de toute teinte, et absente de la racine éteinte', () => {
    const { plans, quai } = poser()
    appliquerNuit(plans, 1)
    const h = quai.horloge
    expect(ancetres(h)).toContain(quai.allume)
    expect(clarte(h)).toBe(1)
    expect(ancetres(h)).not.toContain(quai.eteint)
  })

  it('porte le halo : son emprise dépasse le disque du cadran', () => {
    const { quai } = poser()
    const b = quai.horloge.getLocalBounds()
    // Le halo était deux cercles de points, à 43 et 50 sur 36 du rayon du
    // cadran ; depuis le réglage 3 c'est un dégradé en nappes, dont la plus
    // large porte à `HALO_HORLOGE.rayon`. C'est elle qui fixe l'emprise.
    const rayonHalo = HORLOGE.rayon * HALO_HORLOGE.rayon
    expect(b.minX).toBeLessThanOrEqual(HORLOGE.x - rayonHalo + 1)
    expect(b.maxX).toBeGreaterThanOrEqual(HORLOGE.x + rayonHalo - 1)
    expect(b.minY).toBeLessThanOrEqual(HORLOGE.y - rayonHalo + 1)
    expect(b.maxY).toBeGreaterThanOrEqual(HORLOGE.y + rayonHalo - 1)
  })

  /**
   * Le piège du double dessin, pour la troisième fois sur cette branche : le
   * premier dessin de la propriétaire **portait** une horloge, aiguilles
   * figées, et deux horloges superposées ne sont pas une horloge. Le second
   * n'en porte pas — mais c'est nous qui choisissons alors la place du
   * cadran (`HORLOGE_IMAGE`), et ce garde devient celui de ce choix : le
   * pignon doit y être plein, et rien n'y être déjà tracé.
   *
   * L'ancien garde lisait le SVG et y interdisait le mot `circle`. Le dessin
   * est devenu une image : le garde lit donc les pixels. Deux choses s'y
   * vérifient.
   *
   * **Le pignon reste plein** sous le cadran : pas un pixel de vide, sans quoi
   * on verrait le ciel au travers.
   *
   * **Aucun cercle n'y est tracé** : on échantillonne la couronne du cadran,
   * là où le dessin posait son cerclage. Un cadran dessiné l'allumerait
   * presque tout entier ; le grain du mur, lui, n'en allume qu'une poignée de
   * points. C'est la même chose que l'ancien `not.toMatch(/<circle\b/)`, dite
   * en pixels — et le seuil est large exprès : ce qu'on veut attraper, c'est
   * un cadran, pas quelques points.
   */
  it('n’est plus dans le dessin du bâtiment, qui garde son trou', () => {
    const png = lirePngIndexe(readFileSync('public/assets/ailleurs/batiment.png'))
    const { x, y, rayon } = HORLOGE_IMAGE
    // 0 = vide, 1 = masse, 2 = trait (voir `preparer_ailleurs.PALETTE`).
    const au = (c: number, l: number) => png.index[Math.round(l) * png.largeur + Math.round(c)]

    for (let l = y - rayon; l <= y + rayon; l += 1) {
      for (let c = x - rayon; c <= x + rayon; c += 1) {
        if ((c - x) ** 2 + (l - y) ** 2 > rayon ** 2) continue
        expect(au(c, l), `vide sous le cadran en ${c},${l}`).not.toBe(0)
      }
    }

    for (const r of [rayon, rayon - 3]) {
      let allumes = 0
      for (let k = 0; k < 360; k += 1) {
        const a = (k * Math.PI) / 180
        if (au(x + Math.cos(a) * r, y + Math.sin(a) * r) === 2) allumes += 1
      }
      expect(allumes / 360, `un cercle est dessiné au rayon ${r}`).toBeLessThan(0.35)
    }
  })
})

describe('le quai qui défile', () => {
  /**
   * Tant qu'on ne lui a pas dit où était sa gare, l'île n'est **nulle part** :
   * elle ne se montre pas. C'est ce qui rend sa toute première pose légitime —
   * personne ne la regarde — et c'est le même parti que `Cables.placer`.
   */
  it('ne se montre pas avant qu’on lui ait dit où était sa gare', () => {
    const { quai } = poser()
    expect(quai.placee).toBe(false)
    expect(quai.eteint.visible).toBe(false)
    expect(quai.allume.visible).toBe(false)
    quai.avancer(0, 1)
    expect(quai.placee).toBe(true)
    expect(quai.eteint.visible).toBe(true)
    expect(quai.allume.visible).toBe(true)
  })

  it('avance d’un pas continu, sans saut d’une image à l’autre', () => {
    const { quai } = poser()
    const distances = distancesDUneEtape()
    // La première pose est la pose, pas un pas : c'est elle qui rend l'île
    // visible. Ce qui se vérifie ici, c'est tout ce qui la suit.
    quai.avancer(distances[0], 0)
    let precedent = quai.x
    for (const d of distances.slice(1)) {
      quai.avancer(d, 0)
      expect(Math.abs(quai.x - precedent)).toBeLessThan(STAGE.width / 4)
      precedent = quai.x
    }
  })

  it('tient ses deux racines sur la même abscisse : une seule île', () => {
    const { quai } = poser()
    for (const d of [0, 400, 1800, -900]) {
      quai.avancer(d, 0)
      expect(quai.allume.x).toBeCloseTo(quai.eteint.x, 6)
    }
  })

  it('sait se dire hors champ une fois la gare partie', () => {
    const { quai } = poser()
    expect(quai.horsChamp(0)).toBe(false)
    expect(quai.horsChamp(-5000)).toBe(true)
    expect(quai.horsChamp(5000)).toBe(true)
  })

  /*
   * Il y avait ici deux tests que le retrait du banc et de la valise a privés
   * de sujet, le 20 novembre 2026 :
   *
   * - « une pièce qui échoue à la recuisson garde sa texture, vivante », qui
   *   faisait échouer la valise à la seconde cuisson et vérifiait qu'elle
   *   gardait une texture vivante ;
   * - « une pièce manquante n'arrête pas la couche », sur une valise absente.
   *
   * Les deux pièces qui restent (`batiment`, `reverbere`) viennent d'une image
   * et ne passent pas par `fabriquerPiece` : le chemin de cuisson des SVG
   * existe toujours dans `QuaiLayer`, mais plus aucun test ne le traverse.
   *
   * Sont partis avec eux les deux outils qu'ils étaient seuls à employer,
   * `avecContexte2D` et `toile`, et le mock de `fabriquerPiece` n'a plus de
   * lecteur. Tout cela revient quand le banc et la valise reviennent ;
   * `git show` en garde le texte.
   */

  /**
   * Le seul maillon qui peut encore fabriquer la mi-teinte interdite : le
   * filtrage linéaire de la carte graphique, qui moyenne deux texels voisins.
   */
  it('les pièces en image se lisent au plus près, jamais en filtrage linéaire', async () => {
    const restaurer = stubFetchEnEchec('rien-du-tout')
    try {
      const { quai } = poser()
      await quai.charger()
      for (const piece of ['batiment', 'reverbere'] as const) {
        const texture = quai.texture(piece)
        expect(texture, `${piece} : chargé`).not.toBeNull()
        expect(texture!.source.scaleMode, `${piece} : scaleMode`).toBe('nearest')
      }
    } finally {
      restaurer()
    }
  })

  it('une image qui ne charge pas manque sans arrêter le quai, et le dit', async () => {
    const restaurer = stubFetchEnEchec('rien-du-tout')
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(loadTexture).mockImplementationOnce(async (chemin) => {
      expect(chemin).toContain('/assets/ailleurs/')
      return null
    })
    try {
      const { quai } = poser()
      await expect(quai.charger()).resolves.toBeUndefined()
      expect(avertir).toHaveBeenCalledTimes(1)
      expect(avertir.mock.calls[0][0]).toMatch(/\.png/)
      // Deux pièces dessinées, l'une manque : il en reste une.
      expect(quai.piecesChargees).toBe(1)
      expect(() => quai.avancer(0, 1)).not.toThrow()
    } finally {
      avertir.mockRestore()
      restaurer()
    }
  })
})

describe('anglesHorloge', () => {
  it('les aiguilles suivent l’heure réelle', () => {
    // 0° = midi, sens horaire. 21:03 → petite aiguille à 9 h et 3 min.
    const a = anglesHorloge(new Date('2026-11-15T21:03:00'))
    expect(a.heures).toBeCloseTo(271.5, 1) // 9 × 30 + 3 × 0,5
    expect(a.minutes).toBeCloseTo(18, 1) // 3 × 6
  })

  it('passe minuit sans reculer brutalement', () => {
    expect(anglesHorloge(new Date('2026-11-15T23:59:00')).heures).toBeCloseTo(359.5, 1)
    expect(anglesHorloge(new Date('2026-11-16T00:00:00')).heures).toBeCloseTo(0, 1)
  })

  it('ne sort jamais du tour', () => {
    for (let h = 0; h < 24; h += 1) {
      for (let m = 0; m < 60; m += 7) {
        const a = anglesHorloge(new Date(2026, 10, 15, h, m))
        expect(a.heures).toBeGreaterThanOrEqual(0)
        expect(a.heures).toBeLessThan(360)
        expect(a.minutes).toBeGreaterThanOrEqual(0)
        expect(a.minutes).toBeLessThan(360)
      }
    }
  })
})

/** Avance la timeline globale de GSAP sans attendre le temps réel (voir `RideauLayer.test.ts`). */
function avancerGsap(secondes: number): void {
  gsap.globalTimeline.time(gsap.globalTimeline.time() + secondes)
}

describe('l’horloge sensible', () => {
  it('suit l’île : la zone sensible défile avec le cadran', () => {
    const { quai } = poser()
    quai.avancer(300, 0)
    // Là où le cadran est dessiné, et non là où il s'arrêtera.
    expect(quai.horlogeTouchee(HORLOGE.x + 300, HORLOGE.y)).toBe(true)
    expect(quai.horlogeTouchee(HORLOGE.x, HORLOGE.y)).toBe(false)
    quai.avancer(0, 0)
    expect(quai.horlogeTouchee(HORLOGE.x, HORLOGE.y)).toBe(true)
  })

  it('ne répond pas tant que l’île n’est pas posée', () => {
    const { quai } = poser()
    // Posée à l'arrêt, l'horloge serait là : mais personne ne l'a encore vue.
    expect(quai.placee).toBe(false)
    expect(quai.horlogeTouchee(HORLOGE.x, HORLOGE.y)).toBe(false)
  })
})

describe('le battement de l’horloge', () => {
  /** Combien de fois l'éclat monte au-dessus de la mi-hauteur, image après image. */
  function pulsations(quai: Quai, jusqua = 6, pas = 0.05): number {
    let montees = 0
    let haut = false
    for (let t = 0; t < jusqua; t += pas) {
      avancerGsap(pas)
      const a = quai.eclat.alpha
      if (a > 0.5 && !haut) montees += 1
      haut = a > 0.5
    }
    return montees
  }

  it('bat exactement deux fois, puis s’arrête et s’éteint', () => {
    const { quai } = poser()
    quai.battre()
    expect(quai.bat).toBe(true)
    expect(pulsations(quai)).toBe(2)
    expect(quai.bat).toBe(false)
    expect(quai.eclat.alpha).toBe(0)
  })

  it('s’apaise net quand on l’en prie, sans finir ses pulsations', () => {
    const { quai } = poser()
    quai.battre()
    avancerGsap(0.4)
    expect(quai.eclat.alpha).toBeGreaterThan(0)
    quai.apaiser()
    expect(quai.bat).toBe(false)
    expect(quai.eclat.alpha).toBe(0)
    // Et rien ne le rallume : la timeline est tuée, pas seulement masquée.
    expect(pulsations(quai)).toBe(0)
  })

  it('ne bat pas sous prefers-reduced-motion', () => {
    const decor = new Container()
    const plans = plansDuDecor(decor)
    const quai = new Quai(new Container(), plans.lumieres, true)
    quai.battre()
    expect(quai.bat).toBe(false)
    expect(pulsations(quai)).toBe(0)
  })

  it('rebattre en plein battement repart de zéro, il n’en double pas deux', () => {
    const { quai } = poser()
    quai.battre()
    avancerGsap(0.7)
    quai.battre()
    expect(pulsations(quai)).toBe(2)
  })
})

describe('l’éclat au survol', () => {
  it('s’allume sous le pointeur et s’éteint quand il part', () => {
    const { quai } = poser()
    expect(quai.eclat.alpha).toBe(0)
    quai.eclairer(true)
    expect(quai.eclat.alpha).toBeGreaterThan(0)
    quai.eclairer(false)
    expect(quai.eclat.alpha).toBe(0)
  })

  it('n’éteint pas un battement en cours quand le pointeur s’en va', () => {
    const { quai } = poser()
    quai.battre()
    avancerGsap(0.45)
    const pic = quai.eclat.alpha
    expect(pic).toBeGreaterThan(0.9)
    // Le pointeur arrive en plein pic : l'éclat reste le plus fort des deux.
    quai.eclairer(true)
    expect(quai.eclat.alpha).toBeCloseTo(pic, 2)
    quai.eclairer(false)
    expect(quai.eclat.alpha).toBeCloseTo(pic, 2)
  })

  it('est tracé sous le cadran, pour que les aiguilles restent des creux', () => {
    const { quai } = poser()
    const rang = (g: object) => quai.allume.children.indexOf(g as never)
    expect(rang(quai.eclat)).toBeGreaterThanOrEqual(0)
    expect(rang(quai.eclat)).toBeLessThan(rang(quai.horloge))
  })
})
