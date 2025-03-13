import os

def generar_html_imagenes(archivo_salida, ruta_relativa_personalizada):
    """
    Genera código HTML para mostrar imágenes en la carpeta actual, ordenadas por nombre inverso.

    Args:
        archivo_salida (str): La ruta al archivo de texto donde se guardará el HTML.
        ruta_relativa_personalizada (str): la ruta relativa que se agregara antes del nombre de la imagen.
    """

    try:
        carpeta_actual = os.getcwd()  # Obtiene la carpeta actual
        archivos = os.listdir(carpeta_actual)
        archivos.sort(reverse=True) #ordena los archivos por nombre inverso.

        with open(archivo_salida, 'w') as archivo:
            for nombre_archivo in archivos:
                if nombre_archivo.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):  # Verifica extensiones de imagen
                    ruta_imagen = os.path.join(carpeta_actual, nombre_archivo)
                    ruta_imagen_relativa = os.path.join(ruta_relativa_personalizada, nombre_archivo) # se agrega la ruta relativa personalizada.

                    # Genera un "alt" capitalizado a partir del nombre del archivo.
                    nombre_alt = nombre_archivo.split('.')[0].replace('_', ' ').replace('-', ' ').upper()

                    html_imagen = f'<img src="{ruta_imagen_relativa}" data-modal-imagen="{ruta_imagen_relativa}" alt="{nombre_alt}" />\n'
                    archivo.write(html_imagen)

        print(f"Se ha generado el archivo HTML: {archivo_salida}")

    except FileNotFoundError:
        print(f"Error: La carpeta actual no existe (esto no debería ocurrir).")
    except Exception as e:
        print(f"Ocurrió un error: {e}")

# Ejemplo de uso:
archivo_salida = 'imagenes_html.txt'
ruta_relativa = input("Introduce la ruta relativa que deseas agregar antes del nombre de la imagen (ej: images/): ")
generar_html_imagenes(archivo_salida, ruta_relativa)