#!/usr/bin/env python3
"""Vacía la barra de marcadores del navegador en el vídeo del TFG.

La demo de Ciber-AsesorIA está grabada sobre el navegador con la barra de
marcadores a la vista, y ahí se leen las carpetas personales: cursos, webs de
formación, la pestaña de LaTeX... Nada grave, pero es el navegador de uno
asomando en la portada del mejor proyecto del portafolio.

Recortar la parte de arriba del vídeo no vale: el vídeo alterna la ventana del
navegador con una terminal, y en los tramos de terminal ese recorte se comería
las primeras líneas de log. Tampoco vale un rectángulo fijo, porque al cambiar
de ventana el navegador se anima y la barra aparece desplazada unos fotogramas.

Así que la barra se busca en cada fotograma por su color de fondo:

  1. se marcan los píxeles del gris de la barra (59, 58, 63),
  2. se buscan filas con esa franja de gris de lado a lado. Las filas donde van
     los iconos y los títulos tienen menos gris, así que las filas sueltas se
     agrupan permitiendo huecos: la barra sale como una banda de unos 26 px,
  3. se rellena cada banda con ese mismo gris, del primer al último píxel gris
     de la fila, que es justo el ancho de la ventana.

Rellenar con el color que ya tiene el fondo hace que el filtro sea inofensivo:
donde no hay texto no cambia nada, y donde había marcadores quedan borrados.
Por lo mismo se puede ejecutar dos veces seguidas sin degradar el vídeo más
allá de la recodificación.

Uso:  python3 scripts/tapar-marcadores.py
Necesita ffmpeg y numpy. Regenera también el cartel (poster) del vídeo.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
VIDEO = RAIZ / "public" / "media" / "ciber-asesoria.mp4"
POSTER = RAIZ / "public" / "media" / "poster" / "ciber-asesoria.jpg"

ANCHO, ALTO = 1280, 720
GRIS = (59, 58, 63)      # fondo de la barra de marcadores
TOLERANCIA = 12
ZONA = 340               # la barra nunca baja de aquí, ni con la ventana animada
MIN_ANCHO = 700          # píxeles grises en la fila para darla por fondo de barra
HUECO = 10               # filas de iconos que se saltan al agrupar
ALTO_MIN, ALTO_MAX = 14, 36
DENSIDAD = 0.5           # gris mínimo de la banda; por debajo no es la barra


def franjas(mascara):
    """Bandas horizontales que parecen la barra de marcadores."""
    bandas = []
    for y in np.flatnonzero(mascara[:ZONA].sum(axis=1) > MIN_ANCHO):
        if bandas and y - bandas[-1][1] <= HUECO:
            bandas[-1][1] = y
        else:
            bandas.append([y, y])
    return [(a, b) for a, b in bandas
            if ALTO_MIN <= b - a + 1 <= ALTO_MAX and mascara[a:b + 1].mean() >= DENSIDAD]


def main():
    if not VIDEO.exists():
        sys.exit(f"No está el vídeo: {VIDEO}")

    salida = VIDEO.with_suffix(".limpio.mp4")
    lector = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(VIDEO), "-f", "rawvideo",
         "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    escritor = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{ANCHO}x{ALTO}", "-r", "24", "-i", "-",
         "-c:v", "libx264", "-crf", "29", "-preset", "slow", "-tune", "stillimage",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(salida)],
        stdin=subprocess.PIPE,
    )

    bytes_por_fotograma = ANCHO * ALTO * 3
    gris = np.array(GRIS, dtype=np.uint8)
    n = tapados = 0
    while True:
        crudo = lector.stdout.read(bytes_por_fotograma)
        if len(crudo) < bytes_por_fotograma:
            break
        f = np.frombuffer(crudo, dtype=np.uint8).reshape(ALTO, ANCHO, 3).copy()
        mascara = (np.abs(f.astype(np.int16) - gris) <= TOLERANCIA).all(axis=2)
        for a, b in franjas(mascara):
            columnas = np.flatnonzero(mascara[a:b + 1].any(axis=0))
            if columnas.size:
                f[a:b + 1, columnas[0]:columnas[-1] + 1] = gris
                tapados += 1
        escritor.stdin.write(f.tobytes())
        n += 1

    escritor.stdin.close()
    escritor.wait()
    lector.wait()
    salida.replace(VIDEO)
    print(f"{n} fotogramas, {tapados} franjas tapadas → {VIDEO.relative_to(RAIZ)}")

    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", "2", "-i", str(VIDEO),
         "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "6", str(POSTER)],
        check=True,
    )
    print(f"Cartel regenerado → {POSTER.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
