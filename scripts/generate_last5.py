#!/usr/bin/env python3
"""Genera last5.html para QRZ a partir del ADIF y de los nombres DXCC del sitio."""

from datetime import datetime
from html import escape
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ADIF = ROOT / "datos/contactos.adi"
DXCC = ROOT / "js/dxcc-data.js"
TEMPLATE = ROOT / "templates/last5.html"
OUTPUT = ROOT / "last5.html"
FIELD = re.compile(rb"<([^:>]+):(\d+)(?::[^>]*)?>", re.IGNORECASE)
EOH = re.compile(rb"<eoh\s*>", re.IGNORECASE)
EOR = re.compile(rb"<eor\s*>", re.IGNORECASE)


def read_adif(path):
    """Lee campos ADIF por longitud de bytes, igual que el lector del libro."""
    body = EOH.split(path.read_bytes())[-1]
    for part in EOR.split(body):
        record = {}
        position = 0
        while match := FIELD.search(part, position):
            end = match.end() + int(match.group(2))
            if end > len(part):
                raise ValueError("Campo ADIF incompleto")
            record[match.group(1).decode("ascii").lower()] = part[match.end():end].decode("utf-8", errors="replace").strip()
            position = end
        if record.get("call"):
            yield record


def utc_timestamp(record):
    date = record.get("qso_date", "")
    time = record.get("time_on", "")
    if not re.fullmatch(r"\d{8}", date) or not re.fullmatch(r"\d{4}(?:\d{2})?", time):
        return None
    try:
        return datetime.strptime(date + time.ljust(6, "0"), "%Y%m%d%H%M%S")
    except ValueError:
        return None


def dxcc_names(path):
    source = path.read_text(encoding="utf-8").strip()
    prefix = "const DXCC_DATA = "
    if not source.startswith(prefix):
        raise ValueError("Formato inesperado de js/dxcc-data.js")
    data = json.loads(source[len(prefix):].removesuffix(";"))
    return {str(entity["id"]): entity["name"] for entity in data["entities"]}


def render_row(record, countries):
    date = record["qso_date"]
    time = record["time_on"]
    values = (
        f"{date[6:8]}/{date[4:6]}/{date[:4]} {time[:2]}:{time[2:4]}",
        record.get("call") or "—",
        (record.get("band") or "—").upper(),
        (record.get("mode") or "—").upper(),
        countries.get(record.get("dxcc", ""), "—"),
    )
    cells = []
    for index, value in enumerate(values):
        safe = escape(value, quote=True)
        class_attribute = ' class="call"' if index == 1 else ""
        cells.append(f'<td{class_attribute} title="{safe}">{safe}</td>')
    return "        <tr>" + "".join(cells) + "</tr>"


def main():
    countries = dxcc_names(DXCC)
    records = [
        (timestamp, record)
        for record in read_adif(ADIF)
        if (timestamp := utc_timestamp(record)) is not None
    ]
    records.sort(key=lambda item: item[0], reverse=True)
    recent = records[:5]
    if recent:
        rows = [render_row(record, countries) for _, record in recent]
        rows.extend('        <tr><td colspan="5"></td></tr>' for _ in range(5 - len(rows)))
    else:
        rows = ['        <tr><td class="message" colspan="5">Aún no hay contactos disponibles.</td></tr>']
        rows.extend('        <tr><td colspan="5"></td></tr>' for _ in range(4))
    template = TEMPLATE.read_text(encoding="utf-8")
    marker = "<!-- LAST5_ROWS -->"
    if template.count(marker) != 1:
        raise ValueError("La plantilla debe contener una sola marca LAST5_ROWS")
    result = template.replace(marker, "\n".join(rows))
    OUTPUT.write_text(result, encoding="utf-8")
    print(f"Generado {OUTPUT.relative_to(ROOT)} con {len(recent)} QSO")


if __name__ == "__main__":
    main()
