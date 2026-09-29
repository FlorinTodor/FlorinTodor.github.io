#!/usr/bin/env python3
"""Enseña las visitas de GoatCounter una a una: cuándo, de dónde y qué vio.

El panel de GoatCounter sólo da totales. Este script pide a su API la
exportación de visitas individuales y la convierte en una página.

En el despliegue (cada 12 horas y en cada push) se publica en /visitas/ cifrada
con VISITAS_CLAVE: el repo y la web son públicos y son datos de los visitantes.
La página se descifra en el navegador. El CSV sólo existe en memoria mientras
corre el script: no se guarda en el repo ni en el runner.

Requisitos en GoatCounter:
  - Settings > Data collection > "Individual pageviews" marcado. Lo anterior a
    marcarlo no se recupera.
  - Un token (menú de usuario > API) con permiso de exportación, en
    GOATCOUNTER_TOKEN o en ~/.config/goatcounter/token.

    python3 scripts/visitas.py                         # en local, sin cifrar
    python3 scripts/visitas.py --csv export.csv.gz     # exportación bajada a mano
    VISITAS_CLAVE=... python3 scripts/visitas.py --publicar dist/visitas/index.html
"""
import argparse
import base64
import csv
import gzip
import html
import io
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

RAIZ = Path(__file__).resolve().parent.parent
LOCAL = RAIZ / '.visitas/visitas.html'
TOKEN = Path.home() / '.config/goatcounter/token'
API = 'https://florintodor.goatcounter.com/api/v0'
DOMINIO = 'florintodor.dev'
ZONA = ZoneInfo('Europe/Madrid')
ITERACIONES = 310_000


class FalloExportacion(Exception):
    pass


def leer_token():
    token = os.environ.get('GOATCOUNTER_TOKEN') or (TOKEN.read_text().strip() if TOKEN.exists() else '')
    if not token:
        raise FalloExportacion(f'falta el token de GoatCounter (GOATCOUNTER_TOKEN o {TOKEN})')
    return token


def pedir(token, metodo, ruta, cuerpo=None, tolerar=()):
    """Llama a la API. Los códigos de `tolerar` devuelven (código, None) en vez de fallar."""
    req = urllib.request.Request(
        API + ruta, method=metodo,
        data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        if e.code in tolerar:
            return e.code, None
        detalle = e.read().decode(errors='replace')[:300]
        raise FalloExportacion(f'GoatCounter respondió {e.code} a {metodo} {ruta}: {detalle}') from None


def exportar(token):
    """Pide la exportación completa y devuelve el CSV, sin escribirlo en disco."""
    _, crudo = pedir(token, 'POST', '/export', {'format': 'csv'})
    id_ = json.loads(crudo)['id']
    # Recién creada puede tardar en aparecer (404) y en terminar (202).
    for _ in range(90):
        codigo, crudo = pedir(token, 'GET', f'/export/{id_}/download', tolerar=(404,))
        if codigo == 200:
            return crudo
        time.sleep(2)
    raise FalloExportacion(f'la exportación {id_} no terminó en 3 minutos')


def leer_csv(crudo):
    if crudo[:2] == b'\x1f\x8b':
        crudo = gzip.decompress(crudo)
    filas = list(csv.reader(io.StringIO(crudo.decode('utf-8'))))
    if not filas:
        return []
    # La cabecera lleva la versión pegada a la primera columna ("2Path").
    cabecera = [filas[0][0].lstrip('0123456789')] + filas[0][1:]
    visitas = []
    for f in filas[1:]:
        v = dict(zip(cabecera, f))
        if v.get('Bot') not in ('', '0'):
            continue
        v['cuando'] = datetime.fromisoformat(v['Date'].replace('Z', '+00:00')).astimezone(ZONA)
        visitas.append(v)
    return visitas


def procedencia(fila):
    """Devuelve (nombre para mostrar, tipo) de dónde venía la visita."""
    ref, esquema = fila['Referrer'].strip(), fila['Referrer scheme']
    if not ref:
        return 'Directo o desconocido', 'directo'
    if esquema == 'c':
        return f'Campaña: {ref}', 'campaña'
    if esquema in ('g', 'o'):
        return ref, 'buscador' if ref.lower() in ('google', 'bing', 'duckduckgo', 'yahoo', 'ecosia') else 'otro'
    host = urlsplit(ref if '//' in ref else '//' + ref).hostname or ref
    host = host.removeprefix('www.')
    if host.endswith(DOMINIO):
        return 'Tu propia web', 'interno'
    for clave, nombre, tipo in (('linkedin', 'LinkedIn', 'red'), ('lnkd.in', 'LinkedIn', 'red'),
                                ('github', 'GitHub', 'red'), ('google', 'Google', 'buscador'),
                                ('bing', 'Bing', 'buscador'), ('duckduckgo', 'DuckDuckGo', 'buscador'),
                                ('t.co', 'X / Twitter', 'red'), ('twitter', 'X / Twitter', 'red'),
                                ('facebook', 'Facebook', 'red'), ('instagram', 'Instagram', 'red'),
                                ('whatsapp', 'WhatsApp', 'red'), ('reddit', 'Reddit', 'red')):
        if clave in host:
            return nombre, tipo
    return host, 'otro'


def bandera(loc):
    pais = loc.split('-')[0].upper()
    if len(pais) != 2 or not pais.isalpha():
        return ''
    return ''.join(chr(0x1F1E6 + ord(c) - 65) for c in pais)


def sesiones(visitas):
    grupos = defaultdict(list)
    for i, v in enumerate(visitas):
        grupos[v['Session'] or f'sin-sesion-{i}'].append(v)
    lista = [sorted(g, key=lambda v: v['cuando']) for g in grupos.values()]
    return sorted(lista, key=lambda g: g[0]['cuando'], reverse=True)


def e(texto):
    return html.escape(str(texto))


ESTILO = '''
:root { --fondo:#02162b; --panel:#0a2743; --borde:#16456f; --texto:#e8f1f8; --suave:#9fb8cc; --tenue:#7391ab;
  --verde:#3ddc84; --ambar:#f0b45f; --azul:#5aa9ff; --rojo:#ff7b72; }
* { box-sizing:border-box }
body { margin:0; background:var(--fondo); color:var(--texto); font:15px/1.5 Inter, ui-sans-serif, system-ui, sans-serif }
main { max-width:1200px; margin:0 auto; padding:32px 16px 64px }
h1 { margin:0 0 4px; font-size:26px } h2 { font-size:18px; margin:36px 0 12px } h3 { font-size:14px; color:var(--suave); margin:0 0 10px; font-weight:600 }
.sub { color:var(--tenue); margin:0 0 24px } .nota { color:var(--tenue); font-size:13px; margin:8px 0 0 }
.aviso { background:rgba(255,123,114,.12); border:1px solid var(--rojo); color:var(--rojo); border-radius:14px; padding:12px 16px; margin-bottom:24px }
.cifras { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px }
.cifra, .bloque, .sesion { background:var(--panel); border:1px solid var(--borde); border-radius:14px; padding:16px; min-width:0 }
.cifra b { display:block; font-size:28px; color:var(--verde); line-height:1.2 } .cifra span { color:var(--suave); font-size:14px }
.rejilla { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px }
.bloque ul { list-style:none; margin:0; padding:0 }
.bloque li { display:grid; grid-template-columns:minmax(0,1.4fr) 1fr 40px; gap:10px; align-items:center; padding:3px 0; font-size:14px }
.et { overflow:hidden; text-overflow:ellipsis; white-space:nowrap } .num { text-align:right; color:var(--suave) }
.barra { height:8px; background:#062038; border-radius:4px; overflow:hidden } .barra i { display:block; height:100%; background:var(--verde) }
.columnas { display:flex; align-items:flex-end; gap:3px; height:120px; padding-top:18px }
.columnas div { flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; height:100%; min-width:0 }
.columnas i { display:block; width:100%; background:var(--verde); border-radius:3px 3px 0 0; min-height:1px }
.columnas small { font-size:10px; color:var(--tenue); margin-top:4px; white-space:nowrap }
.columnas b { font-size:10px; color:var(--suave); font-weight:500 }
.vacio { color:var(--tenue) }
.filtro { width:100%; padding:10px 12px; border-radius:10px; border:1px solid var(--borde); background:var(--panel); color:var(--texto); font:inherit; margin-bottom:12px }
.sesiones { display:grid; gap:12px }
.sesion header { display:flex; flex-wrap:wrap; gap:8px 10px; align-items:center }
.sesion header time { font-weight:600 }
.chip { padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; background:#16456f; color:var(--suave) }
.origen.red { background:rgba(90,169,255,.18); color:var(--azul) }
.origen.buscador { background:rgba(61,220,132,.15); color:var(--verde) }
.origen.campaña, .origen.otro { background:rgba(240,180,95,.15); color:var(--ambar) }
.chip.cv { background:rgba(240,180,95,.15); color:var(--ambar) }
.ref { margin:6px 0 0; color:var(--tenue); font-size:13px; word-break:break-all }
.sesion ol { list-style:none; margin:12px 0 10px; padding:0 0 0 14px; border-left:2px solid var(--borde) }
.sesion ol li { display:flex; flex-wrap:wrap; gap:2px 10px; padding:3px 0; align-items:baseline }
.sesion ol time { color:var(--tenue); font-variant-numeric:tabular-nums }
.sesion code { color:var(--verde); font-family:ui-monospace, Menlo, monospace; word-break:break-all }
.sesion li.evento code { color:var(--ambar) }
.titulo { color:var(--suave) } .estancia { color:var(--tenue); font-size:12px }
.ficha { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:6px 16px; margin:0; font-size:13px }
.ficha div { min-width:0 } .ficha dt { color:var(--tenue) } .ficha dd { margin:0; overflow-wrap:anywhere }
.relacion { margin:10px 0 0; font-size:13px; color:var(--azul) }
form { max-width:360px; margin:18vh auto 0; display:grid; gap:12px }
input[type=password] { padding:10px 12px; border-radius:10px; border:1px solid var(--borde); background:var(--panel); color:var(--texto); font:inherit }
button { padding:10px 12px; border-radius:10px; border:0; background:var(--verde); color:#02162b; font:inherit; font-weight:600; cursor:pointer }
label { color:var(--suave); font-size:14px } .error { color:var(--rojo); min-height:1.5em; margin:0 }
'''

ESQUEMAS = {'h': 'enlace (cabecera Referer)', 'g': 'buscador o app (deducido)', 'c': 'campaña (utm_*)', 'o': 'otro (app)'}
DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']


def pagina(cuerpo):
    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Visitas del portafolio</title>
<style>{ESTILO}</style></head><body><main>
{cuerpo}
</main></body></html>
'''


# Los eventos que manda la web (src/layouts/Base.astro): el path es
# "<tipo>: <página desde la que se hizo clic>" y el título, el enlace.
EVENTOS = {'cv': 'descarga del CV', 'correo': 'clic en el correo', 'linkedin': 'clic en LinkedIn',
           'github': 'clic en GitHub', 'memoria': 'descarga de la memoria del TFG'}
CONTACTO = ('correo', 'linkedin', 'github')
# Dos vistas de la misma página con menos de esto entre ellas son una recarga.
RECARGA = 10


def evento(v):
    """(tipo, página desde la que se hizo) si la fila es un evento; None si es una página."""
    tipo, sep, desde = v['Path'].partition(': ')
    if sep and (tipo in EVENTOS or v['Event'].lower() in ('true', 't', '1')):
        return tipo, desde
    return None


def texto_evento(v):
    tipo, desde = evento(v)
    nombre = EVENTOS.get(tipo, tipo)
    if tipo == 'cv':
        nombre += ' en inglés' if v['Title'].endswith('_en.pdf') else ' en español'
    return f'{nombre} desde {desde}'


def pantalla(v):
    """(ancho, alto, densidad) a partir de "1920,1080,1"; 0 donde falta el dato."""
    partes = (v.get('Screen size') or '').split(',') + ['0', '0', '0']
    try:
        ancho, alto, densidad = (float(x or 0) for x in partes[:3])
    except ValueError:
        return None
    return (int(ancho), int(alto), densidad) if ancho else None


def texto_pantalla(v):
    p = pantalla(v)
    if not p:
        return 'desconocida'
    ancho, alto, densidad = p
    texto = f'{ancho}×{alto} px' if alto else f'{ancho} px de ancho'
    return texto + (f', densidad {densidad:g}' if densidad else '')


def dispositivo(v):
    p = pantalla(v)
    if not p:
        return 'desconocido'
    ancho = min(p[0], p[1] or p[0]) if 'Android' in v['System'] or 'iOS' in v['System'] else p[0]
    return 'móvil' if ancho < 600 else 'tablet' if ancho < 1024 else 'ordenador'


def texto_sistema(v):
    sistema = v['System'] or 'desconocido'
    # Chrome recorta el User-Agent y en Android siempre dice "Android 10".
    if sistema == 'Android 10' and v['Browser'].startswith('Chrome'):
        return 'Android (Chrome no dice la versión real)'
    return sistema


def idioma(path):
    return 'inglés' if path == '/en' or path.startswith('/en/') else 'español'


def duracion(segundos):
    segundos = int(segundos)
    if segundos < 60:
        return f'{segundos} s'
    m, s = divmod(segundos, 60)
    if m < 60:
        return f'{m} min {s:02d} s'
    h, m = divmod(m, 60)
    return f'{h} h {m:02d} min'


def huella(v):
    """Lo que tienen en común dos sesiones del mismo dispositivo."""
    return (v['Browser'], v['System'], v['Screen size'], v['Location'])


def pasos_de(g):
    """Las filas de una sesión con las recargas seguidas juntadas: [(fila, veces)]."""
    pasos = []
    for v in g:
        if (pasos and not evento(v) and not evento(pasos[-1][0]) and v['Path'] == pasos[-1][0]['Path']
                and (v['cuando'] - pasos[-1][0]['cuando']).total_seconds() < RECARGA):
            pasos[-1][1] += 1
        else:
            pasos.append([v, 1])
    return pasos


def origen_sesion(g):
    """La procedencia de la visita: la de su primera página."""
    origen, tipo = procedencia(g[0])
    if tipo == 'interno':
        # Si la primera página registrada ya venía de la web, el principio de
        # la visita no se contó (bloqueador, o antes de activar la recogida).
        return 'Sin registrar (ya estaba en la web)', 'interno'
    return origen, tipo


def informe(visitas, fallo=None):
    grupos = sesiones(visitas)
    pasos = {id(g): pasos_de(g) for g in grupos}
    paginas = [v for g in grupos for v, _ in pasos[id(g)] if not evento(v)]
    eventos = [v for v in visitas if evento(v)]
    recargas = sum(n - 1 for g in grupos for _, n in pasos[id(g)])
    n_paginas = lambda g: sum(1 for v, _ in pasos[id(g)] if not evento(v))
    duraciones = [(g[-1]['cuando'] - g[0]['cuando']).total_seconds() for g in grupos]
    rebotes = sum(1 for g in grupos if n_paginas(g) <= 1)
    por_huella = defaultdict(list)
    for g in grupos:
        por_huella[huella(g[0])].append(g)

    def barras(contador, fmt=e, n=10):
        total = max(contador.values(), default=1)
        return '<ul>' + (''.join(
            f'<li><span class="et" title="{e(k)}">{fmt(k)}</span><span class="barra"><i style="width:{100 * c / total:.0f}%"></i></span>'
            f'<span class="num">{c}</span></li>' for k, c in contador.most_common(n)) or '<li class="vacio">Nada todavía</li>') + '</ul>'

    def columnas(pares):
        total = max((c for _, c in pares), default=0) or 1
        return '<div class="columnas">' + ''.join(
            f'<div><b>{c or ""}</b><i style="height:{100 * c / total:.0f}%"></i><small>{e(et)}</small></div>' for et, c in pares) + '</div>'

    def bloque(titulo, contenido, nota=''):
        return f'<div class="bloque"><h3>{titulo}</h3>{contenido}{f"<p class=nota>{nota}</p>" if nota else ""}</div>'

    codigo = lambda k: f'<code>{e(k)}</code>'
    pais = lambda k: f'{bandera(k)} <span data-pais="{e(k)}">{e(k)}</span>' if k else 'desconocido'

    # --- Resúmenes ---
    if visitas:
        primero = min(v['cuando'] for v in visitas).date()
        ultimo = max(v['cuando'] for v in visitas).date()
        dias = [primero.fromordinal(d) for d in range(primero.toordinal(), ultimo.toordinal() + 1)][-31:]
    else:
        dias = []
    por_dia = Counter(g[0]['cuando'].date() for g in grupos)
    por_hora = Counter(g[0]['cuando'].hour for g in grupos)
    por_semana = Counter(g[0]['cuando'].weekday() for g in grupos)

    resumen = f'''
<section class="cifras">
  <div class="cifra"><b>{len(grupos)}</b><span>visitas (sesiones)</span></div>
  <div class="cifra"><b>{len(paginas)}</b><span>páginas vistas</span></div>
  <div class="cifra"><b>{len(paginas) / len(grupos) if grupos else 0:.1f}</b><span>páginas por visita</span></div>
  <div class="cifra"><b>{duracion(sum(duraciones) / len(duraciones)) if duraciones else '-'}</b><span>duración media</span></div>
  <div class="cifra"><b>{100 * rebotes / len(grupos) if grupos else 0:.0f}%</b><span>se van tras una página</span></div>
  <div class="cifra"><b>{sum(1 for v in eventos if evento(v)[0] == 'cv')}</b><span>descargas del CV</span></div>
  <div class="cifra"><b>{sum(1 for v in eventos if evento(v)[0] in CONTACTO)}</b><span>clics de contacto (correo, LinkedIn, GitHub)</span></div>
  <div class="cifra"><b>{sum(1 for g in grupos if origen_sesion(g)[0] == 'LinkedIn')}</b><span>llegan desde LinkedIn</span></div>
  <div class="cifra"><b>{sum(1 for gs in por_huella.values() if len(gs) > 1)}</b><span>dispositivos que repiten</span></div>
</section>

<h2>Cuándo</h2>
<div class="rejilla">
  {bloque('Visitas por día', columnas([(f'{d:%d/%m}', por_dia[d]) for d in dias]) if dias else '<p class="vacio">Nada todavía</p>', 'Últimos 31 días con datos.')}
  {bloque('A qué hora llegan', columnas([(f'{h}', por_hora[h]) for h in range(24)]), 'Hora de Madrid.')}
  {bloque('Qué día de la semana', columnas([(d[:3], por_semana[i]) for i, d in enumerate(DIAS_SEMANA)]))}
</div>

<h2>De dónde</h2>
<div class="rejilla">
  {bloque('Procedencia', barras(Counter(origen_sesion(g)[0] for g in grupos)), 'La de la primera página de cada visita.')}
  {bloque('Enlace exacto de procedencia', barras(Counter(g[0]['Referrer'] for g in grupos if g[0]['Referrer'] and origen_sesion(g)[1] != 'interno'), codigo))}
  {bloque('Tipo de procedencia', barras(Counter(ESQUEMAS.get(g[0]['Referrer scheme'], 'sin procedencia') for g in grupos if origen_sesion(g)[1] != 'interno')))}
  {bloque('País', barras(Counter(v['Location'].split('-')[0] for v in (g[0] for g in grupos)), pais))}
  {bloque('Región', barras(Counter(g[0]['Location'] for g in grupos if '-' in g[0]['Location']), pais), 'Sólo de los países que tenga marcados GoatCounter en Settings > Region.')}
</div>

<h2>Qué ven y qué hacen</h2>
<div class="rejilla">
  {bloque('Páginas más vistas', barras(Counter(v['Path'] for v in paginas), codigo))}
  {bloque('Página de entrada', barras(Counter(next((v['Path'] for v, _ in pasos[id(g)] if not evento(v)), '-') for g in grupos), codigo))}
  {bloque('Última página antes de irse', barras(Counter(next((v['Path'] for v, _ in reversed(pasos[id(g)]) if not evento(v)), '-') for g in grupos), codigo))}
  {bloque('Idioma del sitio', barras(Counter(idioma(v['Path']) for v in paginas)))}
  {bloque('Clics y descargas', barras(Counter(EVENTOS.get(evento(v)[0], evento(v)[0]) for v in eventos)))}
  {bloque('Desde qué página hacen clic', barras(Counter(evento(v)[1] for v in eventos), codigo))}
  {bloque('CV descargado', barras(Counter(f"{'inglés' if v['Title'].endswith('_en.pdf') else 'español'}, desde {evento(v)[1]}" for v in eventos if evento(v)[0] == 'cv')))}
  {bloque('Páginas por visita', barras(Counter(f"{n_paginas(g)} página(s)" for g in grupos)))}
</div>

<h2>Con qué</h2>
<div class="rejilla">
  {bloque('Dispositivo', barras(Counter(dispositivo(g[0]) for g in grupos)), 'Deducido del tamaño de pantalla.')}
  {bloque('Navegador', barras(Counter(g[0]['Browser'] or 'desconocido' for g in grupos)))}
  {bloque('Sistema', barras(Counter(texto_sistema(g[0]) for g in grupos)))}
  {bloque('Pantalla', barras(Counter(texto_pantalla(g[0]) for g in grupos)))}
</div>'''

    # --- Visita por visita ---
    tarjetas = []
    for g in grupos:
        primera, ultima = g[0], g[-1]
        origen, tipo = origen_sesion(g)
        lista = pasos[id(g)]
        filas = []
        for i, (v, veces) in enumerate(lista):
            siguiente = lista[i + 1][0]['cuando'] if i + 1 < len(lista) else None
            estancia = f'<span class="estancia">{duracion((siguiente - v["cuando"]).total_seconds())} hasta lo siguiente</span>' if siguiente else ''
            repetida = f'<span class="estancia">(recargada, ×{veces})</span>' if veces > 1 else ''
            if evento(v):
                texto = f'<code>⬇ {e(texto_evento(v))}</code><span class="titulo">{e(v["Title"])}</span>'
            else:
                texto = f'<code>{e(v["Path"])}</code><span class="titulo">{e(v["Title"])}</span>'
            filas.append(f'<li class="{"evento" if evento(v) else ""}"><time>{v["cuando"]:%H:%M:%S}</time>{texto}{repetida}{estancia}</li>')

        evs = [v for v in g if evento(v)]
        p = pantalla(primera)
        ficha = [
            ('Llegada', f'{primera["cuando"]:%d/%m/%Y %H:%M:%S} ({DIAS_SEMANA[primera["cuando"].weekday()]})'),
            ('Última acción', f'{ultima["cuando"]:%H:%M:%S}'),
            ('Duración', duracion((ultima['cuando'] - primera['cuando']).total_seconds()) if len(g) > 1 else 'una sola página'),
            ('Páginas', f'{n_paginas(g)}' + (f' ({sum(n - 1 for _, n in lista)} recargas aparte)' if any(n > 1 for _, n in lista) else '')),
            ('Clics y descargas', e(', '.join(texto_evento(v) for v in evs)) if evs else 'ninguno'),
            ('Procedencia', e(origen)),
            ('Enlace de procedencia', f'<code>{e(primera["Referrer"])}</code>' if primera['Referrer'] else 'ninguno (directo, app o navegador que no lo envía)'),
            ('Tipo de procedencia', 'la primera página no se registró' if tipo == 'interno' else ESQUEMAS.get(primera['Referrer scheme'], 'sin procedencia')),
            ('País / región', pais(primera['Location'])),
            ('Idioma del sitio', ', '.join(sorted({idioma(v['Path']) for v in g if not evento(v)})) or '-'),
            ('Navegador', e(primera['Browser'] or 'desconocido')),
            ('Sistema', e(texto_sistema(primera))),
            ('Dispositivo', dispositivo(primera)),
            ('Pantalla', texto_pantalla(primera)),
        ]
        if p and p[1] and p[2]:
            ficha.append(('Resolución real', f'{round(p[0] * p[2])}×{round(p[1] * p[2])} px'))
        if primera.get('UserAgent'):
            ficha.append(('User-Agent', f'<code>{e(primera["UserAgent"])}</code>'))
        ficha.append(('Sesión', f'<code>{e(primera["Session"] or "sin sesión")}</code>'))
        # Los cambios dentro de la misma sesión (p. ej. girar el móvil) también se ven.
        for campo, nombre, fmt in (('Screen size', 'Otras pantallas', lambda x: texto_pantalla({'Screen size': x})),
                                   ('Location', 'Otras ubicaciones', str), ('Browser', 'Otros navegadores', str)):
            otros = sorted({fmt(v[campo]) for v in g if v[campo] and v[campo] != primera[campo]})
            if otros:
                ficha.append((nombre, e(', '.join(otros))))

        mismas = [x for x in por_huella[huella(primera)] if x is not g]
        relacion = ''
        if mismas:
            fechas = ', '.join(f'{x[0]["cuando"]:%d/%m %H:%M}' for x in sorted(mismas, key=lambda x: x[0]['cuando']))
            relacion = (f'<p class="relacion">Mismo navegador, sistema, pantalla y país que las visitas del {fechas}: '
                        f'probablemente la misma persona volviendo.</p>')

        chips_eventos = ''.join(f'<span class="chip cv">{e(EVENTOS.get(t, t))}</span>'
                                for t in dict.fromkeys(evento(v)[0] for v in evs))
        buscar = ' '.join([origen, primera['Referrer'], primera['Location'], primera['Browser'], primera['System'],
                           dispositivo(primera), f'{primera["cuando"]:%d/%m/%Y}'] + [v['Path'] for v in g]
                          + [texto_evento(v) for v in evs]).lower()
        tarjetas.append(f'''
      <article class="sesion" data-buscar="{e(buscar)}">
        <header>
          <time>{primera["cuando"]:%d/%m/%Y %H:%M}</time>
          <span class="chip origen {tipo}">{e(origen)}</span>
          <span class="chip">{bandera(primera["Location"])} <span data-pais="{e(primera["Location"])}">{e(primera["Location"] or "país desconocido")}</span></span>
          <span class="chip">{dispositivo(primera)}</span>
          {chips_eventos}
          {'<span class="chip">repite</span>' if mismas else ''}
        </header>
        <ol>{''.join(filas)}</ol>
        <dl class="ficha">{''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in ficha)}</dl>
        {relacion}
      </article>''')

    generado = datetime.now(ZONA)
    return pagina(f'''
<h1>Visitas del portafolio</h1>
<p class="sub">Actualizado el {generado:%d/%m/%Y a las %H:%M} (hora de Madrid) · {len(visitas)} registros{f" · {recargas} recargas juntadas" if recargas else ""} · bots excluidos</p>
{f'<p class="aviso">No se pudieron descargar las visitas: {e(fallo)}</p>' if fallo else ''}
{resumen}

<h2>Visita por visita</h2>
<input class="filtro" id="filtro" type="search" placeholder="Filtrar: linkedin, España, móvil, /blog, cv, 29/09/2026...">
<section class="sesiones">{''.join(tarjetas) or '<p class="vacio">Todavía no hay visitas guardadas.</p>'}</section>
<p class="nota">Una visita es una sesión de GoatCounter: el mismo navegador durante un máximo de 8 horas. GoatCounter no guarda
IP ni cookies, así que no se puede saber con certeza si dos visitas son de la misma persona; "repite" sólo indica que
coinciden navegador, sistema, pantalla y país. Dos vistas de la misma página con menos de {RECARGA} s entre ellas cuentan
como una (recarga). Quien navega con bloqueador (Brave, uBlock, DNS con filtro) no aparece.</p>
<script>
const nombres = new Intl.DisplayNames(['es'], {{type: 'region'}});
document.querySelectorAll('[data-pais]').forEach(el => {{
  const [p, r] = el.dataset.pais.split('-');
  try {{ if (p) el.textContent = nombres.of(p) + (r ? ` (${{r}})` : ''); }} catch {{}}
}});
document.querySelectorAll('.sesion').forEach(s => {{
  s.dataset.buscar += ' ' + s.textContent.toLowerCase();
}});
document.getElementById('filtro').addEventListener('input', ev => {{
  const q = ev.target.value.toLowerCase().trim();
  document.querySelectorAll('.sesion').forEach(s => {{ s.hidden = q && !s.dataset.buscar.includes(q); }});
}});
</script>''')


def cifrar(contenido, clave):
    """Envuelve la página en otra que la descifra en el navegador (AES-GCM, PBKDF2)."""
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

    sal, iv = secrets.token_bytes(16), secrets.token_bytes(12)
    llave = PBKDF2HMAC(hashes.SHA256(), 32, sal, ITERACIONES).derive(clave.encode())
    cifrado = AESGCM(llave).encrypt(iv, contenido.encode(), None)
    b64 = lambda b: base64.b64encode(b).decode()
    datos = json.dumps({'sal': b64(sal), 'iv': b64(iv), 'datos': b64(cifrado), 'it': ITERACIONES})
    return pagina(f'''
<form id="f">
  <h1>Visitas</h1>
  <input type="password" id="c" placeholder="Contraseña" autocomplete="current-password" autofocus>
  <label><input type="checkbox" id="r"> Recordar en este navegador</label>
  <button>Entrar</button>
  <p class="error" id="err"></p>
</form>
<script>
const D = {datos};
const bin = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function abrir(clave) {{
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey']);
  const llave = await crypto.subtle.deriveKey({{name: 'PBKDF2', salt: bin(D.sal), iterations: D.it, hash: 'SHA-256'}},
    base, {{name: 'AES-GCM', length: 256}}, false, ['decrypt']);
  const claro = await crypto.subtle.decrypt({{name: 'AES-GCM', iv: bin(D.iv)}}, llave, bin(D.datos));
  document.open(); document.write(new TextDecoder().decode(claro)); document.close();
}}
const K = 'visitas-clave';
let guardada = null;
try {{ guardada = localStorage.getItem(K); }} catch {{}}
if (guardada) abrir(guardada).catch(() => {{ try {{ localStorage.removeItem(K); }} catch {{}} }});
document.getElementById('f').addEventListener('submit', async ev => {{
  ev.preventDefault();
  const clave = document.getElementById('c').value;
  try {{
    if (document.getElementById('r').checked) {{ try {{ localStorage.setItem(K, clave); }} catch {{}} }}
    await abrir(clave);
  }} catch {{
    try {{ localStorage.removeItem(K); }} catch {{}}
    document.getElementById('err').textContent = 'Contraseña incorrecta';
  }}
}});
</script>''')


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument('--csv', type=Path, help='usa una exportación bajada a mano (.csv o .csv.gz)')
    p.add_argument('--publicar', type=Path, metavar='SALIDA',
                   help='escribe la página cifrada con VISITAS_CLAVE en SALIDA (para el despliegue)')
    p.add_argument('--no-abrir', action='store_true', help='no abre el navegador')
    a = p.parse_args()

    clave = os.environ.get('VISITAS_CLAVE', '')
    if a.publicar and not clave:
        # Sin clave no se publica nada: la página quedaría a la vista de todos.
        # Tampoco se corta el despliegue del sitio por esto.
        print('::warning::Falta VISITAS_CLAVE: no se publica la página de visitas.')
        return

    fallo = None
    try:
        visitas = leer_csv(a.csv.read_bytes() if a.csv else exportar(leer_token()))
    except FalloExportacion as ex:
        if not a.publicar:
            sys.exit(str(ex))
        # En el despliegue no se corta la publicación del sitio: la página
        # sale igual, con el aviso de qué falló.
        print(f'::warning::Visitas: {ex}')
        visitas, fallo = [], str(ex)

    contenido = informe(visitas, fallo)
    salida = a.publicar or LOCAL
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(cifrar(contenido, clave) if a.publicar else contenido)
    print(f'{len(visitas)} visitas. Página: {salida}')
    if not a.publicar and not a.no_abrir:
        webbrowser.open(salida.as_uri())


if __name__ == '__main__':
    main()
