const softwareButtons = [...document.querySelectorAll('[data-software-image]')];
const softwareDialog = document.querySelector('#software-dialog');
const softwareImage = document.querySelector('#software-image');
const softwareCaption = document.querySelector('#software-caption');
let selectedSoftware = 0;

function showSoftwareImage(index) {
  selectedSoftware = (index + softwareButtons.length) % softwareButtons.length;
  const button = softwareButtons[selectedSoftware];
  softwareImage.src = button.dataset.softwareImage;
  softwareImage.alt = button.dataset.softwareTitle;
  softwareCaption.textContent = `${button.dataset.softwareTitle} · ${selectedSoftware + 1} de ${softwareButtons.length}`;
}

softwareButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    showSoftwareImage(index);
    softwareDialog.showModal();
  });
});

function stepSoftware(direction) {
  showSoftwareImage(selectedSoftware + direction);
}

document.querySelector('#software-prev').addEventListener('click', () => stepSoftware(-1));
document.querySelector('#software-next').addEventListener('click', () => stepSoftware(1));
document.querySelector('#software-close').addEventListener('click', () => softwareDialog.close());

softwareDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    stepSoftware(event.key === 'ArrowLeft' ? -1 : 1);
  }
});

softwareDialog.addEventListener('click', event => {
  if (event.target === softwareDialog) softwareDialog.close();
});

activarDeslizamientoGaleria(softwareImage, {
  anterior: () => stepSoftware(-1),
  siguiente: () => stepSoftware(1)
});
