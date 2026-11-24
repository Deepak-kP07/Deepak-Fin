'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Check, KeyRound, ShieldAlert } from 'lucide-react'
import { PasswordInput } from '@/components/shared/PasswordInput'

// Where the password-reset email lands (POST /api/auth/forgot_password). Supabase puts a short-lived
// recovery session in the URL fragment (#access_token=…&type=recovery); this page uses it — in
// memory only, never stored — to set the new password, then signs it out again. Works on any
// device, so a reset asked for in the phone app can be finished on a laptop and vice versa.
function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b12] p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-8">{children}</div>
    </div>
  )
}

const INPUT = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-accent-300/60 focus:ring-2 focus:ring-accent-300/30'

export default function ResetPasswordPage() {
  const [tokens, setTokens] = useState(undefined) // undefined = reading the link, null = unusable
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const readOnce = useRef(false)

  useEffect(() => {
    // Read the link exactly once — it's wiped from the address bar right after, so a second run
    // (React dev mode runs effects twice) must not mistake the cleaned URL for a broken link.
    if (readOnce.current) return
    readOnce.current = true
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    const problem = hash.get('error_description') || query.get('error_description')
    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')
    // Drop the tokens from the address bar (and so from history) as soon as they're read.
    window.history.replaceState({}, '', window.location.pathname)
    if (problem || !access_token || !refresh_token) {
      setLinkError(problem ? problem.replace(/\+/g, ' ') : '')
      setTokens(null)
      return
    }
    setTokens({ access_token, refresh_token })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Use at least 6 characters.')
    if (password !== confirm) return setError("The two passwords don't match.")
    setBusy(true)
    try {
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      const { error: sessionError } = await client.auth.setSession(tokens)
      if (sessionError) throw new Error('This reset link has expired — ask for a new one from the sign-in screen.')
      const { error: updateError } = await client.auth.updateUser({ password })
      if (updateError) throw updateError
      await client.auth.signOut({ scope: 'local' }).catch(() => {})
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not update your password — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (tokens === undefined) return <Shell><p className="text-center text-sm text-slate-400">Checking your reset link…</p></Shell>

  if (done) {
    return (
      <Shell>
        <Check size={32} className="mx-auto text-emerald-300" />
        <h1 className="mt-4 text-center text-lg font-semibold text-white">Password updated</h1>
        <p className="mt-2 text-center text-sm text-slate-400">Sign in with your new password — on the website or in the Personal Fin app.</p>
        <a href="/" className="mt-6 block rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-5 py-3 text-center text-sm font-semibold text-[#07101c]">Go to sign in</a>
      </Shell>
    )
  }

  if (!tokens) {
    return (
      <Shell>
        <ShieldAlert size={32} className="mx-auto text-rose-300" />
        <h1 className="mt-4 text-center text-lg font-semibold text-white">This reset link can't be used</h1>
        <p className="mt-2 text-center text-sm text-slate-400">{linkError || "It's incomplete or has already been used."} Ask for a new one with "Forgot password?" on the sign-in screen.</p>
        <a href="/" className="mt-6 block rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-medium text-slate-300 hover:bg-white/5">Back to sign in</a>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-400/15 text-accent-200"><KeyRound size={22} /></div>
      <h1 className="mt-4 text-center text-lg font-semibold text-white">Choose a new password</h1>
      <p className="mt-2 text-center text-sm text-slate-400">You'll use it to sign in on the website and in the app.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm text-slate-300">New password
          <PasswordInput required autoFocus minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} placeholder="••••••••" />
        </label>
        <label className="block text-sm text-slate-300">Confirm new password
          <PasswordInput required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} placeholder="••••••••" />
        </label>
        {error && <div className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
        <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </Shell>
  )
}
