import { pickFields } from '@/lib/server/safeFields'
import { applyOrder } from '@/lib/server/applyOrder'
import { ensureCategory } from '@/lib/server/services/categories'

// Shared generic-CRUD engine behind every simple per-resource route file (accounts, categories,
// budgets, portfolios, sips, loans, bucket_list, lend_borrow, lend_repayments, credit_cards,
// scholarships, money_rules, recurring_transactions, holdings). Ported verbatim from the old
// app/api/[[...path]]/route.js catch-all's collectionMatch block, parameterized by `table` —
// behavior is unchanged, only the dispatch mechanism (Next.js file routing vs. manual regex) is.
//
// transactions, loan_payments, credit_card_transactions, and scholarship_payments are NOT routed
// through this engine — each has bespoke logic living at the same base path elsewhere (or, for
// transactions, is the central cross-domain hub) and is migrated to its own dedicated route file
// separately (see the refactor plan's Phase 6/7).

export async function listCollection(supabase, user, table) {
  const { data: rows } = await applyOrder(supabase.from(table).select('*').eq('user_id', user.id), table)
  return rows || []
}

export async function getOne(supabase, user, table, id) {
  const { data: row } = await supabase.from(table).select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  return row || null
}

// 'kite' is reserved for the internal sync service (lib/server/services/kiteSync.js), which
// writes directly via the service client, not this generic route — a client-supplied 'kite'
// here would falsely mark a row as Kite-managed (hides edit/delete, and reconcileHoldings'
// stale-row cleanup could delete it on the next real sync).
const HOLDINGS_CLIENT_SOURCES = ['manual', 'import']

export async function createInCollection(supabase, user, table, body) {
  const payload = { ...pickFields(table, body), user_id: user.id }
  if (table === 'holdings' && !HOLDINGS_CLIENT_SOURCES.includes(payload.source)) delete payload.source
  if (table === 'accounts' && payload.opening_balance !== undefined) payload.current_balance = payload.opening_balance
  if (table === 'loans' && payload.principal !== undefined && payload.outstanding === undefined) payload.outstanding = payload.principal
  // "cc:<id>" in from_account_id means this lend was funded on a credit card — not a real
  // accounts.id, so it can't go into this (uuid, FK) column. The side-effect below still
  // reads the original "cc:<id>" off `body` (untouched), so card funding is still applied.
  if (table === 'lend_borrow' && typeof payload.from_account_id === 'string' && payload.from_account_id.startsWith('cc:')) {
    payload.from_account_id = null
  }
  const { data: created, error } = await supabase.from(table).insert(payload).select().single()
  if (error) return { error }

  // Holdings' effect on the parent portfolio's cash_balance is handled entirely by the
  // holdings_sync_portfolio_cash DB trigger (drizzle/0007_portfolio_cash_trigger.sql) — it
  // reacts to insert/update/delete uniformly (including edits, which this app-level code never
  // covered) and runs in the same transaction as the write, so there's no non-atomicity window.

  // Side-effect: creating a lend_borrow of type 'lent' from an account → deduct via expense transaction.
  // "cc:<id>" means funded on a credit card instead of a bank/cash account — no money leaves
  // a bank account, the card's outstanding balance goes up instead.
  if (table === 'lend_borrow' && created?.id && body.from_account_id && body.type === 'lent') {
    const amount = Number(body.amount)
    const nowStr = new Date().toTimeString().slice(0, 5)
    const lentCategoryId = await ensureCategory(supabase, user.id, 'Lended', 'expense')
    const lentCardId = typeof body.from_account_id === 'string' && body.from_account_id.startsWith('cc:') ? body.from_account_id.slice(3) : null
    const txPayload = { user_id: user.id, account_id: lentCardId ? null : body.from_account_id, amount, type: 'expense', description: `Lent to ${body.person_name}`, date: body.date || new Date().toISOString().slice(0, 10), time: nowStr, category_id: lentCategoryId, linked_module: lentCardId ? 'credit_card' : 'lend', linked_module_id: lentCardId || created.id, notes: body.notes || null }
    const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
    if (tx?.id) await supabase.from('lend_borrow').update({ linked_transaction_id: tx.id }).eq('id', created.id).eq('user_id', user.id)
    if (lentCardId) {
      const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', lentCardId).eq('user_id', user.id).maybeSingle()
      if (card) await supabase.from('credit_cards').update({ current_outstanding: Number(card.current_outstanding || 0) + amount }).eq('id', lentCardId).eq('user_id', user.id)
    }
  }
  // Side-effect: borrowed money → income into account
  if (table === 'lend_borrow' && created?.id && body.from_account_id && body.type === 'borrowed') {
    const amount = Number(body.amount)
    const nowStr = new Date().toTimeString().slice(0, 5)
    const borrowedCategoryId = await ensureCategory(supabase, user.id, 'Loan / Debt', 'income')
    const txPayload = { user_id: user.id, account_id: body.from_account_id, amount, type: 'income', description: `Borrowed from ${body.person_name}`, date: body.date || new Date().toISOString().slice(0, 10), time: nowStr, category_id: borrowedCategoryId, linked_module: 'lend', linked_module_id: created.id, notes: body.notes || null }
    const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
    if (tx?.id) await supabase.from('lend_borrow').update({ linked_transaction_id: tx.id }).eq('id', created.id).eq('user_id', user.id)
  }

  // Side-effect: scholarship marked as received with an account → income transaction
  if (table === 'scholarships' && created?.id && payload.status === 'received' && payload.received_to_account_id) {
    const now = new Date()
    const txPayload = { user_id: user.id, account_id: payload.received_to_account_id, amount: Number(payload.total_amount), type: 'income', description: `${payload.name} received`, date: payload.received_date || now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), linked_module: 'scholarship', linked_module_id: created.id, notes: payload.notes || null }
    const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
    if (tx?.id) await supabase.from('scholarships').update({ linked_transaction_id: tx.id }).eq('id', created.id).eq('user_id', user.id)
  }

  return { created }
}

export async function updateInCollection(supabase, user, table, id, body) {
  const patch = pickFields(table, body)
  if (table === 'holdings' && !HOLDINGS_CLIENT_SOURCES.includes(patch.source)) delete patch.source
  const { data: updated, error } = await supabase.from(table).update(patch).eq('id', id).eq('user_id', user.id).select().maybeSingle()
  return { updated, error }
}

export async function deleteFromCollection(supabase, user, table, id) {
  // Deleting a holding refunds its cost back onto the portfolio's cash_balance — handled by
  // the holdings_sync_portfolio_cash DB trigger, see the comment in createInCollection above.
  // Deleting a lend_borrow → remove linked transaction (bank/cash balance restores
  // automatically via the DB trigger; a card's outstanding isn't trigger-managed, so
  // that has to be reversed by hand here first).
  if (table === 'lend_borrow') {
    const { data: lb } = await supabase.from('lend_borrow').select('linked_transaction_id').eq('id', id).eq('user_id', user.id).maybeSingle()
    if (lb?.linked_transaction_id) {
      const { data: linkedTx } = await supabase.from('transactions').select('linked_module, linked_module_id, amount').eq('id', lb.linked_transaction_id).eq('user_id', user.id).maybeSingle()
      if (linkedTx?.linked_module === 'credit_card' && linkedTx.linked_module_id) {
        const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', linkedTx.linked_module_id).eq('user_id', user.id).maybeSingle()
        if (card) await supabase.from('credit_cards').update({ current_outstanding: Math.max(0, Number(card.current_outstanding || 0) - Number(linkedTx.amount)) }).eq('id', linkedTx.linked_module_id).eq('user_id', user.id)
      }
      await supabase.from('transactions').delete().eq('id', lb.linked_transaction_id).eq('user_id', user.id)
    }
  }
  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id)
  return { ok: !error }
}
