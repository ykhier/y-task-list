import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          primary:   '#3B82F6',
          secondary: '#60A5FA',
          cta:       '#F97316',
        },
      },
      animation: {
        'fade-in':  'fade-in 0.2s ease forwards',
        'slide-up': 'slide-up 0.25s ease forwards',
      },
    },
  },
  plugins: [],
}

export default config
