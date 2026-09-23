/**
 * Qué ficheros hay en una carpeta de public/, con la ruta como '/public/<carpeta>/<nombre>'.
 *
 * Antes esto era import.meta.glob, pero glob convierte cada fichero en un
 * import y Vite los copiaba otra vez a _astro/ con hash: todos los MP4 y los
 * PDF de certificados se publicaban dos veces. Aquí sólo hacían falta los nombres.
 */
import fs from 'node:fs';
import path from 'node:path';

export const ficherosPublicos = (carpeta, extensiones) => {
  const dir = path.join(process.cwd(), 'public', carpeta);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((f) => f.isFile())
    .map((f) => f.name)
    .filter((n) => !extensiones || extensiones.includes(path.extname(n).slice(1).toLowerCase()))
    .map((n) => `/public/${carpeta}/${n}`);
};
