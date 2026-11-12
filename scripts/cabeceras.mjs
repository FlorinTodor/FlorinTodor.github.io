// Añade a dist/_headers la Content-Security-Policy de las páginas.
//
// Los scripts en línea de Astro (is:inline) sólo se dejan ejecutar por su
// resumen SHA-256, que cambia si cambia el script: por eso se calcula en cada
// build (npm run build), después de `astro build`. Los estilos sí van con
// 'unsafe-inline': las páginas llevan cientos de style="" y no ejecutan nada.
//
// La demo de rutina-export (/demo/) queda fuera: es una página aparte que carga
// fuentes de Google e imágenes de jsDelivr.
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
// Las rutas de las páginas en _headers. /certificaciones/ va exacta: en esa
// carpeta también están los PDF y las imágenes de cada certificado.
const RUTAS = ['/', '/en/', '/en/*', '/proyectos/*', '/blog/', '/blog/*', '/certificaciones/'];

const paginas = [];
const recorrer = (dir) => {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) {
      if (relative(DIST, ruta) !== 'demo') recorrer(ruta);
    } else if (nombre.endsWith('.html')) {
      paginas.push(ruta);
    }
  }
};
recorrer(DIST);

const resumenes = new Set();
for (const pagina of paginas) {
  const html = readFileSync(pagina, 'utf8');
  for (const [, atributos, cuerpo] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    // Con src se cubre con 'self'; los JSON (datos estructurados) no se ejecutan.
    if (/\ssrc=/.test(atributos) || /type="application\/(ld\+)?json"/.test(atributos)) continue;
    resumenes.add(`'sha256-${createHash('sha256').update(cuerpo, 'utf8').digest('base64')}'`);
  }
}

const csp = [
  "default-src 'self'",
  `script-src 'self' ${[...resumenes].sort().join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self'",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const linea = `  Content-Security-Policy: ${csp}`;
// Cloudflare no acepta líneas de más de 2.000 caracteres en _headers.
if (linea.length > 2000) throw new Error(`La CSP ocupa ${linea.length} caracteres: pasa de los 2.000 de _headers`);

const reglas = RUTAS.map((r) => `${r}\n${linea}\n`).join('');
appendFileSync(join(DIST, '_headers'), `\n# --- Añadido por scripts/cabeceras.mjs: CSP de las páginas ---\n${reglas}`);
console.log(`dist/_headers: CSP con ${resumenes.size} scripts en línea, de ${paginas.length} páginas`);
