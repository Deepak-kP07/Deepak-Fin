'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { ChevronRight, Landmark, LineChart, ShieldCheck, Sparkles } from 'lucide-react'

function GoogleIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.88 2.69-6.64z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.91-2.27c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.95H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.05l2.99-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l2.99 2.34C4.66 5.16 6.65 3.58 9 3.58z" />
    </svg>
  )
}

export function AuthScreen({ onAuth, initialError }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(initialError || '')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'signup'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.msg || data.error_description || data.message || 'Please check your details and try again.')
      if (mode === 'signup' && !data.access_token) {
        setError('Account created. Check your inbox to confirm your email, then sign in.')
        setMode('login')
      } else {
        onAuth(data.user)
      }
    } catch (caught) { setError(caught.message) } finally { setBusy(false) }
  }

  const signInWithGoogle = async () => {
    setError(''); setGoogleBusy(true)
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/oauth_callback` },
      })
      if (oauthError) throw oauthError
    } catch (caught) { setError(caught.message); setGoogleBusy(false) }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080b12] px-5 py-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1480px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0d111b] shadow-2xl shadow-cyan-950/20 lg:grid-cols-[1.1fr_.9fr]">
        <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 top-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <img src="/logo.png" alt="" className="h-10 w-10 rounded-2xl object-cover" />
              <span>Personal Finance</span>
            </div>
            <div className="mt-24 max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-200"><Sparkles size={13} /> Your money, in one clear view</div>
              <h1 className="text-6xl font-semibold leading-[1.03] tracking-[-.06em] text-white">Build wealth with <span className="bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text text-transparent">intention.</span></h1>
              <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">A calm command centre for your accounts, investments and everyday decisions.</p>
            </div>
          </div>
          <div className="relative mt-12 grid grid-cols-3 gap-3">
            {[{ l: 'Accounts', v: 'One view', i: Landmark }, { l: 'Insights', v: 'Monthly', i: LineChart }, { l: 'Secure', v: 'Supabase RLS', i: ShieldCheck }].map((x, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <x.i size={18} className="text-cyan-200" />
                <div className="mt-4 text-xs text-slate-500">{x.l}</div>
                <div className="text-sm font-semibold text-white">{x.v}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="flex items-center justify-center bg-[#101521] p-6 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <img src="/logo.png" alt="" className="h-10 w-10 rounded-2xl object-cover" />Personal Finance
              </div>
            </div>
            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-tight text-white">{mode === 'login' ? 'Welcome back' : 'Start your money journey'}</h2>
              <p className="mt-2 text-sm text-slate-400">{mode === 'login' ? 'Sign in to your private finance space.' : 'Create your secure personal finance space.'}</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <label className="block text-sm text-slate-300">Name
                  <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/60" placeholder="Deepak" />
                </label>
              )}
              <label className="block text-sm text-slate-300">Email
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/60" placeholder="you@example.com" />
              </label>
              <label className="block text-sm text-slate-300">Password
                <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/60" placeholder="••••••••" />
              </label>
              {error && <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-5 text-amber-200">{error}</div>}
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-4 py-3.5 font-semibold text-[#07101c] transition hover:brightness-110 disabled:opacity-60">
                {busy ? 'Working…' : mode === 'login' ? 'Sign in securely' : 'Create account'}<ChevronRight size={17} />
              </button>
            </form>
            <div className="my-8 flex items-center gap-3 text-xs text-slate-600"><div className="h-px flex-1 bg-white/10" />OR<div className="h-px flex-1 bg-white/10" /></div>
            <button type="button" onClick={signInWithGoogle} disabled={googleBusy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3.5 text-sm font-medium text-white transition hover:bg-white/[.08] disabled:opacity-60">
              <GoogleIcon />{googleBusy ? 'Redirecting…' : 'Continue with Google'}
            </button>
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} className="mt-3 w-full rounded-xl border border-white/10 px-4 py-3.5 text-sm font-medium text-slate-300 transition hover:bg-white/5">
              {mode === 'login' ? 'Create a new account' : 'I already have an account'}
            </button>
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="text-emerald-300" />Your data is protected by Supabase Auth</div>
          </div>
        </section>
      </div>
    </main>
  )
}
