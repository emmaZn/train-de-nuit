/**
 * Le massif, porté depuis blender/massif.py (--style points --tour).
 *
 * Rien ici n'est réglé à l'œil : la géométrie, la caméra et le tramage
 * reprennent un à un les réglages du script de rendu. La seule chose qui
 * change, c'est que le navigateur le calcule à sa propre résolution — d'où
 * la netteté, et un grain qui garde sa taille sur tous les écrans.
 */
import {
  BufferAttribute,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three'

import type { Bornes } from './layout'
import { ECHELLE_MASSIF, ORTHO } from './layout'

// ---- le terrain (massif.py : grid size=1, scale 14, displace strength 3.1)
export const COTE = 14
export const RELIEF = 3.1
export const MAILLE = 512

// ---- le fondu du tour complet : aucun bord du terrain ne doit se voir
export const FONDU_AVANT = 0.18
export const FONDU_COTE = 0.08
export const FONDU_COURBE = 1.5

// ---- la caméra (ortho, presque à l'horizontale)
export const CAMERA = { x: 0, y: -30, z: 2.3, pitch: 88.5, compensation: 1.71 } as const
export const CADRE = { width: 3840, height: 944 } as const

// ---- le tramage
//
// Les quatre valeurs qui suivent ne sont pas les defauts de massif.py : les
// options du rendu n'ont ete notees nulle part, donc on les a retrouvees en
// mesurant ta sequence. Pour chaque candidat on compare la densite de points
// par blocs de 32 px avec les images 0001, 0046 et 0091 ; ce jeu-la donne
// 0.925 / 0.940 / 0.935 de correlation et la bonne densite a 6 % pres.
//
// Le plus important est le signe du soleil : il eclaire depuis la gauche,
// quand le defaut du script l'envoie a droite. Inverser ce seul signe fait
// passer la correlation de 0.18 a 0.76 — c'est le reglage a ne pas perdre.
export const SOLEIL = new Vector3(-1, -0.5, 0.35).normalize()
export const OMBRE = 0.45
export const PLEIN = 0.9
export const CONTRASTE = 2.2
export const CRETES = 0.25
/**
 * Taille d'une cellule de grain, **en pixels d'ecran**.
 *
 * massif.py exprime la meme chose en pixels d'un rendu de 3840 px de large
 * (`k = LARGEUR / 15 / GRAIN`), ce qui revient a TAILLE_BLENDER ci-dessous.
 * Ici on la dit directement : c'est un choix d'oeil, et le formuler dans
 * l'unite ou il se juge evite de se tromper d'un facteur 1.5.
 *
 * Sous le pixel, une cellule qui glisse est reechantillonnee a chaque image
 * et le point se rallume ailleurs : plus la cellule est grosse, plus le nuage
 * est stable en rotation, et plus les points sont gros.
 */
export const GRAIN_ECRAN = 1.5

/** Ce que donnait ton rendu Blender : 3840 / 15 / 2 = 128 grains par unite. */
export const TAILLE_BLENDER = (15 * 2) / (ORTHO / ECHELLE_MASSIF)
export const GRIS = 237 / 255

/** Le relief, recomposé depuis les deux canaux, sur l'échelle 0..1 de Blender. */
export function decoder(octets: Uint8ClampedArray, largeur: number, hauteur: number): Float32Array {
  const h = new Float32Array(largeur * hauteur)
  for (let i = 0; i < h.length; i += 1) {
    h[i] = (octets[i * 4] * 256 + octets[i * 4 + 1]) / 65535
  }
  return h
}

function retombee(t: number, bord: number): number {
  return Math.min(Math.max(Math.min(t, 1 - t) / bord, 0), 1) ** FONDU_COURBE
}

/** La carte retombe à zéro sur ses quatre côtés, sans quoi le tour la montre. */
export function fondusDuTour(carte: Float32Array, largeur: number, hauteur: number): Float32Array {
  const h = new Float32Array(carte.length)
  for (let y = 0; y < hauteur; y += 1) {
    const fy = retombee(y / (hauteur - 1), FONDU_AVANT)
    for (let x = 0; x < largeur; x += 1) {
      h[y * largeur + x] = carte[y * largeur + x] * fy * retombee(x / (largeur - 1), FONDU_COTE)
    }
  }
  return h
}

/**
 * Hauteur en (u, v), interpolée. v se mesure depuis le bas du terrain, comme
 * les UV de Blender : la première ligne du PNG est donc le fond de la scène.
 */
export function echantillonner(
  carte: Float32Array, largeur: number, hauteur: number, u: number, v: number,
): number {
  const fx = Math.min(Math.max(u, 0), 1) * (largeur - 1)
  const fy = (1 - Math.min(Math.max(v, 0), 1)) * (hauteur - 1)
  const x0 = Math.min(Math.floor(fx), largeur - 1)
  const y0 = Math.min(Math.floor(fy), hauteur - 1)
  const x1 = Math.min(x0 + 1, largeur - 1)
  const y1 = Math.min(y0 + 1, hauteur - 1)
  const tx = fx - x0
  const ty = fy - y0
  const h00 = carte[y0 * largeur + x0]
  const h10 = carte[y0 * largeur + x1]
  const h01 = carte[y1 * largeur + x0]
  const h11 = carte[y1 * largeur + x1]
  return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty
}

/**
 * La grille déplacée. On calcule les sommets et les normales une fois pour
 * toutes : le terrain ne bouge jamais, seul le pivot tourne. Les normales
 * viennent du maillage, pas de la carte — c'est le maillage que Blender
 * éclaire, et un relief plus fin changerait le tramage.
 */
export function geometrieMassif(
  carte: Float32Array, largeur: number, hauteur: number, maille = MAILLE,
): PlaneGeometry {
  const g = new PlaneGeometry(COTE, COTE, maille, maille)
  const p = g.getAttribute('position') as BufferAttribute
  const lisse = fondusDuTour(carte, largeur, hauteur)
  for (let i = 0; i < p.count; i += 1) {
    const u = p.getX(i) / COTE + 0.5
    const v = p.getY(i) / COTE + 0.5
    p.setZ(i, RELIEF * echantillonner(lisse, largeur, hauteur, u, v))
  }
  p.needsUpdate = true
  g.computeVertexNormals()
  return g
}

/**
 * Grains par unité de scène, pour un cadre large de `largeurPixels`.
 *
 * Se cale sur la largeur réellement rendue : une cellule garde ainsi la même
 * taille à l'écran quelle que soit la densité de pixels. Sans ça, elle
 * passerait sous le pixel sur un écran dense et le nuage grouillerait.
 */
export function grainsParUnite(largeurPixels: number, grain = GRAIN_ECRAN): number {
  return largeurPixels / (ORTHO / ECHELLE_MASSIF) / grain
}

const VERTEX = /* glsl */ `
varying vec3 vObjet;
varying vec3 vNormale;
varying float vZ;

void main() {
    vObjet = position;
    vec4 monde = modelMatrix * vec4(position, 1.0);
    vNormale = mat3(modelMatrix) * normal;
    vZ = monde.z;
    gl_Position = projectionMatrix * viewMatrix * monde;
}
`

const FRAGMENT = /* glsl */ `
precision highp float;
precision highp int;

uniform vec3 uSoleil;
uniform vec3 uVersCamera;
uniform float uGrain;
uniform float uOmbre;
uniform float uPlein;
uniform float uContraste;
uniform float uCretes;
uniform float uGris;

varying vec3 vObjet;
varying vec3 vNormale;
varying float vZ;

// En GLSL 3, la sortie se declare : il n'y a plus de gl_FragColor.
layout(location = 0) out vec4 couleur;

// Les cellules vont jusqu'a +-900 : un hash en sinus y ferait des moires.
float alea(vec3 cellule) {
    uvec3 c = uvec3(ivec3(floor(cellule)) + 4096);
    uint n = c.x * 73856093u ^ c.y * 19349663u ^ c.z * 83492791u;
    n ^= n >> 16u; n *= 0x7feb352du;
    n ^= n >> 15u; n *= 0x846ca68bu;
    n ^= n >> 16u;
    return float(n) / 4294967296.0;
}

// Map Range de Blender : borne la sortie entre les deux extremes.
float plage(float x, float d0, float d1, float a0, float a1) {
    return a0 + clamp((x - d0) / (d1 - d0), 0.0, 1.0) * (a1 - a0);
}

void main() {
    vec3 n = normalize(vNormale);

    // Layer Weight (melange .5) : 1 - |N . V|, donc les faces vues de biais.
    float pw = pow(1.0 - abs(dot(n, uVersCamera)), 3.0);

    // La dalle plate autour du massif n'existe pas dans le rendu.
    float sol = plage(vZ, 0.01, 0.12, 0.0, 1.0);

    float rampe = plage(dot(n, uSoleil), uOmbre, 0.95, 0.015, uPlein);
    float total = clamp(pow(rampe, uContraste) + pw * uCretes, 0.0, 1.0) * sol;

    // Un point est tout blanc ou absent. Les absents restent opaques pour la
    // profondeur : c'est le Holdout, et c'est ce qui cache les cretes du fond.
    float allume = alea(vObjet * uGrain) < total ? 1.0 : 0.0;
    couleur = vec4(vec3(uGris) * allume, allume);
}
`

export function materiauMassif(largeurPixels: number = CADRE.width): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    glslVersion: '300 es',
    transparent: false,
    depthTest: true,
    depthWrite: true,
    uniforms: {
      uSoleil: { value: SOLEIL.clone() },
      uVersCamera: { value: new Vector3(0, 0, 1) },
      uGrain: { value: grainsParUnite(largeurPixels) },
      uOmbre: { value: OMBRE },
      uPlein: { value: PLEIN },
      uContraste: { value: CONTRASTE },
      uCretes: { value: CRETES },
      uGris: { value: GRIS },
    },
  })
}

/** Le frustum centré du cadre Blender, tel que ton script le cadre. */
export function bornesSymetriques(
  largeurPixels: number, hauteurPixels: number, echelle = ECHELLE_MASSIF,
): Bornes {
  const demi = ORTHO / echelle / 2
  const h = (demi * hauteurPixels) / largeurPixels
  return { left: -demi, right: demi, top: h, bottom: -h }
}

/**
 * La caméra de ton script, posée telle quelle — seules les bornes varient,
 * pour ne montrer que la part du cadre qu'on voit à l'écran.
 */
export function cameraMassif(bornes: Bornes, echelle = ECHELLE_MASSIF): OrthographicCamera {
  const c = new OrthographicCamera(bornes.left, bornes.right, bornes.top, bornes.bottom, 1, 100)
  c.position.set(CAMERA.x, CAMERA.y, CAMERA.z + (1 / echelle - 1) * CAMERA.compensation)
  c.rotation.set((CAMERA.pitch * Math.PI) / 180, 0, 0)
  c.updateMatrixWorld()
  return c
}

export class Massif {
  readonly scene = new Scene()
  readonly renderer: WebGLRenderer
  camera: OrthographicCamera
  private readonly maillage: Mesh
  private readonly materiau: ShaderMaterial

  constructor(
    canvas: HTMLCanvasElement, carte: Float32Array, largeur: number, hauteur: number,
    maille = MAILLE,
  ) {
    // Cycles tire un seul echantillon avec un filtre de .01 : le rendu est
    // ponctuel, et tout lissage effacerait justement le grain.
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false })
    this.renderer.setClearColor(0x000000, 0)
    this.materiau = materiauMassif(canvas.width)
    this.maillage = new Mesh(geometrieMassif(carte, largeur, hauteur, maille), this.materiau)
    this.scene.add(this.maillage)
    this.camera = cameraMassif(bornesSymetriques(canvas.width, canvas.height))
    this.orienterCamera()
  }

  /** Ce que le GPU accepte vraiment : 4096 sur téléphone, bien plus ailleurs. */
  get tailleMax(): number {
    return this.renderer.capabilities.maxTextureSize
  }

  private orienterCamera() {
    // Camera orthographique : la direction du regard est la meme partout.
    const v = new Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion)
    ;(this.materiau.uniforms.uVersCamera.value as Vector3).copy(v)
  }

  /**
   * Taille du rendu, part de la scène montrée, et largeur du cadre Blender en
   * pixels — c'est elle qui fixe le grain, pas la taille du canvas.
   */
  cadrer(largeurPixels: number, hauteurPixels: number, bornes: Bornes, largeurCadre: number) {
    this.renderer.setSize(largeurPixels, hauteurPixels, false)
    this.camera = cameraMassif(bornes)
    this.orienterCamera()
    this.materiau.uniforms.uGrain.value = grainsParUnite(largeurCadre)
  }

  tourner(tours: number) {
    this.maillage.rotation.z = tours * Math.PI * 2
  }

  rendre() {
    this.renderer.render(this.scene, this.camera)
  }

  detruire() {
    this.maillage.geometry.dispose()
    this.materiau.dispose()
    // Sans ça, chaque rechargement à chaud laisse un contexte WebGL derrière
    // lui, et le navigateur finit par refuser d'en créer un de plus.
    this.renderer.forceContextLoss()
    this.renderer.dispose()
  }
}
