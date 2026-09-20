# Sitio LU1IDC en desarrollo

El rediseño vive dentro de esta carpeta. El sitio original permanece en la raíz.

## Estructura

- `index.html`: inicio.
- `en-el-aire.html`: acceso a la actividad de la estación.
- `album-dxcc.html`: álbum DXCC (todavía con datos de ejemplo).
- `css/`: estilos comunes y estilos de cada página.
- `js/`: comportamiento de la cabecera y del álbum.
- `images/`: solo las imágenes utilizadas, conservando sus subcarpetas.
- `datos/`: archivos de datos; `grids.adi` contiene grillas y fechas, no el log completo.

Las tres páginas usan imágenes, estilos y scripts locales a esta carpeta.
Los enlaces a estación, software, concursos, diplomas, QSL, privacidad y mapa
siguen apuntando temporalmente al sitio original. Esas páginas se migrarán
cuando se rediseñen, junto con los recursos que realmente necesiten.

Para probar lecturas de datos con `fetch`, servir esta carpeta mediante un
servidor HTTP local; abrir el HTML directamente no permite todas esas lecturas.

No editar el sitio original para implementar cambios en esta versión.
Al incorporar recursos, copiar únicamente los utilizados y ajustar rutas relativas.
La sustitución del sitio original se hará cuando termine la migración.

## Datos del álbum DXCC

El álbum carga `datos/contactos.adi` automáticamente. Para probar otro archivo
sin modificar el proyecto se puede usar el botón **Cargar ADIF** del álbum; esa
selección permanece únicamente en el navegador.

El catálogo completo está en `datos/dxcc.json`. Sus fuentes y los campos ADIF
necesarios se documentan en `datos/FUENTES.md`.

## Agregar diplomas

1. Guardar las nuevas imágenes en `images/awards/`, o en sus
   subcarpetas `rca`, `pota` y `sstv`, según la categoría.
2. Nombrarlas como `YYYYMMDD_Nombre_del_diploma.jpg`.
   Se aceptan fechas parciales (`YYYYMM00`, `YYYY0000`) y archivos sin fecha.
3. Desde la raíz del proyecto, ejecutar:

   ```sh
   python3 herramientas/actualizar_diplomas.py
   ```

4. Revisar las páginas y sincronizar las imágenes y los archivos actualizados
   con GitHub.

El generador actualiza los catálogos JSON/JavaScript, los totales por categoría,
el total general, las opciones de año, las cuatro piezas recientes y la galería
completa. La clasificación visible sigue siendo por año; mes y día solo se usan
para ordenar. Conserva las piezas destacadas mientras sus imágenes existan.
También detecta imágenes eliminadas. No copia desde el sitio original.

Categorías adicionales: `images/awards/logros/` para **Logros destacados** y
`images/awards/eqsl/` para **eQSL**. Las categorías y sus nombres están definidos
en `CATEGORIES` dentro del generador; al agregar una categoría allí y crear su
carpeta, el programa incorpora automáticamente su acceso, cantidad y filtro.

## Agregar QSL

Guardar las recibidas en `images/qsl/recibidas/YYYY/` y las tarjetas de LU1IDC en
`images/qsl/propias/`. Para recibidas, usar nombres como
`20241231_C21TS_20M_FT8.jpg` (también admite hora después de la fecha).
Las propias pueden tener un nombre descriptivo, con fecha opcional.

Desde la raíz del proyecto:

```sh
python3 herramientas/actualizar_qsl.py
```

El catálogo actualiza cantidades, años, modos, bandas y selecciones al recargar
las páginas. El bloque Mis QSL aparece cuando hay imágenes propias. El archivo
muestra 24 tarjetas por página. Conservar los originales en la PC y publicar
copias de tamaño adecuado para la web.

### Postales de mi pueblo

El visor de la portada recorre todas las imágenes de `images/postales/`, sin crear otra página. La selección de cinco fotos de la portada se conserva en `index.html`.

Para añadir fotos, copiarlas a `images/postales/` y ejecutar desde la raíz del proyecto:

```sh
python3 herramientas/actualizar_postales.py
```

Los nombres descriptivos se convierten en títulos; los títulos específicos pueden editarse en `TITLES` dentro del generador. Se generan `datos/postales.json` y `js/postales-data.js`, también disponibles al abrir la página localmente.

### Selección de QSL en la portada

Las tres tarjetas sobre la mesa se eligen en la lista `QSL_MESA`, al principio de `js/qsl.js`: escribir sus nombres completos con extensión, en el orden deseado. Si falta alguna, el espacio se completa con otra recibida. Actualizar el catálogo no cambia esta selección.

La bandeja conserva las cinco últimas del catálogo. El resumen inferior muestra doce recibidas al azar, sin repetir entradas, en cada carga de la página. El archivo completo mantiene su orden por fecha.

### Grillas trabajadas

`grids.html` integra solo la variante de escritorio del prototipo: globo, aro, soporte, base y celdas Maidenhead sin trayectorias. Lee `datos/contactos.adi` automáticamente al servirse por HTTP. Las grillas se agrupan por cuatro caracteres; confirmación con QSL, LoTW o eQSL recibida Y/V. Los contactos sin locator no se ubican.

Para actualizar el catálogo de respaldo local:

```sh
python3 herramientas/actualizar_grids.py
```

Para probar módulos JavaScript, servir la raíz del proyecto con `python3 -m http.server 8000` y abrir `http://localhost:8000/grids.html`. Se requiere un servidor HTTP y WebGL 2. Three.js 0.185.0 y topojson-client 3.1.0 están guardados en `js/vendor/`, junto con sus licencias; no se depende de la conexión a jsDelivr. Mapa y fronteras se guardan localmente: earth-blue-marble del ejemplo de three-globe, World Atlas 2 (Natural Earth), fuentes heredadas del prototipo. Fondo shack incluido en el paquete del usuario. La rotación respeta movimiento reducido y se pausa cuando el globo no es visible.

### Libro de Guardia (maqueta)

`libro-de-guardia.html` presenta la portada y la hoja SVG como una libreta apaisada. La prueba muestra las cuatro hojas más recientes, con 13 QSO por hoja, tomando fecha, hora, indicativo, banda, RST y marcas de confirmación del ADIF.

Para regenerar el respaldo que permite verla también mediante `file://`:

```sh
python3 herramientas/actualizar_logbook.py
```

Servida por HTTP, la página vuelve a leer `datos/contactos.adi` sin depender del catálogo generado. Equipo, antena, potencia y actividades quedan vacíos mientras el ADIF no exporte esos campos. La maqueta usa StPageFlip 2.0.7 (MIT), guardado en `js/vendor/page-flip/`, para el plegado de las cuatro hojas HTML. Los datos superpuestos usan Patrick Hand (SIL OFL), guardada en `fonts/patrick-hand/`. La paginación completa y la búsqueda quedan para la siguiente etapa.
