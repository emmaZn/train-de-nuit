/**
 * Les bouvreuils de « plus loin ».
 *
 * Ils vivent sur le fil — demi-tours, pas, ébouriffages —, tombent quand on les
 * clique, et se plantent dans la terre où ils deviennent des **bosses** que
 * plus rien ne déplace. Un autre arrive : les fils ne se vident jamais, et les
 * bosses s'accumulent (cadrage §2).
 */
import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import { HORIZON } from './layout'
import type { Frame } from './layout'
import { FILS, TRAVEE, u } from './cables'
import type { Cables } from './CableLayer'
import {
  DUREE_PAS,
  avancementDuPas,
  champSurLesFils,
  choisirGeste,
  dureeAuSol,
  placesTenables,
  placeLibre,
  poseDuGeste,
  prochainGeste,
} from './oiseaux'
import type { Place } from './oiseaux'
import { CADRE_POSE, POSES, RATIO_POSE, fabriquerPose, miroir } from './poses'
import type { Pose } from './poses'

/** La largeur du cadre d'une pose, en pixels de cadre. */
export const TAILLE_OISEAU = 72

/** Le sol des corps : dans la bande de terre, pas dans l'eau du reflet. */
export const SOL = HORIZON + 55

/**
 * Combien de bosses on garde à l'écran.
 *
 * « Infini » parle du **gag** — on ne manque jamais d'oiseaux — et le tas doit
 * grossir tout au long de la visite : c'est Emmanuelle qui dira quand il
 * devient trop (§12), pas cette constante. Elle n'est qu'un garde-fou contre
 * l'emballement, posée assez haut pour qu'on ne la rencontre jamais en jouant.
 */
export const CORPS_MAX = 400

/** La pirouette de « Et je danse. », avant la chute. */
export const PIROUETTE = 0.7

const DUREE_VOL = 1.4
const GRIS = 0xededed

type Etat = 'pose' | 'pirouette' | 'chute' | 'sol' | 'arrivee'

type Oiseau = {
  etat: Etat
  fil: number
  u: number
  /** Une fois au sol : l'abscisse dans l'île, pour voyager avec elle. */
  xIle: number
  y: number
  vy: number
  rot: number
  t: number
  sens: 1 | -1
  ebouriffeJusqu: number
  prochainGeste: number
  /** Le pas en cours sur le fil : d'où il part, où il va, ce qu'il en reste. */
  pasDepart: number
  pasCible: number
  pasReste: number
  depart: { x: number; y: number } | null
  regard: boolean
  sprite: Sprite
}

function alea(graine: number): () => number {
  let s = graine >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export class Birds {
  private readonly racine = new Container()
  /** Les sprites, dans leur ordre d'apparition. */
  readonly corps = new Container()
  private readonly etoiles = new Graphics()

  private readonly cables: Cables
  private readonly reducedMotion: boolean
  private readonly oiseaux: Oiseau[] = []
  private readonly r = alea(20261115)
  private svgs = new Map<Pose, string>()
  private textures = new Map<string, Texture>()
  private horloge = 0
  private parCadre = 1
  /** La part des fils qu'on voit : on ne s'assied que là. */
  private champ = { uMin: 0.08, uMax: 1.92 }
  private detruit = false
  private prochaineArrivee = 0

  /** Ce que la prochaine chute doit jouer. Posé par la scène avant le clic. */
  variante: { pirouette: boolean; regard: boolean } = { pirouette: false, regard: false }

  /** Prévient qu'un oiseau vient d'être lâché. La scène n'en dit pas plus. */
  surChute: (() => void) | null = null

  constructor(parent: Container, cables: Cables, opts: { reducedMotion: boolean }) {
    this.cables = cables
    this.reducedMotion = opts.reducedMotion
    parent.addChild(this.racine)
    this.racine.addChild(this.corps, this.etoiles)
    this.semer()
    // Une image de plus, tout de suite : sur un lien direct vers « plus loin »
    // il n'y a pas d'approche, et les oiseaux doivent déjà être sur le fil.
    this.avancer(0)
  }

  async charger(): Promise<void> {
    await Promise.all(
      POSES.map(async (pose) => {
        try {
          const reponse = await fetch(`/assets/oiseaux/${pose}.svg`)
          if (reponse.ok) this.svgs.set(pose, await reponse.text())
        } catch {
          /* une pose manquante n'arrête pas la scène */
        }
      }),
    )
    await this.refaireTextures()
  }

  cadrer(frame: Frame, resolution: number, largeurEcran = 0): void {
    if (largeurEcran > 0) {
      this.champ = champSurLesFils(
        -frame.offsetX / frame.scale,
        (largeurEcran - frame.offsetX) / frame.scale,
        this.cables.decalage,
        TRAVEE,
        this.cables.travees,
      )
    }
    const parCadre = frame.scale * resolution
    if (parCadre === this.parCadre) return
    this.parCadre = parCadre
    if (this.svgs.size) void this.refaireTextures()
  }

  /* ------------------------------------------------------------- textures */

  private async refaireTextures(): Promise<void> {
    // On fabrique tout avant de rien détruire : `fabriquerPose` rend la main au
    // rendu, et une texture détruite encore montée fait tomber tout Pixi.
    //
    // Trois chemins dégradés à tenir, tous nés de cet `await` :
    // un cadrage qui en double un autre, un démontage au milieu, et une pose
    // sur dix qui échoue — dans ce dernier cas, échanger la carte laisserait
    // des sprites sur les anciennes textures, qu'on détruirait juste après.
    const jeton = this.parCadre
    const attendu = POSES.length * 2
    const neuves = new Map<string, Texture>()
    for (const pose of POSES) {
      const svg = this.svgs.get(pose)
      if (!svg) continue
      for (const retourne of [false, true]) {
        const canvas = await fabriquerPose(
          retourne ? miroir(svg) : svg,
          TAILLE_OISEAU,
          this.parCadre,
        )
        if (!canvas) continue
        const texture = Texture.from(canvas)
        texture.source.scaleMode = 'nearest'
        neuves.set(this.cle(pose, retourne), texture)
      }
    }
    const perimee = jeton !== this.parCadre
    if (this.detruit || perimee || neuves.size !== attendu) {
      // Rien n'est monté : ces textures-là n'appartiennent à personne.
      for (const t of neuves.values()) t.destroy(true)
      return
    }
    const anciennes = this.textures
    this.textures = neuves
    for (const o of this.oiseaux) this.habiller(o)
    for (const t of anciennes.values()) t.destroy(true)
  }

  private cle(pose: Pose, retourne: boolean): string {
    return retourne ? `${pose}:miroir` : pose
  }

  private habiller(o: Oiseau): void {
    let pose: Pose = 'perche'
    let retourne = false
    if (o.etat === 'sol') pose = 'sonne'
    else if (o.etat === 'arrivee') {
      pose = Math.floor(this.horloge * 7) % 2 === 0 ? 'vol-haut' : 'vol-bas'
      retourne = o.sens < 0
    } else {
      const choix = poseDuGeste(o.sens, o.ebouriffeJusqu > this.horloge)
      pose = choix.pose
      retourne = choix.miroir
    }
    const texture = this.textures.get(this.cle(pose, retourne))
    if (!texture) return
    o.sprite.texture = texture
    o.sprite.setSize(TAILLE_OISEAU, TAILLE_OISEAU * RATIO_POSE)
  }

  /* -------------------------------------------------------------- peupler */

  private occupees(): Place[] {
    return this.oiseaux
      .filter((o) => o.etat !== 'sol')
      .map((o) => ({ fil: o.fil, u: o.u }))
  }

  /**
   * Les oiseaux posés **dans ce qu'on voit**.
   *
   * Le quota se compte sur le champ visible, pas sur l'île entière : sur un
   * téléphone on ne voit qu'un quart des fils, et des oiseaux hors cadre
   * rempliraient un quota qui n'enverrait jamais personne là où on regarde.
   */
  private surLesFils(): number {
    return this.oiseaux.filter(
      (o) => o.etat !== 'sol' && o.u >= this.champ.uMin && o.u <= this.champ.uMax,
    ).length
  }

  private get places(): number {
    return placesTenables(this.champ.uMax - this.champ.uMin)
  }

  private semer(): void {
    for (let i = 0; i < this.places; i += 1) {
      const place = placeLibre(this.occupees(), FILS.length, this.champ, this.r)
      if (!place) break
      this.ajouter(place, 'pose')
    }
  }

  private ajouter(place: Place, etat: Etat): void {
    const sprite = new Sprite()
    sprite.anchor.set(0.5, 1)
    this.corps.addChild(sprite)
    const o: Oiseau = {
      etat,
      fil: place.fil,
      u: place.u,
      xIle: 0,
      y: 0,
      vy: 0,
      rot: 0,
      t: 0,
      sens: this.r() < 0.5 ? -1 : 1,
      ebouriffeJusqu: 0,
      prochainGeste: prochainGeste(this.horloge, this.r),
      pasDepart: place.u,
      pasCible: place.u,
      pasReste: 0,
      depart: etat === 'arrivee' ? this.bordLePlusProche(place) : null,
      regard: false,
      sprite,
    }
    this.oiseaux.push(o)
    this.habiller(o)
  }

  /* ---------------------------------------------------------- interaction */

  /** Un clic, en pixels de cadre. Rend `true` s'il a touché un oiseau posé. */
  /**
   * D'où un oiseau arrive : le bord **le plus proche** de sa place.
   *
   * Les deux bords de l'installation sont à `-u(220)` et à
   * `travees × u(620) + u(220)` — avec trois poteaux, près de 2630 px de scène
   * les séparent. Tirés au hasard, un oiseau qui se posait à gauche et partait
   * de droite traversait toute la scène, et en `DUREE_VOL` **fixe** : d'où le
   * trait qui passait de temps à autre, à toutes les gares, et vite (signalé
   * par la propriétaire le 22 novembre 2026 — la boucle `avancer` tourne
   * partout, pas seulement à « plus loin »).
   *
   * Par le bord le plus proche, le vol le plus long vaut la moitié de
   * l'installation plus la marge, et la vitesse redevient celle d'un oiseau qui
   * se pose plutôt que d'un trait qui passe.
   */
  private bordLePlusProche(place: Place): { x: number; y: number } {
    const cible = this.cables.positionSur(place.fil, place.u)
    const gauche = -u(220)
    const droite = this.cables.travees * u(620) + u(220)
    const x = cible.x - gauche <= droite - cible.x ? gauche : droite
    return { x, y: cible.y - u(90) }
  }

  /**
   * L'oiseau posé sous ce point, s'il y en a un. Ne touche à rien : c'est la
   * même question pour l'appui qui le fait tomber et pour le curseur qui dit
   * qu'on peut le faire tomber — deux réponses différentes seraient un
   * mensonge à la main qui vise.
   */
  private vise(x: number, y: number): Oiseau | null {
    let trouve: Oiseau | null = null
    let meilleure = TAILLE_OISEAU * 0.6
    for (const o of this.oiseaux) {
      if (o.etat !== 'pose') continue
      const p = this.cables.positionSur(o.fil, o.u)
      const d = Math.hypot(p.x - x, p.y - (TAILLE_OISEAU * RATIO_POSE) / 2 - y)
      if (d < meilleure) {
        meilleure = d
        trouve = o
      }
    }
    return trouve
  }

  /** Y a-t-il un oiseau sous ce point ? La question que pose le curseur. */
  survole(x: number, y: number): boolean {
    return this.vise(x, y) !== null
  }

  cliquer(x: number, y: number): boolean {
    const vise = this.vise(x, y)
    if (!vise) return false
    this.lacher(vise)
    return true
  }

  /** Sans viser : le chemin du clavier. */
  faireTomberUn(): boolean {
    const poses = this.oiseaux.filter((o) => o.etat === 'pose')
    if (!poses.length) return false
    this.lacher(poses[Math.floor(this.r() * poses.length)])
    return true
  }

  private lacher(o: Oiseau): void {
    this.cables.secouer(o.fil, o.u, u(5))
    o.regard = this.variante.regard
    o.t = 0
    // En mouvement réduit, la chute n'a pas lieu : la réplique, si. Le contenu
    // est le but, la chute est le plaisir (cadrage §14).
    if (!this.reducedMotion) {
      o.etat = this.variante.pirouette ? 'pirouette' : 'chute'
      o.vy = -u(34)
      this.habiller(o)
    }
    this.surChute?.()
  }

  /* ---------------------------------------------------------------- boucle */

  avancer(dt: number): void {
    this.horloge += dt

    if (this.surLesFils() < this.places && this.horloge >= this.prochaineArrivee) {
      const place = placeLibre(this.occupees(), FILS.length, this.champ, this.r)
      if (place) this.ajouter(place, 'arrivee')
      this.prochaineArrivee = this.horloge + 1.2 + this.r() * 1.2
    }

    for (const o of this.oiseaux) {
      o.t += dt
      if (o.etat === 'pose') this.vivre(o, dt)
      else if (o.etat === 'pirouette') this.pirouetter(o)
      else if (o.etat === 'chute') this.tomber(o, dt)
      else if (o.etat === 'arrivee') this.arriver(o)
      this.poser(o)
    }

    this.elaguer()
    this.dessinerEtoiles()
  }

  private vivre(o: Oiseau, dt: number): void {
    if (!this.reducedMotion) this.gesticuler(o)
    let bond = 0
    if (o.pasReste > 0) {
      o.pasReste = Math.max(0, o.pasReste - dt)
      const k = avancementDuPas(o.pasReste)
      o.u = o.pasDepart + (o.pasCible - o.pasDepart) * k
      // Un petit saut au milieu : c'est ce qui en fait un pas et non un glissé.
      bond = Math.sin(k * Math.PI) * u(6)
      if (o.pasReste === 0) {
        o.u = o.pasCible
        this.cables.secouer(o.fil, o.u, u(2.2))
      }
    }
    const p = this.cables.positionSur(o.fil, o.u)
    o.xIle = p.x - this.cables.decalage
    o.y = p.y - bond
    o.rot = this.reducedMotion ? 0 : Math.sin(this.horloge * 1.7 + o.u) * 0.02
  }

  private gesticuler(o: Oiseau): void {
    if (this.horloge > o.prochainGeste && o.pasReste <= 0) {
      o.prochainGeste = prochainGeste(this.horloge, this.r)
      const geste = choisirGeste(this.r)
      if (geste === 'demi-tour') o.sens = o.sens === 1 ? -1 : 1
      else if (geste === 'ebouriffe') o.ebouriffeJusqu = this.horloge + 0.9 + this.r() * 0.9
      else {
        const travee = Math.floor(o.u)
        const pas = (this.r() < 0.5 ? -1 : 1) * (0.015 + this.r() * 0.03)
        const cible = Math.min(travee + 0.92, Math.max(travee + 0.08, o.u + pas))
        const gene = this.oiseaux.some(
          (a) => a !== o && a.etat !== 'sol' && a.fil === o.fil && Math.abs(a.u - cible) < 0.12,
        )
        if (!gene) {
          // Il marche : le poser d'un coup à sa nouvelle place se lit comme
          // une téléportation, pas comme un pas.
          o.sens = cible > o.u ? 1 : -1
          o.pasDepart = o.u
          o.pasCible = cible
          o.pasReste = DUREE_PAS
        }
      }
      this.habiller(o)
    } else if (o.ebouriffeJusqu > 0 && o.ebouriffeJusqu < this.horloge) {
      o.ebouriffeJusqu = 0
      this.habiller(o)
    }
  }

  private pirouetter(o: Oiseau): void {
    const k = Math.min(1, o.t / PIROUETTE)
    const p = this.cables.positionSur(o.fil, o.u)
    o.xIle = p.x - this.cables.decalage
    o.y = p.y - Math.sin(k * Math.PI) * u(10)
    o.rot = k * Math.PI * 2
    if (o.t >= PIROUETTE) {
      o.etat = 'chute'
      o.t = 0
      o.rot = 0
      o.vy = -u(34)
    }
  }

  private tomber(o: Oiseau, dt: number): void {
    o.vy += u(620) * dt
    o.y += o.vy * dt
    o.rot = Math.min(Math.PI, o.rot + dt * 9)
    if (o.y >= SOL) {
      o.y = SOL
      // Pas de rotation au sol : la bosse porte déjà son retournement, et la
      // faire tourner montrerait sa base plate.
      o.rot = 0
      o.etat = 'sol'
      o.t = 0
      this.habiller(o)
    }
  }

  private arriver(o: Oiseau): void {
    const k = Math.min(1, o.t / DUREE_VOL)
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
    const cible = this.cables.positionSur(o.fil, o.u)
    const d = o.depart ?? cible
    const x = d.x + (cible.x - d.x) * e
    o.xIle = x - this.cables.decalage
    o.y = d.y + (cible.y - d.y) * e - Math.sin(k * Math.PI) * u(40)
    o.sens = cible.x > d.x ? 1 : -1
    this.habiller(o)
    if (k >= 1) {
      o.etat = 'pose'
      o.depart = null
      this.cables.secouer(o.fil, o.u, u(3.5))
      this.habiller(o)
    }
  }

  private poser(o: Oiseau): void {
    const haut = TAILLE_OISEAU * RATIO_POSE
    const x = o.etat === 'sol' ? this.cables.decalage + o.xIle : o.xIle + this.cables.decalage
    // L'ancre est aux pattes : en culbutant, le corps passerait sous le sol.
    o.sprite.position.set(x, o.y - (haut * (1 - Math.cos(o.rot))) / 2)
    o.sprite.rotation = o.rot
  }

  /** Au-delà de la butée, la plus ancienne bosse s'en va. */
  private elaguer(): void {
    const sol = this.oiseaux.filter((o) => o.etat === 'sol')
    for (let i = 0; i < sol.length - CORPS_MAX; i += 1) {
      const vieux = sol[i]
      this.oiseaux.splice(this.oiseaux.indexOf(vieux), 1)
      vieux.sprite.destroy()
    }
  }

  /** Les trois étoiles qui tournent au-dessus d'un sonné tout frais. */
  private dessinerEtoiles(): void {
    const g = this.etoiles
    g.clear()
    const cellule = Math.max(1, 1.5 / this.parCadre)
    let une = false
    for (const o of this.oiseaux) {
      if (o.etat !== 'sol' || o.t > dureeAuSol(o.regard)) continue
      une = true
      const cx = this.cables.decalage + o.xIle
      const cy = o.y - TAILLE_OISEAU * 0.42
      for (let i = 0; i < 3; i += 1) {
        const a = this.horloge * 5 + i * 2.09
        const px = cx + Math.cos(a) * u(16)
        const py = cy + Math.sin(a) * u(5)
        g.rect(px - cellule / 2, py - cellule * 2, cellule, cellule * 4)
        g.rect(px - cellule * 2, py - cellule / 2, cellule * 4, cellule)
      }
    }
    if (une) g.fill({ color: GRIS, alpha: 0.85 })
  }

  destroy(): void {
    this.detruit = true
    for (const t of this.textures.values()) t.destroy(true)
    this.textures.clear()
    this.racine.destroy({ children: true })
  }
}

/** Le cadre d'une pose, réexporté pour que la scène n'ait pas à le deviner. */
export { CADRE_POSE }
