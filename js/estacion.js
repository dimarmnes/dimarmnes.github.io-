const stationPhotos = [...document.querySelectorAll('.station-gallery-image')];
const stationDialog = document.querySelector('#station-dialog');
const stationDialogImage = document.querySelector('#station-dialog-image');
const stationCaption = document.querySelector('#station-caption');
let selectedStationPhoto = 0;

function showStationPhoto(index) {
  selectedStationPhoto = (index + stationPhotos.length) % stationPhotos.length;
  const photo = stationPhotos[selectedStationPhoto];
  stationDialogImage.src = photo.currentSrc || photo.src;
  stationDialogImage.alt = photo.alt;
  stationCaption.textContent = `${photo.dataset.stationTitle || photo.alt} · ${selectedStationPhoto + 1} de ${stationPhotos.length}`;
}

function openStationPhoto(index) {
  showStationPhoto(index);
  stationDialog.showModal();
}

function stepStationPhoto(direction) {
  showStationPhoto(selectedStationPhoto + direction);
}

stationPhotos.forEach((photo, index) => {
  photo.addEventListener('click', () => openStationPhoto(index));
  photo.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openStationPhoto(index);
  });
});

document.querySelector('#station-prev').addEventListener('click', () => stepStationPhoto(-1));
document.querySelector('#station-next').addEventListener('click', () => stepStationPhoto(1));
document.querySelector('#station-close').addEventListener('click', () => stationDialog.close());

stationDialog.addEventListener('click', event => {
  if (event.target === stationDialog) stationDialog.close();
});

stationDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    stepStationPhoto(event.key === 'ArrowLeft' ? -1 : 1);
  }
});

activarDeslizamientoGaleria(stationDialogImage, {
  anterior: () => stepStationPhoto(-1),
  siguiente: () => stepStationPhoto(1)
});
