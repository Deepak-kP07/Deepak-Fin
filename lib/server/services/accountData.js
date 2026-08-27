// Every table in the schema keyed off this user (see db/schema.js) except the two sharing join
// tables, which use owner_id instead of user_id — RLS only lets an owner delete those rows (see
// drizzle/0029, 0033), so an .eq('user_id', ...) delete would silently affect nothing there.
const USER_OWNED_TABLES = [
  'transaction_edit_history', 'loan_payments', 'credit_card_transactions', 'scholarship_payments',
  'lend_repayments', 'money_profile_entries', 'budget_month_categories', 'notification_events',
  'push_subscriptions', 'kite_orders', 'holdings', 'sips', 'other_investments',
  'recurring_transactions', 'transactions', 'bucket_list', 'lend_borrow', 'money_profiles',
  'budget_months', 'budgets', 'loans', 'scholarships', 'credit_cards', 'portfolios', 'vault_items',
  'money_rules', 'categories', 'accounts',
]
const OWNER_ID_TABLES = ['lend_borrow_shares', 'money_profile_shares']

// Records with a file in the private 'attachments' bucket — the exact path lives on the row
// itself (attachment_path), so these are collected and removed before the rows go, the same way
// a single delete already does elsewhere (see genericCrud.js's scholarship branch).
const ATTACHMENT_TABLES = ['transactions', 'scholarships', 'scholarship_payments']

async function removeUserAttachments(supabase, userId) {
  const paths = (await Promise.all(ATTACHMENT_TABLES.map(async (table) => {
    const { data } = await supabase.from(table).select('attachment_path').eq('user_id', userId).not('attachment_path', 'is', null)
    return (data || []).map((r) => r.attachment_path)
  }))).flat()
  if (paths.length > 0) await supabase.storage.from('attachments').remove(paths)
}

async function removeUserAvatar(supabase, userId) {
  const { data: files } = await supabase.storage.from('avatars').list(userId)
  const paths = (files || []).map((f) => `${userId}/${f.name}`)
  if (paths.length > 0) await supabase.storage.from('avatars').remove(paths)
}

// Wipes every row this user owns, everywhere, and resets the parts of their profile that only
// made sense alongside that data (Kite credentials/tokens, avatar, the onboarding tour flag) —
// deliberately keeps identity/appearance fields (name, age, theme, currency, accent color)
// untouched, since "clear my data" isn't "reset my account". Runs on the caller's own
// RLS-scoped session (never a service-role client), so it can only ever touch this user's rows.
export async function clearAllUserData(supabase, userId) {
  await Promise.all([removeUserAttachments(supabase, userId), removeUserAvatar(supabase, userId)])

  for (const table of USER_OWNED_TABLES) {
    await supabase.from(table).delete().eq('user_id', userId)
  }
  for (const table of OWNER_ID_TABLES) {
    await supabase.from(table).delete().eq('owner_id', userId)
  }

  await supabase.from('profiles').update({
    avatar_url: null,
    kite_api_key: null,
    kite_api_secret_encrypted: null,
    kite_access_token: null,
    kite_access_token_at: null,
    kite_mf_synced_at: null,
    kite_orders_synced_at: null,
    kite_last_error: null,
    tour_completed_at: null,
  }).eq('id', userId)
}
