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
  expect(manifest.mountains.count).toBe(4)
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

// Les gares sont servies sur /ici, /plus-loin, … : un chemin relatif serait
// résolu contre la route courante et donnerait /ici/assets/…, qui n'existe pas.
test('les chemins du manifeste sont absolus', () => {
  expect(manifest.mountains.path.startsWith('/')).toBe(true)
  expect(manifest.rails.path.startsWith('/')).toBe(true)
  expect(manifest.train.loco.path.startsWith('/')).toBe(true)
})

// x/y étaient en pixels sources et width/height en pixels de sortie : le train
// se dessinait à la moitié de sa taille. Tout le manifeste parle désormais en
// pixels du cadre 2320 x 1217, et `scale` dit ce qui a été appliqué aux fichiers.
test('le manifeste décrit le train en pixels du cadre, pas en pixels de sortie', () => {
  // bbox d'union des fixtures : 580..1710 en x, 400..900 en y
  expect(manifest.train.loco.width).toBe(1130)
  expect(manifest.train.loco.height).toBe(500)
  expect(manifest.train.loco.scale).toBe(0.1)
})

test('les rails aussi sont décrits en pixels du cadre', () => {
  expect(manifest.rails.width).toBe(1127)
  expect(manifest.rails.height).toBe(38)
  expect(manifest.rails.scale).toBe(0.1)
})


// PTITRAIN_blanc n'a pas de dossier 01_rails : le pipeline doit prendre la
// voie dans la version de secours plutôt que de produire un manifeste sans
// rails, qui ferait disparaître la voie de la scène.
describe('une autre version du train', () => {
  let autre: any

  beforeAll(() => {
    const tmp = mkdtempSync(join(tmpdir(), 'train-traits-'))
    const src = join(tmp, 'src')
    const sortie = join(tmp, 'out')
    execFileSync('python3', ['-I', 'tools/make_fixtures.py', src])
    execFileSync('python3', [
      '-I', 'tools/build_assets.py',
      '--src', src, '--out', sortie,
      '--train-src', 'PTITRAIN_traits',
      '--mountain-width', '64', '--train-scale', '0.1',
    ])
    autre = JSON.parse(readFileSync(join(sortie, 'manifest.json'), 'utf8'))
  }, 60_000)

  test('--train-src choisit la version du train', () => {
    expect(autre.train.loco.count).toBe(2)
    expect(autre.train.loco.x).toBe(UNION_LEFT)
  })

  test('la voie est reprise ailleurs quand la version choisie n’en a pas', () => {
    expect(autre.rails).toBeDefined()
    expect(autre.rails.x).toBe(770)
    expect(autre.rails.y).toBe(921)
  })
})


// La nouvelle source est en WebP, dans un autre dossier, et on veut pouvoir
// n'en garder qu'une image sur deux : le fondu rend la difference invisible
// et c'est ce qui ramene le poids a quelque chose de tenable.
describe('une autre source de montagnes', () => {
  let autre: any

  beforeAll(() => {
    const tmp = mkdtempSync(join(tmpdir(), 'train-hd-'))
    const src = join(tmp, 'src')
    const sortie = join(tmp, 'out')
    execFileSync('python3', ['-I', 'tools/make_fixtures.py', src])
    execFileSync('python3', [
      '-I', 'tools/build_assets.py',
      '--src', src, '--out', sortie,
      '--mountain-src', 'montagne_hd',
      '--mountain-step', '2',
      '--mountain-width', '64', '--train-scale', '0.1',
    ])
    autre = JSON.parse(readFileSync(join(sortie, 'manifest.json'), 'utf8'))
  }, 60_000)

  test('--mountain-src lit une autre source, même en WebP', () => {
    expect(autre.mountains).toBeDefined()
    expect(autre.mountains.width).toBe(64)
  })

  test('--mountain-step ne garde qu’une image sur deux', () => {
    expect(autre.mountains.count).toBe(2)
  })
})


// Le tramage est un nuage de points d'un pixel. Ni un reencodage avec perte
// ni un redimensionnement ne les laisse intacts : le pipeline doit savoir les
// recopier a l'identique.
describe('une source en nuage de points', () => {
  let sortie: string
  let src: string

  beforeAll(() => {
    const tmp = mkdtempSync(join(tmpdir(), 'train-points-'))
    src = join(tmp, 'src')
    sortie = join(tmp, 'out')
    execFileSync('python3', ['-I', 'tools/make_fixtures.py', src])
    execFileSync('python3', [
      '-I', 'tools/build_assets.py',
      '--src', src, '--out', sortie,
      '--mountain-src', 'montagne_points',
      '--mountain-width', '1918',
      '--mountain-lossless',
      '--train-scale', '0.1',
    ])
  }, 60_000)

  test('chaque point ressort exactement où il était', () => {
    const code =
      'import sys\n' +
      'from PIL import Image\n' +
      'import numpy as np\n' +
      'a = np.array(Image.open(sys.argv[1]).convert("RGBA").getchannel("A"))\n' +
      'b = np.array(Image.open(sys.argv[2]).convert("L"))\n' +
      'print(int(np.array_equal(a, b)), int((a > 128).sum()), int((b > 128).sum()))\n'
    const [identique, avant, apres] = execFileSync('python3', [
      '-I', '-c', code,
      join(src, 'montagne_points/0001.webp'),
      join(sortie, 'mountains/0001.webp'),
    ]).toString().trim().split(/\s+/).map(Number)

    expect(avant).toBeGreaterThan(3000)
    expect(apres).toBe(avant)
    expect(identique).toBe(1)
  })
})
