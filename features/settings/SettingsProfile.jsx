'use client'

import { useEffect, useState } from 'react'
import { Avatar } from '@/components/shared/Avatar'

export function SettingsProfile({ data, user, onSaveProfile }) {
  const { profile } = data
  const [form, setForm] = useState({ full_name: '', age: '', avatar_url: '' })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', age: profile.age ?? '', avatar_url: profile.avatar_url || '' })
  }, [profile])
  const save = async () => {
    setBusy(true)
    try { await onSaveProfile({ ...form, age: form.age === '' ? null : Number(form.age) }) } finally { setBusy(false) }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar src={form.avatar_url} name={form.full_name} email={user?.email} size={84} rounded="rounded-2xl" />
        <div className="grid flex-1 gap-3.5 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Full name
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-white outline-none focus:border-cyan-300/50" placeholder="Deepak Perumal" />
          </label>
          <label className="text-sm text-slate-300">Age
            <input type="number" min="1" max="150" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-white outline-none focus:border-cyan-300/50" />
          </label>
          <div className="text-sm text-slate-300">
            <div className="text-xs text-slate-500">Email</div>
            <div className="mt-1 text-white">{user?.email}</div>
          </div>
          <label className="text-sm text-slate-300">Avatar URL <span className="text-[11px] text-slate-600">(auto-filled from Google)</span>
            <input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-xs text-slate-300 outline-none focus:border-cyan-300/50" placeholder="https://…" />
          </label>
        </div>
      </div>
      <button onClick={save} disabled={busy} className="mt-5 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-6 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Save profile'}</button>
    </div>
  )
}
