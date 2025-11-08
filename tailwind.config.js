/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors from existing CSS variables
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
        accent: 'var(--accent-color)',
        success: 'var(--success-color)',
        error: 'var(--error-color)',
        warning: 'var(--warning-color)',
        info: 'var(--info-color)',
        background: 'var(--bg-color)',
        surface: 'var(--surface-color)',
        border: 'var(--border-color)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      spacing: {
        // Custom spacing from CSS variables
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'full': 'var(--radius-full)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      fontFamily: {
        sans: ['var(--font-primary)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
      },
      animation: {
        // Animations from animations.css
        'fade-in': 'fadeIn var(--animation-duration-normal) ease-out',
        'fade-out': 'fadeOut var(--animation-duration-normal) ease-out',
        'slide-in-up': 'slideInUp var(--animation-duration-normal) ease-out',
        'slide-in-down': 'slideInDown var(--animation-duration-normal) ease-out',
        'slide-in-left': 'slideInLeft var(--animation-duration-normal) ease-out',
        'slide-in-right': 'slideInRight var(--animation-duration-normal) ease-out',
        'pulse': 'pulse var(--animation-duration-slow) ease-in-out infinite',
        'spin': 'spin var(--animation-duration-normal) linear infinite',
      },
      transitionDuration: {
        'fast': 'var(--animation-duration-fast)',
        'normal': 'var(--animation-duration-normal)',
        'slow': 'var(--animation-duration-slow)',
      },
    },
  },
  plugins: [],
  // Dark mode using CSS class
  darkMode: 'class',
};
