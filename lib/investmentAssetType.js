// Best-effort auto-classification for holdings that are actually gold, not equity, so the
// Allocation card's Gold bucket doesn't require hand-tagging every known gold ETF/SGB. Kept
// deliberately conservative (a small explicit allowlist, not a "contains GOLD" substring match)
// because a false positive here silently misclassifies a real stock — e.g. Goldiam International
// (NSE: GOLDIAM) is a jewellery manufacturer, not a gold ETF, despite the name. A false negative
// just means the holding stays 'equity' until manually corrected via the Asset type dropdown,
// which is the far safer failure mode. Extend GOLD_SYMBOLS as more known tickers come up.
const GOLD_SYMBOLS = new Set([
  'GOLDBEES', 'GOLDIETF', 'HDFCGOLD', 'SETFGOLD', 'GOLDSHARE', 'AXISGOLD', 'KOTAKGOLD', 'IDBIGOLD', 'QGOLDHALF',
])

export function detectAssetType(symbol) {
  const s = String(symbol || '').trim().toUpperCase()
  if (!s) return 'equity'
  // Sovereign Gold Bonds are consistently ticker-prefixed "SGB" on NSE (e.g. SGBAUG28, SGBMAY29I).
  if (s.startsWith('SGB')) return 'gold'
  if (GOLD_SYMBOLS.has(s)) return 'gold'
  return 'equity'
}
