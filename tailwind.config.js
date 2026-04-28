/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   '#080808',
          secondary: '#0f0f0f',
          elevated:  '#181818',
          highlight: '#242424',
        },
        cyan: {
          bright: '#4fc3f7',
          mid:    '#0099cc',
          dark:   '#0066aa',
        },
        red: {
          DEFAULT: '#ff2244',
          dark:    '#cc1133',
        },
        gold: {
          DEFAULT: '#ffe000',
        },
        boost:   '#00ff88',
        debuff:  '#ff2244',
        burn:    '#ff6633',
        para:    '#ffcc00',
        poison:  '#cc44ff',
        sleep:   '#6688aa',
        freeze:  '#aaddff',
        text: {
          primary:   '#ffffff',
          secondary: '#cccccc',
          muted:     '#999999',
        },
      },
      fontFamily: {
        sans: ['"Press Start 2P"', 'monospace'],
        mono: ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        'red-glow':    '0 0 10px rgba(255,34,68,0.4)',
        'red-strong':  '0 0 20px rgba(255,34,68,0.7)',
        'cyan-glow':   '0 0 12px rgba(79,195,247,0.4)',
        'cyan-strong': '0 0 24px rgba(79,195,247,0.6)',
        'pixel':       '3px 3px 0 #cc1133',
        'card':        '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        app: '8px',
      },
    },
  },
  plugins: [],
}
