import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronLeft, Coins, CreditCard, GraduationCap, Heart, Landmark, Settings, TrendingUp, Users, Wallet } from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { EmptyState } from '../ui/EmptyState'
import { BottomSheet } from '../ui/BottomSheet'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { tw } from '../lib/tw'
import { money } from '../lib/format'
import { computeDashboardMetrics, currentValueOf, liveOutstanding, perspectiveType, profileTotals, resolveModuleSettings, scholarshipDisplayStatus } from '../lib/shared'

// Native port of features/dashboard/NetWorthDetailView.jsx + NetWorthCustomizeSheet.jsx, with the
// per-item rows built exactly as DashboardView builds them (app/page.js).
const hidden = (v, show) => (show ? money(v) : '••••')

function ItemSection({ title, subtotal, items, showMoney, caption, emptyIcon, emptyTitle, emptyMessage, emptyCta, onEmptyCta }) {
  return (
    <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card')}>
      <View className={tw('flex-row items-center justify-between gap-3 border-b border-white/10 light:border-black/10 px-5 py-3')}>
        <Text className="text-xs uppercase tracking-widest text-slate-500">{title}</Text>
        <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>{hidden(subtotal, showMoney)}</Text>
      </View>
      {caption ? <Text className="px-5 pt-3 text-[11px] text-slate-500">{caption}</Text> : null}
      {items.length === 0 ? <EmptyState compact icon={emptyIcon} title={emptyTitle} message={emptyMessage} cta={emptyCta} onCta={onEmptyCta} /> : (
        <View className="gap-2 p-4">
          {items.map((it) => (
            <View key={it.id} className={tw('flex-row items-center justify-between rounded-xl border border-white/5 light:border-black/5 bg-white/[.07] light:bg-black/[.07] px-3 py-2')}>
              <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${it.color}22` }}><it.icon size={14} color={it.color} /></View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{it.name}</Text>
                  <Text numberOfLines={1} className={tw('text-[11px] capitalize text-slate-400 light:text-slate-500')}>{it.sub}</Text>
                </View>
              </View>
              <Text className={tw('text-sm font-semibold', it.debt ? 'text-rose-300 light:text-rose-700' : 'text-white light:text-slate-900')}>{showMoney ? `${it.debt ? '−' : ''}${money(it.amount).replace('-', '')}` : '••••'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function CustomizeRow({ icon, name, sub, amount, checked, onToggle }) {
  return (
    <View className={tw('flex-row items-center gap-3 rounded-xl bg-black/20 light:bg-black/[.06] px-3 py-2.5')}>
      <Icon as={icon} size={14} className="text-slate-500" />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className={tw('text-sm text-white light:text-slate-900')}>{name}</Text>
        {sub ? <Text numberOfLines={1} className="text-[11px] text-slate-500">{sub}</Text> : null}
      </View>
      <Text className="text-xs text-slate-500">{money(amount)}</Text>
      <ToggleSwitch checked={checked} onChange={onToggle} />
    </View>
  )
}

function CustomizeSection({ title, table, rows, renderRow, emptyMessage, onToggleGroup }) {
  const allOn = rows.length > 0 && rows.every((r) => r.include_in_net_worth !== false)
  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between gap-3">
        <Text className="text-xs uppercase tracking-widest text-slate-500">{title}</Text>
        {rows.length > 1 && <Pressable onPress={() => onToggleGroup(table, rows, !allOn)}><Text className={tw('text-[11px] font-medium text-accent-300 light:text-accent-700')}>{allOn ? 'Turn all off' : 'Turn all on'}</Text></Pressable>}
      </View>
      {rows.length === 0 ? <Text className={tw('rounded-xl bg-black/10 light:bg-black/[.03] px-3 py-4 text-center text-xs text-slate-500')}>{emptyMessage}</Text> : <View className="gap-2">{rows.map(renderRow)}</View>}
    </View>
  )
}

export function NetWorthDetailView({ data, showMoney, onBack, setView, onToggle, onToggleGroup }) {
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const moduleSettings = resolveModuleSettings(data.profile)
  const m = useMemo(() => computeDashboardMetrics(data, moduleSettings), [data])
  const { accounts = [], portfolios = [], holdings = [], sips = [], other_investments: others = [], loans = [], loan_payments = [], credit_cards = [], lend_borrow = [], chit_funds = [], chit_fund_payments = [], money_profiles = [], money_profile_entries = [], scholarships = [] } = data
  const portfolioValue = (p) => holdings.filter((h) => h.portfolio_id === p.id).reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
    + sips.filter((x) => x.portfolio_id === p.id).reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
    + others.filter((o) => o.portfolio_id === p.id).reduce((s, o) => s + currentValueOf(o), 0) + Number(p.cash_balance || 0)
  const outstandingOf = (l) => liveOutstanding(l, loan_payments.filter((p) => p.loan_id === l.id))
  const pending = (l) => Number(l.amount) - Number(l.amount_repaid || 0)

  const cashBankItems = accounts.filter((a) => a.type !== 'debit_card' && a.include_in_net_worth !== false).map((a) => ({ id: `acc-${a.id}`, name: a.name, sub: a.type.replace('_', ' '), amount: Number(a.current_balance || 0), icon: a.type === 'cash' ? Wallet : Landmark, color: a.color || '#64748b' }))
  const investmentItems = portfolios.filter((p) => p.include_in_net_worth !== false).map((p) => ({ id: `port-${p.id}`, name: p.name, sub: 'Investment', amount: portfolioValue(p), icon: TrendingUp, color: p.color || '#64748b' }))
  const loanItems = loans.filter((l) => l.status !== 'closed' && l.include_in_net_worth !== false).map((l) => ({ id: `loan-${l.id}`, name: l.name, sub: l.lender ? `Loan · ${l.lender}` : 'Loan', amount: outstandingOf(l), icon: Landmark, color: '#fb7185', debt: true }))
  const creditCardItems = credit_cards.filter((c) => c.include_in_net_worth !== false).map((c) => ({ id: `cc-${c.id}`, name: c.name, sub: 'Credit card', amount: Number(c.current_outstanding || 0), icon: CreditCard, color: c.color || '#64748b', debt: true }))
  const lendItems = lend_borrow.filter((l) => perspectiveType(l) === 'lent' && l.include_in_net_worth !== false && pending(l) > 0).map((l) => ({ id: `lend-${l.id}`, name: l.person_name, sub: 'Lent out', amount: pending(l), icon: Heart, color: '#6ee7b7' }))
  const borrowItems = lend_borrow.filter((l) => perspectiveType(l) === 'borrowed' && l.include_in_net_worth !== false && pending(l) > 0).map((l) => ({ id: `borrow-${l.id}`, name: l.person_name, sub: 'Borrowed', amount: pending(l), icon: Heart, color: '#fda4af', debt: true }))
  const chitAssetItems = chit_funds.filter((c) => c.status !== 'completed' && c.payout_status === 'not_taken' && c.include_in_net_worth !== false).map((c) => ({ id: `chit-${c.id}`, name: c.name, sub: 'Chit fund (contributions)', amount: m.chitNetPaid(c.id), icon: Coins, color: '#38bdf8' })).filter((it) => it.amount > 0)
  const chitLiabilityItems = chit_funds.filter((c) => c.status !== 'completed' && c.payout_status === 'taken' && c.include_in_net_worth !== false).map((c) => ({ id: `chit-${c.id}`, name: c.name, sub: 'Chit fund (remaining dues)', amount: Math.max(0, Number(c.duration_months) - chit_fund_payments.filter((p) => p.chit_fund_id === c.id).length) * Number(c.monthly_contribution), icon: Coins, color: '#fb923c', debt: true })).filter((it) => it.amount > 0)
  const moneyProfileItems = m.unlinkedMoneyProfiles.map((p) => { const bal = m.moneyProfileBalance(p); return { id: `mp-${p.id}`, name: p.name, sub: p.profile_type === 'company' ? 'Company' : p.profile_type === 'family' ? 'Family' : 'Other', amount: Math.abs(bal), icon: Users, color: '#a78bfa', debt: bal < 0 } }).filter((it) => it.amount > 0)
  const scholarshipItems = scholarships.filter((s) => scholarshipDisplayStatus(s) !== 'pending' && s.include_in_net_worth !== false).map((s) => ({ id: `sch-${s.id}`, name: s.name, sub: 'Owed to college', amount: m.scholarshipOwed(s), icon: GraduationCap, color: '#facc15', debt: true })).filter((it) => it.amount > 0)

  const { netWorth, totalAssets, totalLiabilities } = m
  const nothingTracked = totalAssets === 0 && totalLiabilities === 0
  const scale = Math.max(totalAssets, totalLiabilities, 1)
  const pct = (v) => `${Math.max(0, (Number(v) / scale) * 100)}%`
  const bar = (cls, v) => (v > 0 ? <View className={cls} style={{ width: pct(v) }} /> : null)
  const sections = [
    ['Cash & bank', m.totalBalanceNw, cashBankItems, null, Wallet, 'No accounts yet', 'Add a bank account or cash to start tracking balances.', 'Add account', 'accounts'],
    ['Investments', m.currentInvNw, investmentItems, !moduleSettings.investments.enabled && investmentItems.length ? 'Investments module is off in Settings — still counted here.' : null, TrendingUp, 'No investments yet', 'Add a portfolio to start tracking investment value.', 'Add investment', 'investments'],
    ['Lent out', m.lendOutstanding, lendItems, lendItems.length ? 'Only the still-outstanding portion of each record.' : null, Heart, 'Nothing lent out', "Money you've lent that's still owed back to you will show up here.", 'Add a lend/borrow record', 'lend'],
    ['Loans', m.totalOutstandingNw, loanItems, loanItems.length ? "Includes today's accrued interest, same as the Loans page." : null, Landmark, 'No loans', "Loans you're paying off will show up here.", 'Add loan', 'loans'],
    ['Credit cards', m.creditCardDebtNw, creditCardItems, !moduleSettings.credit_cards.enabled && creditCardItems.length ? 'Credit cards module is off in Settings — still counted here.' : null, CreditCard, 'No credit cards', 'Cards with an outstanding balance will show up here.', 'Add card', 'cards'],
    ['Borrowed', m.borrowOutstanding, borrowItems, borrowItems.length ? 'Only the still-outstanding portion of each record.' : null, Heart, 'Nothing borrowed', "Money you've borrowed that's still owed will show up here.", 'Add a lend/borrow record', 'lend'],
    ['Chit funds (receivable)', m.chitFundReceivable, chitAssetItems, chitAssetItems.length ? 'Contributions paid so far, before taking the payout.' : null, Coins, 'Nothing pending', "A chit fund you haven't taken the payout for will show up here.", 'Add chit fund', 'chitfunds'],
    ['Chit fund dues', m.chitFundLiability, chitLiabilityItems, chitLiabilityItems.length ? 'Months still owed after taking the payout.' : null, Coins, 'Nothing owed', "A chit fund whose payout you've already taken will show up here.", 'Add chit fund', 'chitfunds'],
    ['Family & Company', m.moneyProfileAssetTotal - m.moneyProfileLiabilityTotal, moneyProfileItems, moneyProfileItems.length ? "Only unlinked profiles — a linked profile's balance counts via its linked account instead." : null, Users, 'Nothing unlinked', "An unlinked Family/Company profile's balance will show up here.", 'Add a profile', 'family_company'],
    ['Scholarships owed to college', m.scholarshipLiability, scholarshipItems, scholarshipItems.length ? 'Received but not yet paid to the college — counted as a debt until you pay it.' : null, GraduationCap, 'Nothing owed', "A scholarship you've received but not yet paid to the college will show up here.", 'Add scholarship', 'scholarships'],
  ]
  const togglable = (table, rows) => ({ table, rows })
  const customize = [
    ['Accounts', togglable('accounts', accounts.filter((a) => a.type !== 'debit_card')), (a) => ({ icon: a.type === 'cash' ? Wallet : Landmark, name: a.name, sub: a.type.replace('_', ' '), amount: Number(a.current_balance || 0) }), 'No accounts yet'],
    ['Investments', togglable('portfolios', portfolios), (p) => ({ icon: TrendingUp, name: p.name, amount: portfolioValue(p) }), 'No portfolios yet'],
    ['Loans', togglable('loans', loans.filter((l) => l.status !== 'closed')), (l) => ({ icon: Landmark, name: l.name, sub: l.lender, amount: outstandingOf(l) }), 'No active loans'],
    ['Credit cards', togglable('credit_cards', credit_cards), (c) => ({ icon: CreditCard, name: c.name, amount: Number(c.current_outstanding || 0) }), 'No credit cards'],
    ['Lend / Borrow', togglable('lend_borrow', lend_borrow.filter((l) => l.status !== 'returned')), (l) => ({ icon: Heart, name: l.person_name, sub: perspectiveType(l) === 'lent' ? 'Lent out' : 'Borrowed', amount: pending(l) }), 'Nothing outstanding'],
    ['Chit funds', togglable('chit_funds', chit_funds.filter((c) => c.status !== 'completed')), (c) => ({ icon: Coins, name: c.name, amount: m.chitNetPaid(c.id) }), 'No active chit funds'],
    ['Family & Company', togglable('money_profiles', money_profiles.filter((p) => !p.linked_account_id)), (p) => ({ icon: Users, name: p.name, amount: profileTotals(p, money_profile_entries.filter((e) => e.profile_id === p.id)).balance }), 'No unlinked profiles'],
    ['Scholarships', togglable('scholarships', scholarships.filter((s) => scholarshipDisplayStatus(s) !== 'pending')), (s) => ({ icon: GraduationCap, name: s.name, amount: m.scholarshipOwed(s) }), 'Nothing received yet'],
  ]

  return (
    <View className="gap-5 pb-8">
      <Pressable onPress={onBack} className="flex-row items-center gap-1.5"><Icon as={ChevronLeft} size={14} className="text-slate-400 light:text-slate-500" /><Text className={tw('text-sm text-slate-400 light:text-slate-500')}>Back to dashboard</Text></Pressable>
      <View className="flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <Text className={tw('mb-2 text-xs uppercase tracking-widest text-accent-200/70 light:text-accent-700')}>How it's calculated</Text>
          <Text className={tw('text-3xl font-semibold tracking-tight text-white light:text-slate-900')}>Net worth</Text>
          <View className="mt-3 flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
            <Text className={tw('text-[32px] font-semibold leading-[36px]', netWorth < 0 ? 'text-rose-200 light:text-rose-700' : 'text-white light:text-slate-900')}>{showMoney ? `${netWorth < 0 ? '−' : ''}${money(netWorth).replace('-', '')}` : '••••••••'}</Text>
            {netWorth < 0 && <View className="rounded-full border border-rose-300/30 bg-rose-300/5 px-2 py-0.5"><Text className={tw('text-[11px] font-semibold text-rose-200 light:text-rose-700')}>Net negative</Text></View>}
          </View>
        </View>
        <Pressable onPress={() => setCustomizeOpen(true)} className={tw('rounded-xl border border-white/10 light:border-black/10 p-2.5')}><Icon as={Settings} size={16} className="text-slate-400 light:text-slate-500" /></Pressable>
      </View>

      {nothingTracked ? (
        <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card')}><EmptyState icon={Landmark} title="Nothing tracked yet" message="Add an account, loan, card, or investment to see your net worth calculation." cta="Add an account" onCta={() => setView('accounts')} /></View>
      ) : (
        <>
          <View className={tw('rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-card')}>
            <View className="flex-row items-end justify-center gap-1.5">
              {[['Assets', totalAssets, 'text-white light:text-slate-900'], null, ['Liabilities', totalLiabilities, 'text-white light:text-slate-900'], null, ['Net worth', netWorth, netWorth < 0 ? 'text-rose-300 light:text-rose-700' : 'text-emerald-300 light:text-emerald-700']].map((c, i) => c ? (
                <View key={i} className="items-center"><Text className="text-[9px] uppercase tracking-widest text-slate-500">{c[0]}</Text><Text className={tw('text-sm font-semibold', c[2])}>{hidden(c[1], showMoney)}</Text></View>
              ) : <Text key={i} className="pb-0.5 text-sm text-slate-500">{i === 1 ? '−' : '='}</Text>)}
            </View>
            <View className={tw('mt-5 h-2 flex-row gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]')}>
              {bar('bg-emerald-400', m.totalBalanceNw)}{bar('bg-emerald-400/50', m.currentInvNw)}{bar('bg-emerald-200', m.lendOutstanding)}{bar('bg-sky-300', m.chitFundReceivable)}{bar('bg-violet-300', m.moneyProfileAssetTotal)}
            </View>
            <View className={tw('mt-1.5 h-2 flex-row gap-px overflow-hidden rounded-full bg-white/[.07] light:bg-black/[.07]')}>
              {bar('bg-rose-400', m.totalOutstandingNw)}{bar('bg-rose-400/50', m.creditCardDebtNw)}{bar('bg-rose-200', m.borrowOutstanding)}{bar('bg-orange-300', m.chitFundLiability)}{bar('bg-fuchsia-300', m.moneyProfileLiabilityTotal)}{bar('bg-yellow-300', m.scholarshipLiability)}
            </View>
            <View className="mt-4 gap-1">
              <Text className="text-[11px] text-slate-500">Assets = Cash &amp; bank ({hidden(m.totalBalanceNw, showMoney)}) + Investments ({hidden(m.currentInvNw, showMoney)}){m.lendOutstanding > 0 ? ` + Lent out (${hidden(m.lendOutstanding, showMoney)})` : ''}{m.chitFundReceivable > 0 ? ` + Chit funds (${hidden(m.chitFundReceivable, showMoney)})` : ''}{m.moneyProfileAssetTotal > 0 ? ` + Family & Company (${hidden(m.moneyProfileAssetTotal, showMoney)})` : ''}</Text>
              <Text className="text-[11px] text-slate-500">Liabilities = Loans ({hidden(m.totalOutstandingNw, showMoney)}) + Credit cards ({hidden(m.creditCardDebtNw, showMoney)}){m.borrowOutstanding > 0 ? ` + Borrowed (${hidden(m.borrowOutstanding, showMoney)})` : ''}{m.chitFundLiability > 0 ? ` + Chit fund dues (${hidden(m.chitFundLiability, showMoney)})` : ''}{m.moneyProfileLiabilityTotal > 0 ? ` + Family & Company (${hidden(m.moneyProfileLiabilityTotal, showMoney)})` : ''}{m.scholarshipLiability > 0 ? ` + Scholarships owed to college (${hidden(m.scholarshipLiability, showMoney)})` : ''}</Text>
            </View>
          </View>
          {sections.map(([title, subtotal, items, caption, emptyIcon, emptyTitle, emptyMessage, emptyCta, target]) => (
            <ItemSection key={title} title={title} subtotal={subtotal} items={items} showMoney={showMoney} caption={caption} emptyIcon={emptyIcon} emptyTitle={emptyTitle} emptyMessage={emptyMessage} emptyCta={emptyCta} onEmptyCta={() => setView(target)} />
          ))}
        </>
      )}

      <BottomSheet open={customizeOpen} onOpenChange={setCustomizeOpen} title="What counts toward net worth">
        <View className="gap-5 pb-4">
          {customize.map(([title, { table, rows }, describe, emptyMessage]) => (
            <CustomizeSection key={title} title={title} table={table} rows={rows} emptyMessage={emptyMessage} onToggleGroup={onToggleGroup}
              renderRow={(row) => { const d = describe(row); return <CustomizeRow key={row.id} {...d} checked={row.include_in_net_worth !== false} onToggle={() => onToggle(table, row)} /> }} />
          ))}
        </View>
      </BottomSheet>
    </View>
  )
}
