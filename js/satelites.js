const satelliteDialog = document.querySelector('#satellite-dialog');
const satelliteImage = document.querySelector('#satellite-image');
const satelliteCaption = document.querySelector('#satellite-caption');
let satelliteIndex = 0;

function showSatellite(index) {
  satelliteIndex = (index + SATELITES_DATA.length) % SATELITES_DATA.length;
  const card = SATELITES_DATA[satelliteIndex];
  satelliteImage.src = card.src;
  satelliteImage.alt = `Ficha de frecuencias de ${card.title}`;
  satelliteCaption.textContent = `${card.title} · ${satelliteIndex + 1} de ${SATELITES_DATA.length}`;
}

document.querySelector('#open-satellites').addEventListener('click', () => {
  if (!SATELITES_DATA.length) return;
  showSatellite(0);
  satelliteDialog.showModal();
});

function stepSatellite(direction) {
  showSatellite(satelliteIndex + direction);
}

document.querySelector('#satellite-prev').addEventListener('click', () => stepSatellite(-1));
document.querySelector('#satellite-next').addEventListener('click', () => stepSatellite(1));
document.querySelector('#satellite-close').addEventListener('click', () => satelliteDialog.close());

satelliteDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    stepSatellite(event.key === 'ArrowLeft' ? -1 : 1);
  }
});

satelliteDialog.addEventListener('click', event => {
  if (event.target === satelliteDialog) satelliteDialog.close();
});

activarDeslizamientoGaleria(satelliteImage, {
  anterior: () => stepSatellite(-1),
  siguiente: () => stepSatellite(1)
});
