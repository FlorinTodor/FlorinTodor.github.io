/**
 * Los artículos, separados por idioma.
 *
 * Los originales en español están en src/content/blog/ y las traducciones en
 * src/content/blog/en/, así que el idioma se deduce del prefijo del id. El
 * slug es el mismo en los dos: /blog/x/ y /en/blog/x/ son la misma dirección
 * con prefijo, que es lo que hace que el selector de idioma y los hreflang
 * salgan solos sin una tabla de equivalencias.
 */
import { getCollection } from 'astro:content';

export const idiomaDe = (a) => (a.id.startsWith('en/') ? 'en' : 'es');
export const slugDe = (a) => a.id.replace(/^en\//, '');

export const articulos = async (idioma) =>
  (await getCollection('blog', ({ data }) => !data.borrador))
    .filter((a) => idiomaDe(a) === idioma)
    .sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime());
