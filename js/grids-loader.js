// Mostrar el motivo si el navegador no puede iniciar el módulo del globo.
(async function () {
  const loading = document.querySelector('#loading');
  if (location.protocol === 'file:') {
    loading.textContent = 'Para ver el globo, abrí el sitio con un servidor local: python3 -m http.server 8000. Luego entrá a http://localhost:8000/grids.html';
    return;
  }
  try {
    await import('./grids.js');
  } catch (error) {
    loading.hidden = false;
    loading.textContent = `No se pudo iniciar el globo: ${error.message}`;
    console.error('Error al iniciar Grids:', error);
  }
})();
