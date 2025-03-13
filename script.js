// Botón Ir arriba
window.onscroll = function() {
	mostrarOcultarBoton();
};
	
function mostrarOcultarBoton() {
	if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
	document.getElementById("volver-arriba").style.display = "block";
	} else {
		document.getElementById("volver-arriba").style.display = "none";
		  }
}
	
document.getElementById("volver-arriba").onclick = function(e) {
	e.preventDefault();
	window.scrollTo({
	    top: 0,
	    behavior: "smooth"
	});
};

// Obtén el modal
const modal = document.getElementById("modal-imagen");

// Obtén todas las imágenes con el atributo data-modal-imagen
const imagenes = document.querySelectorAll("[data-modal-imagen]");

// Obtén el elemento <img> dentro del modal
const modalImagen = document.getElementById("img01");

// Obtén el elemento <p> para el texto del atributo alt
const captionText = document.getElementById("caption");

// Obtén el elemento <span> que cierra el modal
const cerrar = document.getElementsByClassName("cerrar")[0];

// Obtén las flechas de navegación
const anterior = document.querySelector(".anterior");
const siguiente = document.querySelector(".siguiente");

let indiceActual = 0;

// Función para actualizar la imagen y el texto del modal
function actualizarModal(indice) {
	modalImagen.src = imagenes[indice].dataset.modalImagen;
	captionText.innerHTML = imagenes[indice].alt;
}

// Agrega un evento click a cada imagen
imagenes.forEach((imagen, indice) => {
    imagen.onclick = function() {
      modal.style.display = "flex";
      indiceActual = indice;
      actualizarModal(indiceActual);
  }
});

  // Agrega un evento click a la flecha anterior
  anterior.onclick = function() {
    indiceActual = (indiceActual - 1 + imagenes.length) % imagenes.length;
    actualizarModal(indiceActual);
  }

  // Agrega un evento click a la flecha siguiente
  siguiente.onclick = function() {
    indiceActual = (indiceActual + 1) % imagenes.length;
    actualizarModal(indiceActual);
  }

// Agrega un evento click al botón de cerrar
cerrar.onclick = function() {
  modal.style.display = "none";
}

// Agrega un evento click al fondo del modal
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}


