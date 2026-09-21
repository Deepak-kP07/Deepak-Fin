'use client'

import { Layers, Puzzle } from 'lucide-react'
import { NAV_META } from '@/lib/navMeta'
import { useAdminFetch } from '@/features/admin/useAdminFetch'

function AdoptionBar({ label, count, pct }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-500">{count} · {pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
        <div className="h-full rounded-full bg-accent-300/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AdminAdoptionView({ onAuthExpired }) {
  const { data, error } = useAdminFetch('/api/admin/adoption', onAuthExpired)

  if (error) return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-300">{error}</div>
  if (!data) return <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-6 text-sm text-slate-500">Loading…</div>

  const modules = [...data.modules].sort((a, b) => b.pct - a.pct)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
          <Puzzle size={16} className="text-slate-500" />Module adoption
        </div>
        <div className="mb-3 text-xs text-slate-500">Share of {data.totalUsers} users with each module enabled</div>
        <div className="space-y-3">
          {modules.map((m) => (
            <AdoptionBar key={m.key} label={NAV_META[m.key]?.label || m.key} count={m.count} pct={m.pct} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Layers size={16} className="text-slate-500" />Integrations & channels
        </div>
        <div className="space-y-3">
          {data.integrations.map((it) => (
            <AdoptionBar key={it.key} label={it.label} count={it.count} pct={it.pct} />
          ))}
        </div>
      </div>
    </div>
  )
}
