import { ensureCategory } from '@/lib/server/services/categories'

// Chit Funds: a rotating savings/credit group. Before this user's own payout, everything paid in
// (net of any dividend) is a receivable; after payout, the months still owed become a liability
// instead — see app/page.js's DashboardView for the net-worth math. Deliberately no denormalized
// running total on chit_funds itself (contrast lend_borrow.amount_repaid) — total paid is always
// summed on the fly from chit_fund_payments, so there's nothing to keep in sync here beyond the
// rare, one-time payout/status fields this file actually owns.

async function loadFund(supabase, userId, chitFundId) {
  const { data } = await supabase.from('chit_funds').select('*').eq('id', chitFundId).eq('user_id', userId).maybeSingle()
  return data
}

// A chit fund payment must be loggable without an account — cash handed to an organizer never
// touches a tracked account, the same "optional account" shape lend_borrow's addToLendBorrow
// supports (unlike a lend/borrow repayment, which always requires one).
export async function logChitFundPayment(supabase, userId, chitFundId, body) {
  const fund = await loadFund(supabase, userId, chitFundId)
  if (!fund) return { error: { message: 'Chit fund not found', status: 404 } }
  if (fund.status === 'completed') return { error: { message: 'This chit fund is already completed', status: 400 } }
  const amount = Number(body.amount)
  if (!(amount > 0)) return { error: { message: 'amount must be greater than 0', status: 400 } }
  const dividendReceived = Number(body.dividend_received || 0)
  const date = body.date || new Date().toISOString().slice(0, 10)
  const accountId = body.account_id || null

  let linkedTransactionId = null
  if (accountId) {
    const categoryId = await ensureCategory(supabase, userId, 'Chit Fund', 'expense')
    const nowStr = new Date().toTimeString().slice(0, 5)
    const { data: tx, error: txError } = await supabase.from('transactions').insert({
      user_id: userId, account_id: accountId, amount, type: 'expense',
      description: `Chit fund payment — ${fund.name}`,
      date, time: nowStr, category_id: categoryId,
      linked_module: 'chit_fund_payment', linked_module_id: chitFundId,
      notes: body.notes || null,
    }).select().single()
    if (txError) return { error: txError }
    linkedTransactionId = tx.id
  }

  const { data: payment, error } = await supabase.from('chit_fund_payments').insert({
    chit_fund_id: chitFundId, user_id: userId, amount, dividend_received: dividendReceived,
    payment_date: date, account_id: accountId, linked_transaction_id: linkedTransactionId,
    notes: body.notes || null,
  }).select().maybeSingle()
  if (error) return { error }
  return { payment }
}

// Edits amount/dividend/date/notes on an already-logged payment — deliberately never touches
// account_id (moving a payment between accounts would mean creating/deleting a transaction on
// each side, not just patching one in place; simpler to delete and re-log for that case). Keeps
// the linked transaction (if any) in sync on the same fields, so the account balance — synced by
// that transaction's own DB trigger — never drifts from what this row shows.
export async function updateChitFundPayment(supabase, userId, id, body) {
  const { data: payment } = await supabase.from('chit_fund_payments').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
  if (!payment) return { error: { message: 'Payment not found', status: 404 } }
  const patch = {}
  if (body.amount !== undefined) {
    const amount = Number(body.amount)
    if (!(amount > 0)) return { error: { message: 'amount must be greater than 0', status: 400 } }
    patch.amount = amount
  }
  if (body.dividend_received !== undefined) patch.dividend_received = Number(body.dividend_received || 0)
  if (body.payment_date !== undefined) patch.payment_date = body.payment_date
  if (body.notes !== undefined) patch.notes = body.notes || null
  const { data: updated, error } = await supabase.from('chit_fund_payments').update(patch).eq('id', id).eq('user_id', userId).select().maybeSingle()
  if (error) return { error }
  if (payment.linked_transaction_id && (patch.amount !== undefined || patch.payment_date !== undefined || patch.notes !== undefined)) {
    const txPatch = {}
    if (patch.amount !== undefined) txPatch.amount = patch.amount
    if (patch.payment_date !== undefined) txPatch.date = patch.payment_date
    if (patch.notes !== undefined) txPatch.notes = patch.notes
    await supabase.from('transactions').update(txPatch).eq('id', payment.linked_transaction_id).eq('user_id', userId)
  }
  return { payment: updated }
}

export async function deleteChitFundPayment(supabase, userId, id) {
  const { data: payment } = await supabase.from('chit_fund_payments').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
  if (!payment) return { error: { message: 'Payment not found', status: 404 } }
  if (payment.linked_transaction_id) await supabase.from('transactions').delete().eq('id', payment.linked_transaction_id).eq('user_id', userId)
  const { error } = await supabase.from('chit_fund_payments').delete().eq('id', id).eq('user_id', userId)
  if (error) return { error }
  return { ok: true }
}

// Mirrors editing/deleting a chit-fund-linked transaction directly from the ordinary Transactions
// ledger — same reversal-on-edit symmetry lend/lend_addition already has in the transactions
// catch-all (app/api/[[...path]]/route.js). Nothing denormalized to recompute on the chit_funds
// row itself (contrast applyLendRepayment's amount_repaid/status bump) — just insert/delete the
// child row.
export async function applyChitFundPayment(supabase, userId, transactionId, chitFundId, amount, extra) {
  const { data: fund } = await supabase.from('chit_funds').select('id, status').eq('id', chitFundId).eq('user_id', userId).maybeSingle()
  if (!fund || fund.status === 'completed') return
  await supabase.from('chit_fund_payments').insert({ chit_fund_id: chitFundId, user_id: userId, amount, linked_transaction_id: transactionId, ...extra })
}

export async function reverseChitFundPayment(supabase, userId, transactionId) {
  await supabase.from('chit_fund_payments').delete().eq('linked_transaction_id', transactionId).eq('user_id', userId)
}

export async function takeChitFundPayout(supabase, userId, chitFundId, body) {
  const fund = await loadFund(supabase, userId, chitFundId)
  if (!fund) return { error: { message: 'Chit fund not found', status: 404 } }
  if (fund.status === 'completed') return { error: { message: 'This chit fund is already completed', status: 400 } }
  if (fund.payout_status === 'taken') return { error: { message: 'Payout already taken for this fund', status: 400 } }
  const payoutAmount = Number(body.payout_amount)
  if (!(payoutAmount > 0)) return { error: { message: 'payout_amount must be greater than 0', status: 400 } }
  const payoutDate = body.payout_date || new Date().toISOString().slice(0, 10)
  const payoutAccountId = body.payout_account_id || null

  // Informational only ("payout taken in month N") — never trusted by net-worth math, which
  // always recounts real chit_fund_payments rows instead (see DashboardView).
  const { count } = await supabase.from('chit_fund_payments').select('id', { count: 'exact', head: true }).eq('chit_fund_id', chitFundId)
  const payoutMonth = (count || 0) + 1

  let payoutLinkedTransactionId = null
  if (payoutAccountId) {
    const categoryId = await ensureCategory(supabase, userId, 'Chit Fund', 'income')
    const nowStr = new Date().toTimeString().slice(0, 5)
    const { data: tx, error: txError } = await supabase.from('transactions').insert({
      user_id: userId, account_id: payoutAccountId, amount: payoutAmount, type: 'income',
      description: `Chit fund payout — ${fund.name}`,
      date: payoutDate, time: nowStr, category_id: categoryId,
      notes: body.notes || null,
    }).select().single()
    if (txError) return { error: txError }
    payoutLinkedTransactionId = tx.id
  }

  const { data: updated, error } = await supabase.from('chit_funds').update({
    payout_status: 'taken', payout_date: payoutDate, payout_amount: payoutAmount,
    payout_account_id: payoutAccountId, payout_linked_transaction_id: payoutLinkedTransactionId,
    payout_month: payoutMonth,
  }).eq('id', chitFundId).eq('user_id', userId).select().maybeSingle()
  if (error) return { error }
  return { chitFund: updated }
}

export async function undoChitFundPayout(supabase, userId, chitFundId) {
  const fund = await loadFund(supabase, userId, chitFundId)
  if (!fund) return { error: { message: 'Chit fund not found', status: 404 } }
  if (fund.payout_status !== 'taken') return { error: { message: 'No payout to undo', status: 400 } }
  if (fund.payout_linked_transaction_id) await supabase.from('transactions').delete().eq('id', fund.payout_linked_transaction_id).eq('user_id', userId)
  const { data: updated, error } = await supabase.from('chit_funds').update({
    payout_status: 'not_taken', payout_date: null, payout_amount: null,
    payout_account_id: null, payout_linked_transaction_id: null, payout_month: null,
  }).eq('id', chitFundId).eq('user_id', userId).select().maybeSingle()
  if (error) return { error }
  return { chitFund: updated }
}

// Only allowed once the payout's been taken — completing a fund that's still 'not_taken' would
// silently drop its receivable from net worth with no payout ever having been received, an actual
// loss of tracked money, not a real fund lifecycle.
export async function completeChitFund(supabase, userId, chitFundId) {
  const fund = await loadFund(supabase, userId, chitFundId)
  if (!fund) return { error: { message: 'Chit fund not found', status: 404 } }
  if (fund.payout_status !== 'taken') return { error: { message: 'Take the payout before marking this fund completed', status: 400 } }
  const { data: updated, error } = await supabase.from('chit_funds').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', chitFundId).eq('user_id', userId).select().maybeSingle()
  if (error) return { error }
  return { chitFund: updated }
}

export async function reopenChitFund(supabase, userId, chitFundId) {
  const { data: updated, error } = await supabase.from('chit_funds').update({ status: 'active', completed_at: null }).eq('id', chitFundId).eq('user_id', userId).select().maybeSingle()
  if (error) return { error }
  if (!updated) return { error: { message: 'Chit fund not found', status: 404 } }
  return { chitFund: updated }
}

export async function deleteChitFund(supabase, userId, id) {
  const fund = await loadFund(supabase, userId, id)
  if (!fund) return { ok: true }
  const { data: payments } = await supabase.from('chit_fund_payments').select('linked_transaction_id').eq('chit_fund_id', id).eq('user_id', userId)
  const txIds = [fund.payout_linked_transaction_id, ...(payments || []).map((p) => p.linked_transaction_id)].filter(Boolean)
  if (txIds.length) await supabase.from('transactions').delete().in('id', txIds).eq('user_id', userId)
  const { error } = await supabase.from('chit_funds').delete().eq('id', id).eq('user_id', userId)
  return { ok: !error }
}
