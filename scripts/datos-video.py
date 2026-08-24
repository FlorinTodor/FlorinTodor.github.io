#!/usr/bin/env python3
"""Escribe src/datos/videos.json con los datos que Google pide de cada vídeo.

Duración y tamaño salen de ffprobe; la fecha de publicación, del commit en el
que entró el fichero. Hay que volver a pasarlo al añadir o regrabar un vídeo:

    python3 scripts/datos-video.py
"""
import json
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MEDIA = RAIZ / 'public/media'
SALIDA = RAIZ / 'src/datos/videos.json'


def ffprobe(ruta, campos):
    salida = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
         '-show_entries', campos, '-of', 'json', str(ruta)],
        capture_output=True, text=True, check=True).stdout
    return json.loads(salida)


def fecha_publicacion(ruta):
    """Fecha del commit más reciente que tocó el fichero (regrabarlo la actualiza)."""
    return subprocess.run(
        ['git', 'log', '-1', '--format=%cs', '--', str(ruta.relative_to(RAIZ))],
        cwd=RAIZ, capture_output=True, text=True, check=True).stdout.strip()


datos = {}
for video in sorted(MEDIA.glob('*.mp4')):
    info = ffprobe(video, 'stream=width,height:format=duration')
    flujo = info['streams'][0]
    datos[video.stem] = {
        'segundos': round(float(info['format']['duration'])),
        'ancho': flujo['width'],
        'alto': flujo['height'],
        'fecha': fecha_publicacion(video),
    }

SALIDA.parent.mkdir(parents=True, exist_ok=True)
SALIDA.write_text(json.dumps(datos, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'{SALIDA.relative_to(RAIZ)}: {len(datos)} vídeos')
