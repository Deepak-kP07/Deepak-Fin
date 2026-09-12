import { UtensilsCrossed, Popcorn, HeartPulse, Plane, ShoppingBag, Home, Car, Lightbulb, BookOpen, Coins, Sparkles } from 'lucide-react'

// Categories are freeform, per-user rows (db/schema.js), not a fixed list — so this matches by
// keyword substring against the category's own name rather than an exact-match lookup table.
const RULES = [
  { icon: UtensilsCrossed, keywords: ['food', 'dining', 'restaurant', 'grocery', 'groceries'] },
  { icon: Popcorn, keywords: ['entertainment', 'movie', 'fun', 'game'] },
  { icon: HeartPulse, keywords: ['health', 'medical', 'doctor', 'pharmacy', 'hospital'] },
  { icon: Plane, keywords: ['travel', 'trip', 'flight', 'vacation', 'holiday'] },
  { icon: ShoppingBag, keywords: ['shopping', 'clothes', 'clothing'] },
  { icon: Home, keywords: ['home', 'rent', 'house', 'maintenance'] },
  { icon: Car, keywords: ['transport', 'fuel', 'petrol', 'diesel', 'car', 'taxi', 'cab', 'auto'] },
  { icon: Lightbulb, keywords: ['bill', 'utilit', 'electric', 'water', 'gas', 'recharge'] },
  { icon: BookOpen, keywords: ['education', 'school', 'course', 'book', 'tuition'] },
  { icon: Coins, keywords: ['salary', 'income', 'invest', 'saving'] },
]
const DEFAULT_ICON = Sparkles

export function getCategoryIcon(categoryName) {
  const n = (categoryName || '').toLowerCase()
  return RULES.find((r) => r.keywords.some((k) => n.includes(k)))?.icon || DEFAULT_ICON
}
