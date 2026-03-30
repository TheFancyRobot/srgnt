/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/**/*.{html,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        srgnt: {
          50: 'var(--color-srgnt-50)',
          100: 'var(--color-srgnt-100)',
          200: 'var(--color-srgnt-200)',
          300: 'var(--color-srgnt-300)',
          400: 'var(--color-srgnt-400)',
          500: 'var(--color-srgnt-500)',
          600: 'var(--color-srgnt-600)',
          700: 'var(--color-srgnt-700)',
          800: 'var(--color-srgnt-800)',
          900: 'var(--color-srgnt-900)',
          950: 'var(--color-srgnt-950)',
        },
        surface: {
          primary: 'var(--color-surface-primary)',
          secondary: 'var(--color-surface-secondary)',
          tertiary: 'var(--color-surface-tertiary)',
          elevated: 'var(--color-surface-elevated)',
          overlay: 'var(--color-surface-overlay)',
          brand: 'var(--color-surface-brand)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
          brand: 'var(--color-text-brand)',
        },
        border: {
          DEFAULT: 'var(--color-border-default)',
          default: 'var(--color-border-default)',
          muted: 'var(--color-border-muted)',
          strong: 'var(--color-border-strong)',
          brand: 'var(--color-border-brand)',
        },
        success: {
          50: 'var(--color-success-50)',
          100: 'var(--color-success-100)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          DEFAULT: 'var(--color-success-500)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          100: 'var(--color-warning-100)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          DEFAULT: 'var(--color-warning-500)',
        },
        error: {
          50: 'var(--color-error-50)',
          100: 'var(--color-error-100)',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          DEFAULT: 'var(--color-error-500)',
        },
        info: {
          50: 'var(--color-info-50)',
          100: 'var(--color-info-100)',
          500: 'var(--color-info-500)',
          600: 'var(--color-info-600)',
          DEFAULT: 'var(--color-info-500)',
        },
      },
      fontFamily: {
        display: ['Barlow', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Barlow', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        glow: 'var(--shadow-glow)',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fade-in 400ms cubic-bezier(0.4, 0, 0.2, 1) both',
        'slide-up': 'slide-up 500ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-left': 'slide-in-left 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 350ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'status-pulse': 'status-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
