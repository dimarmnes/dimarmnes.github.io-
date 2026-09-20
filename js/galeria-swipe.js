(function () {
  function activarDeslizamientoGaleria(imagen, opciones) {
    if (!imagen || !opciones) return;

    const umbral = opciones.umbral || 48;
    let puntero = null;
    let inicioX = 0;
    let inicioY = 0;

    imagen.style.touchAction = 'pan-y';
    imagen.style.userSelect = 'none';
    imagen.style.webkitUserDrag = 'none';

    imagen.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || !event.isPrimary) return;
      puntero = event.pointerId;
      inicioX = event.clientX;
      inicioY = event.clientY;
    });

    function terminar(event) {
      if (event.pointerId !== puntero) return;

      const distanciaX = event.clientX - inicioX;
      const distanciaY = event.clientY - inicioY;
      puntero = null;

      if (Math.abs(distanciaX) < umbral) return;
      if (Math.abs(distanciaX) <= Math.abs(distanciaY) * 1.15) return;

      if (distanciaX < 0) opciones.siguiente();
      else opciones.anterior();
    }

    imagen.addEventListener('pointerup', terminar);
    imagen.addEventListener('pointercancel', () => {
      puntero = null;
    });
  }

  window.activarDeslizamientoGaleria = activarDeslizamientoGaleria;
})();
