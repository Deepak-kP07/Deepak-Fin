// Same design tokens as the web app (../tailwind.config.js, DESIGN.md), compiled for native by
// NativeWind. Screens are ported with their web class strings intact; theme variants (`light:`,
// `glassy:`) are resolved at runtime by src/lib/tw.js instead of CSS ancestor selectors (native has
// none). So every class those variants can switch to must also exist un-prefixed: the content
// transform below strips the prefixes while scanning, so Tailwind generates the bare classes.
const fs = require('fs')
const path = require('path')
const ACCENT_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

// Every `light:x` / `glassy:x` (also nested, e.g. `hover:light:x`) used in src/ → safelist the bare
// class so it's generated. (Tailwind's content `transform` didn't apply under this setup, so the
// classes those variants switch to were silently missing — that broke the Light theme.)
function themeVariantSafelist() {
  const out = new Set()
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.jsx?$/.test(entry.name)) {
        const src = fs.readFileSync(full, 'utf8')
        for (const m of src.matchAll(/[\w:-]*\b(?:light|glassy):[^\s"'`{}()]+/g)) {
          const bare = m[0].split(':').filter((p) => p !== 'light' && p !== 'glassy').join(':')
          if (bare) out.add(bare)
        }
      }
    }
  }
  walk(path.join(__dirname, 'src'))
  // The plain utilities src/lib/tw.js expands the glass-* classes into.
  'bg-white/[.07] border-white/10 bg-[#0c0f18]/[.78] border-white/[.09] border-white/[.11] bg-accent-500/[.16] border-accent-300/[.22]'.split(' ').forEach((c) => out.add(c))
  return [...out]
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  safelist: themeVariantSafelist(),
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // The accent scale is set per user at runtime (src/lib/accent.js → CSS variables), from
        // the same hue/saturation + lightness steps as the web's hsl(var(--accent-h) …) scale.
        accent: Object.fromEntries(ACCENT_STEPS.map((n) => [n, `rgb(var(--accent-${n}) / <alpha-value>)`])),
      },
    },
  },
  plugins: [
    // Native stand-ins for the web's glass-theme component classes (app/globals.css). No
    // backdrop-filter on native, so blur is approximated with translucency + border.
    ({ addUtilities }) => addUtilities({
      '.glass-card': { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' },
      '.glass-nav': { backgroundColor: 'rgba(12,15,24,0.78)', borderColor: 'rgba(255,255,255,0.09)' },
      '.glass-pill': { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.11)' },
      '.glass-hero': { backgroundColor: 'rgb(var(--accent-500) / 0.14)', borderColor: 'rgb(var(--accent-300) / 0.22)' },
      '.glass-btn-primary': {},
    }),
  ],
}
