/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        grape: '#7c3aed',
        bubble: '#ec4899',
        tangerine: '#f97316',
        sunny: '#fbbf24',
        mint: '#34d399',
        sky: '#38bdf8',
        ink: '#1e1b4b',
      },
      boxShadow: {
        playful: '0 10px 0 0 rgba(0,0,0,0.15)',
        'playful-sm': '0 6px 0 0 rgba(0,0,0,0.15)',
        glow: '0 0 40px 0 rgba(255,255,255,0.45)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        wiggle: 'wiggle 1s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 12s ease infinite',
        pop: 'pop 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
