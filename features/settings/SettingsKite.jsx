'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Youtube } from 'lucide-react'
import { ZERODHA_SIGNUP_URL } from '@/lib/constants/links'

export function SettingsKite({ data, onSaveKiteCredentials, onRemoveKiteCredentials }) {
  const { profile } = data
  const configured = !!profile?.kite_api_key
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState('')
  useEffect(() => {
    if (profile) setApiKey(profile.kite_api_key || '')
  }, [profile])
  useEffect(() => {
    // The URL registered with Zerodha has to be one fixed address, not wherever this settings
    // page happens to be loaded from — same NEXT_PUBLIC_BASE_URL every other absolute-URL builder
    // in the app already uses (lib/email.js, lib/server/cors.js, etc.), so this always shows the
    // real production callback even when viewed from a local dev server.
    setRedirectUrl(`${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/api/kite/callback`)
  }, [])

  const save = async () => {
    setBusy(true)
    try { await onSaveKiteCredentials({ api_key: apiKey, api_secret: apiSecret }); setApiSecret('') } finally { setBusy(false) }
  }
  const remove = async () => {
    setRemoving(true)
    try { await onRemoveKiteCredentials(); setApiKey(''); setApiSecret('') } finally { setRemoving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-white light:text-slate-900">Your own Kite Connect app</div>
          <a
            href="https://youtu.be/r88L9AqnNaE?si=Rgx9I3-92aXc1KX_&t=68"
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#FF0000]/30 bg-[#FF0000]/10 px-3 py-1.5 text-xs font-medium text-[#FF0000] hover:bg-[#FF0000]/20"
          >
            <Youtube size={13} />Watch how-to video
          </a>
        </div>
        <a
          href={ZERODHA_SIGNUP_URL}
          target="_blank"
          rel="noreferrer"
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-accent-300/25 bg-accent-400/10 px-4 py-2.5 text-sm font-medium text-accent-200 light:text-accent-700 hover:bg-accent-400/20 sm:w-auto"
        >
          Don't have a Zerodha account? Create one<ExternalLink size={13} />
        </a>
        <p className="text-sm leading-6 text-slate-400 light:text-slate-600">
          Connecting Kite already works out of the box using the app's default Kite Connect app — you
          don't need to do anything here unless you want to use your own instead. If you do, register a
          free app at{' '}
          <a href="https://developers.kite.trade" target="_blank" rel="noreferrer" className="text-accent-300 light:text-accent-700 hover:underline">developers.kite.trade</a>,
          set its redirect URL to the address below, then paste the API key and secret it gives you — it'll
          be used for you from then on instead of the default.
        </p>
        <div className="mt-3">
          <div className="text-xs text-slate-500">Redirect URL to register with Kite</div>
          <code className="mt-1 block break-all rounded-xl border border-white/10 light:border-black/10 bg-black/30 light:bg-black/[.06] px-3 py-2.5 text-xs text-accent-200 light:text-accent-700">{redirectUrl}</code>
        </div>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <label className="text-sm text-slate-300 light:text-slate-700">API key
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Kite API key" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">API secret
            <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-2.5 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder={configured ? 'Already set — enter a new value to replace' : 'Kite API secret'} />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={save} disabled={busy || !apiKey.trim() || !apiSecret.trim()} className="rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-6 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
          {configured && (
            <button onClick={remove} disabled={removing} className="rounded-xl border border-rose-300/20 bg-rose-300/5 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-300/10 disabled:opacity-60">{removing ? 'Removing…' : 'Disconnect Kite app'}</button>
          )}
        </div>
        {configured && (
          <p className="mt-3 text-xs text-slate-500">Kite app configured. Disconnecting clears your saved key, secret, and any active session token — you'll need to reconnect from Investments afterward.</p>
        )}
      </div>
    </div>
  )
}
