'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ColorPicker } from '@/components/shared/ColorPicker'
import { Select } from '@/components/shared/Select'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

const EMPTY = {
  item_type: 'bank_account', label: '', bank_name: '', color: '#22d3ee', linked_account_id: '',
  account_number: '', ifsc_code: '', branch: '',
  card_number: '', expiry_month: '', expiry_year: '', cvv: '', pin: '',
  notes: '',
}

const TYPE_OPTIONS = [
  { value: 'bank_account', label: 'Bank account' },
  { value: 'debit_card', label: 'Debit card' },
  { value: 'credit_card', label: 'Credit card' },
]

// Groups digits into 4s as you type ("4111 1111 1111 1111") — card numbers follow this
// convention everywhere, unlike bank account numbers, which have no standard grouping and are
// just kept as plain digits below.
function formatCardNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

const inputClass = 'mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50'

function VaultItemFormFields({ form, setForm, accounts, isBank, prefilling }) {
  if (prefilling) return <div className="py-10 text-center text-sm text-slate-500">Decrypting…</div>
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300 sm:col-span-2">Type
        <Select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })} className={inputClass}>
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </label>
      <label className="text-sm text-slate-300 sm:col-span-2">Label
        <input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputClass} placeholder={isBank ? 'HDFC Salary Account' : 'HDFC Millennia'} />
      </label>
      <label className="text-sm text-slate-300">Bank
        <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className={inputClass} placeholder="HDFC Bank" />
      </label>
      <label className="text-sm text-slate-300">Linked account (optional)
        <Select value={form.linked_account_id} onChange={(e) => setForm({ ...form, linked_account_id: e.target.value })} className={inputClass} placeholder="None">
          <option value="">None</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </label>

      {isBank ? (
        <>
          <label className="text-sm text-slate-300 sm:col-span-2">Account number
            <input required inputMode="numeric" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, '') })} className={`${inputClass} font-mono`} placeholder="0123456789012" />
          </label>
          <label className="text-sm text-slate-300">IFSC code
            <input required value={form.ifsc_code} onChange={(e) => setForm({ ...form, ifsc_code: e.target.value.toUpperCase() })} className={`${inputClass} font-mono`} placeholder="HDFC0001234" />
          </label>
          <label className="text-sm text-slate-300">Branch
            <input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className={inputClass} placeholder="Koramangala" />
          </label>
        </>
      ) : (
        <>
          <label className="text-sm text-slate-300 sm:col-span-2">Card number
            <input required inputMode="numeric" value={form.card_number} onChange={(e) => setForm({ ...form, card_number: formatCardNumber(e.target.value) })} className={`${inputClass} font-mono`} placeholder="4111 1111 1111 1111" />
          </label>
          <label className="text-sm text-slate-300">Expiry (MM/YY)
            <div className="mt-2 flex gap-2">
              <input required maxLength={2} value={form.expiry_month} onChange={(e) => setForm({ ...form, expiry_month: e.target.value.replace(/\D/g, '') })} className={`${inputClass} mt-0 w-16 font-mono`} placeholder="MM" />
              <input required maxLength={2} value={form.expiry_year} onChange={(e) => setForm({ ...form, expiry_year: e.target.value.replace(/\D/g, '') })} className={`${inputClass} mt-0 w-16 font-mono`} placeholder="YY" />
            </div>
          </label>
          <label className="text-sm text-slate-300">CVV
            <input required maxLength={4} value={form.cvv} onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, '') })} className={`${inputClass} font-mono`} placeholder="123" />
          </label>
          <label className="text-sm text-slate-300">PIN
            <input maxLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} className={`${inputClass} font-mono`} placeholder="Optional" />
          </label>
        </>
      )}

      <label className="text-sm text-slate-300 sm:col-span-2">Notes (optional)
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} placeholder="Anything else worth remembering" />
      </label>

      <div className="text-sm text-slate-300 sm:col-span-2">Colour
        <ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} />
      </div>
    </div>
  )
}

// Entirely online-only — encrypted_payload is always server-computed (encryptVaultPayload),
// never client-writable (excluded from safeFields), so there's no way to represent this as an
// offline optimistic write. No mutate() here.
export function VaultItemForm({ open, onClose, onSaved, editing, accounts = [], toast, defaultType = 'bank_account' }) {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  // Editing loads the item's decrypted secrets once so correcting a typo doesn't mean blindly
  // retyping the whole card — nothing is shown until this resolves.
  const [prefilling, setPrefilling] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    if (!editing) { setForm({ ...EMPTY, item_type: defaultType, color: EMPTY.color }); return }
    setForm({ ...EMPTY, item_type: editing.item_type, label: editing.label, bank_name: editing.bank_name || '', color: editing.color || EMPTY.color, linked_account_id: editing.linked_account_id || '' })
    setPrefilling(true)
    fetch(`/api/finance/vault_items/${editing.id}/reveal`, { method: 'POST' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.secrets) setForm((f) => ({ ...f, ...d.secrets, card_number: formatCardNumber(d.secrets.card_number) })) })
      .finally(() => setPrefilling(false))
  }, [open, editing, defaultType])

  if (!open) return null
  const isBank = form.item_type === 'bank_account'

  const save = async (e) => {
    e.preventDefault()
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.push('Saving to the vault needs a connection — try again once you’re back online.', 'error')
      return
    }
    setBusy(true)
    try {
      const secrets = isBank
        ? { account_number: form.account_number, ifsc_code: form.ifsc_code, branch: form.branch, notes: form.notes }
        : { card_number: form.card_number.replace(/\s+/g, ''), expiry_month: form.expiry_month, expiry_year: form.expiry_year, cvv: form.cvv, pin: form.pin, notes: form.notes }
      const last4 = String(isBank ? form.account_number : form.card_number).replace(/\s+/g, '').slice(-4)
      const payload = { item_type: form.item_type, label: form.label, bank_name: form.bank_name || null, color: form.color, linked_account_id: form.linked_account_id || null, last4, secrets }
      const endpoint = editing ? `/api/finance/vault_items/${editing.id}` : '/api/finance/vault_items'
      const response = await fetch(endpoint, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save')
      toast.push(editing ? 'Vault item updated' : 'Vault item added'); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, accounts, isBank, prefilling }
  const submitButton = <button disabled={busy || prefilling} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update item' : 'Save to vault'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit vault item' : 'Add to vault'}>
        <form onSubmit={save}>
          <VaultItemFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit vault item' : 'Add to vault'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <VaultItemFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
