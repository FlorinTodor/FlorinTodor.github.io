// Apunta los bytes de cada fichero de dist/media/ en worker/media.json, para que
// el Worker pueda servir los vídeos por trozos (worker/rango.js): dentro del
// Worker la respuesta de los estáticos no trae Content-Length.
//
// Corre después de `astro build` (npm run build). El JSON se genera en cada
// compilación y no va a git.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const tamanos = {};
const recorrer = (dir) => {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    const info = statSync(ruta);
    if (info.isDirectory()) recorrer(ruta);
    else tamanos[`/${relative(DIST, ruta).split('\\').join('/')}`] = info.size;
  }
};
recorrer(join(DIST, 'media'));
writeFileSync(new URL('../worker/media.json', import.meta.url), `${JSON.stringify(tamanos, null, 1)}\n`);
console.log(`worker/media.json: ${Object.keys(tamanos).length} ficheros de /media/`);
