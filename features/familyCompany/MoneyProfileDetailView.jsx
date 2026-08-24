'use client'

import { useState } from 'react'
import { ChevronRight, Download, Link2, Lock, Pencil, Trash2, Unlock, Upload, Users, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { MonthCursor } from '@/components/shared/MonthCursor'
import { DismissibleBanner } from '@/components/shared/DismissibleBanner'
import { ENTRY_TYPE_STYLE, profileTotals } from '@/lib/moneyProfiles'
import { downloadFamilyCompanyExport } from '@/lib/exportFamilyCompany'
import { MONTH_NAMES, formatDate, money } from '@/lib/format'

export function MoneyProfileDetailView({
  profile, entries, accounts, categories = [], onBack, onEdit, onDelete,
  onAddEntry, onEditEntry, onDeleteEntry, onBulkImport, onToggleStatus,
}) {
  const categoryById = (id) => categories.find((c) => c.id === id)
  // Stat cards below always use every entry (life-to-date totals), same split
  // PortfolioDetailView uses for cash activity — but the Entries table AND the Export button
  // both follow the month cursor, so what you export always matches what's on screen.
  const { opening, income, capital, expense, balance } = profileTotals(profile, entries)
  const linkedAccount = accounts.find((a) => a.id === profile.linked_account_id)
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const isClosed = profile.status === 'closed'

  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [showAllMonths, setShowAllMonths] = useState(false)
  const shiftMonth = (delta) => { setShowAllMonths(false); setMonthCursor((c) => { const d = new Date(c.year, c.month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() } }) }
  const monthEntries = showAllMonths ? sorted : sorted.filter((e) => {
    const d = new Date(e.date)
    return d.getFullYear() === monthCursor.year && d.getMonth() === monthCursor.month
  })

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ChevronRight size={14} className="rotate-180" /> Back to Family / Company</button>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200">
            <Users size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-white">{profile.name}</div>
              {linkedAccount && <span className="flex items-center gap-1 rounded-full bg-accent-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent-200"><Link2 size={10} />Linked</span>}
              {isClosed && <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-300">Closed</span>}
            </div>
            <div className="text-xs capitalize text-slate-500">{profile.profile_type} · {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</div>
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
          <button onClick={() => onAddEntry(profile.id)} disabled={isClosed} title={isClosed ? 'Reactivate this profile to add entries' : undefined} className="rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-40">+ Add entry</button>
          <button onClick={() => onBulkImport(profile)} disabled={isClosed} title={isClosed ? 'Reactivate this profile to add entries' : undefined} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-40"><Download size={14} />Bulk import</button>
          <button
            onClick={() => downloadFamilyCompanyExport(
              { profiles: [profile], entries: monthEntries, categories },
              showAllMonths ? profile.name : `${profile.name} ${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`,
              new Date().toISOString().slice(0, 10),
            )}
            disabled={monthEntries.length === 0}
            title={showAllMonths ? 'Export every entry in this profile' : `Export only ${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50"
          ><Upload size={14} />Export</button>
          <button onClick={() => onToggleStatus(profile)} title={isClosed ? 'Reactivate profile' : 'Close profile'} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5 hover:text-white">
            {isClosed ? <Unlock size={15} /> : <Lock size={15} />}
          </button>
          <button onClick={() => onEdit(profile)} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
          <button onClick={() => onDelete(profile)} className="rounded-xl border border-white/10 p-2.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={15} /></button>
        </div>
      </div>

      <DismissibleBanner tone="cyan">
        {linkedAccount ? <>Linked to <b>{linkedAccount.name}</b> — every entry here also posts as a transaction on that account and counts toward your net worth.</> : 'Not linked to a bank account — entries here stay only in this module and never affect your other totals.'}
      </DismissibleBanner>

      {isClosed && (
        <DismissibleBanner tone="amber">
          This profile is closed — no new entries can be added until you reactivate it. Existing entries are still visible and editable.
        </DismissibleBanner>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">Current balance</div>
        <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white">{money(balance)}</div>
        <div className="mt-1 text-sm text-slate-500">Opening {money(opening)}</div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/[.04] p-3.5">
            <div className="text-xs text-slate-400">Total income</div>
            <div className="mt-1 text-lg font-semibold text-emerald-300">{money(income)}</div>
          </div>
          <div className="rounded-2xl bg-white/[.04] p-3.5">
            <div className="text-xs text-slate-400">Total capital</div>
            <div className="mt-1 text-lg font-semibold text-accent-300">{money(capital)}</div>
          </div>
          <div className="rounded-2xl bg-white/[.04] p-3.5">
            <div className="text-xs text-slate-400">Total expense</div>
            <div className="mt-1 text-lg font-semibold text-rose-300">{money(expense)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div className="text-xs uppercase tracking-widest text-slate-500">Entries · {monthEntries.length}</div>
          <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
        </div>
        {monthEntries.length === 0 ? (
          <EmptyState compact icon={Wallet} title={entries.length === 0 ? 'No entries yet' : showAllMonths ? 'No entries yet' : 'No entries this month'} message="Log an income, capital, or expense entry to start tracking." cta={isClosed ? undefined : 'Add entry'} onCta={isClosed ? undefined : () => onAddEntry(profile.id)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[.02] text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-3 py-3 text-left">Category</th>
                  <th className="px-3 py-3 text-left">Description</th>
                  <th className="px-3 py-3 text-left">Paid to / Received from</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {monthEntries.map((e) => (
                  <tr key={e.id} className="border-t border-white/5 text-slate-300">
                    <td className="px-5 py-3 text-slate-400">{formatDate(e.date)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${ENTRY_TYPE_STYLE[e.entry_type]}`}>{e.entry_type}</span>
                      {categoryById(e.category_id) && <div className="mt-1 text-[11px] text-slate-500">{categoryById(e.category_id).name}</div>}
                    </td>
                    <td className="px-3 py-3 text-white">{e.description}{e.notes && <div className="text-[11px] text-slate-500">{e.notes}</div>}</td>
                    <td className="px-3 py-3 text-slate-400">{e.paid_party || '—'}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${e.entry_type === 'expense' ? 'text-rose-300' : 'text-emerald-300'}`}>{e.entry_type === 'expense' ? '−' : '+'}{money(e.amount)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => onEditEntry(e)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"><Pencil size={14} /></button>
                        <button onClick={() => onDeleteEntry(e)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
