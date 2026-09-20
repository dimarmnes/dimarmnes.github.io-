#!/usr/bin/env python3
"""Actualiza el catálogo y las cantidades desde images/awards, sin dependencias."""
from pathlib import Path
from collections import Counter
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {
    'rca': 'Radio Club Argentino',
    'pota': 'Parks on the Air',
    'sstv': 'SSTV',
    'logros': 'Logros destacados',
    'eqsl': 'eQSL',
    'otros': 'Otros diplomas',
}
EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def inventory(root):
    items = []
    folder = root / 'images' / 'awards'
    for file in sorted(folder.rglob('*')):
        relative = file.relative_to(folder)
        if (not file.is_file() or file.suffix.lower() not in EXTENSIONS
                or any(part.startswith('.') for part in relative.parts)):
            continue
        category = relative.parts[0] if len(relative.parts) > 1 else 'otros'
        if category not in CATEGORIES:
            print(f'Aviso: {relative} se incluye en Otros diplomas.')
            category = 'otros'
        match = re.match(r'^(\d{8})(?=[ _-]|$)', file.stem)
        date = match.group(1) if match else ''
        year = date[:4] if date and date[:4] != '0000' else ''
        name = file.stem[8:] if match else file.stem
        title = re.sub(r'[_]+|\s+-\s+', ' ', name.strip(' _-'))
        title = re.sub(r'\s+', ' ', title).strip() or file.stem
        items.append({
            'src': file.relative_to(root).as_posix(),
            'category': category, 'year': year, 'date': date, 'title': title,
        })
    # YYYYMMDD permite ordenar también YYYYMM00 y YYYY0000, sin inventar fechas.
    return sorted(items, key=lambda item: item['date'], reverse=True)


def card(item, index):
    esc = lambda value: html.escape(value, quote=True)
    subtitle = CATEGORIES[item['category']]
    if item['year']:
        subtitle += ' · ' + item['year']
    return (
        f'<button class="award-piece" type="button" data-award="{index}" '
        f'aria-label="Ampliar {esc(item["title"])}">'
        f'<span class="document"><img src="{esc(item["src"])}" '
        f'alt="{esc(item["title"])}" loading="lazy"></span>'
        f'<span class="piece-title">{esc(item["title"])}</span>'
        f'<small>{esc(subtitle)}</small></button>'
    )


def update():
    catalog_path = ROOT / 'datos' / 'diplomas.json'
    items = inventory(ROOT)
    indices = {item['src']: i for i, item in enumerate(items)}
    counts = Counter(item['category'] for item in items)
    outputs = {}
    for name in ('diplomas.html', 'diplomas-archivo.html'):
        path = ROOT / name
        page = path.read_text(encoding='utf-8')
        # Las piezas destacadas conservan su selección aunque cambie el orden del catálogo.
        def remap(match):
            button = match.group(0)
            source = re.search(r'<img[^>]+src="([^"]+)"', button)
            src = html.unescape(source.group(1)) if source else None
            if src not in indices:
                return ''
            return re.sub(r'data-award="\d+"', f'data-award="{indices[src]}"', button)
        page = re.sub(r'<button\b[^>]*data-award="\d+".*?</button>', remap, page, flags=re.S)
        if name == 'diplomas.html':
            links = ''.join(
                f'<a class="collection-link" href="diplomas-archivo.html?categoria={key}">'
                f'{label} <span>{counts[key]}</span></a>'
                for key, label in CATEGORIES.items())
            page = re.sub(r'(<div class="collection-links">).*?(</div>)',
                          lambda m: m[1] + links + m[2], page, flags=re.S)
            page = re.sub(r'Ver los \d+ diplomas RCA', f'Ver los {counts["rca"]} diplomas RCA', page)
            page = re.sub(r'\d+ diplomas disponibles, organizados por categoría y año',
                          f'{len(items)} diplomas disponibles, organizados por categoría y año', page)
            sections = []
            descriptions = {
                'logros': 'Reconocimientos que marcan un paso importante en la actividad de la estación.',
                'eqsl': 'Diplomas obtenidos a partir de contactos confirmados mediante eQSL.',
            }
            for category in ('logros', 'eqsl'):
                selection = [(i, item) for i, item in enumerate(items)
                             if item['category'] == category][:3]
                if not selection:
                    continue
                pieces = ''.join(card(item, i) for i, item in selection)
                sections.append(
                    f'<section class="award-panel collection-section collection-{category}" '
                    f'aria-labelledby="title-{category}">'
                    f'<div class="collection-heading"><div><p class="kicker">Colección</p>'
                    f'<h2 id="title-{category}">{CATEGORIES[category]}</h2>'
                    f'<p>{descriptions[category]}</p></div>'
                    f'<a class="more" href="diplomas-archivo.html?categoria={category}">'
                    f'Ver colección ({counts[category]}) →</a></div>'
                    f'<div class="collection-pieces">{pieces}</div></section>')
            page = re.sub(
                r'(<!-- BEGIN additional-award-collections -->).*?(<!-- END additional-award-collections -->)',
                lambda m: m[1] + '\n      ' + '\n      '.join(sections) + '\n      ' + m[2],
                page, flags=re.S)
            # Solo cuatro piezas recientes en la vitrina.
            recent = ''.join(card(item, i) for i, item in
                             [(i, x) for i, x in enumerate(items) if x['category'] == 'otros'][:4])
            page = re.sub(r'(<section class="awards-grid">).*?(</section>)',
                          lambda m: m[1] + recent + m[2], page, count=1, flags=re.S)
        else:
            category_options = '<option value="all">Todas</option>' + ''.join(
                f'<option value="{key}">{label}</option>'
                for key, label in CATEGORIES.items())
            page = re.sub(r'(<select id="award-category">).*?(</select>)',
                          lambda m: m[1] + category_options + m[2], page, flags=re.S)
            cards = '\n        '.join(card(item, i) for i, item in enumerate(items))
            page = re.sub(r'(<section class="awards-grid archive-grid" id="award-archive">).*?(</section>)',
                          lambda m: m[1] + '\n        ' + cards + '\n      ' + m[2], page, flags=re.S)
            years = sorted({item['year'] for item in items if item['year']}, reverse=True)
            options = '<option value="all">Todos</option>' + ''.join(
                f'<option value="{year}">{year}</option>' for year in years)
            options += '<option value="unknown">Sin fecha</option>'
            page = re.sub(r'(<select id="award-year">).*?(</select>)',
                          lambda m: m[1] + options + m[2], page, flags=re.S)
            page = re.sub(r'(<p id="archive-count" role="status">).*?(</p>)',
                          lambda m: m[1] + f'{len(items)} diplomas' + m[2], page, flags=re.S)
        outputs[path] = page
    outputs[catalog_path] = json.dumps(items, ensure_ascii=False, indent=2) + '\n'
    outputs[ROOT / 'js' / 'diplomas-data.js'] = (
        'const AWARDS_DATA = ' + json.dumps(items, ensure_ascii=False, separators=(',', ':')) + ';\n')
    for path, content in outputs.items():
        path.write_text(content, encoding='utf-8')
    print(f'Actualizados {len(items)} diplomas: ' + ', '.join(
        f'{CATEGORIES[key]}: {counts[key]}' for key in CATEGORIES))


if __name__ == '__main__':
    update()
