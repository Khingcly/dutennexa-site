import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// Hybrid: every page is pre-rendered static by default; only routes that opt
// out with `export const prerender = false` (the AI advisor API) run on Vercel
// serverless functions.
export default defineConfig({
  output: 'hybrid',
  adapter: vercel(),
  integrations: [tailwind()],
});
