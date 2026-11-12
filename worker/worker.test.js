import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accesoValido, pruebaLocal } from './acceso.js';
import { esBot, esRedDeServidores, navegador, sistema } from './agente.js';
import { d1Falso } from './d1-falso.js';
import { conRango, leerRango } from './rango.js';
import { filaDelNavegador, normalizarRuta, procedencia, registrar, registrarDescarga, tipoDescarga } from './registro.js';

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1';
const LINKEDIN_APP = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.31.1';

// --- Navegador, sistema y bots ---

test('navegador: nombre y versión como los daba GoatCounter', () => {
  assert.equal(navegador(CHROME_WIN), 'Chrome 157');
  assert.equal(navegador(SAFARI_IOS), 'Safari 26.6');
  assert.equal(navegador(LINKEDIN_APP), 'LinkedIn (app)');
  assert.equal(navegador('Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'), 'Firefox 140');
  assert.equal(navegador(`${CHROME_WIN} Edg/157.0.0.0`), 'Edge 157');
  assert.equal(navegador(CHROME_WIN, { brave: true }), 'Brave 157');
});

test('sistema: las pistas del navegador dan Windows 11 y la versión real de Android', () => {
  assert.equal(sistema(CHROME_WIN, null), 'Windows 10');
  assert.equal(sistema(CHROME_WIN, { plataforma: 'Windows', version: '19.0.0' }), 'Windows 11');
  assert.equal(sistema(CHROME_WIN, { plataforma: 'Windows', version: '10.0.0' }), 'Windows 10');
  assert.equal(sistema(CHROME_ANDROID, null), 'Android (Chrome no dice la versión real)');
  assert.equal(sistema(CHROME_ANDROID, { plataforma: 'Android', version: '16.0.0' }), 'Android 16');
  assert.equal(sistema(SAFARI_IOS, null), 'iOS 18.7');
  assert.equal(sistema('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', null), 'macOS 10.15');
});

test('bots: los rastreadores fuera; las vistas previas de enlaces sólo cuentan en el servidor', () => {
  assert.ok(esBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'));
  assert.ok(esBot('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36'));
  assert.ok(esBot(''));
  assert.ok(!esBot(CHROME_WIN));
  assert.ok(!esBot('Mozilla/5.0 (Linux; Android 13; Cubot X30) Chrome/156.0.0.0 Mobile Safari/537.36'));
  assert.ok(!esBot('WhatsApp/2.24.1 A'));
  assert.ok(esBot('WhatsApp/2.24.1 A', { servidor: true }));
});

test('redes de servidores alquilados: OVH o Hetzner sí; las operadoras y las oficinas de Microsoft no', () => {
  assert.ok(esRedDeServidores('OVH SAS'));
  assert.ok(esRedDeServidores('Hetzner Online GmbH'));
  assert.ok(esRedDeServidores('DIGITALOCEAN-ASN'));
  assert.ok(!esRedDeServidores('Telefonica de Espana SAU'));
  assert.ok(!esRedDeServidores('Vodafone Spain'));
  assert.ok(!esRedDeServidores('Microsoft Corporation'));
  assert.ok(!esRedDeServidores(undefined));
});

// --- Lo que llega del navegador ---

test('procedencia: campaña antes que la cabecera, y el enlace sin https://', () => {
  assert.deepEqual(procedencia('https://www.linkedin.com/', ''), { referer: 'www.linkedin.com', esquema: 'h' });
  assert.deepEqual(procedencia('https://t.co/abc', 'ig'), { referer: 'ig', esquema: 'c' });
  assert.deepEqual(procedencia('android-app://com.linkedin.android/', ''), { referer: 'LinkedIn', esquema: 'g' });
  assert.deepEqual(procedencia('', ''), { referer: '', esquema: '' });
  assert.deepEqual(procedencia('https://florintodor.dev/proyectos/unia/', ''), { referer: 'florintodor.dev/proyectos/unia/', esquema: 'h' });
});

test('rutas: sin barra final ni consulta; las que no empiezan por / no valen', () => {
  assert.equal(normalizarRuta('/proyectos/unia/'), '/proyectos/unia');
  assert.equal(normalizarRuta('/?utm_source=ig'), '/');
  assert.equal(normalizarRuta('/en/#contacto'), '/en');
  assert.equal(normalizarRuta('https://otro.com/'), null);
  assert.equal(tipoDescarga('/CV_Florin_Emanuel_Todor_Gliga_en.pdf'), 'cv');
  assert.equal(tipoDescarga('/docs/memoria-tfg-ciber-asesoria.pdf'), 'memoria');
  assert.equal(tipoDescarga('/img/foto.jpg'), null);
});

test('filaDelNavegador: página vista con país, región y pantalla; eventos sólo de los tipos conocidos', () => {
  const ctx = { ua: CHROME_WIN, cf: { country: 'ES', regionCode: 'MD', region: 'Madrid' }, host: 'florintodor.dev', momento: '2026-11-12T10:00:00.000Z', sesion: 'abc' };
  const p = filaDelNavegador({ t: 'p', v: 'a1b2c3d4-e5f6', r: '/proyectos/unia/', ti: 'Unia', ref: 'https://t.co/x', w: 1920, h: 1080, d: 1.25, so: { p: 'Windows', v: '15.0.0' } }, ctx);
  assert.equal(p.ruta, '/proyectos/unia');
  assert.equal(p.ubicacion, 'ES-MD');
  assert.equal(p.region, 'Madrid');
  assert.equal(p.pantalla, '1920,1080,1.25');
  assert.equal(p.sistema, 'Windows 11');
  assert.equal(p.referer, 't.co/x');
  assert.equal(p.bot, 0);
  const ev = filaDelNavegador({ t: 'e', e: 'linkedin', r: '/', href: 'https://www.linkedin.com/in/x' }, ctx);
  assert.equal(ev.ruta, 'linkedin: /');
  assert.equal(ev.evento, 1);
  assert.equal(filaDelNavegador({ t: 'e', e: 'inventado', r: '/' }, ctx), null);
  assert.equal(filaDelNavegador({ t: 'p', r: 'javascript:alert(1)' }, ctx), null);
  assert.equal(filaDelNavegador({ t: 'p', r: '/', wd: true }, ctx).bot, 1);
  const desdeOvh = filaDelNavegador({ t: 'p', r: '/' }, { ...ctx, cf: { country: 'CA', asOrganization: 'OVH SAS' } });
  assert.equal(desdeOvh.bot, 1);
  assert.equal(desdeOvh.red, 'OVH SAS');
});

// --- Con la base de datos ---

const peticion = (cuerpo, { origen = 'https://florintodor.dev', ip = '203.0.113.7', ua = CHROME_WIN } = {}) =>
  Object.assign(new Request('https://florintodor.dev/_v', {
    method: 'POST', body: JSON.stringify(cuerpo),
    headers: { Origin: origen, 'CF-Connecting-IP': ip, 'User-Agent': ua },
  }), { cf: { country: 'ES' } });

async function enviar(env, cuerpo, opciones, ahora) {
  const pendientes = [];
  const r = await registrar(peticion(cuerpo, opciones), env, { waitUntil: (p) => pendientes.push(p) }, ahora);
  await Promise.all(pendientes);
  return r;
}

test('registrar: guarda la página, le apunta el tiempo al salir y no guarda la IP', async () => {
  const env = { DB: d1Falso() };
  const ahora = new Date('2026-11-12T10:00:00Z');
  assert.equal((await enviar(env, { t: 'p', v: 'vista-0001', r: '/', ti: 'Inicio', w: 390, h: 844, d: 3 }, {}, ahora)).status, 204);
  await enviar(env, { t: 's', v: 'vista-0001', s: 42 }, {}, ahora);
  await enviar(env, { t: 's', v: 'vista-0001', s: 12 }, {}, ahora);
  const filas = env.DB.sqlite.prepare('SELECT * FROM visitas').all();
  assert.equal(filas.length, 1);
  assert.equal(filas[0].segundos, 42);
  assert.match(filas[0].sesion, /^[0-9a-f]{32}$/);
  assert.ok(!JSON.stringify(filas).includes('203.0.113.7'));
  // Otra IP es otra sesión, y no puede apuntar tiempo en una vista ajena.
  await enviar(env, { t: 's', v: 'vista-0001', s: 999 }, { ip: '198.51.100.1' }, ahora);
  assert.equal(env.DB.sqlite.prepare('SELECT segundos FROM visitas').get().segundos, 42);
});

test('registrar: rechaza otros orígenes, cuerpos enormes y lo que no es POST', async () => {
  const env = { DB: d1Falso() };
  assert.equal((await enviar(env, { t: 'p', r: '/' }, { origen: 'https://malo.example' })).status, 403);
  const enorme = { t: 'p', r: '/', ti: 'x'.repeat(5000) };
  assert.equal((await enviar(env, enorme)).status, 413);
  const get = await registrar(new Request('https://florintodor.dev/_v'), env, { waitUntil() {} });
  assert.equal(get.status, 405);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM visitas').get().n, 0);
});

test('sal: una por día, y la de ayer se borra', async () => {
  const env = { DB: d1Falso() };
  await enviar(env, { t: 'p', r: '/' }, {}, new Date('2026-11-12T10:00:00Z'));
  await enviar(env, { t: 'p', r: '/' }, {}, new Date('2026-11-13T10:00:00Z'));
  const [a, b] = env.DB.sqlite.prepare('SELECT sesion FROM visitas ORDER BY id').all();
  assert.notEqual(a.sesion, b.sesion);
  assert.deepEqual(env.DB.sqlite.prepare('SELECT dia FROM sales').all().map((x) => x.dia), ['2026-11-13']);
});

test('registrarDescarga: el CV cuenta una vez aunque el visor lo pida a trozos; los bots no', async () => {
  const env = { DB: d1Falso() };
  const ahora = new Date('2026-11-12T10:00:00Z');
  const pdf = (headers) => Object.assign(new Request('https://florintodor.dev/CV_Florin_Emanuel_Todor_Gliga_en.pdf', {
    headers: { 'CF-Connecting-IP': '203.0.113.7', 'User-Agent': CHROME_WIN, ...headers },
  }), { cf: { country: 'ES' } });
  await registrarDescarga(pdf({ Referer: 'https://florintodor.dev/en/' }), env, ahora);
  await registrarDescarga(pdf({ Range: 'bytes=65536-131071' }), env, ahora);
  await registrarDescarga(pdf({}), env, new Date('2026-11-12T10:05:00Z'));
  await registrarDescarga(pdf({ 'User-Agent': 'Mozilla/5.0 (compatible; bingbot/2.0)' }), env, ahora);
  const filas = env.DB.sqlite.prepare('SELECT * FROM visitas').all();
  assert.equal(filas.length, 1);
  assert.equal(filas[0].ruta, 'cv: /en');
  assert.equal(filas[0].titulo, '/CV_Florin_Emanuel_Todor_Gliga_en.pdf');
  assert.equal(filas[0].origen, 'servidor');
});

test('registrarDescarga: con el enlace directo desde fuera se ve de dónde vino', async () => {
  const env = { DB: d1Falso() };
  await registrarDescarga(Object.assign(new Request('https://florintodor.dev/CV_Florin_Emanuel_Todor_Gliga.pdf', {
    headers: { 'CF-Connecting-IP': '203.0.113.7', 'User-Agent': SAFARI_IOS, Referer: 'https://www.linkedin.com/' },
  }), { cf: {} }), env);
  const fila = env.DB.sqlite.prepare('SELECT ruta, referer, esquema FROM visitas').get();
  assert.deepEqual({ ...fila }, { ruta: 'cv: fuera de la web', referer: 'www.linkedin.com', esquema: 'h' });
});

test('registrarDescarga: desde un servidor alquilado se apunta como bot, con su red', async () => {
  const env = { DB: d1Falso() };
  await registrarDescarga(Object.assign(new Request('https://florintodor.dev/CV_Florin_Emanuel_Todor_Gliga.pdf', {
    headers: { 'CF-Connecting-IP': '198.51.100.9', 'User-Agent': CHROME_WIN },
  }), { cf: { country: 'CA', regionCode: 'QC', asOrganization: 'OVH SAS' } }), env);
  const fila = env.DB.sqlite.prepare('SELECT bot, red, ubicacion FROM visitas').get();
  assert.deepEqual({ ...fila }, { bot: 1, red: 'OVH SAS', ubicacion: 'CA-QC' });
});

// --- Access ---

async function firmar(datos, kid = 'k1') {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const b64 = (x) => Buffer.from(x).toString('base64url');
  const cab = b64(JSON.stringify({ alg: 'RS256', kid }));
  const cuerpo = b64(JSON.stringify(datos));
  const firma = b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(`${cab}.${cuerpo}`)));
  const jwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid };
  return { jwt: `${cab}.${cuerpo}.${firma}`, pedir: async () => new Response(JSON.stringify({ keys: [jwk] })) };
}

test('Access: sólo con firma válida, de su equipo y su AUD, y sin caducar', async () => {
  const env = { ACCESS_EQUIPO: 'equipo-prueba', ACCESS_AUD: 'aud-1' };
  const ahora = Date.parse('2026-11-12T10:00:00Z');
  const buenos = { aud: ['aud-1'], iss: 'https://equipo-prueba.cloudflareaccess.com', exp: ahora / 1000 + 600 };
  const con = (jwt) => new Request('https://florintodor.dev/visitas/', { headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} });

  let f = await firmar(buenos);
  assert.equal(await accesoValido(con(f.jwt), env, { pedir: f.pedir, ahora }), true);
  assert.equal(await accesoValido(con(null), env, { pedir: f.pedir, ahora }), false);
  assert.equal(await accesoValido(con(f.jwt), { ...env, ACCESS_AUD: '' }, { pedir: f.pedir, ahora }), false);
  // Caducada
  assert.equal(await accesoValido(con(f.jwt), env, { pedir: f.pedir, ahora: ahora + 3600_000 }), false);
  // Otra aplicación u otro equipo
  f = await firmar({ ...buenos, aud: ['otra'] }, 'k2');
  assert.equal(await accesoValido(con(f.jwt), env, { pedir: f.pedir, ahora }), false);
  f = await firmar({ ...buenos, iss: 'https://otro.cloudflareaccess.com' }, 'k3');
  assert.equal(await accesoValido(con(f.jwt), env, { pedir: f.pedir, ahora }), false);
  // Firmada con una clave que no es la publicada
  const ajena = await firmar(buenos, 'k4');
  const publicada = await firmar(buenos, 'k4');
  assert.equal(await accesoValido(con(ajena.jwt), env, { pedir: publicada.pedir, ahora }), false);
});

test('prueba local: sólo en localhost y con PANEL_SIN_ACCESS=1', () => {
  const env = { PANEL_SIN_ACCESS: '1' };
  assert.equal(pruebaLocal(new Request('http://localhost:8787/visitas/'), env), true);
  assert.equal(pruebaLocal(new Request('https://florintodor.dev/visitas/'), env), false);
  assert.equal(pruebaLocal(new Request('http://localhost:8787/visitas/'), {}), false);
});

// --- Vídeos por trozos (Safari) ---


// Estáticos de mentira: devuelven el fichero entero, a trozos de 7 bytes, como
// un flujo de verdad, y sin Content-Length, como dentro de Workers.
function estaticos(bytes) {
  return {
    async fetch(req) {
      if (req.headers.has('Range')) throw new Error('a los estáticos no les llega Range');
      let i = 0;
      const body = req.method === 'HEAD' ? null : new ReadableStream({
        pull(c) { if (i >= bytes.length) { c.close(); return; } c.enqueue(bytes.subarray(i, i + 7)); i += 7; },
      });
      return new Response(body, { headers: { 'Content-Type': 'video/mp4', ETag: '"v1"' } });
    },
  };
}
const FICHERO = Uint8Array.from({ length: 100 }, (_, i) => i);
const pedir = (headers = {}, method = 'GET') => conRango(new Request('https://florintodor.dev/media/demo.mp4', { method, headers }), { ASSETS: estaticos(FICHERO) }, { '/media/demo.mp4': 100 });
const bytesDe = async (r) => [...new Uint8Array(await r.arrayBuffer())];

test('leerRango: inicio-fin, abierto, los últimos N y fuera del fichero', () => {
  assert.deepEqual(leerRango('bytes=0-1', 100), [0, 1]);
  assert.deepEqual(leerRango('bytes=90-', 100), [90, 99]);
  assert.deepEqual(leerRango('bytes=-10', 100), [90, 99]);
  assert.deepEqual(leerRango('bytes=95-500', 100), [95, 99]);
  assert.equal(leerRango('bytes=100-', 100), 'fuera');
  assert.equal(leerRango('bytes=0-1,5-6', 100), null);
  assert.equal(leerRango('items=0-1', 100), null);
});

test('conRango: Safari pide bytes=0-1 y recibe 206 con esos dos bytes', async () => {
  const r = await pedir({ Range: 'bytes=0-1' });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('Content-Range'), 'bytes 0-1/100');
  assert.equal(r.headers.get('Content-Length'), '2');
  assert.equal(r.headers.get('Accept-Ranges'), 'bytes');
  assert.deepEqual(await bytesDe(r), [0, 1]);
});

test('conRango: un trozo en medio que cruza varios trozos del flujo', async () => {
  const r = await pedir({ Range: 'bytes=5-20' });
  assert.equal(r.status, 206);
  assert.deepEqual(await bytesDe(r), Array.from({ length: 16 }, (_, i) => i + 5));
});

test('conRango: sin el tamaño apuntado se sirve entero, como antes', async () => {
  const r = await conRango(new Request('https://florintodor.dev/media/nuevo.mp4', { headers: { Range: 'bytes=0-1' } }), { ASSETS: estaticos(FICHERO) }, {});
  assert.equal(r.status, 200);
  assert.equal((await bytesDe(r)).length, 100);
});

test('conRango: sin Range, entero y avisando de que admite trozos; fuera del fichero, 416', async () => {
  const entero = await pedir();
  assert.equal(entero.status, 200);
  assert.equal(entero.headers.get('Accept-Ranges'), 'bytes');
  assert.equal((await bytesDe(entero)).length, 100);
  const fuera = await pedir({ Range: 'bytes=200-' });
  assert.equal(fuera.status, 416);
  assert.equal(fuera.headers.get('Content-Range'), 'bytes */100');
  const otraVersion = await pedir({ Range: 'bytes=0-1', 'If-Range': '"v0"' });
  assert.equal(otraVersion.status, 200);
});

test('límite por IP: pasado el límite, 429 y no se guarda nada', async () => {
  const env = { DB: d1Falso(), LIMITE_VISITAS: { limit: async () => ({ success: false }) } };
  assert.equal((await enviar(env, { t: 'p', r: '/' })).status, 429);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM visitas').get().n, 0);
  const pendientes = [];
  await registrar(peticion({ t: 'p', r: '/' }), { ...env, LIMITE_VISITAS: { limit: async () => ({ success: true }) } }, { waitUntil: (p) => pendientes.push(p) });
  await Promise.all(pendientes);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) AS n FROM visitas').get().n, 1);
});
