/**
 * El feed, uno por idioma: /rss.xml y /en/rss.xml.
 */
import rss from '@astrojs/rss';
import { t } from './textos.js';
import { articulos, slugDe } from './blog.js';

export const feed = async (idioma, context) => {
  const B = t(idioma).blog;
  const lista = await articulos(idioma);

  return rss({
    title: B.rssTitulo,
    description: B.rssDescripcion,
    site: context.site,
    language: idioma,
    // dc:creator es lo que leen los agregadores como autor; <author> exigiría un correo.
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    items: lista.map((a) => ({
      title: a.data.titulo,
      description: a.data.descripcion,
      pubDate: a.data.fecha,
      customData: '<dc:creator>Florin Emanuel Todor Gliga</dc:creator>',
      link: `${idioma === 'en' ? '/en' : ''}/blog/${slugDe(a)}/`,
      categories: a.data.etiquetas,
    })),
  });
};
