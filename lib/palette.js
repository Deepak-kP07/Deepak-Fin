// Shared swatch options for anything with a user-pickable accent color
// (accounts, categories, credit cards).
export const PALETTE = ['#22d3ee', '#a78bfa', '#f59e0b', '#f472b6', '#34d399', '#60a5fa', '#fb7185', '#facc15']

// A user-picked entity color (credit card, portfolio, category) can legitimately be a near-black
// "black card" style choice — that's fine on the entity's own face/badge, but a mix-bar segment
// or legend dot exists purely to convey color as information, and a near-black fill on this
// app's near-black ground (or near-white on light theme) reads as empty no matter how strong the
// surrounding ring is. Clamping lightness into an always-visible band fixes that — but a literal
// black/white/gray source has zero saturation to begin with, so lightness-clamping alone still
// only yields a flat gray, not a real color to tell entities apart by. For that near-grayscale
// case (s below ~12%), the exact same rose Tailwind's `bg-rose-400` renders (#fb7185) is used —
// already the app's convention for a liability with no color of its own (loans, "high
// utilisation" severity) — so a black card's swatch is pixel-identical to every other rose used
// for debt elsewhere on the page, not just a close approximation reconstructed via HSL math.
export function visibleSwatch(hex, isLight = false) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return hex
  const int = parseInt(m[1], 16)
  const r = ((int >> 16) & 255) / 255, g = ((int >> 8) & 255) / 255, b = (int & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  if (s < 0.12) return '#fb7185'
  const minL = isLight ? 0.3 : 0.32
  const maxL = isLight ? 0.72 : 0.78
  const clampedL = Math.min(maxL, Math.max(minL, l))
  if (clampedL === l) return hex.startsWith('#') ? hex : `#${hex}`
  const c = (1 - Math.abs(2 * clampedL - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m2 = clampedL - c / 2
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const toHex = (v) => Math.round((v + m2) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`
}
