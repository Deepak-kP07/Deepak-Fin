'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronDown, ChevronRight, Clock, Eye, EyeOff,
  Landmark, Pencil, RefreshCw, Sparkles, Target, Trash2,
} from 'lucide-react'
import { nextLoanDueDate, projectSchedule } from '@/lib/amortization'
import { formatDate, liveOutstanding, money, monthAbbr, ordinal, paymentTypeLabel, todayISO } from '@/lib/format'
import { StatCard } from '@/components/shared/StatCard'
import { DismissibleBanner } from '@/components/shared/DismissibleBanner'

export function LoanDetailView({ loan, payments, accounts, onBack, onPay, onDeletePayment, onEdit, onDelete, onSync, showMoney, onToggleMoney }) {
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncValue, setSyncValue] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const principal = Number(loan.principal || 0)
  const outstanding = Number(loan.outstanding || 0)
  const emi = Number(loan.emi_amount || 0)
  const rate = Number(loan.interest_rate || 0)
  const account = accounts.find((a) => a.id === loan.paid_from_account_id)
  const cleared = principal > 0 ? Math.max(0, Math.min(100, Math.round(((principal - outstanding) / principal) * 100))) : 0
  const outstandingExceedsPrincipal = outstanding > principal
  const todaysOutstanding = useMemo(() => liveOutstanding(loan, payments), [loan, payments])
  const accruedSinceLastPayment = Math.max(0, todaysOutstanding - outstanding)
  // "EMIs paid" counts installments actually fully settled — an amount that covered the EMI
  // in force at the time — regardless of which button (EMI/Prepayment) was tapped to log it.
  // The type field is just a label now; both compute identically since the unified calc.
  const emisPaid = payments.filter((p) => p.type !== 'adjustment' && Number(p.amount) >= Number(p.emi_before || 0) - 0.01).length

  // Anchor the projection at the actual next EMI due date (not just "today") so the real
  // day-count for the first projected month is accurate.
  const nextDueDate = useMemo(() => nextLoanDueDate(loan) || todayISO(), [loan.emi_due_day])

  const schedule = useMemo(() => loan.status === 'closed' ? [] : projectSchedule({ outstanding, annualRatePct: rate, emiAmount: emi, startDate: nextDueDate }), [outstanding, rate, emi, loan.status, nextDueDate])
  const monthsRemaining = schedule.length
  const totalInterestPaid = payments.reduce((s, p) => s + Number(p.interest_portion || 0), 0)
  const payoffDate = loan.status !== 'closed' && monthsRemaining > 0 ? (() => { const d = new Date(); d.setMonth(d.getMonth() + monthsRemaining); return d.toISOString().slice(0, 10) })() : null

  // Every one of the originally-sanctioned months, marked paid / still to go / no-longer-needed
  // — the last group only exists because a reduce-tenure prepayment shortened the loan, and
  // showing it grayed out is purely a visual "this is what you don't have to pay anymore" cue.
  const emiCalendar = useMemo(() => {
    const totalOriginal = Number(loan.tenure_months || 0)
    if (totalOriginal <= 0 || !loan.start_date) return []
    const day = loan.emi_due_day ? Number(loan.emi_due_day) : new Date(`${loan.start_date}T00:00:00`).getDate()
    const totalNow = emisPaid + monthsRemaining
    const cursor = new Date(`${loan.start_date}T00:00:00`)
    cursor.setDate(1)
    cursor.setMonth(cursor.getMonth() + 1)
    const months = []
    for (let i = 0; i < totalOriginal; i++) {
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, daysInMonth))
      months.push({ date, status: i < emisPaid ? 'paid' : i < totalNow ? 'upcoming' : 'saved' })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return months
  }, [loan.tenure_months, loan.start_date, loan.emi_due_day, emisPaid, monthsRemaining])
  const monthsSaved = emiCalendar.length - emisPaid - monthsRemaining
  const emiCalendarByYear = useMemo(() => {
    const groups = {}
    emiCalendar.forEach((m) => {
      const y = m.date.getFullYear()
      if (!groups[y]) groups[y] = []
      groups[y].push(m)
    })
    return groups
  }, [emiCalendar])

  // Payments are often made a few days (or weeks) before the 1st-of-month due date, so the
  // calendar month a payment happened in isn't the EMI cycle it actually settles — walk
  // payments oldest-first and assign each one that fully covers an installment to the next
  // unclaimed due date from the EMI calendar. The same walk also flags payments that land on
  // the exact same date as the real payment right before them — mirrors the backend's rule
  // that a same-day repeat can't be settling "a new EMI" (no time passed for one to come due),
  // so the whole amount is genuine prepayment, not just whatever's above the EMI threshold.
  const { paymentCycleDates, freshCyclePayments } = useMemo(() => {
    const chrono = [...payments].filter((p) => p.type !== 'adjustment').sort((a, b) => a.payment_date === b.payment_date ? new Date(a.created_at) - new Date(b.created_at) : new Date(a.payment_date) - new Date(b.payment_date))
    const dateMap = new Map()
    const freshSet = new Set()
    let cursor = 0
    chrono.forEach((p, i) => {
      const prev = chrono[i - 1]
      if (!(prev && prev.payment_date === p.payment_date)) freshSet.add(p.id)
      if (Number(p.amount) >= Number(p.emi_before || 0) - 0.01 && emiCalendar[cursor]) {
        dateMap.set(p.id, emiCalendar[cursor].date)
        cursor++
      }
    })
    return { paymentCycleDates: dateMap, freshCyclePayments: freshSet }
  }, [payments, emiCalendar])

  // Every payment that carries a prepay_mode had SOME extra beyond the regular EMI — only the
  // part above that payment's EMI-at-the-time (emi_before) counts as the prepaid extra, unless
  // it's a same-day repeat (see above), in which case the whole amount is extra.
  const prepaymentEvents = payments
    .filter((p) => p.prepay_mode)
    .map((p) => ({ ...p, extra: freshCyclePayments.has(p.id) ? Math.max(0, Number(p.amount) - Number(p.emi_before || 0)) : Number(p.amount) }))
  const totalExtraPrepaid = prepaymentEvents.reduce((s, p) => s + p.extra, 0)

  const paymentRowLabel = (p) => {
    if (p.type === 'adjustment') return 'Synced with lender'
    const cycleDate = paymentCycleDates.get(p.id)
    if (!cycleDate) return paymentTypeLabel(p)
    const modeSuffix = p.prepay_mode ? ` · ${p.prepay_mode === 'reduce_emi' ? 'Reduce EMI' : 'Reduce tenure'}` : ''
    return `${monthAbbr(cycleDate.toISOString().slice(0, 10))} EMI${p.prepay_mode ? ` + prepayment${modeSuffix}` : ''}`
  }

  const emiDue = (() => {
    if (!loan.emi_due_day || loan.status === 'closed') return null
    const now = new Date(); const day = Number(loan.emi_due_day)
    let due = new Date(now.getFullYear(), now.getMonth(), day)
    if (now > due) due = new Date(now.getFullYear(), now.getMonth() + 1, day)
    const days = Math.ceil((due - now) / 86400000)
    return { days }
  })()

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ChevronRight size={14} className="rotate-180" /> Back to loans</button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">{loan.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${loan.status === 'closed' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-accent-400/15 text-accent-200'}`}>{loan.status}</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">{loan.lender || 'Lender'}{account ? ` · Paying from ${account.name}` : ''}</div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button onClick={() => onPay(loan)} disabled={loan.status === 'closed'} className="rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c] disabled:opacity-50">Log payment</button>
          <button onClick={() => setSyncOpen((o) => !o)} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${syncOpen ? 'border-accent-300/40 bg-accent-400/10 text-accent-200' : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'}`}><RefreshCw size={15} /><span className="hidden sm:inline">Sync</span></button>
          <button onClick={() => onEdit(loan)} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil size={15} /></button>
          <button onClick={() => onDelete(loan)} className="rounded-xl border border-white/10 p-2.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={15} /></button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {syncOpen && (
        <div className="rounded-xl border border-accent-300/20 bg-accent-400/[.03] p-4">
          <div className="text-sm text-slate-300">Sync with your lender's app</div>
          <div className="mt-1 text-[11px] text-slate-500">The Outstanding figure above already includes today's not-yet-billed interest, same as your lender's app. If there's still a small gap after that — rounding, an unmodeled fee — enter your lender's figure here to close it, without logging it as a payment.</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input type="number" step="0.01" min="0" value={syncValue} onChange={(e) => setSyncValue(e.target.value)} placeholder={String(Math.round(todaysOutstanding))} className="w-40 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm text-white outline-none focus:border-accent-300/50" />
            <button
              type="button"
              disabled={syncBusy || !syncValue}
              onClick={async () => {
                setSyncBusy(true)
                await onSync(loan, Number(syncValue))
                setSyncBusy(false); setSyncOpen(false); setSyncValue('')
              }}
              className="rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 px-4 py-2 text-sm font-semibold text-[#07101c] disabled:opacity-50"
            >{syncBusy ? 'Syncing…' : 'Sync'}</button>
            {syncValue && (
              <span className="text-[11px] text-slate-500">
                {Number(syncValue) < todaysOutstanding ? `${money(todaysOutstanding - Number(syncValue))} lower than tracked` : Number(syncValue) > todaysOutstanding ? `${money(Number(syncValue) - todaysOutstanding)} higher — likely fees/charges` : 'Matches already'}
              </span>
            )}
          </div>
        </div>
      )}

      {emiDue && (
        <DismissibleBanner tone={emiDue.days <= 3 ? 'amber' : 'slate'}>
          Next EMI due on the {ordinal(loan.emi_due_day)} · {emiDue.days > 0 ? `in ${emiDue.days} day${emiDue.days === 1 ? '' : 's'}` : emiDue.days === 0 ? 'today' : 'overdue'}
        </DismissibleBanner>
      )}

      {outstandingExceedsPrincipal && (
        <DismissibleBanner tone="amber">
          Outstanding ({money(outstanding)}) is higher than Principal ({money(principal)}) — that shouldn't happen. Double-check the Principal amount by editing this loan.
        </DismissibleBanner>
      )}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Outstanding" value={showMoney ? money(todaysOutstanding) : '••••'} icon={Landmark} accent="bg-rose-400/15 text-rose-200" tone="text-rose-300" sub={<span>{cleared}% cleared{accruedSinceLastPayment > 0.5 ? ` · +${money(accruedSinceLastPayment)} accrued today` : ''}</span>} />
        <StatCard label="EMI" value={showMoney ? money(emi) : '••••'} icon={RefreshCw} accent="bg-accent-300/15 text-accent-200" sub={<span>{rate}% p.a.</span>} />
        <StatCard label="EMIs paid" value={String(emisPaid)} icon={Target} accent="bg-violet-400/15 text-violet-200" sub={<span>of ~{loan.status === 'closed' ? emisPaid : emisPaid + monthsRemaining} total</span>} />
        <StatCard label="EMIs remaining" value={loan.status === 'closed' ? '0' : String(monthsRemaining)} icon={Target} accent="bg-emerald-400/15 text-emerald-200" sub={<span>{payoffDate ? `payoff ~${formatDate(payoffDate)}` : 'Paid off'}</span>} />
        <StatCard label="Interest paid" value={showMoney ? money(totalInterestPaid) : '••••'} icon={ArrowDownRight} accent="bg-amber-400/15 text-amber-200" tone="text-amber-300" sub={<span>so far</span>} />
        <StatCard label="Interest saved" value={showMoney ? money(loan.interest_saved || 0) : '••••'} icon={ArrowUpRight} accent="bg-emerald-400/15 text-emerald-200" sub={<span>from prepayments</span>} />
      </div>

      {prepaymentEvents.length > 0 && (
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.03]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
            <div className="text-xs uppercase tracking-widest text-slate-500">Prepayments · {prepaymentEvents.length}</div>
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-white">{showMoney ? money(totalExtraPrepaid) : '••••'}</span> extra paid · <span className="font-semibold text-emerald-300">{showMoney ? money(loan.interest_saved || 0) : '••••'}</span> saved
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {prepaymentEvents.map((p) => (
              <div key={p.id} className="grid grid-cols-1 items-center gap-1.5 px-5 py-3 text-sm sm:grid-cols-[1.2fr_1fr_1fr] sm:gap-3 sm:gap-y-0">
                <div className="text-slate-300">{formatDate(p.payment_date)}<span className="ml-1 text-[11px] text-slate-500">{p.extra < Number(p.amount) - 0.01 ? '· on top of EMI' : '· standalone'}</span></div>
                <div className="font-medium text-white">{showMoney ? `+${money(p.extra)}` : '••••'} extra</div>
                <div className="text-emerald-300 sm:text-right">{showMoney ? money(p.interest_saved || 0) : '••••'} saved</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[.035]">
        <div className="border-b border-white/10 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Payment history · {payments.length}</div>
        {payments.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No payments logged yet.</div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] gap-4 border-b border-white/10 px-5 py-2.5 text-[10px] uppercase tracking-widest text-slate-600 sm:grid">
              <span>Payment</span>
              <span>Type</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
              {payments.map((p) => {
                const acc = accounts.find((a) => a.id === p.account_id)
                const typeLabel = p.type === 'adjustment' ? 'Synced' : p.prepay_mode ? (p.prepay_mode === 'reduce_emi' ? 'Reduce EMI' : 'Reduce tenure') : p.type === 'emi' ? 'EMI' : 'Prepayment'
                return (
                  <div key={p.id} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1.4fr_.9fr_.6fr_.6fr_auto] sm:items-center sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] text-accent-200">
                        {p.type === 'adjustment' ? <RefreshCw size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{paymentRowLabel(p)}</div>
                        {acc && <div className="text-[11px] text-slate-500">{acc.name}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      <span className="inline-block rounded-md bg-white/[.05] px-2 py-0.5 text-accent-200">{typeLabel}</span>
                    </div>
                    <div className="text-xs text-slate-500">paid {formatDate(p.payment_date)}</div>
                    <div className="text-sm font-semibold text-white sm:text-right">{showMoney ? money(p.amount) : '••••'}</div>
                    <div className="flex justify-end">
                      <button onClick={() => onDeletePayment(p)} className="rounded-lg p-1.5 text-rose-300/70 hover:bg-rose-300/10"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {emiCalendar.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
          <button type="button" onClick={() => setScheduleOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-3 text-xs uppercase tracking-widest text-slate-500 hover:text-slate-300">
            <span>EMI calendar · {emisPaid} paid, {monthsRemaining} to go{monthsSaved > 0 ? `, ${monthsSaved} saved` : ''} of {emiCalendar.length} original</span>
            <ChevronDown size={14} className={`transition-transform ${scheduleOpen ? 'rotate-180' : ''}`} />
          </button>
          {scheduleOpen && (
            <div className="max-h-[28rem] overflow-y-auto border-t border-white/10">
              {Object.entries(emiCalendarByYear).map(([year, months]) => (
                <div key={year}>
                  <div className="sticky top-0 border-b border-white/5 bg-[#161d2c] px-5 py-2 text-xs font-semibold text-accent-200/80">{year}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-3">
                    {months.map((m) => (
                      <div key={m.date.toISOString()} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${m.status === 'saved' ? 'text-slate-600' : 'text-slate-300'}`}>
                        {m.status === 'paid' && <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />}
                        {m.status === 'upcoming' && <Clock size={14} className="shrink-0 text-slate-500" />}
                        {m.status === 'saved' && <Sparkles size={14} className="shrink-0 text-slate-700" />}
                        <span className={m.status === 'saved' ? 'line-through decoration-slate-700' : ''}>{formatDate(m.date.toISOString().slice(0, 10))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {monthsSaved > 0 && (
                <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-xs text-emerald-300">
                  <Sparkles size={13} />{monthsSaved} month{monthsSaved === 1 ? '' : 's'} saved off the original schedule thanks to your prepayments.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
