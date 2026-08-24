// Drives the app's single global accent color (Settings > Appearance, DESIGN.md). The user
// picks one hex value; everything downstream (the whole `accent-*` Tailwind scale in
// tailwind.config.js) is generated from just its hue and saturation via CSS custom properties,
// so every existing accent-300/400/etc. usage across the app repaints without per-component work.

// The preset swatches. Gold is the recommended default (see accent_color's DB default and
// DEFAULT_ACCENT below) — chosen deliberately for a premium black-and-gold identity. Worth
// knowing: gold's hue sits close to DESIGN.md's amber "pending" status tint, which Cyan (the
// app's original default, still offered here) didn't — a gold action button and an amber
// pending badge will read as close cousins rather than clearly distinct. Kept anyway because
// that's the explicit brief; if it ever reads as confusing in practice, the pending tint is the
// side to shift, not the brand accent. Blue, Green, and Orange are the three colors from an
// earlier reference mockup round; Violet and Rose round out the restrained options. Anything
// else is reachable through the custom color picker.
export const DEFAULT_ACCENT = '#d4af37'

export const ACCENT_PRESETS = [
  { name: 'Gold', hex: DEFAULT_ACCENT },
  { name: 'Cyan', hex: '#67e8f9' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Violet', hex: '#a78bfa' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Rose', hex: '#fb7185' },
]

export function hexToHs(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return hexToHs(DEFAULT_ACCENT)
  const int = parseInt(m[1], 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0))
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  return { h: Math.round(h), s: Math.round(s * 100) }
}

// Applies the accent to the document immediately (before/without a network round trip) so
// switching in Settings feels instant, and so the saved color applies on every future load.
export function applyAccentColor(hex) {
  if (typeof document === 'undefined') return
  const { h, s } = hexToHs(hex)
  document.documentElement.style.setProperty('--accent-h', String(h))
  document.documentElement.style.setProperty('--accent-s', `${s}%`)
}
