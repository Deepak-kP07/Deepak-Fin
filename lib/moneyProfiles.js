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

// Client-side mirror of lib/server/permissions.js's role helpers — a UX layer only (gating which
// buttons even render), never the real enforcement. The matching server-side check + RLS policy
// (drizzle/0029_money_profile_sharing.sql) is what actually stops a disallowed request; these
// exist purely so a read-tier viewer isn't shown a delete button that would just 403 anyway.
export const SHARE_ROLES = ['read', 'edit', 'admin']
export const roleFor = (profile) => profile.my_role || 'owner'
export const canWriteEntries = (role) => role === 'owner' || role === 'edit' || role === 'admin'
export const canDeleteEntries = (role) => role === 'owner' || role === 'admin'
export const canEditProfile = (role) => role === 'owner' || role === 'admin'
export const canManageShares = (role) => role === 'owner' || role === 'admin'
export const canDeleteProfile = (role) => role === 'owner'
// The categories a viewer should see/pick from for a given profile — the owner's own list for a
// profile they own, or the owner's categories attached server-side (profile.owner_categories)
// for a shared one, since categories keeps its own owner-only RLS.
export const categoriesFor = (profile, viewerCategories) => (roleFor(profile) === 'owner' ? viewerCategories : (profile.owner_categories || []))

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
