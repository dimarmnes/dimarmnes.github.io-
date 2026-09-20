const contestGallery = document.querySelector('#contest-gallery');
const contestDialog = document.querySelector('#contest-dialog');
const contestImage = document.querySelector('#contest-image');
const contestCaption = document.querySelector('#contest-caption');
let contestYear = '2025';
let visibleContests = [];
let selectedContest = 0;

function escapeContestText(text) {
  return String(text).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderContestYear(year) {
  contestYear = year;
  visibleContests = CONCURSOS_DATA
    .map((item, index) => ({ item, index }))
    .filter(entry => entry.item.year === year);

  contestGallery.innerHTML = visibleContests.map(({ item, index }, position) => `
    <button type="button" class="contest-certificate certificate-${position + 1}" data-contest="${index}" aria-label="Ampliar ${escapeContestText(item.title)}">
      <span class="certificate-paper">
        <img src="${escapeContestText(item.src)}" alt="${escapeContestText(item.title)}" loading="lazy">
      </span>
      <span class="certificate-title">${escapeContestText(item.title)}</span>
      <small>Recuerdo de participación · ${item.year}</small>
    </button>
  `).join('');

  document.querySelector('#contest-year-label').textContent = `Participaciones · ${year}`;
  document.querySelector('#contest-count').textContent = `${visibleContests.length} documentos`;

  document.querySelectorAll('[data-contest-year]').forEach(button => {
    const active = button.dataset.contestYear === year;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function showContest(index) {
  selectedContest = Number(index);
  const item = CONCURSOS_DATA[selectedContest];
  contestImage.src = item.src;
  contestImage.alt = item.title;
  contestCaption.textContent = `${item.title} · ${item.year} · Recuerdo de participación`;
}

function stepContest(direction) {
  const current = visibleContests.findIndex(entry => entry.index === selectedContest);
  const next = (current + direction + visibleContests.length) % visibleContests.length;
  showContest(visibleContests[next].index);
}

document.querySelectorAll('[data-contest-year]').forEach(button => {
  button.addEventListener('click', () => renderContestYear(button.dataset.contestYear));
});

contestGallery.addEventListener('click', event => {
  const button = event.target.closest('[data-contest]');
  if (!button) return;
  showContest(button.dataset.contest);
  contestDialog.showModal();
});

document.querySelector('#contest-prev').addEventListener('click', () => stepContest(-1));
document.querySelector('#contest-next').addEventListener('click', () => stepContest(1));
document.querySelector('#contest-close').addEventListener('click', () => contestDialog.close());

contestDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    stepContest(event.key === 'ArrowLeft' ? -1 : 1);
  }
});

contestDialog.addEventListener('click', event => {
  if (event.target === contestDialog) contestDialog.close();
});

activarDeslizamientoGaleria(contestImage, {
  anterior: () => stepContest(-1),
  siguiente: () => stepContest(1)
});

function updateContestClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('es-AR', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  document.querySelector('#contest-utc').innerHTML = `${time} <small>UTC</small>`;
}

renderContestYear(contestYear);
updateContestClock();
setInterval(updateContestClock, 30000);
