const CATALOG_URL = "datos/dxcc.json";
const ADIF_URL = "datos/contactos.adi";

let entities = [];
let statusFilter = "workedplus";
let continentFilter = "ALL";

function parseAdif(text) {
  const records = [];
  const parts = text.split(/<eor\s*>/i);
  for (const part of parts) {
    const record = {};
    const fieldPattern = /<([^:>]+):(\d+)(?::[^>]*)?>/gi;
    let match;
    while ((match = fieldPattern.exec(part))) {
      const length = Number(match[2]);
      const valueStart = fieldPattern.lastIndex;
      record[match[1].toLowerCase()] = part.slice(valueStart, valueStart + length).trim();
      fieldPattern.lastIndex = valueStart + length;
    }
    if (record.call || record.dxcc || record.country) records.push(record);
  }
  return records;
}

function modeGroup(qso) {
  const mode = (qso.mode || "").toUpperCase();
  const submode = (qso.submode || "").toUpperCase();
  if (mode === "CW" || submode === "CW") return "CW";
  if (["SSB", "PHONE", "FM", "AM"].includes(mode)) return "SSB";
  return "DIGI";
}

function isConfirmed(qso) {
  return [qso.qsl_rcvd, qso.lotw_qsl_rcvd, qso.eqsl_qsl_rcvd]
    .some(value => ["Y", "V"].includes(String(value || "").toUpperCase()));
}

function applyLog(catalog, qsos) {
  const byId = new Map(catalog.map(item => [String(item.id), item]));
  const byName = new Map();
  for (const item of catalog) {
    byName.set(item.name.toUpperCase(), item);
    byName.set(item.nameEn.toUpperCase(), item);
  }
  for (const qso of qsos) {
    const entity = byId.get(String(qso.dxcc || "")) || byName.get(String(qso.country || "").toUpperCase());
    if (!entity) continue;
    const mode = modeGroup(qso);
    const state = isConfirmed(qso) ? "confirmed" : "worked";
    entity.modes[mode] = entity.modes[mode] === "confirmed" ? "confirmed" : state;
    entity.qsos += 1;
    if (!entity.cont && qso.cont) entity.cont = qso.cont.toUpperCase();
  }
  for (const entity of catalog) {
    const states = Object.values(entity.modes);
    entity.status = states.includes("confirmed") ? "confirmed" : states.length ? "worked" : "needed";
  }
}

function postmark(mode, state) {
  const cls = mode === "CW" ? "pm-cw" : mode === "SSB" ? "pm-ssb" : "pm-digi";
  return `<span class="postmark ${cls} ${state}" title="${mode}: ${state === "confirmed" ? "confirmado" : "trabajado"}">${mode}</span>`;
}

function matchesStatus(entity) {
  if (statusFilter === "all") return true;
  if (statusFilter === "workedplus") return entity.status === "worked" || entity.status === "confirmed";
  return entity.status === statusFilter;
}

function render() {
  const filtered = entities.filter(entity => matchesStatus(entity) &&
    (continentFilter === "ALL" || entity.cont === continentFilter));
  const grid = document.getElementById("grid");
  grid.innerHTML = filtered.length ? filtered.map(entity => `
    <div class="stamp-wrap" title="${entity.name} · ${entity.nameEn} · DXCC ${entity.id}${entity.qsos ? ` · ${entity.qsos} QSO` : ""}">
      <article class="stamp ${entity.status}">
        <span class="mini-dxcc">DXCC</span>
        <span class="entity-no">${entity.id}</span>
        ${Object.entries(entity.modes).map(([mode, state]) => postmark(mode, state)).join("")}
        <span class="flag" aria-hidden="true">${entity.flag}</span>
        <strong class="prefix">${entity.prefix || "—"}</strong>
        <span class="country">${entity.name}</span>
      </article>
    </div>`).join("") : '<div class="empty">No hay entidades para este filtro.</div>';
  document.getElementById("workedCount").textContent = entities.filter(e => e.status !== "needed").length;
  document.getElementById("confirmedCount").textContent = entities.filter(e => e.status === "confirmed").length;
  document.getElementById("visibleCount").textContent = filtered.length;
}

function selectFilter(value) {
  statusFilter = value;
  document.querySelectorAll(".filter").forEach(button => button.classList.toggle("active", button.dataset.status === value));
}

async function loadAlbum(adifText, localMessage = "") {
  const data = typeof DXCC_DATA !== "undefined"
    ? DXCC_DATA
    : await fetch(CATALOG_URL).then(response => {
        if (!response.ok) throw new Error("No se pudo cargar el catálogo DXCC.");
        return response.json();
      });
  entities = data.entities.map(entity => ({...entity, modes: {}, qsos: 0, status: "needed"}));
  const qsos = parseAdif(adifText);
  applyLog(entities, qsos);
  const validQsos = entities.reduce((total, entity) => total + entity.qsos, 0);
  if (!validQsos) selectFilter("all");
  document.getElementById("dataStatus").textContent = validQsos
    ? `${validQsos.toLocaleString("es-AR")} QSO procesados desde el ADIF.`
    : localMessage || "El catálogo está listo. Falta incorporar el ADIF completo de LU1IDC.";
  render();
}

async function start() {
  if (location.protocol === "file:") {
    const savedAdif = localStorage.getItem("lu1idc-album-adif");
    const savedName = localStorage.getItem("lu1idc-album-adif-name") || "ADIF local";
    if (savedAdif) {
      await loadAlbum(savedAdif);
      document.getElementById("dataStatus").textContent += ` · ${savedName} guardado en este navegador.`;
    } else {
      await loadAlbum("<ADIF_VER:5>3.1.7<EOH>", "Catálogo completo cargado. Para ver tus entidades trabajadas, usá “Cargar ADIF”.");
    }
    return;
  }
  try {
    const response = await fetch(ADIF_URL, {cache: "no-store"});
    if (!response.ok) throw new Error("No se pudo cargar el ADIF publicado.");
    await loadAlbum(await response.text());
  } catch (error) {
    await loadAlbum("<ADIF_VER:5>3.1.7<EOH>", `${error.message} Podés seleccionar uno con “Cargar ADIF”.`);
  }
}

document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  selectFilter(button.dataset.status); render();
}));
document.getElementById("continent").addEventListener("change", event => {
  continentFilter = event.target.value; render();
});
document.getElementById("adifFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    await loadAlbum(text);
    try {
      localStorage.setItem("lu1idc-album-adif", text);
      localStorage.setItem("lu1idc-album-adif-name", file.name);
      document.getElementById("dataStatus").textContent += " · Guardado para próximas visitas en este navegador.";
    } catch (_) {
      document.getElementById("dataStatus").textContent += " · El navegador no permitió guardar la selección.";
    }
  } catch (error) {
    document.getElementById("dataStatus").textContent = error.message;
  }
});

start();
