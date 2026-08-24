'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { money, todayISO } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function CardPayFormFields({ form, setForm, accounts }) {
  return (
    <div className="grid gap-4">
      <label className="text-sm text-slate-300">Amount
        <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300">Pay from account
        <Select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
          <option value="">Choose account…</option>
          {accounts.filter((a) => a.type !== 'credit_card').map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.current_balance)}</option>)}
        </Select>
      </label>
      <label className="text-sm text-slate-300">Date
        <DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" />
      </label>
    </div>
  )
}

// A custom action (POST .../pay_bill), not plain table CRUD — requires connectivity, so this
// deliberately doesn't go through mutate()/the offline outbox (see Phase 5's design notes).
export function CardPayForm({ open, onClose, onSaved, card, accounts, toast }) {
  const [form, setForm] = useState({ amount: '', account_id: accounts[0]?.id || '', date: todayISO(), notes: '' })
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { if (open && card) setForm({ amount: String(card.current_outstanding || ''), account_id: accounts[0]?.id || '', date: todayISO(), notes: '' }) }, [open, card, accounts])
  if (!open || !card) return null

  const save = async (e) => {
    e.preventDefault()
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Paying a bill needs a connection — try again once you’re back online.', 'error')
      return
    }
    setBusy(true)
    try {
      const response = await fetch(`/api/finance/credit_cards/${card.id}/pay_bill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not pay')
      toast.push('Bill paid'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Paying…' : 'Pay bill'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title="Pay bill">
        <p className="-mt-2 mb-4 text-xs text-slate-500">{card.name} · outstanding {money(card.current_outstanding)}</p>
        <form onSubmit={save}>
          <CardPayFormFields form={form} setForm={setForm} accounts={accounts} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Pay bill</h2>
            <p className="mt-1 text-xs text-slate-500">{card.name} · outstanding {money(card.current_outstanding)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <CardPayFormFields form={form} setForm={setForm} accounts={accounts} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
