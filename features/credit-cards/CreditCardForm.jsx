'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ColorPicker } from '@/components/shared/ColorPicker'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function CreditCardFormFields({ form, setForm }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Name
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="HDFC MoneyBack" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Bank
        <input value={form.bank || ''} onChange={(e) => setForm({ ...form, bank: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="HDFC Bank" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700"><span className="whitespace-nowrap">Last 4 digits</span>
        <input maxLength={4} value={form.last4 || ''} onChange={(e) => setForm({ ...form, last4: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="1234" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Credit limit
        <input required type="number" step="1" min="0" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="200000" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Billing day (1-28)
        <input required type="number" min="1" max="28" value={form.billing_date} onChange={(e) => setForm({ ...form, billing_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Due date offset (days)
        <input required type="number" min="1" max="30" value={form.due_date_offset} onChange={(e) => setForm({ ...form, due_date_offset: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <div className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Colour
        <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
      </div>
    </div>
  )
}

export function CreditCardForm({ open, onClose, onSaved, editing, toast, mutate }) {
  const initial = editing
    ? { ...editing, credit_limit: String(editing.credit_limit), billing_date: String(editing.billing_date), due_date_offset: String(editing.due_date_offset) }
    : { name: '', bank: '', last4: '', credit_limit: '', billing_date: '1', due_date_offset: '15', color: '#a78bfa' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const payload = { ...form, credit_limit: Number(form.credit_limit), billing_date: Number(form.billing_date), due_date_offset: Number(form.due_date_offset) }
      const { queued } = await mutate({ table: 'credit_cards', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: payload })
      toast.push(queued ? `Card ${editing ? 'updated' : 'added'} — will sync when back online` : `Card ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update card' : 'Save card'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit card' : 'Add credit card'}>
        <form onSubmit={save}>
          <CreditCardFormFields form={form} setForm={setForm} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit card' : 'Add credit card'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <CreditCardFormFields form={form} setForm={setForm} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
