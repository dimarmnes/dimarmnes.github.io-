import * as THREE from './vendor/three.module.js';
import { mesh as topoMesh } from './vendor/topojson-client.js';
const EARTH_TEXTURE = 'images/grids/earth-blue-marble.jpg';
const COUNTRY_DATA = 'images/grids/countries-110m.json';
const QTH = { locator: 'GG22KD', lat: -27.854, lng: -55.136, place: 'San Javier · Misiones' };
let grids = window.GRIDS_DATA.grids.map(g => ({...g, ...maidenhead(g.locator)}));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = { rotate: !reducedMotion.matches, confirmedOnly: false };
const lifecycle = new AbortController();
const nativeListen = (target, event, handler, options = {}) => target.addEventListener(event, handler, {...options, signal: lifecycle.signal});
let visible = true, frame = 0, disposed = false;
const els = Object.fromEntries(['stage','c','tooltip','loading','selected-locator','selected-place','selected-qsos','selected-status','worked-count','confirmed-count'].map(key => [key.replace(/-([a-z])/g, (_,c)=>c.toUpperCase()), document.getElementById(key === 'stage' ? 'globe-stage' : key === 'c' ? 'globe-c' : key)]));
let deskC;
function activeGrids() { return state.confirmedOnly ? grids.filter(g => g.confirmed) : grids; }
function setSelected(g) {
  els.selectedLocator.textContent = g.locator;
  els.selectedPlace.textContent = g.calls?.join(' · ') || g.place;
  els.selectedQsos.textContent = g.qsos ? `${g.qsos} · ${(g.modes || []).join(', ')}` : 'Estación base';
  els.selectedStatus.textContent = g.qsos ? (g.confirmed ? 'Confirmada' : 'Trabajada') : 'Mi QTH';
}
function showTooltip(event,g) {
  const rect = els.stage.getBoundingClientRect();
  els.tooltip.style.left = `${Math.min(event.clientX-rect.left, rect.width-180)}px`;
  els.tooltip.style.top = `${Math.max(10,event.clientY-rect.top-70)}px`;
  els.tooltip.textContent = `${g.locator} · ${g.qsos} QSO · ${g.confirmed ? 'Confirmada' : 'Trabajada'}`;
  els.tooltip.hidden = false;
}
function hideTooltip() { els.tooltip.hidden = true; }
function disposeObject(object) {
  object.traverse(node => { node.geometry?.dispose(); const materials = Array.isArray(node.material) ? node.material : [node.material]; materials.filter(Boolean).forEach(m => {m.map?.dispose();m.dispose();}); });
}
function maidenhead(locator) {
  const l = locator.toUpperCase();
  const fieldLon = l.charCodeAt(0) - 65;
  const fieldLat = l.charCodeAt(1) - 65;
  const squareLon = Number(l[2]);
  const squareLat = Number(l[3]);
  let minLng = -180 + fieldLon * 20 + squareLon * 2;
  let minLat = -90 + fieldLat * 10 + squareLat;
  let width = 2;
  let height = 1;
  if (l.length >= 6) {
    minLng += (l.charCodeAt(4) - 65) * (2 / 24);
    minLat += (l.charCodeAt(5) - 65) * (1 / 24);
    width = 2 / 24;
    height = 1 / 24;
  }
  return { minLng, minLat, maxLng: minLng + width, maxLat: minLat + height, lng: minLng + width / 2, lat: minLat + height / 2, width, height };
}

function stageSize() {
  return { width: els.stage.clientWidth, height: els.stage.clientHeight };
}

function latLngVector(lat, lng, radius = 100) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

function lineFromPoints(points, material) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

function initDeskC() {
  if (deskC) return;
  const { width, height } = stageSize();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width / height, .1, 1200);
  camera.position.set(0, -10, 450);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  els.c.append(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xf5fbff, 0x5d4636, 2.45));
  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(-150, 220, 260);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x79d9e6, 1.1);
  rim.position.set(180, 50, -120);
  scene.add(rim);

  const root = new THREE.Group();
  root.position.set(0, 28, 0);
  scene.add(root);

  const assembly = new THREE.Group();
  assembly.rotation.z = THREE.MathUtils.degToRad(-23.4);
  root.add(assembly);

  const spinGroup = new THREE.Group();
  assembly.add(spinGroup);

  const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 8,
    specular: 0x426f7d
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(92, 96, 64), earthMaterial);
  earth.castShadow = true;
  earth.receiveShadow = true;
  spinGroup.add(earth);
  new THREE.TextureLoader().load(EARTH_TEXTURE, texture => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    earthMaterial.map = texture;
    earthMaterial.needsUpdate = true;
    els.loading.hidden = true;
  }, undefined, () => { els.loading.textContent = 'No se pudo cargar el mapa del globo.'; });

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(94.5, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x53d5e5, transparent: true, opacity: .08, side: THREE.BackSide })
  );
  spinGroup.add(atmosphere);

  const globeGrid = new THREE.LineBasicMaterial({ color: 0x35d7e8, transparent: true, opacity: .32 });
  for (let lat = -80; lat <= 80; lat += 10) {
    const points = [];
    for (let lng = -180; lng <= 180; lng += 3) points.push(latLngVector(lat, lng, 92.35));
    spinGroup.add(lineFromPoints(points, globeGrid));
  }
  for (let lng = -180; lng < 180; lng += 10) {
    const points = [];
    for (let lat = -90; lat <= 90; lat += 2) points.push(latLngVector(lat, lng, 92.35));
    spinGroup.add(lineFromPoints(points, globeGrid));
  }

  const countryGroup = new THREE.Group();
  spinGroup.add(countryGroup);
  fetch(COUNTRY_DATA)
    .then(response => response.json())
    .then(world => {
      if (disposed) return;
      const borders = topoMesh(world, world.objects.countries);
      const material = new THREE.LineBasicMaterial({ color: 0xd8f0e6, transparent: true, opacity: .76 });
      borders.coordinates.forEach(line => {
        countryGroup.add(lineFromPoints(line.map(([lng, lat]) => latLngVector(lat, lng, 92.6)), material));
      });
    })
    .catch(() => { document.querySelector('#grids-note').textContent += ' No se pudieron cargar las fronteras.'; });

  const brass = new THREE.MeshStandardMaterial({
    color: 0x8f642a,
    metalness: .78,
    roughness: .28
  });
  const darkBrass = new THREE.MeshStandardMaterial({
    color: 0x553817,
    metalness: .7,
    roughness: .34
  });
  const walnut = new THREE.MeshStandardMaterial({
    color: 0x5b2d18,
    roughness: .42,
    metalness: .05
  });
  const ebony = new THREE.MeshStandardMaterial({
    color: 0x181514,
    roughness: .36,
    metalness: .18
  });

  // Banda meridiana semicircular: plana, ancha y abierta del lado izquierdo.
  const bandPoints = [];
  const bandOuterRadius = 105;
  const bandInnerRadius = 99;
  const bandSegments = 48;
  for (let i = 0; i <= bandSegments; i++) {
    const angle = -Math.PI / 2 + Math.PI * i / bandSegments;
    bandPoints.push(new THREE.Vector2(Math.cos(angle) * bandOuterRadius, Math.sin(angle) * bandOuterRadius));
  }
  for (let i = bandSegments; i >= 0; i--) {
    const angle = -Math.PI / 2 + Math.PI * i / bandSegments;
    bandPoints.push(new THREE.Vector2(Math.cos(angle) * bandInnerRadius, Math.sin(angle) * bandInnerRadius));
  }
  const bandShape = new THREE.Shape(bandPoints);
  const bandGeometry = new THREE.ExtrudeGeometry(bandShape, {
    depth: 2.4,
    bevelEnabled: true,
    bevelThickness: .45,
    bevelSize: .35,
    bevelSegments: 2,
    curveSegments: bandSegments
  });
  bandGeometry.translate(0, 0, -1.2);
  const meridianBand = new THREE.Mesh(bandGeometry, brass);
  meridianBand.castShadow = true;
  meridianBand.receiveShadow = true;
  assembly.add(meridianBand);

  // Graduación discreta únicamente sobre la cara visible de la banda.
  for (let degree = -75; degree <= 75; degree += 15) {
    const angle = THREE.MathUtils.degToRad(degree);
    const major = degree % 30 === 0;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(major ? 4.7 : 3.5, major ? .8 : .55, .38),
      darkBrass
    );
    tick.position.set(Math.cos(angle) * 102, Math.sin(angle) * 102, 1.75);
    tick.rotation.z = angle;
    assembly.add(tick);
  }

  const knobGeometry = new THREE.CylinderGeometry(5.2, 5.2, 8, 24);
  const northKnob = new THREE.Mesh(knobGeometry, brass);
  northKnob.position.y = 106;
  const southKnob = northKnob.clone();
  southKnob.position.y = -106;
  assembly.add(northKnob, southKnob);

  // Eje polar físico, alineado con la inclinación de 23,4° del conjunto.
  const polarAxis = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.35, 224, 18),
    darkBrass
  );
  polarAxis.castShadow = true;
  assembly.add(polarAxis);

  function addPedestalPart(part) {
    part.castShadow = true;
    part.receiveShadow = true;
    root.add(part);
    return part;
  }

  // El primer cono recibe directamente el punto más bajo del medio aro.
  const upperSupport = addPedestalPart(new THREE.Mesh(
    new THREE.CylinderGeometry(10, 16, 15, 32),
    brass
  ));
  upperSupport.position.y = -110.5;

  const footTop = addPedestalPart(new THREE.Mesh(
    new THREE.CylinderGeometry(18, 24, 7, 32),
    brass
  ));
  footTop.position.y = -121.5;

  // Base escalonada rectangular: todas las piezas comparten centro y orientación.
  const upperWoodTier = addPedestalPart(new THREE.Mesh(
    new THREE.BoxGeometry(78, 7, 48),
    walnut
  ));
  upperWoodTier.position.y = -128.5;

  const mainWoodTier = addPedestalPart(new THREE.Mesh(
    new THREE.BoxGeometry(96, 12, 62),
    walnut
  ));
  mainWoodTier.position.y = -138;

  const darkTrim = addPedestalPart(new THREE.Mesh(
    new THREE.BoxGeometry(104, 4, 68),
    ebony
  ));
  darkTrim.position.y = -146;

  const lowerPlinth = addPedestalPart(new THREE.Mesh(
    new THREE.BoxGeometry(112, 8, 74),
    ebony
  ));
  lowerPlinth.position.y = -152;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 250),
    new THREE.ShadowMaterial({ color: 0x15343a, opacity: .13 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -128.5;
  floor.receiveShadow = true;
  scene.add(floor);

  const cellGroup = new THREE.Group();
  spinGroup.add(cellGroup);

  // Pin elevado del QTH: queda por encima de GG22 sin cubrir la celda.
  const qthPin = new THREE.Group();
  qthPin.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    latLngVector(QTH.lat, QTH.lng, 1).normalize()
  );
  const pinStem = new THREE.Mesh(
    new THREE.CylinderGeometry(.42, .72, 7.5, 16),
    new THREE.MeshStandardMaterial({ color: 0xb5843d, metalness: .82, roughness: .24 })
  );
  pinStem.position.y = 97.1;
  const pinHead = new THREE.Mesh(
    new THREE.SphereGeometry(2.65, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xc79a43, metalness: .7, roughness: .25 })
  );
  pinHead.position.y = 102;
  const pinCenter = new THREE.Mesh(
    new THREE.SphereGeometry(1.75, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0x5c421d, emissiveIntensity: .18, roughness: .35 })
  );
  pinCenter.position.y = 103.55;
  qthPin.add(pinStem, pinHead, pinCenter);
  spinGroup.add(qthPin);

  function rebuild() {
    disposeObject(cellGroup);
    cellGroup.clear();
    activeGrids().forEach(g => {
      const corners = [
        latLngVector(g.minLat, g.minLng, 93.1),
        latLngVector(g.minLat, g.maxLng, 93.1),
        latLngVector(g.maxLat, g.maxLng, 93.1),
        latLngVector(g.maxLat, g.minLng, 93.1)
      ];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        ...corners[0], ...corners[1], ...corners[2],
        ...corners[0], ...corners[2], ...corners[3]
      ], 3));
      geometry.computeVertexNormals();
      const cell = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: g.confirmed ? 0x23c8ba : 0xff7138,
          transparent: true,
          opacity: g.confirmed ? .78 : .88,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
      cell.userData.grid = g;
      cellGroup.add(cell);
      const outline = lineFromPoints(
        [
          latLngVector(g.minLat, g.minLng, 93.22),
          latLngVector(g.minLat, g.maxLng, 93.22),
          latLngVector(g.maxLat, g.maxLng, 93.22),
          latLngVector(g.maxLat, g.minLng, 93.22),
          latLngVector(g.minLat, g.minLng, 93.22)
        ],
        new THREE.LineBasicMaterial({
          color: g.confirmed ? 0xa6fff3 : 0xffc09d,
          transparent: true,
          opacity: .95
        })
      );
      cellGroup.add(outline);
    });
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = false;
  let hover = null;

  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  nativeListen(renderer.domElement, 'pointerdown', event => {
    dragging = true;
    moved = false;
    lastX = event.clientX;
    lastY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.style.cursor = 'grabbing';
  });
  nativeListen(renderer.domElement, 'pointermove', event => {
    if (dragging) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      spinGroup.rotation.y += dx * .006;
      spinGroup.rotation.x = THREE.MathUtils.clamp(spinGroup.rotation.x + dy * .0025, -.35, .35);
      lastX = event.clientX;
      lastY = event.clientY;
      hideTooltip();
      return;
    }
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const earthHit = raycaster.intersectObject(earth)[0];
    const hit = raycaster.intersectObjects(cellGroup.children, false).find(item => item.object.userData.grid && (!earthHit || item.distance < earthHit.distance));
    hover = hit?.object.userData.grid || null;
    renderer.domElement.style.cursor = hover ? 'pointer' : 'grab';
    if (hover) showTooltip(event, hover); else hideTooltip();
  });
  nativeListen(renderer.domElement, 'pointerup', event => {
    dragging = false;
    renderer.domElement.releasePointerCapture(event.pointerId);
    renderer.domElement.style.cursor = 'grab';
  });
  nativeListen(renderer.domElement, 'pointerleave', () => {
    dragging = false;
    hideTooltip();
  });
  nativeListen(renderer.domElement, 'pointercancel', () => { dragging = false; hideTooltip(); });
  nativeListen(renderer.domElement, 'click', event => {
    if (moved) return;
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const earthHit = raycaster.intersectObject(earth)[0];
    const hit = raycaster.intersectObjects(cellGroup.children, false).find(item => item.object.userData.grid && (!earthHit || item.distance < earthHit.distance));
    if (hit) setSelected(hit.object.userData.grid);
  });
  function setZoom(z) {
    camera.position.z = THREE.MathUtils.clamp(z, 285, 520);
    const progress = THREE.MathUtils.clamp((450 - camera.position.z) / (450 - 285), 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.y = THREE.MathUtils.lerp(-10, 28, eased);
  }

  nativeListen(renderer.domElement, 'wheel', event => {
    event.preventDefault();
    setZoom(camera.position.z + event.deltaY * .12);
  }, { passive: false });

  let previousTime = 0;
  function animate(time = 0) {
    frame = 0;
    if (disposed || !visible || document.hidden) { previousTime = 0; return; }
    const delta = Math.min((time-previousTime)/1000 || 0, .05); previousTime = time;
    if (state.rotate && !reducedMotion.matches && !dragging) spinGroup.rotation.y += delta * .1;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }
  function resume() { if (!frame && !disposed) frame = requestAnimationFrame(animate); }
  resume();

  deskC = {
    renderer,
    scene,
    resume,
    camera,
    root,
    spinGroup,
    rebuild,
    setZoom,
    home() {
      spinGroup.rotation.set(0, -Math.PI / 2 - THREE.MathUtils.degToRad(QTH.lng), 0);
      camera.position.x = 0;
      setZoom(450);
    }
  };
  deskC.home();
  rebuild();
}


function refreshSummary(data) {
  els.workedCount.textContent = grids.length;
  els.confirmedCount.textContent = grids.filter(g=>g.confirmed).length;
  document.querySelector('#grids-note').textContent = `${data.located} QSO con locator de ${data.total}. Celdas agrupadas por grilla de cuatro caracteres.`;
}
function resize() {
  if (!deskC) return;
  const {width,height} = stageSize();
  deskC.camera.aspect = width/height; deskC.camera.updateProjectionMatrix();
  deskC.renderer.setSize(width,height);
}
const observer = new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  if (visible) deskC?.resume(); else {cancelAnimationFrame(frame);frame=0;}
});
nativeListen(document,'visibilitychange',()=> {if(!document.hidden) deskC?.resume();});
nativeListen(document.querySelector('#rotate-toggle'),'change',event=> {state.rotate=event.target.checked;});
nativeListen(reducedMotion,'change',()=> {if(reducedMotion.matches){state.rotate=false;document.querySelector('#rotate-toggle').checked=false;}});
nativeListen(document.querySelector('#confirmed-toggle'),'change',event=> {state.confirmedOnly=event.target.checked;deskC?.rebuild();});
const panelsThemeToggle = document.querySelector('#panels-theme-toggle');
function setPanelsTheme(dark) {
  document.body.classList.toggle('panels-dark', dark);
  panelsThemeToggle.checked = dark;
}
try {
  setPanelsTheme(localStorage.getItem('lu1idc-grids-panels-theme') === 'dark');
} catch (_) {
  setPanelsTheme(false);
}
nativeListen(panelsThemeToggle, 'change', event => {
  setPanelsTheme(event.target.checked);
  try {
    localStorage.setItem('lu1idc-grids-panels-theme', event.target.checked ? 'dark' : 'light');
  } catch (_) {}
});
nativeListen(document.querySelector('#home-view'),'click',()=>{deskC?.home();setSelected({...QTH,qsos:0});});
nativeListen(document.querySelector('#zoom-in'),'click',()=>{if(deskC)deskC.setZoom(deskC.camera.position.z-25);});
nativeListen(document.querySelector('#zoom-out'),'click',()=>{if(deskC)deskC.setZoom(deskC.camera.position.z+25);});
const resizeObserver = new ResizeObserver(resize);
function destroy() {
  disposed=true;cancelAnimationFrame(frame);observer.disconnect();resizeObserver.disconnect();lifecycle.abort();
  if(deskC){disposeObject(deskC.scene);deskC.renderer.dispose();deskC.renderer.domElement.remove();}
}
nativeListen(window,'pagehide',event=>{if(!event.persisted)destroy();});
refreshSummary(window.GRIDS_DATA);
document.querySelector('#rotate-toggle').checked=state.rotate;
setSelected({...QTH,qsos:0});
try {initDeskC();observer.observe(els.stage);resizeObserver.observe(els.stage);} catch(error) {els.loading.textContent='El globo requiere WebGL 2. Probá otro navegador o activá la aceleración gráfica.';console.error(error);}
// Al servir la página por HTTP, refrescar desde el ADIF actual.
if(location.protocol !== 'file:') {
  fetch('datos/contactos.adi').then(r=>{if(!r.ok)throw Error(r.status);return r.text();}).then(text=> {
    if (disposed) return;
    const data = gridsFromAdif(text);
    grids=data.grids.map(g=>({...g,...maidenhead(g.locator)}));refreshSummary(data);deskC?.rebuild();
  }).catch(()=>{});
}
function gridsFromAdif(text) {
  const byGrid=new Map();let total=0,located=0;
  const body=text.split(/<eoh>/i).pop();
  for(const part of body.split(/<eor>/i)) {
    const record={};const pattern=/<([a-z0-9_]+):(\d+)(?::[^>]*)?>/gi;let match;
    while((match=pattern.exec(part))) {const end=pattern.lastIndex+Number(match[2]);record[match[1].toLowerCase()]=part.slice(pattern.lastIndex,end).trim();pattern.lastIndex=end;}
    if(!record.call)continue;total++;
    const locator=(record.gridsquare||'').toUpperCase();if(!/^[A-R]{2}[0-9]{2}(?:[A-X]{2}(?:[0-9]{2})?)?$/.test(locator))continue;
    located++;const key=locator.slice(0,4);
    if(!byGrid.has(key))byGrid.set(key,{locator:key,place:key,qsos:0,confirmed:false,calls:[],modes:[]});
    const g=byGrid.get(key);g.qsos++;g.confirmed ||= ['qsl_rcvd','lotw_qsl_rcvd','eqsl_qsl_rcvd'].some(f=>['Y','V'].includes((record[f]||'').toUpperCase()));
    if(!g.calls.includes(record.call))g.calls.push(record.call);if(record.mode&&!g.modes.includes(record.mode))g.modes.push(record.mode);
  }
  return {grids:[...byGrid.values()],total,located};
}
