/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        badge: {
          government: 'rgb(59 130 246)',
          academic: 'rgb(34 197 94)',
          market: 'rgb(245 158 11)',
          'finsight-kb': 'rgb(139 92 246)',
        },
      },
    },
  },
  plugins: [],
};
