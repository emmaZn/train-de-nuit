/**
 * La neige qui tombe sur « ailleurs » (spec §6, « la neige libre »).
 *
 * **Rien ne se reconstruit à l'image.** Les flocons d'une couche sont tracés
 * une seule fois dans leur propre `Graphics`, au cadrage ; chaque image ne
 * déplace que la racine de la couche. C'est ce que fait déjà `Sky` avec sa
 * parallaxe et `Faisceau` avec ses quatre respirations.
 *
 * **Le bouclage, sans bande vide.** Chaque couche est dessinée **deux fois**
 * dans son `Graphics` : une fois à `y`, une fois à `y - hauteur`. Les deux
 * copies couvrent `[d - hauteur, d + hauteur)` pour un décalage `d` pris dans
 * `[0, hauteur)` — donc toujours l'écran entier. On ne voit jamais le raccord
 * passer.
 *
 * **L'opacité de la neige est la nuit.** `setNuit` pose `nuitDeLaGare` telle
 * quelle sur le groupe, sans fondu à elle : la rampe du freinage et celle du
 * démarrage font tout, un lien partagé vers « ailleurs » neige dès la première
 * image, et une traversée sans arrêt ne neige pas du tout.
 *
 * Tout se trace en pixels de **cadre** : le plan vit dans `decor`, et la
 * seconde population — les flocons du faisceau, tâche 7 — y retrouvera le
 * repère du cône sans conversion.
 */
import { Container, Graphics } from 'pixi.js'

import type { Frame } from './layout'
import { COUCHES_NEIGE, decalageCouche, floconsLibres } from './neige'
import type { Flocon } from './neige'
import { GRAIN_ECRAN } from './poses'

/** La graine de la neige libre : le même ciel chargé à chaque visite. */
const GRAINE = 23

/**
 * Des couches de flocons qui tombent et rebouclent.
 *
 * C'est la mécanique seule, sans tirage : on lui donne une population par
 * couche et une hauteur de bouclage, elle les trace et les fait tomber. La
 * neige libre s'en sert avec `floconsLibres` ; la neige du faisceau (tâche 7)
 * s'en servira avec `floconsDuCone`, sans recopier ni la chute ni le bouclage.
 */
export class CouchesQuiTombent {
  private readonly couches: Graphics[] = []
  private hauteur = 1
  private horloge = 0
  private flocons = 0

  /** Sous mouvement réduit, les flocons sont posés mais ne tombent pas (CONCEPT §11). */
  private readonly anime: boolean

  constructor(parent: Container, reducedMotion = false, nombre = COUCHES_NEIGE) {
    this.anime = !reducedMotion
    for (let i = 0; i < nombre; i += 1) {
      const g = new Graphics()
      this.couches.push(g)
      parent.addChild(g)
    }
  }

  /** Le décalage de chaque couche, pour les tests. */
  get decalages(): number[] {
    return this.couches.map((g) => g.y)
  }

  /** Combien de flocons sont posés, toutes couches confondues. */
  get nombreDeFlocons(): number {
    return this.flocons
  }

  /** Sur quelle hauteur les couches rebouclent, en pixels de cadre. */
  get hauteurDeBouclage(): number {
    return this.hauteur
  }

  /**
   * Trace les populations, une fois pour toutes : chaque flocon deux fois,
   * à `y` et à `y - hauteur`. `rayonMin` garde un flocon au-dessus du
   * demi-grain d'écran : plus petit, le disque tombe sous le pixel et
   * l'anticrénelage le rend en gris pâle au lieu de blanc — ce n'est pas la
   * mi-teinte **déclarée** que CONCEPT §12.2 pèse (la neige a son opacité, et
   * elle est assumée), c'est un blanc qu'on perd au tracé. Le plancher le rend.
   */
  poser(populations: Flocon[][], hauteur: number, rayonMin: number): void {
    this.hauteur = Math.max(hauteur, 1)
    this.flocons = 0
    this.couches.forEach((g, i) => {
      g.clear()
      for (const f of populations[i] ?? []) {
        const r = Math.max(f.r, rayonMin)
        g.circle(f.x, f.y, r).fill({ color: 0xffffff, alpha: f.a })
        g.circle(f.x, f.y - this.hauteur, r).fill({ color: 0xffffff, alpha: f.a })
        this.flocons += 1
      }
    })
    this.placer()
  }

  /**
   * Ça tombe tout seul : on ne déplace que les racines.
   *
   * Un `dt` qui n'est pas fini empoisonnerait l'horloge **définitivement** —
   * tous les décalages passeraient à NaN, et `poser` ne remet pas l'horloge à
   * zéro : la neige disparaîtrait pour le reste de la session.
   */
  animer(dt: number): void {
    if (!this.anime || !Number.isFinite(dt)) return
    this.horloge += dt
    this.placer()
  }

  private placer(): void {
    this.couches.forEach((g, i) => {
      g.y = decalageCouche(i, this.horloge, this.hauteur)
    })
  }
}

export class Neige {
  private readonly racine = new Container()
  private readonly couches: CouchesQuiTombent
  /** Ce que le dernier tracé a vu : on ne retrace que si l'écran a bougé. */
  private cadre: string | null = null
  private traces = 0

  constructor(parent: Container, reducedMotion = false) {
    // Elle commence absente : la nuit la fera venir, ou pas du tout.
    this.racine.alpha = 0
    this.couches = new CouchesQuiTombent(this.racine, reducedMotion)
    parent.addChild(this.racine)
  }

  /** Le conteneur de la neige, pour les tests de plan. */
  get groupe(): Container {
    return this.racine
  }

  get decalages(): number[] {
    return this.couches.decalages
  }

  get nombreDeFlocons(): number {
    return this.couches.nombreDeFlocons
  }

  get hauteurDeBouclage(): number {
    return this.couches.hauteurDeBouclage
  }

  /** Combien de fois les couches ont été tracées : rien ne doit l'être à l'image. */
  get tracages(): number {
    return this.traces
  }

  /**
   * Retrace la neige quand l'écran ou l'échelle change — pas avant.
   *
   * Le tirage couvre **la part du cadre que l'écran montre**, pas le `STAGE`
   * entier : `cadrageScene` décale le cadre vers le haut, et un tirage sur le
   * `STAGE` laisserait une bande sans neige en haut de l'écran.
   */
  cadrer(frame: Frame, largeur: number, hauteur: number, mobile: boolean): void {
    const cadre = `${frame.scale}|${frame.offsetX}|${frame.offsetY}|${largeur}|${hauteur}|${mobile}`
    if (cadre === this.cadre) return
    this.cadre = cadre
    this.traces += 1
    // Le coin haut-gauche de l'écran, en pixels de cadre : la neige se pose
    // dessus, et le reste du décor ne change pas de repère.
    this.racine.position.set(-frame.offsetX / frame.scale, -frame.offsetY / frame.scale)
    const largeurCadre = largeur / frame.scale
    const hauteurCadre = hauteur / frame.scale
    this.couches.poser(
      floconsLibres(largeurCadre, hauteurCadre, GRAINE, mobile),
      hauteurCadre,
      GRAIN_ECRAN / 2 / frame.scale,
    )
  }

  /**
   * L'opacité de la neige **est** la nuit : aucune rampe de plus ici.
   *
   * Une nuit qui n'est pas un nombre ne passe pas : `Math.min`/`Math.max`
   * laissent filer NaN, et une opacité NaN efface la neige sans retour.
   */
  setNuit(nuit: number): void {
    if (!Number.isFinite(nuit)) return
    this.racine.alpha = Math.min(1, Math.max(0, nuit))
  }

  animer(dt: number): void {
    this.couches.animer(dt)
  }

  destroy(): void {
    this.racine.destroy({ children: true })
  }
}
