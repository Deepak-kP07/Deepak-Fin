'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { AdminDashboardView } from '@/features/admin/AdminDashboardView'
import { AdminUsersView } from '@/features/admin/AdminUsersView'
import { AdminEngagementView } from '@/features/admin/AdminEngagementView'
import { AdminAdoptionView } from '@/features/admin/AdminAdoptionView'
import { AdminHealthView } from '@/features/admin/AdminHealthView'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'adoption', label: 'Adoption' },
  { key: 'health', label: 'Health' },
]

// The authenticated shell for every /admin tab — header + tab bar live here once, each tab's view
// component only owns its own content (same split AdminDashboardView used to do alone before this
// became a multi-tab portal).
export function AdminShell({ onLogout, onAuthExpired }) {
  const [tab, setTab] = useState('overview')

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

        <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold ${tab === t.key ? 'bg-accent-300/20 text-accent-100' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <AdminDashboardView onAuthExpired={onAuthExpired} />}
        {tab === 'users' && <AdminUsersView onAuthExpired={onAuthExpired} />}
        {tab === 'engagement' && <AdminEngagementView onAuthExpired={onAuthExpired} />}
        {tab === 'adoption' && <AdminAdoptionView onAuthExpired={onAuthExpired} />}
        {tab === 'health' && <AdminHealthView onAuthExpired={onAuthExpired} />}
      </div>
    </div>
  )
}
