import { CheckCircle2, Clock, ExternalLink, Eye, EyeOff, Mountain, Pencil, Plus, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { money } from '@/lib/format'

const WAIT_DAYS = 30

function daysSince(dateStr) {
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export function BucketListView({ data, onAdd, onEdit, onDelete, showMoney, onToggleMoney }) {
  const { bucket_list } = data
  const readyCount = bucket_list.filter((b) => daysSince(b.created_at) >= WAIT_DAYS).length
  const stillWaitingValue = bucket_list.filter((b) => daysSince(b.created_at) < WAIT_DAYS).reduce((s, b) => s + Number(b.estimated_cost || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70">The 30-day rule</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Bucket list</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c] sm:flex-none"><Plus size={15} />Add</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {bucket_list.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Ready to buy</div>
          <div className={`mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] ${readyCount > 0 ? 'text-emerald-300' : 'text-white'}`}>{readyCount}</div>
          <div className="mt-1 text-sm text-slate-500">{readyCount === 1 ? 'item has' : 'items have'} passed the 30-day wait</div>
          <div className="mt-5 rounded-2xl bg-white/[.04] p-3.5">
            <div className="text-xs text-slate-400">Still waiting</div>
            <div className="mt-1 text-lg font-semibold text-white">{showMoney ? money(stillWaitingValue) : '••••'}</div>
            <div className="text-[11px] text-slate-500">{bucket_list.length - readyCount} item{bucket_list.length - readyCount === 1 ? '' : 's'}</div>
          </div>
        </div>
      )}

      {bucket_list.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <EmptyState icon={Mountain} title="Nothing waiting" message="Before buying something, add it here with why you want it — come back in 30 days and see if you still do." cta="Add first item" onCta={onAdd} />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="hidden grid-cols-[1.6fr_1fr_.7fr_auto] gap-4 border-b border-white/10 px-5 py-2.5 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
            <span>Product</span>
            <span>Reasons to buy</span>
            <span>Waiting</span>
            <span />
          </div>
          <div className="divide-y divide-white/5">
            {bucket_list.map((b) => {
              const days = daysSince(b.created_at)
              const ready = days >= WAIT_DAYS
              const pct = Math.min(100, Math.round((days / WAIT_DAYS) * 100))
              return (
                <div key={b.id} className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1.6fr_1fr_.7fr_auto] sm:items-center sm:gap-4">
                  <div className="min-w-0">
                    {b.product_url ? (
                      <a href={b.product_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 truncate text-sm font-medium text-accent-200 hover:underline">
                        <span className="truncate">{b.title}</span>
                        <ExternalLink size={12} className="shrink-0 text-accent-300/70" />
                      </a>
                    ) : (
                      <div className="truncate text-sm font-medium text-white">{b.title}</div>
                    )}
                    {b.estimated_cost != null && <div className="text-xs text-slate-500">{showMoney ? money(b.estimated_cost) : '••••'}</div>}
                  </div>

                  <div className="min-w-0 text-xs text-slate-400">
                    {b.reasons?.length > 0 ? (
                      <ul className="space-y-0.5">
                        {b.reasons.map((r, i) => <li key={i} className="truncate">· {r}</li>)}
                      </ul>
                    ) : <span className="text-slate-600">—</span>}
                  </div>

                  <div>
                    <div className={`flex items-center gap-1.5 text-sm font-semibold ${ready ? 'text-emerald-300' : 'text-white'}`}>
                      {ready ? <CheckCircle2 size={14} /> : <Clock size={14} className="text-slate-500" />}
                      {ready ? `${days} days` : `Day ${days} of ${WAIT_DAYS}`}
                    </div>
                    <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${ready ? 'bg-emerald-400' : 'bg-accent-300'}`} style={{ width: `${pct}%` }} /></div>
                    {ready && <div className="mt-1 text-[11px] text-emerald-300/80">30 days up — still want it?</div>}
                  </div>

                  <div className="flex justify-end gap-1">
                    <button onClick={() => onEdit(b)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(b)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
