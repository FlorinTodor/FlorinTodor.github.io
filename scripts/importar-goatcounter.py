#!/usr/bin/env python3
"""Pasa las visitas de GoatCounter a la base de datos de Cloudflare (D1).

Saca la exportación con el mismo código que scripts/visitas.py y escribe un SQL
que borra lo importado antes (origen = 'goatcounter') y lo vuelve a meter, así
que se puede repetir sin duplicar. Con --hasta sólo entra lo anterior a esa
fecha: lo de después ya lo recoge la web por su cuenta.

    python3 scripts/importar-goatcounter.py --hasta 2026-11-15T10:00:00Z
    npx wrangler d1 execute visitas-portafolio --remote --file .visitas/importar-goatcounter.sql

El SQL lleva datos de visitantes: se escribe en .visitas/, que está fuera de git.
"""
import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from visitas import FalloExportacion, exportar, leer_csv, leer_token  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / '.visitas/importar-goatcounter.sql'
COLUMNAS = ('momento', 'host', 'sesion', 'ruta', 'titulo', 'evento', 'referer', 'esquema', 'navegador',
            'sistema', 'ua', 'pantalla', 'ubicacion', 'region', 'segundos', 'bot', 'origen')


def sql(valor):
    if valor is None:
        return 'NULL'
    if isinstance(valor, int):
        return str(valor)
    return "'" + str(valor).replace("'", "''") + "'"


def fila(v):
    momento = v['cuando'].astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    return (momento, 'florintodor.dev', v['Session'] or f"gc-{momento}", v['Path'], v['Title'],
            1 if v['Event'].lower() in ('true', 't', '1') else 0, v['Referrer'], v['Referrer scheme'],
            v['Browser'], v['System'], v.get('UserAgent', ''), v['Screen size'], v['Location'], '',
            None, 0, 'goatcounter')


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument('--csv', type=Path, help='usa una exportación bajada a mano (.csv o .csv.gz)')
    p.add_argument('--hasta', help='sólo lo anterior a este momento (ISO 8601, p. ej. 2026-11-15T10:00:00Z)')
    a = p.parse_args()

    try:
        visitas = leer_csv(a.csv.read_bytes() if a.csv else exportar(leer_token()))
    except FalloExportacion as ex:
        sys.exit(str(ex))
    if a.hasta:
        corte = datetime.fromisoformat(a.hasta.replace('Z', '+00:00'))
        visitas = [v for v in visitas if v['cuando'] < corte]

    lineas = ["DELETE FROM visitas WHERE origen = 'goatcounter';"]
    filas = [fila(v) for v in visitas]
    for i in range(0, len(filas), 200):
        valores = ',\n'.join('(' + ', '.join(sql(x) for x in f) + ')' for f in filas[i:i + 200])
        lineas.append(f"INSERT INTO visitas ({', '.join(COLUMNAS)}) VALUES\n{valores};")
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text('\n'.join(lineas) + '\n')
    print(f'{len(filas)} visitas de GoatCounter{f" anteriores a {a.hasta}" if a.hasta else ""}. SQL: {SALIDA}')
    print('Para subirlas: npx wrangler d1 execute visitas-portafolio --remote --file .visitas/importar-goatcounter.sql')


if __name__ == '__main__':
    main()
