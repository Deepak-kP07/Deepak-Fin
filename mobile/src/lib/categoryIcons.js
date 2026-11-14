import { BookOpen, Car, Coins, FileText, Handshake, HeartPulse, Home, Lightbulb, PartyPopper, Plane, Popcorn, RefreshCw, ShoppingBag, Sparkles, UtensilsCrossed } from 'lucide-react-native'

// Same keyword rules as the web's lib/categoryIcons.js, with lucide-react-native icons.
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
const matchIcon = (text) => { const n = (text || '').toLowerCase(); return RULES.find((r) => r.keywords.some((k) => n.includes(k)))?.icon || null }
export const getCategoryIcon = (name) => matchIcon(name) || Sparkles
export const getTransactionIcon = (description, categoryName) => matchIcon(description) || matchIcon(categoryName)
