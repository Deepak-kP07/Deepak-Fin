'use client'

import { useState } from 'react'
import { Eye, EyeOff, Landmark, Plus } from 'lucide-react'
import { liveOutstanding, money } from '@/lib/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoanDetailView } from '@/features/loans/LoanDetailView'

export function LoansView({ data, onAdd, onEdit, onDelete, onPay, onDeletePayment, onSync, showMoney, onToggleMoney }) {
  const { loans, loan_payments, accounts } = data
  const [selectedLoanId, setSelectedLoanId] = useState(null)
  const selectedLoan = loans.find((l) => l.id === selectedLoanId)

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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70">Debt clarity</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Loans</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-300 to-blue-500 px-4 py-2.5 text-sm font-semibold text-[#07101c] sm:flex-none"><Plus size={15} />Add loan</button>
          <button onClick={onToggleMoney} className="rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5" title={showMoney ? 'Hide amounts' : 'Show amounts'}>
            {showMoney ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </div>

      {loans.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Total outstanding</div>
          <div className="mt-1 text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-white">
            {showMoney ? money(totalOutstanding) : '••••••••'}
          </div>
          <div className="mt-1 text-sm text-slate-500">{openLoans.length} active loan{openLoans.length === 1 ? '' : 's'}</div>
          {totalEmi > 0 && (
            <div className="mt-5 rounded-2xl bg-white/[.04] p-3.5">
              <div className="text-xs text-slate-400">Combined EMI / month</div>
              <div className="mt-1 text-lg font-semibold text-white">{showMoney ? money(totalEmi) : '••••'}</div>
            </div>
          )}
        </div>
      )}

      {loans.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.035]">
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
              <div key={loan.id} className="rounded-2xl border border-white/10 bg-white/[.035]">
                <div role="button" tabIndex={0} onClick={() => setSelectedLoanId(loan.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedLoanId(loan.id)} className="grid w-full cursor-pointer gap-5 px-5 py-5 text-left transition hover:bg-white/[.02] sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-semibold text-white">{loan.name}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${loan.status === 'closed' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-accent-400/15 text-accent-200'}`}>{loan.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{loan.lender || 'Lender'} · EMI {money(loan.emi_amount)} · {loan.interest_rate}% p.a. · {loan.tenure_months} mo</div>
                    {account && <div className="mt-1 text-[11px] text-slate-500">Paying from {account.name}</div>}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Outstanding</div>
                    <div className="text-xl font-semibold text-white">{showMoney ? money(todaysOutstanding) : '••••'}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${cleared}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-300">{cleared}% cleared</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total paid</div>
                    <div className="text-xl font-semibold text-white">{showMoney ? money(totalPaid) : '••••'}</div>
                    {Number(loan.interest_saved || 0) > 0 && <div className="mt-2 text-[11px] text-emerald-300">Interest saved {money(loan.interest_saved)}</div>}
                  </div>
                  <div className="flex items-center self-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); onPay(loan) }} disabled={loan.status === 'closed'} className="rounded-lg bg-gradient-to-r from-accent-300 to-blue-500 px-3 py-2 text-xs font-semibold text-[#07101c] disabled:opacity-50">Log payment</button>
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
