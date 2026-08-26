'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { money } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function WithdrawFundsFormFields({ form, setForm, accounts, portfolio }) {
  return (
    <div className="grid gap-4">
      <label className="text-sm text-slate-300 light:text-slate-700">Amount
        <input required type="number" step="0.01" min="0.01" max={portfolio.cash_balance || undefined} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="1000" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">To account
        <Select required value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="">Choose account…</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name} · {money(a.current_balance)}</option>)}
        </Select>
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Notes
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Optional" />
      </label>
    </div>
  )
}

// A custom action (POST .../withdraw_funds), not plain table CRUD — requires connectivity, so
// this deliberately doesn't go through mutate()/the offline outbox (see Phase 5's design notes).
export function WithdrawFundsForm({ open, onClose, onSaved, portfolio, accounts, toast }) {
  const [form, setForm] = useState({ amount: '', account_id: accounts[0]?.id || '', notes: '' })
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { if (open) setForm({ amount: '', account_id: accounts[0]?.id || '', notes: '' }) }, [open, accounts])
  if (!open || !portfolio) return null

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const response = await fetch(`/api/finance/portfolios/${portfolio.id}/withdraw_funds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not withdraw funds')
      toast.push('Funds withdrawn from ' + portfolio.name); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Withdrawing…' : 'Withdraw funds'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title="Withdraw funds">
        <p className="-mt-2 mb-4 text-xs text-slate-500">{portfolio.name} · current cash {money(portfolio.cash_balance || 0)}</p>
        <form onSubmit={save}>
          <WithdrawFundsFormFields form={form} setForm={setForm} accounts={accounts} portfolio={portfolio} />
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
            <h2 className="text-lg font-semibold text-white light:text-slate-900">Withdraw funds</h2>
            <p className="mt-1 text-xs text-slate-500">{portfolio.name} · current cash {money(portfolio.cash_balance || 0)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <WithdrawFundsFormFields form={form} setForm={setForm} accounts={accounts} portfolio={portfolio} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
