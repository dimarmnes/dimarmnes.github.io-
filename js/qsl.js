// Elegí las tres tarjetas de la mesa por su nombre de archivo, en este orden.
// El generador del catálogo no modifica esta lista.
const QSL_MESA = [
  "20260605_CX1SI_40M_CW.jpg",
  "20260204_9A5GG_20M_FT4.jpg",
  "20240707_AZ5E_40M_FT8.jpg"
];

function randomQslSelection(items, count) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

const escapeQsl = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qslDetails = item => [item.band, item.mode, item.year].filter(Boolean).join(' · ');
function qslCard(item, className = '') {
  const index = QSL_DATA.indexOf(item);
  return `<button type="button" class="qsl-card ${className}" data-qsl="${index}" aria-label="Ampliar ${escapeQsl(item.title)}"><span class="qsl-document"><img src="${escapeQsl(item.src)}" alt="${escapeQsl(item.title)}" loading="lazy"></span><span class="qsl-label"><b>${escapeQsl(item.title)}</b><small>${escapeQsl(qslDetails(item))}</small></span></button>`;
}
const dialog = document.querySelector('#qsl-dialog');
let selected = 0;
let gallery = [];
function showQsl(index) {
  selected = index;
  const item = QSL_DATA[index];
  const image = document.querySelector('#qsl-image');
  image.src = item.src; image.alt = item.title;
  document.querySelector('#qsl-caption').textContent = [item.title, qslDetails(item)].filter(Boolean).join(' · ');
}
document.addEventListener('click', event => {
  const button = event.target.closest('[data-qsl]');
  if (!button) return;
  gallery = archive ? filtered.map(item => QSL_DATA.indexOf(item)) : [...new Set([...document.querySelectorAll('[data-qsl]')].map(b => Number(b.dataset.qsl)))];
  showQsl(Number(button.dataset.qsl)); dialog.showModal();
});
function stepQsl(direction) { showQsl(gallery[(gallery.indexOf(selected) + direction + gallery.length) % gallery.length]); }
activarDeslizamientoGaleria(document.querySelector('#qsl-image'), {
  anterior: () => stepQsl(-1),
  siguiente: () => stepQsl(1)
});
document.querySelector('#qsl-close').addEventListener('click', () => dialog.close());
document.querySelector('#qsl-prev').addEventListener('click', () => stepQsl(-1));
document.querySelector('#qsl-next').addEventListener('click', () => stepQsl(1));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('keydown', event => { if(event.key === 'ArrowLeft') stepQsl(-1); if(event.key === 'ArrowRight') stepQsl(1); });
const received = QSL_DATA.filter(item => item.type === 'recibidas');
const own = QSL_DATA.filter(item => item.type === 'propias');
const desk = document.querySelector('#qsl-desk');
if (desk) {
  const chosen = [...new Set(QSL_MESA)].map(name => received.find(item => item.src.split('/').pop() === name)).filter(Boolean).slice(0,3);
  const deskCards = [...chosen, ...received.filter(item => !chosen.includes(item))].slice(0,3);
  desk.innerHTML = deskCards.map((item,i) => qslCard(item, `mail mail-${i}`)).join('') + '<span class="desk-postmark" aria-hidden="true">CORREO<br>DE RADIO<br>LU1IDC</span>';
  document.querySelector('#qsl-selection').innerHTML = received.slice(0,5).map(item => `<button type="button" class="inbox-row" data-qsl="${QSL_DATA.indexOf(item)}" aria-label="Ampliar ${escapeQsl(item.title)}"><span class="inbox-avatar"><img src="${escapeQsl(item.src)}" alt="" loading="lazy"></span><span><b>${escapeQsl(item.title)}</b><small>${escapeQsl(qslDetails(item))}</small></span><span class="received-mark">Recibida</span></button>`).join('');
  document.querySelector('#qsl-own').innerHTML = own.slice(0,4).map(item => qslCard(item)).join('');
  document.querySelector('#qsl-own-empty').hidden = Boolean(own.length);
  document.querySelector('#qsl-own-link').hidden = !own.length;
  document.querySelector('#qsl-own').hidden = !own.length;
  document.querySelector('#qsl-preview').innerHTML = randomQslSelection(received,12).map(item => qslCard(item)).join('');
  document.querySelector('#qsl-total').textContent = `${received.length} tarjetas recibidas${own.length ? ` y ${own.length} propias` : ''}, organizadas por año, banda y modo.`;
  const years = [...new Set(received.map(item => item.year))].sort().reverse();
  document.querySelector('#qsl-years').innerHTML = years.map(year => `<a href="qsl-archivo.html?anio=${year || 'unknown'}"><b>${year || 'Sin fecha'}</b><small>${received.filter(item => item.year === year).length} tarjetas</small></a>`).join('');
}
const archive = document.querySelector('#qsl-archive');
let filtered = [];
let page = 1;
const PAGE_SIZE = 24;
if (archive) {
  const type = document.querySelector('#qsl-type'), year = document.querySelector('#qsl-year'), band = document.querySelector('#qsl-band'), mode = document.querySelector('#qsl-mode'), search = document.querySelector('#qsl-search');
  for (const [select, field] of [[year,'year'],[band,'band'],[mode,'mode']]) {
    const values = [...new Set(QSL_DATA.map(item => item[field]).filter(Boolean))].sort((a,b) => field === 'year' ? b.localeCompare(a) : a.localeCompare(b, 'es', {numeric:true}));
    values.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; select.append(option); });
  }
  if (QSL_DATA.some(item => !item.year)) { const option = document.createElement('option'); option.value = 'unknown'; option.textContent = 'Sin fecha'; year.append(option); }
  const params = new URLSearchParams(location.search);
  if ([...type.options].some(o => o.value === params.get('tipo'))) type.value = params.get('tipo');
  if ([...year.options].some(o => o.value === params.get('anio'))) year.value = params.get('anio');
  const clean = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function renderPage() {
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    page = Math.min(page, pages);
    archive.innerHTML = filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(item => qslCard(item)).join('') || '<p class="empty">No hay tarjetas que coincidan con estos filtros.</p>';
    document.querySelector('#qsl-count').textContent = `${filtered.length} tarjetas`;
    document.querySelector('#page-status').textContent = `Página ${page} de ${pages}`;
    document.querySelector('#page-prev').disabled = page === 1;
    document.querySelector('#page-next').disabled = page === pages;
  }
  function filter() {
    filtered = QSL_DATA.filter(item => (type.value === 'all' || item.type === type.value) && (year.value === 'all' || (year.value === 'unknown' ? !item.year : item.year === year.value)) && (band.value === 'all' || item.band === band.value) && (mode.value === 'all' || item.mode === mode.value) && clean(item.title).includes(clean(search.value)));
    page = 1; renderPage();
  }
  [type,year,band,mode].forEach(select => select.addEventListener('change',filter)); search.addEventListener('input',filter);
  document.querySelector('#page-prev').addEventListener('click', () => {page--;renderPage();archive.scrollIntoView({block:'start'});});
  document.querySelector('#page-next').addEventListener('click', () => {page++;renderPage();archive.scrollIntoView({block:'start'});});
  filter();
}
