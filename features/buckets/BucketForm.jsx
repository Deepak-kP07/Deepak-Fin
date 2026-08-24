'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { useIsMobile } from '@/hooks/use-mobile'

function BucketFormFields({ form, setForm, setReason }) {
  return (
    <div className="grid gap-4">
      <label className="text-sm text-slate-300">Product
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" placeholder="iPhone 15 Pro" />
      </label>
      <label className="text-sm text-slate-300">Product link <span className="text-xs text-slate-500">(optional)</span>
        <input type="url" value={form.product_url} onChange={(e) => setForm({ ...form, product_url: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" placeholder="https://amazon.in/…" />
      </label>
      <label className="text-sm text-slate-300">Estimated cost <span className="text-xs text-slate-500">(optional)</span>
        <input type="number" step="0.01" min="0" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" placeholder="60000" />
      </label>
      <div className="text-sm text-slate-300">Reasons to buy <span className="text-xs text-slate-500">(up to 3)</span>
        <div className="mt-2 space-y-2">
          {[0, 1, 2].map((i) => (
            <input key={i} value={form.reasons[i]} onChange={(e) => setReason(i, e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-white outline-none focus:border-accent-300/50" placeholder={`Reason ${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

// The 30-day rule: before buying something, log it here with why you want it, then leave it
// alone. `created_at` (set once, on creation) is all the list needs to show how long you've
// waited — there's no status/priority/target-date lifecycle to manage, just come back whenever
// and decide for yourself.
export function BucketForm({ open, onClose, onSaved, editing, toast, mutate }) {
  const buildInitial = () => editing
    ? { title: editing.title, product_url: editing.product_url || '', estimated_cost: editing.estimated_cost != null ? String(editing.estimated_cost) : '', reasons: [editing.reasons?.[0] || '', editing.reasons?.[1] || '', editing.reasons?.[2] || ''] }
    : { title: '', product_url: '', estimated_cost: '', reasons: ['', '', ''] }
  const [form, setForm] = useState(buildInitial)
  const [busy, setBusy] = useState(false)
  const isMobile = useIsMobile()
  useEffect(() => { setForm(buildInitial()) }, [editing, open])
  if (!open) return null
  const setReason = (i, value) => setForm({ ...form, reasons: form.reasons.map((r, idx) => (idx === i ? value : r)) })

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const payload = {
        title: form.title,
        product_url: form.product_url || null,
        estimated_cost: form.estimated_cost === '' ? null : Number(form.estimated_cost),
        reasons: form.reasons.map((r) => r.trim()).filter(Boolean),
      }
      const { queued } = await mutate({ table: 'bucket_list', method: editing ? 'PATCH' : 'POST', id: editing?.id, body: payload })
      toast.push((editing ? 'Updated' : 'Added — the 30-day clock starts now') + (queued ? ' — will sync when back online' : '')); onSaved()
    } catch (err) { toast.push(err.message, 'error') } finally { setBusy(false) }
  }

  const fieldsProps = { form, setForm, setReason }
  const submitButton = <button disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Update' : 'Add to list'}</button>

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={editing ? 'Edit item' : 'Thinking of buying something?'}>
        <form onSubmit={save}>
          <BucketFormFields {...fieldsProps} />
          {submitButton}
        </form>
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit item' : 'Thinking of buying something?'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <BucketFormFields {...fieldsProps} />
        </div>
        {submitButton}
      </form>
    </div>
  )
}
