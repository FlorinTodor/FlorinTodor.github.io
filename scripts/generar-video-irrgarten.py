#!/usr/bin/env python3
"""Convierte una partida real de Irrgarten en public/media/irrgarten.mp4.

La transcripción (scripts/irrgarten-partida.txt) es la salida literal de
`ruby Main/main.rb` del repo FlorinTodor/PDOO, jugada de principio a fin hasta
ganar. Aquí sólo se re-dibuja con tipografía de terminal y se le da el ritmo de
una sesión real: la salida de cada turno aparece de golpe, hay una pausa
mientras el jugador decide, y luego se ve la tecla que ha pulsado.

    python3 scripts/generar-video-irrgarten.py

Requiere Pillow y ffmpeg.
"""
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
PARTIDA = RAIZ / 'scripts/irrgarten-partida.txt'
SALIDA = RAIZ / 'public/media/irrgarten.mp4'
POSTER = RAIZ / 'public/media/poster/irrgarten.jpg'

ANCHO, ALTO = 1100, 640
BARRA = 36
MARGEN = 20
FPS = 25
TAM = 13
INTERLINEADO = 15.5
TITULO = 'ruby Main/main.rb - partida real de Irrgarten'
ORDEN = 'ruby Main/main.rb'
PROMPT = 'florin@ugr:~/PDOO/Irrgarten_trabajo/ruby_original$ '

FONDO = (12, 15, 22)
FONDO_BARRA = (20, 25, 33)
BORDE = (32, 39, 51)
TEXTO = (201, 209, 217)
TENUE = (99, 110, 123)
VERDE = (61, 220, 132)
MORADO = (177, 156, 255)
AMBAR = (240, 180, 95)
ROJO = (255, 123, 114)
AZUL = (121, 192, 255)

MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
MONO_B = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
fuente = ImageFont.truetype(MONO, TAM)
fuente_b = ImageFont.truetype(MONO_B, TAM)
ANCHO_CAR = fuente.getlength('M')
VISIBLES = int((ALTO - BARRA - MARGEN) / INTERLINEADO)

CABECERAS = ('Laberinto:', 'Jugadores:', 'Monstruos:', 'Registro del Juego:')
COLOR_CELDA = {'X': (55, 65, 81), '-': (45, 53, 66), 'M': ROJO, 'C': AMBAR, 'E': VERDE}


def es_tablero(linea):
    return bool(re.fullmatch(r'[X\-MCE0-9 ]{20,}', linea))


def color_linea(linea):
    if linea.startswith(PROMPT):
        return None
    if linea.startswith(CABECERAS) or linea.startswith('Turno del Jugador'):
        return MORADO
    if linea.startswith('Where?'):
        return VERDE
    if 'Felicidades' in linea:
        return VERDE
    if 'combate' in linea or 'resucitado' in linea or 'perdido el turno' in linea:
        return AMBAR
    if linea.startswith(('Name:', 'Weapons:', 'Shields:')):
        return TENUE
    return TEXTO


def dibuja(lineas):
    img = Image.new('RGB', (ANCHO, ALTO), FONDO)
    d = ImageDraw.Draw(img)

    # Barra de título con los tres botones.
    d.rectangle((0, 0, ANCHO, BARRA), fill=FONDO_BARRA)
    d.line((0, BARRA, ANCHO, BARRA), fill=BORDE)
    for i, c in enumerate([(238, 83, 81), (244, 191, 79), (61, 200, 100)]):
        d.ellipse((16 + i * 20, 12, 28 + i * 20, 24), fill=c)
    ancho_titulo = fuente.getlength(TITULO)
    d.text(((ANCHO - ancho_titulo) / 2, 11), TITULO, font=fuente, fill=TENUE)

    y = BARRA + 10
    for linea in lineas[-VISIBLES:]:
        if linea.startswith(PROMPT):
            d.text((MARGEN, y), PROMPT, font=fuente, fill=VERDE)
            d.text((MARGEN + fuente.getlength(PROMPT), y), linea[len(PROMPT):],
                   font=fuente_b, fill=TEXTO)
        elif es_tablero(linea):
            # El tablero se pinta celda a celda: los monstruos y la salida se ven.
            for i, c in enumerate(linea):
                if c == ' ':
                    continue
                col = COLOR_CELDA.get(c, AZUL if c.isdigit() else TEXTO)
                d.text((MARGEN + i * ANCHO_CAR, y), c, font=fuente_b, fill=col)
        else:
            d.text((MARGEN, y), linea, font=fuente, fill=color_linea(linea) or TEXTO)
        y += INTERLINEADO
    return img


def main():
    bruto = PARTIDA.read_text(encoding='utf-8').replace('\r', '')
    # Cada turno: lo que imprime el programa y, al final, la tecla del jugador.
    turnos = re.split(r'(Where\? [A-Z ]+ARROW)', bruto)

    guion = []          # (líneas_a_añadir, fotogramas_de_espera)
    guion.append(([PROMPT], 12))
    for i in range(1, len(ORDEN) + 1):        # la orden, tecleada
        guion.append(([PROMPT + ORDEN[:i]], 2))
    guion.append(([''], 10))

    for i, bloque in enumerate(turnos):
        if not bloque.strip():
            continue
        lineas = bloque.strip('\n').split('\n')
        if bloque.startswith('Where?'):
            guion.append((lineas, 8))         # la tecla pulsada
        else:
            guion.append((lineas, 22))        # el estado del juego + pausa
    guion.append(([''], 70))                  # remate sobre la victoria

    tmp = Path(tempfile.mkdtemp())
    lineas, n = [], 0
    for nuevas, espera in guion:
        if nuevas == [PROMPT] or (nuevas and nuevas[0].startswith(PROMPT)):
            if lineas and lineas[-1].startswith(PROMPT):
                lineas[-1] = nuevas[0]        # se reescribe al teclear
            else:
                lineas.append(nuevas[0])
        else:
            lineas.extend(nuevas)
        img = dibuja(lineas)
        for _ in range(espera):
            img.save(tmp / f'{n:05d}.png')
            n += 1

    subprocess.run([
        'ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS),
        '-i', str(tmp / '%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-crf', '23', '-movflags', '+faststart', str(SALIDA),
    ], check=True)

    # El póster: el primer fotograma en el que ya se ve el laberinto.
    poster = int(FPS * 3.2)
    Image.open(tmp / f'{min(poster, n - 1):05d}.png').convert('RGB').save(
        POSTER, 'JPEG', quality=82, optimize=True)
    shutil.rmtree(tmp)
    print(f'{SALIDA.relative_to(RAIZ)}: {n / FPS:.1f} s, {SALIDA.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
