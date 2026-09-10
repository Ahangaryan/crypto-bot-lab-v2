/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          950: '#0a0e17',
          900: '#0f1420',
          850: '#141a28',
          800: '#1a2030',
          700: '#252d40',
          600: '#323c54',
          500: '#4a5568',
          400: '#6b7896',
          300: '#9ba5bc',
          200: '#cbd2e0',
          100: '#e8ebf2',
        },
        brand: {
          50: '#e6f9f7',
          100: '#ccf2ee',
          200: '#99e6dd',
          300: '#66d9cc',
          400: '#33ccba',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0a7a70',
          800: '#085f57',
          900: '#05443f',
        },
        accent: {
          400: '#f59e0b',
          500: '#f97316',
          600: '#ea580c',
        },
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'ticker': 'ticker 30s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
