import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // HM Rubber brand colors
        'hm-green':     '#BCCF00',
        'hm-green-alt': '#B8CB00',
        'hm-green-hover': '#A8B800',
        'hm-black':     '#000000',
        'hm-white':     '#FFFFFF',
        // Grayscale - text
        'hm-gray-900':  '#1F1F1F',
        'hm-gray-800':  '#222222',
        'hm-gray-700':  '#333333',
        'hm-gray-600':  '#444444',
        'hm-gray-500':  '#54595F',
        'hm-gray-400':  '#666666',
        'hm-gray-300':  '#7A7A7A',
        // Grayscale - backgrounds
        'hm-bg-light':  '#FFFFFF',
        'hm-bg-soft':   '#F9F9F9',
        'hm-bg-muted':  '#F5F5F5',
        'hm-bg-card':   '#EFEFEF',
        'hm-bg-cool':   '#F1F4F9',
        // Legacy alias (keep for any remaining references)
        'hm-gray-100':  '#EFEFEF',
        // Rank colors (industrial)
        'rank-gold':    '#BCCF00',  // 1st — HM green
        'rank-silver':  '#333333',  // 2nd — dark gray
        'rank-bronze':  '#666666',  // 3rd — mid gray
        // Backward-compat podium aliases → light theme equivalents
        podium: {
          bg:        '#FFFFFF',
          card:      '#EFEFEF',
          text:      '#1F1F1F',
          secondary: '#666666',
          gold:      '#BCCF00',
          silver:    '#333333',
          bronze:    '#666666',
        },
      },
      fontFamily: {
        sans:    ['Roboto', 'sans-serif'],
        display: ['"Roboto Condensed"', 'sans-serif'],
        mono:    ['"Roboto Slab"', 'serif'],
        btn:     ['Montserrat', 'sans-serif'],
      },
      fontSize: {
        '10xl': '10rem',
      },
      borderRadius: {
        'hm': '3px',
      },
      letterSpacing: {
        'industrial': '0.05em',
      },
    },
  },
  plugins: [],
}

export default config
