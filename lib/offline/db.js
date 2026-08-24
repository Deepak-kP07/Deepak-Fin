import Dexie from 'dexie'

// One store per key `/finance/summary` returns, mirrored 1:1 with the `data` state shape in
// app/page.js's Shell — every table has a uuid `id` primary key (including profiles.id, which
// is the user's own id), so a single id-keyed store per key works with no reshaping. `meta`
// holds a plain lastSyncedAt marker so loadSnapshot() can tell "never synced" from "synced but
// everything happens to be empty."
const DATA_KEYS = [
  'accounts', 'categories', 'transactions', 'budgets', 'portfolios', 'holdings', 'sips',
  'other_investments', 'kite_orders', 'loans', 'loan_payments', 'bucket_list', 'lend_borrow',
  'lend_repayments', 'credit_cards', 'credit_card_transactions', 'scholarships',
  'scholarship_payments', 'money_rules', 'recurring_transactions', 'money_profiles',
  'money_profile_entries', 'budget_months', 'budget_month_categories', 'vault_items',
]

const db = new Dexie('deepak-finance')
db.version(1).stores({
  ...Object.fromEntries(DATA_KEYS.map((key) => [key, 'id'])),
  profile: 'id',
  meta: 'key',
})
// v2 (Phase 3): the offline write queue. Entries are flushed in insertion order (localId is
// Dexie's auto-incrementing primary key, so a plain .toArray() already comes back FIFO).
db.version(2).stores({
  outbox: '++localId, table, method, recordId, createdAt',
})

export { db, DATA_KEYS }

export async function saveSnapshot(result) {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(DATA_KEYS.map((key) => db.table(key).clear().then(() => db.table(key).bulkPut(result[key] || []))))
    await db.table('profile').clear()
    if (result.profile) await db.table('profile').put(result.profile)
    await db.table('meta').put({ key: 'lastSyncedAt', value: new Date().toISOString() })
  })
}

export async function loadSnapshot() {
  const meta = await db.table('meta').get('lastSyncedAt')
  if (!meta) return null
  const entries = await Promise.all(DATA_KEYS.map(async (key) => [key, await db.table(key).toArray()]))
  const profileRows = await db.table('profile').toArray()
  return { ...Object.fromEntries(entries), profile: profileRows[0] || null }
}

export async function clearSnapshot() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
  })
}
