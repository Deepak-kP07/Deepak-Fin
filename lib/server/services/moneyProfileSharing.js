import { randomUUID } from 'node:crypto'
import { getProfileRole, canManageShares, canGrantRole, canRemoveShare } from '@/lib/server/permissions'
import { sendInviteEmail } from '@/lib/email'

const ROLES = ['read', 'edit', 'admin']
const INVITE_TTL_DAYS = 7

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

function acceptUrlFor(token) {
  return `${baseUrl()}/invite/${token}`
}

// Creates a new invite, or refreshes an existing pending/revoked/declined one for the same
// (profile, email) back to a fresh pending state — the partial unique index on
// money_profile_shares only covers live (pending/accepted) rows, so this keeps one row per
// invitee per profile instead of piling up dead ones. The email send is best-effort — a Resend
// failure never blocks the invite row itself from being created, matching this app's existing
// pattern for non-critical side effects (push notifications, Kite syncs); acceptUrl comes back
// either way, so the caller can always hand it over manually if the email never lands.
export async function createOrRefreshInvite(supabase, user, { profileId, invitedEmail, role }) {
  if (!profileId || !invitedEmail || !role) return { error: { message: 'profileId, invitedEmail, and role are required', status: 400 } }
  if (!ROLES.includes(role)) return { error: { message: `role must be one of ${ROLES.join(', ')}`, status: 400 } }
  const email = String(invitedEmail).trim().toLowerCase()
  if (!email.includes('@')) return { error: { message: 'That doesn\'t look like a valid email address', status: 400 } }

  const callerRole = await getProfileRole(supabase, profileId, user.id)
  if (!canManageShares(callerRole)) return { error: { message: 'You don\'t have permission to manage access on this profile', status: 403 } }
  if (!canGrantRole(callerRole, role)) return { error: { message: 'Only the profile owner can grant admin access', status: 403 } }
  if (callerRole === 'owner' && user.email && email === user.email.toLowerCase()) {
    return { error: { message: 'You already own this profile', status: 400 } }
  }

  const { data: existing } = await supabase.from('money_profile_shares')
    .select('*').eq('profile_id', profileId).eq('invited_email', email).maybeSingle()

  if (existing?.status === 'accepted') {
    return { error: { message: 'This person already has access — change their role instead of re-inviting', status: 409 } }
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString()
  const acceptUrl = acceptUrlFor(token)

  let share
  if (existing) {
    // Either still pending (resend) or previously revoked/declined (re-invite) — either way,
    // refresh the same row in place rather than fighting the partial unique index with a
    // duplicate insert.
    const { data: refreshed, error } = await supabase.from('money_profile_shares').update({
      role, status: 'pending', invite_token: token, invited_by_user_id: user.id,
      invited_user_id: null, responded_at: null, expires_at: expiresAt,
    }).eq('id', existing.id).select().single()
    if (error) return { error }
    share = refreshed
  } else {
    const { data: created, error } = await supabase.from('money_profile_shares').insert({
      profile_id: profileId, owner_id: callerRole === 'owner' ? user.id : (await ownerIdFor(supabase, profileId)),
      invited_email: email, role, invite_token: token, invited_by_user_id: user.id, expires_at: expiresAt,
    }).select().single()
    if (error) return { error }
    share = created
  }

  const [{ data: profile }, { data: inviterProfile }] = await Promise.all([
    supabase.from('money_profiles').select('name').eq('id', profileId).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ])
  await sendInviteEmail({
    to: email, profileName: profile?.name || 'a profile', role, acceptUrl,
    inviterName: inviterProfile?.full_name || user.email,
  }).catch(() => {})

  return { share, acceptUrl }
}

async function ownerIdFor(supabase, profileId) {
  const { data } = await supabase.from('money_profiles').select('user_id').eq('id', profileId).maybeSingle()
  return data?.user_id
}

// The "Manage access" list — owner/admin only, mirroring the RLS select policy's intent but
// gated explicitly here so a read/edit-tier collaborator gets a clear 403 instead of a
// silently-empty list (RLS would only ever show them their own row anyway).
export async function listShares(supabase, user, profileId) {
  const callerRole = await getProfileRole(supabase, profileId, user.id)
  if (!canManageShares(callerRole)) return { error: { message: 'You don\'t have permission to view this profile\'s access list', status: 403 } }
  const { data, error } = await supabase.from('money_profile_shares')
    .select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
  if (error) return { error }
  return { shares: data || [] }
}

// Role change or revoke, by the owner/an admin collaborator — or a collaborator revoking their
// own access ("leave this profile"). Every check here is mirrored by an RLS policy that's the
// real backstop; this just produces a clearer error than a silent "0 rows updated."
export async function updateShare(supabase, user, shareId, { role, status }) {
  const { data: share } = await supabase.from('money_profile_shares').select('*').eq('id', shareId).maybeSingle()
  if (!share) return { error: { message: 'Share not found', status: 404 } }
  const callerRole = await getProfileRole(supabase, share.profile_id, user.id)

  if (status === 'revoked') {
    const isSelfLeaving = share.invited_user_id === user.id
    if (!isSelfLeaving && !canRemoveShare(callerRole, share.role)) {
      return { error: { message: callerRole === 'admin' ? 'Only the owner can remove another admin' : 'You don\'t have permission to revoke this', status: 403 } }
    }
    const { data: updated, error } = await supabase.from('money_profile_shares')
      .update({ status: 'revoked', responded_at: new Date().toISOString() }).eq('id', shareId).select().single()
    if (error) return { error }
    return { share: updated }
  }

  if (role !== undefined) {
    if (!ROLES.includes(role)) return { error: { message: `role must be one of ${ROLES.join(', ')}`, status: 400 } }
    if (!canRemoveShare(callerRole, share.role)) return { error: { message: 'Only the owner can change an admin\'s role', status: 403 } }
    if (!canGrantRole(callerRole, role)) return { error: { message: 'Only the owner can grant admin access', status: 403 } }
    const { data: updated, error } = await supabase.from('money_profile_shares').update({ role }).eq('id', shareId).select().single()
    if (error) return { error }
    return { share: updated }
  }

  return { error: { message: 'Nothing to update — pass role or status', status: 400 } }
}

// Public preview (no auth required — same trust model as any emailed invite link: knowing the
// token is what grants the ability to see what it's for) so an invite landing page can show
// "you're invited to <profile> as <role>" before the person has even logged in, and so the
// accept step can produce a precise "this was sent to a different email" message instead of a
// bare RLS-filtered 404.
export async function previewInvite(supabase, token) {
  const { data, error } = await supabase.rpc('money_profile_share_preview', { p_token: token }).maybeSingle()
  if (error || !data) return { error: { message: 'Invite not found', status: 404 } }
  return { preview: data }
}

export async function respondToInvite(supabase, user, token, action) {
  if (action !== 'accept' && action !== 'decline') return { error: { message: 'action must be accept or decline', status: 400 } }
  const { preview, error: previewError } = await previewInvite(supabase, token)
  if (previewError) return { error: previewError }
  if (preview.status !== 'pending') return { error: { message: 'This invite is no longer pending', status: 400 } }
  if (new Date(preview.expires_at).getTime() < Date.now()) return { error: { message: 'This invite has expired — ask for a new one', status: 400 } }
  const userEmail = (user.email || '').toLowerCase()
  if (userEmail !== preview.invited_email.toLowerCase()) {
    return { error: { message: `This invite was sent to ${preview.invited_email} — log in as that address to accept it`, status: 403 } }
  }

  const { data: updated, error } = await supabase.from('money_profile_shares').update({
    status: action === 'accept' ? 'accepted' : 'declined',
    invited_user_id: user.id,
    responded_at: new Date().toISOString(),
  }).eq('invite_token', token).select().single()
  if (error) return { error }
  return { share: updated }
}
