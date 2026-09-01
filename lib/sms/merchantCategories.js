// Keyword → category mapping, used to guess a category from a parsed transaction's merchant text
// (lib/server/genericCrud.js's ingestion enrichment) when nothing more specific is known.
// Deliberately a flat, starter keyword list, not exhaustive — add to it as real merchant names
// show up that aren't caught yet (same "refine against reality" spirit as the SMS patterns
// themselves — see lib/sms/patterns.seed.js).
export const MERCHANT_CATEGORY_KEYWORDS = [
  { keywords: ['zerodha', 'groww', 'upstox', 'angel one', 'angelone', 'icicidirect', 'kite', 'zerodha coin'], categoryName: 'Investment', categoryType: 'expense' },
  { keywords: ['flipkart', 'amazon', 'myntra', 'ajio', 'meesho', 'nykaa'], categoryName: 'Shopping', categoryType: 'expense' },
  { keywords: ['swiggy', 'zomato', 'bigbasket', 'blinkit', 'zepto', 'dominos', 'pizza'], categoryName: 'Food & dining', categoryType: 'expense' },
  { keywords: ['netflix', 'spotify', 'hotstar', 'prime video', 'sonyliv', 'bookmyshow'], categoryName: 'Entertainment', categoryType: 'expense' },
  { keywords: ['uber', 'ola', 'rapido', 'irctc', 'redbus'], categoryName: 'Transport', categoryType: 'expense' },
  { keywords: ['electricity', 'bescom', 'jio', 'airtel', 'vodafone', 'broadband', 'gas board', 'water board'], categoryName: 'Bills & utilities', categoryType: 'expense' },
  { keywords: ['apollo', 'pharmeasy', 'pharmacy', 'hospital', 'clinic', 'medplus'], categoryName: 'Health', categoryType: 'expense' },
]

// Best-effort only — a raw UPI handle like "7989101143@pty" (no human-readable merchant name in
// the SMS at all) legitimately has nothing to match against; the caller falls back to a generic
// category in that case rather than leaving it blank (see genericCrud.js).
export function guessCategoryForMerchant(merchant) {
  if (!merchant) return null
  const text = merchant.toLowerCase()
  const match = MERCHANT_CATEGORY_KEYWORDS.find((entry) => entry.keywords.some((k) => text.includes(k)))
  return match ? { name: match.categoryName, type: match.categoryType } : null
}
