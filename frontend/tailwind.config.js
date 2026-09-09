/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.65)',
          lightHover: 'rgba(255, 255, 255, 0.85)',
          dark: 'rgba(15, 23, 42, 0.65)',
          darkHover: 'rgba(30, 41, 59, 0.75)',
          borderLight: 'rgba(255, 255, 255, 0.4)',
          borderDark: 'rgba(255, 255, 255, 0.12)',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Indigo primary
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          teal: '#0d9488',
          purple: '#9333ea',
          emerald: '#10b981',
          rose: '#f43f5e',
          amber: '#f59e0b',
          cyan: '#06b6d4',
        }
      },
      backdropBlur: {
        xs: '2px',
        glass: '18px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        glassDark: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        glassSm: '0 4px 16px 0 rgba(31, 38, 135, 0.1)',
        glassGlow: '0 0 25px rgba(99, 102, 241, 0.35)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
