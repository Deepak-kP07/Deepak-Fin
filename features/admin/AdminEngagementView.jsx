'use client'

import { Activity, AlertTriangle, Users, Zap } from 'lucide-react'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { useAdminFetch } from '@/features/admin/useAdminFetch'

const FUNNEL_STEPS = [
  { key: 'signedUp', label: 'Signed up' },
  { key: 'confirmed', label: 'Confirmed email' },
  { key: 'activated', label: 'Logged a transaction' },
]

function relativeTime(iso) {
  if (!iso) return 'Never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export function AdminEngagementView({ onAuthExpired }) {
  const { data, error } = useAdminFetch('/api/admin/engagement', onAuthExpired)

  if (error) return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-300">{error}</div>
  if (!data) return <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-6 text-sm text-slate-500">Loading…</div>

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Zap size={16} className="text-slate-500" />Engagement
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStatTile icon={Activity} label="DAU" value={data.dau} sub="signed in today" />
          <HeroStatTile icon={Users} label="WAU" value={data.wau} sub="last 7 days" />
          <HeroStatTile icon={Users} label="MAU" value={data.mau} sub="last 30 days" />
          <HeroStatTile icon={Zap} label="Stickiness" value={`${data.stickiness}%`} sub="DAU / MAU" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
        <div className="mb-3 text-sm font-semibold text-white">Activation funnel</div>
        <div className="space-y-2.5">
          {FUNNEL_STEPS.map((step, i) => {
            const count = data.funnel[step.key]
            const prevCount = i === 0 ? count : data.funnel[FUNNEL_STEPS[i - 1].key]
            const pctOfPrev = i === 0 || prevCount === 0 ? 100 : Math.round((count / prevCount) * 100)
            const pctOfFirst = data.funnel.signedUp > 0 ? Math.round((count / data.funnel.signedUp) * 100) : 0
            return (
              <div key={step.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-300">{step.label}</span>
                  <span className="text-slate-500">{count} {i > 0 && `(${pctOfPrev}% of prior step)`}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                  <div className="h-full rounded-full bg-accent-300/70" style={{ width: `${pctOfFirst}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <AlertTriangle size={16} className="text-amber-300" />At risk — no activity in 30+ days
        </div>
        <div className="divide-y divide-white/[.06]">
          {data.atRisk.slice(0, 25).map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 truncate text-sm text-slate-300">{u.email}</span>
              <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                <span>Last seen {relativeTime(u.last_sign_in_at)}</span>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2 py-0.5 font-medium text-amber-300">{u.daysInactive}d inactive</span>
              </div>
            </div>
          ))}
          {data.atRisk.length === 0 && <div className="py-4 text-sm text-slate-500">Nobody's at risk right now.</div>}
        </div>
      </div>
    </div>
  )
}
