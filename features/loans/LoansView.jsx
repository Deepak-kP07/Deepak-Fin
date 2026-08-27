'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Landmark, Plus } from 'lucide-react'
import { liveOutstanding, money } from '@/lib/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { HeroStatTile } from '@/components/shared/HeroStatTile'
import { LoanDetailView } from '@/features/loans/LoanDetailView'

export function LoansView({ data, onAdd, onEdit, onDelete, onPay, onDeletePayment, onSync, showMoney, onToggleMoney, onDetailChange }) {
  const { loans, loan_payments, accounts } = data
  const [selectedLoanId, setSelectedLoanId] = useState(null)
  const selectedLoan = loans.find((l) => l.id === selectedLoanId)
  useEffect(() => { onDetailChange?.(selectedLoanId) }, [selectedLoanId])

  if (selectedLoan) {
    return (
      <LoanDetailView
        loan={selectedLoan}
        payments={loan_payments.filter((p) => p.loan_id === selectedLoan.id)}
        accounts={accounts}
        onBack={() => setSelectedLoanId(null)}
        onPay={onPay}
        onDeletePayment={onDeletePayment}
        onEdit={onEdit}
        onDelete={(l) => { onDelete(l); setSelectedLoanId(null) }}
        onSync={onSync}
        showMoney={showMoney}
        onToggleMoney={onToggleMoney}
      />
    )
  }

  const openLoans = loans.filter((l) => l.status !== 'closed')
  const totalOutstanding = openLoans.reduce((s, l) => s + liveOutstanding(l, loan_payments.filter((p) => p.loan_id === l.id)), 0)
  const totalEmi = openLoans.reduce((s, l) => s + Number(l.emi_amount || 0), 0)
  const totalPaidAll = loans.reduce((s, l) => s + loan_payments.filter((p) => p.loan_id === l.id).reduce((s2, p) => s2 + Number(p.amount || 0), 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">Debt clarity</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Loans</h1>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onAdd} className="hidden items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-accent-600 px-4 py-2.5 text-sm font-semibold text-[#07101c] lg:flex"><Plus size={15} /><span className="sm:hidden">Add</span><span className="hidden sm:inline">Add loan</span></button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {loans.length > 0 && (
        <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Total outstanding</div>
          <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white light:text-slate-900">
            {showMoney ? money(totalOutstanding) : '••••••••'}
          </div>
          <div className="mt-1 text-sm text-slate-500">{openLoans.length} active loan{openLoans.length === 1 ? '' : 's'}</div>
          {(totalEmi > 0 || totalPaidAll > 0) && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <HeroStatTile label="Combined EMI / month" value={showMoney ? money(totalEmi) : '••••'} />
              <HeroStatTile label="Total paid so far" value={showMoney ? money(totalPaidAll) : '••••'} valueTone="text-emerald-300 light:text-emerald-700" />
            </div>
          )}
        </div>
      )}

      {loans.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={Landmark} title="No loans yet" message="Log home, car or personal loans and track EMIs + prepayments." cta="Add loan" onCta={onAdd} />
        </div>
      ) : (
        <div className="space-y-6">
          {loans.map((loan) => {
            const payments = loan_payments.filter((p) => p.loan_id === loan.id)
            const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
            const principal = Number(loan.principal || 0)
            const outstanding = Number(loan.outstanding || 0)
            const todaysOutstanding = liveOutstanding(loan, payments)
            const cleared = principal > 0 ? Math.max(0, Math.min(100, Math.round(((principal - outstanding) / principal) * 100))) : 0
            const account = accounts.find((a) => a.id === loan.paid_from_account_id)
            return (
              <div key={loan.id} className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
                {/* Deliberately stays one loan per row on desktop (not a card grid) — a loan
                    carries 4 substantial fields (name+status, outstanding+progress bar, total
                    paid, action) that read better as a wide row than a cramped card. The row
                    already stretches to the container's full width structurally; what it lacked
                    at lg:+ was visual weight to match — bigger figures and more breathing room,
                    not more columns. The extra gap/padding is held to xl:, not lg: — at exactly
                    1024px there isn't enough spare width for both bigger gaps AND bigger text
                    without the name column wrapping (found via critique on real 2-word names,
                    not just a stress-test string) — xl: (1280px) is where there's room for both. */}
                <div role="button" tabIndex={0} onClick={() => setSelectedLoanId(loan.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedLoanId(loan.id)} className="grid w-full cursor-pointer gap-5 px-5 py-5 text-left transition hover:bg-white/[.02] hover:light:bg-black/[.02] sm:grid-cols-[1.4fr_1fr_1fr_auto] xl:gap-8 xl:px-8 xl:py-6">
                  <div>
                    <div className="flex items-start gap-2">
                      <div className="text-base font-semibold text-white light:text-slate-900 lg:text-lg">{loan.name}</div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${loan.status === 'closed' ? 'bg-emerald-400/15 text-emerald-200 light:text-emerald-700' : 'bg-accent-400/15 text-accent-200 light:text-accent-700'}`}>{loan.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{loan.lender || 'Lender'} · EMI {money(loan.emi_amount)} · {loan.interest_rate}% p.a. · {loan.tenure_months} mo</div>
                    {account && <div className="mt-1 text-[11px] text-slate-500">Paying from {account.name}</div>}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Outstanding</div>
                    <div className="text-xl font-semibold text-white light:text-slate-900 lg:text-2xl">{showMoney ? money(todaysOutstanding) : '••••'}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5 lg:h-2">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${cleared}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-300 light:text-emerald-700">{cleared}% cleared</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total paid</div>
                    <div className="text-xl font-semibold text-white light:text-slate-900 lg:text-2xl">{showMoney ? money(totalPaid) : '••••'}</div>
                    {Number(loan.interest_saved || 0) > 0 && <div className="mt-2 text-[11px] text-emerald-300 light:text-emerald-700">Interest saved {money(loan.interest_saved)}</div>}
                  </div>
                  <div className="flex items-center self-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); onPay(loan) }} disabled={loan.status === 'closed'} className="rounded-lg bg-gradient-to-r from-accent-300 to-accent-600 px-3 py-2 text-xs font-semibold text-[#07101c] disabled:opacity-50 xl:px-4 xl:py-2.5 xl:text-sm">Log payment</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
