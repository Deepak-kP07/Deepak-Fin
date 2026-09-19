'use client'

import { useEffect, useState } from 'react'
import { Activity, LogOut, TrendingUp, UserPlus, Users } from 'lucide-react'
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { HeroStatTile } from '@/components/shared/HeroStatTile'

const RANGES = [
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 365, label: '1y' },
]

function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const signups = payload.find((p) => p.dataKey === 'signups')?.value
  const total = payload.find((p) => p.dataKey === 'total')?.value
  return (
    <div className="rounded-xl border border-white/[.14] bg-[#0f1420] px-3 py-2 text-xs">
      <div className="text-slate-400">{label}</div>
      <div className="mt-0.5 text-white">+{signups} signup{signups === 1 ? '' : 's'}</div>
      <div className="text-slate-500">{total} total</div>
    </div>
  )
}

export function AdminDashboardView({ onLogout }) {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/stats?days=${days}`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load stats')
        return res.json()
      })
      .then((data) => { if (!cancelled) setStats(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [days])

  return (
    <div className="min-h-screen bg-[#080b12] p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-accent-200/70">Personal Fin</div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Admin dashboard</h1>
          </div>
          <button onClick={onLogout} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5">
            <LogOut size={14} />Sign out
          </button>
        </div>

        {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-300">{error}</div>}

        {!stats && !error && <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-6 text-sm text-slate-500">Loading…</div>}

        {stats && (
          <>
            <div className="rounded-3xl border border-white/10 bg-[#141a28] p-6">
              <div className="text-xs uppercase tracking-widest text-slate-500">Total users</div>
              <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white">
                {stats.totalUsers.toLocaleString('en-IN')}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <HeroStatTile icon={UserPlus} label="New this week" value={`+${stats.newUsersThisWeek}`} valueTone="text-emerald-300" />
                <HeroStatTile icon={TrendingUp} label="New this month" value={`+${stats.newUsersThisMonth}`} valueTone="text-emerald-300" />
                <HeroStatTile icon={Activity} label="Active this week" value={stats.activeUsersThisWeek} sub="logged a transaction" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">Growth</h2>
                  <div className="text-xs text-slate-500">Daily signups and cumulative total users</div>
                </div>
                <div className="flex gap-1 rounded-xl border border-white/10 p-1">
                  {RANGES.map((r) => (
                    <button
                      key={r.days}
                      onClick={() => setDays(r.days)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${days === r.days ? 'bg-accent-300/20 text-accent-100' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={stats.dailySignups}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={30} />
                    <YAxis yAxisId="signups" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                    <YAxis yAxisId="total" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
                    <Bar yAxisId="signups" dataKey="signups" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="total" type="monotone" dataKey="total" stroke="#d4af37" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#0b0f17', stroke: '#d4af37', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex items-center justify-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />New signups</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />Cumulative total</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <Users size={16} className="text-slate-500" />Recent signups
              </div>
              <div className="divide-y divide-white/[.06]">
                {stats.recentSignups.map((u, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate text-sm text-slate-300">{u.email}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {!u.confirmed && (
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2 py-0.5 text-[10px] font-medium text-amber-300">Unconfirmed</span>
                      )}
                      <span className="text-xs text-slate-500">{relativeTime(u.created_at)}</span>
                    </div>
                  </div>
                ))}
                {stats.recentSignups.length === 0 && <div className="py-4 text-sm text-slate-500">No users yet.</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
