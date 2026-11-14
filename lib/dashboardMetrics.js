import { liveOutstanding, monthName } from '@/lib/format'
import { currentValueOf } from '@/lib/otherInvestments'
import { perspectiveType } from '@/lib/lendBorrowSharing'
import { profileTotals } from '@/lib/moneyProfiles'
import { scholarshipDisplayStatus } from '@/lib/scholarships'

// Every figure the Dashboard shows (net worth and its parts, the cash-flow months, the stat-card
// values), as one pure function of the /finance/summary data. The formulas are copied verbatim from
// app/page.js's DashboardView, which still computes them inline; the native app (mobile/) uses this
// file so both show identical numbers. If a formula changes in DashboardView, change it here too —
// or better, switch DashboardView over to this.
export function computeDashboardMetrics(data, moduleSettings, now = new Date()) {
  const {
    accounts = [], transactions = [], holdings = [], sips = [], other_investments: otherInvestments = [], portfolios = [],
    loans = [], loan_payments = [], credit_cards = [], lend_borrow = [], chit_funds = [], chit_fund_payments = [],
    money_profiles = [], money_profile_entries = [], scholarships = [], categories = [], budget_months = [],
  } = data

  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const totalBalanceNw = accounts.filter((a) => a.include_in_net_worth !== false).reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const invested = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.avg_buy_price), 0)
    + sips.reduce((s, x) => s + Number(x.units_held) * Number(x.average_price ?? x.nav), 0)
    + otherInvestments.reduce((s, o) => s + Number(o.purchase_value), 0)
  const investmentsCurrent = holdings.reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
    + sips.reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
    + otherInvestments.reduce((s, o) => s + currentValueOf(o), 0)
  const pnl = investmentsCurrent - invested
  const currentInv = investmentsCurrent + portfolios.reduce((s, p) => s + Number(p.cash_balance || 0), 0)
  const linkedPortfolioIds = new Set(portfolios.map((p) => p.id))
  const includedPortfolioIds = new Set(portfolios.filter((p) => p.include_in_net_worth !== false).map((p) => p.id))
  const currentInvNw = holdings.filter((h) => includedPortfolioIds.has(h.portfolio_id) || !linkedPortfolioIds.has(h.portfolio_id)).reduce((s, h) => s + Number(h.qty) * Number(h.current_price || h.avg_buy_price), 0)
    + sips.filter((x) => includedPortfolioIds.has(x.portfolio_id) || !linkedPortfolioIds.has(x.portfolio_id)).reduce((s, x) => s + Number(x.units_held) * Number(x.nav), 0)
    + otherInvestments.filter((o) => includedPortfolioIds.has(o.portfolio_id)).reduce((s, o) => s + currentValueOf(o), 0)
    + portfolios.filter((p) => p.include_in_net_worth !== false).reduce((s, p) => s + Number(p.cash_balance || 0), 0)
  const paymentsFor = (l) => loan_payments.filter((p) => p.loan_id === l.id)
  const totalOutstanding = loans.filter((l) => l.status !== 'closed').reduce((s, l) => s + liveOutstanding(l, paymentsFor(l)), 0)
  const totalOutstandingNw = loans.filter((l) => l.status !== 'closed' && l.include_in_net_worth !== false).reduce((s, l) => s + liveOutstanding(l, paymentsFor(l)), 0)
  const creditCardDebt = credit_cards.reduce((s, c) => s + Number(c.current_outstanding || 0), 0)
  const creditCardDebtNw = credit_cards.filter((c) => c.include_in_net_worth !== false).reduce((s, c) => s + Number(c.current_outstanding || 0), 0)
  const lendOutstanding = lend_borrow.filter((l) => perspectiveType(l) === 'lent' && l.include_in_net_worth !== false).reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.amount_repaid || 0)), 0)
  const borrowOutstanding = lend_borrow.filter((l) => perspectiveType(l) === 'borrowed' && l.include_in_net_worth !== false).reduce((s, l) => s + Math.max(0, Number(l.amount) - Number(l.amount_repaid || 0)), 0)
  const chitNetPaid = (fundId) => chit_fund_payments.filter((p) => p.chit_fund_id === fundId).reduce((s, p) => s + Number(p.amount) - Number(p.dividend_received || 0), 0)
  const chitFundReceivable = chit_funds.filter((c) => c.status !== 'completed' && c.payout_status === 'not_taken' && c.include_in_net_worth !== false).reduce((s, c) => s + chitNetPaid(c.id), 0)
  const chitFundLiability = chit_funds.filter((c) => c.status !== 'completed' && c.payout_status === 'taken' && c.include_in_net_worth !== false).reduce((s, c) => {
    const monthsPaid = chit_fund_payments.filter((p) => p.chit_fund_id === c.id).length
    return s + Math.max(0, Number(c.duration_months) - monthsPaid) * Number(c.monthly_contribution)
  }, 0)
  const unlinkedMoneyProfiles = money_profiles.filter((p) => !p.linked_account_id && p.include_in_net_worth !== false)
  const moneyProfileBalance = (p) => profileTotals(p, money_profile_entries.filter((e) => e.profile_id === p.id)).balance
  const moneyProfileAssetTotal = unlinkedMoneyProfiles.reduce((s, p) => s + Math.max(0, moneyProfileBalance(p)), 0)
  const moneyProfileLiabilityTotal = unlinkedMoneyProfiles.reduce((s, p) => s + Math.max(0, -moneyProfileBalance(p)), 0)
  const scholarshipOwed = (s) => Math.max(0, Number(s.total_amount || 0) - Number(s.amount_paid_to_college || 0))
  const scholarshipLiability = scholarships.filter((s) => scholarshipDisplayStatus(s) !== 'pending' && s.include_in_net_worth !== false).reduce((s, sc) => s + scholarshipOwed(sc), 0)
  const totalAssets = totalBalanceNw + currentInvNw + lendOutstanding + chitFundReceivable + moneyProfileAssetTotal
  const totalLiabilities = totalOutstandingNw + creditCardDebtNw + borrowOutstanding + chitFundLiability + moneyProfileLiabilityTotal + scholarshipLiability
  const netWorth = totalAssets - totalLiabilities

  // Last 6 months of income/expense (transfers excluded; portfolio funding tracked as invested).
  const months = []
  for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthName(d), income: 0, expense: 0, invested: 0 }) }
  transactions.forEach((t) => {
    if (t.type === 'transfer') return
    const d = new Date(t.date); const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = months.find((m) => m.key === key)
    if (!bucket) return
    bucket[t.type] += Number(t.amount || 0)
    if (t.type === 'expense' && t.linked_module === 'investment') bucket.invested += Number(t.amount || 0)
  })
  const thisMonth = months[months.length - 1]
  const investedThisMonth = thisMonth?.invested || 0
  const cashSavingsThisMonth = (thisMonth?.income || 0) - (thisMonth?.expense || 0)
  const savingsRate = thisMonth?.income > 0 ? Math.round(((cashSavingsThisMonth + investedThisMonth) / thisMonth.income) * 100) : 0

  const thisYear = now.getFullYear()
  const allTime = { income: 0, expense: 0, invested: 0 }
  const yearTotals = { income: 0, expense: 0, invested: 0 }
  transactions.forEach((t) => {
    if (t.type === 'transfer') return
    const amt = Number(t.amount || 0)
    allTime[t.type] += amt
    if (t.type === 'expense' && t.linked_module === 'investment') allTime.invested += amt
    if (new Date(t.date).getFullYear() === thisYear) {
      yearTotals[t.type] += amt
      if (t.type === 'expense' && t.linked_module === 'investment') yearTotals.invested += amt
    }
  })
  const allTimeSaved = (allTime.income - allTime.expense) + allTime.invested
  const yearCashSavings = yearTotals.income - yearTotals.expense
  const nowMonthKey = `${now.getFullYear()}-${now.getMonth()}`
  const allThisMonth = transactions.filter((t) => { const d = new Date(t.date); return `${d.getFullYear()}-${d.getMonth()}` === nowMonthKey })

  const netCashflow = (thisMonth?.income || 0) - (thisMonth?.expense || 0)
  const totalDebt = (moduleSettings.loans.enabled ? totalOutstanding : 0) + (moduleSettings.credit_cards.enabled ? creditCardDebt : 0)
  const avgMonthlySpend = months.length ? months.reduce((s, m) => s + m.expense, 0) / months.length : 0
  const debtLoadPct = totalLiabilities <= 0 ? 0 : totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 999
  const runwayMonths = avgMonthlySpend > 0 ? totalBalance / avgMonthlySpend : null
  const spendByCategory = {}
  allThisMonth.filter((t) => t.type === 'expense').forEach((t) => {
    const key = t.category_id || 'none'
    spendByCategory[key] = (spendByCategory[key] || 0) + Number(t.amount || 0)
  })
  const topCategoryEntry = Object.entries(spendByCategory).sort((a, b) => b[1] - a[1])[0]
  const topCategory = topCategoryEntry ? { name: categories.find((c) => c.id === topCategoryEntry[0])?.name || 'Uncategorized', amount: topCategoryEntry[1] } : null
  const creditLimitSum = credit_cards.reduce((s, c) => s + Number(c.credit_limit || 0), 0)
  const creditUtilizationPct = creditLimitSum > 0 ? Math.round((creditCardDebt / creditLimitSum) * 100) : 0
  const currentBudgetPlan = budget_months.find((p) => p.year === now.getFullYear() && p.month === now.getMonth() && p.status === 'active')
  const budgetTotal = Number(currentBudgetPlan?.total_amount || 0)
  const budgetUsedPct = budgetTotal > 0 ? Math.round(((thisMonth?.expense || 0) / budgetTotal) * 100) : 0

  return {
    totalBalance, totalBalanceNw, invested, investmentsCurrent, pnl, currentInv, currentInvNw,
    totalOutstanding, totalOutstandingNw, creditCardDebt, creditCardDebtNw, lendOutstanding, borrowOutstanding,
    chitFundReceivable, chitFundLiability, moneyProfileAssetTotal, moneyProfileLiabilityTotal, scholarshipLiability,
    totalAssets, totalLiabilities, netWorth,
    months, thisMonth, savingsRate, thisYear, allTime, yearTotals, allTimeSaved, yearCashSavings, allThisMonth,
    netCashflow, totalDebt, avgMonthlySpend, debtLoadPct, runwayMonths, topCategory, creditUtilizationPct, budgetTotal, budgetUsedPct,
    // Helpers the net-worth detail view reuses for its per-item rows.
    chitNetPaid, moneyProfileBalance, scholarshipOwed, unlinkedMoneyProfiles, linkedPortfolioIds,
  }
}
