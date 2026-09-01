import { randomUUID } from '@/lib/server/randomUUID'
import { pickFields } from '@/lib/server/safeFields'
import { applyLendRepayment } from '@/lib/server/services/lendRepayment'
import { applyLendAddition } from '@/lib/server/services/lendAddition'

// The one place a transaction actually gets created — extracted verbatim from the catch-all
// route's old inline POST /finance/transactions handler so every caller (manual entry via the
// catch-all, and now approving a pending SMS-detected transaction) goes through identical logic:
// same credit-card/transfer branching, same pickFields whitelist, same lend/credit-card side
// effects. Account-balance sync (sync_account_balance() trigger) and adjust_credit_card_outstanding
// both live on `transactions` itself, so calling this once gets both for free regardless of caller.
export async function createTransaction(supabase, userId, body) {
  // A transaction made against a credit card (not a bank/cash account) — link it via
  // linked_module instead of account_id, matching the existing generic-link pattern.
  if (body.credit_card_id) {
    body = { ...body, linked_module: 'credit_card', linked_module_id: body.credit_card_id, account_id: null }
  }

  // Handle transfers: create two paired rows sharing transfer_group_id
  if (body.type === 'transfer') {
    const amount = Number(body.amount)
    if (!body.account_id || !body.to_account_id || body.account_id === body.to_account_id || !(amount > 0)) {
      return { error: { message: 'Invalid transfer: pick two different accounts and a positive amount.', status: 400 } }
    }
    const groupId = randomUUID()
    const nowStr = new Date().toTimeString().slice(0, 5)
    const base = { amount, type: 'transfer', description: body.description || 'Transfer', date: body.date, time: body.time || nowStr, notes: body.notes || null, transfer_group_id: groupId, user_id: userId }
    const rows = [
      { ...base, account_id: body.account_id, transfer_direction: 'out' },
      { ...base, account_id: body.to_account_id, transfer_direction: 'in' },
    ]
    const { data: created, error } = await supabase.from('transactions').insert(rows).select()
    if (error) return { error }
    return { created }
  }

  const payload = { ...pickFields('transactions', body), user_id: userId }
  if (!payload.time) payload.time = new Date().toTimeString().slice(0, 5)
  const { data: created, error } = await supabase.from('transactions').insert(payload).select().single()
  if (error) return { error }

  // Side-effect: a transaction linked to a lend/borrow record is a repayment (income
  // repaying money lent out, or expense repaying money borrowed) → record it + update pending
  if (created?.id && body.linked_module === 'lend' && body.linked_module_id) {
    await applyLendRepayment(supabase, userId, created.id, body.linked_module_id, created.amount, { date: created.date, account_id: created.account_id, notes: created.notes || null })
  }

  // Side-effect: the reverse of the above — this transaction is logging MORE lent/borrowed
  // against an existing record, not a repayment of it → record it + bump the record's amount
  if (created?.id && body.linked_module === 'lend_addition' && body.linked_module_id) {
    await applyLendAddition(supabase, userId, created.id, body.linked_module_id, created.amount, { date: created.date, account_id: created.account_id, notes: created.notes || null })
  }

  // Side-effect: a credit-card-linked transaction bumps the card's outstanding
  // (expense increases debt, income/refund reduces it) — no separate
  // credit_card_transactions row needed, this transaction is the record of it.
  if (created?.id && body.linked_module === 'credit_card' && body.linked_module_id) {
    const delta = body.type === 'income' ? -Number(created.amount) : Number(created.amount)
    await supabase.rpc('adjust_credit_card_outstanding', { p_card_id: body.linked_module_id, p_delta: delta })
  }

  return { created }
}
