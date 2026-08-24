#!/usr/bin/env python3
"""Tapa el DNI/NIE de los certificados antes de publicarlos.

Un rectángulo dibujado *encima* de un PDF no tapa nada: el texto sigue debajo y
se recupera seleccionándolo o con `pdftotext`. Aquí se hace bien:

  1. se localiza cada dato con `pdftotext -bbox-layout` (coordenadas en puntos),
  2. se rasteriza la página,
  3. se pinta el rectángulo sobre los píxeles,
  4. se vuelve a montar el PDF a partir de la imagen.

El resultado no tiene capa de texto, así que debajo de la mancha no queda nada.

Además del número de documento se tapan los códigos de verificación y los QR:
llevan al documento original en la sede electrónica, donde el dato vuelve a
estar a la vista.

Uso:  python3 scripts/tapar-datos-personales.py
Necesita poppler-utils y Pillow.
"""
import re
import subprocess
import sys
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / "originales" / "certificaciones-con-datos-personales"
DESTINO = RAIZ / "public" / "certificaciones"

DPI = 200
MARGEN = 1.5      # puntos de holgura alrededor de cada palabra
TINTA = (24, 24, 24)

# Patrones de lo que hay que tapar, sobre cada palabra suelta del PDF.
PATRONES = [
    re.compile(r"^[XYZ]\d{7}[A-Z]\b"),          # NIE
    re.compile(r"^\d{8}[A-Z]\b"),               # DNI
    re.compile(r"^[0-9A-F]{32}$"),              # CSV de la sede de la UGR
    re.compile(r"credentials\.britishcouncil\.org"),  # enlace con clave
]

# Los QR no son texto: van a mano, en puntos y por página (1 = la primera).
# Generosos a propósito; alrededor no hay nada más.
DOCUMENTOS = [
    {
        "origen": "Certificado_ingles_b1.pdf",
        "destino": "british-council-aptis-b1.pdf",
        "cajas": {1: [(445, 25, 555, 135)]},
    },
    {
        "origen": "Certificado_Software_libre_MOOC.pdf",
        "destino": "mooc-ugr-software-libre.pdf",
        "cajas": {1: [(92, 796, 138, 840)]},
    },
    {
        "origen": "Certificado_machine_learning_MOOC.pdf",
        "destino": "mooc-ugr-ml-bioinformatica.pdf",
        "cajas": {1: [(92, 796, 138, 840)]},
    },
]


def palabras_por_pagina(pdf: Path):
    """[(ancho, alto, [(texto, x0, y0, x1, y1), ...]), ...], en puntos."""
    xml = subprocess.run(
        ["pdftotext", "-bbox-layout", str(pdf), "-"],
        check=True, capture_output=True, text=True,
    ).stdout
    ns = {"h": "http://www.w3.org/1999/xhtml"}
    raiz = ElementTree.fromstring(xml)
    paginas = []
    for pagina in raiz.iter(f"{{{ns['h']}}}page"):
        palabras = [
            (
                p.text or "",
                float(p.get("xMin")), float(p.get("yMin")),
                float(p.get("xMax")), float(p.get("yMax")),
            )
            for p in pagina.iter(f"{{{ns['h']}}}word")
        ]
        paginas.append((float(pagina.get("width")), float(pagina.get("height")), palabras))
    return paginas


def tapar(doc) -> int:
    origen = ORIGEN / doc["origen"]
    destino = DESTINO / doc["destino"]
    if not origen.exists():
        print(f"✗ falta {origen.name}", file=sys.stderr)
        return 0

    paginas = palabras_por_pagina(origen)
    escala = DPI / 72

    # pdftoppm numera las páginas con el prefijo que se le pase.
    tmp = DESTINO / f".tmp-{destino.stem}"
    subprocess.run(["pdftoppm", "-jpeg", "-r", str(DPI), str(origen), str(tmp)], check=True)
    imagenes = sorted(tmp.parent.glob(f"{tmp.name}-*.jpg"))

    manchas = 0
    hojas = []
    for n, (ruta, (_, _, palabras)) in enumerate(zip(imagenes, paginas), start=1):
        hoja = Image.open(ruta).convert("RGB")
        lapiz = ImageDraw.Draw(hoja)

        cajas = [
            (x0 - MARGEN, y0 - MARGEN, x1 + MARGEN, y1 + MARGEN)
            for texto, x0, y0, x1, y1 in palabras
            if any(p.search(texto) for p in PATRONES)
        ]
        cajas += doc["cajas"].get(n, [])

        for x0, y0, x1, y1 in cajas:
            lapiz.rectangle(
                [x0 * escala, y0 * escala, x1 * escala, y1 * escala], fill=TINTA
            )
            manchas += 1
        hojas.append(hoja)

    hojas[0].save(destino, "PDF", resolution=DPI, save_all=True, append_images=hojas[1:])
    for ruta in imagenes:
        ruta.unlink()

    print(f"✓ {destino.name}: {manchas} zona(s) tapada(s), {len(hojas)} pág.")
    return manchas


def main() -> int:
    if not ORIGEN.is_dir():
        print(f"No existe {ORIGEN}", file=sys.stderr)
        return 1

    for doc in DOCUMENTOS:
        tapar(doc)

    print("\nComprobación: en los PDF publicados no debe quedar ni un número de documento.")
    for doc in DOCUMENTOS:
        pdf = DESTINO / doc["destino"]
        if not pdf.exists():
            continue
        texto = subprocess.run(
            ["pdftotext", str(pdf), "-"], capture_output=True, text=True
        ).stdout
        restos = re.findall(r"[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[0-9A-F]{32}", texto)
        print(f"  {pdf.name}: {'⚠ ' + ', '.join(restos) if restos else 'limpio'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
