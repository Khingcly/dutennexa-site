import { defineCollection, z } from 'astro:content';

// Schema for future posts. No posts exist yet, this just makes the
// collection ready to receive them (the content engine feeds it later).
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.date(),
    author: z.enum(['David Akporohwo', 'Kingsley Andy']),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
