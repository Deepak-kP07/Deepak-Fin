'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { todayISO } from '@/lib/format'

function ChitFundFormFields({ form, setForm, accounts }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Name
        <input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="e.g. Office chit, 10 months" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Duration (months)
        <input required type="number" min="1" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="10" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Monthly contribution
        <input required type="number" step="0.01" min="0" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="0.00" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Start date
        <DateInput value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Default account <span className="text-xs text-slate-500">(optional)</span>
        <Select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="">None</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Notes
        <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Optional context" />
      </label>
    </div>
  )
}

export function ChitFundForm({ open, onClose, onSaved, editing, accounts, toast }) {
  const initial = editing
    ? { ...editing, duration_months: String(editing.duration_months), monthly_contribution: String(editing.monthly_contribution), account_id: editing.account_id || '' }
    : { name: '', duration_months: '', monthly_contribution: '', start_date: todayISO(), account_id: '', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/chit_funds/${editing.id}` : '/api/finance/chit_funds'
      const payload = {
        name: form.name,
        duration_months: Number(form.duration_months),
        monthly_contribution: Number(form.monthly_contribution),
        start_date: form.start_date,
        account_id: form.account_id || null,
        notes: form.notes || null,
      }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Chit fund updated' : 'Chit fund added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, accounts }
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update chit fund' : 'Save chit fund'}</button>

  // BottomSheet (vaul) must stay mounted across open/close toggles for its own open/close
  // transition to run at all — mounting it fresh already open=true skips that transition
  // entirely, so the isMobile branch renders unconditionally and only the desktop branch below
  // early-returns on `!open`.
  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit chit fund' : 'Add chit fund'}>
        <form onSubmit={save}>
          <ChitFundFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit chit fund' : 'Add chit fund'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <ChitFundFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
