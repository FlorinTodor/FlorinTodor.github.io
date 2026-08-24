import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { datosVideo } from './src/utilidades/videos.js';

const SITIO = 'https://florintodor.dev';

// Las demos sólo se anuncian en el sitemap si el MP4 existe de verdad, para no
// mandar a Google a una URL que devuelve 404.
const { proyectos } = JSON.parse(fs.readFileSync('./proyectos.json', 'utf8'));
const videos = new Map(
  proyectos
    .filter((p) => !p.oculto && fs.existsSync(`public/media/${p.id}.mp4`))
    .map((p) => {
      const v = datosVideo(p.id);
      return [`${SITIO}/proyectos/${p.id}/`, {
        title: `Demostración de ${p.titulo}`,
        description: p.resumen,
        thumbnail_loc: `${SITIO}/media/poster/${p.id}.jpg`,
        content_loc: `${SITIO}/media/${p.id}.mp4`,
        publication_date: v.fecha,
        duration: v.segundos,
        family_friendly: 'yes',
        live: 'no',
        requires_subscription: 'no',
        uploader: 'Florin Emanuel Todor Gliga',
        'uploader:info': SITIO,
      }];
    }),
);

// Publicado en https://florintodor.dev (repo: FlorinTodor/FlorinTodor.github.io)
// El dominio propio hace innecesario el ajuste de `base`.
export default defineConfig({
  site: SITIO,
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // La portada es lo que debe posicionar; las fichas de proyecto la apoyan.
      serialize(item) {
        item.changefreq = 'monthly';
        item.lastmod = new Date();
        item.priority = item.url === `${SITIO}/` ? 1.0 : 0.7;
        // El <video> de la ficha lleva VideoObject, pero Google descubre antes
        // las demos si además vienen listadas en el sitemap.
        const video = videos.get(item.url);
        if (video) item.video = [video];
        return item;
      },
    }),
  ],
});
