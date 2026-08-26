'use client'

import { useEffect, useState } from 'react'
import { Mail, UserMinus, X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { EmptyState } from '@/components/shared/EmptyState'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { roleFor } from '@/lib/moneyProfiles'

const ROLE_OPTIONS = [
  { value: 'read', label: 'Read — view only' },
  { value: 'edit', label: 'Edit — add & edit entries' },
  { value: 'admin', label: 'Admin — manage everything but delete' },
]

// Owner-or-admin-only per the RLS/route rules this mirrors (drizzle/0029_money_profile_sharing.sql,
// lib/server/services/moneyProfileSharing.js) — only the owner can grant or touch an admin-tier
// row, enforced here for a clean disabled control rather than letting a click 403.
function statusLabel(share) {
  if (share.status === 'pending' && new Date(share.expires_at).getTime() < Date.now()) return { text: 'Expired', tone: 'text-slate-500 bg-white/5' }
  const map = {
    pending: { text: 'Pending', tone: 'text-amber-200 light:text-amber-700 bg-amber-400/15' },
    accepted: { text: 'Active', tone: 'text-emerald-200 light:text-emerald-700 bg-emerald-400/15' },
    revoked: { text: 'Revoked', tone: 'text-slate-400 light:text-slate-500 bg-white/5' },
    declined: { text: 'Declined', tone: 'text-slate-400 light:text-slate-500 bg-white/5' },
  }
  return map[share.status] || map.revoked
}

function ManageAccessBody({ profile, shares, loading, viewerRole, email, setEmail, role, setRole, busy, onInvite, onRoleChange, onRevoke }) {
  const canGrantAdmin = viewerRole === 'owner'
  const live = shares.filter((s) => s.status === 'pending' || s.status === 'accepted')

  return (
    <>
      <form onSubmit={onInvite} className="flex flex-col gap-2 sm:flex-row">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="their@email.com" className="min-w-0 flex-1 rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none sm:w-52">
          {ROLE_OPTIONS.filter((o) => o.value !== 'admin' || canGrantAdmin).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <button disabled={busy} className="shrink-0 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-3 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Inviting…' : 'Invite'}</button>
      </form>

      <div className="mt-5">
        <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Access · {live.length}</div>
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">Loading…</div>
        ) : shares.length === 0 ? (
          <div className="rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02]">
            <EmptyState compact icon={Mail} title="Not shared with anyone yet" message="Invite someone by email above." />
          </div>
        ) : (
          <div className="space-y-2">
            {shares.map((s) => {
              const status = statusLabel(s)
              const isAccepted = s.status === 'accepted'
              // Only the owner can touch (revoke, or change the role of) an existing admin-tier
              // row — an admin collaborator managing this same list can act on read/edit rows only.
              const canTouch = viewerRole === 'owner' || s.role !== 'admin'
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white light:text-slate-900">{s.invited_email}</div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${status.tone}`}>{status.text}</span>
                  </div>
                  {isAccepted && canTouch ? (
                    <Select value={s.role} onChange={(e) => onRoleChange(s, e.target.value)} className="w-40 rounded-lg border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-2.5 py-2 text-xs text-white light:text-slate-900 outline-none">
                      {ROLE_OPTIONS.filter((o) => o.value !== 'admin' || canGrantAdmin || s.role === 'admin').map((o) => <option key={o.value} value={o.value}>{o.label.split(' — ')[0]}</option>)}
                    </Select>
                  ) : isAccepted && (
                    <span className="rounded-lg border border-white/10 light:border-black/10 px-2.5 py-2 text-xs capitalize text-slate-400 light:text-slate-500">{s.role}</span>
                  )}
                  {(s.status === 'pending' || s.status === 'accepted') && canTouch && (
                    <button onClick={() => onRevoke(s)} title="Revoke access" className="rounded-lg p-2 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><UserMinus size={15} /></button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// Follows MoneyProfileForm's exact BottomSheet-on-mobile / centered-modal-on-desktop pattern.
// Entirely online-only, plain fetch — same choice as every other sharing-management call
// (invite/accept/revoke), consistent with this app's rule that anything beyond plain
// {table,id} CRUD stays outside the offline outbox.
export function ManageAccessSheet({ open, onClose, profile, toast }) {
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('read')
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  const viewerRole = profile ? roleFor(profile) : 'owner'

  const load = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/money_profile_shares?profile_id=${profile.id}`)
      const body = await res.json()
      if (res.ok) setShares(Array.isArray(body) ? body : [])
    } finally { setLoading(false) }
  }
  useEffect(() => { if (open) { load(); setEmail(''); setRole('read') } }, [open, profile?.id])

  if (!open || !profile) return null

  const onInvite = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const res = await fetch('/api/finance/money_profile_shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: profile.id, invitedEmail: email, role }) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Could not send invite')
      toast.push(`Invite sent to ${email}`)
      setEmail(''); setRole('read'); await load()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const onRoleChange = async (share, newRole) => {
    const res = await fetch(`/api/finance/money_profile_shares/${share.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }) })
    const body = await res.json()
    if (!res.ok) { toast.push(body.error || 'Could not change role', 'error'); return }
    toast.push('Role updated'); await load()
  }

  const onRevoke = async (share) => {
    const res = await fetch(`/api/finance/money_profile_shares/${share.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'revoked' }) })
    const body = await res.json()
    if (!res.ok) { toast.push(body.error || 'Could not revoke access', 'error'); return }
    toast.push('Access revoked'); await load()
  }

  const bodyProps = { profile, shares, loading, viewerRole, email, setEmail, role, setRole, busy, onInvite, onRoleChange, onRevoke }

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={`Manage access · ${profile.name}`}>
        <ManageAccessBody {...bodyProps} />
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">Manage access · {profile.name}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <ManageAccessBody {...bodyProps} />
        </div>
      </div>
    </div>
  )
}
