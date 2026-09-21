'use client'

import { useState } from 'react'
import {
  ArrowLeft, Ban, Bell, KeyRound, Mail, RotateCcw, ShieldAlert, Smartphone,
} from 'lucide-react'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { NAV_META } from '@/lib/navMeta'
import { MODULE_KEYS } from '@/lib/moduleSettings'
import { useAdminFetch } from '@/features/admin/useAdminFetch'

const COUNT_LABELS = {
  accounts: 'Accounts', transactions: 'Transactions', holdings: 'Holdings',
  loans: 'Loans', credit_cards: 'Credit cards', chit_funds: 'Chit funds', vault_items: 'Vault items',
}

function fmt(iso) {
  return iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'
}

export function AdminUserDetail({ userId, onBack, onAuthExpired }) {
  const { data: user, error } = useAdminFetch(`/api/admin/users/${userId}`, onAuthExpired)
  const [banned, setBanned] = useState(null) // overrides fetched value once toggled, until refetch
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const confirm = useConfirm()

  const isBanned = banned ?? user?.banned

  const runAction = async (label, url, confirmMessage) => {
    if (confirmMessage && !(await confirm.ask(confirmMessage, { confirmLabel: label }))) return
    setBusy(label)
    setActionError('')
    try {
      const res = await fetch(url, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Could not ${label.toLowerCase()}`)
      if (url.endsWith('/ban')) setBanned(true)
      if (url.endsWith('/unban')) setBanned(false)
      if (url.endsWith('/resend-confirmation')) setActionError('') // success — nothing to show inline beyond the button state
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200">
        <ArrowLeft size={14} />Back to users
      </button>

      {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-300">{error}</div>}
      {!user && !error && <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-6 text-sm text-slate-500">Loading…</div>}

      {user && (
        <>
          <div className="rounded-3xl border border-white/10 bg-[#141a28] p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">{user.profile?.full_name || user.email}</h2>
              {isBanned && <span className="rounded-full border border-rose-400/20 bg-rose-400/5 px-2 py-0.5 text-[10px] font-medium text-rose-300">Disabled</span>}
              {!user.confirmed && <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2 py-0.5 text-[10px] font-medium text-amber-300">Unconfirmed</span>}
            </div>
            <div className="mt-1 text-sm text-slate-400">{user.email}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div><div className="text-slate-500">Signed up</div><div className="mt-0.5 text-slate-300">{fmt(user.created_at)}</div></div>
              <div><div className="text-slate-500">Last active</div><div className="mt-0.5 text-slate-300">{fmt(user.last_sign_in_at)}</div></div>
              <div><div className="text-slate-500">Currency / theme</div><div className="mt-0.5 text-slate-300">{user.profile?.currency || '—'} · {user.profile?.theme || '—'}</div></div>
            </div>

            {actionError && <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-300">{actionError}</div>}

            <div className="mt-5 flex flex-wrap gap-2">
              {!user.confirmed && (
                <button
                  disabled={!!busy}
                  onClick={() => runAction('Resend confirmation', `/api/admin/users/${userId}/resend-confirmation`)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
                >
                  <Mail size={13} />{busy === 'Resend confirmation' ? 'Sending…' : 'Resend confirmation email'}
                </button>
              )}
              {isBanned ? (
                <button
                  disabled={!!busy}
                  onClick={() => runAction('Re-enable', `/api/admin/users/${userId}/unban`, `Re-enable ${user.email}'s account?`)}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50"
                >
                  <RotateCcw size={13} />{busy === 'Re-enable' ? 'Re-enabling…' : 'Re-enable account'}
                </button>
              ) : (
                <button
                  disabled={!!busy}
                  onClick={() => runAction('Disable', `/api/admin/users/${userId}/ban`, `Disable ${user.email}'s account? They won't be able to sign in until you re-enable it.`)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-400/5 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
                >
                  <Ban size={13} />{busy === 'Disable' ? 'Disabling…' : 'Disable account'}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
            <div className="mb-3 text-sm font-semibold text-white">Usage</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(COUNT_LABELS).map(([key, label]) => (
                <div key={key} className="rounded-2xl bg-white/[.04] p-3.5">
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-white">{user.counts[key]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
            <div className="mb-3 text-sm font-semibold text-white">Modules enabled</div>
            <div className="flex flex-wrap gap-2">
              {MODULE_KEYS.map((key) => {
                const enabled = user.profile?.modules?.[key]?.enabled
                return (
                  <span
                    key={key}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${enabled ? 'border-accent-300/25 bg-accent-300/10 text-accent-100' : 'border-white/10 text-slate-500'}`}
                  >
                    {NAV_META[key]?.label || key}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
            <div className="mb-3 text-sm font-semibold text-white">Integrations & channels</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2.5 rounded-xl bg-white/[.04] p-3.5">
                <KeyRound size={15} className="mt-0.5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Kite Connect</div>
                  <div className="mt-0.5 text-sm text-slate-200">{user.profile?.kite_linked ? 'Linked' : 'Not linked'}</div>
                  {user.profile?.kite_last_error && <div className="mt-1 text-xs text-rose-300">{user.profile.kite_last_error}</div>}
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-white/[.04] p-3.5">
                <Smartphone size={15} className="mt-0.5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Native app</div>
                  <div className="mt-0.5 text-sm text-slate-200">{user.nativeAppPlatforms.length ? user.nativeAppPlatforms.join(', ') : 'Not installed'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-white/[.04] p-3.5">
                <Bell size={15} className="mt-0.5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Web push</div>
                  <div className="mt-0.5 text-sm text-slate-200">{user.webPushEnabled ? 'Enabled' : 'Not enabled'}</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-white/[.04] p-3.5">
                <ShieldAlert size={15} className="mt-0.5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Reports</div>
                  <div className="mt-0.5 text-sm text-slate-200">
                    Weekly {user.profile?.weekly_report_enabled ? `on · sent ${fmt(user.profile.last_weekly_report_sent_at)}` : 'off'}
                  </div>
                  <div className="text-sm text-slate-200">
                    Monthly {user.profile?.monthly_report_enabled ? `on · sent ${fmt(user.profile.last_monthly_report_sent_at)}` : 'off'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {confirm.view}
    </div>
  )
}
