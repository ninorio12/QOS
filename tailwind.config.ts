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
          app:     '#EEF0EB',
          bg:      '#EEF0EB',
          sidebar: '#111111',
          card:    '#FFFFFF',
          border:  '#E5E7EB',
          accent:  '#E2FF8D',
          text:    '#111111',
          muted:   '#6B7280',
          subtle:  '#9CA3AF',
        },
      },
      fontFamily: {
        sans:     ['var(--font-inter)', 'system-ui', 'sans-serif'],
        fraunces: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}

export default config
