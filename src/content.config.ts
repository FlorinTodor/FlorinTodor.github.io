import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string(),
    fecha: z.coerce.date(),
    etiquetas: z.array(z.string()).default([]),
    minutos: z.number().optional(),
    borrador: z.boolean().default(false),
  }),
});

export const collections = { blog };
