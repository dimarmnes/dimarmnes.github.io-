// --- Constantes del DOM ---
const adifFileInput = document.getElementById("adifFile");
const summaryElement = document.getElementById("summary");
const provinceTableBody = document.querySelector("#provinceTable tbody");
const reloadAdifBtn = document.getElementById('reloadAdifBtn');
const ignoreListTextArea = document.getElementById("ignoreList");
const modeFilterSelect = document.getElementById('modeFilter');
const reloadIgnoreListBtn = document.getElementById('reloadIgnoreListBtn');
const settingsDetails = document.querySelector('details.control-group');

// --- Constantes del Modal ---
const modal = document.getElementById('callsignModal');
const modalTitle = document.getElementById('modalTitle');
const modalCallsigns = document.getElementById('modalCallsigns');
const closeModalButton = document.querySelector('.close-button');

// --- Constantes de la aplicación ---
const ALL_BANDS = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '70cm'];


// --- Estado de la aplicación ---
let qsosOriginales = [];

// --- Lista de provincias ordenada ---
const PROVINCIAS_ORDENADAS = provincias.map(p => p.nombre).sort((a, b) => a.localeCompare(b));

// --- Optimización de búsqueda de provincias ---
const prefijosSimples = new Map();
const rangos = [];
const sufijosPortablesMap = new Map();

provincias.forEach(p => {
  if (p.prefijos) {
    p.prefijos.forEach(pref => prefijosSimples.set(pref, p.nombre));
  }
  if (p.rango) {
    rangos.push({ rango: p.rango, nombre: p.nombre });
  }
  if (p.sufijosPortables) {
    p.sufijosPortables.forEach(suf => sufijosPortablesMap.set(suf, p.nombre));
  }
});

// --- Cargar configuraciones al iniciar ---
function cargarConfiguraciones() {
  const listaIgnoradosGuardada = localStorage.getItem('listaIgnorados');
  if (listaIgnoradosGuardada) {
    // Si el usuario ya tiene una lista guardada, la respetamos.
    ignoreListTextArea.value = listaIgnoradosGuardada;
  } else if (typeof INDICATIVOS_IGNORADOS_POR_DEFECTO !== 'undefined' && INDICATIVOS_IGNORADOS_POR_DEFECTO.size > 0) {
    // Si no hay lista guardada, cargamos la lista por defecto desde ignorados.js
    const indicativosPorDefecto = [...INDICATIVOS_IGNORADOS_POR_DEFECTO].join(', ');
    ignoreListTextArea.value = indicativosPorDefecto;
  }
}

// --- Event Listeners ---
adifFileInput.addEventListener("change", async () => {
  if (!adifFileInput.files.length) {
    // El usuario canceló la selección de archivo, no hacemos nada.
    return;
  }

  try {
    const file = adifFileInput.files[0];
    const text = await file.text();
    summaryElement.textContent = "Procesando archivo ADIF...";
    qsosOriginales = parseADIF(text);

    // Guardar y procesar la lista de ignorados
    const ignoreListValue = ignoreListTextArea.value;
    localStorage.setItem('listaIgnorados', ignoreListValue);

    await procesarYRenderizar();
    // Habilitamos el botón de recarga una vez que hay datos
    reloadAdifBtn.disabled = false;
  } catch (error) {
    console.error("Error al procesar el archivo:", error);
    alert("Error al procesar el archivo. Revisa la consola para más detalles.");
    summaryElement.textContent = "Hubo un error al procesar el archivo.";
    // Mantenemos el botón deshabilitado si hay un error
    reloadAdifBtn.disabled = true;
  }
});

// Recargar el archivo actual para aplicar cambios en la configuración
reloadAdifBtn.addEventListener('click', () => {
  if (qsosOriginales.length > 0) procesarYRenderizar();
})

// Re-renderizar la tabla cuando el usuario cambia el filtro de modo
modeFilterSelect.addEventListener('change', () => {
  if (qsosOriginales.length > 0) procesarYRenderizar();
});

// Forzar la recarga de la lista de ignorados desde el archivo por defecto
reloadIgnoreListBtn.addEventListener('click', () => {
  if (typeof INDICATIVOS_IGNORADOS_POR_DEFECTO !== 'undefined' && INDICATIVOS_IGNORADOS_POR_DEFECTO.size > 0) {
    // Rellenamos el textarea con la lista del archivo ignorados.js
    const indicativosPorDefecto = [...INDICATIVOS_IGNORADOS_POR_DEFECTO].join(', ');
    ignoreListTextArea.value = indicativosPorDefecto;

    // Si ya hay QSOs cargados, reprocesamos para aplicar los cambios
    if (qsosOriginales.length > 0) {
      procesarYRenderizar();
    }
  }
});
// --- Funciones del Modal ---

// Cerrar el desplegable de configuración si se hace clic fuera de él
document.addEventListener('click', (event) => {
  if (settingsDetails && settingsDetails.open && !settingsDetails.contains(event.target)) {
    settingsDetails.open = false;
  }
});
function openModal() {
  modal.style.display = 'flex';
}
function closeModal() {
  modal.style.display = 'none';
}
closeModalButton.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// --- Función central de procesamiento y renderizado ---
async function procesarYRenderizar() {
  const ignoreListValue = ignoreListTextArea.value;
  localStorage.setItem('listaIgnorados', ignoreListValue);
  
  // La lista de ignorados se toma directamente del textarea, dándole control total al usuario.
  const indicativosAIgnorar = new Set(
    ignoreListValue.split(/[\s,]+/).filter(Boolean).map(call => call.toUpperCase())
  );

  const selectedMode = modeFilterSelect.value;
  const qsosArgentinos = qsosOriginales.filter(q => esArgentino(q.call));
  const qsosFiltrados = filtrarQSOsPorModo(qsosArgentinos, selectedMode);

  summaryElement.textContent = `Se encontraron ${qsosArgentinos.length} QSOs con Argentina. Mostrando ${qsosFiltrados.length} según el filtro de modo.`;

  const resumen = procesarQSOs(qsosFiltrados, indicativosAIgnorar);
  renderTabla({ resumen });
  actualizarMapa(resumen);
}

// --- Funciones principales ---

// Reemplaza la función parseADIF existente por esta versión
function parseADIF(text) {
  const records = text.split(/<eor>/i);

  // Mapa simple de conversion MHz -> banda (valores centrales aproximados)
  const mhzToBand = (mhz) => {
    const f = parseFloat(mhz);
    if (!f || isNaN(f)) return null;
    if (f >= 1.8 && f < 3.8) return '160m';
    if (f >= 3.5 && f < 7.3) return '80m';
    if (f >= 5.0 && f < 7.3) return '60m'; // algunos DX usan 60m
    if (f >= 7.0 && f < 10.15) return '40m';
    if (f >= 10.1 && f < 14.35) return '30m';
    if (f >= 14.0 && f < 21.5) return '20m';
    if (f >= 17.0 && f < 18.2) return '17m';
    if (f >= 18.068 && f < 21.45) return '15m';
    if (f >= 21.0 && f < 24.99) return '12m';
    if (f >= 24.89 && f < 30.0) return '10m';
    if (f >= 50 && f < 54) return '6m';
    if (f >= 144 && f < 148) return '2m';
    if (f >= 430 && f < 450) return '70cm';
    return null;
  };

  const normalizaBanda = (raw) => {
    if (!raw) return null;
    let s = raw.toString().trim().toLowerCase();

    // casos como '20m', '20 m', '20-m'
    s = s.replace(/\s+/g, '');
    s = s.replace('-', '');

    // si ya termina en 'm' y es del tipo '20m' lo aceptamos
    if (/^\d+m$/.test(s)) return s;

    // si viene en MHz, extraer número y mapear
    const mhzMatch = s.match(/([\d\.]+)\s*mhz/);
    if (mhzMatch) {
      const b = mhzToBand(mhzMatch[1]);
      if (b) return b;
    }

    // si es frecuencia en kHz o en Hz (ej '14000' ó '14000hz'), intentar convertir
    const freqNum = s.match(/^\d+(\.\d+)?$/);
    if (freqNum) {
      const f = parseFloat(s);
      // si parece kHz (>= 1000), convertir a MHz
      let mhz = f;
      if (f > 100) { // asumimos kHz
        mhz = f / 1000;
      }
      const b = mhzToBand(mhz);
      if (b) return b;
    }

    // por defecto devolver la cadena en minúsculas tal cual (para no perder datos)
    return s;
  };

  return records.map(r => {
    const call = (r.match(/<call:.*?>([^<]+)/i) || [])[1];
    const bandRaw = (r.match(/<band:.*?>([^<]+)/i) || [])[1];
    const mode = (r.match(/<mode:.*?>([^<]+)/i) || [])[1];

    const band = normalizaBanda(bandRaw);
    return call ? { call: call.trim().toUpperCase(), band, mode: mode ? mode.trim() : null } : null;
  }).filter(Boolean);
}

function esArgentino(call) {
  return /^(L\d+|(AY|AZ|LO|LP|LQ|LR|LS|LT)\d|LU\d|LV\d|LW\d)/i.test(call);
}

function provinciaDeIndicativo(call) {
  // Dividir el indicativo en base y sufijo
  const partes = call.split('/');
  const baseCall = partes[0];
  const portableSuffix = partes.length > 1 ? partes[1] : null;

  // 1. La regla más importante: ¿Es un indicativo argentino?
  // Si la base no es argentina, se descarta todo el indicativo.
  if (!esArgentino(baseCall)) {
    return null;
  }

  // 2. Si tiene sufijo, procesarlo con prioridad.
  if (portableSuffix) {
    // Lista de sufijos a ignorar explícitamente (/MM, /M, etc.)
    const sufijosIgnorados = ['MM', 'QRP'];
    if (sufijosIgnorados.includes(portableSuffix)) {
      return null; // Ignorar este QSO
    }

    // Si el sufijo no se ignora, intentar encontrar una provincia a partir de él.
    const provDesdeSufijo = sufijosPortablesMap.get(portableSuffix);
    if (provDesdeSufijo) return provDesdeSufijo;
  }

  // 3. Si no hay sufijo portable válido, procesar el indicativo base.
  // Extraer la letra del distrito (ej: 'D' de 'LU1DXX')
  const matchDistrito = baseCall.match(/^(?:L\d|LU|LV|LW|A[Y-Z]|L[O-T])\d([A-Z])/i);
  const letraDistrito = matchDistrito ? matchDistrito[1] : null;

  // Búsqueda por rango (para Chaco, Formosa, etc., que no usan letra de distrito)
  const sub = baseCall.replace(/^(L\d+|(AY|AZ|LO|LP|LQ|LR|LS|LT)\d|LU\d|LV\d|LW\d)/i, "").toUpperCase();
  const provPorRango = rangos.find(p => sub >= p.rango[0] && sub <= p.rango[1]);
  if (provPorRango) return provPorRango.nombre;

  // Búsqueda por prefijo simple usando la letra del distrito
  if (letraDistrito && prefijosSimples.has(letraDistrito)) {
    return prefijosSimples.get(letraDistrito);
  }

  return null;
}

function filtrarQSOsPorModo(qsos, modo) {
  if (modo === 'all') return qsos;

  const modosFonia = ['SSB', 'LSB', 'USB', 'AM', 'FM'];
  const modosDigitales = ['RTTY', 'PSK', 'PSK31', 'PSK63', 'PSK125', 'QPSK', 'JT65', 'JT9', 'FT8', 'FT4', 'MFSK', 'MFSK16', 'OLIVIA', 'CONTESTI', 'DOMINO', 'HELL'];

  return qsos.filter(q => {
    if (!q.mode) return false;
    const qMode = q.mode.toUpperCase();

    if (modo === 'phone') {
      return modosFonia.includes(qMode);
    }
    if (modo === 'cw') {
      return qMode === 'CW';
    }
    if (modo === 'digital') {
      return modosDigitales.some(digitalMode => qMode.startsWith(digitalMode));
    }

    return false; // Si no coincide con ningún filtro, se descarta.
  });
}

function procesarQSOs(qsos, indicativosAIgnorar = new Set()) {
  const resumen = {};

  for (const q of qsos) {
    if (indicativosAIgnorar.has(q.call)) continue;

    const prov = provinciaDeIndicativo(q.call);
    if (!prov) continue;
    if (!q.band) continue; // Ignoramos QSOs sin banda para la grilla
    if (!resumen[prov]) resumen[prov] = {}; // ej: { "Buenos Aires": {} }
    if (!resumen[prov][q.band]) {
      resumen[prov][q.band] = { count: 0, calls: new Set() }; // ej: { "40m": { count: 0, calls: Set() } }
    }
    resumen[prov][q.band].count++;
    resumen[prov][q.band].calls.add(q.call);
  }
  return resumen;
}

function renderTabla({ resumen }) {
  const table = document.getElementById('provinceTable');
  table.innerHTML = ''; // Limpiar tabla por completo
  const bandasAMostrar = ALL_BANDS;
  if (Object.keys(resumen).length === 0) {
    table.innerHTML = '<tbody><tr><td>No se encontraron contactos válidos para mostrar en la grilla.</td></tr></tbody>';
    return;
  }

  const thead = table.createTHead();
  const tbody = table.createTBody();
  if (!PROVINCIAS_ORDENADAS) return; // Seguridad por si algo falla
  const totalProvincias = PROVINCIAS_ORDENADAS.length;

  // --- Fila 1: Iconos de completado ---
  const FilaIconos = thead.insertRow();
  FilaIconos.appendChild(document.createElement('th')).textContent = '🏆'; // Celda de esquina

  const nombreAntartida = "Antártida e Islas del Atlántico Sur";
  // Total de entidades sin contar Antártida (24)
  const totalProvinciasContinentales = PROVINCIAS_ORDENADAS.filter(p => p !== nombreAntartida).length;

  bandasAMostrar.forEach(banda => {
    const provinciasContactadas = Object.keys(resumen).filter(prov => resumen[prov]?.[banda]?.count > 0);
    const antartidaContactada = provinciasContactadas.includes(nombreAntartida);
    
    // Contamos cuántas de las "continentales" se han contactado
    const countContinentales = provinciasContactadas.filter(p => p !== nombreAntartida).length;

    const celda = FilaIconos.appendChild(document.createElement('th'));

    if (countContinentales === totalProvinciasContinentales) {
      if (antartidaContactada) {
        celda.textContent = '⭐🏆';
        celda.title = `¡Todas las entidades completadas en ${banda}!`;
      } else {
        celda.textContent = '⭐';
        celda.title = `¡24 provincias completadas en ${banda}! (Falta Antártida)`;
      }
    }
  });

  // --- Fila 2: Contador de provincias por banda ---
  const FilaContador = thead.insertRow();
  FilaContador.appendChild(document.createElement('th')).textContent = 'Entidades x Banda';

  bandasAMostrar.forEach(banda => {
    const provinciasEnBanda = Object.keys(resumen).filter(prov => resumen[prov]?.[banda]?.count > 0).length;
    const celda = FilaContador.appendChild(document.createElement('th'));
    celda.textContent = `${provinciasEnBanda}`;
  });

  // --- Fila 3: Nombres de las bandas ---
  const FilaBandas = thead.insertRow();
  FilaBandas.appendChild(document.createElement('th')).textContent = 'Entidad';
  bandasAMostrar.forEach(banda => {
    FilaBandas.appendChild(document.createElement('th')).textContent = banda;
  });

  // --- Cuerpo de la tabla: Provincias y conteos ---
  PROVINCIAS_ORDENADAS.forEach(prov => {
    const row = document.createElement("tr");
    // La primera celda de cada fila del cuerpo también es un encabezado de fila
    const cellProv = row.appendChild(document.createElement('th'));
    cellProv.textContent = prov;

    bandasAMostrar.forEach(banda => {
      const cellData = resumen[prov]?.[banda];
      const count = cellData?.count || 0;
      const cell = row.insertCell();
      cell.textContent = count;
      if (count === 0) {
        cell.classList.add('cero');
        cell.classList.add('noQSOs');
      }
      if (count > 0) {
        cell.classList.add('contactado');
        cell.classList.add('hasQSOs');
        cell.addEventListener('click', () => {
          modalTitle.textContent = `Indicativos para ${prov} en ${banda}`;
          const callsigns = [...cellData.calls].sort().join(' ');
          modalCallsigns.textContent = callsigns;
          openModal();
        });
      }
    });
    tbody.appendChild(row);
  });

  // --- Pie de tabla: Totales por banda ---
  const tfoot = table.createTFoot();
  const FilaTotales = tfoot.insertRow();
  // La primera celda del pie también es un encabezado
  FilaTotales.appendChild(document.createElement('th')).textContent = 'Total QSOs';

  bandasAMostrar.forEach(banda => {
    const totalQSOsBanda = Object.values(resumen).reduce((total, provData) => {
        return total + (provData[banda]?.count || 0);
    }, 0);

    // Usamos 'th' también para las celdas de totales para que hereden el estilo
    const celda = FilaTotales.appendChild(document.createElement('th'));
    celda.textContent = totalQSOsBanda;
  });
}

// --- Funciones del Mapa ---

/**
 * Normaliza un nombre de provincia para que coincida con los IDs del SVG.
 * Ej: "Tucumán" -> "Tucuman", "Entre Ríos" -> "Entre_Rios"
 * @param {string} nombre El nombre de la provincia.
 * @returns {string} El nombre normalizado para usar como ID.
 */
function normalizarNombreParaID(nombre) {
  return nombre
    .normalize("NFD") // Separa caracteres base de sus acentos (ej: 'é' -> 'e' + '´')
    .replace(/[\u0300-\u036f]/g, "") // Elimina los caracteres diacríticos (acentos)
    .replace(/ /g, '_'); // Reemplaza espacios con guiones bajos
}

function actualizarMapa(resumen) {
  // Primero, reseteamos todas las provincias a su estado original
  const todasLasProvinciasSVG = document.querySelectorAll('#mapa-argentina-svg path, #mapa-argentina-svg g');
  todasLasProvinciasSVG.forEach(el => el.classList.remove('contactada'));

  // Luego, coloreamos solo las contactadas
  const provinciasContactadas = Object.keys(resumen);
  provinciasContactadas.forEach(nombreProvincia => {
    const idProvincia = normalizarNombreParaID(nombreProvincia);
    const elementoProvincia = document.getElementById(idProvincia);
    if (elementoProvincia) {
      elementoProvincia.classList.add('contactada');
    }
  });
}

// ============================
// Cambiar tema claro/oscuro
// ============================
document.addEventListener("DOMContentLoaded", () => {
  // --- Añadir tooltips al mapa ---
  // 1. Crear un mapa de ID -> Nombre de Provincia
  const idANombreMapa = new Map();
  provincias.forEach(p => {
    const id = normalizarNombreParaID(p.nombre);
    idANombreMapa.set(id, p.nombre);
  });

  // 2. Seleccionar todos los elementos del mapa que tienen un ID
  const todasLasProvinciasSVG = document.querySelectorAll('#mapa-argentina-svg path[id], #mapa-argentina-svg g[id]');
  
  // 3. Añadir un elemento <title> a cada provincia
  todasLasProvinciasSVG.forEach(elementoProvincia => {
    const id = elementoProvincia.id;
    if (idANombreMapa.has(id)) {
      const nombreProvincia = idANombreMapa.get(id);
      // Es importante usar createElementNS para elementos SVG
      const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      titleElement.textContent = nombreProvincia;
      elementoProvincia.appendChild(titleElement);
    }
  });

  const themeSelect = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme") || "light";

  // Aplica el tema guardado
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeSelect.value = savedTheme;

  // Cambia el tema cuando el usuario elige otro
  themeSelect.addEventListener("change", (e) => {
    const theme = e.target.value;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  });
});

// Cargar la lista de ignorados al iniciar la página
cargarConfiguraciones();
