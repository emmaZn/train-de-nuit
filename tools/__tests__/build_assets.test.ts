import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Alpha uniforme des images de montagne de fixture, voir tools/make_fixtures.py */
const FIXTURE_ALPHA = 160
/** Bord gauche de la 2e image de locomotive : c'est l'union, pas la 1re (600). */
const UNION_LEFT = 580

let out: string
let manifest: any

beforeAll(() => {
  const tmp = mkdtempSync(join(tmpdir(), 'train-assets-'))
  const src = join(tmp, 'src')
  out = join(tmp, 'out')
  execFileSync('python3', ['-I', 'tools/make_fixtures.py', src])
  execFileSync('python3', [
    '-I', 'tools/build_assets.py',
    '--src', src, '--out', out,
    '--mountain-width', '64', '--train-scale', '0.1',
  ])
  manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'))
}, 60_000)

function pixel(file: string, x: number, y: number) {
  const code =
    'import sys\n' +
    'from PIL import Image\n' +
    'im = Image.open(sys.argv[1]).convert("RGB")\n' +
    'print(*im.getpixel((int(sys.argv[2]), int(sys.argv[3]))))\n'
  const [r, g, b] = execFileSync('python3', ['-I', '-c', code, file, String(x), String(y)])
    .toString().trim().split(/\s+/).map(Number)
  return { r, g, b }
}

test('le pipeline écrit un manifeste et les WebP attendus', () => {
  expect(manifest.stage).toEqual({ width: 2320, height: 1217 })
  expect(manifest.mountains.count).toBe(2)
  expect(manifest.mountains.width).toBe(64)
  expect(manifest.train.loco.count).toBe(2)
  expect(existsSync(join(out, 'mountains/0001.webp'))).toBe(true)
  expect(existsSync(join(out, 'train/loco/0002.webp'))).toBe(true)
})

test('la bbox du train est l’union de la séquence, pas celle de la première image', () => {
  expect(manifest.train.loco.x).toBe(UNION_LEFT)
})

test('les rails sortent avec leur propre cadrage', () => {
  expect(manifest.rails.x).toBe(770)
  expect(manifest.rails.y).toBe(921)
  expect(existsSync(join(out, 'train/rails.webp'))).toBe(true)
})

test('les images de montagne portent l’alpha source dans leur luminance', () => {
  // Pillow réécrit un L en RGB à l’enregistrement WebP : on vérifie l’égalité
  // des trois canaux et la valeur, pas le mode déclaré.
  const px = pixel(join(out, 'mountains/0001.webp'), 10, 5)
  expect(px.r).toBe(px.g)
  expect(px.g).toBe(px.b)
  expect(px.r).toBeCloseTo(FIXTURE_ALPHA, -1)
})
