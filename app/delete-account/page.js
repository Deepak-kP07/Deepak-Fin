'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Trash2 } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/lib/constants/links'

// The public "delete your account" page Google Play requires outside the app (its URL goes in the
// Data safety form). Signed in, it deletes the account right here, through the same route as
// Settings > Profile > Delete account. Signed out, it explains how, with an email fallback for
// someone who can no longer sign in.
const MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my Personal Fin account')}&body=${encodeURIComponent('Please delete my Personal Fin account and all of its data.\n\nAccount email: ')}`

export default function DeleteAccountPage() {
  const [user, setUser] = useState(undefined)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => (r.ok ? r.json() : { user: null })).then((d) => setUser(d.user || null)).catch(() => setUser(null))
  }, [])

  const remove = async () => {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'DELETE' }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not delete your account')
      try { localStorage.removeItem('financeNavState') } catch {}
      try { indexedDB.deleteDatabase('deepak-finance') } catch {}
      setDone(true)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <main className="min-h-screen bg-[#080b12] light:bg-[#eef1f6] px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm font-medium text-accent-200 light:text-accent-700 hover:underline">← Personal Fin</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white light:text-slate-900">Delete your account</h1>

        <div className="mt-6 space-y-3 text-sm leading-6 text-slate-300 light:text-slate-700">
          <p>Deleting your Personal Fin account permanently and immediately erases:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>your login (email, password, Google sign-in link) and profile</li>
            <li>every account, transaction, budget, investment, loan, card, lend/borrow, chit fund, scholarship, Family/Company and vault record</li>
            <li>every receipt, document and profile photo you uploaded</li>
            <li>your notification tokens, Kite connection and any sharing you set up</li>
          </ul>
          <p>Nothing is kept afterwards, and it can't be undone. If you only want to start fresh, use Settings → User guide → Clear all data instead, which keeps your login.</p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
          {user === undefined ? (
            <p className="text-sm text-slate-500">Checking whether you're signed in…</p>
          ) : done ? (
            <div className="text-center">
              <Check size={28} className="mx-auto text-emerald-300 light:text-emerald-700" />
              <p className="mt-3 text-sm font-medium text-white light:text-slate-900">Your account has been deleted.</p>
              <p className="mt-1 text-xs text-slate-500">You can close this page. If the Android app is installed, you can uninstall it.</p>
            </div>
          ) : user ? (
            <>
              <p className="text-sm text-slate-300 light:text-slate-700">Signed in as <span className="font-medium text-white light:text-slate-900">{user.email}</span>.</p>
              <label className="mt-4 block text-sm text-slate-300 light:text-slate-700">Type <span className="font-mono font-semibold">DELETE</span> to confirm
                <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" placeholder="DELETE"
                  className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 font-mono text-white light:text-slate-900 outline-none focus:border-rose-300/50" />
              </label>
              {error && <p className="mt-3 text-sm text-rose-300 light:text-rose-700">{error}</p>}
              <button onClick={remove} disabled={busy || typed.trim() !== 'DELETE'}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200 light:text-rose-700 hover:bg-rose-500/25 disabled:opacity-50">
                <Trash2 size={15} />{busy ? 'Deleting…' : 'Permanently delete my account'}
              </button>
            </>
          ) : (
            <div className="space-y-3 text-sm leading-6 text-slate-300 light:text-slate-700">
              <p><span className="font-medium text-white light:text-slate-900">In the app:</span> open Settings → Profile → Delete account.</p>
              <p>
                <span className="font-medium text-white light:text-slate-900">On the web:</span>{' '}
                <Link href="/" className="text-accent-200 light:text-accent-700 underline underline-offset-2">sign in</Link>, then come back to this page.
              </p>
              <p>
                <span className="font-medium text-white light:text-slate-900">Can't sign in?</span> Email{' '}
                <a href={MAILTO} className="text-accent-200 light:text-accent-700 underline underline-offset-2">{SUPPORT_EMAIL}</a>{' '}
                from the address on your account. We'll confirm it's you and delete the account within 30 days.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-500">
          See our <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link> for what we store and why.
        </p>
      </div>
    </main>
  )
}
