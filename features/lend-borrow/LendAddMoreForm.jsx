'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { todayISO } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

const EMPTY = { amount: '', date: todayISO(), account_id: '', notes: '' }

// "+ Lend more" / "+ Borrow more" — logs additional money against an EXISTING record instead of
// creating a brand-new one, so a running relationship with the same person stays one card with a
// full dated history (see lib/server/lendBorrowCrud.js's addToLendBorrow). Deliberately a small,
// separate form rather than reusing the big shared TransactionForm's repayment mode — this is
// the reverse of a repayment (increasing the total, not reducing it) and needed its own record-
// specific validation (e.g. a credit card can only fund lending more, never borrowing more).
export function LendAddMoreForm({ open, onClose, onSaved, record, accounts, creditCards = [], toast }) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(EMPTY) }, [record, open])
  if (!open || !record) return null
  const isLent = record.type === 'lent'

  const save = async (e) => {
    e.preventDefault()
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Logging this needs a connection — try again once you’re back online.', 'error')
      return
    }
    setBusy(true)
    try {
      const response = await fetch(`/api/finance/lend_borrow/${record.id}/add_more`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(form.amount), date: form.date, account_id: form.account_id || null, notes: form.notes || null }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save')
      toast.push(isLent ? 'Logged more lent' : 'Logged more borrowed'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Amount
        <input required autoFocus type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="0.00" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Date
        <DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">{isLent ? 'From account' : 'To account'}
        <Select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="">None (skip account impact)</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          {isLent && creditCards.map((c) => <option key={c.id} value={`cc:${c.id}`}>{c.name} (card)</option>)}
        </Select>
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Notes
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
    </div>
  )
  const title = `Log ${isLent ? 'more lent to' : 'more borrowed from'} ${record.person_name}`
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={title}>
        <form onSubmit={save}>{fields}{submitButton}</form>
      </BottomSheet>
    )
  }

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
