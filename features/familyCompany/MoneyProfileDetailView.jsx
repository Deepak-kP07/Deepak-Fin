'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Download, Eye, EyeOff, Link2, Lock, MoreVertical, Pencil, Trash2, Unlock, UserPlus, Upload, Users, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { MonthCursor } from '@/components/shared/MonthCursor'
import { DismissibleBanner } from '@/components/shared/DismissibleBanner'
import { ENTRY_TYPE_STYLE, profileTotals, roleFor, canWriteEntries, canDeleteEntries, canEditProfile, canManageShares, canDeleteProfile } from '@/lib/moneyProfiles'
import { downloadFamilyCompanyExport } from '@/lib/exportFamilyCompany'
import { MONTH_NAMES, capitalizeFirst, formatDate, money } from '@/lib/format'

export function MoneyProfileDetailView({
  profile, entries, accounts, categories = [], onBack, onEdit, onDelete,
  onAddEntry, onEditEntry, onDeleteEntry, onBulkImport, onToggleStatus, onManageAccess,
  showMoney, onToggleMoney,
}) {
  const categoryById = (id) => categories.find((c) => c.id === id)
  const role = roleFor(profile)
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

  // Mobile entry rows have no visible edit/delete icons — a tap opens the entry for editing, a
  // 500ms long press deletes it directly (onDeleteEntry already confirms before acting), same
  // pattern as the Loans/Credit Cards/Lend-Borrow detail views.
  const longPressTimer = useRef(null)
  const longPressFired = useRef(false)
  const LONG_PRESS_MS = 500
  const cancelLongPress = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }
  const startLongPress = (e) => {
    if (!canDeleteEntries(role)) return
    longPressFired.current = false
    cancelLongPress()
    longPressTimer.current = setTimeout(() => { longPressFired.current = true; onDeleteEntry(e) }, LONG_PRESS_MS)
  }
  const handleRowTap = (e) => {
    if (longPressFired.current) { longPressFired.current = false; return }
    if (canWriteEntries(role)) onEditEntry(e)
  }

  // Mobile header: every secondary action (bulk import, export, manage access, close/reactivate,
  // edit, delete) collapses into this "..." menu at the top right instead of a second row of
  // icon buttons — desktop keeps them all inline (see the `hidden sm:contents` block below).
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  useEffect(() => {
    const onDocClick = (ev) => { if (moreRef.current && !moreRef.current.contains(ev.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  const exportThisProfile = () => downloadFamilyCompanyExport(
    { profiles: [profile], entries: monthEntries, categories },
    showAllMonths ? profile.name : `${profile.name} ${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`,
    new Date().toISOString().slice(0, 10),
  )

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900"><ChevronRight size={14} className="rotate-180" /> Back to Family / Company</button>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex items-start justify-between gap-3 sm:contents">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-400/15 text-accent-200 light:text-accent-700">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-lg font-semibold text-white light:text-slate-900">{profile.name}</div>
                {linkedAccount && <span className="flex items-center gap-1 rounded-full bg-accent-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent-200 light:text-accent-700"><Link2 size={10} />Linked</span>}
                {isClosed && <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-300 light:text-slate-700">Closed</span>}
              </div>
              <div className="text-xs capitalize text-slate-500">{profile.profile_type} · {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</div>
            </div>
          </div>

          {/* Mobile: every secondary action lives behind this "..." menu, top right — the eye
              toggle stays outside it, always visible, same as every other detail view. */}
          <div className="flex shrink-0 items-center gap-2 sm:hidden">
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <div ref={moreRef} className="relative">
            <button type="button" onClick={() => setMoreOpen((o) => !o)} className={`rounded-xl border p-2.5 transition ${moreOpen ? 'border-accent-300/40 bg-accent-400/10 text-accent-200 light:text-accent-700' : 'border-white/10 light:border-black/10 text-slate-400 light:text-slate-500 hover:bg-white/5'}`} title="More options">
              <MoreVertical size={16} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-1 shadow-2xl">
                {canWriteEntries(role) && (
                  <button type="button" disabled={isClosed} onClick={() => { setMoreOpen(false); onBulkImport(profile) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-40"><Download size={14} />Bulk import</button>
                )}
                <button type="button" disabled={monthEntries.length === 0} onClick={() => { setMoreOpen(false); exportThisProfile() }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-50"><Upload size={14} />Export</button>
                {canManageShares(role) && (
                  <button type="button" onClick={() => { setMoreOpen(false); onManageAccess(profile) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><UserPlus size={14} />Manage access</button>
                )}
                {canEditProfile(role) && (
                  <button type="button" onClick={() => { setMoreOpen(false); onToggleStatus(profile) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5">{isClosed ? <Unlock size={14} /> : <Lock size={14} />}{isClosed ? 'Reactivate profile' : 'Close profile'}</button>
                )}
                {canEditProfile(role) && (
                  <button type="button" onClick={() => { setMoreOpen(false); onEdit(profile) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 light:text-slate-700 hover:bg-white/5"><Pencil size={14} />Edit profile</button>
                )}
                {canDeleteProfile(role) && (
                  <button type="button" onClick={() => { setMoreOpen(false); onDelete(profile) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} />Delete profile</button>
                )}
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
          {canWriteEntries(role) && (
            <button onClick={() => onAddEntry(profile.id)} disabled={isClosed} title={isClosed ? 'Reactivate this profile to add entries' : undefined} className="hidden rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-40 lg:inline-block">+ Add entry</button>
          )}
          {/* Desktop: every secondary action stays inline; mobile reaches them via the "..." menu above */}
          <div className="hidden sm:contents">
            {canWriteEntries(role) && (
              <button onClick={() => onBulkImport(profile)} disabled={isClosed} title={isClosed ? 'Reactivate this profile to add entries' : undefined} className="flex items-center gap-2 rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm font-medium text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-40"><Download size={14} />Bulk import</button>
            )}
            <button
              onClick={exportThisProfile}
              disabled={monthEntries.length === 0}
              title={showAllMonths ? 'Export every entry in this profile' : `Export only ${MONTH_NAMES[monthCursor.month]} ${monthCursor.year}`}
              className="flex items-center gap-2 rounded-xl border border-white/10 light:border-black/10 px-4 py-2.5 text-sm font-medium text-slate-300 light:text-slate-700 hover:bg-white/5 disabled:opacity-50"
            ><Upload size={14} />Export</button>
            {canManageShares(role) && (
              <button onClick={() => onManageAccess(profile)} title="Manage who has access" className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><UserPlus size={15} /></button>
            )}
            {canEditProfile(role) && (
              <button onClick={() => onToggleStatus(profile)} title={isClosed ? 'Reactivate profile' : 'Close profile'} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900">
                {isClosed ? <Unlock size={15} /> : <Lock size={15} />}
              </button>
            )}
            {canEditProfile(role) && (
              <button onClick={() => onEdit(profile)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={15} /></button>
            )}
            {canDeleteProfile(role) && (
              <button onClick={() => onDelete(profile)} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={15} /></button>
            )}
            <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
              {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>
      </div>

      <DismissibleBanner id={`money-profile-linked-${profile.id}-${linkedAccount?.id || 'none'}`} tone="cyan">
        {linkedAccount ? <>Linked to <b>{linkedAccount.name}</b> — every entry here also posts as a transaction on that account and counts toward your net worth.</> : 'Not linked to a bank account — entries here stay only in this module and never affect your other totals.'}
      </DismissibleBanner>

      {isClosed && (
        <DismissibleBanner id={`money-profile-closed-${profile.id}`} tone="amber">
          This profile is closed — no new entries can be added until you reactivate it. Existing entries are still visible and editable.
        </DismissibleBanner>
      )}

      <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
        <div className="text-xs uppercase tracking-widest text-slate-500">Current balance</div>
        <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white light:text-slate-900">{showMoney ? money(balance) : '••••••'}</div>
        <div className="mt-1 text-sm text-slate-500">Opening {showMoney ? money(opening) : '••••'}</div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <HeroStatTile label="Total income" value={showMoney ? money(income) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" />
          <HeroStatTile label="Total capital" value={showMoney ? money(capital) : '••••'} valueTone="text-accent-300 light:text-accent-700" />
          <HeroStatTile label="Total expense" value={showMoney ? money(expense) : '••••'} valueTone="text-rose-300 light:text-rose-700" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3">
          <div className="text-xs uppercase tracking-widest text-slate-500">Entries · {monthEntries.length}</div>
          <MonthCursor cursor={monthCursor} onShift={shiftMonth} showAll={showAllMonths} onToggleAll={() => setShowAllMonths((v) => !v)} />
        </div>
        {monthEntries.length === 0 ? (
          <EmptyState compact icon={Wallet} title={entries.length === 0 ? 'No entries yet' : showAllMonths ? 'No entries yet' : 'No entries this month'} message="Log an income, capital, or expense entry to start tracking." cta={isClosed ? undefined : 'Add entry'} onCta={isClosed ? undefined : () => onAddEntry(profile.id)} />
        ) : (
          <>
            {/* Mobile: single compact row, date under the description — same pattern as the main
                ledger. Tap opens the entry for editing; long-press deletes (no visible icons). */}
            <div className="divide-y divide-white/5 light:divide-black/5 sm:hidden">
              {monthEntries.map((e) => {
                const cat = categoryById(e.category_id)
                const isExpense = e.entry_type === 'expense'
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => handleRowTap(e)}
                    onTouchStart={() => startLongPress(e)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                    onContextMenu={(ev) => ev.preventDefault()}
                    className="flex w-full min-w-0 items-center gap-3 px-5 py-3 text-left"
                  >
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${ENTRY_TYPE_STYLE[e.entry_type]}`}>{e.entry_type}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white light:text-slate-900">{capitalizeFirst(e.description)}</div>
                      <div className="truncate text-[11px] text-slate-500">{formatDate(e.date)}{cat ? ` · ${cat.name}` : ''}{e.paid_party ? ` · ${capitalizeFirst(e.paid_party)}` : ''}</div>
                    </div>
                    <div className={`shrink-0 text-sm font-semibold ${isExpense ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700'}`}>{showMoney ? `${isExpense ? '−' : '+'}${money(e.amount)}` : '••••'}</div>
                  </button>
                )
              })}
            </div>

            {/* Desktop: unchanged table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead className="bg-white/[.02] light:bg-black/[.02] text-[10px] uppercase tracking-widest text-slate-500">
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
                    <tr key={e.id} className="border-t border-white/5 light:border-black/5 text-slate-300 light:text-slate-700">
                      <td className="px-5 py-3 text-slate-400 light:text-slate-500">{formatDate(e.date)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${ENTRY_TYPE_STYLE[e.entry_type]}`}>{e.entry_type}</span>
                        {categoryById(e.category_id) && <div className="mt-1 text-[11px] text-slate-500">{categoryById(e.category_id).name}</div>}
                      </td>
                      <td className="px-3 py-3 text-white light:text-slate-900">{capitalizeFirst(e.description)}{e.notes && <div className="text-[11px] text-slate-500">{capitalizeFirst(e.notes)}</div>}</td>
                      <td className="px-3 py-3 text-slate-400 light:text-slate-500">{capitalizeFirst(e.paid_party) || '—'}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${e.entry_type === 'expense' ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700'}`}>{showMoney ? `${e.entry_type === 'expense' ? '−' : '+'}${money(e.amount)}` : '••••'}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          {canWriteEntries(role) && <button onClick={() => onEditEntry(e)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white hover:light:text-slate-900"><Pencil size={14} /></button>}
                          {canDeleteEntries(role) && <button onClick={() => onDeleteEntry(e)} className="rounded-lg p-1.5 text-rose-300/70 light:text-rose-700 hover:bg-rose-300/10"><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
