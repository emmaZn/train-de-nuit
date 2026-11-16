import { readFileSync } from 'node:fs'
import { Container, Graphics } from 'pixi.js'
import { describe, expect, it, vi } from 'vitest'

import { HALO_HORLOGE, Quai, anglesHorloge } from '@/scene/QuaiLayer'
import { fabriquerPiece } from '@/scene/poses'
import { appliquerNuit, plansDuDecor } from '@/scene/Scene'
import { solParEtape } from '@/scene/cables'
import { HORLOGE, PIECES } from '@/scene/quai'
import { DUREE_ETAPE, HORIZON, STAGE } from '@/scene/layout'

vi.mock('@/scene/poses', async (importOriginal) => {
  const vrai = await importOriginal<typeof import('@/scene/poses')>()
  return { ...vrai, fabriquerPiece: vi.fn() }
})

/**
 * Un contexte 2D crédible, et une toile de taille plausible : `refaireTextures`
 * sort tout de suite sans contexte, et `Texture.from` veut des dimensions.
 */
function avecContexte2D(): () => void {
  const original = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = (() => ({})) as unknown as typeof original
  return () => {
    HTMLCanvasElement.prototype.getContext = original
  }
}

function toile(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  return c
}

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

/** Combien d'ancêtres portent un filtre — zéro au-dessus d'une lumière. */
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
   * `b8a5627` l'assombrissement se fait par un filtre de luminance par groupe,
   * pas par un rectangle plein cadre. Ce qui se vérifie à la place, c'est la
   * règle des lumières elle-même.
   */
  it('les lumières du quai n’ont aucun filtre au-dessus d’elles', () => {
    const { quai } = poser()
    expect(filtresAuDessus(quai.allume)).toBe(0)
  })

  it('le décor éteint du quai est bien sous un groupe filtré', () => {
    const { plans, quai } = poser()
    expect(filtresAuDessus(quai.eteint)).toBeGreaterThan(0)
    expect(ancetres(quai.eteint)).toContain(plans.plateauFond)
  })

  /**
   * « Hors des groupes filtrés » ne suffit pas : monté après `vitres`, le
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
    expect(rang(p.plateau)).toBeLessThan(rang(p.vitres))
  })

  it('la nuit éteint le fond du plateau comme le plateau', () => {
    const decor = new Container()
    const p = plansDuDecor(decor)
    appliquerNuit(p, 1)
    expect(p.nuit.plateauFond.enabled).toBe(true)
    appliquerNuit(p, 0)
    expect(p.nuit.plateauFond.enabled).toBe(false)
  })

  it('la scène monte le quai au fond du plateau, avant la rame', () => {
    const source = readFileSync('src/scene/Scene.ts', 'utf8')
    const quai = source.indexOf('planQuai')
    const train = source.indexOf('new Train(')
    expect(quai).toBeGreaterThan(0)
    expect(quai).toBeLessThan(train)
    expect(source).toContain('plateauFond.addChild(planQuai)')
  })
})

describe('les pieds du panneau', () => {
  /** Le cadre est une lumière : ses pieds se dessinent avec lui, allumés. */
  it('descendent jusqu’au rail, dans le cadre allumé', () => {
    const { quai } = poser()
    const cadre = quai.allume.children[0] as Graphics
    expect(filtresAuDessus(cadre)).toBe(0)
    const p = PIECES.panneau
    const b = cadre.getLocalBounds()
    expect(b.maxY).toBeGreaterThanOrEqual(HORIZON - 1)
    expect(b.maxY).toBeLessThanOrEqual(HORIZON + 8)
    expect(b.minX).toBeGreaterThanOrEqual(p.x - 8)
    expect(b.maxX).toBeLessThanOrEqual(p.x + p.largeur + 8)
  })
})

describe('l’horloge allumée', () => {
  /**
   * L'horloge est une des quatre lumières de la gare : cadran, halo et
   * aiguilles sont dans la racine allumée, d'un seul tenant. Allumer les
   * aiguilles sur un cadran éteint serait laid.
   */
  it('est tout entière hors de tout filtre, et absente de la racine éteinte', () => {
    const { quai } = poser()
    const h = quai.horloge
    expect(ancetres(h)).toContain(quai.allume)
    expect(filtresAuDessus(h)).toBe(0)
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

  it('n’est plus dans le dessin du bâtiment, qui s’éteint', () => {
    const svg = readFileSync('public/assets/ailleurs/batiment.svg', 'utf8')
    expect(svg).not.toMatch(/<circle[^>]*cx="280"[^>]*cy="120"/)
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

  /**
   * Le piège que le commentaire de `Birds.refaireTextures` signale : une pièce
   * qui échoue à la **recuisson** garde son ancienne texture, et détruire la
   * fournée d'avant en bloc laisserait son sprite sur une texture morte — ce
   * qui fait tomber tout le rendu Pixi.
   */
  it('une pièce qui échoue à la recuisson garde sa texture, vivante', async () => {
    const rendre2D = avecContexte2D()
    const restaurer = stubFetchEnEchec('rien-du-tout')
    const fabrique = vi.mocked(fabriquerPiece)
    try {
      fabrique.mockReset()
      // Première cuisson : les quatre pièces sortent.
      fabrique.mockImplementation(async () => toile())
      const { quai } = poser()
      await quai.charger()
      const avant = quai.texture('valise')
      expect(avant).not.toBeNull()

      // Seconde cuisson : la valise échoue, les autres passent.
      fabrique.mockImplementation(async (_svg, largeur) =>
        largeur === PIECES.valise.largeur ? null : toile(),
      )
      await quai.charger()

      // Elle garde la sienne, et cette texture est toujours vivante.
      expect(quai.texture('valise')).toBe(avant)
      expect(avant!.destroyed).toBe(false)
      // Et une pièce qui a bien recuit a bien changé de texture.
      expect(quai.texture('batiment')).not.toBeNull()
    } finally {
      restaurer()
      rendre2D()
    }
  })

  it('une pièce manquante n’arrête pas la couche', async () => {
    const restaurer = stubFetchEnEchec('valise')
    try {
      const { quai } = poser()
      await expect(quai.charger()).resolves.toBeUndefined()
      expect(quai.piecesChargees).toBe(3)
      expect(() => quai.avancer(0, 1)).not.toThrow()
    } finally {
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
