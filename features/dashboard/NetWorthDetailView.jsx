'use client'

import { ChevronRight, CreditCard, Landmark, TrendingUp, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { money } from '@/lib/format'

// One labeled group of financial line items (Cash & bank / Investments / Loans / Credit cards) —
// same icon-box + name/sub + right-aligned amount row already used for the Dashboard's Balances
// panel (app/page.js), so this reads as the same visual language, not a new one invented here.
function ItemSection({ title, subtotal, items, showMoney, caption, emptyIcon: EmptyIcon, emptyTitle, emptyMessage, emptyCta, onEmptyCta }) {
  return (
    <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3">
        <div className="text-xs uppercase tracking-widest text-slate-500">{title}</div>
        <div className="text-sm font-semibold text-white light:text-slate-900">{showMoney ? money(subtotal) : '••••'}</div>
      </div>
      {caption && <div className="px-5 pt-3 text-[11px] text-slate-500">{caption}</div>}
      {items.length === 0 ? (
        <EmptyState compact icon={EmptyIcon} title={emptyTitle} message={emptyMessage} cta={emptyCta} onCta={onEmptyCta} />
      ) : (
        <div className="space-y-2 p-4">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-xl border border-white/5 light:border-black/5 bg-white/[.07] light:bg-black/[.07] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${it.color}22`, color: it.color }}>
                  <it.icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white light:text-slate-900">{it.name}</div>
                  <div className="truncate text-[11px] capitalize text-slate-400 light:text-slate-500">{it.sub}</div>
                </div>
              </div>
              <div className={`shrink-0 text-sm font-semibold ${it.debt ? 'text-rose-300 light:text-rose-700' : 'text-white light:text-slate-900'}`}>{showMoney ? `${it.debt ? '−' : ''}${money(it.amount).replace('-', '')}` : '••••'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function NetWorthDetailView({
  onBack, showMoney, setView,
  netWorth, totalAssets, totalLiabilities,
  totalBalance, currentInv, totalOutstanding, creditCardDebt,
  cashBankItems, investmentItems, loanItems, creditCardItems,
  investmentsModuleEnabled, creditCardsModuleEnabled,
}) {
  const nothingTracked = totalAssets === 0 && totalLiabilities === 0
  const nwScale = Math.max(totalAssets, totalLiabilities, 1)
  const nwPct = (v) => `${Math.max(0, (Number(v) / nwScale) * 100)}%`

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900"><ChevronRight size={14} className="rotate-180" /> Back to dashboard</button>

      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700">How it's calculated</div>
        <h1 className="text-3xl font-semibold tracking-tight text-white light:text-slate-900">Net worth</h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className={`text-[clamp(2rem,6vw,3rem)] font-semibold leading-[1.1] tracking-[-0.01em] ${netWorth < 0 ? 'text-rose-200 light:text-rose-700' : 'text-white light:text-slate-900'}`}>
            {showMoney ? `${netWorth < 0 ? '−' : ''}${money(netWorth).replace('-', '')}` : '••••••••'}
          </div>
          {netWorth < 0 && (
            <span className="rounded-full border border-rose-300/30 bg-rose-300/5 px-2 py-0.5 text-[11px] font-semibold text-rose-200 light:text-rose-700">Net negative</span>
          )}
        </div>
      </div>

      {nothingTracked ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={Landmark} title="Nothing tracked yet" message="Add an account, loan, card, or investment to see your net worth calculation." cta="Add an account" onCta={() => setView('accounts')} />
        </div>
      ) : (
        <>
          {/* The formula, spelled out with real numbers — the direct answer to "how is this calculated." */}
          <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4 sm:text-center">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Assets</div>
                <div className="text-xl font-semibold text-white light:text-slate-900">{showMoney ? money(totalAssets) : '••••'}</div>
              </div>
              <div className="text-lg text-slate-500">−</div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Liabilities</div>
                <div className="text-xl font-semibold text-white light:text-slate-900">{showMoney ? money(totalLiabilities) : '••••'}</div>
              </div>
              <div className="text-lg text-slate-500">=</div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Net worth</div>
                <div className={`text-xl font-semibold ${netWorth < 0 ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700'}`}>{showMoney ? money(netWorth) : '••••'}</div>
              </div>
            </div>

            <div
              role="img"
              aria-label={showMoney ? `Assets ${money(totalAssets)} vs liabilities ${money(totalLiabilities)}` : 'Assets vs liabilities, amounts hidden'}
              className="mt-5 flex h-2 gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]"
            >
              <div className="bg-emerald-400" style={{ width: nwPct(totalBalance) }} />
              <div className="bg-emerald-400/50" style={{ width: nwPct(currentInv) }} />
            </div>
            <div
              role="img"
              aria-label={showMoney ? `Liabilities: loans ${money(totalOutstanding)}, credit cards ${money(creditCardDebt)}` : 'Liabilities breakdown, amounts hidden'}
              className="mt-1.5 flex h-2 gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]"
            >
              <div className="bg-rose-400" style={{ width: nwPct(totalOutstanding) }} />
              <div className="bg-rose-400/50" style={{ width: nwPct(creditCardDebt) }} />
            </div>

            <div className="mt-4 space-y-1 text-[11px] text-slate-500">
              <div>Assets = Cash &amp; bank ({showMoney ? money(totalBalance) : '••••'}) + Investments ({showMoney ? money(currentInv) : '••••'})</div>
              <div>Liabilities = Loans ({showMoney ? money(totalOutstanding) : '••••'}) + Credit cards ({showMoney ? money(creditCardDebt) : '••••'})</div>
            </div>
          </div>

          <ItemSection
            title="Cash & bank" subtotal={totalBalance} items={cashBankItems} showMoney={showMoney}
            emptyIcon={Wallet} emptyTitle="No accounts yet" emptyMessage="Add a bank account or cash to start tracking balances." emptyCta="Add account" onEmptyCta={() => setView('accounts')}
          />
          <ItemSection
            title="Investments" subtotal={currentInv} items={investmentItems} showMoney={showMoney}
            caption={!investmentsModuleEnabled && investmentItems.length > 0 ? 'Investments module is off in Settings — still counted here.' : null}
            emptyIcon={TrendingUp} emptyTitle="No investments yet" emptyMessage="Add a portfolio to start tracking investment value." emptyCta="Add investment" onEmptyCta={() => setView('investments')}
          />
          <ItemSection
            title="Loans" subtotal={totalOutstanding} items={loanItems} showMoney={showMoney}
            caption={loanItems.length > 0 ? "Includes today's accrued interest, same as the Loans page." : null}
            emptyIcon={Landmark} emptyTitle="No loans" emptyMessage="Loans you're paying off will show up here." emptyCta="Add loan" onEmptyCta={() => setView('loans')}
          />
          <ItemSection
            title="Credit cards" subtotal={creditCardDebt} items={creditCardItems} showMoney={showMoney}
            caption={!creditCardsModuleEnabled && creditCardItems.length > 0 ? 'Credit cards module is off in Settings — still counted here.' : null}
            emptyIcon={CreditCard} emptyTitle="No credit cards" emptyMessage="Cards with an outstanding balance will show up here." emptyCta="Add card" onEmptyCta={() => setView('credit_cards')}
          />
        </>
      )}
    </div>
  )
}
