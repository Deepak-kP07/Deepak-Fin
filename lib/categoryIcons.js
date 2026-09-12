import { UtensilsCrossed, Popcorn, HeartPulse, Plane, ShoppingBag, Home, Car, Lightbulb, BookOpen, Coins, Handshake, RefreshCw, PartyPopper, FileText, Sparkles } from 'lucide-react'

// Categories are freeform, per-user rows (db/schema.js) — "Zopkit", "Social life", "Her" — so
// this matches by keyword substring rather than an exact-match lookup table. `water bottle` (a
// snack) sits before the bare `bill`/`electric`/`gas` utility keywords for exactly that reason:
// substring matching can't tell "water bottle" from "water bill", so the more specific phrase
// has to win by coming first in the list.
const RULES = [
  { icon: UtensilsCrossed, keywords: ['food', 'dining', 'restaurant', 'restern', 'grocery', 'groceries', 'breakfast', 'lunch', 'dinner', 'tiffin', 'snack', 'sprite', 'juice', 'water bottle', 'biscuit', 'chocolate', 'mango', 'fruit', 'tea', 'coffee', 'chaat', 'murimixture'] },
  { icon: Handshake, keywords: ['loan', 'debt', 'lend', 'lended', 'borrow', 'emi', 'repaid', 'repayment', 'returned the', 'returned full'] },
  { icon: RefreshCw, keywords: ['balance sync', 'balance adjustment', 'adjustment'] },
  { icon: PartyPopper, keywords: ['chavathi', 'festival', 'birthday', 'diwali', 'pongal', 'sankranti', 'wedding', 'gift'] },
  { icon: FileText, keywords: ['card printout', 'xerox', 'photocopy', 'passport', 'aadhar', 'pan card', 'document'] },
  { icon: Popcorn, keywords: ['entertainment', 'movie', 'cinema', 'fun', 'game'] },
  { icon: HeartPulse, keywords: ['health', 'medical', 'doctor', 'pharmacy', 'hospital', 'medicine'] },
  { icon: Plane, keywords: ['travel', 'trip', 'flight', 'vacation', 'holiday', 'beach', 'bus stand', 'station', 'uber', 'ola '] },
  { icon: ShoppingBag, keywords: ['shopping', 'clothes', 'clothing'] },
  { icon: Home, keywords: ['home', 'rent', 'house', 'maintenance'] },
  { icon: Car, keywords: ['transport', 'fuel', 'petrol', 'diesel', 'car', 'taxi', 'cab', 'auto', 'metro', 'train', 'toll', 'parking'] },
  { icon: Lightbulb, keywords: ['bill', 'utilit', 'electric', 'gas', 'recharge'] },
  { icon: BookOpen, keywords: ['education', 'school', 'course', 'book', 'tuition'] },
  { icon: Coins, keywords: ['salary', 'income', 'invest', 'saving'] },
]
const DEFAULT_ICON = Sparkles

function matchIcon(text) {
  const n = (text || '').toLowerCase()
  return RULES.find((r) => r.keywords.some((k) => n.includes(k)))?.icon || null
}

// Used by the category picker's pop-in delight — a category was just chosen, so always show
// *something* concrete rather than falling through to nothing.
export function getCategoryIcon(categoryName) {
  return matchIcon(categoryName) || DEFAULT_ICON
}

// Used by transaction-row bubbles, where a plain income/expense direction arrow is already a
// meaningful fallback (see callers) — so this returns null instead of defaulting to a sparkle
// when nothing confidently matches, letting the caller keep the arrow instead. Description is
// checked first since it carries the specific, varied wording ("Water bottle", "Lent to Harsha")
// that a freeform category name ("Social life", "Zopkit") usually doesn't.
export function getTransactionIcon(description, categoryName) {
  return matchIcon(description) || matchIcon(categoryName)
}
