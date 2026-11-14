import { twMerge } from 'tailwind-merge'

// Web class strings use `light:` / `glassy:` variants keyed off a class on <html>. Native has no
// ancestor selectors, so tw() resolves them for the active theme: a variant class is kept (minus
// its prefix) only in its theme, and twMerge lets it override the default-theme class it pairs
// with — exactly how the CSS cascade behaves on the web. Results are cached per theme.
let currentTheme = 'dark'
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
    ;(r === token ? base : variants).push(r)
  }
  const result = twMerge(base.join(' '), variants.join(' '))
  cache.set(key, result)
  return result
}
