# LU1IDC

Sitio personal de Diego Marcelo Carratini, LU1IDC, radioaficionado de San Javier,
Misiones, Argentina.

El sitio reúne la estación, actividad en radio, Libro de Guardia, entidades DXCC,
grillas Maidenhead, QSL, diplomas, concursos, software y pequeñas herramientas para
la actividad. Está construido como un sitio estático y se publica mediante GitHub
Pages.

## Estructura

- Los documentos HTML de la raíz corresponden a las páginas públicas.
- `css/` contiene los estilos generales y los de cada sección.
- `js/` contiene el comportamiento del sitio y los catálogos JavaScript generados.
- `images/` reúne las imágenes publicadas, organizadas por sección.
- `datos/` contiene los catálogos y datos públicos utilizados por las páginas.
- `fonts/` y `js/vendor/` contienen recursos locales y sus licencias.
- `herramientas/` contiene únicamente aplicaciones web que forman parte del sitio,
  como Argentina en frecuencia y el Plan de bandas.

Las páginas públicas no necesitan un servidor de aplicaciones ni una base de datos.
Algunas vistas cargan archivos estáticos mediante `fetch`, por lo que para probarlas
localmente conviene servir la raíz con un servidor HTTP.

```bash
python3 -m http.server 8000
```

La preparación y actualización de los datos se realiza con herramientas locales que
se mantienen fuera de este repositorio público.
