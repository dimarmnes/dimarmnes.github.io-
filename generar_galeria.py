import os
import math

image_folder = 'images/qsl'
images_per_page = 50
output_folder = '.'
html_filename_base = 'qsl'  # Variable para el nombre base de los archivos HTML

# 1. Obtener la lista de imágenes
def get_images(folder):
    images = []
    for filename in os.listdir(folder):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            images.append(filename)
    return images

# 2. Generar el HTML de una página de la galería
def generate_gallery_page(images, page_number, total_pages, html_filename_base):
    html = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LU1IDC - Radioaficionado Argentino</title>
    <link rel="stylesheet" href="style.css">
	<link rel="preconnect" href="https://fonts.googleapis.com">
  	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  	<link href="https://fonts.googleapis.com/css2?family=Comic+Neue:wght@300;400;700&display=swap" rel="stylesheet"> 
	<link rel="apple-touch-icon" sizes="180x180" href="images/apple-touch-icon.png">
	<link rel="icon" type="image/png" sizes="32x32" href="images/favicon-32x32.png">
	<link rel="icon" type="image/png" sizes="16x16" href="images/favicon-16x16.png">	
</head>
<body>

    <header>
        <img src="images/lu1idc_lupin_logo_100.png" alt="Logo Lu1idc">
        <p>Lic. desde 2003 - En el aire desde 2024</p>
        <p>San Javier, Misiones, Argentina - GG22KD - ITU Zone 14 - CQ Zone 13</p>
    </header>
 
    <main>
		<nav class="menu">
            <ul>
                <li><a href="index.html">INICIO</a></li>
                <li><a href="rig.html">LA ESTACIÓN</a></li>
                <li><a href="soft.html">MI SOFTWARE</a></li>
				<li><a href="onair.html">EN EL AIRE</a></li>
				<li><a href="contests.html">CONCURSOS</a></li>
				<li><a href="awards.html">DIPLOMAS</a></li>
				<li><span>QSLs</span></li>
		    </ul>
		</nav>

        
        <section class="section-gallery-100">
            <h2>Algunas QSLs recibidas</h2>
    """

    for image in images:
        html += f"""
            <img src="{image_folder}/{image}" 
                 data-modal-imagen="{image_folder}/{image}" 
                 alt="{image.split('.')[0]}" />
        """

    html += f"""
        </section>
        <nav class="pagination">
    """

    # Enlaces de paginación (modificado con paginación reducida)
    if page_number > 1:
        html += f'<a href="{html_filename_base}-{page_number - 1}.html">Anterior</a>'

    pages_to_show = 5
    half_pages_to_show = pages_to_show // 2

    start_page = max(1, page_number - half_pages_to_show)
    end_page = min(total_pages, page_number + half_pages_to_show)

    if end_page - start_page + 1 < pages_to_show:
        if page_number <= half_pages_to_show:
            end_page = min(total_pages, pages_to_show)
        else:
            start_page = max(1, total_pages - pages_to_show + 1)

    if start_page > 1:
        html += f'<a href="{html_filename_base}-1.html">1</a>'
        if start_page > 2:
            html += '<span>...</span>'

    for i in range(start_page, end_page + 1):
        if i == page_number:
            html += f'<span class="current">{i}</span>'
        else:
            html += f'<a href="{html_filename_base}-{i}.html">{i}</a>'

    if end_page < total_pages:
        if end_page < total_pages - 1:
            html += '<span>...</span>'
        html += f'<a href="{html_filename_base}-{total_pages}.html">{total_pages}</a>'

    if page_number < total_pages:
        html += f'<a href="{html_filename_base}-{page_number + 1}.html">Siguiente</a>'

    html += f"""
        </nav>

        <footer>
            <p class="texto-resaltado">© 2024 LU1IDC inspirado por Guerrero y Sídoli</p>
        </footer>

        <a href="#" id="volver-arriba" title="Volver arriba">
            <img src="images/up-arrow.png" alt="Volver arriba">
        </a>

        </main>

        <div id="modal-imagen" class="modal">
            <a class="anterior">&#10094;</a>
            <img class="modal-contenido" id="img01">
            <span class="cerrar">&times;</span>
            <a class="siguiente">&#10095;</a>
            <p id="caption"></p>
        </div>  
        <script src="script.js"></script>
    </body>
    </html>
    """

    return html  # Ahora está dentro de la función

# 3. Crear las páginas de la galería
def generate_gallery_pages():
    images = get_images(image_folder)
    total_images = len(images)
    total_pages = math.ceil(total_images / images_per_page)

    for i in range(1, total_pages + 1):
        start = (i - 1) * images_per_page
        end = start + images_per_page
        page_images = images[start:end]
        page_html = generate_gallery_page(page_images, i, total_pages, html_filename_base)
        with open(f'{html_filename_base}-{i}.html', 'w') as f:
            f.write(page_html)
        print(f'Página {html_filename_base}-{i}.html generada!')

# Ejecutar la generación de las páginas
generate_gallery_pages()
