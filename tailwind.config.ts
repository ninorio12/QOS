import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: 'class',
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
          sidebar:  'var(--bg-sidebar)',
          card:     'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          border:   'var(--border)',
          accent:   'var(--accent)',
          text:     'var(--text)',
          muted:    'var(--muted)',
          subtle:   'var(--subtle)',
          primary:  'var(--text)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
}

export default config