'use client'

import { Coins, CreditCard, GraduationCap, Heart, Landmark, TrendingUp, Users, Wallet, X } from 'lucide-react'
import { BottomSheet } from '@/components/shared/BottomSheet'
import { ToggleSwitch } from '@/components/shared/ToggleSwitch'
import { useIsMobile } from '@/hooks/use-mobile'
import { liveOutstanding, money } from '@/lib/format'
import { perspectiveType } from '@/lib/lendBorrowSharing'
import { profileTotals } from '@/lib/moneyProfiles'
import { scholarshipDisplayStatus } from '@/lib/scholarships'
import { currentValueOf } from '@/lib/otherInvestments'

function Row({ icon: Icon, name, sub, amount, checked, disabled, caption, onToggle }) {
  return (
    <div className="rounded-xl bg-black/20 light:bg-black/[.06] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Icon size={14} className="shrink-0 text-slate-500" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-white light:text-slate-900">{name}</div>
          {sub && <div className="truncate text-[11px] text-slate-500">{sub}</div>}
        </div>
        <span className="shrink-0 text-xs text-slate-500">{money(amount)}</span>
        <ToggleSwitch checked={checked} disabled={disabled} onChange={onToggle} />
      </div>
      {caption && <div className="mt-1.5 pl-[26px] text-[11px] text-slate-500">{caption}</div>}
    </div>
  )
}

function Section({ title, rows, emptyMessage }) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">{title}</div>
      {rows.length === 0 ? (
        <div className="rounded-xl bg-black/10 light:bg-black/[.03] px-3 py-4 text-center text-xs text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="space-y-2">{rows}</div>
      )}
    </div>
  )
}

function NetWorthCustomizeBody({ data, onToggleIncludeInNetWorth }) {
  const {
    accounts = [], portfolios = [], holdings = [], sips = [], other_investments: otherInvestments = [],
    loans = [], loan_payments = [], credit_cards = [], lend_borrow = [], chit_funds = [], chit_fund_payments = [],
    money_profiles = [], money_profile_entries = [], scholarships = [],
  } = data

  const outstandingOf = (loan) => liveOutstanding(loan, loan_payments.filter((p) => p.loan_id === loan.id))

  return (
    <div className="space-y-5">
      <Section title="Accounts" emptyMessage="No accounts yet" rows={
        accounts.filter((a) => a.type !== 'debit_card').map((a) => (
          <Row key={a.id} icon={a.type === 'cash' ? Wallet : Landmark} name={a.name} sub={a.type.replace('_', ' ')} amount={Number(a.current_balance || 0)}
            checked={a.include_in_net_worth !== false} onToggle={() => onToggleIncludeInNetWorth('accounts', a)} />
        ))
      } />

      <Section title="Investments" emptyMessage="No portfolios yet" rows={
        portfolios.map((p) => {
          const value = holdings.filter((h) => h.portfolio_id === p.id).reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
            + sips.filter((x) => x.portfolio_id === p.id).reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
            + otherInvestments.filter((o) => o.portfolio_id === p.id).reduce((s, o) => s + currentValueOf(o), 0)
            + Number(p.cash_balance || 0)
          return (
            <Row key={p.id} icon={TrendingUp} name={p.name} sub="Portfolio" amount={value}
              checked={p.include_in_net_worth !== false} onToggle={() => onToggleIncludeInNetWorth('portfolios', p)} />
          )
        })
      } />

      <Section title="Loans" emptyMessage="No loans" rows={
        loans.filter((l) => l.status !== 'closed').map((l) => (
          <Row key={l.id} icon={Landmark} name={l.name} sub={l.lender || 'Loan'} amount={outstandingOf(l)}
            checked={l.include_in_net_worth !== false} onToggle={() => onToggleIncludeInNetWorth('loans', l)} />
        ))
      } />

      <Section title="Credit cards" emptyMessage="No credit cards" rows={
        credit_cards.map((c) => (
          <Row key={c.id} icon={CreditCard} name={c.name} sub="Credit card" amount={Number(c.current_outstanding || 0)}
            checked={c.include_in_net_worth !== false} onToggle={() => onToggleIncludeInNetWorth('credit_cards', c)} />
        ))
      } />

      <Section title="Lend / Borrow" emptyMessage="Nothing lent or borrowed" rows={
        lend_borrow.map((l) => {
          const outstanding = Math.max(0, Number(l.amount) - Number(l.amount_repaid || 0))
          const type = perspectiveType(l)
          return (
            <Row key={l.id} icon={Heart} name={l.person_name} sub={type === 'lent' ? 'Lent out' : 'Borrowed'} amount={outstanding}
              checked={l.include_in_net_worth !== false} onToggle={() => onToggleIncludeInNetWorth('lend_borrow', l)} />
          )
        })
      } />

      <Section title="Chit funds" emptyMessage="No active chit funds" rows={
        chit_funds.filter((c) => c.status !== 'completed').map((c) => {
          const payments = chit_fund_payments.filter((p) => p.chit_fund_id === c.id)
          const netPaid = payments.reduce((s, p) => s + Number(p.amount) - Number(p.dividend_received || 0), 0)
          const amount = c.payout_status === 'taken'
            ? Math.max(0, Number(c.duration_months) - payments.length) * Number(c.monthly_contribution)
            : netPaid
          return (
            <Row key={c.id} icon={Coins} name={c.name} sub={c.payout_status === 'taken' ? 'Remaining dues' : 'Contributions'} amount={amount}
              checked={c.include_in_net_worth !== false} onToggle={() => onToggleIncludeInNetWorth('chit_funds', c)} />
          )
        })
      } />

      <Section title="Family & Company" emptyMessage="No profiles yet" rows={
        money_profiles.map((p) => {
          const linked = !!p.linked_account_id
          const ownEntries = money_profile_entries.filter((e) => e.profile_id === p.id && !e.account_id && !e.credit_card_id)
          const bal = profileTotals(p, ownEntries).balance
          return (
            <Row key={p.id} icon={Users} name={p.name} sub={p.profile_type === 'company' ? 'Company' : p.profile_type === 'family' ? 'Family' : 'Other'} amount={Math.abs(bal)}
              checked={linked ? true : p.include_in_net_worth !== false} disabled={linked}
              caption={linked ? 'Counted via its linked account — toggle that instead.' : null}
              onToggle={() => onToggleIncludeInNetWorth('money_profiles', p)} />
          )
        })
      } />

      <Section title="Scholarships" emptyMessage="No scholarships yet" rows={
        scholarships.map((s) => {
          const mirrored = !!s.received_to_account_id
          const pending = scholarshipDisplayStatus(s) === 'pending'
          const disabled = mirrored || pending
          const amount = Math.max(0, Number(s.total_amount || 0) - Number(s.amount_paid_to_college || 0))
          return (
            <Row key={s.id} icon={GraduationCap} name={s.name} sub="Scholarship" amount={amount}
              checked={disabled ? true : s.include_in_net_worth !== false} disabled={disabled}
              caption={mirrored ? 'Already reflected via its linked account.' : pending ? 'Still pending — nothing to include yet.' : null}
              onToggle={() => onToggleIncludeInNetWorth('scholarships', s)} />
          )
        })
      } />
    </div>
  )
}

// Follows ManageAccessSheet.jsx's exact BottomSheet-on-mobile / centered-modal-on-desktop pattern.
// One immediate PATCH per toggle (onToggleIncludeInNetWorth, defined in app/page.js) — no batch
// "Save" step, same UX as Settings > Accounts' visibility toggle.
export function NetWorthCustomizeSheet({ open, onClose, data, onToggleIncludeInNetWorth }) {
  const isMobile = useIsMobile()
  if (!open) return null

  const body = <NetWorthCustomizeBody data={data} onToggleIncludeInNetWorth={onToggleIncludeInNetWorth} />

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v) onClose() }} title="Customize net worth">
        {body}
      </BottomSheet>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white light:text-slate-900">Customize net worth</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 light:text-slate-500 hover:bg-white/5"><X size={18} /></button>
        </div>
        <div className="mt-5">{body}</div>
      </div>
    </div>
  )
}
