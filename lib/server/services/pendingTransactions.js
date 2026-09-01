import { createTransaction } from '@/lib/server/services/transactions'

// Approve/reject a pending SMS-detected transaction — state-transition actions with side
// effects, not plain CRUD, same shape as budget_months' close/reopen (lib/server/services/budgets.js).
// Approving reuses createTransaction() so the resulting row goes through identical logic to a
// manually-entered transaction (same account-balance trigger, same credit-card outstanding RPC).
export async function approvePendingTransaction(supabase, userId, id, overrides = {}) {
  const { data: pending } = await supabase.from('pending_transactions').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
  if (!pending) return { error: { message: 'Not found', status: 404 } }
  if (pending.status !== 'pending') return { error: { message: 'Already resolved', status: 400 } }

  const merged = { ...pending, ...overrides }
  const hasDestination = !!(merged.account_id || merged.credit_card_id)
  if (!(Number(merged.amount) > 0) || !merged.type || !hasDestination) {
    return { error: { message: 'Amount, type, and an account or card are required to approve', status: 400 } }
  }

  const txBody = {
    amount: merged.amount,
    type: merged.type,
    description: merged.description || merged.merchant || 'SMS transaction',
    date: merged.date || new Date().toISOString().slice(0, 10),
    time: merged.time || undefined,
    category_id: merged.suggested_category_id || undefined,
    account_id: merged.credit_card_id ? null : merged.account_id,
    credit_card_id: merged.credit_card_id || undefined,
    notes: 'Auto-detected from SMS',
  }
  const { created, error } = await createTransaction(supabase, userId, txBody)
  if (error) return { error }

  const { data: updated } = await supabase.from('pending_transactions')
    .update({ status: 'approved', resolved_at: new Date().toISOString(), linked_transaction_id: created.id, raw_message: null })
    .eq('id', id).eq('user_id', userId).select().maybeSingle()
  return { transaction: created, pending: updated }
}

export async function rejectPendingTransaction(supabase, userId, id) {
  const { data: pending } = await supabase.from('pending_transactions').select('id, status').eq('id', id).eq('user_id', userId).maybeSingle()
  if (!pending) return { error: { message: 'Not found', status: 404 } }
  if (pending.status !== 'pending') return { error: { message: 'Already resolved', status: 400 } }
  const { data: updated } = await supabase.from('pending_transactions')
    .update({ status: 'rejected', resolved_at: new Date().toISOString(), raw_message: null })
    .eq('id', id).eq('user_id', userId).select().maybeSingle()
  return { pending: updated }
}
