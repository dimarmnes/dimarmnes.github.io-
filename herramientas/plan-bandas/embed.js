(function () {
  document.querySelectorAll('.band-chart').forEach((chart, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'band-scroll';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', `Gráfico desplazable de la banda ${index + 1}`);
    wrapper.tabIndex = 0;

    const hint = document.createElement('p');
    hint.className = 'scroll-hint';
    hint.textContent = 'Girando el teléfono se ve con mayor detalle ↻';

    chart.before(hint);
    chart.before(wrapper);
    wrapper.append(chart);
  });

  function reportHeight() {
    const content = document.querySelector('main');
    const height = content
      ? Math.ceil(content.getBoundingClientRect().bottom + window.scrollY)
      : document.body.scrollHeight;
    window.parent.postMessage({
      type: 'plan-bandas-height',
      height
    }, '*');
  }

  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);

  if ('ResizeObserver' in window) {
    const content = document.querySelector('main');
    new ResizeObserver(reportHeight).observe(content || document.body);
  }

  setTimeout(reportHeight, 300);
})();
