import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { noteSchema } from './lib/schemas.mjs';

export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: noteSchema
  })
};
