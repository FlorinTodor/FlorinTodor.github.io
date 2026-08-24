#!/usr/bin/env python3
"""Genera la miniatura de cada certificado a partir de su PDF.

Recorre public/certificaciones/, y por cada `<id>.pdf` que todavía no tenga
`<id>.jpg` renderiza la primera página. Así basta con soltar el PDF: la portada
de la tarjeta sale sola.

Necesita poppler-utils:  sudo apt install poppler-utils
"""
import subprocess
import sys
from pathlib import Path

CARPETA = Path(__file__).resolve().parent.parent / "public" / "certificaciones"
ANCHO = 600  # se muestran a ~300 px; 600 cubre las pantallas de densidad doble

def main() -> int:
    if not CARPETA.is_dir():
        print(f"No existe {CARPETA}", file=sys.stderr)
        return 1

    pdfs = sorted(CARPETA.glob("*.pdf"))
    if not pdfs:
        print(f"No hay ningún PDF en {CARPETA}. Copia ahí los certificados.")
        return 0

    hechas = 0
    for pdf in pdfs:
        jpg = pdf.with_suffix(".jpg")
        # Puede haber ya una portada mejor que la primera página: la insignia de
        # Credly, por ejemplo. Cualquier imagen con ese nombre manda sobre esto.
        ya = [pdf.with_suffix(e) for e in (".jpg", ".jpeg", ".png", ".webp")]
        if any(f.exists() for f in ya):
            existente = next(f for f in ya if f.exists())
            print(f"· {existente.name} ya existe, no lo toco")
            continue
        # pdftoppm añade el sufijo solo; -singlefile lo evita.
        subprocess.run(
            ["pdftoppm", "-jpeg", "-r", "150", "-scale-to-x", str(ANCHO),
             "-scale-to-y", "-1", "-singlefile", str(pdf), str(pdf.with_suffix(""))],
            check=True,
        )
        print(f"✓ {jpg.name} ({jpg.stat().st_size // 1024} KB)")
        hechas += 1

    print(f"\n{hechas} miniatura(s) nueva(s).")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
