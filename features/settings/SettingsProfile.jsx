'use client'

import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'
import { uploadAvatar } from '@/lib/attachments'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export function SettingsProfile({ data, user, onSaveProfile, toast }) {
  const { profile } = data
  const [form, setForm] = useState({ full_name: '', age: '' })
  const [busy, setBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', age: profile.age ?? '' })
  }, [profile])
  const save = async () => {
    setBusy(true)
    try { await onSaveProfile({ ...form, age: form.age === '' ? null : Number(form.age) }) } finally { setBusy(false) }
  }

  // profile.avatar_url now wins over the Google-derived fallback once the user uploads their
  // own — see the upload handler below and lib/server/services/profile.js (only ever seeds the
  // Google avatar when the column is still empty, so it never overwrites a real upload).
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''

  const onPickAvatar = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast?.push('Please pick an image file', 'error')
    if (file.size > MAX_AVATAR_BYTES) return toast?.push('Image is too large — please pick one under 5MB', 'error')
    setAvatarBusy(true)
    try {
      const { url, error } = await uploadAvatar(file)
      if (error) { toast?.push('Photo failed to upload', 'error'); return }
      await onSaveProfile({ avatar_url: url })
    } finally { setAvatarBusy(false) }
  }

  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5 sm:p-8">
      <div className="text-sm font-semibold text-white light:text-slate-900">Profile</div>
      <div className="mt-1 text-[11px] text-slate-500">Your name and photo, as they appear across the app.</div>

      <div className="mt-6 flex flex-col items-center text-center">
        <label className="group relative cursor-pointer rounded-full p-1 ring-1 ring-accent-300/25">
          <Avatar src={avatarUrl} name={form.full_name} email={user?.email} size={128} rounded="rounded-full" className={avatarBusy ? 'opacity-50' : ''} />
          <span className="absolute inset-1 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
            <Camera size={22} />
          </span>
          <input type="file" accept="image/*" className="hidden" disabled={avatarBusy} onChange={(e) => onPickAvatar(e.target.files?.[0])} />
        </label>
        <div className="mt-2 text-[11px] text-slate-500">{avatarBusy ? 'Uploading…' : 'Tap your photo to change it'}</div>
        <div className="mt-3 text-xl font-semibold text-white light:text-slate-900">{form.full_name || 'Your profile'}</div>
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
