"""Actualizar las fotos disponibles en el visor de la portada."""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[1]
TITLES = {
    "ph_rio_uruguay_atardecer": "Río Uruguay · Atardecer",
    "ph_san_javier_letras": "San Javier",
    "ph_guerrero_01": "Arroyo Guerrero",
    "ph_guerrero_02": "Arroyo Guerrero",
    "ph_arbol": "El paisaje",
    "ph_rio_uruguay_luna": "Luz de luna sobre el río Uruguay",
    "ph_avenida_nubes": "Pinceladas de nubes",
    "ph_escuela_603": "Escuela de Frontera N.º 603",
    "ph_puerto_arena": "Isla sobre el río Uruguay",
    "ph_rio_uruguay_correderas": "Correderas en el río Uruguay",
}
photos = []
for path in sorted((ROOT / "images/postales").rglob("*")):
    if not path.is_file() or path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        continue
    if any(part.startswith(".") for part in path.relative_to(ROOT / "images/postales").parts):
        continue
    title = TITLES.get(path.stem, path.stem.removeprefix("ph_").replace("_", " ").replace("-", " ").strip().capitalize())
    photos.append({"src": path.relative_to(ROOT).as_posix(), "title": title})
(ROOT / "datos/postales.json").write_text(json.dumps(photos, ensure_ascii=False, indent=2) + "\n")
(ROOT / "js/postales-data.js").write_text("const POSTALES_DATA = " + json.dumps(photos, ensure_ascii=False) + ";\n")
print(f"Catálogo de postales actualizado: {len(photos)} fotos.")
