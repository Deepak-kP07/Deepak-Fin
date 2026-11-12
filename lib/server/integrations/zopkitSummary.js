import { createHash, timingSafeEqual } from 'node:crypto'

// Read-only, server-to-server summary of the Zopkit company profile for the "Zopkit One" app.
// See app/api/integrations/zopkit/summary/route.js for the route. Everything in this file except
// loadZopkitSummary() is pure, so it's unit-tested in __tests__/zopkitSummary.test.js.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

// Constant-time check of `Authorization: Bearer <key>` against ZOPKIT_INTEGRATION_KEY. Both
// sides are SHA-256 hashed first so timingSafeEqual always compares equal-length buffers and
// the key's length can't leak through an early length mismatch. Fails closed when unset.
export function isValidIntegrationKey(authorizationHeader, expected) {
  if (!expected || !authorizationHeader?.startsWith('Bearer ')) return false
  const given = authorizationHeader.slice(7).trim()
  if (!given) return false
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

// Today's calendar date in India (Asia/Kolkata), as YYYY-MM-DD.
export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function isValidDate(s) {
  const m = typeof s === 'string' && DATE_RE.exec(s)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

// Indian financial year (1 Apr – 31 Mar) containing `today` (YYYY-MM-DD).
export function currentFinancialYear(today) {
  const y = Number(today.slice(0, 4))
  const startYear = Number(today.slice(5, 7)) >= 4 ? y : y - 1
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` }
}

// Resolves from/to query params: each defaults to the current FY bound when missing.
// Returns { from, to } or { error } (→ 400).
export function resolveRange(fromParam, toParam, today) {
  const fy = currentFinancialYear(today)
  const from = fromParam || fy.from
  const to = toParam || fy.to
  if (!isValidDate(from)) return { error: '`from` must be a real date in YYYY-MM-DD format' }
  if (!isValidDate(to)) return { error: '`to` must be a real date in YYYY-MM-DD format' }
  if (from > to) return { error: '`from` must be on or before `to`' }
  return { from, to }
}

// The 12 calendar months ending with the month of `to`, oldest first, as "YYYY-MM".
export function last12Months(to) {
  let y = Number(to.slice(0, 4))
  let m = Number(to.slice(5, 7))
  const out = []
  for (let i = 0; i < 12; i++) {
    out.unshift(`${y}-${String(m).padStart(2, '0')}`)
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
  }
  return out
}

// Money is summed in integer paise to avoid float drift, then returned as a rupee number
// rounded to 2 decimals.
const toPaise = (amount) => Math.round(Number(amount || 0) * 100)
const toRupees = (paise) => Math.round(paise) / 100

// profile: { id, name, status, opening_balance, created_at }
// entries: [{ id, entry_type, category_id, description, amount, date, created_at }] (any order)
// recurring: [{ description, amount, entry_type, frequency, next_due_date }] (active only)
// categories: [{ id, name }]
export function buildZopkitSummary({ profile, entries, recurring, categories, from, to, today }) {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const nameFor = (id) => categoryName.get(id) || 'Uncategorized'

  // All-time balance — same formula the app uses (profileTotals in lib/moneyProfiles.js).
  let balance = toPaise(profile.opening_balance)
  let updatedAt = profile.created_at
  const totals = { income: 0, expense: 0, capital: 0 }
  const months = last12Months(to)
  const monthly = new Map(months.map((m) => [m, { income: 0, expense: 0, capital: 0 }]))
  const byCategory = new Map()

  for (const e of entries) {
    const p = toPaise(e.amount)
    const type = e.entry_type
    balance += type === 'expense' ? -p : p
    if (e.created_at && (!updatedAt || new Date(e.created_at) > new Date(updatedAt))) updatedAt = e.created_at

    const bucket = monthly.get(e.date.slice(0, 7))
    if (bucket && type in bucket) bucket[type] += p

    if (e.date >= from && e.date <= to && type in totals) {
      totals[type] += p
      const key = `${type}\u0000${nameFor(e.category_id)}`
      byCategory.set(key, (byCategory.get(key) || 0) + p)
    }
  }

  const recent = [...entries]
    .sort((a, b) => (b.date.localeCompare(a.date)) || String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 50)

  return {
    profile: { id: profile.id, name: profile.name, status: profile.status },
    currency: 'INR',
    range: { from, to },
    accounts: [{
      id: profile.id,
      name: `${profile.name} ledger`,
      type: 'company_ledger',
      balance: toRupees(balance),
      currency: 'INR',
      updated_at: updatedAt ? new Date(updatedAt).toISOString() : null,
    }],
    totals: {
      income: toRupees(totals.income),
      expense: toRupees(totals.expense),
      capital: toRupees(totals.capital),
      net: toRupees(totals.income - totals.expense),
    },
    monthly: months.map((month) => {
      const b = monthly.get(month)
      return { month, income: toRupees(b.income), expense: toRupees(b.expense), capital: toRupees(b.capital), net: toRupees(b.income - b.expense) }
    }),
    byCategory: [...byCategory.entries()]
      .map(([key, p]) => { const [type, category] = key.split('\u0000'); return { category, type, amount: toRupees(p) } })
      .sort((a, b) => b.amount - a.amount),
    upcoming: recurring
      .filter((r) => r.next_due_date >= today)
      .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
      .map((r) => ({ name: r.description, amount: toRupees(toPaise(r.amount)), due_on: r.next_due_date, kind: 'recurring', type: r.entry_type, frequency: r.frequency })),
    recentTransactions: recent.map((e) => ({
      id: e.id, date: e.date, description: e.description, category: e.category_id ? nameFor(e.category_id) : null,
      amount: toRupees(toPaise(e.amount)), type: e.entry_type, account: profile.name,
    })),
    receivables: null,
    payables: null,
  }
}

const ENTRY_COLUMNS = 'id, entry_type, category_id, description, amount, date, created_at'
const PAGE = 1000 // PostgREST's default max rows per request

// Loads everything for one profile with the service-role client. Every query is pinned to
// profileId and lists its columns explicitly — notes, paid_party, account_id, credit_card_id,
// linked_transaction_id and is_reimbursable are never selected. Returns null if not found.
export async function loadZopkitSummary(supabase, profileId, { from, to, today }) {
  const { data: profile, error: profileError } = await supabase.from('money_profiles')
    .select('id, name, status, opening_balance, created_at')
    .eq('id', profileId).eq('profile_type', 'company').maybeSingle()
  if (profileError) throw profileError
  if (!profile) return null
  profile.name = (profile.name || '').trim()

  const entries = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.from('money_profile_entries')
      .select(ENTRY_COLUMNS).eq('profile_id', profileId)
      .order('date', { ascending: false }).order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    entries.push(...data)
    if (data.length < PAGE) break
  }

  const { data: recurring, error: recurringError } = await supabase.from('recurring_money_profile_entries')
    .select('description, amount, entry_type, frequency, next_due_date')
    .eq('profile_id', profileId).eq('is_active', true)
  if (recurringError) throw recurringError

  const categoryIds = [...new Set(entries.map((e) => e.category_id).filter(Boolean))]
  let categories = []
  if (categoryIds.length) {
    const { data, error } = await supabase.from('categories').select('id, name').in('id', categoryIds)
    if (error) throw error
    categories = data
  }

  return buildZopkitSummary({ profile, entries, recurring: recurring || [], categories, from, to, today })
}
