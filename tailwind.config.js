/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#060709',
          900: '#0a0b0e',
          850: '#0e1014',
          800: '#13151a',
          700: '#1a1d24',
          600: '#252932',
          500: '#363b47',
        },
        bone: {
          DEFAULT: '#ece6da',
          dim: '#a8a397',
          mute: '#6f6c66',
          faint: '#45434a',
        },
        amber: { DEFAULT: '#ffb454', deep: '#e08a1e', soft: '#ffd9a3' },
        ion: { DEFAULT: '#5fd4c4', deep: '#2a9d8f' },
        ember: { DEFAULT: '#ff6b5e', deep: '#d9483b' },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderColor: { hair: 'rgba(236,230,218,0.09)' },
      boxShadow: {
        glow: '0 0 40px -8px rgba(255,180,84,0.35)',
        panel: '0 1px 0 rgba(255,255,255,0.03) inset, 0 20px 60px -30px rgba(0,0,0,0.8)',
      },
      keyframes: {
        drift: { '0%,100%': { transform: 'translate3d(0,0,0)' }, '50%': { transform: 'translate3d(0,-6px,0)' } },
        pulseSoft: { '0%,100%': { opacity: '0.45' }, '50%': { opacity: '1' } },
      },
      animation: {
        drift: 'drift 7s ease-in-out infinite',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
