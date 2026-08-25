import fs from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { datosVideo } from './src/utilidades/videos.js';
import { t, IDIOMAS } from './src/idiomas/textos.js';

const SITIO = 'https://florintodor.dev';

// El español vive en la raíz y el inglés en /en/. Igual que en src/idiomas/rutas.js,
// pero aquí no se puede importar ese módulo porque usa import.meta.env.
const prefijo = (idioma) => (idioma === 'en' ? '/en' : '');

const { proyectos } = JSON.parse(fs.readFileSync('./proyectos.json', 'utf8'));
const traducciones = JSON.parse(fs.readFileSync('./proyectos.en.json', 'utf8')).proyectos;

const publicables = proyectos.filter(
  (p) => !p.oculto && !(p.pendiente || []).some((x) => x.startsWith('NO PUBLICAR')),
);

// Las demos sólo se anuncian en el sitemap si el MP4 existe de verdad, para no
// mandar a Google a una URL que devuelve 404. La grabación es la misma en los
// dos idiomas (está en español); lo que cambia es el título y la descripción.
const videos = new Map(
  IDIOMAS.flatMap((idioma) =>
    publicables
      .filter((p) => fs.existsSync(`public/media/${p.id}.mp4`))
      .map((p) => {
        const datos = idioma === 'en' ? { ...p, ...(traducciones[p.id] || {}) } : p;
        const v = datosVideo(p.id);
        return [`${SITIO}${prefijo(idioma)}/proyectos/${p.id}/`, {
          title: t(idioma).ficha.demostracionAlt(datos.titulo),
          description: datos.resumen,
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
  ),
);

// Publicado en https://florintodor.dev (repo: FlorinTodor/FlorinTodor.github.io)
// El dominio propio hace innecesario el ajuste de `base`.
export default defineConfig({
  site: SITIO,
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // La portada es lo que debe posicionar; las fichas de proyecto la apoyan.
      // El original es el español: la portada inglesa va un escalón por debajo.
      serialize(item) {
        item.changefreq = 'monthly';
        item.lastmod = new Date();
        item.priority = item.url === `${SITIO}/` ? 1.0 : item.url === `${SITIO}/en/` ? 0.9 : 0.7;

        // Las dos versiones de cada página se declaran hermanas también aquí,
        // además del hreflang del <head>. El 404 no entra en el sitemap.
        const camino = item.url.slice(SITIO.length).replace(/^\/en/, '');
        item.links = [
          { lang: 'es', url: `${SITIO}${camino}` },
          { lang: 'en', url: `${SITIO}/en${camino}` },
          { lang: 'x-default', url: `${SITIO}${camino}` },
        ];

        // El <video> de la ficha lleva VideoObject, pero Google descubre antes
        // las demos si además vienen listadas en el sitemap.
        const video = videos.get(item.url);
        if (video) item.video = [video];
        return item;
      },
    }),
  ],
});
