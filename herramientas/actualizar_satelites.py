#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "images" / "cositas" / "satelites"
OUTPUT = ROOT / "js" / "satelites-data.js"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

SPECIAL_NAMES = {
    "iss": "ISS",
    "so50": "SO-50",
}

def title_from_name(path):
    stem = path.stem
    for suffix in ("-frecuencias", "_frecuencias", "-frecuencia", "_frecuencia"):
        if stem.lower().endswith(suffix):
            stem = stem[:-len(suffix)]
            break
    key = stem.lower().replace("-", "").replace("_", "")
    if key in SPECIAL_NAMES:
        return SPECIAL_NAMES[key]
    return stem.replace("_", " ").replace("-", " ").strip()

cards = [
    {
        "title": title_from_name(path),
        "src": f"images/cositas/satelites/{path.name}",
    }
    for path in sorted(IMAGES.iterdir(), key=lambda item: item.name.casefold())
    if path.is_file() and path.suffix.lower() in EXTENSIONS
]

OUTPUT.write_text(
    "const SATELITES_DATA = " + json.dumps(cards, ensure_ascii=False, indent=2) + ";\n",
    encoding="utf-8",
)
print(f"{len(cards)} tarjetas registradas en {OUTPUT.relative_to(ROOT)}")
