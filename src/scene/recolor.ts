import { Filter, GlProgram, UniformGroup, defaultFilterVert } from 'pixi.js'

/** Rec. 709 luminance, the weights used by the shader below. */
const LUMA = [0.2126, 0.7152, 0.0722] as const

type Rgb = [number, number, number]

export function luminance(rgb: Rgb): number {
  return (LUMA[0] * rgb[0] + LUMA[1] * rgb[1] + LUMA[2] * rgb[2]) / 255
}

/**
 * The one rule of the whole project (CONCEPT.md §6): in every asset, black
 * becomes the background colour. White stays white, greys blend. This is the
 * CPU twin of the shader, kept honest by the tests.
 */
export function recolorPixel(rgb: Rgb, fond: Rgb): Rgb {
  const l = luminance(rgb)
  return [
    Math.round(fond[0] + (rgb[0] - fond[0]) * l),
    Math.round(fond[1] + (rgb[1] - fond[1]) * l),
    Math.round(fond[2] + (rgb[2] - fond[2]) * l),
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

void main(void)
{
    vec4 texel = texture(uTexture, vTextureCoord);

    // A Pixi v8 filter receives premultiplied input. Mixing it as is would give
    // every transparent texel the background colour, and the sprite would then
    // show inside a visible rectangle. So: unpremultiply, mix, remultiply.
    float a = max(texel.a, 1e-5);
    vec3 straight = texel.rgb / a;

    float lum = dot(straight, vec3(${LUMA[0]}, ${LUMA[1]}, ${LUMA[2]}));
    vec3 recoloured = mix(uFond, straight, lum);

    finalColor = vec4(recoloured * texel.a, texel.a);
}
`

/** The uniform group of each filter, so callers never touch `filter.resources`. */
const groups = new WeakMap<Filter, UniformGroup>()

export function createRecolorFilter(fond: number): Filter {
  const uniforms = new UniformGroup({
    uFond: { value: new Float32Array(hexToUnit(fond)), type: 'vec3<f32>' },
  })
  const filter = new Filter({
    glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment: FRAGMENT, name: 'recolor' }),
    resources: { recolorUniforms: uniforms },
  })
  groups.set(filter, uniforms)
  return filter
}

export function setRecolorFond(filter: Filter, fond: number): void {
  const uniforms = groups.get(filter)
  if (!uniforms) return
  const value = uniforms.uniforms.uFond as Float32Array
  const [r, g, b] = hexToUnit(fond)
  value[0] = r
  value[1] = g
  value[2] = b
  uniforms.update()
}
