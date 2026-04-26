import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        soren: {
          app:      'var(--bg-app)',
          bg:       'var(--bg-app)',
          sidebar:  'var(--bg-sidebar)',
          card:     'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          border:   'var(--border)',
          accent:   'var(--accent)',
          text:     'var(--text)',
          muted:    'var(--muted)',
          subtle:   'var(--subtle)',
        },
      },
      fontFamily: {
        sans:       ['var(--font-jakarta)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        fraunces:   ['var(--font-fraunces)', 'Georgia', 'serif'],
        outfit:     ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        montserrat: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        jakarta:    ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
