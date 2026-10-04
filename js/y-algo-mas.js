(() => {
  const slidesHost = document.querySelector("#slides");
  const boxesHost = document.querySelector("#slide-boxes");
  const screen = document.querySelector("#screen");
  const currentNumber = document.querySelector("#current-number");
  const totalNumber = document.querySelector("#total-number");
  const projectionStage = document.querySelector("#projection-stage");
  const fullscreenToggle = document.querySelector("#fullscreen-toggle");
  const soundToggle = document.querySelector("#projector-sound-toggle");
  const viewer = document.querySelector("#slide-viewer");
  const viewerImage = document.querySelector("#viewer-image");
  const viewerCaption = document.querySelector("#viewer-caption");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const projectorSound = new Audio("audio/diapositiva.mp3");
  const soundPreferenceKey = "lu1idc-sound-enabled";
  projectorSound.preload = "auto";
  projectorSound.volume = 0.55;
  let soundEnabled = true;
  try { soundEnabled = localStorage.getItem(soundPreferenceKey) !== "false"; } catch (_) {}
  let slides = [];
  let current = 0;
  let touchStart = null;
  let suppressClick = false;

  function updateSoundControl() {
    soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    soundToggle.setAttribute("aria-label", soundEnabled ? "Desactivar sonido del proyector" : "Activar sonido del proyector");
    soundToggle.innerHTML = `<span aria-hidden="true">${soundEnabled ? "🔊" : "🔇"}</span> Sonido`;
  }

  function playProjectorSound() {
    if (!soundEnabled) return;
    projectorSound.currentTime = 0;
    projectorSound.play().catch(() => {});
  }

  function slideElement(item, index) {
    const article = document.createElement("article");
    article.className = "slide" + (item.placeholder ? " slide-placeholder" : "");
    article.dataset.slide = index;
    article.hidden = index !== 0;
    if (item.image) {
      const image = document.createElement("img");
      image.src = item.image;
      image.alt = item.alt || item.caption;
      image.addEventListener("click", event => {
        if (suppressClick) { event.preventDefault(); return; }
        openViewer(image, item.caption);
      });
      article.append(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.setAttribute("role", "img");
      placeholder.setAttribute("aria-label", item.placeholder);
      const label = document.createElement("span");
      label.textContent = item.placeholder;
      placeholder.append(label);
      article.append(placeholder);
    }
    const caption = document.createElement("p");
    caption.textContent = item.caption;
    article.append(caption);
    return article;
  }

  function renderCollection(index, returnToProjector = false) {
    const collection = SLIDE_COLLECTIONS[index];
    slidesHost.replaceChildren(...collection.slides.map(slideElement));
    slides = [...slidesHost.querySelectorAll(".slide")];
    current = 0;
    currentNumber.textContent = "01";
    totalNumber.textContent = String(slides.length).padStart(2, "0");
    boxesHost.querySelectorAll(".slide-box").forEach((box, boxIndex) => {
      box.classList.toggle("is-active", boxIndex === index);
      box.setAttribute("aria-pressed", boxIndex === index ? "true" : "false");
    });
    screen.classList.remove("is-changing");
    void screen.offsetWidth;
    if (!reduceMotion.matches) screen.classList.add("is-changing");
    setTimeout(() => screen.classList.remove("is-changing"), 380);
    if (returnToProjector) {
      playProjectorSound();
      screen.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
      screen.focus({ preventScroll: true });
    }
  }

  function renderBoxes() {
    const boxes = SLIDE_COLLECTIONS.map((collection, index) => {
      const box = document.createElement("button");
      box.type = "button";
      box.className = "slide-box";
      box.style.setProperty("--box-color", collection.color);
      box.setAttribute("aria-pressed", "false");
      box.addEventListener("click", () => renderCollection(index, true));
      const lid = document.createElement("span");
      lid.className = "box-lid";
      lid.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "box-label";
      const title = document.createElement("strong");
      title.textContent = collection.title;
      const description = document.createElement("span");
      description.textContent = collection.description;
      const count = document.createElement("small");
      count.textContent = `${collection.slides.length} ${collection.slides.length === 1 ? "diapositiva" : "diapositivas"}`;
      label.append(title, description, count);
      box.append(lid, label);
      return box;
    });
    boxesHost.replaceChildren(...boxes);
  }

  function show(next) {
    const target = (next + slides.length) % slides.length;
    if (target === current) return;
    playProjectorSound();
    const change = () => {
      slides[current].hidden = true;
      current = target;
      slides[current].hidden = false;
      currentNumber.textContent = String(current + 1).padStart(2, "0");
    };
    if (reduceMotion.matches) { change(); return; }
    screen.classList.remove("is-changing");
    void screen.offsetWidth;
    screen.classList.add("is-changing");
    setTimeout(change, 120);
    setTimeout(() => screen.classList.remove("is-changing"), 380);
  }

  function openViewer(image, caption) {
    viewerImage.src = image.currentSrc || image.src;
    viewerImage.alt = image.alt;
    viewerCaption.textContent = caption || image.alt;
    viewer.showModal();
  }

  document.querySelector("#previous").addEventListener("click", () => show(current - 1));
  document.querySelector("#next").addEventListener("click", () => show(current + 1));
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem(soundPreferenceKey, String(soundEnabled)); } catch (_) {}
    updateSoundControl();
  });
  if (!projectionStage.requestFullscreen) {
    fullscreenToggle.hidden = true;
  } else {
    fullscreenToggle.addEventListener("click", async () => {
      if (document.fullscreenElement === projectionStage) await document.exitFullscreen();
      else await projectionStage.requestFullscreen();
    });
    document.addEventListener("fullscreenchange", () => {
      const active = document.fullscreenElement === projectionStage;
      fullscreenToggle.setAttribute("aria-pressed", String(active));
      fullscreenToggle.setAttribute("aria-label", active ? "Salir de pantalla completa" : "Ver el proyector en pantalla completa");
      fullscreenToggle.lastChild.textContent = active ? " Salir" : " Pantalla completa";
    });
  }
  document.querySelector("#viewer-close").addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", event => { if (event.target === viewer) viewer.close(); });
  addEventListener("keydown", event => {
    if (viewer.open) return;
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); show(current + 1); }
  });
  screen.addEventListener("touchstart", event => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
  screen.addEventListener("touchend", event => {
    if (touchStart === null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 45) {
      suppressClick = true;
      show(current + (distance < 0 ? 1 : -1));
      setTimeout(() => { suppressClick = false; }, 350);
    }
    touchStart = null;
  }, { passive: true });

  renderBoxes();
  updateSoundControl();
  renderCollection(0);
})();
