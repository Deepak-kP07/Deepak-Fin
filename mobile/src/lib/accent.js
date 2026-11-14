import { vars } from 'nativewind'

// Same accent maths as the web (lib/color.js + tailwind.config.js): the user's hex gives a hue and
// saturation; each accent-N step is hsl(h, s, fixed lightness). Native CSS variables are set as
// "r g b" channels (NativeWind's documented rgb(var() / <alpha-value>) pattern).
export const DEFAULT_ACCENT = '#d4af37'
const LIGHTNESS = { 50: 96, 100: 90, 200: 82, 300: 69, 400: 53, 500: 43, 600: 36, 700: 31, 800: 27, 900: 24, 950: 15 }

export function hexToHs(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return hexToHs(DEFAULT_ACCENT)
  const int = parseInt(m[1], 16)
  const r = ((int >> 16) & 255) / 255, g = ((int >> 8) & 255) / 255, b = (int & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return { h: 0, s: 0 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: Math.round(h * 60), s: Math.round(s * 100) }
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255))
}

// "rgb(r g b / a)" for one accent step — for places that need a plain colour value (icons, SVG).
export function accentColor(hex, step = 300, alpha = 1) {
  const { h, s } = hexToHs(hex)
  const [r, g, b] = hslToRgb(h, s, LIGHTNESS[step])
  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function accentVars(hex) {
  const { h, s } = hexToHs(hex)
  return vars(Object.fromEntries(Object.entries(LIGHTNESS).map(([step, l]) => [`--accent-${step}`, hslToRgb(h, s, l).join(' ')])))
}
