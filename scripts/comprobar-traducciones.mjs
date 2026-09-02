/**
 * Comprueba que la versión inglesa no se haya quedado atrás.
 *
 *   node scripts/comprobar-traducciones.mjs
 *
 * Devuelve 1 si falta algo, para poder meterlo en el workflow. No mira si la
 * traducción es buena, sólo si existe: el sitio se cae al español cuando falta,
 * así que un olvido no rompe nada y por eso es fácil que pase inadvertido.
 */
import fs from 'node:fs';
import path from 'node:path';
import { TEXTOS } from '../src/idiomas/textos.js';

const leer = (f) => JSON.parse(fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
const fallos = [];

// --- 1. Interfaz: las mismas claves en los dos idiomas -----------------------
const claves = (obj, prefijo = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? claves(v, `${prefijo}${k}.`)
      : [`${prefijo}${k}`],
  );

const enEs = claves(TEXTOS.es);
const enEn = claves(TEXTOS.en);
for (const k of enEs) if (!enEn.includes(k)) fallos.push(`textos.js: falta en inglés  ${k}`);
for (const k of enEn) if (!enEs.includes(k)) fallos.push(`textos.js: sobra en inglés  ${k}`);

// --- 2. Proyectos ------------------------------------------------------------
const { proyectos } = leer('proyectos.json');
const proyectosEn = leer('proyectos.en.json').proyectos;
const CAMPOS_PROYECTO = ['titulo', 'tituloSeo', 'resumen', 'descripcionSeo', 'destacados', 'contexto', 'autoria'];

for (const p of proyectos) {
  const oculto = p.oculto || (p.pendiente || []).some((x) => x.startsWith('NO PUBLICAR'));
  const tr = proyectosEn[p.id];
  if (!tr) {
    // Un proyecto que no se publica puede esperar; uno que sí, no.
    (oculto ? console.warn : (m) => fallos.push(m))(
      `proyectos.en.json: sin traducir  ${p.id}${oculto ? ' (oculto, puede esperar)' : ''}`,
    );
    continue;
  }
  for (const campo of CAMPOS_PROYECTO) {
    if (p[campo] === undefined || tr[campo] !== undefined) continue;
    (oculto ? console.warn : (m) => fallos.push(m))(`proyectos.en.json: ${p.id} sin "${campo}"`);
  }
  if (tr.destacados && tr.destacados.length !== p.destacados.length) {
    fallos.push(`proyectos.en.json: ${p.id} tiene ${tr.destacados.length} destacados y el español ${p.destacados.length}`);
  }
}

// --- 3. Certificaciones ------------------------------------------------------
const certsEs = leer('certificaciones.json').certificaciones;
const certsEn = leer('certificaciones.en.json').certificaciones;
const CAMPOS_CERT = ['titulo', 'detalle', 'categoria', 'nota', 'entidad'];

for (const c of certsEs) {
  const tr = certsEn[c.id];
  if (!tr) { fallos.push(`certificaciones.en.json: sin traducir  ${c.id}`); continue; }
  // El título y la entidad muchas veces son nombres propios que no se traducen;
  // sólo se avisa de la categoría, que además es la clave del filtro.
  if (c.categoria && !tr.categoria) fallos.push(`certificaciones.en.json: ${c.id} sin "categoria"`);
  if (c.detalle && !tr.detalle) fallos.push(`certificaciones.en.json: ${c.id} sin "detalle"`);
  if (c.nota && !tr.nota) fallos.push(`certificaciones.en.json: ${c.id} sin "nota"`);
  void CAMPOS_CERT;
}

// --- 4. Blog -----------------------------------------------------------------
const dirBlog = new URL('../src/content/blog/', import.meta.url);
const dirBlogEn = new URL('../src/content/blog/en/', import.meta.url);
const md = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')) : []);
const traducidos = md(dirBlogEn);

for (const f of md(dirBlog)) {
  const borrador = /^borrador:\s*true/m.test(fs.readFileSync(path.join(dirBlog.pathname, f), 'utf8'));
  if (borrador) continue;
  if (!traducidos.includes(f)) fallos.push(`src/content/blog/en/: falta  ${f}`);
}
for (const f of traducidos) {
  if (!md(dirBlog).includes(f)) fallos.push(`src/content/blog/: el inglés ${f} no tiene original`);
}

// --- 5. Demos ----------------------------------------------------------------
if (!fs.existsSync(new URL('../public/demo/sesion-banca.en.json', import.meta.url))) {
  fallos.push('public/demo/: falta sesion-banca.en.json');
}
// El dashboard de rutina-export se embebe entero, interfaz incluida, y su
// miniatura de la portada es una foto de él: las dos cosas llevan texto y las
// dos tienen que existir en inglés.
if (!fs.existsSync(new URL('../public/demo/rutina-export/en/index.html', import.meta.url))) {
  fallos.push('public/demo/rutina-export/en/: falta index.html');
}
if (fs.existsSync(new URL('../public/media/poster/rutina-export.jpg', import.meta.url)) &&
    !fs.existsSync(new URL('../public/media/poster/rutina-export-en.jpg', import.meta.url))) {
  fallos.push('public/media/poster/: falta rutina-export-en.jpg');
}

// -----------------------------------------------------------------------------
if (fallos.length) {
  console.error(`\n✗ ${fallos.length} cosas sin traducir:\n`);
  for (const f of fallos) console.error(`  ${f}`);
  console.error('\nRecuerda: lo que falte se sirve en español, así que el sitio compila igual.\n');
  process.exit(1);
}
console.log('✓ Las dos versiones están al día.');
