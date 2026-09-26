'use client'

import { ChevronRight, Coins, CreditCard, GraduationCap, Heart, Landmark, Settings, TrendingUp, Users, Wallet } from 'lucide-react'
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
  totalBalance, currentInv, totalOutstanding, creditCardDebt, lendOutstanding, borrowOutstanding, chitFundReceivable, chitFundLiability,
  moneyProfileAssetTotal, moneyProfileLiabilityTotal, scholarshipNet,
  cashBankItems, investmentItems, loanItems, creditCardItems, lendItems, borrowItems, chitFundAssetItems, chitFundLiabilityItems,
  moneyProfileItems, scholarshipItems,
  investmentsModuleEnabled, creditCardsModuleEnabled,
  onOpenCustomize,
}) {
  const nothingTracked = totalAssets === 0 && totalLiabilities === 0
  const nwScale = Math.max(totalAssets, totalLiabilities, 1)
  const nwPct = (v) => `${Math.max(0, (Number(v) / nwScale) * 100)}%`

  return (
    <div className="space-y-5 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 light:text-slate-500 hover:text-white hover:light:text-slate-900"><ChevronRight size={14} className="rotate-180" /> Back to dashboard</button>

      <div className="flex items-end justify-between gap-3">
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
        <button
          type="button"
          onClick={onOpenCustomize}
          title="Customize what counts toward net worth"
          aria-label="Customize what counts toward net worth"
          className="shrink-0 rounded-xl border border-white/10 light:border-black/10 p-2.5 text-slate-400 light:text-slate-500 hover:bg-white/5"
        >
          <Settings size={16} />
        </button>
      </div>

      {nothingTracked ? (
        <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card">
          <EmptyState icon={Landmark} title="Nothing tracked yet" message="Add an account, loan, card, or investment to see your net worth calculation." cta="Add an account" onCta={() => setView('accounts')} />
        </div>
      ) : (
        <>
          {/* The formula, spelled out with real numbers — the direct answer to "how is this calculated." */}
          <div className="rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] glassy:glass-card p-6">
            <div className="flex flex-nowrap items-end justify-center gap-1.5 overflow-x-auto pb-1 sm:gap-4">
              <div className="shrink-0 text-center">
                <div className="text-[9px] uppercase tracking-widest text-slate-500 sm:text-[11px]">Assets</div>
                <div className="whitespace-nowrap text-sm font-semibold text-white light:text-slate-900 sm:text-xl">{showMoney ? money(totalAssets) : '••••'}</div>
              </div>
              <div className="shrink-0 pb-0.5 text-sm text-slate-500 sm:pb-1 sm:text-lg">−</div>
              <div className="shrink-0 text-center">
                <div className="text-[9px] uppercase tracking-widest text-slate-500 sm:text-[11px]">Liabilities</div>
                <div className="whitespace-nowrap text-sm font-semibold text-white light:text-slate-900 sm:text-xl">{showMoney ? money(totalLiabilities) : '••••'}</div>
              </div>
              <div className="shrink-0 pb-0.5 text-sm text-slate-500 sm:pb-1 sm:text-lg">=</div>
              <div className="shrink-0 text-center">
                <div className="text-[9px] uppercase tracking-widest text-slate-500 sm:text-[11px]">Net worth</div>
                <div className={`whitespace-nowrap text-sm font-semibold sm:text-xl ${netWorth < 0 ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700'}`}>{showMoney ? money(netWorth) : '••••'}</div>
              </div>
            </div>

            <div
              role="img"
              aria-label={showMoney ? `Assets ${money(totalAssets)} vs liabilities ${money(totalLiabilities)}` : 'Assets vs liabilities, amounts hidden'}
              className="mt-5 flex h-2 gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]"
            >
              <div className="bg-emerald-400" style={{ width: nwPct(totalBalance) }} />
              <div className="bg-emerald-400/50" style={{ width: nwPct(currentInv) }} />
              {lendOutstanding > 0 && <div className="bg-emerald-200" style={{ width: nwPct(lendOutstanding) }} />}
              {chitFundReceivable > 0 && <div className="bg-sky-300" style={{ width: nwPct(chitFundReceivable) }} />}
              {moneyProfileAssetTotal > 0 && <div className="bg-violet-300" style={{ width: nwPct(moneyProfileAssetTotal) }} />}
              {scholarshipNet > 0 && <div className="bg-yellow-300" style={{ width: nwPct(scholarshipNet) }} />}
            </div>
            <div
              role="img"
              aria-label={showMoney ? `Liabilities: loans ${money(totalOutstanding)}, credit cards ${money(creditCardDebt)}, borrowed ${money(borrowOutstanding)}, chit fund dues ${money(chitFundLiability)}` : 'Liabilities breakdown, amounts hidden'}
              className="mt-1.5 flex h-2 gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]"
            >
              <div className="bg-rose-400" style={{ width: nwPct(totalOutstanding) }} />
              <div className="bg-rose-400/50" style={{ width: nwPct(creditCardDebt) }} />
              {borrowOutstanding > 0 && <div className="bg-rose-200" style={{ width: nwPct(borrowOutstanding) }} />}
              {chitFundLiability > 0 && <div className="bg-orange-300" style={{ width: nwPct(chitFundLiability) }} />}
              {moneyProfileLiabilityTotal > 0 && <div className="bg-fuchsia-300" style={{ width: nwPct(moneyProfileLiabilityTotal) }} />}
            </div>

            <div className="mt-4 space-y-1 text-[11px] text-slate-500">
              <div>Assets = Cash &amp; bank ({showMoney ? money(totalBalance) : '••••'}) + Investments ({showMoney ? money(currentInv) : '••••'}){lendOutstanding > 0 ? ` + Lent out (${showMoney ? money(lendOutstanding) : '••••'})` : ''}{chitFundReceivable > 0 ? ` + Chit funds (${showMoney ? money(chitFundReceivable) : '••••'})` : ''}{moneyProfileAssetTotal > 0 ? ` + Family & Company (${showMoney ? money(moneyProfileAssetTotal) : '••••'})` : ''}{scholarshipNet > 0 ? ` + Scholarships (${showMoney ? money(scholarshipNet) : '••••'})` : ''}</div>
              <div>Liabilities = Loans ({showMoney ? money(totalOutstanding) : '••••'}) + Credit cards ({showMoney ? money(creditCardDebt) : '••••'}){borrowOutstanding > 0 ? ` + Borrowed (${showMoney ? money(borrowOutstanding) : '••••'})` : ''}{chitFundLiability > 0 ? ` + Chit fund dues (${showMoney ? money(chitFundLiability) : '••••'})` : ''}{moneyProfileLiabilityTotal > 0 ? ` + Family & Company (${showMoney ? money(moneyProfileLiabilityTotal) : '••••'})` : ''}</div>
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
            title="Lent out" subtotal={lendOutstanding} items={lendItems} showMoney={showMoney}
            caption={lendItems.length > 0 ? 'Only the still-outstanding portion of each record.' : null}
            emptyIcon={Heart} emptyTitle="Nothing lent out" emptyMessage="Money you've lent that's still owed back to you will show up here." emptyCta="Add a lend/borrow record" onEmptyCta={() => setView('lend')}
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
          <ItemSection
            title="Borrowed" subtotal={borrowOutstanding} items={borrowItems} showMoney={showMoney}
            caption={borrowItems.length > 0 ? 'Only the still-outstanding portion of each record.' : null}
            emptyIcon={Heart} emptyTitle="Nothing borrowed" emptyMessage="Money you've borrowed that's still owed will show up here." emptyCta="Add a lend/borrow record" onEmptyCta={() => setView('lend')}
          />
          <ItemSection
            title="Chit funds (receivable)" subtotal={chitFundReceivable} items={chitFundAssetItems} showMoney={showMoney}
            caption={chitFundAssetItems.length > 0 ? 'Contributions paid so far, before taking the payout.' : null}
            emptyIcon={Coins} emptyTitle="Nothing pending" emptyMessage="A chit fund you haven't taken the payout for will show up here." emptyCta="Add chit fund" onEmptyCta={() => setView('chitfunds')}
          />
          <ItemSection
            title="Chit fund dues" subtotal={chitFundLiability} items={chitFundLiabilityItems} showMoney={showMoney}
            caption={chitFundLiabilityItems.length > 0 ? 'Months still owed after taking the payout.' : null}
            emptyIcon={Coins} emptyTitle="Nothing owed" emptyMessage="A chit fund whose payout you've already taken will show up here." emptyCta="Add chit fund" onEmptyCta={() => setView('chitfunds')}
          />
          <ItemSection
            title="Family & Company" subtotal={moneyProfileAssetTotal - moneyProfileLiabilityTotal} items={moneyProfileItems} showMoney={showMoney}
            caption={moneyProfileItems.length > 0 ? "Only unlinked profiles — a linked profile's balance counts via its linked account instead." : null}
            emptyIcon={Users} emptyTitle="Nothing unlinked" emptyMessage="An unlinked Family/Company profile's balance will show up here." emptyCta="Add a profile" onEmptyCta={() => setView('family_company')}
          />
          <ItemSection
            title="Scholarships" subtotal={scholarshipNet} items={scholarshipItems} showMoney={showMoney}
            caption={scholarshipItems.length > 0 ? 'Only the still-pending amount, and only when nothing has been mirrored to an account.' : null}
            emptyIcon={GraduationCap} emptyTitle="Nothing pending" emptyMessage="A scholarship still owed, with no linked account, will show up here." emptyCta="Add scholarship" onEmptyCta={() => setView('scholarships')}
          />
        </>
      )}
    </div>
  )
}
