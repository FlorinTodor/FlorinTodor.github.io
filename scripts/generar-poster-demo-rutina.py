#!/usr/bin/env python3
"""Saca la miniatura de la demo de rutina-export para la tarjeta de la portada.

Los demás proyectos enseñan un vídeo en la tarjeta y su cartel sale del propio
MP4. La demo de rutina-export no es un vídeo, es el dashboard embebido en un
iframe, así que la tarjeta se quedaba en blanco. Aquí se fotografía el mismo
HTML que se embebe, para que la miniatura no pueda decir algo distinto de lo
que se ve al entrar.

    python3 scripts/generar-poster-demo-rutina.py

Escribe public/media/poster/rutina-export.jpg y su gemela inglesa
rutina-export-en.jpg, cada una de su copia del dashboard.

Necesita Chrome (o Chromium) y Pillow. El dashboard pide sus tipografías a
Google Fonts: sin red se dibuja con las del sistema y la miniatura sale con
otra letra, así que conviene mirarla antes de dar el cambio por bueno.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
DEMO = RAIZ / "public" / "demo" / "rutina-export"
POSTERS = RAIZ / "public" / "media" / "poster"

# Copias del dashboard y el cartel que sale de cada una.
PAGINAS = [
    (DEMO / "index.html", POSTERS / "rutina-export.jpg"),
    (DEMO / "en" / "index.html", POSTERS / "rutina-export-en.jpg"),
]

NAVEGADORES = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]

# La ventana es estrecha a propósito: a 1280 el dashboard sale con la letra
# diminuta al encogerlo a los 450 píxeles que mide la tarjeta.
ANCHO, ALTO = 1040, 900      # ventana del navegador, en píxeles CSS
ESCALA = 2                   # se fotografía al doble y se reduce: sale más nítida
# 4/3 y no 16/9: en la tarjeta destacada la miniatura es la columna entera y una
# panorámica se recorta por los lados, que es justo donde está el título.
SALIDA = (1200, 900)


def navegador() -> str:
    for nombre in NAVEGADORES:
        ruta = shutil.which(nombre)
        if ruta:
            return ruta
    sys.exit("No hay Chrome ni Chromium instalados: no se puede fotografiar la demo.")


def captura(pagina: Path, destino: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        # El dashboard sigue el tema del sistema y el navegador sin escritorio
        # se pide en claro; el portafolio es oscuro, así que se fija a mano.
        copia = tmp / "demo.html"
        copia.write_text(
            pagina.read_text(encoding="utf-8").replace("<html lang=", "<html data-theme=\"dark\" lang=", 1),
            encoding="utf-8",
        )
        foto = tmp / "foto.png"
        subprocess.run(
            [navegador(), "--headless=new", "--disable-gpu", "--hide-scrollbars",
             f"--force-device-scale-factor={ESCALA}",
             f"--window-size={ANCHO},{ALTO}",
             f"--screenshot={foto}", copia.as_uri()],
            check=True, capture_output=True,
        )
        recorta(foto, destino)


def recorta(foto: Path, destino: Path) -> None:
    imagen = Image.open(foto).convert("RGB")
    ancho, _ = imagen.size
    arriba = fin_del_aviso(imagen)
    # El aviso de datos inventados ya lo cuenta la página alrededor del iframe:
    # en una miniatura de 300 píxeles no se leería y se comería el dashboard.
    imagen.crop((0, arriba, ancho, arriba + round(ancho * SALIDA[1] / SALIDA[0]))) \
        .resize(SALIDA, Image.LANCZOS) \
        .save(destino, quality=84, optimize=True, progressive=True)
    print(f"✓ {destino.relative_to(RAIZ)}")


def fin_del_aviso(imagen: Image.Image) -> int:
    """Primera fila por debajo de la banda ámbar del aviso.

    Se mide en vez de fijarla: el aviso ocupa una línea o dos según lo largo
    que sea el texto, y cambia al traducirlo.
    """
    pixeles = imagen.load()
    _, alto = imagen.size
    y = 0
    while y < alto and pixeles[8, y][0] > 40:  # ámbar #3a2a00 sobre fondo #101318
        y += 1
    return y


def main() -> None:
    POSTERS.mkdir(parents=True, exist_ok=True)
    for pagina, destino in PAGINAS:
        if not pagina.exists():
            sys.exit(f"Falta {pagina.relative_to(RAIZ)}: genera antes la demo "
                     "con scripts/regenerar-demo-rutina.py")
        captura(pagina, destino)


if __name__ == "__main__":
    main()
