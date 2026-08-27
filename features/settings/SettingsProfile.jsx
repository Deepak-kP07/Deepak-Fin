'use client'

import { useEffect, useState } from 'react'
import { Avatar } from '@/components/shared/Avatar'

export function SettingsProfile({ data, user, onSaveProfile }) {
  const { profile } = data
  const [form, setForm] = useState({ full_name: '', age: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', age: profile.age ?? '' })
  }, [profile])
  const save = async () => {
    setBusy(true)
    try { await onSaveProfile({ ...form, age: form.age === '' ? null : Number(form.age) }) } finally { setBusy(false) }
  }

  // Sourced from Google at sign-in (see lib/server/services/profile.js) — never hand-edited here.
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''

  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] glassy:glass-card p-5 sm:p-8">
      <div className="text-sm font-semibold text-white light:text-slate-900">Profile</div>
      <div className="mt-1 text-[11px] text-slate-500">Your name and photo, as they appear across the app.</div>

      <div className="mt-6 flex flex-col items-center text-center">
        <div className="rounded-full p-1 ring-1 ring-accent-300/25">
          <Avatar src={avatarUrl} name={form.full_name} email={user?.email} size={128} rounded="rounded-full" />
        </div>
        <div className="mt-4 text-xl font-semibold text-white light:text-slate-900">{form.full_name || 'Your profile'}</div>
        <div className="text-xs text-slate-500">{user?.email}</div>
      </div>

      <div className="mx-auto mt-8 grid max-w-lg gap-3.5 sm:grid-cols-2">
        <label className="text-sm text-slate-300 light:text-slate-700">Full name
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Deepak Perumal" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Age
          <input type="number" min="1" max="150" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
      </div>

      <div className="mx-auto mt-6 max-w-lg">
        <button onClick={save} disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-6 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-60 sm:w-auto">{busy ? 'Saving…' : 'Save profile'}</button>
      </div>
    </div>
  )
}
