'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { todayISO } from '@/lib/format'

// "+ Log payment" (create) / pencil icon on a payment row (edit) — same form, `editing` decides
// which. Account is only ever set at creation and never shown/editable here — moving a payment
// between accounts would mean creating/deleting a transaction on each side, not just patching one
// in place (see lib/server/services/chitFunds.js's updateChitFundPayment); delete and re-log
// instead if that's really needed. Account is optional at creation — cash handed to an organizer
// never touches a tracked account — same "skip account impact" shape as LendAddMoreForm.
export function ChitFundPaymentForm({ open, onClose, onSaved, fund, editing, accounts, toast }) {
  const emptyForm = () => editing
    ? { amount: String(editing.amount), dividend_received: editing.dividend_received ? String(editing.dividend_received) : '', date: editing.payment_date, account_id: editing.account_id || '', notes: editing.notes || '' }
    : { amount: fund?.monthly_contribution ? String(fund.monthly_contribution) : '', dividend_received: '', date: todayISO(), account_id: fund?.account_id || '', notes: '' }
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(emptyForm()) }, [fund, editing, open])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/chit_fund_payments/${editing.id}` : `/api/finance/chit_funds/${fund.id}/log_payment`
      const body = editing
        ? { amount: Number(form.amount), dividend_received: form.dividend_received ? Number(form.dividend_received) : 0, payment_date: form.date, notes: form.notes || null }
        : { amount: Number(form.amount), dividend_received: form.dividend_received ? Number(form.dividend_received) : 0, date: form.date, account_id: form.account_id || null, notes: form.notes || null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save')
      toast.push(editing ? 'Payment updated' : 'Payment logged'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const account = accounts.find((a) => a.id === (editing ? editing.account_id : form.account_id))
  const fields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 light:text-slate-700">Amount
        <input required autoFocus type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="0.00" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Dividend received <span className="text-xs text-slate-500">(optional)</span>
        <input type="number" step="0.01" min="0" value={form.dividend_received} onChange={(e) => setForm({ ...form, dividend_received: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="0.00" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Date
        <DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      {editing ? (
        <label className="text-sm text-slate-300 light:text-slate-700">Account
          <div className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.015] px-3 py-3 text-slate-400 light:text-slate-500">{account?.name || 'None — no account impact'}</div>
        </label>
      ) : (
        <label className="text-sm text-slate-300 light:text-slate-700">Account
          <Select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
            <option value="">None — skip account impact</option>
            {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </label>
      )}
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Notes
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
    </div>
  )
  const title = `${editing ? 'Edit payment' : 'Log payment'}${fund ? ` · ${fund.name}` : ''}`
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
