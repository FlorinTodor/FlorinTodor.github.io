import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const articulos = (await getCollection('blog', ({ data }) => !data.borrador))
    .sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime());

  return rss({
    title: 'Florín Todor — Blog',
    description: 'Infraestructura, ciberseguridad e IA aplicada: fallos reales y cómo se diagnostican.',
    site: context.site,
    language: 'es',
    items: articulos.map((a) => ({
      title: a.data.titulo,
      description: a.data.descripcion,
      pubDate: a.data.fecha,
      link: `/blog/${a.id}/`,
      categories: a.data.etiquetas,
    })),
  });
}
