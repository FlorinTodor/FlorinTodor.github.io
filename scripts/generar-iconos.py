#!/usr/bin/env python3
"""
Genera los iconos del sitio a partir de public/icon/512.png.

Google descarta el favicon y enseña el globo genérico cuando el que declara la
página no es un cuadrado múltiplo de 48 px. El .ico llevaba sólo 16 y 32, así
que aquí se rehace incluyendo 48 y se sacan además los PNG de 96 y 192 que se
declaran en el <head> de Base.astro.

    python3 scripts/generar-iconos.py
"""

from pathlib import Path

from PIL import Image

ICONOS = Path(__file__).resolve().parent.parent / "public" / "icon"
RAIZ = ICONOS.parent

# Múltiplos de 48: es lo que pide Google. El 16 y el 32 se quedan dentro del
# .ico porque son los que usa la pestaña del navegador.
ICO = [16, 32, 48, 96, 192]
PNG = [48, 96, 192]


def main() -> None:
    origen = Image.open(ICONOS / "512.png").convert("RGBA")

    for lado in PNG:
        destino = ICONOS / f"{lado}.png"
        origen.resize((lado, lado), Image.LANCZOS).save(destino, optimize=True)
        print(f"  {destino.relative_to(RAIZ.parent)}")

    ico = RAIZ / "favicon.ico"
    origen.save(ico, format="ICO", sizes=[(n, n) for n in ICO])
    print(f"  {ico.relative_to(RAIZ.parent)}  ({', '.join(map(str, ICO))})")


if __name__ == "__main__":
    main()
