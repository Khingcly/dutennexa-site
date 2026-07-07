/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        navy: 'var(--color-navy)',
        teal: 'var(--color-teal)',
        'purple-overlay': 'var(--color-purple-overlay)',
      },
    },
  },
  plugins: [],
};
