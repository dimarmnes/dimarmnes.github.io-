"""Generar el catálogo de grillas de cuatro caracteres desde contactos.adi."""
from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1]
def build(text):
    text=re.split(r"<eoh>",text,flags=re.I)[-1]
    grids={}; total=0; located=0
    for part in re.split(r"<eor>",text,flags=re.I):
        record={}; pos=0
        pattern=re.compile(r"<([a-z0-9_]+):(\d+)(?::[^>]*)?>",re.I)
        while (match:=pattern.search(part,pos)):
            end=match.end()+int(match[2]);record[match[1].lower()]=part[match.end():end].strip();pos=end
        if not record.get("call"): continue
        total+=1; locator=record.get("gridsquare","").upper()
        if not re.fullmatch(r"[A-R]{2}[0-9]{2}(?:[A-X]{2}(?:[0-9]{2})?)?",locator): continue
        located+=1; key=locator[:4]
        g=grids.setdefault(key,{"locator":key,"place":key,"qsos":0,"confirmed":False,"calls":[],"modes":[]})
        g["qsos"]+=1
        g["confirmed"] |= any(record.get(field,"").upper() in ("Y","V") for field in ("qsl_rcvd","lotw_qsl_rcvd","eqsl_qsl_rcvd"))
        for field,target in (("call","calls"),("mode","modes")):
            value=record.get(field,"")
            if value and value not in g[target]:g[target].append(value)
    return {"grids":list(grids.values()),"total":total,"located":located}
if __name__=="__main__":
    data=build((ROOT/"datos/contactos.adi").read_text())
    (ROOT/"datos/grids.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
    (ROOT/"js/grids-data.js").write_text("window.GRIDS_DATA = "+json.dumps(data,ensure_ascii=False)+";\n")
    print(f"{len(data['grids'])} grillas, {data['located']} QSO con locator de {data['total']}.")
