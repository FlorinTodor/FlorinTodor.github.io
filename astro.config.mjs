import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Publicado en https://florintodor.dev (repo: FlorinTodor/FlorinTodor.github.io)
// El dominio propio hace innecesario el ajuste de `base`.
export default defineConfig({
  site: 'https://florintodor.dev',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // La portada es lo que debe posicionar; las fichas de proyecto la apoyan.
      serialize(item) {
        item.changefreq = 'monthly';
        item.lastmod = new Date();
        item.priority = item.url === 'https://florintodor.dev/' ? 1.0 : 0.7;
        return item;
      },
    }),
  ],
});
