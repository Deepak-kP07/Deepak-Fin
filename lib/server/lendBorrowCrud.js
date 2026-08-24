import { pickFields } from '@/lib/server/safeFields'
import { applyOrder } from '@/lib/server/applyOrder'
import { getLendBorrowRole, canEditProfile, canDeleteProfile } from '@/lib/server/permissions'

// lend_borrow graduates off lib/server/genericCrud.js for reads/updates/deletes only — its
// hardcoded .eq('user_id', user.id) can't express "owned or shared with me". POST (create) stays
// on genericCrud.js unchanged: creating a record is never a shared-with-me action, and its
// mirrored-transaction/card-outstanding side effect is unaffected by any of this.
//
// Reads lean entirely on RLS (drizzle/0033_lend_borrow_sharing.sql) rather than re-deriving
// visibility here — a plain `select('*')` already returns exactly the owned-or-shared rows a
// session is allowed to see; these functions only ATTACH a `my_role` tag, never filter.

async function roleFor(supabase, recordUserId, lendBorrowId, userId) {
  return recordUserId === userId ? 'owner' : getLendBorrowRole(supabase, lendBorrowId, userId)
}

// accounts keeps its own owner-only RLS (sharing was only extended to lend_borrow/
// lend_repayments/lend_borrow_shares) — a collaborator's session can't see the owner's linked
// account directly, so it's resolved via the narrow lend_borrow_owner_account() RPC instead.
async function attachOwnerAccount(supabase, record) {
  if (!record.from_account_id) return record
  const { data } = await supabase.rpc('lend_borrow_owner_account', { p_lend_borrow_id: record.id })
  return { ...record, linked_account: data?.[0] || null }
}

export async function listLendBorrow(supabase, user) {
  const { data: rows } = await applyOrder(supabase.from('lend_borrow').select('*'), 'lend_borrow')
  const { data: shares } = await supabase.from('lend_borrow_shares')
    .select('lend_borrow_id, role').eq('invited_user_id', user.id).eq('status', 'accepted')
  const roleByRecord = Object.fromEntries((shares || []).map((s) => [s.lend_borrow_id, s.role]))
  const tagged = (rows || []).map((r) => ({ ...r, my_role: r.user_id === user.id ? 'owner' : roleByRecord[r.id] }))
  return Promise.all(tagged.map((r) => (r.my_role && r.my_role !== 'owner' ? attachOwnerAccount(supabase, r) : r)))
}

export async function getLendBorrow(supabase, user, id) {
  const { data } = await supabase.from('lend_borrow').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  const role = await roleFor(supabase, data.user_id, id, user.id)
  const tagged = { ...data, my_role: role }
  return role && role !== 'owner' ? attachOwnerAccount(supabase, tagged) : tagged
}

export async function updateLendBorrow(supabase, user, id, body) {
  const { data: record } = await supabase.from('lend_borrow').select('user_id').eq('id', id).maybeSingle()
  if (!record) return { error: { message: 'Record not found', status: 404 } }
  const role = await roleFor(supabase, record.user_id, id, user.id)
  if (!canEditProfile(role)) return { error: { message: 'You don\'t have permission to edit this record', status: 403 } }
  const patch = pickFields('lend_borrow', body)
  // Same '' -> null sanitization as the create path (genericCrud.js) — LendForm's "None — skip
  // account impact" option, or a card's stripped-out 'cc:' prefix, are never real uuids.
  if (typeof patch.from_account_id === 'string' && (patch.from_account_id === '' || patch.from_account_id.startsWith('cc:'))) {
    patch.from_account_id = null
  }
  const { data: updated, error } = await supabase.from('lend_borrow').update(patch).eq('id', id).select().maybeSingle()
  if (error) return { error }
  return { updated: updated ? { ...updated, my_role: role } : null }
}

export async function deleteLendBorrow(supabase, user, id) {
  const { data: record } = await supabase.from('lend_borrow').select('user_id, linked_transaction_id').eq('id', id).maybeSingle()
  if (!record) return { ok: true }
  const role = await roleFor(supabase, record.user_id, id, user.id)
  if (!canDeleteProfile(role)) return { error: { message: 'Only the owner can delete this record', status: 403 } }
  // Same cascade genericCrud.js used to run: bank/cash balance restores automatically via the
  // sync_account_balance trigger, but a card's outstanding isn't trigger-managed, so it's
  // reversed by hand before the mirrored transaction itself is deleted.
  if (record.linked_transaction_id) {
    const { data: linkedTx } = await supabase.from('transactions').select('linked_module, linked_module_id, amount').eq('id', record.linked_transaction_id).maybeSingle()
    if (linkedTx?.linked_module === 'credit_card' && linkedTx.linked_module_id) {
      const { data: card } = await supabase.from('credit_cards').select('current_outstanding').eq('id', linkedTx.linked_module_id).maybeSingle()
      if (card) await supabase.from('credit_cards').update({ current_outstanding: Math.max(0, Number(card.current_outstanding || 0) - Number(linkedTx.amount)) }).eq('id', linkedTx.linked_module_id)
    }
    await supabase.from('transactions').delete().eq('id', record.linked_transaction_id)
  }
  const { error } = await supabase.from('lend_borrow').delete().eq('id', id)
  return { ok: !error }
}

// lend_repayments has no dedicated write route of its own (repayments are logged/reversed
// through the transactions catch-all's applyLendRepayment/reverseLendRepayment, untouched by
// this feature) — this is only the role-aware read side for /finance/summary.
export async function listLendRepayments(supabase) {
  const { data } = await applyOrder(supabase.from('lend_repayments').select('*'), 'lend_repayments')
  return data || []
}
