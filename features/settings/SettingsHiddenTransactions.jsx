'use client'

import { Lock } from 'lucide-react'
import { usePinDialog } from '@/components/shared/PinDialog'
import { resetHiddenPin, runPinSetup } from '@/lib/hiddenTransactions'

export function SettingsHiddenTransactions({ data, toast, onHiddenPinChanged, onLogout }) {
  const hasPin = !!data.profile?.has_hidden_pin
  const pinDialog = usePinDialog()

  const setup = async () => {
    if (await runPinSetup(pinDialog.ask, hasPin)) {
      toast.push(hasPin ? 'PIN changed' : 'PIN set')
      onHiddenPinChanged(true)
    }
  }
  const forgot = async () => {
    const res = await resetHiddenPin()
    if (res.ok) { toast.push('PIN cleared — set a new one'); onHiddenPinChanged(false); return }
    toast.push(res.error, 'error')
  }

  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white light:text-slate-900"><Lock size={15} className="text-accent-300 light:text-accent-700" />Hidden transactions</div>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">
        Turn on "Hide this transaction" when adding one to keep it out of every list. It still counts in your balances, totals and charts.
        To see hidden transactions, tap the lock on the Transactions page and enter this PIN. They lock again when you leave the app.
      </p>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-black/20 light:bg-black/[.06] px-4 py-3">
        <div>
          <div className="text-sm text-white light:text-slate-900">PIN</div>
          <div className="mt-0.5 text-xs text-slate-500">{hasPin ? 'Set' : 'Not set — needed before you can hide a transaction'}</div>
        </div>
        <button type="button" onClick={setup} className="shrink-0 rounded-xl bg-accent-300/20 px-3.5 py-2 text-xs font-semibold text-accent-100 light:text-accent-700 hover:bg-accent-300/30">{hasPin ? 'Change PIN' : 'Set PIN'}</button>
      </div>
      {hasPin && (
        <div className="mt-3 text-xs text-slate-500">
          Forgot your PIN? <button type="button" onClick={onLogout} className="text-accent-300 light:text-accent-700 hover:underline">Sign out</button>, sign back in, then come back here within 10 minutes and{' '}
          <button type="button" onClick={forgot} className="text-accent-300 light:text-accent-700 hover:underline">reset it</button>.
        </div>
      )}
      {pinDialog.view}
    </div>
  )
}
