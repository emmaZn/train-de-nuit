"""Convert the heavy PNG sources into web-ready WebP frames plus a manifest.

Two measurements shape this pipeline.

Mountains carry no colour at all: every opaque pixel is the same grey (~196)
and all the relief lives in the alpha channel. Storing the alpha alone, as a
greyscale WebP, costs 115 kB per frame at the source's native 1918 px. The
renderer turns that luminance back into alpha with a one-line shader.

Train sequences all share the 2320x1217 frame of the rails. Trimming each
image to its own bounding box would therefore break the alignment between
frames: the crop uses the union of the whole sequence, and the manifest records
its origin so the renderer can place it back in the stage frame.

Usage:
  python3 tools/build_assets.py --src ~/projet_zero --out public/assets
  python3 tools/build_assets.py --src ~/projet_zero --out public/assets --train-src PTITRAIN_blanc
  python3 tools/build_assets.py --src ~/projet_zero --out public/assets \
      --mountain-src montagne_hd/webp --mountain-step 2 --mountain-width 3840
"""
import argparse
import json
from multiprocessing import Pool, cpu_count
from pathlib import Path

from PIL import Image

STAGE = {'width': 2320, 'height': 1217}
RAILS_DIR = '01_rails'
# Toutes les versions du dessin ne contiennent pas la voie ; PTITRAIN_blanc par
# exemple n'a que les vehicules. La voie est le meme dessin partout, on la
# reprend donc dans la version de reference.
RAILS_FALLBACK = 'PTITRAIN_grain_vivant'
SEQUENCES = {
    '02_locomotive': 'loco',
    '03_wagon': 'wagon',
    '04_start_locomotive': 'loco-start',
    '05_start_wagon': 'wagon-start',
    '06_stop_locomotive': 'loco-stop',
    '07_stop_wagon': 'wagon-stop',
}
LANCZOS = Image.Resampling.LANCZOS


def frames_in(folder: Path, step: int = 1) -> list[Path]:
    """Frames of a sequence, in order. `step` keeps one frame out of N."""
    files = sorted(p for p in folder.iterdir()
                   if p.suffix.lower() in ('.png', '.webp'))
    return files[::max(1, step)]


def union_bbox(files: list[Path]) -> tuple[int, int, int, int]:
    """Smallest box holding every opaque pixel of the whole sequence."""
    left = top = 1 << 30
    right = bottom = 0
    for path in files:
        box = Image.open(path).getchannel('A').getbbox()
        if box is None:
            continue
        left, top = min(left, box[0]), min(top, box[1])
        right, bottom = max(right, box[2]), max(bottom, box[3])
    if right == 0 and bottom == 0:
        return (0, 0, STAGE['width'], STAGE['height'])
    return (left, top, right, bottom)


def write_mountain(job):
    src, dst, width, quality, lossless = job
    alpha = Image.open(src).convert('RGBA').getchannel('A')
    # Un nuage de points d'un pixel ne survit a aucun reechantillonnage : a
    # taille egale on ne redimensionne pas du tout, on recopie.
    if width != alpha.width:
        height = max(1, round(alpha.height * width / alpha.width))
        alpha = alpha.resize((width, height), LANCZOS)
    if lossless:
        alpha.save(dst, 'WEBP', lossless=True, method=6)
    else:
        alpha.save(dst, 'WEBP', quality=quality, method=6)
    return alpha.size


def write_crop(job):
    src, dst, box, scale, quality = job
    image = Image.open(src).crop(box)
    width = max(1, round(image.width * scale))
    height = max(1, round(image.height * scale))
    image.resize((width, height), LANCZOS).save(dst, 'WEBP', quality=quality, method=6)
    return (width, height)


def run(jobs, worker, parallel):
    if not jobs:
        return []
    if parallel > 1 and len(jobs) > 1:
        with Pool(parallel) as pool:
            return pool.map(worker, jobs)
    return [worker(job) for job in jobs]


def build_mountains(src: Path, out: Path, width: int, quality: int, jobs: int, base: str,
                    dossier: str = 'montagne', step: int = 1, lossless: bool = False):
    files = frames_in(src / dossier, step)
    if not files:
        return None
    folder = out / 'mountains'
    folder.mkdir(parents=True, exist_ok=True)
    sizes = run(
        [(f, folder / f'{i:04d}.webp', width, quality, lossless) for i, f in enumerate(files, 1)],
        write_mountain, jobs,
    )
    return {
        'count': len(files),
        'width': sizes[0][0],
        'height': sizes[0][1],
        'path': f'{base}/mountains/{{i}}.webp',
    }


def build_sequence(files, folder: Path, scale: float, quality: int, jobs: int, path: str):
    box = union_bbox(files)
    folder.mkdir(parents=True, exist_ok=True)
    run(
        [(f, folder / f'{i:04d}.webp', box, scale, quality) for i, f in enumerate(files, 1)],
        write_crop, jobs,
    )
    # Everything is reported in pixels of the 2320x1217 stage frame, origin
    # included: mixing source and output units is how a sprite ends up drawn at
    # half its size. `scale` says what was applied to the files themselves.
    return {
        'count': len(files),
        'x': box[0], 'y': box[1],
        'width': box[2] - box[0], 'height': box[3] - box[1],
        'scale': scale,
        'path': path,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--src', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    # 1918 : la largeur native de la source. Le massif est dessine bien plus
    # large que le cadre, donc tout ce qui manque ici se voit sur le grain.
    parser.add_argument('--mountain-src', default='montagne',
                        help='folder holding the mountain frames, inside --src')
    parser.add_argument('--mountain-step', type=int, default=1,
                        help='keep one frame out of N; the renderer dissolves between them')
    parser.add_argument('--mountain-width', type=int, default=1918)
    parser.add_argument('--mountain-lossless', action='store_true',
                        help='store the mountains without loss; needed for a dithered '
                             'point cloud, where it is also far lighter')
    parser.add_argument('--train-src', default='PTITRAIN_grain_vivant',
                        help='folder holding the train sequences, inside --src')
    parser.add_argument('--train-scale', type=float, default=0.5)
    parser.add_argument('--quality', type=int, default=80)
    # Absolute on purpose: stations are served at /ici, /plus-loin, … and a
    # relative path would resolve against the current route, not the site root.
    parser.add_argument('--base', default='/assets', help='prefix of the paths written in the manifest')
    parser.add_argument('--jobs', type=int, default=cpu_count())
    args = parser.parse_args()

    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    manifest = {'stage': dict(STAGE)}

    mountains = build_mountains(args.src, out, args.mountain_width, args.quality, args.jobs,
                                args.base, args.mountain_src, args.mountain_step,
                                args.mountain_lossless)
    if mountains:
        manifest['mountains'] = mountains

    train_src = args.src / args.train_src
    rails_dir = train_src / RAILS_DIR
    if not rails_dir.is_dir():
        rails_dir = args.src / RAILS_FALLBACK / RAILS_DIR
        print(f'no {RAILS_DIR} in {args.train_src}, taking the track from {RAILS_FALLBACK}')
    rails = frames_in(rails_dir)
    if rails:
        spec = build_sequence(rails, out / 'train', args.train_scale, args.quality, 1,
                              f'{args.base}/train/rails.webp')
        (out / 'train' / '0001.webp').rename(out / 'train' / 'rails.webp')
        spec.pop('count')
        manifest['rails'] = spec

    manifest['train'] = {}
    for folder, key in SEQUENCES.items():
        files = frames_in(train_src / folder)
        if not files:
            continue
        manifest['train'][key] = build_sequence(
            files, out / 'train' / key, args.train_scale, args.quality, args.jobs,
            f'{args.base}/train/{key}/{{i}}.webp',
        )

    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f"manifest written to {out / 'manifest.json'}")


if __name__ == '__main__':
    main()
