'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { money, todayISO } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function ScholarshipPayFormFields({ form, setForm, accounts }) {
  return (
    <div className="grid gap-4">
      <label className="text-sm text-slate-300 light:text-slate-700">Amount
        <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Paid to
        <input value={form.paid_to} onChange={(e) => setForm({ ...form, paid_to: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="College name / bursar" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Date
        <DateInput value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">From account
        <Select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="">Choose account…</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.current_balance)}</option>)}
        </Select>
      </label>
    </div>
  )
}

// A custom action (POST .../scholarship_payments — reads the parent scholarship, conditionally
// mirrors a transaction, and recomputes amount_paid_to_college/status server-side), not plain
// table CRUD — stays online-only, same rationale as CardPayForm.
export function ScholarshipPayForm({ open, onClose, onSaved, scholarship, accounts, toast }) {
  const initial = { amount: '', paid_to: 'College', payment_date: todayISO(), account_id: scholarship?.received_to_account_id || accounts[0]?.id || '', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { if (open) setForm({ ...initial, account_id: scholarship?.received_to_account_id || accounts[0]?.id || '' }) }, [open, scholarship, accounts])
  if (!open || !scholarship) return null
  const pending = Number(scholarship.total_amount) - Number(scholarship.amount_paid_to_college || 0)

  const save = async (e) => {
    e.preventDefault()
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Paying college needs a connection — try again once you’re back online.', 'error')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/finance/scholarship_payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scholarship_id: scholarship.id, ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not pay')
      toast.push('Payment logged'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, accounts }
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Paying…' : 'Log payment'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title="Pay to college">
        <p className="-mt-2 mb-4 text-xs text-slate-500">{scholarship.name} · pending {money(pending)}</p>
        <form onSubmit={save}>
          <ScholarshipPayFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white light:text-slate-900">Pay to college</h2>
            <p className="mt-1 text-xs text-slate-500">{scholarship.name} · pending {money(pending)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <ScholarshipPayFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
