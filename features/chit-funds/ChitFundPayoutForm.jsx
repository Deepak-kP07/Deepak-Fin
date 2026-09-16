'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { todayISO } from '@/lib/format'

// "Take payout" — flips a chit fund from receivable to liability (lib/server/services/
// chitFunds.js's takeChitFundPayout). Amount is prefilled to duration*contribution but always
// editable, since real payouts often net out a foreman's commission or an auction discount.
export function ChitFundPayoutForm({ open, onClose, onSaved, fund, accounts, toast }) {
  const emptyForm = () => ({
    payout_amount: fund ? String(Number(fund.duration_months) * Number(fund.monthly_contribution)) : '',
    payout_date: todayISO(), payout_account_id: fund?.account_id || '', notes: '',
  })
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(emptyForm()) }, [fund, open])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const response = await fetch(`/api/finance/chit_funds/${fund.id}/take_payout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payout_amount: Number(form.payout_amount), payout_date: form.payout_date,
          payout_account_id: form.payout_account_id || null, notes: form.notes || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save')
      toast.push('Payout recorded'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 light:text-slate-700">Amount received
        <input required autoFocus type="number" step="0.01" min="0.01" value={form.payout_amount} onChange={(e) => setForm({ ...form, payout_amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="0.00" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Date
        <DateInput value={form.payout_date} onChange={(e) => setForm({ ...form, payout_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Credited to
        <Select value={form.payout_account_id} onChange={(e) => setForm({ ...form, payout_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="">None — skip account impact</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Notes
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
    </div>
  )
  const title = `Take payout${fund ? ` · ${fund.name}` : ''}`
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open && !!fund} onOpenChange={(v) => { if (!v) onClose() }} title={title}>
        <form onSubmit={save}>{fields}{submitButton}</form>
      </BottomSheet>
    )
  }

  if (!open || !fund) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">{fields}</div>
        {submitButton}
      </form>
    </div>
  )
}
