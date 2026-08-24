'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { DateInput } from '@/components/shared/DateInput'
import { PROFILE_TYPES } from '@/lib/moneyProfiles'
import { todayISO } from '@/lib/format'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function MoneyProfileFormFields({ form, setForm, editing, accounts, linkedAccount }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 sm:col-span-2">Name
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" placeholder="Home / Dad's finances / Acme Pvt Ltd…" />
      </label>
      <label className="text-sm text-slate-300">Type
        <Select value={form.profile_type} onChange={(e) => setForm({ ...form, profile_type: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
          {PROFILE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </label>

      {editing ? (
        <label className="text-sm text-slate-300">Opening balance date
          <DateInput value={form.opening_balance_date} onChange={(e) => setForm({ ...form, opening_balance_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" />
        </label>
      ) : (
        <>
          <label className="text-sm text-slate-300">Opening balance
            <input type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" placeholder="Leave 0 and add your first entry instead, if you'd rather" />
          </label>
          <label className="text-sm text-slate-300">Opening balance date
            <DateInput value={form.opening_balance_date} onChange={(e) => setForm({ ...form, opening_balance_date: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" />
          </label>
        </>
      )}

      {editing ? (
        <div className="rounded-xl border border-white/10 bg-white/[.02] px-3 py-2.5 text-xs text-slate-400 sm:col-span-2">
          {linkedAccount ? <>Linked to <span className="text-white">{linkedAccount.name}</span> — every entry here reflects in your Transactions module.</> : 'Not linked to a bank account — entries here stay only in this module.'} Linking can only be set when a profile is created, not changed afterward.
        </div>
      ) : (
        <label className="text-sm text-slate-300 sm:col-span-2">Link to a bank account <span className="text-xs text-slate-500">(optional — can't be changed later)</span>
          <Select value={form.linked_account_id} onChange={(e) => setForm({ ...form, linked_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none">
            <option value="">Don't link — keep this separate</option>
            {accounts.filter((a) => a.type !== 'debit_card').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <p className="mt-1.5 text-[11px] text-slate-500">{form.linked_account_id ? 'Every income/capital/expense entry here will also post as a transaction on this account.' : "Entries here won't show up anywhere outside this module."}</p>
        </label>
      )}

      <label className="text-sm text-slate-300 sm:col-span-2">Notes <span className="text-xs text-slate-500">(optional)</span>
        <input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" />
      </label>
    </div>
  )
}

export function MoneyProfileForm({ open, onClose, onSaved, editing, accounts, toast, mutate }) {
  const initial = editing
    ? { ...editing, opening_balance: String(editing.opening_balance), linked_account_id: editing.linked_account_id || '' }
    : { name: '', profile_type: 'family', linked_account_id: '', opening_balance: '0', opening_balance_date: todayISO(), notes: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null

  const linkedAccount = accounts.find((a) => a.id === form.linked_account_id)

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const payload = editing
        ? { name: form.name, profile_type: form.profile_type, opening_balance_date: form.opening_balance_date, notes: form.notes || null }
        : { ...form, linked_account_id: form.linked_account_id || null, opening_balance: Number(form.opening_balance || 0) }
      const { queued } = await mutate({ table: 'money_profiles', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: payload })
      toast.push((editing ? 'Profile updated' : 'Profile created') + (queued ? ' — will sync when back online' : '')); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, editing, accounts, linkedAccount }
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update profile' : 'Create profile'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit profile' : 'New Family / Company profile'}>
        <form onSubmit={save}>
          <MoneyProfileFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit profile' : 'New Family / Company profile'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <MoneyProfileFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
