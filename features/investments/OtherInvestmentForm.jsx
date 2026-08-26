'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { DateInput } from '@/components/shared/DateInput'
import { Select } from '@/components/shared/Select'
import { BOND_INTEREST_FREQUENCIES, OTHER_INVESTMENT_CATEGORIES, currentValueOf } from '@/lib/otherInvestments'
import { todayISO } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function OtherInvestmentFormFields({ form, setForm, isBond, preview }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Name
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder={isBond ? 'HDFC NCD 2030, RBI Floating Rate Bond…' : 'Gold necklace, 2 acre plot in Kolar…'} />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Category
        <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          {OTHER_INVESTMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Purchase value
        <input required type="number" step="0.01" min="0" value={form.purchase_value} onChange={(e) => setForm({ ...form, purchase_value: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Purchase date
        <DateInput value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>

      {isBond ? (
        <>
          <label className="text-sm text-slate-300 light:text-slate-700">Face value <span className="text-xs text-slate-500">(paid at maturity)</span>
            <input required type="number" step="0.01" min="0" value={form.face_value} onChange={(e) => setForm({ ...form, face_value: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Maturity date
            <DateInput value={form.maturity_date} onChange={(e) => setForm({ ...form, maturity_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Coupon rate <span className="text-xs text-slate-500">(% / year, optional)</span>
            <input type="number" step="0.01" min="0" value={form.coupon_rate_pct} onChange={(e) => setForm({ ...form, coupon_rate_pct: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">Interest payout
            <Select value={form.interest_frequency} onChange={(e) => setForm({ ...form, interest_frequency: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
              {BOND_INTEREST_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
          </label>
          <div className="rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-3 py-2.5 text-xs text-slate-400 light:text-slate-500 sm:col-span-2">
            Current value: <span className="font-semibold text-white light:text-slate-900">₹{preview.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span> — straight-line accretes from purchase value to face value between purchase and maturity. Coupon payouts aren't tracked as cash here, just shown for reference.
          </div>
        </>
      ) : (
        <>
          <label className="text-sm text-slate-300 light:text-slate-700">Expected CAGR <span className="text-xs text-slate-500">(% / year)</span>
            <input required type="number" step="0.1" value={form.expected_cagr_pct} onChange={(e) => setForm({ ...form, expected_cagr_pct: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>
          <div className="rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-3 py-2.5 text-xs text-slate-400 light:text-slate-500 sm:col-span-2">
            Projected current value: <span className="font-semibold text-white light:text-slate-900">₹{preview.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span> — purchase value compounded at the CAGR above, from {form.last_known_value !== '' ? 'your last known value' : 'the purchase date'}.
          </div>
          <label className="text-sm text-slate-300 light:text-slate-700">Last known value <span className="text-xs text-slate-500">(optional — a real revaluation)</span>
            <input type="number" step="0.01" min="0" value={form.last_known_value} onChange={(e) => setForm({ ...form, last_known_value: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Leave blank to project from purchase" />
          </label>
          <label className="text-sm text-slate-300 light:text-slate-700">As of <span className="text-xs text-slate-500">(defaults to today)</span>
            <DateInput value={form.last_known_value_date} onChange={(e) => setForm({ ...form, last_known_value_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
          </label>
        </>
      )}

      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Notes <span className="text-xs text-slate-500">(optional)</span>
        <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
    </div>
  )
}

export function OtherInvestmentForm({ open, onClose, onSaved, editing, portfolioId, toast, mutate }) {
  const initial = editing
    ? {
        ...editing, purchase_value: String(editing.purchase_value), expected_cagr_pct: String(editing.expected_cagr_pct),
        last_known_value: editing.last_known_value != null ? String(editing.last_known_value) : '', last_known_value_date: editing.last_known_value_date || '',
        face_value: editing.face_value != null ? String(editing.face_value) : '', coupon_rate_pct: editing.coupon_rate_pct != null ? String(editing.coupon_rate_pct) : '',
        maturity_date: editing.maturity_date || '', interest_frequency: editing.interest_frequency || 'annual',
      }
    : {
        portfolio_id: portfolioId, name: '', category: 'other', purchase_value: '', purchase_date: todayISO(), expected_cagr_pct: '8',
        last_known_value: '', last_known_value_date: '', face_value: '', coupon_rate_pct: '', maturity_date: '', interest_frequency: 'annual', notes: '',
      }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open, portfolioId])
  if (!open) return null

  const isBond = form.category === 'bond'
  const preview = currentValueOf({
    category: form.category,
    purchase_value: form.purchase_value || 0, purchase_date: form.purchase_date,
    expected_cagr_pct: form.expected_cagr_pct || 0,
    last_known_value: form.last_known_value || null, last_known_value_date: form.last_known_value_date || null,
    face_value: form.face_value || null, maturity_date: form.maturity_date || null,
  })

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const payload = {
        portfolio_id: portfolioId, name: form.name, category: form.category,
        purchase_value: Number(form.purchase_value), purchase_date: form.purchase_date,
        expected_cagr_pct: isBond ? 0 : Number(form.expected_cagr_pct || 0),
        last_known_value: !isBond && form.last_known_value !== '' ? Number(form.last_known_value) : null,
        last_known_value_date: !isBond && form.last_known_value !== '' ? (form.last_known_value_date || todayISO()) : null,
        face_value: isBond && form.face_value !== '' ? Number(form.face_value) : null,
        coupon_rate_pct: isBond && form.coupon_rate_pct !== '' ? Number(form.coupon_rate_pct) : null,
        maturity_date: isBond && form.maturity_date ? form.maturity_date : null,
        interest_frequency: isBond ? form.interest_frequency : null,
        notes: form.notes || null,
      }
      const { queued } = await mutate({ table: 'other_investments', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: payload })
      toast.push(queued ? `Investment ${editing ? 'updated' : 'added'} — will sync when back online` : `Investment ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update investment' : 'Save investment'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit investment' : 'Add other investment'}>
        <form onSubmit={save}>
          <OtherInvestmentFormFields form={form} setForm={setForm} isBond={isBond} preview={preview} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit investment' : 'Add other investment'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <OtherInvestmentFormFields form={form} setForm={setForm} isBond={isBond} preview={preview} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
