(function () {
  function reportHeight() {
    const height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    window.parent.postMessage({
      type: 'argentina-en-frecuencia-height',
      height
    }, '*');
  }

  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);

  if ('ResizeObserver' in window) {
    new ResizeObserver(reportHeight).observe(document.body);
  }

  setTimeout(reportHeight, 300);
})();
