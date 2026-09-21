'use client'

import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useAdminFetch } from '@/features/admin/useAdminFetch'
import { AdminUserDetail } from '@/features/admin/AdminUserDetail'

const SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'active', label: 'Recently active' },
  { key: 'transactions', label: 'Most transactions' },
]

function sortUsers(users, sort) {
  const arr = [...users]
  if (sort === 'oldest') return arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  if (sort === 'active') return arr.sort((a, b) => new Date(b.last_sign_in_at || 0) - new Date(a.last_sign_in_at || 0))
  if (sort === 'transactions') return arr.sort((a, b) => b.transactionCount - a.transactionCount)
  return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function relativeTime(iso) {
  if (!iso) return 'Never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export function AdminUsersView({ onAuthExpired }) {
  const { data, error } = useAdminFetch('/api/admin/users', onAuthExpired)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [selectedId, setSelectedId] = useState(null)

  const filtered = useMemo(() => {
    const users = data?.users || []
    const q = query.trim().toLowerCase()
    const matched = q ? users.filter((u) => u.email.toLowerCase().includes(q)) : users
    return sortUsers(matched, sort)
  }, [data, query, sort])

  if (selectedId) {
    return <AdminUserDetail userId={selectedId} onBack={() => setSelectedId(null)} onAuthExpired={onAuthExpired} />
  }

  if (error) return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-300">{error}</div>
  if (!data) return <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-6 text-sm text-slate-500">Loading…</div>

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e121c] p-3.5 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Users size={16} className="text-slate-500" />Users <span className="text-slate-500">({filtered.length})</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search email…"
              className="w-44 rounded-xl border border-white/10 bg-white/[.04] py-1.5 pl-8 pr-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-accent-300/50"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#101621] px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-accent-300/50"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="divide-y divide-white/[.06]">
        {filtered.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelectedId(u.id)}
            className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-white/[.02]"
          >
            <div className="min-w-0">
              <div className="truncate text-sm text-slate-200">{u.email}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                <span>Signed up {relativeTime(u.created_at)}</span>
                {u.banned && <span className="rounded-full border border-rose-400/20 bg-rose-400/5 px-1.5 py-0.5 font-medium text-rose-300">Disabled</span>}
                {!u.confirmed && <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-1.5 py-0.5 font-medium text-amber-300">Unconfirmed</span>}
              </div>
            </div>
            <div className="shrink-0 text-right text-xs text-slate-500">
              <div>{u.transactionCount} txns</div>
              <div>Active {relativeTime(u.last_sign_in_at)}</div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <div className="py-6 text-center text-sm text-slate-500">No users match "{query}".</div>}
      </div>
    </div>
  )
}
