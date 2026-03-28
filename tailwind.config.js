/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0C0C0C',
          raised: '#161615',
          overlay: '#1E1E1D',
          border: '#2A2A28',
        },
        text: {
          primary: '#F5F3F0',
          secondary: '#A8A69F',
          muted: '#6B6B67',
        },
        accent: {
          DEFAULT: '#C4A265',
          hover: '#D4B275',
          muted: 'rgba(196, 162, 101, 0.2)',
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        body: ['"General Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': [
          'clamp(3rem, 8vw, 6rem)',
          { lineHeight: '1.05', letterSpacing: '-0.03em' },
        ],
        'display-md': [
          'clamp(2rem, 4vw, 3rem)',
          { lineHeight: '1.1', letterSpacing: '-0.02em' },
        ],
      },
      transitionTimingFunction: {
        luxury: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
