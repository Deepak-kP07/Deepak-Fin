export const PROFILE_TYPES = [
  { value: 'family', label: 'Family' },
  { value: 'company', label: 'Company' },
  { value: 'other', label: 'Other' },
]

export const ENTRY_TYPES = [
  { value: 'income', label: 'Income' },
  { value: 'capital', label: 'Capital' },
  { value: 'expense', label: 'Expense' },
]

export const ENTRY_TYPE_STYLE = {
  income: 'bg-emerald-400/15 text-emerald-200',
  capital: 'bg-accent-400/15 text-accent-200',
  expense: 'bg-rose-400/15 text-rose-200',
}

// A profile's balance is never stored — always opening_balance plus every entry since, computed
// fresh from whatever entries are in hand (mirrors how portfolio/other-investment totals are
// derived rather than persisted elsewhere in this app).
export function profileTotals(profile, entries) {
  const income = entries.reduce((s, e) => s + (e.entry_type === 'income' ? Number(e.amount) : 0), 0)
  const capital = entries.reduce((s, e) => s + (e.entry_type === 'capital' ? Number(e.amount) : 0), 0)
  const expense = entries.reduce((s, e) => s + (e.entry_type === 'expense' ? Number(e.amount) : 0), 0)
  const opening = Number(profile.opening_balance || 0)
  const balance = opening + income + capital - expense
  return { opening, income, capital, expense, balance }
}
