"""Convert the heavy PNG sources into web-ready WebP frames plus a manifest.

Two measurements shape this pipeline.

Mountains carry no colour at all: every opaque pixel is the same grey (~196)
and all the relief lives in the alpha channel. Storing the alpha alone, as a
greyscale WebP, costs 46 kB per frame at 1280 px where RGBA costs 190 kB. The
renderer turns that luminance back into alpha with a one-line shader.

Train sequences all share the 2320x1217 frame of the rails. Trimming each
image to its own bounding box would therefore break the alignment between
frames: the crop uses the union of the whole sequence, and the manifest records
its origin so the renderer can place it back in the stage frame.

Usage:
  python3 tools/build_assets.py --src ~/projet_zero --out public/assets
"""
import argparse
import json
from multiprocessing import Pool, cpu_count
from pathlib import Path

from PIL import Image

STAGE = {'width': 2320, 'height': 1217}
RAILS_DIR = '01_rails'
SEQUENCES = {
    '02_locomotive': 'loco',
    '03_wagon': 'wagon',
    '04_start_locomotive': 'loco-start',
    '05_start_wagon': 'wagon-start',
    '06_stop_locomotive': 'loco-stop',
    '07_stop_wagon': 'wagon-stop',
}
LANCZOS = Image.Resampling.LANCZOS


def frames_in(folder: Path) -> list[Path]:
    return sorted(p for p in folder.glob('*.png'))


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
    src, dst, width, quality = job
    alpha = Image.open(src).getchannel('A')
    height = max(1, round(alpha.height * width / alpha.width))
    alpha.resize((width, height), LANCZOS).save(dst, 'WEBP', quality=quality, method=6)
    return (width, height)


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


def build_mountains(src: Path, out: Path, width: int, quality: int, jobs: int, base: str):
    files = frames_in(src / 'montagne')
    if not files:
        return None
    folder = out / 'mountains'
    folder.mkdir(parents=True, exist_ok=True)
    sizes = run(
        [(f, folder / f'{i:04d}.webp', width, quality) for i, f in enumerate(files, 1)],
        write_mountain, jobs,
    )
    return {
        'count': len(files),
        'width': sizes[0][0],
        'height': sizes[0][1],
        'path': f'{base}/mountains/{{i}}.webp',
    }


def build_sequence(files, folder: Path, scale: int, quality: int, jobs: int, path: str):
    box = union_bbox(files)
    folder.mkdir(parents=True, exist_ok=True)
    sizes = run(
        [(f, folder / f'{i:04d}.webp', box, scale, quality) for i, f in enumerate(files, 1)],
        write_crop, jobs,
    )
    return {
        'count': len(files),
        'x': box[0], 'y': box[1],
        'width': sizes[0][0], 'height': sizes[0][1],
        'path': path,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--src', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--mountain-width', type=int, default=1280)
    parser.add_argument('--train-scale', type=float, default=0.5)
    parser.add_argument('--quality', type=int, default=80)
    parser.add_argument('--base', default='assets', help='prefix of the paths written in the manifest')
    parser.add_argument('--jobs', type=int, default=cpu_count())
    args = parser.parse_args()

    out = args.out
    out.mkdir(parents=True, exist_ok=True)
    manifest = {'stage': dict(STAGE)}

    mountains = build_mountains(args.src, out, args.mountain_width, args.quality, args.jobs, args.base)
    if mountains:
        manifest['mountains'] = mountains

    train_src = args.src / 'PTITRAIN_grain_vivant'
    rails = frames_in(train_src / RAILS_DIR)
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
