'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { DateInput } from '@/components/shared/DateInput'
import { CategorySelect } from '@/components/shared/CategorySelect'
import { Select } from '@/components/shared/Select'
import { ENTRY_TYPE_STYLE, ENTRY_TYPES } from '@/lib/moneyProfiles'
import { todayISO } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function MoneyProfileEntryFormFields({ form, setForm, profile, accounts, categoryOptions, onAddCategory }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {ENTRY_TYPES.map((t) => (
          <button key={t.value} type="button" onClick={() => setForm({ ...form, entry_type: t.value })} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${form.entry_type === t.value ? ENTRY_TYPE_STYLE[t.value] + ' border-transparent' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`}>{t.label}</button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300 light:text-slate-700">Date
          <DateInput value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700">Amount
          <input required type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Description
          <input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" placeholder="Rent, groceries, salary…" />
        </label>
        <div className="text-sm text-slate-300 light:text-slate-700">
          <label>Category <span className="text-xs text-slate-500">(optional)</span></label>
          <CategorySelect value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })} categories={categoryOptions} onAddCategory={onAddCategory} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </div>
        <label className="text-sm text-slate-300 light:text-slate-700">Paid to / Received from <span className="text-xs text-slate-500">(optional)</span>
          <input value={form.paid_party} onChange={(e) => setForm({ ...form, paid_party: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
        <label className="text-sm text-slate-300 light:text-slate-700 sm:col-span-2">Notes <span className="text-xs text-slate-500">(optional)</span>
          <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-white/[.04] light:bg-black/[.03] px-3 py-3 text-white light:text-slate-900 outline-none focus:border-accent-300/50" />
        </label>
      </div>

      <label className="mt-4 block text-sm text-slate-300 light:text-slate-700">Bank account <span className="text-xs text-slate-500">(optional)</span>
        <Select value={form.account_id || ''} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 light:border-black/10 bg-[#101621] light:bg-white px-3 py-3 text-white light:text-slate-900 outline-none">
          <option value="">Don't post to a bank account</option>
          {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <p className="mt-1.5 text-[11px] text-slate-500">{form.account_id ? 'This entry will also post as a transaction on this account.' : "This entry won't show up anywhere outside this module."}</p>
      </label>
    </>
  )
}

// An entry against a linked profile mirrors into `transactions` server-side (plus category
// auto-creation) — the client can't safely fabricate that second row, so this stays entirely
// online-only, matching LoanPaymentForm/CardPayForm rather than going through mutate().
export function MoneyProfileEntryForm({ open, onClose, onSaved, editing, profile, accounts = [], categories = [], onAddCategory, toast }) {
  // Defaults to the profile's current link — an existing entry's own account_id (if it was ever
  // set to something else) wins over that default, same precedence the mirror function itself
  // applies server-side.
  const initial = editing
    ? { ...editing, amount: String(editing.amount), account_id: editing.account_id || profile?.linked_account_id || '' }
    : { profile_id: profile?.id, entry_type: 'expense', category_id: '', description: '', amount: '', date: todayISO(), paid_party: '', notes: '', account_id: profile?.linked_account_id || '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  // Keyed on profile?.id, not the profile object itself — that object gets a fresh identity on
  // every refresh(), and resetting the form on every unrelated data refresh would wipe out
  // whatever the user had already typed.
  useEffect(() => { setForm(initial) }, [editing, open, profile?.id])
  if (!open) return null

  const catType = form.entry_type === 'expense' ? 'expense' : 'income'
  const categoryOptions = categories.filter((c) => c.type === catType && !(c.hidden_in_modules || []).includes('family_company'))

  const save = async (e) => {
    e.preventDefault()
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Logging an entry needs a connection — try again once you’re back online.', 'error')
      return
    }
    setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/money_profile_entries/${editing.id}` : '/api/finance/money_profile_entries'
      const payload = { profile_id: profile.id, entry_type: form.entry_type, category_id: form.category_id || null, description: form.description, amount: Number(form.amount), date: form.date, paid_party: form.paid_party || null, notes: form.notes || null, account_id: form.account_id || null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Entry updated' : 'Entry logged'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, profile, accounts, categoryOptions, onAddCategory }
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update entry' : 'Save entry'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit entry' : `Add entry · ${profile?.name || ''}`}>
        <form onSubmit={save}>
          <MoneyProfileEntryFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{editing ? 'Edit entry' : `Add entry · ${profile?.name || ''}`}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <MoneyProfileEntryFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
