// Mirrors drizzle/0029_money_profile_sharing.sql's user_role_on_profile() SQL function 1:1 —
// this is a UX/nicer-error-message convenience layer on top of RLS, never a substitute for it.
// Every check here has a matching RLS policy as the real enforcement; this just lets a route
// return a clear 403 instead of a row silently coming back empty.
export async function getProfileRole(supabase, profileId, userId) {
  const { data: profile } = await supabase.from('money_profiles').select('user_id').eq('id', profileId).maybeSingle()
  if (profile?.user_id === userId) return 'owner'
  const { data: share } = await supabase.from('money_profile_shares')
    .select('role').eq('profile_id', profileId).eq('invited_user_id', userId).eq('status', 'accepted').maybeSingle()
  return share?.role || null
}

// Lend/Borrow's sharing sibling — only two tiers ever exist there ('read'/'admin', no 'edit'),
// but 'owner'/'admin' mean the same thing regardless of resource, so every can*() helper below
// is reused as-is for lend_borrow call sites rather than duplicated.
export async function getLendBorrowRole(supabase, lendBorrowId, userId) {
  const { data: record } = await supabase.from('lend_borrow').select('user_id').eq('id', lendBorrowId).maybeSingle()
  if (record?.user_id === userId) return 'owner'
  const { data: share } = await supabase.from('lend_borrow_shares')
    .select('role').eq('lend_borrow_id', lendBorrowId).eq('invited_user_id', userId).eq('status', 'accepted').maybeSingle()
  return share?.role || null
}

export const canRead = (role) => !!role
export const canWriteEntries = (role) => role === 'owner' || role === 'edit' || role === 'admin'
export const canDeleteEntries = (role) => role === 'owner' || role === 'admin'
export const canEditProfile = (role) => role === 'owner' || role === 'admin'
export const canManageShares = (role) => role === 'owner' || role === 'admin'
export const canDeleteProfile = (role) => role === 'owner'
// Only the owner can grant or remove an admin-tier share — a non-owner admin can manage
// read/edit-tier collaborators but can't create a fellow admin or remove one.
export const canGrantRole = (role, targetRole) => role === 'owner' || (role === 'admin' && targetRole !== 'admin')
export const canRemoveShare = (role, targetRole) => role === 'owner' || (role === 'admin' && targetRole !== 'admin')
