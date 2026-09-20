#!/usr/bin/env python3
"""Genera el catálogo QSL a partir de las carpetas recibidas y propias."""
from pathlib import Path
import json
import re
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def inventory(root):
    items = []
    for kind in ('recibidas', 'propias'):
        folder = root / 'images' / 'qsl' / kind
        for file in sorted(folder.rglob('*')):
            rel = file.relative_to(folder)
            if not file.is_file() or file.suffix.lower() not in EXTENSIONS or any(p.startswith('.') for p in rel.parts):
                continue
            match = re.match(r'^(\d{8})(?:[ _-]|$)', file.stem)
            date = match[1] if match else ''
            year = date[:4] if date and date[:4] != '0000' else ''
            if not year and rel.parts[0].isdigit() and len(rel.parts[0]) == 4:
                year = rel.parts[0]
            name = re.sub(r'^\d{8}[ _-]*', '', file.stem)
            parts = name.split('_')
            if parts and re.fullmatch(r'\d{4,6}', parts[0]):
                parts = parts[1:]
            band = next((x.upper() for x in parts if re.fullmatch(r'\d+(?:[.,]\d+)?(?:M|CM|MM)', x, re.I)), '')
            band_index = next((i for i, x in enumerate(parts) if x.upper() == band), -1) if band else -1
            mode = parts[band_index + 1].upper() if band_index >= 0 and band_index + 1 < len(parts) else ''
            call = parts[0] if kind == 'recibidas' and band_index > 0 else ''
            title = call or re.sub(r'[_]+', ' ', name).strip() or file.stem
            items.append({'src': file.relative_to(root).as_posix(), 'type': kind,
                          'date': date, 'year': year, 'title': title, 'call': call,
                          'band': band, 'mode': mode})
    return sorted(items, key=lambda x: x['date'], reverse=True)


def update():
    items = inventory(ROOT)
    (ROOT / 'datos/qsl.json').write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'js/qsl-data.js').write_text('const QSL_DATA = ' + json.dumps(items, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    counts = Counter(x['type'] for x in items)
    print(f'Catálogo actualizado: {counts["recibidas"]} recibidas, {counts["propias"]} propias.')


if __name__ == '__main__':
    update()
