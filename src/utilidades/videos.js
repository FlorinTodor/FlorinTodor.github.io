/**
 * Datos de cada demo en vídeo, leídos del propio MP4 al compilar.
 *
 * La alternativa era un JSON escrito a mano (o generado con ffprobe) que había
 * que acordarse de regenerar al cambiar un vídeo. Aquí no hay nada que
 * recordar: la duración y el tamaño salen de los bytes del fichero y la fecha,
 * del commit que lo tocó por última vez.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const cache = new Map();

/** Recorre las cajas (atoms) de un MP4 en un tramo del fichero. */
function* cajas(buf, inicio, fin) {
  let p = inicio;
  while (p + 8 <= fin) {
    let tam = buf.readUInt32BE(p);
    const tipo = buf.toString('latin1', p + 4, p + 8);
    if (tam === 1) tam = Number(buf.readBigUInt64BE(p + 8)); // caja de 64 bits
    if (tam === 0) tam = fin - p;
    if (tam < 8) break;
    yield { tipo, datos: p + 8, fin: Math.min(p + tam, fin) };
    p += tam;
  }
}

// Estas cajas sólo contienen otras cajas, así que hay que bajar por ellas.
const CONTENEDORES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl']);
const VIDEO = new Set(['avc1', 'avc3', 'hev1', 'hvc1', 'mp4v']);

function recorre(buf, inicio, fin, visita) {
  for (const caja of cajas(buf, inicio, fin)) {
    visita(caja, buf);
    if (CONTENEDORES.has(caja.tipo)) recorre(buf, caja.datos, caja.fin, visita);
    // stsd lleva una cabecera de 8 bytes antes de las entradas de muestra.
    if (caja.tipo === 'stsd') recorre(buf, caja.datos + 8, caja.fin, visita);
  }
}

function leeMp4(ruta) {
  const buf = fs.readFileSync(ruta);
  let segundos = 0;
  let ancho = 0;
  let alto = 0;

  recorre(buf, 0, buf.length, ({ tipo, datos }) => {
    if (tipo === 'mvhd') {
      const version = buf[datos];
      const [escala, duracion] = version === 0
        ? [buf.readUInt32BE(datos + 12), buf.readUInt32BE(datos + 16)]
        : [buf.readUInt32BE(datos + 20), Number(buf.readBigUInt64BE(datos + 24))];
      if (escala) segundos = Math.round(duracion / escala);
    } else if (VIDEO.has(tipo) && !ancho) {
      // VisualSampleEntry: 8 de cabecera ya descontados, 24 de campos fijos.
      ancho = buf.readUInt16BE(datos + 24);
      alto = buf.readUInt16BE(datos + 26);
    }
  });

  return { segundos, ancho, alto };
}

/**
 * Fecha del último commit que tocó el fichero; si no hay git, su mtime.
 *
 * Devuelve ISO 8601 completo **con zona horaria** (2026-08-18T13:47:58+02:00).
 * El `uploadDate` de un VideoObject sin zona horaria lo rechaza Google: lo marca
 * en Search Console como valor de fecha y hora no válido. De ahí `%cI` (ISO
 * estricto) en vez de `%cs`, que sólo daba el día.
 */
function fecha(rutaRelativa) {
  try {
    const salida = execFileSync('git', ['log', '-1', '--format=%cI', '--', rutaRelativa],
      { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (salida) return salida;
  } catch {
    // Sin git (o sin historial): se usa la fecha del fichero.
  }
  // toISOString() ya termina en Z, que también es zona horaria válida.
  return fs.statSync(path.join(RAIZ, rutaRelativa)).mtime.toISOString();
}

/** Duración, tamaño y fecha de public/media/<id>.mp4, o null si no existe. */
export function datosVideo(id) {
  if (cache.has(id)) return cache.get(id);
  const rutaRelativa = path.join('public/media', `${id}.mp4`);
  const ruta = path.join(RAIZ, rutaRelativa);
  const datos = fs.existsSync(ruta)
    ? { ...leeMp4(ruta), fecha: fecha(rutaRelativa) }
    : null;
  cache.set(id, datos);
  return datos;
}

/** Duración en el formato ISO 8601 que espera schema.org: PT3M43S. */
export function duracionIso(segundos) {
  const minutos = Math.floor(segundos / 60);
  return `PT${minutos ? `${minutos}M` : ''}${segundos % 60}S`;
}
