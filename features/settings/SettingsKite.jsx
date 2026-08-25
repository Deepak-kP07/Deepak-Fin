'use client'

import { useEffect, useState } from 'react'

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
    setRedirectUrl(`${window.location.origin}/api/kite/callback`)
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
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.035] light:bg-black/[.025] p-5">
        <div className="mb-1 text-sm font-semibold text-white light:text-slate-900">Your own Kite Connect app</div>
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
          <button onClick={save} disabled={busy || !apiKey.trim() || !apiSecret.trim()} className="rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 px-6 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
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
