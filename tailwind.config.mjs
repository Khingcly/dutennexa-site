/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // navy/teal are literal hex (not var()) so Tailwind can compute
        // opacity-modifier utilities (bg-teal/10, etc.) — must stay in sync
        // with the values in src/styles/tokens.css.
        navy: '#002141',
        'navy-800': '#04345c',
        teal: '#3FE0D0',
        'purple-overlay': 'var(--color-purple-overlay)',
        'surface-card': 'var(--surface-card)',
        'border-teal-soft': 'var(--border-teal-soft)',
        'text-dim': 'var(--text-dim)',
        'text-faint': 'var(--text-faint)',
      },
      fontSize: {
        h1: ['clamp(2.2rem, 5vw, 3.4rem)', { fontWeight: '700' }],
        h2: ['clamp(1.6rem, 3.5vw, 2.2rem)', { fontWeight: '700' }],
      },
    },
  },
  plugins: [],
};
