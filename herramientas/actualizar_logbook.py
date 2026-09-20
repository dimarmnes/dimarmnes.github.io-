"""Genera la muestra local del Libro de Guardia desde contactos.adi."""
from pathlib import Path
import re,json,math
ROOT=Path(__file__).resolve().parents[1]
PAGE_SIZE=13
SAMPLE_PAGES=4

def parse_adif(text):
    records=[]
    for part in re.split(r"<eor\s*>",re.split(r"<eoh\s*>",text,flags=re.I)[-1],flags=re.I):
        record={};pos=0;pattern=re.compile(r"<([^:>]+):(\d+)(?::[^>]*)?>",re.I)
        while (match:=pattern.search(part,pos)):
            end=match.end()+int(match[2]);record[match[1].lower()]=part[match.end():end].strip();pos=end
        if record.get("call"):records.append(record)
    records.sort(key=lambda r:(r.get("qso_date",""),r.get("time_on",""),r.get("call","")))
    seen=set()
    for record in records:
        dxcc=record.get("dxcc")
        record["new_dxcc"]=bool(dxcc and dxcc not in seen)
        if dxcc:seen.add(dxcc)
    return records

def build(text):
    records=parse_adif(text);total_pages=max(1,math.ceil(len(records)/PAGE_SIZE));start=max(0,total_pages-SAMPLE_PAGES)
    pages=[]
    for page in range(start,total_pages):
        pages.append({"number":page+1,"records":records[page*PAGE_SIZE:(page+1)*PAGE_SIZE]})
    return {"total":len(records),"totalPages":total_pages,"pages":pages}

if __name__=="__main__":
    data=build((ROOT/"datos/contactos.adi").read_text())
    (ROOT/"datos/logbook-muestra.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
    (ROOT/"js/logbook-data.js").write_text("window.LOGBOOK_SAMPLE = "+json.dumps(data,ensure_ascii=False,separators=(",",":"))+";\n")
    print(f"Muestra actualizada: {len(data['pages'])} hojas, {data['total']} QSO en {data['totalPages']} hojas lógicas.")
