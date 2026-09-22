const LOGBOOK_PAGE_SIZE = 13;
const bookElement = document.querySelector('#book');
const deskElement = document.querySelector('#logbook-desk');
const instructionElement = document.querySelector('#book-instructions');
const rowsPerPage = LOGBOOK_PAGE_SIZE;
let logbookData = buildLocalNewestSample(window.LOGBOOK_SAMPLE);
let pageFlip;
let pageCopyObserver;
let searchEntries=[];
let pendingSearchHit=null;
let searchHighlightTimer;
const originalBookPages = new WeakSet();
const dxccNames = new Map((typeof DXCC_DATA !== 'undefined' ? DXCC_DATA.entities : []).map(entity => [String(entity.id),entity.name]));

function parseLogbookAdif(text) {
  const records = [];
  const body = text.split(/<eoh\s*>/i).pop();
  for (const part of body.split(/<eor\s*>/i)) {
    const record = {};
    const pattern = /<([^:>]+):(\d+)(?::[^>]*)?>/gi;
    let match;
    while ((match = pattern.exec(part))) {
      const end = pattern.lastIndex + Number(match[2]);
      record[match[1].toLowerCase()] = part.slice(pattern.lastIndex, end).trim();
      pattern.lastIndex = end;
    }
    if (record.call) records.push(record);
  }
  records.sort((a,b) => `${a.qso_date || ''}${a.time_on || ''}${a.call || ''}`.localeCompare(`${b.qso_date || ''}${b.time_on || ''}${b.call || ''}`));
  const seenDxcc = new Set();
  for (const record of records) {
    record.new_dxcc = Boolean(record.dxcc && !seenDxcc.has(record.dxcc));
    if (record.dxcc) seenDxcc.add(record.dxcc);
  }
  return records;
}

function paginateNewestFirst(records,totalPages=Math.max(1,Math.ceil(records.length/LOGBOOK_PAGE_SIZE))) {
  const newestFirst=[...records].reverse();
  const pages=[];
  for(let page=0;page<Math.ceil(newestFirst.length/LOGBOOK_PAGE_SIZE);page++){
    pages.push({number:page+1,records:newestFirst.slice(page*LOGBOOK_PAGE_SIZE,(page+1)*LOGBOOK_PAGE_SIZE)});
  }
  return {pages,totalPages};
}
function buildLocalNewestSample(data){
  const records=data.pages.flatMap(page=>page.records);
  const paginated=paginateNewestFirst(records,data.totalPages);
  return {...data,pages:paginated.pages};
}
function buildAllPages(records) {
  const paginated=paginateNewestFirst(records);
  return {total:records.length,totalPages:paginated.totalPages,pages:paginated.pages};
}

const esc = value => String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
function dateText(value) { return /^\d{8}$/.test(value || '') ? `${value.slice(6,8)}/${value.slice(4,6)}/${value.slice(2,4)}` : ''; }
function timeText(value) { return /^\d{4,6}$/.test(value || '') ? `${value.slice(0,2)}:${value.slice(2,4)}` : ''; }
function bandText(value) { return String(value || '').replace(/(cm|mm|m)$/i, ' $1').toUpperCase(); }
function notesFor(record) {
  const notes=[];
  const mode=record.submode || record.mode;
  if(record.new_dxcc){
    const entityName=dxccNames.get(String(record.dxcc));
    notes.push(entityName?`★ DXCC: ${entityName}`:`★ DXCC ${record.dxcc}`);
  }
  if(mode)notes.push(mode.toUpperCase());
  if(record.sat_name)notes.push(`SAT · ${record.sat_name}`);
  if(['Y','V'].includes((record.qsl_rcvd||'').toUpperCase()))notes.push('✓ QSL');
  if(['Y','V'].includes((record.lotw_qsl_rcvd||'').toUpperCase()))notes.push('✓ LoTW');
  if(['Y','V'].includes((record.eqsl_qsl_rcvd||'').toUpperCase()))notes.push('✓ eQSL');
  return notes.join(' · ');
}
function rowTilt(record,index){const seed=[...`${record.call||''}${record.qso_date||''}${index}`].reduce((sum,char)=>sum+char.charCodeAt(0),0);return ((seed%7)-3)*.07;}
function rowsHtml(records,pageNumber){return Array.from({length:rowsPerPage},(_,index)=>{
  const r=records[index];if(!r)return '<div class="log-row" aria-hidden="true"></div>';
  const notes=notesFor(r);
  return `<div class="log-row" data-page-number="${pageNumber}" data-row-index="${index}" style="--tilt:${rowTilt(r,index)}deg"><span>${esc(dateText(r.qso_date))}</span><span>${esc(timeText(r.time_on))}</span><span class="call">${esc(r.call)}</span><span>${esc(bandText(r.band))}</span><span>${esc(r.rst_sent)}</span><span>${esc(r.rst_rcvd)}</span><span class="notes${r.new_dxcc?' new-dxcc':''}" title="${esc(notes)}">${esc(notes)}</span></div>`;
}).join('');}
function sheetHtml(page){return `<article class="book-page"><div class="paper-sheet"><img src="images/logbook/lu1idc-hoja-logbook.svg" alt="Hoja ${page.number} del Libro de Guardia"><div class="sheet-overlay"><span class="station-call">LU1IDC</span><span class="station-qth">San Javier · GG22KD</span><span class="sheet-number">${String(page.number).padStart(3,'0')}</span><div class="log-rows">${rowsHtml(page.records,page.number)}</div></div></div></article>`;}
function buildBook(){
  bookElement.innerHTML=`<div class="book-page book-cover" data-density="hard" role="button" tabindex="0" aria-label="Abrir el Libro de Guardia"><img src="images/logbook/lu1idc-portada-logbook.svg" alt="Portada del Libro de Guardia de LU1IDC"></div>${logbookData.pages.map(sheetHtml).join('')}`;
  const compactView=matchMedia('(max-width:700px)').matches;
  pageFlip=new St.PageFlip(bookElement,{width:794,height:559,size:'stretch',minWidth:compactView?260:460,maxWidth:900,minHeight:compactView?183:324,maxHeight:634,drawShadow:true,maxShadowOpacity:.42,flippingTime:matchMedia('(prefers-reduced-motion: reduce)').matches?80:900,usePortrait:true,showCover:true,autoSize:true,mobileScrollSupport:false,clickEventForward:true});
  pageFlip.on('flip', event => {
    document.querySelector('#book-wrap').classList.remove('is-turning');
    updateControls(event);
    revealPendingSearchHit();
  });
  pageFlip.on('changeState', event => {
    const moving = event.data === 'user_fold' || event.data === 'flipping';
    document.querySelector('#book-wrap').classList.toggle('is-turning', moving);
  });
  pageFlip.on('changeOrientation',updateControls);
  const pages = bookElement.querySelectorAll('.book-page');
  pages.forEach(page => originalBookPages.add(page));
  pageFlip.loadFromHTML(pages);
  pageCopyObserver?.disconnect();
  pageCopyObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('stf__item') && !originalBookPages.has(node)) {
          node.classList.add('book-page-back');
        }
      }
    }
  });
  pageCopyObserver.observe(bookElement, {childList:true,subtree:true});
  const cover=bookElement.querySelector('.book-cover');
  cover.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pageFlip.flipNext('top');}});
  updateControls();
  bookElement.inert=true;
}
function updateControls(){
  if(!pageFlip)return;
  const index=pageFlip.getCurrentPageIndex();
  const count=pageFlip.getPageCount();
  const currentPage=index===0?null:logbookData.pages[index-1];
  document.querySelector('#book-first').disabled=index<=1;
  document.querySelector('#book-prev').disabled=index<=0;
  document.querySelector('#book-next').disabled=index>=count-1;
  document.querySelector('#book-last').disabled=index>=count-1;
  document.querySelector('#book-close').disabled=index===0;
  document.querySelector('#book-status').textContent=currentPage?`— ${String(currentPage.number).padStart(3,'0')} / ${String(logbookData.totalPages).padStart(3,'0')} —`:'Portada';
  const pageNumber=document.querySelector('#book-page-number');
  pageNumber.min=String(logbookData.pages[0]?.number||1);
  pageNumber.max=String(logbookData.pages.at(-1)?.number||1);
  if(currentPage)pageNumber.value=String(currentPage.number);
}
const normalizeSearch=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function rebuildSearchIndex(){
  searchEntries=logbookData.pages.flatMap((page,pageIndex)=>page.records.map((record,rowIndex)=>({record,page,pageIndex,rowIndex})));
  const years=[...new Set(searchEntries.map(({record})=>(record.qso_date||'').slice(0,4)).filter(Boolean))].sort((a,b)=>b.localeCompare(a));
  const bands=[...new Set(searchEntries.map(({record})=>record.band).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const modes=[...new Set(searchEntries.map(({record})=>(record.submode||record.mode||'').toUpperCase()).filter(Boolean))].sort();
  fillSearchSelect('#logbook-search-year',years);
  fillSearchSelect('#logbook-search-band',bands,value=>bandText(value));
  fillSearchSelect('#logbook-search-mode',modes);
  buildYearIndex();
}
function fillSearchSelect(selector,values,label=value=>value){
  const select=document.querySelector(selector);
  select.querySelectorAll('option:not(:first-child)').forEach(option=>option.remove());
  for(const value of values)select.insertAdjacentHTML('beforeend',`<option value="${esc(value)}">${esc(label(value))}</option>`);
}
function entrySearchText(record){
  const entity=dxccNames.get(String(record.dxcc))||'';
  return normalizeSearch([record.call,entity,record.qso_date,dateText(record.qso_date),record.gridsquare,record.band,record.mode,record.submode,record.sat_name].join(' '));
}
function runLogbookSearch(){
  const query=normalizeSearch(document.querySelector('#logbook-search-query').value);
  const year=document.querySelector('#logbook-search-year').value;
  const band=document.querySelector('#logbook-search-band').value;
  const mode=document.querySelector('#logbook-search-mode').value;
  const summary=document.querySelector('#logbook-search-summary');
  const results=document.querySelector('#logbook-search-results');
  if(!query&&!year&&!band&&!mode){summary.textContent='Escribí un dato o elegí un filtro.';results.innerHTML='';return;}
  const matches=searchEntries.filter(({record})=>(!query||entrySearchText(record).includes(query))&&(!year||(record.qso_date||'').startsWith(year))&&(!band||record.band===band)&&(!mode||(record.submode||record.mode||'').toUpperCase()===mode));
  const shown=matches.slice(0,100);
  summary.textContent=matches.length?`${matches.length.toLocaleString('es-AR')} resultado${matches.length===1?'':'s'}${matches.length>100?' · se muestran los primeros 100':''}.`:'No se encontraron contactos.';
  results.innerHTML=shown.map(({record,page,rowIndex})=>{
    const entity=dxccNames.get(String(record.dxcc))||'';
    const modeName=(record.submode||record.mode||'').toUpperCase();
    return `<button type="button" class="logbook-search-result" data-page="${page.number}" data-row="${rowIndex}"><strong>${esc(record.call)}</strong><span>${esc(dateText(record.qso_date))} · ${esc(bandText(record.band))} · ${esc(modeName)}</span>${entity?`<small>${esc(entity)}</small>`:''}<b>Hoja ${String(page.number).padStart(3,'0')}</b></button>`;
  }).join('');
}
function buildYearIndex(){
  const years=new Map();
  for(const {record,page} of searchEntries){
    const year=(record.qso_date||'').slice(0,4);if(!year)continue;
    if(!years.has(year))years.set(year,{count:0,pages:new Set()});
    const item=years.get(year);item.count++;item.pages.add(page.number);
  }
  document.querySelector('#logbook-year-index').innerHTML=[...years.entries()].sort(([a],[b])=>b.localeCompare(a)).map(([year,item])=>{
    const pages=[...item.pages].sort((a,b)=>a-b);const first=pages[0],last=pages.at(-1);const range=first===last?`hoja ${String(first).padStart(3,'0')}`:`hojas ${String(first).padStart(3,'0')}–${String(last).padStart(3,'0')}`;
    return `<button type="button" data-page="${first}"><strong>${year}</strong><span>${item.count.toLocaleString('es-AR')} QSO</span><small>${range}</small></button>`;
  }).join('');
}
function setLogbookToolsOpen(open){
  const tools=document.querySelector('#logbook-tools');
  tools.hidden=!open;
  document.querySelector('#book-tools-toggle').setAttribute('aria-expanded',String(open));
  bookElement.inert=open||deskElement.classList.contains('is-desk-view');
  if(open)document.querySelector('#logbook-search-query').focus();
}
function selectToolsTab(tab){
  const search=tab==='search';
  document.querySelector('#logbook-search-tab').setAttribute('aria-selected',String(search));
  document.querySelector('#logbook-index-tab').setAttribute('aria-selected',String(!search));
  document.querySelector('#logbook-search-panel').hidden=!search;
  document.querySelector('#logbook-index-panel').hidden=search;
}
function revealPendingSearchHit(){
  if(!pendingSearchHit)return;
  const {page,row}=pendingSearchHit;
  const selector=`.log-row[data-page-number="${page}"][data-row-index="${row}"]`;
  const matches=bookElement.querySelectorAll(selector);
  if(!matches.length)return;
  clearTimeout(searchHighlightTimer);
  matches.forEach(element=>element.classList.add('is-search-hit'));
  searchHighlightTimer=setTimeout(()=>matches.forEach(element=>element.classList.remove('is-search-hit')),3600);
  pendingSearchHit=null;
}
function goToSearchResult(page,row){
  const pageIndex=logbookData.pages.findIndex(item=>item.number===Number(page));
  if(pageIndex<0)return;
  pendingSearchHit={page:Number(page),row:Number(row)};
  setLogbookToolsOpen(false);
  showReadingView();
  if(pageFlip.getCurrentPageIndex()===pageIndex+1)revealPendingSearchHit();
  else pageFlip.flip(pageIndex+1,'top');
  setTimeout(revealPendingSearchHit,1050);
}
function initializeLogbookTools(){
  rebuildSearchIndex();
  document.querySelector('#book-tools-toggle').addEventListener('click',()=>setLogbookToolsOpen(true));
  document.querySelector('#book-tools-close').addEventListener('click',()=>setLogbookToolsOpen(false));
  document.querySelector('#logbook-search-tab').addEventListener('click',()=>selectToolsTab('search'));
  document.querySelector('#logbook-index-tab').addEventListener('click',()=>selectToolsTab('index'));
  let timer;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(runLogbookSearch,140);};
  document.querySelector('#logbook-search-query').addEventListener('input',schedule);
  ['#logbook-search-year','#logbook-search-band','#logbook-search-mode'].forEach(selector=>document.querySelector(selector).addEventListener('change',runLogbookSearch));
  document.querySelector('#logbook-search-results').addEventListener('click',event=>{const result=event.target.closest('[data-page][data-row]');if(result)goToSearchResult(result.dataset.page,result.dataset.row);});
  document.querySelector('#logbook-year-index').addEventListener('click',event=>{const year=event.target.closest('[data-page]');if(!year)return;setLogbookToolsOpen(false);goToLogicalPage(year.dataset.page);});
}

function showReadingView() {
  deskElement.classList.remove('is-desk-view');
  deskElement.classList.add('is-reading-view');
  instructionElement.textContent='Abrí la tapa y recorré las hojas más recientes.';
  document.querySelector('#book-pickup').setAttribute('aria-hidden','true');
  bookElement.inert=false;
}
function showDeskView() {
  setLogbookToolsOpen(false);
  deskElement.classList.remove('is-reading-view');
  deskElement.classList.add('is-desk-view');
  instructionElement.textContent='Seleccioná la libreta para recogerla del escritorio.';
  document.querySelector('#book-pickup').removeAttribute('aria-hidden');
  bookElement.inert=true;
}
document.querySelector('#book-pickup').addEventListener('click',showReadingView);
document.querySelector('#book-desk-return').addEventListener('click',()=>{
  if(!pageFlip)return;
  if(pageFlip.getCurrentPageIndex()===0){showDeskView();return;}
  pageFlip.flip(0,'top');
  const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?120:950;
  setTimeout(showDeskView,delay);
});
function goToLogicalPage(number){
  const pageIndex=logbookData.pages.findIndex(page=>page.number===Number(number));
  if(pageIndex<0)return;
  pageFlip?.flip(pageIndex+1,'top');
}
document.querySelector('#book-first').addEventListener('click',()=>pageFlip?.flip(1,'top'));
document.querySelector('#book-prev').addEventListener('click',()=>pageFlip?.flipPrev('top'));
document.querySelector('#book-next').addEventListener('click',()=>pageFlip?.flipNext('top'));
document.querySelector('#book-last').addEventListener('click',()=>pageFlip?.flip(pageFlip.getPageCount()-1,'top'));
document.querySelector('#book-page-go').addEventListener('click',()=>goToLogicalPage(document.querySelector('#book-page-number').value));
document.querySelector('#book-page-number').addEventListener('keydown',event=>{if(event.key==='Enter')goToLogicalPage(event.currentTarget.value);});
document.querySelector('#book-close').addEventListener('click',()=>pageFlip?.flip(0,'top'));
let responsiveBookTimer;
function refreshResponsiveBook(){
  if(!pageFlip)return;
  clearTimeout(responsiveBookTimer);
  responsiveBookTimer=setTimeout(()=>{
    const compact=matchMedia('(max-width:700px)').matches;
    const settings=pageFlip.getSettings();
    settings.minWidth=compact?260:460;
    settings.minHeight=compact?183:324;
    pageFlip.getUI().update();
    pageFlip.getRender().update();
  },140);
}
window.addEventListener('resize',refreshResponsiveBook,{passive:true});
window.addEventListener('orientationchange',refreshResponsiveBook,{passive:true});
document.addEventListener('keydown',event=>{if(!pageFlip)return;if(event.key==='Escape'&&!document.querySelector('#logbook-tools').hidden){setLogbookToolsOpen(false);return;}if(deskElement.classList.contains('is-desk-view')||event.target.closest('input,button'))return;if(event.key==='ArrowLeft')pageFlip.flipPrev('top');if(event.key==='ArrowRight')pageFlip.flipNext('top');if(event.key==='Escape')pageFlip.flip(0,'top');});
async function startLogbook(){
  if(location.protocol!=='file:'){try{const response=await fetch('datos/contactos.adi',{cache:'no-store'});if(!response.ok)throw Error(response.status);logbookData=buildAllPages(parseLogbookAdif(await response.text()));}catch(_){}}
  buildBook();
  initializeLogbookTools();
  const localSample=logbookData.pages.length<logbookData.totalPages?' · vista local: últimas 4':'';
  document.querySelector('#book-data-status').textContent=`${logbookData.total.toLocaleString('es-AR')} QSO · ${logbookData.totalPages.toLocaleString('es-AR')} hojas · más recientes primero${localSample}.`;
}
startLogbook();
