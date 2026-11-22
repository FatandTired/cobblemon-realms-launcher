/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#0b0f19',
          card: '#111827',
          elevated: '#1a2234',
          border: '#243049'
        },
        cobble: {
          red: '#ef4444',
          darkRed: '#991b1b',
          cyan: '#06b6d4',
          amber: '#f59e0b',
          emerald: '#10b981',
          violet: '#8b5cf6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      boxShadow: {
        'glow-red': '0 0 20px -5px rgba(239, 68, 68, 0.4)',
        'glow-cyan': '0 0 20px -5px rgba(6, 182, 212, 0.4)',
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.4)'
      }
    },
  },
  plugins: [],
}
