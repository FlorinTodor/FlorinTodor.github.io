import { defineConfig } from 'astro/config';

// Publicado en https://FlorinTodor.github.io  (repo: FlorinTodor.github.io)
// Si algún día lo mueves a un repo con otro nombre, añade aquí:
//   base: '/nombre-del-repo',
export default defineConfig({
  site: 'https://florintodor.dev',
  build: { format: 'directory' },
});
