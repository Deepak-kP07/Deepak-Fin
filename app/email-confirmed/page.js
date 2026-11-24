'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Smartphone } from 'lucide-react'

// Where the confirmation email of an app sign-up lands. The link has already confirmed the
// address by the time this page loads; all that's left is to go back to the app and sign in, so
// this page says exactly that instead of signing them into the website. (Supabase may append the
// session to the URL fragment — it's cleared and never used here.)
export default function EmailConfirmedPage() {
  const [failed, setFailed] = useState('')
  useEffect(() => {
    const params = new URLSearchParams((window.location.hash || '').slice(1) + '&' + window.location.search.slice(1))
    const err = params.get('error_description') || params.get('error')
    if (err) setFailed(err.replace(/\+/g, ' '))
    if (window.location.hash) history.replaceState(null, '', window.location.pathname)
  }, [])

  return (
    <main className="min-h-screen bg-[#080b12] light:bg-[#eef1f6] px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-8 text-center">
        {failed ? (
          <>
            <h1 className="text-2xl font-semibold text-white light:text-slate-900">This link didn't work</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 light:text-slate-600">{failed}. Links expire after a while and work only once — open the app, try to sign in, and tap “Resend confirmation email”.</p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15"><Check size={28} className="text-emerald-300 light:text-emerald-700" /></div>
            <h1 className="mt-5 text-2xl font-semibold text-white light:text-slate-900">Your email is confirmed</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 light:text-slate-600">Go back to the Personal Fin app and sign in with your email and password.</p>
          </>
        )}
        <a href="intent://open#Intent;scheme=personalfin;package=site.personalfin.app;end" className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-accent-300 px-4 py-3 text-sm font-semibold text-[#07101c] hover:opacity-90">
          <Smartphone size={16} />Open the app
        </a>
        <Link href="/" className="mt-3 block text-xs text-slate-500 hover:underline">Or continue on the website</Link>
      </div>
    </main>
  )
}
