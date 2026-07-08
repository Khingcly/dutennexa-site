/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Brand core + bridge/accent hues. Literal hex (not var()) so Tailwind
        // can compute opacity-modifier utilities (bg-teal/30, etc.). Keep in
        // sync with the values in src/styles/tokens.css.
        navy: '#002141',
        'navy-800': '#052A5A',
        'navy-900': '#001628',
        indigo: '#1E5AE8',
        violet: '#7C5CFF',
        'violet-text': '#9C86FF',
        teal: '#3FE0D0',
        mint: '#8BF5E8',
        'purple-overlay': 'var(--purple-overlay)',
        'surface-card': 'var(--surface-card)',
        'border-soft': 'var(--border-soft)',
        'border-teal': 'var(--border-teal)',
        'border-violet': 'var(--border-violet)',
        'text-dim': 'var(--text-dim)',
        'text-faint': 'var(--text-faint)',
      },
      backgroundImage: {
        'grad-hero': 'var(--grad-hero)',
        'grad-accent': 'var(--grad-accent)',
        'grad-ai': 'var(--grad-ai)',
      },
      fontSize: {
        h1: ['clamp(2.2rem, 5vw, 3.4rem)', { fontWeight: '700' }],
        h2: ['clamp(1.6rem, 3.5vw, 2.2rem)', { fontWeight: '700' }],
      },
    },
  },
  plugins: [],
};
