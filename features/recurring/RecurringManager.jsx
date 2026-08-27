import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { formatDate, money } from '@/lib/format'

export function RecurringManager({ open, onClose, rules, onAdd, onEdit, onToggle, onDelete, showMoney }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white light:text-slate-900">Recurring transactions</h2>
            <p className="mt-1 text-xs text-slate-500">Rent, salary, SIPs, subscriptions — set once, logged automatically.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <button type="button" onClick={onAdd} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 py-3 text-sm font-semibold text-[#07101c]"><Plus size={15} />New recurring transaction</button>
        <div className="mt-4 space-y-2">
          {rules.length === 0 ? (
            <div className="rounded-2xl border border-white/10 light:border-black/10 bg-white/[.02] light:bg-black/[.02] py-8 text-center text-sm text-slate-500">No recurring rules yet.</div>
          ) : rules.map((r) => (
            <div key={r.id} className={`rounded-2xl border p-4 ${r.is_active ? 'border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card' : 'border-white/5 light:border-black/5 bg-white/[.015] light:bg-black/[.01] opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white light:text-slate-900">{r.description}</div>
                  <div className="mt-0.5 text-xs text-slate-500 capitalize">{r.frequency} · {r.type} · {showMoney ? money(r.amount) : '••••'} · next {formatDate(r.next_due_date)}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => onToggle(r)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${r.is_active ? 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700 hover:bg-emerald-400/25' : 'bg-white/[.06] light:bg-black/[.04] text-slate-400 light:text-slate-500 hover:bg-white/[.1] hover:light:bg-black/[.06]'}`}>{r.is_active ? 'Active' : 'Paused'}</button>
                  <button type="button" onClick={() => onEdit(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={14} /></button>
                  <button type="button" onClick={() => onDelete(r)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
