import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0F0F12',
        surface: '#16161A',
        card:    '#1C1C22',
        border:  '#2A2A33',
        input:   '#22222A',
        accent:  '#22C55E',
        blue:    '#3B82F6',
        amber:   '#F59E0B',
        red:     '#EF4444',
        purple:  '#8B5CF6',
        text:    '#F0F0F5',
        muted:   '#6B6B80',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
