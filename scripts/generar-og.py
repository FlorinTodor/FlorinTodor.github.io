#!/usr/bin/env python3
"""Genera public/img/og.jpg, la tarjeta que se ve al compartir el sitio.

Se dibuja aquí en vez de exportarla de un diseño para que el nombre y los
colores salgan siempre de la misma fuente que la web (src/styles/global.css).

    python3 scripts/generar-og.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
RETRATO = RAIZ / 'public/img/florin-emanuel-todor-gliga.jpg'
SALIDA = RAIZ / 'public/img/og.jpg'

ANCHO, ALTO = 1200, 630
FONDO = (2, 22, 43)        # --fondo
VERDE = (61, 220, 132)     # --verde
TEXTO = (232, 241, 248)    # --texto
SUAVE = (159, 184, 204)    # --texto-suave

NEGRITA = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
NORMAL = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'


def fuente(ruta, tam):
    return ImageFont.truetype(ruta, tam)


def escribir(d, x, y, lineas, f, color, interlineado=1.28):
    """Escribe líneas seguidas y devuelve la y siguiente."""
    alto = int(f.size * interlineado)
    for linea in lineas:
        d.text((x, y), linea, font=f, fill=color)
        y += alto
    return y


img = Image.new('RGB', (ANCHO, ALTO), FONDO)
d = ImageDraw.Draw(img)

# Halo verde de la esquina, el mismo gesto que el degradado de la portada.
halo = Image.new('RGB', (ANCHO, ALTO), FONDO)
ImageDraw.Draw(halo).ellipse((ANCHO - 480, -260, ANCHO + 300, 520), fill=(7, 41, 42))
img = Image.blend(img, halo, 1.0)
d = ImageDraw.Draw(img)

# Retrato circular con aro verde.
DIAM, CX, CY = 264, 228, 315
retrato = Image.open(RETRATO).convert('RGB')
lado = min(retrato.size)
retrato = retrato.crop((
    (retrato.width - lado) // 2, (retrato.height - lado) // 2,
    (retrato.width + lado) // 2, (retrato.height + lado) // 2,
)).resize((DIAM, DIAM), Image.LANCZOS)
mascara = Image.new('L', (DIAM * 4, DIAM * 4), 0)
ImageDraw.Draw(mascara).ellipse((0, 0, DIAM * 4, DIAM * 4), fill=255)
img.paste(retrato, (CX - DIAM // 2, CY - DIAM // 2), mascara.resize((DIAM, DIAM), Image.LANCZOS))
d.ellipse((CX - DIAM // 2 - 5, CY - DIAM // 2 - 5, CX + DIAM // 2 + 5, CY + DIAM // 2 + 5),
          outline=VERDE, width=5)

# Columna de texto.
X = 400
y = 150
y = escribir(d, X, y, ['FLORIN EMANUEL', 'TODOR GLIGA'], fuente(NEGRITA, 62), TEXTO, 1.22)
y += 14
y = escribir(d, X, y, ['Sistemas Linux · Ciberseguridad', 'IA aplicada'],
             fuente(NEGRITA, 32), VERDE, 1.3)
y += 16
y = escribir(d, X, y, ['Doble Grado en Ingeniería Informática y ADE',
                       'Universidad de Granada'], fuente(NORMAL, 25), SUAVE, 1.32)
y += 24
d.line((X, y, X + 420, y), fill=(22, 69, 111), width=2)
y += 26
escribir(d, X, y, ['florintodor.dev'], fuente(NEGRITA, 27), TEXTO)

img.save(SALIDA, 'JPEG', quality=90, optimize=True)
print(f'escrito {SALIDA.relative_to(RAIZ)} ({SALIDA.stat().st_size // 1024} KB)')
