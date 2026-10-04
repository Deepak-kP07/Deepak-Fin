'use client'

import { useState } from 'react'
import { CalendarClock, Check, X } from 'lucide-react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { DateInput } from '@/components/shared/DateInput'
import { useIsMobile } from '@/hooks/use-mobile'
import { formatDate, money, todayISO } from '@/lib/format'

const tomorrowISO = () => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

async function patchTx(id, body) {
  const res = await fetch(`/api/finance/transactions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not update')
}

function DueItem({ t, sourceName, busy, onConfirm, onReschedule, onCancel }) {
  const [mode, setMode] = useState(null) // null | 'reschedule' | 'cancel'
  const [newDate, setNewDate] = useState(tomorrowISO())
  const overdue = t.date < todayISO()
  const isIn = t.type === 'income' || (t.type === 'transfer' && t.transfer_direction === 'in')
  return (
    <li className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.03] light:bg-black/[.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white light:text-slate-900">{t.description || (t.type === 'transfer' ? 'Transfer' : 'Transaction')}</div>
          <div className="mt-0.5 text-xs text-slate-400 light:text-slate-500">
            {formatDate(t.date)}{sourceName ? ` · ${sourceName}` : ''}
            {overdue && <span className="ml-1.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200 light:text-amber-700">Overdue</span>}
          </div>
        </div>
        <div className={`shrink-0 text-sm font-semibold ${t.type === 'transfer' ? 'text-slate-200 light:text-slate-700' : isIn ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-300 light:text-rose-700'}`}>
          {t.type === 'transfer' ? '' : isIn ? '+' : '-'}{money(t.amount)}
        </div>
      </div>

      {mode === 'reschedule' ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[10rem] flex-1"><DateInput value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
          <button type="button" disabled={busy || !(newDate > todayISO())} onClick={() => onReschedule(newDate)} className="rounded-xl bg-accent-300/20 px-3 py-2.5 text-xs font-semibold text-accent-100 light:text-accent-700 hover:bg-accent-300/30 disabled:opacity-50">Move to this date</button>
          <button type="button" onClick={() => setMode(null)} className="rounded-xl px-3 py-2.5 text-xs text-slate-400 hover:bg-white/5">Back</button>
          {!(newDate > todayISO()) && <div className="w-full text-[11px] text-amber-300 light:text-amber-700">Pick a date after today.</div>}
        </div>
      ) : mode === 'cancel' ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-300 light:text-slate-700">Remove it — it isn&apos;t happening?</span>
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl bg-rose-400/15 px-3 py-2 font-semibold text-rose-200 light:text-rose-700 hover:bg-rose-400/25 disabled:opacity-50">Yes, remove</button>
          <button type="button" onClick={() => setMode(null)} className="rounded-xl px-3 py-2 text-slate-400 hover:bg-white/5">Keep</button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" disabled={busy} onClick={onConfirm} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400/15 px-3 py-2.5 text-xs font-semibold text-emerald-200 light:text-emerald-700 hover:bg-emerald-400/25 disabled:opacity-50"><Check size={14} />Confirm</button>
          <button type="button" disabled={busy} onClick={() => setMode('reschedule')} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 light:border-black/10 px-3 py-2.5 text-xs font-medium text-slate-200 light:text-slate-700 hover:bg-white/5 disabled:opacity-50"><CalendarClock size={14} />Not yet</button>
          <button type="button" disabled={busy} onClick={() => setMode('cancel')} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 light:border-black/10 px-3 py-2.5 text-xs font-medium text-slate-400 light:text-slate-500 hover:bg-white/5 disabled:opacity-50"><X size={14} />Cancel</button>
        </div>
      )}
    </li>
  )
}

// Scheduled transactions whose date has arrived (or passed): confirm each one happened (it then
// counts in balances and totals), push it to a later date, or remove it. `items` should already
// be one row per transaction (one leg per transfer). Changes go straight to the server; onChanged
// refreshes app data.
export function ScheduledDuePrompt({ open, onClose, items, accounts = [], creditCards = [], onChanged, toast }) {
  const isMobile = useIsMobile()
  const [busyId, setBusyId] = useState(null)
  if (!open) return null

  const sourceName = (t) => accounts.find((a) => a.id === t.account_id)?.name || (t.linked_module === 'credit_card' ? creditCards.find((c) => c.id === t.linked_module_id)?.name : null)
  const run = async (id, fn, okMsg) => {
    setBusyId(id)
    try { await fn(); toast.push(okMsg); await onChanged() } catch (e) { toast.push(e.message, 'error') } finally { setBusyId(null) }
  }
  const confirmAll = () => run('all', async () => { for (const t of items) await patchTx(t.id, { status: 'confirmed' }) }, `${items.length} transaction${items.length === 1 ? '' : 's'} confirmed`)

  const body = (
    <>
      <p className="text-xs leading-5 text-slate-400 light:text-slate-500">These were scheduled for today or earlier. Confirm the ones that happened — they&apos;ll count in your balance from then on.</p>
      <ul className="mt-4 space-y-3">
        {items.map((t) => (
          <DueItem
            key={t.id} t={t} sourceName={sourceName(t)} busy={!!busyId}
            onConfirm={() => run(t.id, () => patchTx(t.id, { status: 'confirmed' }), 'Confirmed — now counted in your balance')}
            onReschedule={(date) => run(t.id, () => patchTx(t.id, { date }), `Moved to ${formatDate(date)}`)}
            onCancel={() => run(t.id, async () => { const r = await fetch(`/api/finance/transactions/${t.id}`, { method: 'DELETE' }); if (!r.ok) throw new Error('Could not remove') }, 'Scheduled transaction removed')}
          />
        ))}
      </ul>
      {items.length > 1 && (
        <button type="button" disabled={!!busyId} onClick={confirmAll} className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3 text-sm font-semibold text-[#07101c] disabled:opacity-60">
          {busyId === 'all' ? 'Confirming…' : `Confirm all ${items.length}`}
        </button>
      )}
    </>
  )
  const title = `${items.length} scheduled transaction${items.length === 1 ? '' : 's'} to confirm`

  if (isMobile) {
    return <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title={title}>{body}</BottomSheet>
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5" aria-label="Later"><X size={18} /></button>
        </div>
        <div className="mt-4">{body}</div>
      </div>
    </div>
  )
}
