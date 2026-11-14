import { twMerge } from 'tailwind-merge'

// Web class strings use `light:` / `glassy:` variants keyed off a class on <html>. Native has no
// ancestor selectors, so tw() resolves them for the active theme: a variant class is kept (minus
// its prefix) only in its theme, and twMerge lets it override the default-theme class it pairs
// with — exactly how the CSS cascade behaves on the web. Results are cached per theme.
let currentTheme = 'dark'
// The web's glass component classes, expanded into plain utilities so twMerge can see that they
// replace the card's dark background/border (otherwise both stayed and the dark one often won,
// which made Glass look inconsistent). Values follow app/globals.css's .glass-* rules.
const GLASS = {
  'glass-card': 'bg-white/[.07] border-white/10',
  'glass-nav': 'bg-[#0c0f18]/[.78] border-white/[.09]',
  'glass-pill': 'bg-white/[.07] border-white/[.11]',
  'glass-hero': 'bg-accent-500/[.16] border-accent-300/[.22]',
  'glass-btn-primary': '',
}
export const GLASS_CLASSES = Object.values(GLASS).join(' ')
const cache = new Map()

export function setTwTheme(theme) {
  if (theme !== currentTheme) { currentTheme = theme; cache.clear() }
}
export const getTwTheme = () => currentTheme

function resolve(token) {
  // Variant segments can be nested with others, e.g. `hover:light:bg-black/5`.
  if (!token.includes('light:') && !token.includes('glassy:')) return token
  const parts = token.split(':')
  const out = []
  for (const p of parts) {
    if (p === 'light') { if (currentTheme !== 'light') return null; continue }
    if (p === 'glassy') { if (currentTheme !== 'glass') return null; continue }
    out.push(p)
  }
  return out.join(':')
}

export function tw(...inputs) {
  const key = inputs.filter(Boolean).join(' ')
  if (!key) return ''
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const base = []
  const variants = []
  for (const token of key.split(/\s+/)) {
    if (!token) continue
    const r = resolve(token)
    if (r === null) continue
    const expanded = GLASS[r] ?? r
    ;(r === token ? base : variants).push(expanded)
  }
  const result = twMerge(base.join(' '), variants.join(' '))
  cache.set(key, result)
  return result
}
