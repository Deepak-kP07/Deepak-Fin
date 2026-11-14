import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  ArrowDownRight, ArrowLeftRight, ArrowUpRight, BarChart3, Briefcase, Calculator, CreditCard, Eye, EyeOff, Info,
  Landmark, ListChecks, Mountain, PieChart, Tag, Target, TrendingDown, TrendingUp, Wallet, Zap,
} from 'lucide-react-native'
import { Icon } from '../ui/Icon'
import { StatCard } from '../ui/StatCard'
import { StatDrilldown } from '../ui/StatDrilldown'
import { EmptyState } from '../ui/EmptyState'
import { CreditCardBillAlert } from '../ui/CreditCardBillAlert'
import { MoneyRulesWidget } from '../ui/MoneyRulesWidget'
import { CashflowChart } from '../ui/CashflowChart'
import { tw } from '../lib/tw'
import { money } from '../lib/format'
import { computeDashboardMetrics, currentValueOf, orderedEnabledKeys, resolveDashboardWidgets, resolveModuleSettings, resolveQuickActionSlots } from '../lib/shared'
import { ADD_ACTION_META, MOBILE_MANDATORY_META, NAV_META } from '../lib/navMeta'
import { useTheme } from '../state/ThemeProvider'

// Native port of DashboardView (app/page.js) — the phone layout only (everything the PWA hides
// below the `lg` breakpoint is left out here too). Figures come from lib/dashboardMetrics.js, the
// same formulas as the web.
const SWATCH_FALLBACK = '#64748b'

export function DashboardView({ data, showMoney, onToggleMoney, onOpenTxForm, setView, onManageMoneyRules, onPayCardBill, onOpenNetWorthDetail }) {
  const { theme } = useTheme()
  const { accounts, credit_cards = [], portfolios = [], holdings = [], sips = [], other_investments: otherInvestments = [], loans = [], bucket_list = [], money_rules = [], transactions, profile } = data
  const moduleSettings = resolveModuleSettings(profile)
  const widgets = resolveDashboardWidgets(profile)
  const m = useMemo(() => computeDashboardMetrics(data, moduleSettings), [data])
  const [drilldown, setDrilldown] = useState(null)
  const [showDebtLoadInfo, setShowDebtLoadInfo] = useState(false)
  const [showRunwayInfo, setShowRunwayInfo] = useState(false)
  const hide = (v) => (showMoney ? money(v) : '••••')
  const { thisMonth, netWorth, netCashflow, savingsRate, pnl } = m

  const balanceItems = [
    ...accounts.filter((a) => a.type !== 'debit_card').map((a) => ({ id: `acc-${a.id}`, name: a.name, sub: a.type.replace('_', ' '), amount: Number(a.current_balance || 0), icon: a.type === 'cash' ? Wallet : Landmark, color: a.color || SWATCH_FALLBACK, debt: false })),
    ...(moduleSettings.credit_cards.enabled ? credit_cards.map((c) => ({ id: `cc-${c.id}`, name: c.name, sub: 'Credit card', amount: Number(c.current_outstanding || 0), icon: CreditCard, color: c.color || SWATCH_FALLBACK, debt: true })) : []),
    ...(moduleSettings.investments.enabled ? portfolios.map((p) => {
      const value = holdings.filter((h) => h.portfolio_id === p.id).reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
        + sips.filter((x) => x.portfolio_id === p.id).reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
        + otherInvestments.filter((o) => o.portfolio_id === p.id).reduce((s, o) => s + currentValueOf(o), 0)
        + Number(p.cash_balance || 0)
      return { id: `port-${p.id}`, name: p.name, sub: 'Investment', amount: value, icon: TrendingUp, color: p.color || SWATCH_FALLBACK, debt: false }
    }) : []),
  ]

  const sub = (icon, text, cls) => (
    <>
      {icon ? <Icon as={icon} size={13} className={cls} /> : null}
      <Text numberOfLines={1} className={tw('text-[11px]', cls)}>{text}</Text>
    </>
  )
  const good = 'text-emerald-300 light:text-emerald-700'
  const bad = 'text-rose-300 light:text-rose-700'
  const warn = 'text-amber-300 light:text-amber-700'
  const STAT_CARDS = [
    { key: 'income_month', available: true, node: <StatCard label={`Income · ${thisMonth?.label || ''}`} value={hide(thisMonth?.income || 0)} sub={sub(ArrowUpRight, 'Tap for all-time', good)} icon={TrendingUp} accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700" onPress={() => setDrilldown('income')} /> },
    { key: 'expense_month', available: true, node: <StatCard label={`Expense · ${thisMonth?.label || ''}`} value={hide(thisMonth?.expense || 0)} sub={sub(ArrowDownRight, 'Tap for all-time', bad)} icon={TrendingDown} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" onPress={() => setDrilldown('expense')} /> },
    // Savings rate is desktop-only on the web; mobile drops it (see DashboardView).
    { key: 'net_cashflow', available: true, node: <StatCard label="Net cash flow" value={hide(netCashflow)} sub={sub(null, `${netCashflow >= 0 ? 'Positive' : 'Negative'} this month`, netCashflow >= 0 ? good : bad)} icon={ArrowLeftRight} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" /> },
    { key: 'total_debt', available: moduleSettings.loans.enabled || moduleSettings.credit_cards.enabled, node: <StatCard label="Total debt" value={hide(m.totalDebt)} sub="Loans + credit cards" icon={CreditCard} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" /> },
    { key: 'total_invested', available: moduleSettings.investments.enabled, node: <StatCard label="Total invested" value={hide(m.currentInv)} sub={sub(null, `${pnl >= 0 ? '+' : '−'}${showMoney ? money(pnl).replace('-', '') : '••••'} P&L`, pnl >= 0 ? good : bad)} icon={TrendingUp} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" /> },
    { key: 'avg_monthly_spend', available: true, node: <StatCard label="Avg. monthly spend" value={hide(m.avgMonthlySpend)} sub="Last 6 months" icon={BarChart3} accent="bg-amber-400/15 text-amber-200 light:text-amber-700" /> },
    { key: 'transactions_count', available: true, node: <StatCard label="Transactions" value={String(m.allThisMonth.filter((t) => !t.is_hidden).length)} sub="This month" icon={ListChecks} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" /> },
    { key: 'top_category', available: !!m.topCategory, node: m.topCategory && <StatCard label="Top category" value={m.topCategory.name} sub={hide(m.topCategory.amount)} icon={Tag} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" /> },
    { key: 'credit_utilization', available: moduleSettings.credit_cards.enabled && credit_cards.length > 0, node: <StatCard label="Credit utilization" value={`${m.creditUtilizationPct}%`} sub={m.creditUtilizationPct >= 70 ? 'Getting high' : 'Under control'} icon={PieChart} accent="bg-rose-400/15 text-rose-200 light:text-rose-700" tone={m.creditUtilizationPct >= 70 ? bad : good} /> },
    { key: 'budget_used_pct', available: moduleSettings.budgets.enabled && m.budgetTotal > 0, node: <StatCard label="Budget used" value={`${m.budgetUsedPct}%`} sub={m.budgetUsedPct > 100 ? 'Over budget' : 'On track'} icon={Zap} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone={m.budgetUsedPct > 100 ? bad : good} /> },
  ].filter((s) => widgets[s.key]?.enabled && s.available)
  const activeLoans = loans.filter((l) => l.status !== 'closed').length
  const QUICK_TILE_CARDS = [
    { key: 'portfolio_tile', available: widgets.quick_tiles.enabled && moduleSettings.investments.enabled && holdings.length > 0, node: <StatCard onPress={() => setView('investments')} label="Portfolio" value={hide(m.currentInv)} sub={`${pnl >= 0 ? '+' : '−'}${showMoney ? money(pnl).replace('-', '') : '••••'} P&L`} icon={TrendingUp} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone={pnl >= 0 ? good : bad} /> },
    { key: 'loans_tile', available: widgets.quick_tiles.enabled && moduleSettings.loans.enabled && loans.length > 0, node: <StatCard onPress={() => setView('loans')} label="Loans outstanding" value={hide(m.totalOutstanding)} sub={`${activeLoans} active loan${activeLoans === 1 ? '' : 's'}`} icon={Briefcase} accent="bg-amber-400/15 text-amber-200 light:text-amber-700" tone="text-slate-400 light:text-slate-500" /> },
    { key: 'bucket_tile', available: widgets.quick_tiles.enabled && moduleSettings.bucket_list.enabled && bucket_list.length > 0, node: <StatCard onPress={() => setView('bucket')} label="Bucket list" value={`${bucket_list.length} item${bucket_list.length === 1 ? '' : 's'}`} sub={`${bucket_list.filter((b) => (Date.now() - new Date(b.created_at).getTime()) / 86400000 >= 30).length} past 30 days`} icon={Mountain} accent="bg-accent-400/15 text-accent-200 light:text-accent-700" tone="text-slate-400 light:text-slate-500" /> },
  ].filter((t) => t.available)
  const ALL_CARDS = [...STAT_CARDS, ...QUICK_TILE_CARDS]

  const quickActionDestinations = [
    ADD_ACTION_META, MOBILE_MANDATORY_META.transactions, MOBILE_MANDATORY_META.accounts,
    ...orderedEnabledKeys(moduleSettings).filter((k) => NAV_META[k]).map((k) => NAV_META[k]),
  ]
  const quickActionItems = resolveQuickActionSlots(profile, quickActionDestinations.map((d) => d.key)).map((key) => quickActionDestinations.find((d) => d.key === key)).filter(Boolean)

  return (
    <View className="gap-3">
      {widgets.credit_card_alert.enabled && moduleSettings.credit_cards.enabled && (
        <CreditCardBillAlert creditCards={credit_cards} transactions={transactions} onPay={onPayCardBill} showMoney={showMoney} />
      )}

      {widgets.net_worth?.enabled && (
        <View className={tw('relative rounded-3xl border border-white/10 light:border-black/10 bg-[#141a28] light:bg-black/[.025] p-6 glassy:glass-hero')}>
          <Pressable onPress={onToggleMoney} hitSlop={8} className={tw('absolute right-4 top-4 z-10 rounded-lg border border-white/10 light:border-black/10 p-1.5')}>
            <Icon as={showMoney ? Eye : EyeOff} size={14} className="text-slate-400 light:text-slate-500" />
          </Pressable>
          <View className="flex-row items-center gap-1.5">
            <Text className={tw('text-xs uppercase tracking-widest text-slate-400 light:text-slate-500')}>Net worth</Text>
            <Pressable onPress={onOpenNetWorthDetail} hitSlop={8} className="rounded-lg p-1"><Icon as={Calculator} size={13} className="text-slate-500" /></Pressable>
          </View>
          <View className="mt-1 flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
            <Text className={tw('text-[32px] font-semibold leading-[36px] tracking-[-0.32px]', netWorth < 0 ? 'text-rose-200 light:text-rose-700' : 'text-white light:text-slate-900')}>
              {showMoney ? `${netWorth < 0 ? '−' : ''}${money(netWorth).replace('-', '')}` : '••••••••'}
            </Text>
            {netWorth < 0 && (
              <View className="rounded-full border border-rose-300/30 bg-rose-300/5 px-2 py-0.5"><Text className={tw('text-[11px] font-semibold text-rose-200 light:text-rose-700')}>Net negative</Text></View>
            )}
          </View>
          <View className="mt-2 flex-row flex-wrap items-baseline gap-x-2">
            <Text className={tw('text-sm text-slate-400 light:text-slate-500')}>Net cash flow · {thisMonth?.label || 'this month'}</Text>
            <Text className={tw('text-sm font-semibold', netCashflow >= 0 ? good : bad)}>{netCashflow >= 0 ? '+' : '−'}{showMoney ? money(Math.abs(netCashflow)).replace('-', '') : '••••'}</Text>
          </View>
          <View className="mt-5 flex-row gap-2">
            {quickActionItems.map((item) => (
              <Pressable key={item.key} onPress={() => (item.key === 'add' ? onOpenTxForm() : setView(item.key))} className={tw('flex-1 items-center gap-1.5 rounded-2xl bg-white/[.04] light:bg-black/[.03] py-3 active:opacity-80 glassy:glass-pill')}>
                <View className={tw('h-10 w-10 items-center justify-center rounded-full', item.key === 'add' ? 'bg-accent-400/15' : 'bg-white/[.06] light:bg-black/[.04]')}>
                  <Icon as={item.icon} size={18} className={item.key === 'add' ? 'text-accent-200 light:text-accent-700' : 'text-slate-200 light:text-slate-600'} />
                </View>
                <Text className={tw('text-xs text-slate-300 light:text-slate-700')}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {ALL_CARDS.length > 0 && (
        <View className="flex-row flex-wrap gap-3">
          {ALL_CARDS.map((s) => <View key={s.key} style={{ flexBasis: '47%', flexGrow: 1 }}>{s.node}</View>)}
        </View>
      )}

      {widgets.cashflow_chart.enabled && (
        <View className={tw('rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] p-3.5 glassy:glass-card')}>
          <View className="mb-1 flex-row items-center justify-between">
            <View>
              <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>Cash flow · last 6 months</Text>
              <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>{showMoney ? 'Income vs expense' : 'Income vs expense · amounts hidden'}</Text>
            </View>
            <Icon as={BarChart3} size={16} className="text-slate-500" />
          </View>
          <CashflowChart months={m.months} showMoney={showMoney} glass={theme === 'glass'} />
        </View>
      )}

      {widgets.balances_panel.enabled && (
        <View className={tw('min-h-[160px] rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] p-3.5 glassy:glass-card')}>
          <View className="mb-2 flex-row items-center justify-between">
            <View>
              <Text className={tw('text-sm font-semibold text-white light:text-slate-900')}>Balances</Text>
              <Text className={tw('text-xs text-slate-400 light:text-slate-500')}>Accounts, cards &amp; investments</Text>
            </View>
            <Pressable onPress={() => setView('accounts')} hitSlop={8}><Text className={tw('text-xs text-accent-300 light:text-accent-700')}>Manage</Text></Pressable>
          </View>
          {balanceItems.length === 0 ? (
            <EmptyState compact icon={Landmark} title="Nothing tracked yet" message="Add an account, card, or portfolio to see balances here." cta="Add account" onCta={() => setView('accounts')} />
          ) : (
            <View className="gap-2">
              {balanceItems.map((it) => (
                <View key={it.id} className={tw('flex-row items-center justify-between rounded-xl border border-white/5 light:border-black/5 bg-white/[.07] light:bg-black/[.07] px-3 py-2')}>
                  <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                    <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${it.color}22` }}>
                      <it.icon size={14} color={it.color} />
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className={tw('text-sm font-medium text-white light:text-slate-900')}>{it.name}</Text>
                      <Text numberOfLines={1} className={tw('text-[11px] capitalize text-slate-400 light:text-slate-500')}>{it.sub}</Text>
                    </View>
                  </View>
                  <Text className={tw('text-sm font-semibold', it.debt ? bad : 'text-white light:text-slate-900')}>{showMoney ? `${it.debt ? '−' : ''}${money(it.amount).replace('-', '')}` : '••••'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {widgets.money_rules_widget.enabled && <MoneyRulesWidget rules={money_rules} onOpen={onManageMoneyRules} />}

      <StatDrilldown open={drilldown === 'income'} onClose={() => setDrilldown(null)} title="Income" icon={TrendingUp} accent="bg-emerald-400/15 text-emerald-200 light:text-emerald-700"
        rows={[{ label: thisMonth?.label || 'This month', value: hide(thisMonth?.income || 0) }, { label: `${m.thisYear} so far`, value: hide(m.yearTotals.income) }, { label: 'All-time', value: hide(m.allTime.income) }]} />
      <StatDrilldown open={drilldown === 'expense'} onClose={() => setDrilldown(null)} title="Expense" icon={TrendingDown} accent="bg-rose-400/15 text-rose-200 light:text-rose-700"
        rows={[{ label: thisMonth?.label || 'This month', value: hide(thisMonth?.expense || 0) }, { label: `${m.thisYear} so far`, value: hide(m.yearTotals.expense) }, { label: 'All-time', value: hide(m.allTime.expense) }]}
        note="Includes money moved into investments — see Savings for the cash-vs-invested split." />
      <StatDrilldown open={drilldown === 'savings'} onClose={() => setDrilldown(null)} title="Savings" icon={Target}
        rows={[
          { label: 'Invested this year', sub: 'Money moved into portfolios', value: hide(m.yearTotals.invested), tone: 'text-accent-300 light:text-accent-700' },
          { label: 'Other savings this year', sub: 'Cash kept, not invested or spent', value: hide(m.yearCashSavings) },
          { label: `Total set aside · ${m.thisYear}`, value: hide(m.yearCashSavings + m.yearTotals.invested), tone: good },
          { label: 'All-time saved + invested', value: hide(m.allTimeSaved) },
        ]}
        note="Savings rate now counts what you invested this month as saved, not spent — investing no longer drags the rate down." />
      <StatDrilldown open={showDebtLoadInfo} onClose={() => setShowDebtLoadInfo(false)} title="Debt load" icon={Info} accent="bg-rose-400/15 text-rose-200 light:text-rose-700"
        body="What percentage of everything you own is owed to someone else — your total debt (loans + credit cards) divided by your total assets (cash + investments)."
        rows={[{ label: 'Total liabilities', value: hide(m.totalLiabilities) }, { label: 'Total assets', value: hide(m.totalAssets) }, { label: 'Debt load', value: m.debtLoadPct >= 999 ? '100+%' : `${m.debtLoadPct}%`, tone: m.debtLoadPct >= 100 ? bad : m.debtLoadPct >= 60 ? warn : good }]} />
      <StatDrilldown open={showRunwayInfo} onClose={() => setShowRunwayInfo(false)} title="Cash runway" icon={Info}
        body="How many months your current cash & bank balance would last, purely at your average monthly spending pace over the last 6 months. It's not a prediction — it doesn't account for income still coming in, so it reads more pessimistic than reality if you have regular income."
        rows={[{ label: 'Cash & bank balance', value: hide(m.totalBalance) }, { label: 'Avg. monthly spend', sub: 'Last 6 months', value: hide(m.avgMonthlySpend) }, { label: 'Runway', value: m.runwayMonths === null ? '—' : `${m.runwayMonths > 99 ? '99+' : m.runwayMonths.toFixed(1)} months` }]} />
    </View>
  )
}
