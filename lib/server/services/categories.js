export const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income', icon: 'wallet', color: '#34d399' },
  { name: 'Freelance', type: 'income', icon: 'briefcase', color: '#22d3ee' },
  { name: 'Interest', type: 'income', icon: 'trending-up', color: '#4ade80' },
  { name: 'Food & dining', type: 'expense', icon: 'utensils', color: '#fb7185' },
  { name: 'Home', type: 'expense', icon: 'home', color: '#f59e0b' },
  { name: 'Transport', type: 'expense', icon: 'car', color: '#60a5fa' },
  { name: 'Investment', type: 'expense', icon: 'trending-up', color: '#a78bfa' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#f472b6' },
  { name: 'Bills & utilities', type: 'expense', icon: 'zap', color: '#facc15' },
  { name: 'Health', type: 'expense', icon: 'heart', color: '#ef4444' },
  { name: 'Entertainment', type: 'expense', icon: 'music', color: '#c084fc' },
  { name: 'Loan / Debt', type: 'expense', icon: 'landmark', color: '#f97316' },
  { name: 'Loan / Debt', type: 'income', icon: 'landmark', color: '#f97316' },
  { name: 'Lended', type: 'expense', icon: 'heart', color: '#38bdf8' },
  { name: 'Credit card bill', type: 'expense', icon: 'credit-card', color: '#f472b6' },
]

export async function ensureDefaults(supabase, userId) {
  const { data: existing } = await supabase.from('categories').select('id').eq('user_id', userId).limit(1)
  if (existing && existing.length > 0) return
  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId, is_default: true }))
  await supabase.from('categories').insert(rows)
}

// Finds (or, for accounts predating this category, creates) a category by name — used to
// silently tag loan-payment transactions as "Loan / Debt" instead of leaving them Uncategorised,
// without needing the loan payment form to ask the user to pick one every time.
export async function ensureCategory(supabase, userId, name, type) {
  const { data: existing } = await supabase.from('categories').select('id').eq('user_id', userId).eq('name', name).eq('type', type).maybeSingle()
  if (existing) return existing.id
  const { data: created } = await supabase.from('categories').insert({ user_id: userId, name, type, icon: 'landmark', color: '#f97316', is_default: true }).select('id').maybeSingle()
  return created?.id || null
}
