"""Build tiny synthetic PNG fixtures for the asset pipeline tests.

Real assets are far too heavy to live in the repository: two mountain frames
alone weigh 7.3 MB. These fixtures reproduce the *shape* of the sources — the
2320x1217 stage frame, the 1918x472 mountain band, a uniform alpha and a known
union bounding box — at a negligible cost.

Usage:
  python3 tools/make_fixtures.py <directory>
"""
import sys
from pathlib import Path

from PIL import Image

STAGE = (2320, 1217)
MOUNTAIN = (1918, 472)
MOUNTAIN_ALPHA = 160          # uniform, so a resize keeps the value readable
MOUNTAIN_GRAY = (196, 196, 196)
BODY = (11, 11, 12, 255)      # corps noir
LINE = (224, 224, 230, 255)   # trait clair

# The second locomotive frame reaches further left than the first: the union
# bounding box must therefore start at 580, not at 600.
LOCO_LEFTS = (600, 580)
SEQUENCES = {
    '02_locomotive': LOCO_LEFTS,
    '03_wagon': (640, 640),
    '04_start_locomotive': LOCO_LEFTS,
    '05_start_wagon': (640, 640),
    '06_stop_locomotive': LOCO_LEFTS,
    '07_stop_wagon': (640, 640),
}


def mountain_frame(path: Path) -> None:
    Image.new('RGBA', MOUNTAIN, (*MOUNTAIN_GRAY, MOUNTAIN_ALPHA)).save(path)


def train_frame(path: Path, left: int, width: int = 1110, top: int = 400, height: int = 500) -> None:
    im = Image.new('RGBA', STAGE, (0, 0, 0, 0))
    im.paste(Image.new('RGBA', (width, height), BODY), (left, top))
    im.paste(Image.new('RGBA', (width, 4), LINE), (left, top))
    im.save(path)


def rails_frame(path: Path) -> None:
    im = Image.new('RGBA', STAGE, (0, 0, 0, 0))
    im.paste(Image.new('RGBA', (1127, 38), LINE), (770, 921))
    im.save(path)


def main(root: Path) -> None:
    montagne = root / 'montagne'
    montagne.mkdir(parents=True, exist_ok=True)
    for i in (1, 2):
        mountain_frame(montagne / f'{i:04d}.png')

    train = root / 'PTITRAIN_grain_vivant'
    rails_dir = train / '01_rails'
    rails_dir.mkdir(parents=True, exist_ok=True)
    rails_frame(rails_dir / 'rails.png')

    for name, lefts in SEQUENCES.items():
        folder = train / name
        folder.mkdir(parents=True, exist_ok=True)
        for i, left in enumerate(lefts, start=1):
            train_frame(folder / f'v{i:03d}.png', left)


if __name__ == '__main__':
    main(Path(sys.argv[1]))
