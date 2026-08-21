// Records a repayment against a lend/borrow record and bumps amount_repaid — used for
// both directions (income repaying money lent out, expense repaying money borrowed).
// Guarded against the record's own origination transaction (lend_borrow.linked_transaction_id)
// so editing/re-saving that transaction is never mistaken for a repayment.
export async function applyLendRepayment(supabase, userId, transactionId, lendBorrowId, amount, extra) {
  const { data: lb } = await supabase.from('lend_borrow').select('*').eq('id', lendBorrowId).eq('user_id', userId).maybeSingle()
  if (!lb || lb.linked_transaction_id === transactionId) return
  await supabase.from('lend_repayments').insert({ lend_borrow_id: lendBorrowId, user_id: userId, amount, linked_transaction_id: transactionId, ...extra })
  const newRepaid = Number(lb.amount_repaid || 0) + Number(amount)
  const newStatus = newRepaid >= Number(lb.amount) ? 'returned' : newRepaid > 0 ? 'partial' : 'pending'
  await supabase.from('lend_borrow').update({ amount_repaid: newRepaid, status: newStatus }).eq('id', lendBorrowId).eq('user_id', userId)
}

export async function reverseLendRepayment(supabase, userId, transactionId, lendBorrowId, amount) {
  const { data: lb } = await supabase.from('lend_borrow').select('*').eq('id', lendBorrowId).eq('user_id', userId).maybeSingle()
  if (!lb || lb.linked_transaction_id === transactionId) return
  await supabase.from('lend_repayments').delete().eq('linked_transaction_id', transactionId).eq('user_id', userId)
  const newRepaid = Math.max(0, Number(lb.amount_repaid || 0) - Number(amount))
  const newStatus = newRepaid >= Number(lb.amount) ? 'returned' : newRepaid > 0 ? 'partial' : 'pending'
  await supabase.from('lend_borrow').update({ amount_repaid: newRepaid, status: newStatus }).eq('id', lendBorrowId).eq('user_id', userId)
}
