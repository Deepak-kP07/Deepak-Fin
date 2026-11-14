import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Check, Copy, Mail, UserMinus } from 'lucide-react-native'
import { BottomSheet } from '../../ui/BottomSheet'
import { EmptyState } from '../../ui/EmptyState'
import { Input } from '../../ui/FormKit'
import { Select } from '../../ui/Select'
import { Icon } from '../../ui/Icon'
import { AccentGradient } from '../../ui/Gradient'
import { tw } from '../../lib/tw'
import { api, WEB_URL } from '../../lib/api'
import { toast } from '../../lib/toast'
import { buildLendInviteMessage, buildProfileInviteMessage } from '../../lib/shared'

// One port of both features/lend-borrow/ManageLendAccessSheet.jsx and
// features/familyCompany/ManageAccessSheet.jsx — they differ only in endpoints, roles and the
// invite message, which `kind` picks.
const KINDS = {
  lend: {
    table: 'lend_borrow_shares', listParam: 'lend_borrow_id', idKey: 'lendBorrowId',
    roles: [{ value: 'read', label: 'Read — view only' }, { value: 'admin', label: 'Admin — edit & manage access' }],
    inviteUrl: (s) => `${WEB_URL}/invite/lend/${s.invite_token}`,
    message: (target, s, acceptUrl) => buildLendInviteMessage({ personName: target.person_name, role: s.role, invitedEmail: s.invited_email, acceptUrl }),
    title: (target) => `Manage access · ${target.person_name}`,
  },
  profile: {
    table: 'money_profile_shares', listParam: 'profile_id', idKey: 'profileId',
    roles: [{ value: 'read', label: 'Read — view only' }, { value: 'edit', label: 'Edit — add & edit entries' }, { value: 'admin', label: 'Admin — manage everything but delete' }],
    inviteUrl: (s) => `${WEB_URL}/invite/${s.invite_token}`,
    message: (target, s, acceptUrl) => buildProfileInviteMessage({ profileName: target.name, role: s.role, invitedEmail: s.invited_email, acceptUrl }),
    title: (target) => `Manage access · ${target.name}`,
  },
}

function statusLabel(share) {
  if (share.status === 'pending' && new Date(share.expires_at).getTime() < Date.now()) return { text: 'Expired', bg: 'bg-white/5', fg: 'text-slate-500' }
  const map = {
    pending: { text: 'Pending', bg: 'bg-amber-400/15', fg: 'text-amber-200 light:text-amber-700' },
    accepted: { text: 'Active', bg: 'bg-emerald-400/15', fg: 'text-emerald-200 light:text-emerald-700' },
    revoked: { text: 'Revoked', bg: 'bg-white/5', fg: 'text-slate-400 light:text-slate-500' },
    declined: { text: 'Declined', bg: 'bg-white/5', fg: 'text-slate-400 light:text-slate-500' },
  }
  return map[share.status] || map.revoked
}

export function ManageAccessSheet({ open, onClose, kind, target }) {
  const cfg = KINDS[kind]
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('read')
  const [busy, setBusy] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const viewerRole = target?.my_role || 'owner'
  const canGrantAdmin = viewerRole === 'owner'

  const load = async () => {
    if (!target) return
    setLoading(true)
    try { const body = await api(`/finance/${cfg.table}?${cfg.listParam}=${target.id}`); setShares(Array.isArray(body) ? body : []) } catch { /* keep the old list */ } finally { setLoading(false) }
  }
  useEffect(() => { if (open) { load(); setEmail(''); setRole('read') } }, [open, target?.id])
  if (!target) return null

  const onInvite = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast.push('Enter a valid email address.', 'error'); return }
    setBusy(true)
    try {
      await api(`/finance/${cfg.table}`, { method: 'POST', body: { [cfg.idKey]: target.id, invitedEmail: email.trim(), role } })
      toast.push(`Invite sent to ${email.trim()}`)
      setEmail(''); setRole('read'); await load()
    } catch (e) { toast.push(e.message || 'Could not send invite', 'error') } finally { setBusy(false) }
  }
  const patch = async (share, body, done) => {
    try { await api(`/finance/${cfg.table}/${share.id}`, { method: 'PATCH', body }); toast.push(done); await load() } catch (e) { toast.push(e.message, 'error') }
  }
  const onCopy = async (s) => {
    await Clipboard.setStringAsync(cfg.message(target, s, cfg.inviteUrl(s)))
    setCopiedId(s.id)
    toast.push('Invite message copied — paste it anywhere')
    setTimeout(() => setCopiedId((id) => (id === s.id ? null : id)), 1500)
  }

  const live = shares.filter((s) => s.status === 'pending' || s.status === 'accepted')
  const roleOptions = cfg.roles.filter((o) => o.value !== 'admin' || canGrantAdmin)
  return (
    <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={cfg.title(target)}>
      <View className="gap-2">
        <Input className="mt-0" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="their@email.com" />
        <Select value={role} onChange={setRole} options={roleOptions} title="Access level" />
        <Pressable disabled={busy} onPress={onInvite} className={tw(busy && 'opacity-60')}>
          <AccentGradient dir="r" style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
            {busy ? <ActivityIndicator color="#07101c" /> : <Text className="text-sm font-semibold text-[#07101c]">Invite</Text>}
          </AccentGradient>
        </Pressable>
      </View>

      <View className="mt-5 pb-4">
        <Text className="mb-2 text-xs uppercase tracking-widest text-slate-500">Access · {live.length}</Text>
        {loading ? (
          <Text className="py-6 text-center text-sm text-slate-500">Loading…</Text>
        ) : shares.length === 0 ? (
          <View className={tw('rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02]')}>
            <EmptyState compact icon={Mail} title="Not shared with anyone yet" message="Invite someone by email above." />
          </View>
        ) : (
          <View className="gap-2">
            {shares.map((s) => {
              const status = statusLabel(s)
              const isAccepted = s.status === 'accepted'
              const isPendingLive = s.status === 'pending' && status.text === 'Pending'
              const canTouch = viewerRole === 'owner' || s.role !== 'admin'
              return (
                <View key={s.id} className={tw('flex-row flex-wrap items-center gap-3 rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-4 py-3')}>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className={tw('text-sm text-white light:text-slate-900')}>{s.invited_email}</Text>
                    <View className={tw('mt-1 self-start rounded-full px-2 py-0.5', status.bg)}><Text className={tw('text-[10px] font-semibold uppercase tracking-widest', status.fg)}>{status.text}</Text></View>
                  </View>
                  {isAccepted && canTouch ? (
                    <View style={{ width: 130 }}>
                      <Select value={s.role} onChange={(v) => patch(s, { role: v }, 'Role updated')} title="Access level"
                        options={cfg.roles.filter((o) => o.value !== 'admin' || canGrantAdmin || s.role === 'admin').map((o) => ({ value: o.value, label: o.label.split(' — ')[0] }))}
                        className="rounded-lg border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-2.5 py-2" textClassName="text-xs text-white light:text-slate-900" />
                    </View>
                  ) : isAccepted ? (
                    <View className={tw('rounded-lg border border-white/10 light:border-black/10 px-2.5 py-2')}><Text className={tw('text-xs capitalize text-slate-400 light:text-slate-500')}>{s.role}</Text></View>
                  ) : null}
                  {isPendingLive && (
                    <Pressable onPress={() => onCopy(s)} className="rounded-lg p-2"><Icon as={copiedId === s.id ? Check : Copy} size={15} className={tw('text-accent-200 light:text-accent-700')} /></Pressable>
                  )}
                  {(s.status === 'pending' || s.status === 'accepted') && canTouch && (
                    <Pressable onPress={() => patch(s, { status: 'revoked' }, 'Access revoked')} className="rounded-lg p-2"><Icon as={UserMinus} size={15} className={tw('text-rose-300/70 light:text-rose-700')} /></Pressable>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </View>
    </BottomSheet>
  )
}
