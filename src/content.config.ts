import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    titulo: z.string(),
    // Para el <title>: el titular del artículo puede pasar de los 60
    // caracteres que enseña Google sin que se corte.
    tituloSeo: z.string().optional(),
    descripcion: z.string(),
    fecha: z.coerce.date(),
    etiquetas: z.array(z.string()).default([]),
    minutos: z.number().optional(),
    borrador: z.boolean().default(false),
  }),
});

export const collections = { blog };
