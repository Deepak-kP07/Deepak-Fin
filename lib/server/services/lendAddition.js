// The mirror image of lendRepayment.js — records that MORE was lent/borrowed against an
// existing lend/borrow record and bumps its `amount` up (instead of `amount_repaid`), so a
// running relationship with the same person stays one card with a dated history instead of
// fragmenting into a new card per top-up. Used for both directions (lending more, borrowing
// more) — same guard against the record's own origination transaction as lendRepayment.js, since
// that transaction is also tagged toward this record but must never be mistaken for an addition.
export async function applyLendAddition(supabase, userId, transactionId, lendBorrowId, amount, extra) {
  const { data: lb } = await supabase.from('lend_borrow').select('*').eq('id', lendBorrowId).eq('user_id', userId).maybeSingle()
  if (!lb) return
  // transactionId is null for an addition logged with "skip account impact" — only treat it as
  // the record's own origination transaction (and bail) when it's a real id that matches, never
  // when both sides just happen to be null.
  if (transactionId != null && lb.linked_transaction_id === transactionId) return
  await supabase.from('lend_borrow_additions').insert({ lend_borrow_id: lendBorrowId, user_id: userId, amount, linked_transaction_id: transactionId, ...extra })
  const newAmount = Number(lb.amount) + Number(amount)
  const repaid = Number(lb.amount_repaid || 0)
  const newStatus = repaid >= newAmount ? 'returned' : repaid > 0 ? 'partial' : 'pending'
  await supabase.from('lend_borrow').update({ amount: newAmount, status: newStatus }).eq('id', lendBorrowId).eq('user_id', userId)
}

export async function reverseLendAddition(supabase, userId, transactionId, lendBorrowId, amount) {
  const { data: lb } = await supabase.from('lend_borrow').select('*').eq('id', lendBorrowId).eq('user_id', userId).maybeSingle()
  if (!lb || lb.linked_transaction_id === transactionId) return
  await supabase.from('lend_borrow_additions').delete().eq('linked_transaction_id', transactionId).eq('user_id', userId)
  // amount has a > 0 check (unlike amount_repaid, which can legitimately be 0) — floors at a
  // cent rather than 0 so a stray reversal (e.g. the record's own amount was hand-edited via the
  // Edit form in between) can never violate that constraint.
  const newAmount = Math.max(0.01, Number(lb.amount) - Number(amount))
  const repaid = Number(lb.amount_repaid || 0)
  const newStatus = repaid >= newAmount ? 'returned' : repaid > 0 ? 'partial' : 'pending'
  await supabase.from('lend_borrow').update({ amount: newAmount, status: newStatus }).eq('id', lendBorrowId).eq('user_id', userId)
}
