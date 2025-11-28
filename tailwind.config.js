/** @type {import('tailwindcss').Config} */
module.exports = {
  // Content paths for purging unused CSS
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './public/**/*.html',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],

  // Safelist dynamic classes that might not be detected
  safelist: [
    // Dynamic bg colors
    'bg-violet-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-red-500',
    'bg-yellow-500',
    // Dynamic text colors
    'text-violet-400',
    'text-blue-400',
    'text-green-400',
    'text-red-400',
    'text-yellow-400',
    // Difficulty colors
    'text-green-600',
    'text-yellow-600',
    'text-red-600',
    // Border colors
    'border-violet-500',
    'border-blue-500',
    // Radix UI theme colors that might be dynamic
    {
      pattern: /(bg|text|border)-(violet|blue|green|red|yellow|slate|gray)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    // Safelist spacing classes used dynamically in Flex and Text components
    {
      pattern: /^(m|p)(t|b|l|r|x|y)?-\d+$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        // ========== RADIX UI DARK SLATE SCALE ==========
        // Based on Radix Colors slate-dark scale
        app: {
          // Backgrounds (Radix slate-dark scale)
          bg: {
            primary: '#111113',      // slate-dark-1 - App background
            secondary: '#18191b',    // slate-dark-2 - Subtle background
            card: '#212225',         // slate-dark-3 - UI element background
            input: '#272a2d',        // slate-dark-4 - Hovered UI element
            elevated: '#2e3135',     // slate-dark-5 - Active / Selected
            hover: '#353a3f',        // slate-dark-6 - Subtle borders
          },
          // Text colors (Radix slate-dark scale)
          text: {
            primary: '#ededef',      // slate-dark-12 - High contrast text
            secondary: '#b8b9bc',    // slate-dark-11 - Low contrast text
            muted: '#696c75',        // slate-dark-9 - Disabled / placeholder
            inverse: '#0f172a',      // For light backgrounds
          },
          // Border colors (Radix slate-dark scale)
          border: {
            DEFAULT: '#3e4349',      // slate-dark-7 - borders
            light: '#4a4f56',        // slate-dark-8 - Focus rings
            dark: '#2e3135',         // slate-dark-5 - Subtle borders
            focus: '#6e77e0',        // indigo-dark-8 - Focus state
          },
          // State colors (keep existing brand colors)
          state: {
            success: '#22c55e',      // green-500
            warning: '#f59e0b',      // amber-500
            error: '#ef4444',        // red-500
            info: '#3b82f6',         // blue-500
          }
        },

        // Keep existing custom colors for compatibility
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
        success: 'var(--success-color)',
        danger: 'var(--danger-color)',
        error: 'var(--danger-color)',
        warning: 'var(--warning-color)',
        info: 'var(--info-color)',
        background: 'var(--bg-primary)',
        surface: 'var(--bg-card)',
        border: 'var(--border-light)',
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
