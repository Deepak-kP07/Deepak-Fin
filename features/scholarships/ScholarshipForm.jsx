'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function ScholarshipFormFields({ form, setForm, editing, accounts, linkedAccount }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Name
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Merit scholarship Q1" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Total amount
        <input required type="number" step="0.01" min="0" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Academic year
        <input value={form.academic_year || ''} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="2025-26" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Source
        <input value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Govt / Foundation / College" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Status
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="pending">Pending</option><option value="received">Received</option><option value="paid">Paid to college</option>
        </Select>
        {form.status === 'paid' && <p className="mt-1.5 text-[11px] text-slate-500">Marks the full amount as paid to college right away. To log paid amounts one at a time (with dates and which account they left from), use the &quot;Pay to college&quot; button on the scholarship instead.</p>}
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Received date
        <DateInput value={form.received_date || ''} onChange={(e) => setForm({ ...form, received_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      <label className="text-sm text-slate-300 light:text-slate-700">Due date (to college)
        <DateInput value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
      {editing ? (
        <div className="rounded-xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] px-3 py-2.5 text-xs text-slate-400 light:text-slate-500 sm:col-span-2">
          {linkedAccount ? <>Linked to <span className="text-white light:text-slate-900">{linkedAccount.name}</span> — marking this received/paid posts a transaction on that account.</> : 'Not linked to a bank account — this scholarship stays only in this module.'} Linking can only be set when a scholarship is created, not changed afterward.
        </div>
      ) : (
        <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Link to a bank account <span className="text-xs text-slate-500">(optional — can't be changed later)</span>
          <Select value={form.received_to_account_id || ''} onChange={(e) => setForm({ ...form, received_to_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
            <option value="">Don't link — keep this separate</option>
            {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <p className="mt-1.5 text-[11px] text-slate-500">{form.received_to_account_id ? 'Marking this received (or paid) posts a transaction on this account, and stays in sync as you edit status/amount.' : "This scholarship won't show up anywhere outside this module."}</p>
        </label>
      )}
      <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Notes
        <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
      </label>
    </div>
  )
}

// Entirely online-only — status is a plain form field here, and every status/amount change
// (create or edit) synthesizes/resizes an auto-payment row and/or mirrors a transaction
// server-side (genericCrud.js) — the side-effecting branch is always reachable, so the whole
// form stays online-only rather than splitting behavior within one save() (same call as
// LoanForm/LendForm).
export function ScholarshipForm({ open, onClose, onSaved, editing, accounts, toast }) {
  const initial = editing
    ? { ...editing, total_amount: String(editing.total_amount) }
    : { name: '', total_amount: '', academic_year: '', source: '', status: 'pending', received_date: '', due_date: '', received_to_account_id: '', notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null
  const linkedAccount = accounts.find((a) => a.id === form.received_to_account_id)

  const save = async (e) => {
    e.preventDefault()
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Saving a scholarship needs a connection — try again once you’re back online.', 'error')
      return
    }
    setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/scholarships/${editing.id}` : '/api/finance/scholarships'
      const payload = editing
        ? { name: form.name, total_amount: Number(form.total_amount), academic_year: form.academic_year, source: form.source, status: form.status, received_date: form.received_date || null, due_date: form.due_date || null, notes: form.notes }
        : { ...form, total_amount: Number(form.total_amount), received_date: form.received_date || null, due_date: form.due_date || null, received_to_account_id: form.received_to_account_id || null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Updated' : 'Scholarship added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, editing, accounts, linkedAccount }
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Save'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit scholarship' : 'Add scholarship'}>
        <form onSubmit={save}>
          <ScholarshipFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit scholarship' : 'Add scholarship'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <ScholarshipFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
