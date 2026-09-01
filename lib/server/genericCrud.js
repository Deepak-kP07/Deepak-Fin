import { pickFields } from '@/lib/server/safeFields'
import { applyOrder } from '@/lib/server/applyOrder'
import { ensureCategory } from '@/lib/server/services/categories'
import { approvePendingTransaction } from '@/lib/server/services/pendingTransactions'

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
//
// money_profiles/money_profile_entries graduated out too (lib/server/moneyProfileCrud.js) once
// sharing needed "owned or shared with me" visibility this engine's hardcoded
// .eq('user_id', user.id) can't express — see drizzle/0029_money_profile_sharing.sql.
//
// lend_borrow's list/get/update/delete graduated out the same way (lib/server/lendBorrowCrud.js,
// drizzle/0033_lend_borrow_sharing.sql) once per-record sharing needed the same "owned or shared"
// visibility — but its create side effect (the mirrored transaction / card-outstanding bump
// below) stays here unchanged, since creating a record is never itself a shared-with-me action.

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

// Tags the synthetic scholarship_payments row created when a scholarship's status is manually
// set to 'paid' via the Status field (as opposed to a real payment logged through "Pay to
// college"). Marked out so it can always be found again and resized/removed as total_amount or
// status change later — this is what keeps amount_paid_to_college from ever drifting away from
// reality no matter how many times the scholarship gets edited afterward.
const SCHOLARSHIP_AUTO_PAYMENT_NOTE = 'Marked paid directly (no account specified)'

export async function createInCollection(supabase, user, table, body) {
  const payload = { ...pickFields(table, body), user_id: user.id }
  if (table === 'holdings' && !HOLDINGS_CLIENT_SOURCES.includes(payload.source)) delete payload.source
  if (table === 'accounts' && payload.opening_balance !== undefined) payload.current_balance = payload.opening_balance
  if (table === 'loans' && payload.principal !== undefined && payload.outstanding === undefined) payload.outstanding = payload.principal
  // "cc:<id>" in from_account_id means this lend was funded on a credit card — not a real
  // accounts.id, so it can't go into this (uuid, FK) column. The side-effect below still
  // reads the original "cc:<id>" off `body` (untouched), so card funding is still applied.
  // A plain '' (LendForm's "None — skip account impact" option, or its own default when the
  // user has no accounts yet) is likewise not a real uuid — same class of bug already fixed for
  // LoanForm's paid_from_account_id, silently 500ing every save that picks "None" otherwise.
  if (table === 'lend_borrow' && typeof payload.from_account_id === 'string' && (payload.from_account_id === '' || payload.from_account_id.startsWith('cc:'))) {
    payload.from_account_id = null
  }
  // Re-subscribing on a device the browser already has a Push subscription for hands back the
  // exact same endpoint (PushManager dedupes this itself) — upsert instead of a plain insert so
  // that doesn't just fail on the (user_id, endpoint) unique constraint.
  const { data: created, error } = table === 'push_subscriptions'
    ? await supabase.from(table).upsert(payload, { onConflict: 'user_id,endpoint' }).select().single()
    : await supabase.from(table).insert(payload).select().single()
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

  // Side-effect: creating a scholarship straight as 'paid' (no payments have been logged yet,
  // since the scholarship didn't exist a moment ago) auto-logs the full amount as a payment —
  // this keeps amount_paid_to_college (which drives every paid/pending total and the payment
  // history list) truthful to the status you picked, instead of a label with no backing numbers.
  // No account is asked for here, so this payment carries no linked_transaction_id — use the
  // "Pay to college" flow instead when you want it tied to a real bank transaction.
  if (table === 'scholarships' && created?.id && payload.status === 'paid') {
    const totalAmt = Number(payload.total_amount || 0)
    if (totalAmt > 0) {
      await supabase.from('scholarship_payments').insert({ user_id: user.id, scholarship_id: created.id, amount: totalAmt, paid_to: 'College', payment_date: new Date().toISOString().slice(0, 10), account_id: null, notes: SCHOLARSHIP_AUTO_PAYMENT_NOTE })
      await supabase.from('scholarships').update({ amount_paid_to_college: totalAmt }).eq('id', created.id).eq('user_id', user.id)
    } else {
      await supabase.from('scholarships').update({ status: 'received' }).eq('id', created.id).eq('user_id', user.id)
    }
  }

  // Side-effect: scholarship created already-received (or paid straight through, which implies
  // received) with an account attached → income transaction.
  if (table === 'scholarships' && created?.id && (payload.status === 'received' || payload.status === 'paid') && payload.received_to_account_id) {
    const now = new Date()
    const txPayload = { user_id: user.id, account_id: payload.received_to_account_id, amount: Number(payload.total_amount), type: 'income', description: `${payload.name} received`, date: payload.received_date || now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), linked_module: 'scholarship', linked_module_id: created.id, notes: payload.notes || null }
    const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
    if (tx?.id) await supabase.from('scholarships').update({ linked_transaction_id: tx.id }).eq('id', created.id).eq('user_id', user.id)
  }

  // Side-effect: resolve a freshly-ingested pending SMS transaction's last4_hint to a real
  // account/card and its matched pattern's suggested_category_name to a real category — both are
  // deliberately NOT done in lib/sms/parseEngine.js (which stays a pure, mock-free function) and
  // not stored as a raw FK on sms_parse_patterns either, since categories are per-user (see the
  // comment on smsParsePatterns in db/schema.js) — this is the one place a real Supabase client
  // for the right user exists to do both lookups.
  if (table === 'pending_transactions' && created?.id) {
    const { data: matchedPattern } = created.matched_pattern_id
      ? await supabase.from('sms_parse_patterns').select('is_generic, suggested_category_name, suggested_category_type').eq('id', created.matched_pattern_id).maybeSingle()
      : { data: null }

    const patch = {}
    let resolvedAccount = !!(created.account_id || created.credit_card_id)
    if (created.last4_hint && !resolvedAccount) {
      const { data: account } = await supabase.from('accounts').select('id').eq('user_id', user.id).eq('account_number_last4', created.last4_hint).maybeSingle()
      if (account) { patch.account_id = account.id; resolvedAccount = true }
      else {
        const { data: card } = await supabase.from('credit_cards').select('id').eq('user_id', user.id).eq('last4', created.last4_hint).maybeSingle()
        if (card) { patch.credit_card_id = card.id; resolvedAccount = true }
      }
    }
    // The generic fallback (lib/sms/parseEngine.js's parseGeneric) matches broadly on purpose —
    // its real accuracy guarantee is this check, not its regex: without a last4 that traces back
    // to one of the user's own accounts/cards, there's no actual evidence this SMS is even about
    // their money (a promotional "cashback credited" text, another person's forwarded SMS, etc.)
    // — silently discard rather than surface it as something to review. Specific bank/app
    // patterns skip this; matching one at all is already enough confidence to keep.
    if (matchedPattern?.is_generic && !resolvedAccount) {
      await supabase.from('pending_transactions').delete().eq('id', created.id).eq('user_id', user.id)
      return { created: null }
    }
    if (!created.suggested_category_id && matchedPattern?.suggested_category_name && matchedPattern?.suggested_category_type) {
      patch.suggested_category_id = await ensureCategory(supabase, user.id, matchedPattern.suggested_category_name, matchedPattern.suggested_category_type)
    }
    let enriched = created
    if (Object.keys(patch).length > 0) {
      const { data: patched } = await supabase.from('pending_transactions').update(patch).eq('id', created.id).eq('user_id', user.id).select().maybeSingle()
      if (patched) enriched = patched
    }
    // Power-user opt-in (Settings > SMS Auto-Detect, off by default): a message that matched an
    // active pattern skips the approval card entirely. No amount cap — confirmed with the user
    // that the sender-level toggle alone is the intended safety boundary, not a per-transaction
    // limit. Still requires a resolved destination account/card; if last4 matching above didn't
    // find one, approvePendingTransaction's own validation rejects it and it just stays pending.
    if (enriched.matched_pattern_id && (enriched.account_id || enriched.credit_card_id)) {
      const { data: profile } = await supabase.from('profiles').select('sms_auto_approve_trusted').eq('id', user.id).maybeSingle()
      if (profile?.sms_auto_approve_trusted) {
        const result = await approvePendingTransaction(supabase, user.id, enriched.id, {})
        if (result.pending) return { created: result.pending }
      }
    }
    return { created: enriched }
  }

  return { created }
}

export async function updateInCollection(supabase, user, table, id, body) {
  const patch = pickFields(table, body)
  if (table === 'holdings' && !HOLDINGS_CLIENT_SOURCES.includes(patch.source)) delete patch.source
  // Keep amount_paid_to_college — which drives every paid/pending total and the payment history
  // — truthful whenever total_amount or status changes by hand. The synthetic "marked paid
  // directly" payment (if one exists) is resized or removed to match here, on every relevant
  // edit, rather than written once and left to go stale — that one-shot approach is exactly what
  // let a corrected total_amount typo leave behind a payment 10x too large (see the linked
  // scholarship_payments row's notes for how these get tagged).
  if (table === 'scholarships' && (patch.status !== undefined || patch.total_amount !== undefined)) {
    const { data: existing } = await supabase.from('scholarships').select('total_amount, status').eq('id', id).eq('user_id', user.id).maybeSingle()
    const totalAmt = Number(patch.total_amount ?? existing?.total_amount ?? 0)
    const nextStatus = patch.status ?? existing?.status
    const { data: payments } = await supabase.from('scholarship_payments').select('id, amount, notes').eq('scholarship_id', id).eq('user_id', user.id)
    const autoPayment = (payments || []).find((p) => p.notes === SCHOLARSHIP_AUTO_PAYMENT_NOTE)
    const realSum = (payments || []).filter((p) => p.notes !== SCHOLARSHIP_AUTO_PAYMENT_NOTE).reduce((s, p) => s + Number(p.amount || 0), 0)

    if (nextStatus === 'paid' && totalAmt > 0) {
      const neededAuto = Math.max(0, totalAmt - realSum)
      if (neededAuto > 0) {
        if (autoPayment) await supabase.from('scholarship_payments').update({ amount: neededAuto }).eq('id', autoPayment.id).eq('user_id', user.id)
        else await supabase.from('scholarship_payments').insert({ user_id: user.id, scholarship_id: id, amount: neededAuto, paid_to: 'College', payment_date: new Date().toISOString().slice(0, 10), account_id: null, notes: SCHOLARSHIP_AUTO_PAYMENT_NOTE })
      } else if (autoPayment) {
        await supabase.from('scholarship_payments').delete().eq('id', autoPayment.id).eq('user_id', user.id)
      }
      patch.amount_paid_to_college = Math.min(totalAmt, realSum + neededAuto)
    } else {
      // No longer manually marked paid, or no valid total to be "paid" against — any synthetic
      // top-up payment no longer makes sense; drop it and fall back to real logged payments only.
      if (autoPayment) await supabase.from('scholarship_payments').delete().eq('id', autoPayment.id).eq('user_id', user.id)
      patch.amount_paid_to_college = realSum
      if (patch.status === 'paid') patch.status = 'received'
    }
  }
  const { data: updated, error } = await supabase.from(table).update(patch).eq('id', id).eq('user_id', user.id).select().maybeSingle()

  // Keep a scholarship's "received" mirror transaction in sync on edit too — this is what was
  // missing before: editing status into received/paid (or editing amount/date/account on an
  // already-mirrored scholarship) previously never touched transactions at all.
  if (table === 'scholarships' && updated) {
    const shouldBeMirrored = (updated.status === 'received' || updated.status === 'paid') && updated.received_to_account_id
    if (updated.linked_transaction_id && shouldBeMirrored) {
      await supabase.from('transactions').update({
        account_id: updated.received_to_account_id, amount: Number(updated.total_amount), description: `${updated.name} received`, date: updated.received_date || new Date().toISOString().slice(0, 10), notes: updated.notes || null,
      }).eq('id', updated.linked_transaction_id).eq('user_id', user.id)
    } else if (updated.linked_transaction_id && !shouldBeMirrored) {
      // Status moved back to pending, or the linked account was cleared — the money was never
      // actually received against that account anymore, so the mirror shouldn't exist either.
      await supabase.from('transactions').delete().eq('id', updated.linked_transaction_id).eq('user_id', user.id)
      await supabase.from('scholarships').update({ linked_transaction_id: null }).eq('id', id).eq('user_id', user.id)
    } else if (!updated.linked_transaction_id && shouldBeMirrored) {
      const now = new Date()
      const txPayload = { user_id: user.id, account_id: updated.received_to_account_id, amount: Number(updated.total_amount), type: 'income', description: `${updated.name} received`, date: updated.received_date || now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5), linked_module: 'scholarship', linked_module_id: updated.id, notes: updated.notes || null }
      const { data: tx } = await supabase.from('transactions').insert(txPayload).select().single()
      if (tx?.id) await supabase.from('scholarships').update({ linked_transaction_id: tx.id }).eq('id', id).eq('user_id', user.id)
    }
  }

  return { updated, error }
}

export async function deleteFromCollection(supabase, user, table, id) {
  // Deleting a holding refunds its cost back onto the portfolio's cash_balance — handled by
  // the holdings_sync_portfolio_cash DB trigger, see the comment in createInCollection above.
  // Deleting a scholarship removes its mirrored "received" transaction, its own attachment, and
  // (since scholarship_payments cascade-deletes at the DB level, which doesn't know about
  // Storage objects or the transactions they mirror) each payment's attachment and mirrored
  // "paid to college" transaction too — otherwise those would silently orphan.
  if (table === 'scholarships') {
    const { data: s } = await supabase.from('scholarships').select('linked_transaction_id, attachment_path').eq('id', id).eq('user_id', user.id).maybeSingle()
    if (s?.linked_transaction_id) await supabase.from('transactions').delete().eq('id', s.linked_transaction_id).eq('user_id', user.id)
    if (s?.attachment_path) await supabase.storage.from('attachments').remove([s.attachment_path])
    const { data: payments } = await supabase.from('scholarship_payments').select('linked_transaction_id, attachment_path').eq('scholarship_id', id).eq('user_id', user.id)
    const paymentTxIds = (payments || []).map((p) => p.linked_transaction_id).filter(Boolean)
    if (paymentTxIds.length) await supabase.from('transactions').delete().in('id', paymentTxIds).eq('user_id', user.id)
    const paymentAttachments = (payments || []).map((p) => p.attachment_path).filter(Boolean)
    if (paymentAttachments.length) await supabase.storage.from('attachments').remove(paymentAttachments)
  }
  const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id)
  return { ok: !error }
}
