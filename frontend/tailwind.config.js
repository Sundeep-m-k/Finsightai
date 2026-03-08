/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        gold: {
          300: '#f5d97a',
          400: '#e8c547',
          500: '#d4a849',
          600: '#b8892e',
        },
        cream: {
          50:  '#fefdfb',
          100: '#faf7f2',
          200: '#f2ede4',
          300: '#e8e0d4',
          400: '#d8cfc0',
        },
        badge: {
          government:  'rgb(59 130 246)',
          academic:    'rgb(34 197 94)',
          market:      'rgb(245 158 11)',
          'finsight-kb': 'rgb(139 92 246)',
        },
      },
    },
  },
  plugins: [],
};
