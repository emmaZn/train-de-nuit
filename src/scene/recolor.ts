import { Filter, GlProgram, UniformGroup, defaultFilterVert } from 'pixi.js'

/** Rec. 709 luminance, the weights used by the shader below. */
const LUMA = [0.2126, 0.7152, 0.0722] as const

type Rgb = [number, number, number]

/** Les deux pôles du jour : le papier sur le sol, l'encre sur le trait. */
export type PolesJour = { papier: Rgb; encre: Rgb }

/** #F2EEE6, le papier choisi le 25/11, et #151517, la teinte encre. */
export const PAPIER = 0xf2eee6
export const ENCRE = 0x151517

export function luminance(rgb: Rgb): number {
  return (LUMA[0] * rgb[0] + LUMA[1] * rgb[1] + LUMA[2] * rgb[2]) / 255
}

/**
 * The one rule of the whole project (CONCEPT.md §6): in every asset, black
 * becomes the background colour. White stays white, greys blend. This is the
 * CPU twin of the shader, kept honest by the tests.
 *
 * Avec `jour`, la règle gagne sa seconde borne : ce que la nuit aurait rendu
 * est remappé entre le papier et l'encre. Le remappage est **normalisé par la
 * luminance du fond** — sans quoi un pixel de sol, qui vaut 0,083 et non 0,
 * retomberait sur un gris au lieu du papier, et le corps plein du train
 * deviendrait un pavé gris sur une page plus claire.
 */
export function recolorPixel(rgb: Rgb, fond: Rgb, jour?: PolesJour): Rgb {
  const l = luminance(rgb)
  const nuit: Rgb = [
    fond[0] + (rgb[0] - fond[0]) * l,
    fond[1] + (rgb[1] - fond[1]) * l,
    fond[2] + (rgb[2] - fond[2]) * l,
  ]
  if (!jour) return [Math.round(nuit[0]), Math.round(nuit[1]), Math.round(nuit[2])]

  const sol = luminance(fond)
  const t = Math.min(1, Math.max(0, (luminance(nuit) - sol) / (1 - sol)))
  const { papier, encre } = jour
  return [
    Math.round(papier[0] + (encre[0] - papier[0]) * t),
    Math.round(papier[1] + (encre[1] - papier[1]) * t),
    Math.round(papier[2] + (encre[2] - papier[2]) * t),
  ]
}

export function hexToUnit(hex: number): Rgb {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255]
}

const FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec3 uFond;
uniform vec3 uPapier;
uniform vec3 uEncre;
uniform float uSol;
uniform float uJour;

void main(void)
{
    vec4 texel = texture(uTexture, vTextureCoord);

    // A Pixi v8 filter receives premultiplied input. Mixing it as is would give
    // every transparent texel the background colour, and the sprite would then
    // show inside a visible rectangle. So: unpremultiply, mix, remultiply.
    float a = max(texel.a, 1e-5);
    vec3 straight = texel.rgb / a;

    float lum = dot(straight, vec3(${LUMA[0]}, ${LUMA[1]}, ${LUMA[2]}));
    vec3 nuit = mix(uFond, straight, lum);

    // Le jour est le négatif de la nuit, remis à plat entre le papier et
    // l'encre. uSol = lum(uFond) : sans cette normalisation le sol retombe sur
    // un gris, et le corps plein du train devient un pavé.
    float n = dot(nuit, vec3(${LUMA[0]}, ${LUMA[1]}, ${LUMA[2]}));
    float t = clamp((n - uSol) / (1.0 - uSol), 0.0, 1.0);
    vec3 jour = mix(uPapier, uEncre, t);

    vec3 recoloured = mix(nuit, jour, uJour);

    finalColor = vec4(recoloured * texel.a, texel.a);
}
`

/** The uniform group of each filter, so callers never touch `filter.resources`. */
const groups = new WeakMap<Filter, UniformGroup>()

export function createRecolorFilter(
  fond: number,
  papier: number = PAPIER,
  encre: number = ENCRE,
): Filter {
  const unite = hexToUnit(fond)
  const uniforms = new UniformGroup({
    uFond: { value: new Float32Array(unite), type: 'vec3<f32>' },
    uPapier: { value: new Float32Array(hexToUnit(papier)), type: 'vec3<f32>' },
    uEncre: { value: new Float32Array(hexToUnit(encre)), type: 'vec3<f32>' },
    uSol: { value: solDe(unite), type: 'f32' },
    uJour: { value: 0, type: 'f32' },
  })
  const filter = new Filter({
    glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: FRAGMENT, name: 'recolor' }),
    resources: { recolorUniforms: uniforms },
  })
  groups.set(filter, uniforms)
  return filter
}

/** La luminance du fond, en unités shader. Calculée à l'envoi, pas par pixel. */
function solDe(unite: Rgb): number {
  return LUMA[0] * unite[0] + LUMA[1] * unite[1] + LUMA[2] * unite[2]
}

export function setRecolorFond(filter: Filter, fond: number): void {
  const uniforms = groups.get(filter)
  if (!uniforms) return
  const value = uniforms.uniforms.uFond as Float32Array
  const unite = hexToUnit(fond)
  value[0] = unite[0]
  value[1] = unite[1]
  value[2] = unite[2]
  uniforms.uniforms.uSol = solDe(unite)
  uniforms.update()
}

/** L'interrupteur du mode : un uniforme, donc un seul changement d'état par bascule. */
export function setRecolorMode(filter: Filter, jour: boolean): void {
  const uniforms = groups.get(filter)
  if (!uniforms) return
  uniforms.uniforms.uJour = jour ? 1 : 0
  uniforms.update()
}
