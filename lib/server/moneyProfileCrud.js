import { pickFields } from '@/lib/server/safeFields'
import { applyOrder } from '@/lib/server/applyOrder'
import { getProfileRole, canWriteEntries, canDeleteEntries, canEditProfile, canDeleteProfile } from '@/lib/server/permissions'

// money_profiles/money_profile_entries graduated out of lib/server/genericCrud.js's shared
// engine (its per-table hardcoded .eq('user_id', user.id) can't express "owned or shared with
// me") — this is the dedicated replacement, following the same "bespoke logic gets its own
// file" precedent as lib/server/services/budgets.js etc.
//
// Reads lean entirely on RLS (drizzle/0029) rather than re-deriving visibility here: a plain
// `select('*')` already returns exactly the owned-or-shared rows a session is allowed to see, so
// list/get below only need to ATTACH a `my_role` tag, never filter — Decision A in practice.

async function roleFor(supabase, profileUserId, profileId, userId) {
  return profileUserId === userId ? 'owner' : getProfileRole(supabase, profileId, userId)
}

// ---- money_profiles ----

export async function listMoneyProfiles(supabase, user) {
  const { data: rows } = await applyOrder(supabase.from('money_profiles').select('*'), 'money_profiles')
  const { data: shares } = await supabase.from('money_profile_shares')
    .select('profile_id, role').eq('invited_user_id', user.id).eq('status', 'accepted')
  const roleByProfile = Object.fromEntries((shares || []).map((s) => [s.profile_id, s.role]))
  const tagged = (rows || []).map((p) => ({ ...p, my_role: p.user_id === user.id ? 'owner' : roleByProfile[p.id] }))

  // categories keeps its own owner-only RLS (sharing was only extended to money_profiles/
  // money_profile_entries) — a collaborator's session can't SELECT the owner's categories
  // directly, so a shared profile needs its owner's categories fetched via a narrow
  // SECURITY DEFINER RPC and attached, or category names/pickers would come up empty for
  // anyone but the owner. One call per profile the caller doesn't own (typically zero or a
  // handful) rather than a shared global list, so this never leaks into the collaborator's own
  // Settings > Categories screen.
  await Promise.all(tagged.filter((p) => p.my_role && p.my_role !== 'owner').map(async (p) => {
    const { data: ownerCategories } = await supabase.rpc('money_profile_owner_categories', { p_profile_id: p.id })
    p.owner_categories = ownerCategories || []
  }))
  return tagged
}

export async function getMoneyProfile(supabase, user, id) {
  const { data } = await supabase.from('money_profiles').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  const role = await roleFor(supabase, data.user_id, id, user.id)
  if (role && role !== 'owner') {
    const { data: ownerCategories } = await supabase.rpc('money_profile_owner_categories', { p_profile_id: id })
    return { ...data, my_role: role, owner_categories: ownerCategories || [] }
  }
  return { ...data, my_role: role }
}

export async function createMoneyProfile(supabase, user, body) {
  const payload = { ...pickFields('money_profiles', body), user_id: user.id }
  const { data: created, error } = await supabase.from('money_profiles').insert(payload).select().single()
  if (error) return { error }
  return { created: { ...created, my_role: 'owner' } }
}

export async function updateMoneyProfile(supabase, user, id, body) {
  const { data: profile } = await supabase.from('money_profiles').select('user_id').eq('id', id).maybeSingle()
  if (!profile) return { error: { message: 'Profile not found', status: 404 } }
  const role = await roleFor(supabase, profile.user_id, id, user.id)
  if (!canEditProfile(role)) return { error: { message: 'You don\'t have permission to edit this profile', status: 403 } }
  const patch = pickFields('money_profiles', body)
  const { data: updated, error } = await supabase.from('money_profiles').update(patch).eq('id', id).select().maybeSingle()
  if (error) return { error }
  return { updated: updated ? { ...updated, my_role: role } : null }
}

export async function deleteMoneyProfile(supabase, user, id) {
  const { data: profile } = await supabase.from('money_profiles').select('user_id').eq('id', id).maybeSingle()
  if (!profile) return { ok: true }
  const role = await roleFor(supabase, profile.user_id, id, user.id)
  if (!canDeleteProfile(role)) return { error: { message: 'Only the owner can delete this profile', status: 403 } }
  // Entries cascade-delete at the DB level along with the profile, but a mirrored transaction has
  // no FK back to its entry (only linked_module_id), so it would otherwise survive that cascade as
  // an orphan — clean those up explicitly first, mirroring what
  // mirror_money_profile_entry_transaction's delete branch does for a single entry.
  const { data: entries } = await supabase.from('money_profile_entries').select('linked_transaction_id').eq('profile_id', id).not('linked_transaction_id', 'is', null)
  const transactionIds = (entries || []).map((e) => e.linked_transaction_id)
  if (transactionIds.length > 0) await supabase.from('transactions').delete().in('id', transactionIds)
  const { error } = await supabase.from('money_profiles').delete().eq('id', id)
  return { ok: !error }
}

// ---- money_profile_entries ----

export async function listMoneyProfileEntries(supabase) {
  // No user_id filter needed here at all — RLS already restricts this to entries under a
  // profile the caller owns or has accepted access to (every entry's user_id is the profile
  // OWNER's id regardless of who logged it, so the owner's own auth.uid() = user_id branch
  // alone already covers everything they should see; a collaborator needs the shares-exists
  // branch, which is keyed off profile_id, not who authored the row).
  const { data } = await applyOrder(supabase.from('money_profile_entries').select('*'), 'money_profile_entries')
  return data || []
}

// Mirrors getMoneyProfile/getLendBorrow's shape (attaches my_role) — the route previously did a
// bare select relying on RLS alone with no role tag, unlike every sibling single-record getter.
export async function getMoneyProfileEntry(supabase, user, id) {
  const { data } = await supabase.from('money_profile_entries').select('*').eq('id', id).maybeSingle()
  if (!data) return null
  const { data: profile } = await supabase.from('money_profiles').select('user_id').eq('id', data.profile_id).maybeSingle()
  const role = await roleFor(supabase, profile?.user_id, data.profile_id, user.id)
  return { ...data, my_role: role }
}

export async function createMoneyProfileEntry(supabase, user, body) {
  const payload = pickFields('money_profile_entries', body)
  if (!payload.profile_id) return { error: { message: 'profile_id is required', status: 400 } }
  const { data: profile } = await supabase.from('money_profiles').select('user_id, status, linked_account_id').eq('id', payload.profile_id).maybeSingle()
  if (!profile) return { error: { message: 'Profile not found', status: 404 } }
  const role = await roleFor(supabase, profile.user_id, payload.profile_id, user.id)
  if (!canWriteEntries(role)) return { error: { message: 'You don\'t have permission to add entries to this profile', status: 403 } }
  // A closed profile blocks new entries until reactivated — enforced here, not just hidden in
  // the UI, matching the check this used to run inside genericCrud.js before graduating out.
  if (profile.status === 'closed') return { error: { message: 'This profile is closed — reactivate it to add new entries.', status: 400 } }

  // Always the profile OWNER's id, never the acting user's — this is what lets the entry show
  // up correctly in the owner's own ledger no matter who logged it (for the owner themself,
  // profile.user_id already equals their own id, so this is never a special case to branch on).
  const { data: created, error } = await supabase.from('money_profile_entries')
    .insert({ ...payload, user_id: profile.user_id }).select().single()
  if (error) return { error }

  if (profile.linked_account_id) {
    const { error: mirrorError } = await supabase.rpc('mirror_money_profile_entry_transaction', { p_entry_id: created.id, p_action: 'create' })
    if (mirrorError) return { error: mirrorError }
    const { data: refreshed } = await supabase.from('money_profile_entries').select('*').eq('id', created.id).maybeSingle()
    return { created: refreshed || created }
  }
  return { created }
}

export async function updateMoneyProfileEntry(supabase, user, id, body) {
  const { data: existing } = await supabase.from('money_profile_entries').select('*').eq('id', id).maybeSingle()
  if (!existing) return { error: { message: 'Entry not found', status: 404 } }
  const { data: profile } = await supabase.from('money_profiles').select('user_id').eq('id', existing.profile_id).maybeSingle()
  const role = await roleFor(supabase, profile?.user_id, existing.profile_id, user.id)
  if (!canWriteEntries(role)) return { error: { message: 'You don\'t have permission to edit entries on this profile', status: 403 } }
  const patch = pickFields('money_profile_entries', body)
  // An entry can never move to a different profile via edit (the DB trigger blocks it anyway —
  // stripped here so a stray profile_id in the payload fails clean instead of as a raw trigger
  // exception).
  delete patch.profile_id
  const { data: updated, error } = await supabase.from('money_profile_entries').update(patch).eq('id', id).select().maybeSingle()
  if (error) return { error }
  if (updated?.linked_transaction_id) {
    const { error: mirrorError } = await supabase.rpc('mirror_money_profile_entry_transaction', { p_entry_id: id, p_action: 'update' })
    if (mirrorError) return { error: mirrorError }
  }
  return { updated }
}

export async function deleteMoneyProfileEntry(supabase, user, id) {
  const { data: existing } = await supabase.from('money_profile_entries').select('profile_id, linked_transaction_id').eq('id', id).maybeSingle()
  if (!existing) return { ok: true }
  const { data: profile } = await supabase.from('money_profiles').select('user_id').eq('id', existing.profile_id).maybeSingle()
  const role = await roleFor(supabase, profile?.user_id, existing.profile_id, user.id)
  if (!canDeleteEntries(role)) return { error: { message: 'You don\'t have permission to delete entries on this profile', status: 403 } }
  if (existing.linked_transaction_id) {
    const { error: mirrorError } = await supabase.rpc('mirror_money_profile_entry_transaction', { p_entry_id: id, p_action: 'delete' })
    if (mirrorError) return { error: mirrorError }
  }
  const { error } = await supabase.from('money_profile_entries').delete().eq('id', id)
  return { ok: !error }
}
