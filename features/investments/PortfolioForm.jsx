'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { ColorPicker } from '@/components/shared/ColorPicker'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function PortfolioFormFields({ form, setForm, accounts }) {
  return (
    <div className="grid gap-4">
      <label className="text-sm text-slate-300 light:text-slate-700">Name
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Zerodha Demat A" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Broker
        <Select value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="zerodha">Zerodha</option>
          <option value="groww">Groww</option>
          <option value="indmoney">INDmoney</option>
          <option value="upstox">Upstox</option>
          <option value="angel_one">Angel One</option>
          <option value="icici_direct">ICICI Direct</option>
          <option value="hdfc_securities">HDFC Securities</option>
          <option value="kotak_securities">Kotak Securities</option>
          <option value="paytm_money">Paytm Money</option>
          <option value="5paisa">5paisa</option>
          <option value="other">Other</option>
        </Select>
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Linked account (optional)
        <Select value={form.demat_account_id || ''} onChange={(e) => setForm({ ...form, demat_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="">None</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </label>
      <div className="text-sm text-slate-300 light:text-slate-700">Colour
        <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
      </div>
    </div>
  )
}

export function PortfolioForm({ open, onClose, onSaved, editing, accounts, toast, mutate }) {
  const initial = editing ? { ...editing } : { name: '', broker: 'other', demat_account_id: '', color: '#a78bfa' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const payload = { ...form, demat_account_id: form.demat_account_id || null }
      const { queued } = await mutate({ table: 'portfolios', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: payload })
      toast.push(queued ? `Portfolio ${editing ? 'updated' : 'added'} — will sync when back online` : `Portfolio ${editing ? 'updated' : 'added'}`)
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save portfolio'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit portfolio' : 'Add portfolio'}>
        <form onSubmit={save}>
          <PortfolioFormFields form={form} setForm={setForm} accounts={accounts} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit portfolio' : 'Add portfolio'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <PortfolioFormFields form={form} setForm={setForm} accounts={accounts} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
