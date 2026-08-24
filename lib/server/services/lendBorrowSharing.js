import { randomUUID } from 'node:crypto'
import { getLendBorrowRole, canManageShares, canGrantRole, canRemoveShare } from '@/lib/server/permissions'
import { sendLendBorrowShareEmail } from '@/lib/email'

// Lend/Borrow's sibling of lib/server/services/moneyProfileSharing.js — same invite/accept/
// revoke shape, but only two tiers ('read'/'admin').
const ROLES = ['read', 'admin']
const INVITE_TTL_DAYS = 7

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

function acceptUrlFor(token) {
  return `${baseUrl()}/invite/lend/${token}`
}

export async function createOrRefreshInvite(supabase, user, { lendBorrowId, invitedEmail, role }) {
  if (!lendBorrowId || !invitedEmail || !role) return { error: { message: 'lendBorrowId, invitedEmail, and role are required', status: 400 } }
  if (!ROLES.includes(role)) return { error: { message: `role must be one of ${ROLES.join(', ')}`, status: 400 } }
  const email = String(invitedEmail).trim().toLowerCase()
  if (!email.includes('@')) return { error: { message: 'That doesn\'t look like a valid email address', status: 400 } }

  const callerRole = await getLendBorrowRole(supabase, lendBorrowId, user.id)
  if (!canManageShares(callerRole)) return { error: { message: 'You don\'t have permission to manage access on this record', status: 403 } }
  if (!canGrantRole(callerRole, role)) return { error: { message: 'Only the record\'s owner can grant admin access', status: 403 } }
  if (callerRole === 'owner' && user.email && email === user.email.toLowerCase()) {
    return { error: { message: 'You already own this record', status: 400 } }
  }

  const { data: existing } = await supabase.from('lend_borrow_shares')
    .select('*').eq('lend_borrow_id', lendBorrowId).eq('invited_email', email).maybeSingle()

  if (existing?.status === 'accepted') {
    return { error: { message: 'This person already has access — change their role instead of re-inviting', status: 409 } }
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString()
  const acceptUrl = acceptUrlFor(token)

  let share
  if (existing) {
    const { data: refreshed, error } = await supabase.from('lend_borrow_shares').update({
      role, status: 'pending', invite_token: token, invited_by_user_id: user.id,
      invited_user_id: null, responded_at: null, expires_at: expiresAt,
    }).eq('id', existing.id).select().single()
    if (error) return { error }
    share = refreshed
  } else {
    const { data: created, error } = await supabase.from('lend_borrow_shares').insert({
      lend_borrow_id: lendBorrowId, owner_id: callerRole === 'owner' ? user.id : (await ownerIdFor(supabase, lendBorrowId)),
      invited_email: email, role, invite_token: token, invited_by_user_id: user.id, expires_at: expiresAt,
    }).select().single()
    if (error) return { error }
    share = created
  }

  const [{ data: record }, { data: inviterProfile }] = await Promise.all([
    supabase.from('lend_borrow').select('person_name, type, amount').eq('id', lendBorrowId).maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ])
  await sendLendBorrowShareEmail({
    to: email, personName: record?.person_name || 'someone', recordType: record?.type, amount: record?.amount,
    role, acceptUrl, inviterName: inviterProfile?.full_name || user.email,
  }).catch(() => {})

  return { share, acceptUrl }
}

async function ownerIdFor(supabase, lendBorrowId) {
  const { data } = await supabase.from('lend_borrow').select('user_id').eq('id', lendBorrowId).maybeSingle()
  return data?.user_id
}

export async function listShares(supabase, user, lendBorrowId) {
  const callerRole = await getLendBorrowRole(supabase, lendBorrowId, user.id)
  if (!canManageShares(callerRole)) return { error: { message: 'You don\'t have permission to view this record\'s access list', status: 403 } }
  const { data, error } = await supabase.from('lend_borrow_shares')
    .select('*').eq('lend_borrow_id', lendBorrowId).order('created_at', { ascending: false })
  if (error) return { error }
  return { shares: data || [] }
}

export async function updateShare(supabase, user, shareId, { role, status }) {
  const { data: share } = await supabase.from('lend_borrow_shares').select('*').eq('id', shareId).maybeSingle()
  if (!share) return { error: { message: 'Share not found', status: 404 } }
  const callerRole = await getLendBorrowRole(supabase, share.lend_borrow_id, user.id)

  if (status === 'revoked') {
    const isSelfLeaving = share.invited_user_id === user.id
    if (!isSelfLeaving && !canRemoveShare(callerRole, share.role)) {
      return { error: { message: callerRole === 'admin' ? 'Only the owner can remove another admin' : 'You don\'t have permission to revoke this', status: 403 } }
    }
    const { data: updated, error } = await supabase.from('lend_borrow_shares')
      .update({ status: 'revoked', responded_at: new Date().toISOString() }).eq('id', shareId).select().single()
    if (error) return { error }
    return { share: updated }
  }

  if (role !== undefined) {
    if (!ROLES.includes(role)) return { error: { message: `role must be one of ${ROLES.join(', ')}`, status: 400 } }
    if (!canRemoveShare(callerRole, share.role)) return { error: { message: 'Only the owner can change an admin\'s role', status: 403 } }
    if (!canGrantRole(callerRole, role)) return { error: { message: 'Only the owner can grant admin access', status: 403 } }
    const { data: updated, error } = await supabase.from('lend_borrow_shares').update({ role }).eq('id', shareId).select().single()
    if (error) return { error }
    return { share: updated }
  }

  return { error: { message: 'Nothing to update — pass role or status', status: 400 } }
}

export async function previewInvite(supabase, token) {
  const { data, error } = await supabase.rpc('lend_borrow_share_preview', { p_token: token }).maybeSingle()
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

  const { data: updated, error } = await supabase.from('lend_borrow_shares').update({
    status: action === 'accept' ? 'accepted' : 'declined',
    invited_user_id: user.id,
    responded_at: new Date().toISOString(),
  }).eq('invite_token', token).select().single()
  if (error) return { error }
  return { share: updated }
}
