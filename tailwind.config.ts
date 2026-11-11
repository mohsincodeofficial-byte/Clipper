/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        dock: {
          bg: '#11131a',
          border: 'rgba(255, 255, 255, 0.16)',
          card: '#1d212d',
          'card-hover': '#272d3d',
        }
      },
      animation: {
        'slide-down': 'slideDown 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 140ms cubic-bezier(0.4, 0, 1, 1)',
        'fade-in': 'fadeIn 150ms ease',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-10px)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    }
  },
  plugins: []
}
