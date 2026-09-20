# Fuentes de datos

## `dxcc.json`

La lista de entidades vigentes y sus nombres procede de la enumeración oficial
**DXCC Entity Code** de ADIF 3.1.7 (Released, 22-03-2026):
https://adif.org/adif/

Continentes, prefijos y símbolos de bandera se incorporaron desde `dxcc-json`:
https://github.com/k0swe/dxcc-json

Ese proyecto se distribuye bajo Apache License 2.0. Se conserva una copia de su
licencia en `LICENSE-dxcc-json.txt`.

## `contactos.adi`

Es el libro de guardia que consume el álbum. El archivo incluido inicialmente
solo contiene una cabecera ADIF válida. Debe reemplazarse por una exportación de
LU1IDC que incluya, como mínimo, estos campos por QSO:

- `DXCC` (recomendado) o `COUNTRY`
- `MODE` y, cuando corresponda, `SUBMODE`
- `QSL_RCVD`, `LOTW_QSL_RCVD` o `EQSL_QSL_RCVD` para las confirmaciones

El álbum agrupa los modos en `CW`, `SSB` y `DIGI`. FM y AM se muestran dentro de
SSB/telefonía; el resto de modos se agrupa como digitales.

## Nombres en español

Los nombres territoriales en español toman como base Unicode CLDR. Las entidades
radioeléctricas que comparten territorio o no equivalen a un país se tradujeron
específicamente para este álbum. El nombre oficial en inglés permanece en cada
registro para facilitar la relación con archivos ADIF.

Fuente: https://github.com/unicode-org/cldr-json

## Prefijos visibles

El campo `prefix` mostrado en cada estampilla usa el prefijo primario de
`CTY.DAT`, mantenido por Amateur Radio Country Files:
https://www.country-files.com/cty/

El campo `prefixes` conserva las series conocidas del catálogo de referencia.
El prefijo visible es representativo de la entidad DXCC y no pretende enumerar
todas las series internacionales asignadas por la UIT.

Irlanda del Norte usa la bandera del Reino Unido porque no existe una secuencia
de emoji Unicode específica para esa región.
