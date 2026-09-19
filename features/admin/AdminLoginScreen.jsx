'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

export function AdminLoginScreen({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not sign in')
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b12] p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0e121c] p-6">
        <div className="flex items-center gap-2 text-accent-300">
          <ShieldCheck size={18} />
          <h1 className="text-lg font-semibold text-white">Admin</h1>
        </div>
        <p className="mt-1 text-xs text-slate-500">Personal Fin — internal dashboard</p>
        <div className="mt-6 grid gap-4">
          <label className="text-sm text-slate-300">Email
            <input
              required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50"
            />
          </label>
          <label className="text-sm text-slate-300">Password
            <input
              required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50"
            />
          </label>
        </div>
        {error && <p className="mt-4 text-xs text-rose-300">{error}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
