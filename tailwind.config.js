const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{js,jsx}',
      './components/**/*.{js,jsx}',
      './app/**/*.{js,jsx}',
      './src/**/*.{js,jsx}',
      './features/**/*.{js,jsx}',
      './lib/**/*.{js,jsx}',
    ],
    prefix: "",
    theme: {
      container: {
        center: true,
        padding: '2rem',
        screens: {
          '2xl': '1400px'
        }
      },
      extend: {
        colors: {
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          primary: {
            DEFAULT: 'hsl(var(--primary))',
            foreground: 'hsl(var(--primary-foreground))'
          },
          secondary: {
            DEFAULT: 'hsl(var(--secondary))',
            foreground: 'hsl(var(--secondary-foreground))'
          },
          destructive: {
            DEFAULT: 'hsl(var(--destructive))',
            foreground: 'hsl(var(--destructive-foreground))'
          },
          muted: {
            DEFAULT: 'hsl(var(--muted))',
            foreground: 'hsl(var(--muted-foreground))'
          },
          accent: {
            DEFAULT: 'hsl(var(--accent))',
            foreground: 'hsl(var(--accent-foreground))',
            // The app's one signature brand accent (Settings > Appearance), user-chosen and
            // stored as a hex color. --accent-h/--accent-s carry its hue/saturation; each shade
            // below is that hue/saturation at a fixed lightness, mirroring Tailwind's own cyan
            // ladder so existing spacing/contrast choices (accent-300 text, accent-400 hover,
            // etc.) keep working for any color the user picks. See DESIGN.md.
            50: 'hsl(var(--accent-h) var(--accent-s) 96% / <alpha-value>)',
            100: 'hsl(var(--accent-h) var(--accent-s) 90% / <alpha-value>)',
            200: 'hsl(var(--accent-h) var(--accent-s) 82% / <alpha-value>)',
            300: 'hsl(var(--accent-h) var(--accent-s) 69% / <alpha-value>)',
            400: 'hsl(var(--accent-h) var(--accent-s) 53% / <alpha-value>)',
            500: 'hsl(var(--accent-h) var(--accent-s) 43% / <alpha-value>)',
            600: 'hsl(var(--accent-h) var(--accent-s) 36% / <alpha-value>)',
            700: 'hsl(var(--accent-h) var(--accent-s) 31% / <alpha-value>)',
            800: 'hsl(var(--accent-h) var(--accent-s) 27% / <alpha-value>)',
            900: 'hsl(var(--accent-h) var(--accent-s) 24% / <alpha-value>)',
            950: 'hsl(var(--accent-h) var(--accent-s) 15% / <alpha-value>)',
          },
          popover: {
            DEFAULT: 'hsl(var(--popover))',
            foreground: 'hsl(var(--popover-foreground))'
          },
          card: {
            DEFAULT: 'hsl(var(--card))',
            foreground: 'hsl(var(--card-foreground))'
          },
          chart: {
            '1': 'hsl(var(--chart-1))',
            '2': 'hsl(var(--chart-2))',
            '3': 'hsl(var(--chart-3))',
            '4': 'hsl(var(--chart-4))',
            '5': 'hsl(var(--chart-5))'
          },
          sidebar: {
            DEFAULT: 'hsl(var(--sidebar-background))',
            foreground: 'hsl(var(--sidebar-foreground))',
            primary: 'hsl(var(--sidebar-primary))',
            'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
            accent: 'hsl(var(--sidebar-accent))',
            'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
            border: 'hsl(var(--sidebar-border))',
            ring: 'hsl(var(--sidebar-ring))'
          }
        },
        borderRadius: {
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)'
        },
        keyframes: {
          'accordion-down': {
            from: {
              height: '0'
            },
            to: {
              height: 'var(--radix-accordion-content-height)'
            }
          },
          'accordion-up': {
            from: {
              height: 'var(--radix-accordion-content-height)'
            },
            to: {
              height: '0'
            }
          },
          marquee: {
            from: { transform: 'translateX(0)' },
            to: { transform: 'translateX(-50%)' },
          },
        },
        animation: {
          'accordion-down': 'accordion-down 0.2s ease-out',
          'accordion-up': 'accordion-up 0.2s ease-out',
          marquee: 'marquee 26s linear infinite',
        }
      }
    },
    plugins: [
      require("tailwindcss-animate"),
      // The app is dark-by-default with every existing utility class unprefixed (see DESIGN.md) —
      // rather than inverting that (which Tailwind's built-in `dark:` assumes: light-by-default,
      // dark opt-in), `light:` is the opt-in variant instead, active whenever `<html>` carries the
      // `light` class (set by next-themes). Existing `dark:` usage (a couple of shadcn primitives)
      // is untouched and keeps meaning ".dark ancestor".
      plugin(({ addVariant }) => {
        addVariant('light', ':is(.light &)')
        // Glass theme — same mechanism as `light:`, so until a surface gets a `glassy:` class
        // added, <html class="glassy"> renders identically to Dark (nothing to break).
        addVariant('glassy', ':is(.glassy &)')
      }),
    ],
  }