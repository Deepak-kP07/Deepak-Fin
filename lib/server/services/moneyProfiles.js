import { profileTotals } from '@/lib/moneyProfiles'
import { createMoneyProfileEntry } from '@/lib/server/moneyProfileCrud'
import { ensureCategory } from '@/lib/server/services/categories'

// Same "log the drift as a labeled entry" pattern as syncAccountBalance (lib/server/services/
// accounts.js) — a profile's balance is never a stored column (see lib/moneyProfiles.js's
// profileTotals), so the only way to correct it is a normal income/expense entry, not a silent
// overwrite. Goes through createMoneyProfileEntry so permission checks, the closed-profile guard,
// and the linked-account transaction mirror all apply exactly as they would for a manually-added
// entry — this isn't a special-cased write path, just a computed one.
export async function syncMoneyProfileBalance(supabase, user, profileId, { target_balance, date, notes }) {
  const targetBalance = Number(target_balance)
  if (!Number.isFinite(targetBalance)) return { error: { message: 'target_balance is required', status: 400 } }
  const { data: profile } = await supabase.from('money_profiles').select('*').eq('id', profileId).maybeSingle()
  if (!profile) return { error: { message: 'Profile not found', status: 404 } }
  const { data: entries } = await supabase.from('money_profile_entries').select('*').eq('profile_id', profileId)
  const { balance } = profileTotals(profile, entries || [])
  const diff = targetBalance - balance
  if (Math.abs(diff) < 0.01) return { error: { message: 'Balance already matches — nothing to adjust', status: 400 } }
  const entry_type = diff > 0 ? 'income' : 'expense'
  const category_id = await ensureCategory(supabase, profile.user_id, 'Balance adjustment', entry_type)
  const now = new Date()
  const result = await createMoneyProfileEntry(supabase, user, {
    profile_id: profileId, entry_type, amount: Math.abs(diff), category_id,
    description: 'Balance sync', date: date || now.toISOString().slice(0, 10),
    notes: notes || `Reconciled with the real balance (${diff > 0 ? '+' : ''}${diff.toFixed(2)})`,
  })
  if (result.error) return result
  return { created: result.created, new_balance: targetBalance }
}
