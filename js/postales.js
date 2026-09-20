const postalesDialog = document.querySelector('#postales-dialog');
const postalesImage = document.querySelector('#postales-image');
let postalIndex = 0;
function showPostal(index) {
  postalIndex = (index + POSTALES_DATA.length) % POSTALES_DATA.length;
  const photo = POSTALES_DATA[postalIndex];
  postalesImage.src = photo.src;
  postalesImage.alt = photo.title;
  document.querySelector('#postales-caption').textContent = `${photo.title} · ${postalIndex + 1} de ${POSTALES_DATA.length}`;
}
activarDeslizamientoGaleria(postalesImage, {
  anterior: () => showPostal(postalIndex - 1),
  siguiente: () => showPostal(postalIndex + 1)
});
document.querySelectorAll('[data-postal]').forEach(button => {
  button.addEventListener('click', () => {
    const index = POSTALES_DATA.findIndex(photo => photo.src === button.dataset.postal);
    if (index < 0) return;
    showPostal(index);
    postalesDialog.showModal();
  });
});
document.querySelector('#postales-prev').addEventListener('click', () => showPostal(postalIndex - 1));
document.querySelector('#postales-next').addEventListener('click', () => showPostal(postalIndex + 1));
document.querySelector('#postales-close').addEventListener('click', () => postalesDialog.close());
postalesDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPostal(postalIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
postalesDialog.addEventListener('click', event => {
  if (event.target === postalesDialog) {
    const rect = postalesDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) postalesDialog.close();
  }
});
