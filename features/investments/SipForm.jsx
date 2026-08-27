'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { DateInput } from '@/components/shared/DateInput'
import { Select } from '@/components/shared/Select'
import { todayISO, money2 } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function SipFormFields({ form, setForm, portfolios, currentValue }) {
  return (
    <div className="grid gap-4">
      <label className="text-sm text-slate-300 light:text-slate-700">Fund name
        <input required value={form.fund_name} onChange={(e) => setForm({ ...form, fund_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Parag Parikh Flexi Cap" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Folio number <span className="text-xs text-slate-500">(optional)</span>
        <input value={form.folio_number || ''} onChange={(e) => setForm({ ...form, folio_number: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm text-slate-300 light:text-slate-700">Monthly amount
          <input required type="number" step="0.01" min="0" value={form.monthly_amount} onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Start date
          <DateInput value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm text-slate-300 light:text-slate-700">Units held
          <input required type="number" step="0.0001" min="0" value={form.units_held} onChange={(e) => setForm({ ...form, units_held: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Latest NAV
          <input required type="number" step="0.0001" min="0" value={form.nav} onChange={(e) => setForm({ ...form, nav: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
      </div>
      <label className="text-sm text-slate-300 light:text-slate-700">Average buy NAV <span className="text-xs text-slate-500">(optional — enables P&amp;L)</span>
        <input type="number" step="0.0001" min="0" value={form.average_price} onChange={(e) => setForm({ ...form, average_price: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Leave blank if unknown" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Portfolio <span className="text-xs text-slate-500">(optional — just a grouping label)</span>
        <Select value={form.portfolio_id} onChange={(e) => setForm({ ...form, portfolio_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="">None</option>
          {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </label>
      <div className="rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-3 py-2.5 text-xs text-slate-400 light:text-slate-500">Current value (units × NAV): <span className="font-semibold text-white light:text-slate-900">{money2(currentValue)}</span></div>
    </div>
  )
}

export function SipForm({ open, onClose, onSaved, editing, portfolios = [], toast, mutate }) {
  const initial = editing
    ? { ...editing, monthly_amount: String(editing.monthly_amount), units_held: String(editing.units_held), nav: String(editing.nav), average_price: editing.average_price != null ? String(editing.average_price) : '', portfolio_id: editing.portfolio_id || '' }
    : { fund_name: '', folio_number: '', monthly_amount: '', start_date: todayISO(), units_held: '', nav: '', average_price: '', portfolio_id: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null

  const units = Number(form.units_held) || 0
  const nav = Number(form.nav) || 0
  const currentValue = units * nav

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      // current_value is always derived from units_held * nav, never hand-typed — same
      // "derive, don't let it drift" rule cash_balance now follows.
      const payload = {
        fund_name: form.fund_name, folio_number: form.folio_number || null, monthly_amount: Number(form.monthly_amount),
        start_date: form.start_date, units_held: units, nav, current_value: currentValue,
        average_price: form.average_price !== '' ? Number(form.average_price) : null,
        portfolio_id: form.portfolio_id || null,
      }
      const { queued } = await mutate({ table: 'sips', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: payload })
      toast.push(queued ? `SIP ${editing ? 'updated' : 'added'} — will sync when back online` : `SIP ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update SIP' : 'Save SIP'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit SIP' : 'Add SIP'}>
        <form onSubmit={save}>
          <SipFormFields form={form} setForm={setForm} portfolios={portfolios} currentValue={currentValue} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit SIP' : 'Add SIP'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <SipFormFields form={form} setForm={setForm} portfolios={portfolios} currentValue={currentValue} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
