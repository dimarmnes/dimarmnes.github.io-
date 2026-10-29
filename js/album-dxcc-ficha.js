import { feature as topoFeature, mesh as topoMesh } from "./vendor/topojson-client.js";

const MAP_URL = "images/grids/countries-110m.json";
const CATALOG_URL = "datos/dxcc.json";
const dialog = document.querySelector("#catalog-dialog");
const canvas = document.querySelector("#orthographic-globe");
let borders = [];
let landPolygons = [];
let landMask;
let russiaMask;
let countryPolygons = [];
let entities = [];
let detailsById = new Map();
let modesById = new Map();
let visibleEntityIds = [];
let selectedEntity;
let selectedDetail;

const continentNames = {
  AF: "África", AN: "Antártida", AS: "Asia", EU: "Europa",
  NA: "América del Norte", OC: "Oceanía", SA: "América del Sur"
};

function formatZones(zones) {
  if (!zones.length) return "—";
  const sorted = [...zones].sort((a, b) => a - b);
  const groups = [];
  let start = sorted[0];
  let end = start;
  for (const zone of sorted.slice(1)) {
    if (zone === end + 1) { end = zone; continue; }
    groups.push(start === end ? `${start}` : `${start}–${end}`);
    start = end = zone;
  }
  groups.push(start === end ? `${start}` : `${start}–${end}`);
  return groups.join(" · ");
}

function formatCoordinate(value, positive, negative) {
  return `${Math.abs(value).toFixed(2)}° ${value >= 0 ? positive : negative}`;
}

function wikipediaUrl(detail, entity) {
  return detail.wikipedia ||
    `https://es.wikipedia.org/wiki/Especial:Buscar?search=${encodeURIComponent(entity.name)}`;
}

function normalizedName(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const mapCountryAliases = new Map([
  [6, ["United States of America"]],
  [40, ["Greece"]],
  [49, ["Eq. Guinea"]],
  [46, ["Malaysia"]],
  [61, ["Russia"]],
  [63, ["France"]],
  [72, ["Dominican Rep."]],
  [126, ["Russia"]],
  [131, ["Fr. S. Antarctic Lands"]],
  [141, ["Falkland Is."]],
  [214, ["France"]],
  [225, ["Italy"]],
  [259, ["Norway"]],
  [299, ["Malaysia"]],
  [293, ["Vietnam"]],
  [344, ["North Korea"]],
  [345, ["Brunei"]],
  [408, ["Central African Rep."]],
  [412, ["Congo"]],
  [414, ["Dem. Rep. Congo"]],
  [422, ["Gambia"]],
  [501, ["Bosnia and Herz."]],
  [502, ["Macedonia"]],
  [503, ["Czechia"]],
  [521, ["S. Sudan"]]
]);

const componentOnlyMapMatches = new Set([6, 40, 46, 61, 63, 126, 131, 214, 225, 259, 291, 299]);
const fillWithoutAreaThreshold = new Set([13]);

function polygonMatchesEntity(countryName, entityName, entityId) {
  const country = normalizedName(countryName);
  const entity = normalizedName(entityName);
  if (!country || !entity) return false;
  if (country === entity) return true;
  return (mapCountryAliases.get(Number(entityId)) || [])
    .some(alias => normalizedName(alias) === country);
}

function entityModes(id) { return modesById.get(id) || {}; }

function entityStatus(id) {
  const modes = entityModes(id);
  if (Object.values(modes).includes("confirmed")) return "confirmed";
  if (Object.keys(modes).length) return "worked";
  return "needed";
}

function postmark(mode, status) {
  const css = mode === "CW" ? "pm-cw" : mode === "SSB" ? "pm-ssb" : "pm-digi";
  return `<span class="postmark ${css} ${status}">${mode}</span>`;
}

function stampMarkup(entity, status = "needed", modes = {}) {
  const flag = entity.flagImage
    ? `<img class="flag flag-image" src="${entity.flagImage}" alt="" aria-hidden="true">`
    : `<span class="flag" aria-hidden="true">${entity.flag}</span>`;
  return `<article class="stamp ${status}">
    <span class="mini-dxcc">DXCC</span>
    <span class="entity-no">${entity.id}</span>
    ${Object.entries(modes).map(([mode, state]) => postmark(mode, state)).join("")}
    ${flag}
    <strong class="prefix">${entity.prefix || "—"}</strong>
    <span class="country">${entity.name}</span>
  </article>`;
}

function fitEntityTitle() {
  const title = document.querySelector("#catalog-title");
  const mobile = matchMedia("(max-width: 900px)").matches;
  const minimum = mobile ? 20 : 24;
  let size = mobile ? 64 : 72;
  title.style.fontSize = `${size}px`;
  const lineCount = () => {
    const range = document.createRange();
    range.selectNodeContents(title);
    return new Set([...range.getClientRects()]
      .filter(rect => rect.width > 0)
      .map(rect => Math.round(rect.top))).size;
  };
  while (size > minimum &&
    (lineCount() > 2 || title.scrollHeight > title.clientHeight + 1 ||
      title.scrollWidth > title.clientWidth + 1)) {
    size -= 1;
    title.style.fontSize = `${size}px`;
  }
}

function adjacentEntity(step) {
  const available = visibleEntityIds
    .map(id => detailsById.get(Number(id)))
    .filter(Boolean);
  const sequence = available.length ? available : entities;
  const index = sequence.findIndex(entity => entity.id === selectedEntity?.id);
  if (index < 0 || !sequence.length) return null;
  return sequence[(index + step + sequence.length) % sequence.length];
}

function updateCardNavigation() {
  const previous = adjacentEntity(-1);
  const next = adjacentEntity(1);
  const previousButton = document.querySelector("#previous-card");
  const nextButton = document.querySelector("#next-card");
  previousButton.title = previous ? `Anterior: ${previous.name}` : "Entidad anterior";
  nextButton.title = next ? `Siguiente: ${next.name}` : "Entidad siguiente";
  previousButton.setAttribute("aria-label", previousButton.title);
  nextButton.setAttribute("aria-label", nextButton.title);
}

function navigateCard(step) {
  const entity = adjacentEntity(step);
  if (entity) openCard(entity);
}

function openCard(entity) {
  const detail = detailsById.get(entity.id);
  if (!detail) return;
  selectedEntity = entity;
  selectedDetail = detail;
  document.querySelector("#card-number").textContent = entity.id;
  document.querySelector("#card-dxcc").textContent = entity.id;
  document.querySelector("#catalog-title").textContent = entity.name;
  const english = document.querySelector("#card-name-en");
  english.textContent = entity.nameEn;
  english.hidden = entity.name.localeCompare(entity.nameEn, "es", {sensitivity: "base"}) === 0;
  const continents = detail.continent.split(",").map(code => continentNames[code] || code).join(" / ");
  document.querySelector("#card-region").textContent = continents;
  document.querySelector("#card-continent").textContent = continents;
  document.querySelector("#card-cq").textContent = formatZones(detail.zones.cq);
  document.querySelector("#card-itu").textContent = formatZones(detail.zones.itu);
  const prefixes = detail.prefixes.join(" · ") || entity.prefix || "—";
  document.querySelector("#card-prefixes").textContent = prefixes;
  document.querySelector("#card-prefixes").title = prefixes;
  document.querySelector("#card-coordinates").textContent =
    `${formatCoordinate(detail.geo.lat, "N", "S")} · ${formatCoordinate(detail.geo.lon, "E", "O")}`;
  document.querySelector("#selected-stamp").innerHTML = stampMarkup(
    entity, entityStatus(entity.id), entityModes(entity.id)
  );
  document.querySelector("#card-summary").textContent = detail.summary ||
    `Esta ficha reúne la ubicación y los datos de referencia de ${entity.name}. La reseña geográfica se incorporará en una próxima etapa del catálogo.`;
  document.querySelector("#card-wikipedia").href = wikipediaUrl(detail, entity);
  updateCardNavigation();
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => {
    fitEntityTitle();
    resizeGlobe();
  });
}

function closeCard() { dialog.close(); }

function orthographic(lon, lat, centerLon = selectedDetail?.geo.lon ?? 0, centerLat = selectedDetail?.geo.lat ?? 0) {
  const lambda = (lon - centerLon) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const phi0 = centerLat * Math.PI / 180;
  const visible = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
  return {
    visible: visible >= 0,
    x: Math.cos(phi) * Math.sin(lambda),
    y: -(Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda))
  };
}

function drawPath(context, coordinates, cx, cy, radius) {
  let drawing = false;
  for (const [lon, lat] of coordinates) {
    const point = orthographic(lon, lat);
    if (!point.visible) { drawing = false; continue; }
    const x = cx + point.x * radius;
    const y = cy + point.y * radius;
    if (!drawing) { context.moveTo(x, y); drawing = true; }
    else context.lineTo(x, y);
  }
}

function unwrapRing(ring) {
  if (!ring.length) return [];
  const result = [[ring[0][0], ring[0][1]]];
  for (const [rawLon, lat] of ring.slice(1)) {
    let lon = rawLon;
    const previous = result.at(-1)[0];
    while (lon - previous > 180) lon -= 360;
    while (lon - previous < -180) lon += 360;
    result.push([lon, lat]);
  }
  return result;
}

function buildLandMask() {
  const width = 720;
  const height = 360;
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const context = mask.getContext("2d", {willReadFrequently: true});
  context.fillStyle = "#fff";
  for (const polygon of landPolygons) {
    context.beginPath();
    for (const ring of polygon) {
      const unwrapped = unwrapRing(ring);
      for (const shift of [-360, 0, 360]) {
        unwrapped.forEach(([lon, lat], index) => {
          const x = (lon + shift + 180) / 360 * width;
          const y = (90 - lat) / 180 * height;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.closePath();
      }
    }
    context.fill("evenodd");
  }
  landMask = {width, height, data: context.getImageData(0, 0, width, height).data};
}

function buildPolygonMask(polygons) {
  const width = 720;
  const height = 360;
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const context = mask.getContext("2d", {willReadFrequently: true});
  context.fillStyle = "#fff";
  for (const polygon of polygons) {
    context.beginPath();
    for (const ring of polygon) {
      const unwrapped = unwrapRing(ring);
      for (const shift of [-360, 0, 360]) {
        unwrapped.forEach(([lon, lat], index) => {
          const x = (lon + shift + 180) / 360 * width;
          const y = (90 - lat) / 180 * height;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.closePath();
      }
    }
    context.fill("evenodd");
  }
  return {width, height, data: context.getImageData(0, 0, width, height).data};
}

const russiaDivision = [
  [54.5, 51.2],
  [58, 55],
  [59, 60],
  [65, 66],
  [67, 69.5]
];

function russiaBoundaryLongitude(lat) {
  if (lat <= russiaDivision[0][1]) return russiaDivision[0][0];
  if (lat >= russiaDivision.at(-1)[1]) return russiaDivision.at(-1)[0];
  for (let index = 1; index < russiaDivision.length; index += 1) {
    const [nextLon, nextLat] = russiaDivision[index];
    const [previousLon, previousLat] = russiaDivision[index - 1];
    if (lat <= nextLat) {
      const progress = (lat - previousLat) / (nextLat - previousLat);
      return previousLon + (nextLon - previousLon) * progress;
    }
  }
  return russiaDivision.at(-1)[0];
}

function drawSurface(context, cx, cy, radius) {
  if (!landMask) return;
  const left = Math.floor(cx - radius);
  const top = Math.floor(cy - radius);
  const diameter = Math.ceil(radius * 2);
  const image = context.createImageData(diameter, diameter);
  const phi0 = (selectedDetail?.geo.lat ?? 0) * Math.PI / 180;
  const lambda0 = (selectedDetail?.geo.lon ?? 0) * Math.PI / 180;
  for (let py = 0; py < diameter; py += 1) {
    for (let px = 0; px < diameter; px += 1) {
      const x = (px + left - cx) / radius;
      const north = -(py + top - cy) / radius;
      const rho = Math.hypot(x, north);
      if (rho > 1) continue;
      const c = Math.asin(Math.min(1, rho));
      const sinC = Math.sin(c);
      const cosC = Math.cos(c);
      const lat = rho < 1e-7
        ? phi0
        : Math.asin(cosC * Math.sin(phi0) + north * sinC * Math.cos(phi0) / rho);
      const lon = rho < 1e-7
        ? lambda0
        : lambda0 + Math.atan2(x * sinC, rho * Math.cos(phi0) * cosC - north * Math.sin(phi0) * sinC);
      const lonDeg = ((lon * 180 / Math.PI + 540) % 360) - 180;
      const latDeg = lat * 180 / Math.PI;
      const mx = Math.max(0, Math.min(landMask.width - 1, Math.floor((lonDeg + 180) / 360 * landMask.width)));
      const my = Math.max(0, Math.min(landMask.height - 1, Math.floor((90 - latDeg) / 180 * landMask.height)));
      const isLand = landMask.data[(my * landMask.width + mx) * 4 + 3] > 0;
      const isRussia = russiaMask?.data[(my * russiaMask.width + mx) * 4 + 3] > 0;
      const russianEntity = Number(selectedEntity?.id);
      const selectedRussia = isRussia && (
        (russianEntity === 54 && lonDeg <= russiaBoundaryLongitude(latDeg)) ||
        (russianEntity === 15 && lonDeg > russiaBoundaryLongitude(latDeg))
      );
      const light = Math.max(-.13, Math.min(.12, (-x - north) * .07));
      const edge = Math.max(0, rho - .72) * .16;
      const antarcticaSelected = Number(selectedEntity?.id) === 13 &&
        ((isLand && latDeg < -60) || latDeg < -85);
      const base = (antarcticaSelected || selectedRussia) ? [70, 116, 75]
        : isLand ? [218, 208, 178] : [121, 177, 190];
      const offset = Math.round((light - edge) * 255);
      const target = (py * diameter + px) * 4;
      image.data[target] = Math.max(0, Math.min(255, base[0] + offset));
      image.data[target + 1] = Math.max(0, Math.min(255, base[1] + offset));
      image.data[target + 2] = Math.max(0, Math.min(255, base[2] + offset));
      image.data[target + 3] = 255;
    }
  }
  context.putImageData(image, left, top);
}

function pointInRing(lon, lat, ring) {
  const unwrapped = unwrapRing(ring);
  return [lon - 360, lon, lon + 360].some(testLon => {
    let inside = false;
    for (let i = 0, j = unwrapped.length - 1; i < unwrapped.length; j = i++) {
      const [xi, yi] = unwrapped[i];
      const [xj, yj] = unwrapped[j];
      const intersects = (yi > lat) !== (yj > lat) &&
        testLon < (xj - xi) * (lat - yi) / (yj - yi) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  });
}

function containingPolygon(lon, lat) {
  return countryPolygons.find(({polygon}) =>
    pointInRing(lon, lat, polygon[0]) && !polygon.slice(1).some(ring => pointInRing(lon, lat, ring))
  );
}

function projectedArea(ring) {
  const points = ring.map(([lon, lat]) => orthographic(lon, lat)).filter(point => point.visible);
  if (points.length < 3) return 0;
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2);
}

function drawSelectedArea(context, polygon, cx, cy, radius) {
  context.beginPath();
  for (const ring of polygon) {
    let drawing = false;
    for (const [lon, lat] of ring) {
      const point = orthographic(lon, lat);
      if (!point.visible) { drawing = false; continue; }
      const x = cx + point.x * radius;
      const y = cy + point.y * radius;
      if (!drawing) { context.moveTo(x, y); drawing = true; }
      else context.lineTo(x, y);
    }
    if (drawing) context.closePath();
  }
  context.fillStyle = "rgba(70, 116, 75, .88)";
  context.fill("evenodd");
  context.strokeStyle = "#315f43";
  context.lineWidth = Math.max(1.5, radius / 150);
  context.stroke();
}

function drawGlobe() {
  if (!canvas.width || !canvas.height) return;
  const context = canvas.getContext("2d");
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = size * .455;
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.clip();
  drawSurface(context, cx, cy, radius);

  context.strokeStyle = "rgba(245, 241, 217, .48)";
  context.lineWidth = Math.max(1, size / 560);
  for (let lat = -80; lat <= 80; lat += 20) {
    context.beginPath();
    drawPath(context, Array.from({length: 181}, (_, i) => [-180 + i * 2, lat]), cx, cy, radius);
    context.stroke();
  }
  for (let lon = -180; lon < 180; lon += 20) {
    context.beginPath();
    drawPath(context, Array.from({length: 171}, (_, i) => [lon, -85 + i]), cx, cy, radius);
    context.stroke();
  }

  context.strokeStyle = "#6c766d";
  context.lineWidth = Math.max(1.2, size / 430);
  context.beginPath();
  borders.forEach(line => drawPath(context, line, cx, cy, radius));
  context.stroke();

  const selectedLon = selectedDetail?.geo.lon ?? 0;
  const selectedLat = selectedDetail?.geo.lat ?? 0;
  const entityId = Number(selectedEntity?.id);
  const containingArea = containingPolygon(selectedLon, selectedLat);
  const matchingAreas = countryPolygons.filter(area =>
    polygonMatchesEntity(area.countryName, selectedEntity?.nameEn, entityId));
  const selectedAreas = componentOnlyMapMatches.has(entityId)
    ? (containingArea && polygonMatchesEntity(
      containingArea.countryName, selectedEntity?.nameEn, entityId) ? [containingArea] : [])
    : matchingAreas;
  const selectedAreaSize = selectedAreas.reduce(
    (total, area) => total + projectedArea(area.polygon[0]), 0);
  const russianSplitSelected = [15, 54].includes(entityId) && Boolean(russiaMask);
  const fillSelected = russianSplitSelected || selectedAreas.length > 0 &&
    (fillWithoutAreaThreshold.has(entityId) || selectedAreaSize >= .0004);
  if (fillSelected && entityId !== 13 && !russianSplitSelected) {
    selectedAreas.forEach(area => drawSelectedArea(context, area.polygon, cx, cy, radius));
  }
  if (russianSplitSelected) {
    context.strokeStyle = "#315f43";
    context.lineWidth = Math.max(1.2, radius / 190);
    context.beginPath();
    drawPath(context, russiaDivision, cx, cy, radius);
    context.stroke();
  }

  const marker = orthographic(selectedLon, selectedLat);
  const mx = cx + marker.x * radius;
  const my = cy + marker.y * radius;
  if (!fillSelected) {
    context.fillStyle = "rgba(143,49,41,.22)";
    context.beginPath(); context.arc(mx, my, size * .035, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#8f3129";
    context.strokeStyle = "#f5ead0";
    context.lineWidth = Math.max(2, size / 180);
    context.beginPath(); context.arc(mx, my, size * .012, 0, Math.PI * 2); context.fill(); context.stroke();
  }
  context.restore();

  context.strokeStyle = "#6f654e";
  context.lineWidth = Math.max(2, size / 250);
  context.beginPath(); context.arc(cx, cy, radius, 0, Math.PI * 2); context.stroke();
  context.strokeStyle = "rgba(111,101,78,.42)";
  context.lineWidth = Math.max(1, size / 700);
  context.beginPath(); context.arc(cx, cy, radius * 1.035, 0, Math.PI * 2); context.stroke();
}

function resizeGlobe() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  drawGlobe();
}

function syncAlbumState(albumEntities = [], activeIds = []) {
  modesById = new Map(albumEntities.map(entity => [Number(entity.id), {...entity.modes}]));
  visibleEntityIds = activeIds.map(Number);
}

async function start() {
  try {
    const catalogResponse = await fetch(CATALOG_URL);
    if (!catalogResponse.ok) throw new Error("No se pudo cargar el catálogo de fichas DXCC.");
    const catalog = await catalogResponse.json();
    entities = catalog.entities;
    detailsById = new Map(entities.map(item => [item.id, item]));
  } catch (error) {
    console.warn("No se pudo iniciar la ficha DXCC.", error);
    return;
  }
  syncAlbumState(window.DXCC_ALBUM_ENTITIES, window.DXCC_ALBUM_VISIBLE_IDS);
  try {
    const mapResponse = await fetch(MAP_URL);
    if (!mapResponse.ok) throw new Error("No se pudo cargar el mapa.");
    const topology = await mapResponse.json();
    borders = topoMesh(topology, topology.objects.countries).coordinates;
    const land = topoFeature(topology, topology.objects.land);
    landPolygons = land.features[0].geometry.coordinates;
    buildLandMask();
    const countries = topoFeature(topology, topology.objects.countries).features;
    countryPolygons = countries.flatMap(country => {
      const geometry = country.geometry;
      const polygons = geometry.type === "Polygon" ? [geometry.coordinates]
        : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
      return polygons.map(polygon => ({
        polygon,
        countryName: country.properties?.name || ""
      }));
    });
    russiaMask = buildPolygonMask(countryPolygons
      .filter(area => normalizedName(area.countryName) === "russia")
      .map(area => area.polygon));
  } catch (error) {
    console.warn("La ficha se mostrará sin el mapa geográfico.", error);
  }
  resizeGlobe();
  const requested = Number(new URLSearchParams(location.search).get("ficha"));
  if (requested) openCard(entities.find(entity => entity.id === requested) || entities[0]);
}

document.addEventListener("dxccalbumrendered", event =>
  syncAlbumState(event.detail.entities, event.detail.visibleIds));
document.querySelector("#grid").addEventListener("click", event => {
  const stamp = event.target.closest(".stamp-wrap[data-dxcc]");
  if (!stamp) return;
  const entity = detailsById.get(Number(stamp.dataset.dxcc));
  if (entity) openCard(entity);
});
document.querySelector("#grid").addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const stamp = event.target.closest(".stamp-wrap[data-dxcc]");
  if (!stamp) return;
  event.preventDefault();
  const entity = detailsById.get(Number(stamp.dataset.dxcc));
  if (entity) openCard(entity);
});

document.querySelector("#close-card").addEventListener("click", closeCard);
document.querySelector("#previous-card").addEventListener("click", () => navigateCard(-1));
document.querySelector("#next-card").addEventListener("click", () => navigateCard(1));
dialog.addEventListener("click", event => { if (event.target === dialog) closeCard(); });
document.addEventListener("keydown", event => {
  if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "ArrowLeft") { event.preventDefault(); navigateCard(-1); }
  if (event.key === "ArrowRight") { event.preventDefault(); navigateCard(1); }
});
window.addEventListener("resize", () => {
  if (!dialog.open) return;
  fitEntityTitle();
  resizeGlobe();
});

start();
