/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep near-black base
        base: {
          950: '#05070a',
          900: '#0a0e14',
          850: '#0d1219',
          800: '#111821',
          750: '#161f2a',
          700: '#1c2733',
        },
        // Graphite panels
        graphite: {
          900: '#0f141b',
          800: '#141b24',
          700: '#1a232e',
          600: '#222e3b',
          500: '#2c3947',
          400: '#3a4858',
        },
        // Electric cyan/blue primary
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        blue: {
          400: '#3b82f6',
          500: '#2563eb',
          600: '#1d4ed8',
        },
        // Status colors
        success: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'wave': 'wave 2s ease-in-out infinite',
        'scan': 'scan 3s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleX(1)', opacity: '0.6' },
          '50%': { transform: 'scaleX(1.1)', opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
