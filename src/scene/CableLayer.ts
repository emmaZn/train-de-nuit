/**
 * Les câbles de « plus loin », dans la scène.
 *
 * Une seule rangée. La deuxième, plus lente et plus petite, a été construite
 * puis retirée : posée sur la même ligne de rail, ses fils tombaient **plus
 * bas** que ceux de la rangée proche et les croisaient. C'était cohérent — un
 * poteau plus court sur le même sol a ses fils plus bas — mais ça se lisait
 * comme de l'encombrement, pas comme de la distance.
 *
 * Ce qui reste de l'idée : quelques **poteaux seuls**, sans fils, avant et
 * après l'île. Un poteau isolé passe, puis les fils, puis les oiseaux : la gare
 * s'annonce au lieu de surgir (CONCEPT.md §4.2).
 *
 * La classe s'appelle `Cables` mais son fichier `CableLayer.ts` : sur macOS,
 * `Cables.ts` est le même fichier que `cables.ts`, qui porte la géométrie.
 * C'est le précédent de `stars.ts` / `StarLayer.ts` (CONCEPT.md §9).
 */
import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import { HORIZON, MONDE } from './layout'
import type { Frame } from './layout'
import { FILS, POTEAU, TRAVEE, amortir, u, yFil } from './cables'
import type { Secousse } from './cables'
import { NOIR, cellule, cellulesClaires, peindreClaires } from './grain'

/** Trois poteaux : deux travées, à peine une largeur de cadre. */
export const POTEAUX = 3

/**
 * Où se pose le premier poteau porteur de fils, à l'arrêt.
 *
 * **Ce nombre n'est pas libre : il suit le nez de la loco.** Deux gardes le
 * tiennent — les fils doivent être dans le champ libre à sa droite, et la
 * deuxième travée entière aussi. Il faut donc
 * `POSITION_A_QUAI + TRAVEE ≥ TETE_LOCO_MAX × STAGE.width`, où le nez est le
 * plus à droite qu'un format puisse le mettre.
 *
 * Il valait 60, puis **180** le 20 novembre 2026 quand la rame a avancé de 0,5
 * à 0,56, puis **195** le 25 novembre, quand le nez du portrait est passé à
 * 0,562 : la travée fait 1123,75 px de cadre, le nez tombe à 1303,84, et les
 * 180 d'alors manquaient de **neuf centièmes de pixel**. Les 195 rendent les
 * quinze pixels de marge d'avant.
 *
 * Avancer encore la rame redemandera de l'avancer, lui aussi — et le test le
 * dira, il ne se contente pas de la marge, il la mesure.
 */
export const POSITION_A_QUAI = 195

/**
 * Combien de poteaux seuls, sans fils, de chaque côté de l'île.
 *
 * **Zéro depuis le 23 novembre 2026.** Ils venaient du §4.2 — « un poteau isolé
 * passe, puis les fils, puis les oiseaux : la gare s'annonce au lieu de
 * surgir » —, mais à l'arrêt ils ne s'annonçaient plus : celui d'avant l'île se
 * plantait en plein écran contre la loco à « ici », celui d'après traversait le
 * formulaire à « là-haut », et ni l'un ni l'autre ne portait de fils.
 * Emmanuelle : « enlève le premier poteau qui ne sert à rien sur "ici" et le
 * dernier sur "là-haut" qui sert à rien ». **Le §4.2 ne décrit donc plus la
 * scène sur ce point.**
 *
 * Ce que la valeur 1 protégeait, et qui n'a plus d'objet : la boucle fait
 * quatre étapes de sol, et l'installation doit sortir entièrement par la gauche
 * avant que la suivante n'entre par la droite. À zéro, l'emprise est la plus
 * étroite possible et la contrainte est tenue avec de la marge.
 */
export const POTEAUX_SEULS = 0

/** Sur quelle longueur les bouts de l'île se dissolvent, au lieu de se couper. */
export const DISSOLUTION = u(220)

/** Ce qu'on laisse de toile de chaque côté du poteau, en pixels de cadre. */
export const MARGE = u(70)

/**
 * Cellule de grain des **fils**, en texels du rendu — celle du massif.
 *
 * Elle ne vaut plus pour le poteau : lui est cuit à la cellule du train, qui se
 * compte en pixels de cadre (`grain.CELLULE_CADRE`). Les fils gardent celle-ci
 * parce qu'ils ne sont pas un trait mais un semis — une transparence devenue
 * densité (`cables.FILS`) —, et qu'un semis se règle à l'écran.
 */
export const GRAIN_ECRAN = 1.5

const GRIS = 0xededed

/** Un générateur déterministe : les mêmes câbles d'une visite à l'autre. */
function alea(graine: number): () => number {
  let s = graine >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** De quoi dessiner un poteau sans savoir sur quoi on dessine. */
export type Pinceau = {
  /** Un bloc de la couleur du fond : c'est lui qui éteint la montagne. */
  masse: (x0: number, y0: number, x1: number, y1: number) => void
  /** Un trait en points. */
  ligne: (x0: number, y0: number, x1: number, y1: number) => void
  /** Un petit bloc plein et clair : un isolateur. */
  plein: (x0: number, y0: number, x1: number, y1: number) => void
}

/**
 * Un isolateur de près : une tige, une cloche plus large, un chapeau.
 *
 * C'est la pièce qui dit « ligne électrique » plus sûrement que le poteau
 * lui-même — mais il faut qu'elle ait une silhouette, pas juste un bloc.
 */
function isolateurDetaille(ix: number, base: number, p: Pinceau): void {
  p.ligne(ix, base, ix, base - u(8))
  p.plein(ix - u(3.5), base - u(11), ix + u(3.5), base - u(8))
  p.plein(ix - u(2), base - u(13), ix + u(2), base - u(11))
}

/** Le fût, en tronc de cône : plus large au pied qu'au sommet. */
function futEffile(x: number, p: Pinceau, haut: number, bas: number): void {
  const tranches = 7
  const pas = (HORIZON - POTEAU.epaule) / tranches
  for (let i = 0; i < tranches; i += 1) {
    const y = POTEAU.epaule + i * pas
    const demi = haut + ((bas - haut) * i) / tranches
    p.masse(x - demi, y, x + demi, y + pas + 1)
  }
  for (const cote of [-1, 1]) {
    p.ligne(x + cote * haut, POTEAU.epaule, x + cote * bas, HORIZON)
  }
  p.ligne(x - haut, POTEAU.epaule, x, POTEAU.sommet)
  p.ligne(x, POTEAU.sommet, x + haut, POTEAU.epaule)
}

/**
 * Le poteau, dessiné une fois pour toutes.
 *
 * Trois autres modèles ont été comparés dans la scène — un treillis, un mât
 * fin, un mât haubané — et c'est celui-ci qu'Emmanuelle a retenu, « avec plus
 * de détail, de réalisme ». D'où le fût en tronc de cône, les échelons en
 * quinconce, les isolateurs en trois pièces, la boulonnerie et le pied élargi :
 * ce sont ces petites choses qui font un poteau et non une croix.
 */
export function dessinerPoteau(x: number, p: Pinceau): void {
  const haut = POTEAU.demiFut
  const bas = POTEAU.demiFut * 1.6
  futEffile(x, p, haut, bas)

  // Les échelons, en quinconce : de quoi monter réparer la ligne. C'est
  // le détail qui donne l'échelle du poteau.
  const demiA = (y: number) =>
    haut + ((bas - haut) * (y - POTEAU.epaule)) / (HORIZON - POTEAU.epaule)
  for (let y = POTEAU.bras[1].y + u(26), i = 0; y < HORIZON - u(24); y += u(26), i += 1) {
    const cote = i % 2 === 0 ? -1 : 1
    p.ligne(x + cote * demiA(y), y, x + cote * (demiA(y) + u(9)), y)
  }

  for (const bras of POTEAU.bras) {
    const bd = bras.y + bras.epaisseur
    p.masse(x - bras.demi, bras.y, x + bras.demi, bd)
    p.ligne(x - bras.demi, bras.y, x + bras.demi, bras.y)
    p.ligne(x - bras.demi, bd, x + bras.demi, bd)
    p.ligne(x - bras.demi, bras.y, x - bras.demi, bd)
    p.ligne(x + bras.demi, bras.y, x + bras.demi, bd)

    // Les deux jambes de force, et leur boulon sur le fût.
    const pied = bras.y + bras.hauban
    for (const cote of [-1, 1]) {
      p.ligne(x + cote * (bras.isolateurs - u(8)), bd, x + cote * demiA(pied), pied)
      p.plein(x + cote * demiA(pied) - u(2), pied - u(2), x + cote * demiA(pied) + u(2), pied + u(2))
    }

    // La boulonnerie qui tient le bras au fût.
    p.plein(x - u(6), bras.y + u(1), x - u(3), bd - u(1))
    p.plein(x + u(3), bras.y + u(1), x + u(6), bd - u(1))

    for (const cote of [-1, 1]) {
      isolateurDetaille(x + cote * bras.isolateurs, bras.y, p)
    }
  }

  // Le pied, là où le bois entre dans le ballast : un peu plus large.
  p.masse(x - bas - u(2), HORIZON - u(10), x + bas + u(2), HORIZON)
  p.ligne(x - bas - u(2), HORIZON - u(10), x + bas + u(2), HORIZON - u(10))
}

/** Un bloc de masse à peindre, en texels de la toile du poteau. */
export type Bloc = { x: number; y: number; largeur: number; hauteur: number }

/**
 * Le poteau relevé : ce qui masse, ce qui trait, et où la masse se peint.
 *
 * Le poteau ne se peint plus au fur et à mesure. Il se relève d'abord en
 * cellules, et la recette du projet décide ensuite (`grain.ts`) : c'est ce
 * détour qui lui vaut les trous et la matière du train, et qui lui enlève ses
 * mi-teintes. Une cellule large de 1,5 px posée à `Math.round(x)` débordait
 * d'un demi-pixel, que la toile lissait : le poteau sortait avec 5 % de gris
 * moyens et 13 % de pixels à moitié transparents, là où la décision 12.2 n'en
 * veut aucun.
 *
 * Rien ici ne touche à une toile : tout se vérifie sans canvas.
 */
export function releverPoteau(
  k: number,
  largeur: number,
  hauteur: number,
  taille: number,
): { masse: Uint8Array; trait: Uint8Array; colonnes: number; lignes: number; blocs: Bloc[] } {
  const colonnes = Math.floor(largeur / taille)
  const lignes = Math.floor(hauteur / taille)
  const masse = new Uint8Array(Math.max(0, colonnes * lignes))
  const trait = new Uint8Array(Math.max(0, colonnes * lignes))
  const blocs: Bloc[] = []

  const px = (v: number) => (v + MARGE) * k
  const py = (v: number) => (v - POTEAU.sommet) * k

  const marquer = (grille: Uint8Array, c: number, l: number) => {
    if (c < 0 || l < 0 || c >= colonnes || l >= lignes) return
    grille[l * colonnes + c] = 1
  }

  /** Les cellules d'un rectangle : celles qu'il effleure, ou celles qu'il remplit. */
  const rectangle = (
    grille: Uint8Array,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    entiere: boolean,
  ) => {
    // `entiere` : les cellules que la masse remplit d'un bord à l'autre.
    // Sinon : celles où la pièce pèse le plus, bords **arrondis** et non
    // débordés. `floor`/`ceil` ajoutaient jusqu'à une cellule de chaque côté,
    // ce qui enflait un boulon de 5 px de cadre de moitié ; les isolateurs du
    // poteau sortaient en gros carrés pleins.
    const premier = (v: number) => (entiere ? Math.ceil(v / taille) : Math.round(v / taille))
    const dernier = (v: number) => (entiere ? Math.floor(v / taille) : Math.round(v / taille)) - 1
    const [c0, c1] = [premier(px(x0)), dernier(px(x1))]
    const [l0, l1] = [premier(py(y0)), dernier(py(y1))]
    // Une pièce plus petite qu'une cellule en garde quand même une : le
    // chapeau d'un isolateur ne doit pas disparaître sur un petit écran.
    const finC = entiere ? c1 : Math.max(c0, c1)
    const finL = entiere ? l1 : Math.max(l0, l1)
    for (let l = l0; l <= finL; l += 1) {
      for (let c = c0; c <= finC; c += 1) marquer(grille, c, l)
    }
  }

  const pinceau: Pinceau = {
    masse: (x0, y0, x1, y1) => {
      // La silhouette reste au pixel, bords arrondis : un rectangle droit posé
      // sur des entiers ne laisse aucun bord à moitié transparent, et le fût
      // garde son effilement au lieu de monter par marches d'une cellule.
      const x = Math.round(px(x0))
      const y = Math.round(py(y0))
      blocs.push({ x, y, largeur: Math.round(px(x1)) - x, hauteur: Math.round(py(y1)) - y })
      // La matière, elle, se sème par cellules — et seulement dans celles que
      // la masse remplit d'un bord à l'autre, sinon un point déborderait du fût.
      rectangle(masse, x0, y0, x1, y1, true)
    },
    plein: (x0, y0, x1, y1) => rectangle(trait, x0, y0, x1, y1, false),
    ligne: (x0, y0, x1, y1) => {
      const n = Math.max(2, Math.ceil((Math.hypot(x1 - x0, y1 - y0) * k) / taille))
      for (let i = 0; i <= n; i += 1) {
        const t = i / n
        marquer(
          trait,
          Math.floor(px(x0 + (x1 - x0) * t) / taille),
          Math.floor(py(y0 + (y1 - y0) * t) / taille),
        )
      }
    },
  }

  dessinerPoteau(0, pinceau)
  return { masse, trait, colonnes, lignes, blocs }
}

export class Cables {
  private readonly racine = new Container()
  private readonly rangee = new Container()
  private readonly fils = new Graphics()
  private readonly poteaux: Sprite[] = []
  private texturePoteau: Texture | null = null

  /** Une secousse par fil et par travée : le fil voisin ne bouge pas. */
  private readonly secousses: Secousse[][] = FILS.map(() =>
    Array.from({ length: POTEAUX - 1 }, () => ({ amplitude: 0, phase: 0 })),
  )

  /** Un bruit tiré une fois : un bruit neuf à chaque image ferait bouillir les fils. */
  private readonly bruit: Float32Array[] = FILS.map((_, i) => {
    const r = alea(9001 + i * 131)
    return Float32Array.from({ length: 4096 }, () => r())
  })

  private horloge = 0
  private parCadre = 1
  private posee = false

  constructor(parent: Container) {
    parent.addChild(this.racine)
    this.racine.addChild(this.rangee)
    this.rangee.addChild(this.fils)
    this.rangee.x = POSITION_A_QUAI
    // Tant qu'on ne sait pas où est la gare, l'île n'est nulle part : la scène
    // tourne sa première image avant que Vue ne lui dise d'où l'on part, et
    // une île qui se pose quand même s'ancre à quai — à « ici ».
    this.racine.visible = false
  }

  /** Combien de poteaux sont posés sur la ligne. */
  get poteauxPoses(): number {
    return this.poteaux.length
  }

  /** Combien de textures de poteau sont encore vivantes. Jamais plus d'une. */
  get texturesVivantes(): number {
    return this.texturePoteau ? 1 : 0
  }

  get travees(): number {
    return POTEAUX - 1
  }

  get decalage(): number {
    return this.rangee.x
  }

  /**
   * L'installation est-elle entièrement hors de l'écran, à cette distance ?
   *
   * C'est la seule question qui autorise à la **replacer** : tant qu'un seul
   * poteau est visible, elle ne peut plus que suivre le sol, sans quoi elle
   * saute sous les yeux.
   */
  horsChamp(distance: number): boolean {
    const gauche = POSITION_A_QUAI + distance + this.emprise.gauche
    const droite = POSITION_A_QUAI + distance + this.emprise.droite
    return droite < MONDE.x || gauche > MONDE.x + MONDE.width
  }

  /** Jusqu'où s'étend l'installation, poteaux seuls compris, en repère d'île. */
  get emprise(): { gauche: number; droite: number } {
    return {
      gauche: -POTEAUX_SEULS * TRAVEE,
      droite: (POTEAUX - 1 + POTEAUX_SEULS) * TRAVEE,
    }
  }

  /** A-t-on dit à l'île où elle était ? */
  get placee(): boolean {
    return this.posee
  }

  /** La rangée se pose sur le sol qui reste à parcourir, pas sur l'horloge. */
  placer(distanceGare: number): void {
    this.rangee.x = POSITION_A_QUAI + distanceGare
    this.posee = true
    this.racine.visible = true
  }

  cadrer(frame: Frame, resolution: number): void {
    const parCadre = frame.scale * resolution
    if (parCadre === this.parCadre && this.poteaux.length) return
    this.parCadre = parCadre
    this.cuirePoteau()
  }

  avancer(dt: number): void {
    this.horloge += dt
    for (const ligne of this.secousses) {
      for (const s of ligne) s.amplitude = amortir(s.amplitude, dt)
    }
    this.dessinerFils()
  }

  /** Quelle travée porte cette abscisse, sans jamais sortir du tableau. */
  private travee(abscisse: number): number {
    return Math.min(this.travees - 1, Math.max(0, Math.floor(abscisse)))
  }

  /** Où se pose un oiseau : `abscisse` continue, partie entière = travée. */
  positionSur(fil: number, abscisse: number): { x: number; y: number } {
    const t = abscisse - Math.floor(abscisse)
    return {
      x: this.rangee.x + abscisse * TRAVEE,
      y: yFil(fil, t, this.secousses[fil][this.travee(abscisse)], this.horloge),
    }
  }

  secouer(fil: number, abscisse: number, force: number): void {
    const s = this.secousses[fil][this.travee(abscisse)]
    s.amplitude = Math.min(u(9), s.amplitude + force)
    // La phase repart du coup : la secousse commence à son maximum.
    s.phase = -this.horloge * 9
  }

  /**
   * Les fils sont redessinés à chaque image — c'est ce qui leur permet de
   * vibrer — en cellules tirées sur un bruit **fixe**. Les bouts de l'île se
   * dissolvent au lieu de se couper net : la langue du projet (CONCEPT §2).
   */
  private dessinerFils(): void {
    const g = this.fils
    g.clear()
    const cellule = Math.max(1, GRAIN_ECRAN / this.parCadre)
    const longueur = TRAVEE * this.travees
    for (let fil = 0; fil < FILS.length; fil += 1) {
      const bruit = this.bruit[fil]
      let i = 0
      for (let travee = 0; travee < this.travees; travee += 1) {
        const n = Math.max(8, Math.round(TRAVEE / cellule))
        for (let k = 0; k <= n; k += 1) {
          const t = k / n
          i = (i + 1) % bruit.length
          const x = (travee + t) * TRAVEE
          const bord = Math.min(x, longueur - x)
          const fondu = Math.min(1, Math.max(0, bord / DISSOLUTION))
          if (bruit[i] > FILS[fil].densite * fondu) continue
          const y = yFil(fil, t, this.secousses[fil][travee], this.horloge)
          g.rect(x - cellule / 2, y - cellule / 2, cellule, cellule)
        }
      }
    }
    g.fill({ color: GRIS })
  }

  /**
   * On ne cuit **qu'un seul poteau**, et on le repose autant de fois qu'il en
   * faut.
   *
   * Cuire toute l'installation d'un coup donnait une texture de douze mille
   * pixels de large en retina — des dizaines de mégaoctets, refaits à chaque
   * redimensionnement, et refusés par la carte au-delà de sa taille maximale.
   * Un poteau fait quelques dizaines de kilo-octets, et le nombre de poteaux
   * ne coûte plus rien à régler.
   *
   * Sans contexte 2D — jsdom, ou un canvas trop grand — la rangée garde ses
   * fils plutôt que de tout arrêter.
   */
  private cuirePoteau(): void {
    const k = this.parCadre
    const largeur = Math.round(MARGE * 2 * k)
    const hauteur = Math.round((HORIZON - POTEAU.sommet + u(20)) * k)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, largeur)
    canvas.height = Math.max(1, hauteur)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const taille = cellule(k)
    const releve = releverPoteau(k, largeur, hauteur, taille)

    // La masse d'abord, au pixel : c'est elle qui éteint la montagne.
    ctx.fillStyle = NOIR
    for (const b of releve.blocs) ctx.fillRect(b.x, b.y, b.largeur, b.hauteur)

    // Puis ce qui est clair : le trait troué, et la matière semée dans la masse.
    const { colonnes, lignes } = releve
    const claires = cellulesClaires(releve.trait, releve.masse, colonnes, lignes)
    peindreClaires(ctx, claires, colonnes, lignes, taille)

    const texture = Texture.from(canvas)
    texture.source.scaleMode = 'nearest'

    while (this.poteaux.length < POTEAUX + 2 * POTEAUX_SEULS) {
      const sprite = new Sprite()
      sprite.anchor.set(0, 0)
      this.poteaux.push(sprite)
      this.rangee.addChildAt(sprite, 0)
    }
    this.poteaux.forEach((sprite, i) => {
      sprite.texture = texture
      sprite.setSize(largeur / k, hauteur / k)
      sprite.position.set((i - POTEAUX_SEULS) * TRAVEE - MARGE, POTEAU.sommet)
    })

    // L'ancienne n'est détruite qu'une fois la neuve montée partout : une
    // texture encore portée par un sprite ferait tomber tout le rendu.
    this.texturePoteau?.destroy(true)
    this.texturePoteau = texture
  }

  destroy(): void {
    // Jamais `sprite.texture.destroy()` : au premier passage c'est la texture
    // vide partagée de Pixi, et la détruire fait tomber tout le rendu. On ne
    // détruit que celle qu'on a fabriquée.
    this.texturePoteau?.destroy(true)
    this.texturePoteau = null
    this.poteaux.length = 0
    this.racine.destroy({ children: true })
  }
}
