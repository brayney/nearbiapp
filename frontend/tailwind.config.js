/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#10151B',
          soft: '#161D26',
          line: '#232B35',
        },
        paper: '#F7F5F1',
        coral: {
          DEFAULT: '#FF5A5F',
          dim: '#E14A50',
          glow: 'rgba(255,90,95,0.35)',
        },
        teal: {
          DEFAULT: '#1F6F6B',
          bright: '#2FA39C',
          glow: 'rgba(47,163,156,0.45)',
        },
        slate: {
          mute: '#5B6570',
          faint: '#8B95A1',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      keyframes: {
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(47,163,156,0.55)' },
          '70%': { boxShadow: '0 0 0 8px rgba(47,163,156,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(47,163,156,0)' },
        },
      },
      animation: {
        presence: 'pulseRing 2.2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
