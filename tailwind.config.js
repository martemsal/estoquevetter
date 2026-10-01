/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        central1: {
          light: '#eff6ff',
          badge: '#dbeafe',
          border: '#3b82f6',
          text: '#1d4ed8'
        },
        central2: {
          light: '#f0fdf4',
          badge: '#dcfce7',
          border: '#22c55e',
          text: '#15803d'
        },
        central3: {
          light: '#faf5ff',
          badge: '#f3e8ff',
          border: '#a855f7',
          text: '#7e22ce'
        }
      },
      screens: {
        'tablet-p': {'raw': '(min-width: 600px) and (orientation: portrait)'},
        'tablet-l': {'raw': '(min-width: 900px) and (orientation: landscape)'},
      }
    },
  },
  plugins: [],
}
