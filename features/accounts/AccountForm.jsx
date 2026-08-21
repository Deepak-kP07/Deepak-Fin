'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { ColorPicker } from '@/components/shared/ColorPicker'

export function AccountForm({ open, onClose, onSaved, editing, accounts = [], toast }) {
  const initial = editing
    ? { ...editing, opening_balance: String(editing.opening_balance), linked_account_id: editing.linked_account_id || '' }
    : { name: '', type: 'bank', bank_name: '', account_number_last4: '', opening_balance: '0', color: '#22d3ee', icon: 'landmark', is_active: true, linked_account_id: '' }
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [editing, open])
  if (!open) return null

  const isDebitCard = form.type === 'debit_card'
  const isCash = form.type === 'cash'
  const bankAccounts = accounts.filter((a) => a.type === 'bank' && a.id !== editing?.id)

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const endpoint = editing ? `/api/finance/accounts/${editing.id}` : '/api/finance/accounts'
      const payload = isDebitCard
        ? { name: form.name, type: 'debit_card', linked_account_id: form.linked_account_id, account_number_last4: form.account_number_last4 || null, opening_balance: 0 }
        : { ...form, opening_balance: Number(form.opening_balance), linked_account_id: null }
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Could not save')
      toast.push(editing ? 'Account updated' : 'Account added')
      onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }


  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit account' : 'Add account'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="text-sm text-slate-300 sm:col-span-2">Type
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[{ v: 'bank', l: 'Bank' }, { v: 'cash', l: 'Cash' }, { v: 'debit_card', l: 'Debit card' }].map((t) => (
                <button key={t.v} type="button" onClick={() => setForm({ ...form, type: t.v })} className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${form.type === t.v ? 'border-cyan-300/50 bg-cyan-400/10 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>{t.l}</button>
              ))}
            </div>
          </div>
          <label className="text-sm text-slate-300 sm:col-span-2">Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder={isDebitCard ? 'HDFC Visa Debit' : isCash ? 'Cash in hand' : 'HDFC Salary'} />
          </label>
          {isDebitCard ? (
            <>
              <label className="text-sm text-slate-300 sm:col-span-2">Linked bank account
                <Select required value={form.linked_account_id} onChange={(e) => setForm({ ...form, linked_account_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-3 text-white outline-none focus:border-cyan-300/50">
                  <option value="">Choose account…</option>
                  {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
                <div className="mt-1 text-[11px] text-slate-500">This card draws from that account's balance — it has none of its own. It'll show up merged into that account instead of as its own tile.</div>
                {bankAccounts.length === 0 && <div className="mt-1 text-[11px] text-amber-300">Add a bank account first.</div>}
              </label>
              <label className="text-sm text-slate-300 sm:col-span-2">Card's last 4 digits <span className="text-xs text-slate-500">(optional)</span>
                <input maxLength={4} value={form.account_number_last4 || ''} onChange={(e) => setForm({ ...form, account_number_last4: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="1234" />
              </label>
            </>
          ) : (
            <>
              {!isCash && (
                <>
                  <label className="text-sm text-slate-300">Bank name
                    <input value={form.bank_name || ''} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="HDFC Bank" />
                  </label>
                  <label className="text-sm text-slate-300"><span className="whitespace-nowrap">Last 4 digits</span>
                    <input maxLength={4} value={form.account_number_last4 || ''} onChange={(e) => setForm({ ...form, account_number_last4: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" placeholder="1234" />
                  </label>
                </>
              )}
              <label className="text-sm text-slate-300">Opening balance
                <input required type="number" step="0.01" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-cyan-300/50" />
              </label>
            </>
          )}
          <div className="text-sm text-slate-300 sm:col-span-2">Colour
            <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
          </div>
        </div>
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update account' : 'Save account'}</button>
      </form>
    </div>
  )
}
