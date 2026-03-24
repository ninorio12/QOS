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
        qos: {
          bg: '#121721',
          sidebar: '#0C1017',
          card: '#1A2235',
          border: '#232D3F',
          blue: '#3462EE',
          yellow: '#EFE347',
          teal: '#4A91A8',
          sage: '#EAF0DC',
          green: '#C8F135',
          muted: '#8896AB',
          subtle: '#3D4F6B',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Lufga', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
