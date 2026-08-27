import { ensureCategory } from '@/lib/server/services/categories'

// Reconciles an account's tracked balance against what the user's real bank app/statement
// shows — current_balance is a DB-trigger-derived sum of transactions, not a plain column, so
// the only way to move it is to log the drift as a transaction (unlike loans.outstanding, which
// the loan sync writes directly). This keeps a full audit trail instead of a silent overwrite.
export async function syncAccountBalance(supabase, userId, accountId, { target_balance, date, time, notes }) {
  const targetBalance = Number(target_balance)
  if (!Number.isFinite(targetBalance)) return { error: { message: 'target_balance is required' } }
  const { data: account } = await supabase.from('accounts').select('*').eq('id', accountId).eq('user_id', userId).maybeSingle()
  if (!account) return { error: { message: 'Account not found', status: 404 } }
  const diff = targetBalance - Number(account.current_balance || 0)
  if (Math.abs(diff) < 0.01) return { error: { message: 'Balance already matches — nothing to adjust' } }
  const type = diff > 0 ? 'income' : 'expense'
  const categoryId = await ensureCategory(supabase, userId, 'Balance adjustment', type)
  const now = new Date()
  const txPayload = {
    user_id: userId, account_id: accountId, amount: Math.abs(diff), type, description: 'Balance sync',
    category_id: categoryId, date: date || now.toISOString().slice(0, 10), time: time || now.toTimeString().slice(0, 5),
    notes: notes || `Reconciled with your bank's real balance (${diff > 0 ? '+' : ''}${diff.toFixed(2)})`,
  }
  const { data: tx, error } = await supabase.from('transactions').insert(txPayload).select().single()
  if (error) return { error: { message: error.message } }
  const { data: updated } = await supabase.from('accounts').select('current_balance').eq('id', accountId).eq('user_id', userId).maybeSingle()
  return { transaction: tx, new_balance: Number(updated?.current_balance ?? targetBalance) }
}
