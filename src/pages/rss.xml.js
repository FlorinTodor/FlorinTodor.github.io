import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const articulos = (await getCollection('blog', ({ data }) => !data.borrador))
    .sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime());

  return rss({
    title: 'Florin Emanuel Todor Gliga — Blog',
    description: 'Infraestructura, ciberseguridad e IA aplicada: fallos reales y cómo se diagnostican.',
    site: context.site,
    language: 'es',
    // dc:creator es lo que leen los agregadores como autor; <author> exigiría un correo.
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/' },
    items: articulos.map((a) => ({
      title: a.data.titulo,
      description: a.data.descripcion,
      pubDate: a.data.fecha,
      customData: '<dc:creator>Florin Emanuel Todor Gliga</dc:creator>',
      link: `/blog/${a.id}/`,
      categories: a.data.etiquetas,
    })),
  });
}
