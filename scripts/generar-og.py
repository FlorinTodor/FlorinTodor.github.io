#!/usr/bin/env python3
"""Genera las tarjetas que se ven al compartir el sitio en redes.

  public/img/og.jpg          la del sitio entero
  public/img/og/<id>.jpg     una por proyecto publicado
  public/img/og-en.jpg       la del sitio, en inglés
  public/img/og/en/<id>.jpg  una por proyecto, en inglés

Se dibujan aquí en vez de exportarlas de un diseño para que el nombre y los
colores salgan siempre de la misma fuente que la web (src/styles/global.css), y
los proyectos, de proyectos.json: al añadir uno, su tarjeta sale sola.

Sin la tarjeta por proyecto, compartir un proyecto concreto en LinkedIn enseñaba
la tarjeta genérica del portafolio, que no dice de qué va el enlace.

    python3 scripts/generar-og.py
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
RETRATO = RAIZ / 'public/img/florin-emanuel-todor-gliga.jpg'
SALIDA = {'es': RAIZ / 'public/img/og.jpg', 'en': RAIZ / 'public/img/og-en.jpg'}
SALIDA_PROYECTOS = {'es': RAIZ / 'public/img/og', 'en': RAIZ / 'public/img/og/en'}

# Lo único que cambia de idioma en la tarjeta del sitio. Los proyectos sacan su
# texto de proyectos.json y proyectos.en.json, igual que la web.
TEXTOS = {
    'es': {
        'rol': ['Sistemas Linux · Ciberseguridad', 'IA aplicada'],
        'formacion': ['Doble Grado en Ingeniería Informática y ADE',
                      'Universidad de Granada'],
    },
    'en': {
        'rol': ['Linux systems · Cybersecurity', 'Applied AI'],
        'formacion': ['Double Degree in Computer Engineering and Business',
                      'University of Granada'],
    },
}

ANCHO, ALTO = 1200, 630
FONDO = (2, 22, 43)        # --fondo
VERDE = (61, 220, 132)     # --verde
TEXTO = (232, 241, 248)    # --texto
SUAVE = (159, 184, 204)    # --texto-suave
BORDE = (22, 69, 111)      # --borde

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


def envolver(texto, f, ancho, maximo=None):
    """Parte el texto en líneas que quepan en `ancho` píxeles."""
    lineas, actual = [], ''
    for palabra in texto.split():
        prueba = f'{actual} {palabra}'.strip()
        if f.getlength(prueba) <= ancho or not actual:
            actual = prueba
        else:
            lineas.append(actual)
            actual = palabra
    lineas.append(actual)
    if maximo and len(lineas) > maximo:
        lineas = lineas[:maximo]
        lineas[-1] = lineas[-1].rstrip(' ,.;:') + '…'
    return lineas


def lienzo():
    """Fondo con el halo verde de la esquina, el mismo gesto que la portada."""
    img = Image.new('RGB', (ANCHO, ALTO), FONDO)
    halo = Image.new('RGB', (ANCHO, ALTO), FONDO)
    ImageDraw.Draw(halo).ellipse((ANCHO - 480, -260, ANCHO + 300, 520), fill=(7, 41, 42))
    return Image.blend(img, halo, 1.0)


def pegar_retrato(img, diametro, cx, cy, aro=5):
    """Retrato circular con aro verde."""
    retrato = Image.open(RETRATO).convert('RGB')
    lado = min(retrato.size)
    retrato = retrato.crop((
        (retrato.width - lado) // 2, (retrato.height - lado) // 2,
        (retrato.width + lado) // 2, (retrato.height + lado) // 2,
    )).resize((diametro, diametro), Image.LANCZOS)
    mascara = Image.new('L', (diametro * 4, diametro * 4), 0)
    ImageDraw.Draw(mascara).ellipse((0, 0, diametro * 4, diametro * 4), fill=255)
    img.paste(retrato, (cx - diametro // 2, cy - diametro // 2),
              mascara.resize((diametro, diametro), Image.LANCZOS))
    ImageDraw.Draw(img).ellipse(
        (cx - diametro // 2 - aro, cy - diametro // 2 - aro,
         cx + diametro // 2 + aro, cy + diametro // 2 + aro),
        outline=VERDE, width=aro,
    )


def guardar(img, destino):
    destino.parent.mkdir(parents=True, exist_ok=True)
    img.save(destino, 'JPEG', quality=90, optimize=True)
    print(f'escrito {destino.relative_to(RAIZ)} ({destino.stat().st_size // 1024} KB)')


def tarjeta_sitio(idioma):
    textos = TEXTOS[idioma]
    img = lienzo()
    pegar_retrato(img, 264, 228, 315)
    d = ImageDraw.Draw(img)

    X = 400
    y = 150
    y = escribir(d, X, y, ['FLORIN EMANUEL', 'TODOR GLIGA'], fuente(NEGRITA, 62), TEXTO, 1.22)
    y += 14
    y = escribir(d, X, y, textos['rol'], fuente(NEGRITA, 32), VERDE, 1.3)
    y += 16
    y = escribir(d, X, y, textos['formacion'], fuente(NORMAL, 25), SUAVE, 1.32)
    y += 24
    d.line((X, y, X + 420, y), fill=BORDE, width=2)
    y += 26
    escribir(d, X, y, ['florintodor.dev'], fuente(NEGRITA, 27), TEXTO)
    guardar(img, SALIDA[idioma])


def tarjeta_proyecto(p, idioma):
    img = lienzo()
    d = ImageDraw.Draw(img)
    X, DERECHA = 80, ANCHO - 80
    ancho_texto = DERECHA - X

    # Antetítulo: año y categorías, lo que sitúa el proyecto de un vistazo.
    encima = ' · '.join([str(p['anio'])] + p.get('categorias', [])[:2]).upper()
    y = escribir(d, X, 84, [encima], fuente(NEGRITA, 24), VERDE)

    # El bloque de texto se centra entre el antetítulo y la firma: los títulos
    # van de una a tres líneas y con posiciones fijas unas tarjetas quedaban
    # apelmazadas y otras con un hueco en medio.
    f_titulo = fuente(NEGRITA, 54)
    f_resumen = fuente(NORMAL, 27)
    f_stack = fuente(NEGRITA, 23)
    titulo = envolver(p['titulo'], f_titulo, ancho_texto, 3)
    resumen = envolver(p['resumen'], f_resumen, ancho_texto, 2)
    stack = envolver(' · '.join(p['stack'][:6]), f_stack, ancho_texto, 1)

    ARRIBA, ABAJO = 150, 495
    alto = (len(titulo) * int(f_titulo.size * 1.24) + 18
            + len(resumen) * int(f_resumen.size * 1.38) + 26
            + int(f_stack.size * 1.28))
    y = ARRIBA + max(0, (ABAJO - ARRIBA - alto) // 2)

    y = escribir(d, X, y, titulo, f_titulo, TEXTO, 1.24)
    y = escribir(d, X, y + 18, resumen, f_resumen, SUAVE, 1.38)
    escribir(d, X, y + 26, stack, f_stack, SUAVE)

    d.line((X, 512, DERECHA, 512), fill=BORDE, width=2)
    pegar_retrato(img, 62, X + 31, 562, aro=3)
    d = ImageDraw.Draw(img)
    d.text((X + 82, 538), 'Florin Emanuel Todor Gliga', font=fuente(NEGRITA, 26), fill=TEXTO)
    d.text((X + 82, 572), 'florintodor.dev', font=fuente(NORMAL, 23), fill=SUAVE)

    guardar(img, SALIDA_PROYECTOS[idioma] / f"{p['id']}.jpg")


def main():
    datos = json.loads((RAIZ / 'proyectos.json').read_text(encoding='utf-8'))
    traducciones = json.loads(
        (RAIZ / 'proyectos.en.json').read_text(encoding='utf-8')
    )['proyectos']

    for idioma in ('es', 'en'):
        tarjeta_sitio(idioma)
        for p in datos['proyectos']:
            oculto = p.get('oculto') or any(
                x.startswith('NO PUBLICAR') for x in p.get('pendiente', [])
            )
            if oculto:
                continue
            # Sin traducción se cae al español, igual que la web.
            tarjeta_proyecto({**p, **traducciones.get(p['id'], {})} if idioma == 'en' else p,
                             idioma)


if __name__ == '__main__':
    main()
