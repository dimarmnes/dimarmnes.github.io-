const dialog = document.querySelector('#award-dialog');
const image = document.querySelector('#award-image');
const caption = document.querySelector('#award-caption');
let selected = 0;
let visible = [];
function showAward(id) {
  selected = Number(id);
  const item = AWARDS_DATA[selected];
  image.src = item.src;
  image.alt = item.title;
  caption.textContent = item.title + (item.year ? ' · ' + item.year : '');
}
document.querySelectorAll('[data-award]').forEach(button => button.addEventListener('click', () => {
  visible = [...document.querySelectorAll('[data-award]:not([hidden])')].map(b => Number(b.dataset.award));
  showAward(button.dataset.award);
  dialog.showModal();
}));
document.querySelector('#award-close').addEventListener('click', () => dialog.close());
function step(direction) {
  const index = visible.indexOf(selected);
  showAward(visible[(index + direction + visible.length) % visible.length]);
}
activarDeslizamientoGaleria(image, {
  anterior: () => step(-1),
  siguiente: () => step(1)
});
document.querySelector('#award-prev').addEventListener('click', () => step(-1));
document.querySelector('#award-next').addEventListener('click', () => step(1));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') step(-1);
  if (event.key === 'ArrowRight') step(1);
});
const category = document.querySelector('#award-category');
if (category) {
  const year = document.querySelector('#award-year');
  const search = document.querySelector('#award-search');
  const clean = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function filterAwards() {
    let count = 0;
    document.querySelectorAll('#award-archive [data-award]').forEach(button => {
      const item = AWARDS_DATA[Number(button.dataset.award)];
      const match = (category.value === 'all' || item.category === category.value) &&
        (year.value === 'all' || (year.value === 'unknown' ? !item.year : item.year === year.value)) &&
        clean(item.title).includes(clean(search.value));
      button.hidden = !match;
      if (match) count++;
    });
    document.querySelector('#archive-count').textContent = count + ' diplomas';
    document.querySelector('#award-empty').hidden = count > 0;
  }
  const initial = new URLSearchParams(location.search).get('categoria');
  if ([...category.options].some(option => option.value === initial)) category.value = initial;
  category.addEventListener('change', filterAwards);
  year.addEventListener('change', filterAwards);
  search.addEventListener('input', filterAwards);
  filterAwards();
}
