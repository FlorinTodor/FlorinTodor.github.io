// Recoge las visitas: lo que manda la web desde el navegador (src/layouts/Base.astro)
// y las descargas de PDF, que se apuntan en el propio servidor.
//
// No se guardan cookies, ni nada en el navegador, ni la IP. La sesión es un
// resumen (SHA-256) de la IP y el User-Agent con una sal al azar que cambia cada
// día y se borra: sirve para unir las páginas de una misma visita, pero no para
// seguir a nadie de un día para otro.

import { esBot, navegador, sistema } from './agente.js';

export const EVENTOS = ['cv', 'correo', 'linkedin', 'github', 'memoria'];
const MAX_CUERPO = 4096;
// Una descarga repetida en este rato (el visor de PDF pide el fichero a trozos,
// o se vuelve a abrir) cuenta una vez.
const MISMA_DESCARGA_MIN = 30;

const texto = (x, max) => (typeof x === 'string' ? x : '').slice(0, max);
const numero = (x, min, max) => (typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max ? x : 0);

// Día de Madrid en "AAAA-MM-DD".
export const diaMadrid = (fecha) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(fecha);

// "/proyectos/unia/" -> "/proyectos/unia", como guardaba GoatCounter.
export function normalizarRuta(ruta) {
  const limpia = texto(ruta, 300).split(/[?#]/)[0] || '/';
  if (!limpia.startsWith('/')) return null;
  return limpia.length > 1 ? limpia.replace(/\/+$/, '') || '/' : '/';
}

// Paquetes de Android que llegan como "android-app://<paquete>/".
const APPS = {
  'com.linkedin.android': 'LinkedIn', 'com.google.android.gm': 'Gmail',
  'com.google.android.googlequicksearchbox': 'Google', 'com.twitter.android': 'X / Twitter',
  'org.telegram.messenger': 'Telegram', 'com.whatsapp': 'WhatsApp', 'com.instagram.android': 'Instagram',
  'com.slack': 'Slack', 'com.microsoft.teams': 'Teams',
};

// De dónde llega, con el formato de GoatCounter: la campaña (utm_source o
// ?ref=) manda sobre la cabecera; el enlace va sin "https://".
export function procedencia(referer, campana) {
  const c = texto(campana, 100).trim();
  if (c) return { referer: c, esquema: 'c' };
  const r = texto(referer, 500).trim();
  if (!r) return { referer: '', esquema: '' };
  const app = r.match(/^android-app:\/\/([^/]+)/);
  if (app) return { referer: APPS[app[1]] || app[1], esquema: 'g' };
  try {
    const u = new URL(r);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { referer: r.slice(0, 200), esquema: 'o' };
    const ruta = u.pathname === '/' && !u.search ? '' : u.pathname;
    return { referer: `${u.host}${ruta}${u.search}`.slice(0, 300), esquema: 'h' };
  } catch {
    return { referer: r.slice(0, 200), esquema: 'o' };
  }
}

function pantalla(d) {
  const ancho = numero(d.w, 1, 20000);
  if (!ancho) return '';
  return `${Math.round(ancho)},${Math.round(numero(d.h, 0, 20000))},${numero(d.d, 0, 10)}`;
}

function lugar(cf = {}) {
  const pais = typeof cf.country === 'string' && /^[A-Z]{2}$/.test(cf.country) ? cf.country : '';
  const codigo = typeof cf.regionCode === 'string' && /^[A-Z0-9]{1,3}$/.test(cf.regionCode) ? cf.regionCode : '';
  return {
    ubicacion: pais && codigo ? `${pais}-${codigo}` : pais,
    region: pais ? texto(cf.region, 80) : '',
  };
}

let salCache = { dia: '', valor: '' };

async function salDelDia(db, dia) {
  if (salCache.dia === dia) return salCache.valor;
  const nueva = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await db.prepare('INSERT OR IGNORE INTO sales (dia, valor) VALUES (?1, ?2)').bind(dia, nueva).run();
  const fila = await db.prepare('SELECT valor FROM sales WHERE dia = ?1').bind(dia).first();
  await db.prepare('DELETE FROM sales WHERE dia < ?1').bind(dia).run();
  salCache = { dia, valor: fila.valor };
  return fila.valor;
}

export async function sesionDe(db, request, ahora) {
  const sal = await salDelDia(db, diaMadrid(ahora));
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sal}|${ip}|${ua}`));
  return [...new Uint8Array(resumen)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const COLUMNAS = ['momento', 'host', 'sesion', 'vista', 'ruta', 'titulo', 'evento', 'referer', 'esquema',
  'navegador', 'sistema', 'ua', 'pantalla', 'ubicacion', 'region', 'segundos', 'bot', 'origen'];

function insertar(db, fila) {
  const valores = COLUMNAS.map((c) => fila[c] ?? null);
  return db.prepare(`INSERT INTO visitas (${COLUMNAS.join(', ')}) VALUES (${COLUMNAS.map((_, i) => `?${i + 1}`).join(', ')})`)
    .bind(...valores).run();
}

// Lo que manda el navegador, ya comprobado, como fila de la tabla. Devuelve
// null si no vale. `t`: p (página vista), e (clic), s (tiempo al salir).
export function filaDelNavegador(d, { ua, cf, host, momento, sesion }) {
  if (!d || typeof d !== 'object') return null;
  const comun = {
    momento, host, sesion,
    navegador: navegador(ua, { brave: d.br === true }),
    sistema: sistema(ua, d.so && typeof d.so === 'object'
      ? { plataforma: texto(d.so.p, 20), version: texto(d.so.v, 20) } : null),
    ua: texto(ua, 400),
    pantalla: pantalla(d),
    ...lugar(cf),
    bot: esBot(ua) || d.wd === true ? 1 : 0,
    origen: 'navegador',
  };
  const ruta = normalizarRuta(d.r);
  if (!ruta) return null;
  if (d.t === 'p') {
    return {
      ...comun, ...procedencia(d.ref, d.c),
      vista: /^[\w-]{8,64}$/.test(d.v) ? d.v : null,
      ruta, titulo: texto(d.ti, 200), evento: 0,
    };
  }
  if (d.t === 'e' && EVENTOS.includes(d.e)) {
    return { ...comun, referer: '', esquema: '', vista: null, ruta: `${d.e}: ${ruta}`, titulo: texto(d.href, 300), evento: 1 };
  }
  return null;
}

function mismoOrigen(request, url) {
  const origen = request.headers.get('Origin');
  if (origen) return origen === url.origin;
  try {
    return new URL(request.headers.get('Referer') || '').origin === url.origin;
  } catch {
    return false;
  }
}

// POST /_v desde la web.
export async function registrar(request, env, ctx, ahora = new Date()) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const url = new URL(request.url);
  if (!mismoOrigen(request, url)) return new Response(null, { status: 403 });
  const cuerpo = await request.text();
  if (cuerpo.length > MAX_CUERPO) return new Response(null, { status: 413 });
  let d;
  try {
    d = JSON.parse(cuerpo);
  } catch {
    return new Response(null, { status: 400 });
  }
  ctx.waitUntil((async () => {
    const sesion = await sesionDe(env.DB, request, ahora);
    if (d?.t === 's') {
      // Tiempo con la página a la vista: se queda el mayor de los avisos.
      const segundos = Math.round(numero(d.s, 0, 86400));
      if (typeof d.v === 'string' && /^[\w-]{8,64}$/.test(d.v)) {
        await env.DB.prepare('UPDATE visitas SET segundos = MAX(COALESCE(segundos, 0), ?1) WHERE vista = ?2 AND sesion = ?3')
          .bind(segundos, d.v, sesion).run();
      }
      return;
    }
    const fila = filaDelNavegador(d, {
      ua: request.headers.get('User-Agent') || '', cf: request.cf, host: url.host, momento: ahora.toISOString(), sesion,
    });
    if (fila) await insertar(env.DB, fila);
  })().catch((e) => console.error('visitas: no se pudo guardar', e)));
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

// ¿Es uno de los PDF que se cuentan? Devuelve el tipo de evento o null.
export function tipoDescarga(ruta) {
  if (/^\/CV_[\w-]+\.pdf$/.test(ruta)) return 'cv';
  if (/^\/docs\/[\w-]+\.pdf$/.test(ruta)) return 'memoria';
  return null;
}

// GET de un PDF: se apunta aquí y no al hacer clic, para contar también a quien
// llega con el enlace directo (desde LinkedIn, un correo...) o sin JavaScript.
export async function registrarDescarga(request, env, ahora = new Date()) {
  const url = new URL(request.url);
  const tipo = tipoDescarga(url.pathname);
  if (!tipo || request.method !== 'GET') return;
  // El visor de PDF del navegador pide el resto a trozos: sólo cuenta el primero.
  const rango = request.headers.get('Range');
  if (rango && !/^bytes=0-/.test(rango)) return;
  const ua = request.headers.get('User-Agent') || '';
  if (esBot(ua, { servidor: true })) return;
  const sesion = await sesionDe(env.DB, request, ahora);
  const desde = new Date(ahora.getTime() - MISMA_DESCARGA_MIN * 60_000).toISOString();
  const repetida = await env.DB.prepare(
    'SELECT 1 FROM visitas WHERE sesion = ?1 AND evento = 1 AND titulo = ?2 AND momento > ?3 LIMIT 1',
  ).bind(sesion, url.pathname, desde).first();
  if (repetida) return;
  const ref = request.headers.get('Referer') || '';
  let pagina = 'fuera de la web';
  let origen = { referer: '', esquema: '' };
  try {
    const r = new URL(ref);
    if (r.host === url.host) pagina = normalizarRuta(r.pathname) || '/';
    origen = procedencia(ref, '');
  } catch { /* sin Referer: enlace directo, app o navegador que no lo manda */ }
  await insertar(env.DB, {
    momento: ahora.toISOString(), host: url.host, sesion, vista: null,
    ruta: `${tipo}: ${pagina}`, titulo: url.pathname, evento: 1, ...origen,
    navegador: navegador(ua), sistema: sistema(ua, null), ua: ua.slice(0, 400), pantalla: '',
    ...lugar(request.cf), bot: 0, origen: 'servidor',
  });
}
