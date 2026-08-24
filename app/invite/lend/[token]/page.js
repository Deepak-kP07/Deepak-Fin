'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Check, Heart, ShieldAlert, X } from 'lucide-react'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { money } from '@/lib/format'

const ROLE_LABEL = { read: 'View only', admin: 'Edit & manage access' }

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b12] p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-8 text-center">{children}</div>
    </div>
  )
}

// Lend/Borrow's sibling of app/invite/[token]/page.js — same shape, pointed at the
// lend_borrow_shares endpoints and a two-tier role set instead of a profile's three tiers.
export default function LendInvitePage() {
  const { token } = useParams()
  const [user, setUser] = useState(undefined)
  const [preview, setPreview] = useState(undefined)
  const [previewError, setPreviewError] = useState('')
  const [responding, setResponding] = useState(false)
  const [result, setResult] = useState(null)
  const [respondError, setRespondError] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then((r) => (r.ok ? r.json() : { user: null })).then((d) => setUser(d.user)).catch(() => setUser(null))
  }, [])

  useEffect(() => {
    if (!token) return
    fetch(`/api/finance/lend_borrow_shares/preview?token=${token}`)
      .then(async (r) => {
        const body = await r.json()
        if (!r.ok) { setPreviewError(body.error || 'Invite not found'); setPreview(null); return }
        setPreview(body)
      })
      .catch(() => { setPreviewError('Something went wrong loading this invite.'); setPreview(null) })
  }, [token])

  if (user === undefined || preview === undefined) return <LoadingScreen />

  if (!preview) {
    return (
      <Shell>
        <ShieldAlert size={32} className="mx-auto text-rose-300" />
        <h1 className="mt-4 text-lg font-semibold text-white">Invite not found</h1>
        <p className="mt-2 text-sm text-slate-400">{previewError || "This invite link doesn't exist or has already been used."}</p>
      </Shell>
    )
  }

  const isExpired = preview.status === 'pending' && new Date(preview.expires_at).getTime() < Date.now()
  const verb = preview.record_type === 'borrowed' ? 'borrowed from' : 'lent to'

  if (result) {
    return (
      <Shell>
        {result.status === 'accepted' ? <Check size={32} className="mx-auto text-emerald-300" /> : <X size={32} className="mx-auto text-slate-400" />}
        <h1 className="mt-4 text-lg font-semibold text-white">{result.status === 'accepted' ? "You're in" : 'Invite declined'}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {result.status === 'accepted' ? <>This record now shows up in your own Lend / Borrow list.</> : 'You can ignore this invite from now on.'}
        </p>
        <a href="/" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 px-5 py-3 text-sm font-semibold text-[#07101c]">Go to Personal Fin</a>
      </Shell>
    )
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} initialMode="login" initialEmail={preview.invited_email} />
  }

  const emailMatches = (user.email || '').toLowerCase() === preview.invited_email.toLowerCase()

  const respond = async (action) => {
    setResponding(true); setRespondError('')
    try {
      const res = await fetch('/api/finance/lend_borrow_shares/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action }) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Something went wrong')
      setResult({ status: body.status })
    } catch (err) { setRespondError(err.message) } finally { setResponding(false) }
  }

  return (
    <Shell>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200"><Heart size={22} /></div>
      <h1 className="mt-4 text-lg font-semibold text-white">{preview.status === 'pending' && !isExpired ? "You're invited" : 'This invite'}</h1>
      <p className="mt-2 text-sm text-slate-400">
        to {ROLE_LABEL[preview.role]?.toLowerCase() || preview.role} — <span className="text-white">{money(preview.amount)} {verb} {preview.person_name}</span>
      </p>

      {isExpired ? (
        <p className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">This invite has expired — ask them to send a new one.</p>
      ) : preview.status !== 'pending' ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm text-slate-400">This invite was already {preview.status}.</p>
      ) : !emailMatches ? (
        <p className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">This invite was sent to <span className="text-white">{preview.invited_email}</span> — log in as that address to accept it.</p>
      ) : (
        <>
          {respondError && <p className="mt-4 text-sm text-rose-300">{respondError}</p>}
          <div className="mt-6 flex gap-3">
            <button onClick={() => respond('decline')} disabled={responding} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-60">Decline</button>
            <button onClick={() => respond('accept')} disabled={responding} className="flex-1 rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 px-4 py-3 text-sm font-semibold text-[#07101c] disabled:opacity-60">{responding ? 'Accepting…' : 'Accept'}</button>
          </div>
        </>
      )}
    </Shell>
  )
}
